begin;
create table public.shipping_operations(
 id text primary key,order_id text not null unique references public.orders(id),fulfillment_id text not null unique references public.fulfillments(id),
 reference_id text not null unique,provider_id text unique,environment text not null check(environment in ('demo','test','production')),
 request jsonb not null,state text not null default 'creating' check(state in ('creating','booked','review')),
 shipment_status text,progress integer not null default -1,evidence jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.shipping_events(id text primary key default gen_random_uuid()::text,operation_id text not null references public.shipping_operations(id),event_key text not null,evidence jsonb not null,created_at timestamptz not null default now(),unique(operation_id,event_key));
create table public.shipping_carrier_costs(id text primary key default gen_random_uuid()::text,operation_id text not null references public.shipping_operations(id),carrier_cost numeric(12,2) not null check(carrier_cost>=0 and carrier_cost=trunc(carrier_cost)),created_at timestamptz not null default now(),unique(operation_id,carrier_cost));
alter table public.shipping_operations enable row level security;
alter table public.shipping_events enable row level security;
alter table public.shipping_carrier_costs enable row level security;
revoke all on public.shipping_operations,public.shipping_events,public.shipping_carrier_costs from public,anon,authenticated,service_role;
grant select on public.shipping_operations,public.shipping_events,public.shipping_carrier_costs to service_role;
grant update(updated_at) on public.shipping_operations to service_role;
create index shipping_operations_reconcile_idx on public.shipping_operations(state,updated_at);

create function public.prepare_shipping_dispatch(p_order_id text,p_request jsonb,p_environment text,p_actor text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders;s public.shipping_operations;v_id text:=gen_random_uuid()::text;v_fid text:=gen_random_uuid()::text;line record;
begin
 if p_environment not in ('demo','test','production') or jsonb_typeof(p_request) is distinct from 'object' then raise exception using errcode='22023',message='Invalid shipping request';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then return jsonb_build_object('success',false,'error','Order not found.');end if;
 select * into s from public.shipping_operations where order_id=o.id;
 if found then
  if s.environment<>p_environment or (s.request-'reference_id') is distinct from (p_request-'reference_id') then return jsonb_build_object('success',false,'error','Dispatch request conflicts with its existing operation.');end if;
  return jsonb_build_object('success',true,'may_create',false,'operation',to_jsonb(s));
 end if;
 if o.paid_at is null or o.fulfillment_type<>'delivery' or o.status not in ('ready_for_dispatch','finding_courier','courier_failed','courier_rejected') then return jsonb_build_object('success',false,'error','Order must be paid, delivery-ready and eligible for dispatch.');end if;
 if (p_environment<>'demo' or p_request ? '_snapshot') and (p_request->'_snapshot') is distinct from jsonb_build_object('shipping_address',o.shipping_address,'customer_name',o.customer_name,'customer_email',o.customer_email,'customer_phone',o.customer_phone,'quote_items',o.courier_info->'quote_items','quote_origin',o.courier_info->'quote_origin','courier_company',o.courier_info->'courier_company','service_code',o.courier_info->'service_code') then
  return jsonb_build_object('success',false,'error','Shipping details changed before booking.');end if;
 if exists(select 1 from public.fulfillments where order_id=o.id) or o.courier_info->>'biteship_order_id' is not null then return jsonb_build_object('success',false,'error','Existing shipment or allocation requires reconciliation.');end if;
 if not exists(select 1 from public.order_items where order_id=o.id and product_id is not null) then return jsonb_build_object('success',false,'error','No physical order items.');end if;
 insert into public.fulfillments(id,order_id,fulfillment_number,carrier,service_code,status,dispatched_by)
 values(v_fid,o.id,'FUL-'||v_id,p_request->>'courier_company',p_request->>'courier_type','processing',p_actor);
 for line in select * from public.order_items where order_id=o.id and product_id is not null loop
  insert into public.fulfillment_items(fulfillment_id,order_item_id,quantity) values(v_fid,line.id,line.quantity);
 end loop;
 insert into public.shipping_operations(id,order_id,fulfillment_id,reference_id,environment,request)
 values(v_id,o.id,v_fid,'SHIP-'||v_id,p_environment,p_request||jsonb_build_object('reference_id','SHIP-'||v_id)) returning * into s;
 insert into public.admin_audit_logs(actor_id,actor_name,role,action,entity_type,entity_id,after_state)
 values(p_actor,p_actor,'FULFILLMENT_OPERATOR','DISPATCH_PREPARED','shipping_operation',s.id,jsonb_build_object('order_id',o.id));
 return jsonb_build_object('success',true,'may_create',true,'operation',to_jsonb(s));
end;
$$;
create function public.apply_shipping_evidence(p_operation_id text,p_evidence jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.shipping_operations;o public.orders;v_order text;v_status text:=p_evidence->>'status';v_rank integer;v_key text;v_info jsonb;v_terminal boolean;
begin
 select order_id into v_order from public.shipping_operations where id=p_operation_id;
 select * into o from public.orders where id=v_order for update;
 select * into s from public.shipping_operations where id=p_operation_id for update;
 if not found or p_evidence->>'reference_id' is distinct from s.reference_id or coalesce(length(p_evidence->>'provider_id'),0) not between 1 and 100 or (s.provider_id is not null and s.provider_id is distinct from p_evidence->>'provider_id') then raise exception using errcode='22023',message='Shipment identity mismatch';end if;
 v_rank:=case v_status when 'confirmed' then 0 when 'scheduled' then 0 when 'allocated' then 1 when 'picking_up' then 2 when 'picked' then 3 when 'in_transit' then 4 when 'dropping_off' then 5 when 'delivered' then 6 when 'cancelled' then 7 when 'rejected' then 7 when 'failed' then 7 when 'returned' then 7 else null end;
 if v_rank is null or ((p_evidence->>'carrier_cost') is not null and ((p_evidence->>'carrier_cost')::numeric<0 or (p_evidence->>'carrier_cost')::numeric<>trunc((p_evidence->>'carrier_cost')::numeric))) then raise exception using errcode='22023',message='Invalid shipping evidence';end if;
 v_key:=encode(sha256(convert_to(p_evidence::text,'UTF8')),'hex');
 if exists(select 1 from public.shipping_events where operation_id=s.id and event_key=v_key) then return jsonb_build_object('success',true,'replayed',true,'operation',to_jsonb(s),'order',to_jsonb(o));end if;
 insert into public.shipping_events(operation_id,event_key,evidence) values(s.id,v_key,p_evidence);
 if (p_evidence->>'carrier_cost') is not null then insert into public.shipping_carrier_costs(operation_id,carrier_cost) values(s.id,(p_evidence->>'carrier_cost')::numeric) on conflict do nothing;end if;
 -- Record reordered events, but never regress a delivered/failed shipment or a later stage.
 v_terminal:=s.shipment_status in ('delivered','cancelled','rejected','failed','returned');
 if coalesce(v_terminal,false) or v_rank<s.progress then return jsonb_build_object('success',true,'replayed',false,'operation',to_jsonb(s),'order',to_jsonb(o));end if;
 if o.paid_at is null or o.status in ('cancelled','refunded','partially_refunded','collected','finished') then
  update public.shipping_operations set state='review',provider_id=p_evidence->>'provider_id',evidence=p_evidence,updated_at=now() where id=s.id returning * into s;
  return jsonb_build_object('success',true,'review',true,'operation',to_jsonb(s),'order',to_jsonb(o));
 end if;
 update public.shipping_operations set provider_id=p_evidence->>'provider_id',state=case when v_rank=7 then 'review' else 'booked' end,shipment_status=v_status,progress=v_rank,evidence=p_evidence,updated_at=now() where id=s.id returning * into s;
 update public.fulfillments set waybill_id=coalesce(p_evidence->>'waybill_id',waybill_id),tracking_url=coalesce(p_evidence->>'tracking_url',tracking_url),
  status=case when v_status='delivered' then 'delivered' when v_rank=7 then 'failed' when v_rank>=3 then 'shipped' else 'processing' end,
  shipped_at=case when v_rank between 3 and 6 then coalesce(shipped_at,now()) else shipped_at end,delivered_at=case when v_status='delivered' then coalesce(delivered_at,now()) else delivered_at end,updated_at=now() where id=s.fulfillment_id;
 v_info:=coalesce(o.courier_info,'{}')||jsonb_build_object('provider','biteship','biteship_order_id',s.provider_id,'status',v_status,'dispatched_at',coalesce(o.courier_info->>'dispatched_at',now()::text))||jsonb_strip_nulls(p_evidence-'provider_id'-'reference_id'-'carrier_cost');
 update public.orders set courier_info=v_info,status=case when v_status='delivered' then 'delivery_arrived' when v_rank=7 then 'courier_failed' when v_rank>=3 then 'on_delivery' else 'finding_courier' end,updated_at=now() where id=o.id returning * into o;
 return jsonb_build_object('success',true,'replayed',false,'operation',to_jsonb(s),'order',to_jsonb(o));
end;
$$;
revoke all on function public.prepare_shipping_dispatch(text,jsonb,text,text),public.apply_shipping_evidence(text,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_shipping_dispatch(text,jsonb,text,text),public.apply_shipping_evidence(text,jsonb) to service_role;

-- Extend the Step 7 manifest/audit without changing its approved customer policies.
alter function public.application_security_tables() rename to application_core_security_tables;
create function public.application_security_tables() returns setof text language sql immutable set search_path='' as $$
 select public.application_core_security_tables() union all select unnest(array['shipping_operations','shipping_events','shipping_carrier_costs']::text[]);
$$;
revoke all on function public.application_security_tables(),public.application_core_security_tables() from public,anon,authenticated,service_role;
alter function public.application_security_audit() rename to application_core_security_audit;
revoke all on function public.application_core_security_audit() from public,anon,authenticated,service_role;
create function public.application_security_audit() returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;v jsonb;t text;f regprocedure;
begin
 r:=public.application_core_security_audit();v:=r->'violations';
 foreach t in array array['shipping_operations','shipping_events','shipping_carrier_costs'] loop
  if has_any_column_privilege('anon','public.'||t,'SELECT') or has_any_column_privilege('authenticated','public.'||t,'SELECT') then v:=v||jsonb_build_array('private_shipping_read:'||t);end if;
 end loop;
 foreach t in array array['prepare_shipping_dispatch(text,jsonb,text,text)','apply_shipping_evidence(text,jsonb)','application_core_security_audit()','application_core_security_tables()','application_shipping_schema_health()'] loop
  f:=to_regprocedure('public.'||t);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then v:=v||jsonb_build_array('shipping_function_access:'||t);end if;
  if f is not null and not coalesce((select 'search_path=""'=any(proconfig) from pg_proc where oid=f),false) then v:=v||jsonb_build_array('shipping_function_search_path:'||t);end if;
 end loop;
 return jsonb_build_object('ok',jsonb_array_length(v)=0,'violations',v);
end;
$$;
revoke all on function public.application_security_audit() from public,anon,authenticated;
grant execute on function public.application_security_audit() to service_role;
insert into public.application_schema_versions(version) values('20261106233000_biteship_dispatch');
alter function public.application_schema_health() rename to application_shipping_schema_health;
revoke all on function public.application_shipping_schema_health() from public,anon,authenticated,service_role;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$
 select public.application_shipping_schema_health() and exists(select 1 from public.application_schema_versions where version='20261106233000_biteship_dispatch') and (public.application_security_audit()->>'ok')::boolean;
$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
