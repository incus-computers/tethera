begin;

alter table public.orders add column if not exists shipping_tax_amount numeric(12,2);
alter table public.order_items
  add column if not exists checkout_metadata jsonb,
  add column if not exists discount_snapshot numeric(12,2),
  add column if not exists gross_total_snapshot numeric(12,2);

create table public.checkout_requests (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null,
  request_key text not null,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  order_id text not null references public.orders(id),
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique(owner_id,request_key)
);
alter table public.checkout_requests enable row level security;
revoke all on public.checkout_requests from public,anon,authenticated;
grant select,insert on public.checkout_requests to service_role;

-- Only server-verified checkout data can call this function. All writes share the
-- function transaction; an exception undoes orders, lines, holds and redemption.
create function public.commit_checkout(p_request jsonb,p_order jsonb,p_items jsonb,
  p_stock jsonb,p_catalog jsonb,p_variants jsonb,p_promotion jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_prior public.checkout_requests;
  v_expected jsonb;
  v_current jsonb;
  v_result jsonb;
  v_stock jsonb;
  v_qty integer;
  v_count integer;
  v_promo public.promotions;
  v_owner text := p_request->>'owner_id';
  v_key text := p_request->>'request_key';
  v_store text := '00000000-0000-0000-0000-000000000001';
begin
  if v_owner is null or v_owner='' or v_owner is distinct from p_order->>'customer_id'
    or v_key is null or v_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or (p_request->>'fingerprint') is null or (p_request->>'fingerprint') !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)=0
    or jsonb_typeof(p_stock) is distinct from 'array' or jsonb_array_length(p_stock)=0
    or jsonb_typeof(p_catalog) is distinct from 'array' or jsonb_array_length(p_catalog)=0
    or jsonb_typeof(p_variants) is distinct from 'array' then
    raise exception using errcode='22023',message='Invalid checkout request';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_owner || ':' || v_key,0));
  select * into v_prior from public.checkout_requests where owner_id=v_owner and request_key=v_key;
  if found then
    if v_prior.fingerprint is distinct from p_request->>'fingerprint' then
      raise exception using errcode='PT409',message='Idempotency conflict';
    end if;
    return v_prior.result;
  end if;
  if not exists(select 1 from public.stores where id=v_store and is_active
      and ((p_order->>'fulfillment_type')='delivery' or is_click_and_collect)) then
    raise exception using errcode='PT409',message='Store unavailable';
  end if;
  -- Lock in a fixed order and reject catalog/variant drift since server pricing.
  for v_expected in select value from jsonb_array_elements(p_catalog) order by value->>'id' loop
    select to_jsonb(p) into v_current from public.products p where p.id=v_expected->>'id' for share;
    if v_current is null or not (v_current @> v_expected) or not (v_current->>'is_active')::boolean then
      raise exception using errcode='PT409',message='Catalog changed';
    end if;
  end loop;
  for v_expected in select value from jsonb_array_elements(p_variants) order by value->>'id' loop
    select to_jsonb(v) into v_current from public.product_variants v where v.id=v_expected->>'id' for update;
    if v_current is null or not (v_current @> v_expected) or not (v_current->>'is_active')::boolean then
      raise exception using errcode='PT409',message='Variant changed';
    end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_items) i where (i->>'quantity')::numeric<=0
    or (i->>'quantity')::numeric<>trunc((i->>'quantity')::numeric) or (i->>'quantity')::numeric>100
    or (i->>'unit_price')::numeric<0 or (i->>'unit_price')::numeric<>trunc((i->>'unit_price')::numeric)) then
    raise exception using errcode='22023',message='Invalid checkout amounts';
  end if;
  if (select sum((i->>'quantity')::numeric*(i->>'unit_price')::numeric) from jsonb_array_elements(p_items) i)
       is distinct from (p_order->>'subtotal')::numeric+(p_order->>'assembly_fee')::numeric
    or (p_order->>'total')::numeric is distinct from (p_order->>'subtotal')::numeric+(p_order->>'assembly_fee')::numeric+(p_order->>'shipping_fee')::numeric-(p_order->>'discount_amount')::numeric
    or (p_order->>'total')::numeric<=0 then
    raise exception using errcode='22023',message='Inconsistent checkout total';
  end if;
  -- Every physical line must be represented once in the aggregated stock request.
  if exists(
    (select i->>'product_id',i->>'variant_id',sum((i->>'quantity')::integer)
       from jsonb_array_elements(p_items) i where i->>'product_id' is not null group by 1,2
     except select s->>'productId',s->>'variantId',(s->>'quantity')::bigint from jsonb_array_elements(p_stock) s)
    union all
    (select s->>'productId',s->>'variantId',(s->>'quantity')::bigint from jsonb_array_elements(p_stock) s
     except select i->>'product_id',i->>'variant_id',sum((i->>'quantity')::integer)
       from jsonb_array_elements(p_items) i where i->>'product_id' is not null group by 1,2)
  ) then raise exception using errcode='22023',message='Inconsistent stock request'; end if;
  v_result := public.create_order_with_items(p_order,p_items);
  for v_stock in select value from jsonb_array_elements(p_stock) order by value->>'productId',value->>'variantId' nulls first loop
    v_qty := (v_stock->>'quantity')::integer;
    if v_qty<1 or v_qty>100 then raise exception using errcode='22023',message='Invalid stock quantity'; end if;
    if v_stock->>'variantId' is not null then
      update public.product_variants set reserved_quantity=reserved_quantity+v_qty,updated_at=now()
      where id=v_stock->>'variantId' and product_id=v_stock->>'productId' and is_active and stock_quantity-reserved_quantity>=v_qty;
    else
      update public.store_inventory set stock_reserved=stock_reserved+v_qty,updated_at=now()
      where product_id=v_stock->>'productId' and store_id=v_store and stock_on_hand-stock_reserved>=v_qty;
    end if;
    get diagnostics v_count=row_count;
    if v_count<>1 then raise exception using errcode='PT409',message='Insufficient stock'; end if;
    insert into public.inventory_reservations(order_id,product_id,variant_id,store_id,quantity,status,expires_at)
      values(v_result->'order'->>'id',v_stock->>'productId',v_stock->>'variantId',v_store,v_qty,'reserved',now()+interval '15 minutes');
  end loop;
  if p_promotion is not null and jsonb_typeof(p_promotion)<>'null' then
    select * into v_promo from public.promotions where id=p_promotion->>'id' for update;
    if not found or not v_promo.is_active
      or (to_jsonb(v_promo)-'usage_count'-'total_discount_given'-'updated_at') is distinct from (p_promotion-'usage_count'-'total_discount_given'-'updated_at')
      or coalesce(v_promo.starts_at,v_promo.start_date)>now() or coalesce(v_promo.ends_at,v_promo.end_date)<now()
      or (coalesce(v_promo.max_global_uses,v_promo.usage_limit) is not null and v_promo.usage_count>=coalesce(v_promo.max_global_uses,v_promo.usage_limit)) then
      raise exception using errcode='PT409',message='Promotion changed or exhausted';
    end if;
    if v_promo.max_uses_per_user is not null and (select count(*) from public.orders where customer_id=v_owner and promo_code=v_promo.code)>v_promo.max_uses_per_user then
      raise exception using errcode='PT409',message='Customer promotion cap reached';
    end if;
    update public.promotions set usage_count=usage_count+1,total_discount_given=coalesce(total_discount_given,0)+(p_order->>'discount_amount')::numeric,updated_at=now() where id=v_promo.id;
  end if;
  insert into public.checkout_requests(owner_id,request_key,fingerprint,order_id,result)
    values(v_owner,v_key,p_request->>'fingerprint',v_result->'order'->>'id',v_result);
  return v_result;
end;
$$;
revoke all on function public.commit_checkout(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_checkout(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) to service_role;

insert into public.application_schema_versions(version) values('20261106150000_trusted_checkout');
-- Preserve the earlier column-level check and extend readiness for this release.
alter function public.application_schema_health() rename to application_storage_schema_health;
revoke all on function public.application_storage_schema_health() from public,anon,authenticated;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$
 select public.application_storage_schema_health()
   and exists(select 1 from public.application_schema_versions where version='20261106150000_trusted_checkout')
   and to_regprocedure('public.commit_checkout(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)') is not null
   and exists(select 1 from information_schema.columns where table_schema='public' and table_name='checkout_requests' and column_name='fingerprint')
   and not exists(select 1 from (values ('order_items','checkout_metadata'),('order_items','discount_snapshot'),('order_items','gross_total_snapshot'),('orders','shipping_tax_amount')) e(table_name,column_name)
     where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name));
$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
