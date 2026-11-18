begin;

create table public.refund_operations (
 id text primary key, order_id text not null references public.orders(id), attempt_id text references public.payment_attempts(id),
 request_key text not null unique, fingerprint text not null, amount numeric(12,2) not null check(amount>0 and amount=trunc(amount)),
 reason text not null, return_request_id text references public.return_requests(id), actor text not null,
 environment text not null check(environment in ('demo','sandbox','production')),
 state text not null default 'creating' check(state in ('creating','pending','completed','review')),
 provider_refund_id text unique, evidence jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index refund_one_unresolved_order on public.refund_operations(order_id) where state<>'completed';
create index refund_reconcile_idx on public.refund_operations(state,updated_at);
create table public.refund_events (
 id text primary key default gen_random_uuid()::text, operation_id text not null references public.refund_operations(id),
 event_key text not null, evidence jsonb not null, created_at timestamptz not null default now(), unique(operation_id,event_key)
);
alter table public.refunds add column operation_id text unique references public.refund_operations(id);
alter table public.refunds alter column restock_inventory set default false;
create table public.return_receipts (
 id text primary key, request_key text not null unique, fingerprint text not null,
 order_id text not null references public.orders(id), rma_id text not null references public.return_requests(id),
 actor text not null, created_at timestamptz not null default now()
);
create table public.return_receipt_items (
 id text primary key default gen_random_uuid()::text, receipt_id text not null references public.return_receipts(id),
 order_item_id text not null references public.order_items(id), quantity integer not null check(quantity>0),
 disposition text not null check(disposition in ('restock','quarantine')), unique(receipt_id,order_item_id)
);
create index return_receipt_order_item_idx on public.return_receipt_items(order_item_id);
alter table public.refund_operations enable row level security;
alter table public.refund_events enable row level security;
alter table public.return_receipts enable row level security;
alter table public.return_receipt_items enable row level security;
revoke all on public.refund_operations,public.refund_events,public.return_receipts,public.return_receipt_items from public,anon,authenticated,service_role;
grant select on public.refund_operations,public.refund_events,public.return_receipts,public.return_receipt_items to service_role;
grant update(updated_at) on public.refund_operations to service_role;
revoke insert,update,delete,truncate on public.refunds,public.return_requests from service_role;

create function public.create_return_request(p_order_id text,p_reason text,p_notes text,p_photos text[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders;r public.return_requests;v_id text:=gen_random_uuid()::text;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.paid_at is null then raise exception using errcode='PT409',message='A paid order is required for a return';end if;
 if p_reason is null or length(trim(p_reason)) not between 1 and 255 or length(coalesce(p_notes,''))>2000 or cardinality(p_photos)>10 then raise exception using errcode='22023',message='Invalid return details';end if;
 select * into r from public.return_requests where order_id=o.id and status not in ('rejected','completed') limit 1;
 if found then return to_jsonb(r);end if;
 insert into public.return_requests(id,rma_number,order_id,customer_id,customer_email,status,reason,customer_notes,photos)
 values(v_id,'RMA-'||v_id,o.id,o.customer_id,o.customer_email,'requested',trim(p_reason),p_notes,coalesce(p_photos,array[]::text[])) returning * into r;
 return to_jsonb(r);
end;
$$;
create function public.transition_return_request(p_rma_id text,p_status text,p_notes text,p_actor text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.return_requests;v_order text;
begin
 select order_id into v_order from public.return_requests where id=p_rma_id;
 perform 1 from public.orders where id=v_order for update;
 select * into r from public.return_requests where id=p_rma_id for update;
 if not found then raise exception using errcode='PT404',message='Return request not found';end if;
 if p_status is null or not (p_status=r.status or (r.status='requested' and p_status in ('approved','rejected')) or (r.status='approved' and p_status in ('item_received','rejected')) or (r.status='item_received' and p_status='inspected') or (r.status='inspected' and p_status='completed')) then raise exception using errcode='PT409',message='Invalid return status transition';end if;
 if length(coalesce(p_notes,''))>2000 then raise exception using errcode='22023',message='Return notes too long';end if;
 update public.return_requests set status=p_status,admin_notes=coalesce(p_notes,admin_notes),handled_by=p_actor,
 inspected_at=case when p_status='inspected' then coalesce(inspected_at,now()) else inspected_at end,
 resolved_at=case when p_status in ('rejected','completed') then coalesce(resolved_at,now()) else resolved_at end where id=r.id returning * into r;
 insert into public.admin_audit_logs(actor_id,actor_name,role,action,entity_type,entity_id,after_state) values(p_actor,p_actor,'ADMIN','RMA_STATUS_UPDATED','rma',r.id,jsonb_build_object('status',p_status));
 return to_jsonb(r);
end;
$$;

create function public.prepare_refund(p_key text,p_fingerprint text,p_input jsonb,p_environment text,p_actor text,p_verified jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders;a public.payment_attempts;r public.refund_operations;v_total numeric;v_amount numeric:=(p_input->>'amount')::numeric;v_id text:=gen_random_uuid()::text;
begin
 if p_key !~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or p_environment not in ('demo','sandbox','production') or length(p_fingerprint)<>64 or v_amount is null or v_amount<=0 or v_amount<>trunc(v_amount) or length(coalesce(p_input->>'reason','')) not between 1 and 255 then raise exception using errcode='22023',message='Invalid refund request';end if;
 select * into o from public.orders where id=p_input->>'order_id' for update;
 if not found then raise exception using errcode='PT404',message='Order not found';end if;
 select * into r from public.refund_operations where request_key=p_key;
 if found then
  if r.order_id<>o.id or r.fingerprint<>p_fingerprint or r.environment<>p_environment then raise exception using errcode='PT409',message='Refund key conflicts with the existing request';end if;
  return jsonb_build_object('may_create',false,'operation',to_jsonb(r));
 end if;
 if o.paid_at is null or o.status='cancelled' then raise exception using errcode='PT409',message='Paid order required';end if;
 if p_input->>'return_request_id' is not null and not exists(select 1 from public.return_requests where id=p_input->>'return_request_id' and order_id=o.id and status not in ('requested','rejected')) then raise exception using errcode='PT409',message='Approved return must belong to this order';end if;
 if exists(select 1 from public.refunds where order_id=o.id and operation_id is null) then raise exception using errcode='PT409',message='Historical refund records need reconciliation';end if;
 if exists(select 1 from public.refund_operations where order_id=o.id and state<>'completed') then raise exception using errcode='PT409',message='Reconcile the unresolved refund first';end if;
 select coalesce(sum(amount),0) into v_total from public.refunds where order_id=o.id and status='completed';
 if v_total+v_amount>o.total then raise exception using errcode='PT409',message='Refund exceeds remaining paid amount';end if;
 if p_environment<>'demo' then
  select * into a from public.payment_attempts where order_id=o.id for update;
  if not found or a.environment<>p_environment or a.transaction_id is null or a.transaction_id is distinct from o.payment_reference or a.amount<>o.total
   or p_verified->>'order_id' is distinct from a.provider_order_id or p_verified->>'merchant_id' is distinct from a.merchant_id or p_verified->>'transaction_id' is distinct from a.transaction_id
   or p_verified->>'currency' is distinct from 'IDR' or (p_verified->>'gross_amount')::numeric is distinct from a.amount or coalesce(p_verified->>'transaction_status','') not in ('settlement','partial_refund')
   or (p_verified->>'refund_total')::numeric is distinct from v_total then raise exception using errcode='PT409',message='Settled payment and refund history must reconcile before refunding';end if;
 end if;
 insert into public.refund_operations(id,order_id,attempt_id,request_key,fingerprint,amount,reason,return_request_id,actor,environment)
 values(v_id,o.id,a.id,p_key,p_fingerprint,v_amount,p_input->>'reason',p_input->>'return_request_id',p_actor,p_environment) returning * into r;
 insert into public.admin_audit_logs(actor_id,actor_name,role,action,entity_type,entity_id,after_state) values(p_actor,p_actor,'ADMIN','REFUND_PREPARED','refund',r.id,jsonb_build_object('order_id',o.id,'amount',r.amount));
 return jsonb_build_object('may_create',true,'operation',to_jsonb(r));
end;
$$;

create function public.apply_refund_evidence(p_operation_id text,p_evidence jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.refund_operations;a public.payment_attempts;o public.orders;f public.refunds;v_order text;v_refund jsonb:=p_evidence->'refund';v_total numeric;v_confirmed boolean;v_key text;
begin
 select order_id into v_order from public.refund_operations where id=p_operation_id;
 select * into o from public.orders where id=v_order for update;
 select * into r from public.refund_operations where id=p_operation_id for update;
 if not found then raise exception using errcode='PT404',message='Refund operation not found';end if;
 if r.environment<>'demo' then
  select * into a from public.payment_attempts where id=r.attempt_id;
  if p_evidence->>'order_id' is distinct from a.provider_order_id or p_evidence->>'transaction_id' is distinct from a.transaction_id or p_evidence->>'merchant_id' is distinct from a.merchant_id or p_evidence->>'currency' is distinct from 'IDR' or (p_evidence->>'gross_amount')::numeric is distinct from a.amount then raise exception using errcode='PT409',message='Refund payment evidence mismatch';end if;
 end if;
 if v_refund is not null and v_refund<>'null'::jsonb and (v_refund->>'key' is distinct from r.request_key or (v_refund->>'amount')::numeric is distinct from r.amount or coalesce(length(v_refund->>'id'),0) not between 1 and 200) then raise exception using errcode='PT409',message='Refund identity or amount mismatch';end if;
 v_key:=encode(sha256(convert_to(p_evidence::text,'UTF8')),'hex');
 insert into public.refund_events(operation_id,event_key,evidence) values(r.id,v_key,p_evidence) on conflict do nothing;
 if r.state='completed' then select * into f from public.refunds where operation_id=r.id;return jsonb_build_object('operation',to_jsonb(r),'refund',to_jsonb(f),'orderStatus',o.status,'replayed',true);end if;
 v_confirmed:=coalesce(v_refund->>'method'='online' or length(v_refund->>'bank_confirmed_at')>0,false);
 if not v_confirmed then
  update public.refund_operations set state=case when v_refund is null or v_refund='null'::jsonb then 'review' else 'pending' end,evidence=p_evidence,updated_at=now() where id=r.id returning * into r;
  return jsonb_build_object('operation',to_jsonb(r),'orderStatus',o.status,'pending',true);
 end if;
 select coalesce(sum(amount),0) into v_total from public.refunds where order_id=o.id and status='completed';
 if v_total+r.amount>o.total or (p_evidence->>'refund_total')::numeric is distinct from v_total+r.amount then raise exception using errcode='PT409',message='Cumulative refund needs reconciliation';end if;
 insert into public.refunds(id,refund_number,order_id,return_request_id,amount,currency,gateway_refund_id,restock_inventory,reason,processed_by,status,operation_id)
 values(r.id,'REF-'||r.id,o.id,r.return_request_id,r.amount,'IDR',v_refund->>'id',false,r.reason,r.actor,'completed',r.id) returning * into f;
 update public.refund_operations set state='completed',provider_refund_id=v_refund->>'id',evidence=p_evidence,updated_at=now() where id=r.id returning * into r;
 update public.orders set status=case when v_total+r.amount=total then 'refunded' else 'partially_refunded' end,updated_at=now() where id=o.id returning * into o;
 insert into public.admin_audit_logs(actor_id,actor_name,role,action,entity_type,entity_id,after_state) values(r.actor,r.actor,'ADMIN','REFUND_CONFIRMED','refund',r.id,jsonb_build_object('amount',r.amount,'order_id',o.id,'order_status',o.status));
 return jsonb_build_object('operation',to_jsonb(r),'refund',to_jsonb(f),'orderStatus',o.status,'pending',false);
end;
$$;

create function public.receive_return_items(p_key text,p_fingerprint text,p_input jsonb,p_actor text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.return_requests;o public.orders;b public.return_receipts;line public.order_items;i jsonb;v_order text;v_used bigint;v_sold bigint;v_store text;v_stores bigint;v_previous integer;v_count integer;
begin
 select order_id into v_order from public.return_requests where id=p_input->>'rma_id';
 select * into o from public.orders where id=v_order for update;
 select * into r from public.return_requests where id=p_input->>'rma_id' for update;
 if not found then raise exception using errcode='PT404',message='Return request not found';end if;
 select * into b from public.return_receipts where request_key=p_key;
 if found then
  if b.rma_id<>r.id or b.fingerprint<>p_fingerprint then raise exception using errcode='PT409',message='Receipt key conflicts with previous request';end if;
  return jsonb_build_object('receipt',to_jsonb(b),'replayed',true);
 end if;
 if p_key !~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or length(p_fingerprint)<>64 or jsonb_typeof(p_input->'items') is distinct from 'array' or jsonb_array_length(p_input->'items') not between 1 and 100 then raise exception using errcode='22023',message='Invalid receipt request';end if;
 if o.paid_at is null or r.status<>'inspected' then raise exception using errcode='PT409',message='Inspect this paid return before inventory recovery';end if;
 insert into public.return_receipts(id,request_key,fingerprint,order_id,rma_id,actor) values(gen_random_uuid()::text,p_key,p_fingerprint,o.id,r.id,p_actor) returning * into b;
 for i in select x.value from jsonb_array_elements(p_input->'items') x left join public.order_items oi on oi.id=x.value->>'order_item_id' order by oi.product_id,oi.variant_id,oi.id loop
  select * into line from public.order_items where id=i->>'order_item_id' and order_id=o.id;
  if not found or line.product_id is null or (i->>'quantity')::numeric is null or (i->>'quantity')::numeric<>trunc((i->>'quantity')::numeric) or (i->>'quantity')::numeric not between 1 and 100 or coalesce(i->>'disposition','') not in ('restock','quarantine') then raise exception using errcode='22023',message='Invalid returned item';end if;
  select coalesce(sum(quantity),0) into v_used from public.return_receipt_items where order_item_id=line.id;
  if v_used+(i->>'quantity')::integer>line.quantity then raise exception using errcode='PT409',message='Return exceeds ordered quantity';end if;
  select coalesce(sum(quantity),0),min(store_id),count(distinct store_id) into v_sold,v_store,v_stores from public.inventory_reservations where order_id=o.id and product_id=line.product_id and variant_id is not distinct from line.variant_id and status='settled';
  select coalesce(sum(ri.quantity),0) into v_used from public.return_receipt_items ri join public.order_items oi on oi.id=ri.order_item_id where oi.order_id=o.id and oi.product_id=line.product_id and oi.variant_id is not distinct from line.variant_id;
  if v_stores<>1 or v_used+(i->>'quantity')::integer>v_sold then raise exception using errcode='PT409',message='Return has no remaining settled inventory coverage';end if;
  insert into public.return_receipt_items(receipt_id,order_item_id,quantity,disposition) values(b.id,line.id,(i->>'quantity')::integer,i->>'disposition');
  if i->>'disposition'='restock' then
   if line.variant_id is not null then
    select stock_quantity into v_previous from public.product_variants where id=line.variant_id and product_id=line.product_id for update;
    update public.product_variants set stock_quantity=stock_quantity+(i->>'quantity')::integer,updated_at=now() where id=line.variant_id and product_id=line.product_id;
   else
    select stock_on_hand into v_previous from public.store_inventory where product_id=line.product_id and store_id=v_store for update;
    update public.store_inventory set stock_on_hand=stock_on_hand+(i->>'quantity')::integer,updated_at=now() where product_id=line.product_id and store_id=v_store;
   end if;
   get diagnostics v_count=row_count;
   if v_count<>1 or v_previous is null then raise exception using errcode='23514',message='Return inventory drift';end if;
   insert into public.inventory_adjustment_ledger(product_id,variant_id,store_id,delta_quantity,previous_stock,new_stock,reason_code,reference_order_id,actor_id,notes)
   values(line.product_id,line.variant_id,v_store,(i->>'quantity')::integer,v_previous,v_previous+(i->>'quantity')::integer,'RETURN',o.id,p_actor,'Inspected receipt '||b.id);
  end if;
 end loop;
 insert into public.admin_audit_logs(actor_id,actor_name,role,action,entity_type,entity_id,after_state) values(p_actor,p_actor,'ADMIN','RETURN_RECEIVED','rma',r.id,jsonb_build_object('receipt_id',b.id,'items',p_input->'items'));
 return jsonb_build_object('receipt',to_jsonb(b),'replayed',false);
end;
$$;

revoke all on function public.create_return_request(text,text,text,text[]),public.transition_return_request(text,text,text,text),public.prepare_refund(text,text,jsonb,text,text,jsonb),public.apply_refund_evidence(text,jsonb),public.receive_return_items(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_return_request(text,text,text,text[]),public.transition_return_request(text,text,text,text),public.prepare_refund(text,text,jsonb,text,text,jsonb),public.apply_refund_evidence(text,jsonb),public.receive_return_items(text,text,jsonb,text) to service_role;

-- A warehouse status edit cannot start a new shipment after money/physical recovery.
alter function public.prepare_shipping_dispatch(text,jsonb,text,text) rename to prepare_pre_refund_shipping_dispatch;
revoke all on function public.prepare_pre_refund_shipping_dispatch(text,jsonb,text,text) from public,anon,authenticated,service_role;
create function public.prepare_shipping_dispatch(p_order_id text,p_request jsonb,p_environment text,p_actor text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.orders where id=p_order_id for update;
 if not exists(select 1 from public.shipping_operations where order_id=p_order_id) and
 (exists(select 1 from public.refund_operations where order_id=p_order_id) or exists(select 1 from public.return_receipts where order_id=p_order_id)) then
  return jsonb_build_object('success',false,'error','Refunded or returned goods need fulfillment review before any new shipment.');
 end if;
 return public.prepare_pre_refund_shipping_dispatch(p_order_id,p_request,p_environment,p_actor);
end;
$$;
revoke all on function public.prepare_shipping_dispatch(text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.prepare_shipping_dispatch(text,jsonb,text,text) to service_role;

alter function public.application_security_tables() rename to application_shipping_security_tables;
create function public.application_security_tables() returns setof text language sql immutable set search_path='' as $$
 select public.application_shipping_security_tables() union all select unnest(array['refund_operations','refund_events','return_receipts','return_receipt_items']::text[]);
$$;
revoke all on function public.application_security_tables(),public.application_shipping_security_tables() from public,anon,authenticated,service_role;
alter function public.application_security_audit() rename to application_shipping_security_audit;
revoke all on function public.application_shipping_security_audit() from public,anon,authenticated,service_role;
create function public.application_security_audit() returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;v jsonb;t text;f regprocedure;
begin
 r:=public.application_shipping_security_audit();v:=r->'violations';
 foreach t in array array['refund_operations','refund_events','return_receipts','return_receipt_items'] loop
  if has_any_column_privilege('anon','public.'||t,'SELECT') or has_any_column_privilege('authenticated','public.'||t,'SELECT') then v:=v||jsonb_build_array('private_refund_read:'||t);end if;
 end loop;
 foreach t in array array['refunds','refund_events','return_receipts','return_receipt_items'] loop
  if has_any_column_privilege('service_role','public.'||t,'INSERT,UPDATE') or has_table_privilege('service_role','public.'||t,'DELETE,TRUNCATE') then v:=v||jsonb_build_array('mutable_refund_evidence:'||t);end if;
 end loop;
 if has_table_privilege('service_role','public.refund_operations','INSERT,DELETE,TRUNCATE') or exists(
  select 1 from pg_attribute where attrelid='public.refund_operations'::regclass and attnum>0 and not attisdropped and attname<>'updated_at'
  and has_column_privilege('service_role','public.refund_operations',attname,'UPDATE')
 ) then v:=v||jsonb_build_array('mutable_refund_operations');end if;
 foreach t in array array['create_return_request(text,text,text,text[])','transition_return_request(text,text,text,text)','prepare_refund(text,text,jsonb,text,text,jsonb)','apply_refund_evidence(text,jsonb)','receive_return_items(text,text,jsonb,text)','prepare_pre_refund_shipping_dispatch(text,jsonb,text,text)','application_shipping_security_tables()','application_shipping_security_audit()','application_refund_schema_health()'] loop
  f:=to_regprocedure('public.'||t);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then v:=v||jsonb_build_array('refund_function_access:'||t);end if;
  if f is not null and not coalesce((select 'search_path=""'=any(proconfig) from pg_proc where oid=f),false) then v:=v||jsonb_build_array('refund_function_search_path:'||t);end if;
 end loop;
 return jsonb_build_object('ok',jsonb_array_length(v)=0,'violations',v);
end;
$$;
revoke all on function public.application_security_audit() from public,anon,authenticated;
grant execute on function public.application_security_audit() to service_role;
insert into public.application_schema_versions(version) values('20261107010000_refund_recovery');
alter function public.application_schema_health() rename to application_refund_schema_health;
revoke all on function public.application_refund_schema_health() from public,anon,authenticated,service_role;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$
 select public.application_refund_schema_health() and exists(select 1 from public.application_schema_versions where version='20261107010000_refund_recovery') and (public.application_security_audit()->>'ok')::boolean;
$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
