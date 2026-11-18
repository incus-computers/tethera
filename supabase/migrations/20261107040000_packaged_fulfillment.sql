begin;
alter table public.product_variants add column shipping jsonb;
alter table public.fulfillments add column package_snapshot jsonb;
alter table public.shipping_operations add column request_key text unique;
alter table public.shipping_operations add column fingerprint text;
alter table public.shipping_operations drop constraint shipping_operations_order_id_key;
create unique index shipping_one_whole_order on public.shipping_operations(order_id) where request_key is null;
create index shipping_operations_order_idx on public.shipping_operations(order_id);
create index fulfillment_items_order_line_idx on public.fulfillment_items(order_item_id);
revoke insert,update,delete,truncate on public.fulfillments,public.fulfillment_items from service_role;

create function public.save_package_profile(p_product_id text,p_variant_id text,p_kind text,p_profile jsonb,p_actor text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.products where id=p_product_id for update;
 if not found then raise exception using errcode='PT404',message='Product not found';end if;
 if p_kind not in ('shipping','assembled_shipping') or coalesce(p_profile->>'handling','') not in ('standard','fragile') or (p_kind='assembled_shipping' and p_profile->>'handling'<>'fragile') or
 coalesce((p_profile->>'weight_grams')::numeric,0) not between 1 and 100000 or (p_profile->>'weight_grams')::numeric<>trunc((p_profile->>'weight_grams')::numeric) or
 exists(select 1 from unnest(array['length','width','height']) d where coalesce((p_profile->'dimensions_cm'->>d)::numeric,0) not between 1 and 300 or (p_profile->'dimensions_cm'->>d)::numeric<>trunc((p_profile->'dimensions_cm'->>d)::numeric)) then raise exception using errcode='22023',message='Invalid packed measurements';end if;
 perform set_config('app.package_profile_write','allowed',true);
 if p_variant_id is null then
  update public.products set specs=jsonb_set(coalesce(specs,'{}'),array[p_kind],p_profile) where id=p_product_id;
 else
  if p_kind<>'shipping' then raise exception using errcode='22023',message='Variant profile must describe the packaged product';end if;
  update public.product_variants set shipping=p_profile,weight_grams=(p_profile->>'weight_grams')::integer,updated_at=now() where id=p_variant_id and product_id=p_product_id;
  if not found then raise exception using errcode='PT404',message='Canonical variant not found';end if;
 end if;
 insert into public.admin_audit_logs(actor_id,actor_name,role,action,entity_type,entity_id,after_state) values(p_actor,p_actor,'CATALOG_MANAGER','PACKAGE_PROFILE_SAVED','product',p_product_id,jsonb_build_object('variant_id',p_variant_id,'kind',p_kind,'profile',p_profile));
 return true;
end;
$$;

create function public.preserve_package_profiles() returns trigger language plpgsql set search_path='' as $$
declare key text;
begin
 if current_setting('app.package_profile_write',true) is distinct from 'allowed' then
  foreach key in array array['shipping','assembled_shipping'] loop
   if old.specs ? key then new.specs:=jsonb_set(coalesce(new.specs,'{}'),array[key],old.specs->key);
   else new.specs:=coalesce(new.specs,'{}')-key;end if;
  end loop;
 end if;
 return new;
end;
$$;
revoke all on function public.preserve_package_profiles() from public,anon,authenticated,service_role;
create trigger preserve_package_profiles before update of specs on public.products for each row execute function public.preserve_package_profiles();

create function public.prepare_parcel_dispatch(p_order_id text,p_key text,p_fingerprint text,p_items jsonb,p_request jsonb,p_environment text,p_actor text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders;s public.shipping_operations;v_id text:=gen_random_uuid()::text;v_fid text:=gen_random_uuid()::text;i jsonb;l public.order_items;v_used bigint;v_value numeric:=0;v_qty numeric;v_sold bigint;v_committed bigint;v_wanted bigint;v_snapshot jsonb;v_pack jsonb:=p_request->'items'->0;
begin
 if p_key !~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or length(p_fingerprint)<>64 or p_environment not in ('demo','test','production') or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception using errcode='22023',message='Invalid parcel request';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='PT404',message='Order not found';end if;
 select * into s from public.shipping_operations where request_key=p_key;
 if found then
  if s.order_id<>o.id or s.fingerprint<>p_fingerprint or s.environment<>p_environment then raise exception using errcode='PT409',message='Parcel request key conflicts with its existing booking';end if;
  return jsonb_build_object('success',true,'may_create',false,'operation',to_jsonb(s));
 end if;
 if o.paid_at is null or o.fulfillment_type<>'delivery' or o.status not in ('ready_for_dispatch','finding_courier','partially_fulfilled','on_delivery','courier_failed','courier_rejected') then raise exception using errcode='PT409',message='Paid delivery-ready order required';end if;
 if exists(select 1 from public.payment_attempts where order_id=o.id and state='review') or (p_environment<>'demo' and not exists(select 1 from public.payment_attempts where order_id=o.id and state='settled' and transaction_id=o.payment_reference and amount=o.total and environment=case when p_environment='test' then 'sandbox' else 'production' end)) then raise exception using errcode='PT409',message='Verified payment requires reconciliation before shipping';end if;
 if exists(select 1 from public.refund_operations where order_id=o.id) or exists(select 1 from public.return_receipts where order_id=o.id) then raise exception using errcode='PT409',message='Refund/return requires fulfillment review';end if;
 if exists(select 1 from public.shipping_operations where order_id=o.id and request_key is null) or exists(select 1 from public.fulfillments f where f.order_id=o.id and not exists(select 1 from public.shipping_operations op where op.fulfillment_id=f.id)) then raise exception using errcode='PT409',message='Legacy shipment or allocation requires reconciliation';end if;
 v_snapshot:=jsonb_build_object('shipping_address',o.shipping_address,'customer_name',o.customer_name,'customer_email',o.customer_email,'customer_phone',o.customer_phone,'quote_items',o.courier_info->'quote_items','quote_origin',o.courier_info->'quote_origin','courier_company',o.courier_info->'courier_company','service_code',o.courier_info->'service_code');
 if p_request->'_snapshot' is distinct from v_snapshot then raise exception using errcode='PT409',message='Saved shipping details changed';end if;
 if p_request->'_packing'->>'confirmed' is distinct from 'true' or p_request->'_packing'->>'handling' is distinct from 'fragile' or jsonb_array_length(p_request->'items')<>1 or (v_pack->>'quantity')::numeric is distinct from 1 or
 coalesce((v_pack->>'weight')::numeric,0) not between 1 and 100000 or (v_pack->>'weight')::numeric<>trunc((v_pack->>'weight')::numeric) or
 exists(select 1 from unnest(array['length','width','height']) d where coalesce((v_pack->>d)::numeric,0) not between 1 and 300 or (v_pack->>d)::numeric<>trunc((v_pack->>d)::numeric)) then raise exception using errcode='22023',message='Measured fragile parcel and packing confirmation required';end if;
 if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'order_item_id' having count(*)>1) then raise exception using errcode='22023',message='Duplicate parcel line';end if;
 for i in select value from jsonb_array_elements(p_items) loop
  v_qty:=(i->>'quantity')::numeric;
  select * into l from public.order_items where id=i->>'order_item_id' and order_id=o.id;
  if not found or l.product_id is null or v_qty is null or v_qty not between 1 and 100 or v_qty<>trunc(v_qty) then raise exception using errcode='22023',message='Invalid physical order allocation';end if;
  if not exists(select 1 from jsonb_array_elements(p_request->'_lines') x where x->>'id'=l.id and x->>'product_id'=l.product_id and (x->>'variant_id') is not distinct from l.variant_id and (x->>'unit_price')::numeric=l.unit_price and (x->'checkout_metadata') is not distinct from coalesce(l.checkout_metadata,'null'::jsonb)) then raise exception using errcode='PT409',message='Order line snapshot changed';end if;
  select coalesce(sum(fi.quantity),0) into v_used from public.fulfillment_items fi join public.fulfillments f on f.id=fi.fulfillment_id where f.order_id=o.id and fi.order_item_id=l.id;
  if v_used+v_qty>l.quantity then raise exception using errcode='PT409',message='Parcel exceeds remaining ordered quantity';end if;
  if l.checkout_metadata->>'build' is not null and exists(select 1 from public.order_items sibling where sibling.order_id=o.id and sibling.product_id is not null and sibling.checkout_metadata->>'build'=l.checkout_metadata->>'build' and not exists(select 1 from jsonb_array_elements(p_items) x where x->>'order_item_id'=sibling.id and (x->>'quantity')::numeric=sibling.quantity)) then raise exception using errcode='PT409',message='Assembled build components must travel together';end if;
  select coalesce(sum(quantity),0) into v_sold from public.inventory_reservations where order_id=o.id and product_id=l.product_id and variant_id is not distinct from l.variant_id and status='settled';
  select coalesce(sum(fi.quantity),0) into v_committed from public.fulfillment_items fi join public.fulfillments f on f.id=fi.fulfillment_id join public.order_items oi on oi.id=fi.order_item_id where f.order_id=o.id and oi.product_id=l.product_id and oi.variant_id is not distinct from l.variant_id;
  select coalesce(sum((x.value->>'quantity')::integer),0) into v_wanted from jsonb_array_elements(p_items) x join public.order_items oi on oi.id=x.value->>'order_item_id' where oi.order_id=o.id and oi.product_id=l.product_id and oi.variant_id is not distinct from l.variant_id;
  if v_committed+v_wanted>v_sold then raise exception using errcode='PT409',message='Settled inventory coverage requires reconciliation';end if;
  v_value:=v_value+l.unit_price*v_qty;
 end loop;
 if (v_pack->>'value')::numeric is distinct from v_value or (p_request->>'courier_insurance')::numeric is distinct from v_value or coalesce((p_request->'_quote'->>'price')::numeric,0)<=0 then raise exception using errcode='PT409',message='Declared goods value or insured quote mismatch';end if;
 insert into public.fulfillments(id,order_id,fulfillment_number,carrier,service_code,status,dispatched_by,package_snapshot) values(v_fid,o.id,'FUL-'||v_id,p_request->>'courier_company',p_request->>'courier_type','processing',p_actor,jsonb_build_object('items',p_request->'items','packing',p_request->'_packing','insurance_requested',v_value));
 for i in select value from jsonb_array_elements(p_items) loop insert into public.fulfillment_items(fulfillment_id,order_item_id,quantity) values(v_fid,i->>'order_item_id',(i->>'quantity')::integer);end loop;
 insert into public.shipping_operations(id,order_id,fulfillment_id,reference_id,environment,request,request_key,fingerprint) values(v_id,o.id,v_fid,'SHIP-'||v_id,p_environment,p_request||jsonb_build_object('reference_id','SHIP-'||v_id),p_key,p_fingerprint) returning * into s;
 insert into public.admin_audit_logs(actor_id,actor_name,role,action,entity_type,entity_id,after_state) values(p_actor,p_actor,'FULFILLMENT_OPERATOR','PARCEL_PREPARED','shipping_operation',s.id,jsonb_build_object('items',p_items,'insured_value',v_value,'quote',p_request->'_quote'));
 return jsonb_build_object('success',true,'may_create',true,'operation',to_jsonb(s));
end;
$$;

-- Keep legacy whole-order recovery, but never mix whole and parcel allocations.
create or replace function public.prepare_shipping_dispatch(p_order_id text,p_request jsonb,p_environment text,p_actor text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.orders where id=p_order_id for update;
 if exists(select 1 from public.shipping_operations where order_id=p_order_id and request_key is not null) then return jsonb_build_object('success',false,'error','Use the individual parcel operations to reconcile split shipments.');end if;
 if not exists(select 1 from public.shipping_operations where order_id=p_order_id) then
  if exists(select 1 from public.payment_attempts where order_id=p_order_id and state='review') then return jsonb_build_object('success',false,'error','Payment requires reconciliation before shipping.');end if;
  if exists(select 1 from public.refund_operations where order_id=p_order_id) or exists(select 1 from public.return_receipts where order_id=p_order_id) then return jsonb_build_object('success',false,'error','Refunded or returned goods need fulfillment review before any new shipment.');end if;
  if p_environment<>'demo' and (p_request->'_packing'->>'confirmed' is distinct from 'true' or (p_request->>'courier_insurance')::numeric is distinct from (select (courier_info->'quote_insurance'->>'value')::numeric from public.orders where id=p_order_id) or p_request->>'courier_insurance' is null) then return jsonb_build_object('success',false,'error','Confirm saved packing measurements and full-value insurance before dispatch.');end if;
 end if;
 return public.prepare_pre_refund_shipping_dispatch(p_order_id,p_request,p_environment,p_actor);
end;
$$;

alter function public.apply_shipping_evidence(text,jsonb) rename to apply_single_shipping_evidence;
revoke all on function public.apply_single_shipping_evidence(text,jsonb) from public,anon,authenticated,service_role;
create function public.apply_shipping_evidence(p_operation_id text,p_evidence jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;s public.shipping_operations;o public.orders;v_order text;v_status text;v_complete boolean;v_incomplete boolean;v_expected numeric;v_confirmed numeric;
begin
 select order_id into v_order from public.shipping_operations where id=p_operation_id;
 select * into o from public.orders where id=v_order for update;
 r:=public.apply_single_shipping_evidence(p_operation_id,p_evidence);
 select * into s from public.shipping_operations where id=p_operation_id;
 v_expected:=(s.request->>'courier_insurance')::numeric;select coalesce((p_evidence->>'insured_value')::numeric,(package_snapshot->>'insurance_confirmed')::numeric) into v_confirmed from public.fulfillments where id=s.fulfillment_id;
 if v_expected is not null then
  update public.fulfillments set package_snapshot=coalesce(package_snapshot,'{}')||jsonb_build_object('insurance_requested',v_expected,'insurance_confirmed',v_confirmed,'insurance_fee',p_evidence->'insurance_fee','insurance_status',case when v_expected=v_confirmed then 'confirmed' else 'review' end) where id=s.fulfillment_id;
  if v_expected>0 and v_expected is distinct from v_confirmed then update public.shipping_operations set state='review' where id=s.id returning * into s;
  elsif s.state='review' and o.paid_at is not null and s.shipment_status not in ('failed','rejected','cancelled','returned') and o.status not in ('cancelled','refunded','partially_refunded','finished','collected') then update public.shipping_operations set state='booked' where id=s.id returning * into s;end if;
 end if;
 if o.paid_at is not null and o.status not in ('cancelled','refunded','partially_refunded','finished','collected') then
  select not exists(select 1 from public.order_items line where line.order_id=o.id and line.product_id is not null and line.quantity>(select coalesce(sum(fi.quantity),0) from public.fulfillment_items fi join public.fulfillments f on f.id=fi.fulfillment_id where fi.order_item_id=line.id and f.order_id=o.id and f.status='delivered')) into v_complete;
  select exists(select 1 from public.order_items line where line.order_id=o.id and line.product_id is not null and line.quantity>(select coalesce(sum(fi.quantity),0) from public.fulfillment_items fi join public.fulfillments f on f.id=fi.fulfillment_id where fi.order_item_id=line.id and f.order_id=o.id and f.status in ('shipped','in_transit','delivered'))) into v_incomplete;
  v_status:=case when v_complete then 'delivery_arrived' when exists(select 1 from public.fulfillments where order_id=o.id and status in ('failed','cancelled')) then 'courier_failed' when exists(select 1 from public.fulfillments where order_id=o.id and status in ('shipped','in_transit','delivered')) then case when v_incomplete then 'partially_fulfilled' else 'on_delivery' end else 'finding_courier' end;
  update public.orders set status=v_status,updated_at=now() where id=o.id returning * into o;
 else select * into o from public.orders where id=o.id;end if;
 return r||jsonb_build_object('operation',to_jsonb(s),'order',to_jsonb(o));
end;
$$;
revoke all on function public.save_package_profile(text,text,text,jsonb,text),public.prepare_parcel_dispatch(text,text,text,jsonb,jsonb,text,text),public.apply_shipping_evidence(text,jsonb) from public,anon,authenticated;
grant execute on function public.save_package_profile(text,text,text,jsonb,text),public.prepare_parcel_dispatch(text,text,text,jsonb,jsonb,text,text),public.apply_shipping_evidence(text,jsonb) to service_role;
alter function public.application_security_audit() rename to application_refund_security_audit;
revoke all on function public.application_refund_security_audit() from public,anon,authenticated,service_role;
create function public.application_security_audit() returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;v jsonb;t text;f regprocedure;
begin
 r:=public.application_refund_security_audit();v:=r->'violations';
 foreach t in array array['save_package_profile(text,text,text,jsonb,text)','preserve_package_profiles()','prepare_parcel_dispatch(text,text,text,jsonb,jsonb,text,text)','apply_single_shipping_evidence(text,jsonb)','application_refund_security_audit()','application_package_schema_health()'] loop
  f:=to_regprocedure('public.'||t);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then v:=v||jsonb_build_array('parcel_function_access:'||t);end if;
  if f is not null and not coalesce((select 'search_path=""'=any(proconfig) from pg_proc where oid=f),false) then v:=v||jsonb_build_array('parcel_function_search_path:'||t);end if;
 end loop;
 foreach t in array array['fulfillments','fulfillment_items'] loop
  if has_any_column_privilege('service_role','public.'||t,'INSERT,UPDATE') or has_table_privilege('service_role','public.'||t,'DELETE,TRUNCATE') then v:=v||jsonb_build_array('mutable_parcel_allocations:'||t);end if;
 end loop;
 if not exists(select 1 from pg_trigger where tgrelid='public.products'::regclass and tgname='preserve_package_profiles' and tgenabled in ('O','A')) then v:=v||jsonb_build_array('missing_package_profile_guard');end if;
 if exists(select 1 from (values('product_variants','shipping'),('fulfillments','package_snapshot'),('shipping_operations','request_key'),('shipping_operations','fingerprint')) required(table_name,column_name) where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.table_name and c.column_name=required.column_name)) then v:=v||jsonb_build_array('missing_package_columns');end if;
 return jsonb_build_object('ok',jsonb_array_length(v)=0,'violations',v);
end;
$$;
revoke all on function public.application_security_audit() from public,anon,authenticated;
grant execute on function public.application_security_audit() to service_role;
insert into public.application_schema_versions(version) values('20261107040000_packaged_fulfillment');
alter function public.application_schema_health() rename to application_package_schema_health;
revoke all on function public.application_package_schema_health() from public,anon,authenticated,service_role;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$
 select public.application_package_schema_health() and exists(select 1 from public.application_schema_versions where version='20261107040000_packaged_fulfillment') and (public.application_security_audit()->>'ok')::boolean;
$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
