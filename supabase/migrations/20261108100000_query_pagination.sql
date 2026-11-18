-- Step 15: bounded collection queries. Apply once after safe_media_storage.
begin;
set local search_path=public,extensions;
create index if not exists products_active_created_page_idx on public.products(created_at desc,id) where is_active;
create index if not exists products_active_price_page_idx on public.products((case when sale_price is not null and sale_price<retail_price then sale_price else retail_price end),id) where is_active;
create index if not exists products_category_page_idx on public.products(lower(category_slug),id) where is_active;
create index if not exists products_brand_page_idx on public.products(lower(brand),id) where is_active;
create index if not exists products_slot_page_idx on public.products(pc_builder_slot,id) where is_active;
create index if not exists products_name_search_page_idx on public.products using gin(name gin_trgm_ops);
create index if not exists products_brand_search_page_idx on public.products using gin(brand gin_trgm_ops);
create index if not exists products_sku_search_page_idx on public.products using gin(sku gin_trgm_ops);
create index if not exists orders_owner_page_idx on public.orders(customer_id,created_at desc,id);
create index if not exists orders_status_page_idx on public.orders(status,created_at desc,id);
create index if not exists orders_created_page_idx on public.orders(created_at desc,id);
create index if not exists orders_number_search_page_idx on public.orders using gin(order_number gin_trgm_ops);
create index if not exists orders_name_search_page_idx on public.orders using gin(customer_name gin_trgm_ops);
create index if not exists orders_email_search_page_idx on public.orders using gin(customer_email gin_trgm_ops);
create index if not exists order_items_order_page_idx on public.order_items(order_id,id);
create index if not exists variants_product_available_page_idx on public.product_variants(product_id) where is_active and stock_quantity>reserved_quantity;
create index if not exists inventory_product_store_page_idx on public.store_inventory(product_id,store_id);
create index if not exists customers_created_page_idx on public.customer_profiles(created_at desc,id);
create index if not exists customers_name_search_page_idx on public.customer_profiles using gin(full_name gin_trgm_ops);
create index if not exists customers_email_search_page_idx on public.customer_profiles using gin(email gin_trgm_ops);
create index if not exists audit_logs_recent_page_idx on public.admin_audit_logs(created_at desc,id);
create index if not exists inventory_ledger_recent_page_idx on public.inventory_adjustment_ledger(created_at desc,id);
create index if not exists inventory_ledger_product_page_idx on public.inventory_adjustment_ledger(product_id,created_at desc,id);

create function public.collection_stock(p_product text) returns integer language sql stable set search_path='' as $$
 select case when exists(select 1 from public.product_variants where product_id=p_product and is_active)
 then coalesce((select sum(greatest(stock_quantity-reserved_quantity,0)) from public.product_variants where product_id=p_product and is_active),0)::integer
 else coalesce((select greatest(stock_on_hand-stock_reserved,0) from public.store_inventory where product_id=p_product and store_id='00000000-0000-0000-0000-000000000001'),0)::integer end;
$$;
create function public.collection_status(p_status text,p_filter text) returns boolean language sql immutable set search_path='' as $$
 select case coalesce(p_filter,'') when '' then true when 'all' then true
 when 'pending' then p_status in ('pending','pending_payment','order_received')
 when 'processing' then p_status in ('order_accepted','finding_stock','ready_for_dispatch','payment_received','assembly_in_progress','testing_bench','assembling','quality_check','finding_courier','ready_for_pickup','processing','packed')
 when 'shipped' then p_status in ('on_delivery','in_transit','shipped','dispatched')
 when 'delivered' then p_status in ('completed','delivered','delivery_arrived','collected','finished')
 when 'cancelled' then p_status in ('cancelled','rejected','refunded')
 else p_status=p_filter end;
$$;
create function public.collection_search(p_text text) returns text language sql immutable set search_path='' as $$
 select '%'||replace(replace(replace(coalesce(p_text,''),chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_')||'%';
$$;
revoke all on function public.collection_stock(text),public.collection_status(text,text),public.collection_search(text) from public,anon,authenticated,service_role;

-- Only trusted server routes call this function. p_owner comes from the verified
-- customer session; NULL means an already-authorized staff collection request.
-- One JSON response avoids PostgREST's row cap on nested item collections.
create function public.read_collection_page(p_kind text,p_filters jsonb default '{}',p_page integer default 1,p_limit integer default 50,p_owner text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare source_sql text;result jsonb;ids jsonb;rows_json jsonb;facets_json jsonb;stats_json jsonb;total_count bigint;
begin
 if p_kind is null or p_kind not in ('catalog','orders','products','customers','inventory') or p_filters is null or jsonb_typeof(p_filters)<>'object' or octet_length(p_filters::text)>4096
 or p_page is null or p_page not between 1 and 10000 or p_limit is null or p_limit not between 1 and 100
 or length(coalesce(p_filters->>'search',''))>120 or length(coalesce(p_filters->>'status',''))>40
 or length(coalesce(p_filters->>'id',''))>100 or length(coalesce(p_filters->>'categorySlug',''))>80
 or length(coalesce(p_filters->>'pcBuilderSlot',''))>40 or length(coalesce(p_filters->>'segment',''))>40
 or (p_owner is not null and (p_kind<>'orders' or length(p_owner) not between 1 and 100)) then
 raise exception using errcode='22023',message='Invalid collection request';end if;
 if p_kind='catalog' then
  if coalesce(p_filters->>'sort','featured') not in ('','featured','newest','price-asc','price-desc','rating')
  or (p_filters ? 'brands' and (jsonb_typeof(p_filters->'brands')<>'array' or jsonb_array_length(p_filters->'brands')>20))
  or (p_filters ? 'minPrice' and ((p_filters->>'minPrice')::numeric<0 or (p_filters->>'minPrice')::numeric>1000000000000))
  or (p_filters ? 'maxPrice' and ((p_filters->>'maxPrice')::numeric<0 or (p_filters->>'maxPrice')::numeric>1000000000000)) then raise exception using errcode='22023',message='Invalid catalog filters';end if;
  source_sql:=$q$select p.id,p.created_at,
   case when p.sale_price is not null and p.sale_price<p.retail_price then p.sale_price else p.retail_price end as sort_total,
   p.brand,p.category_slug,public.collection_stock(p.id)>0 as in_stock
   from public.products p where p.is_active
   and (coalesce($1->>'search','')='' or p.name ilike public.collection_search($1->>'search') or p.brand ilike public.collection_search($1->>'search') or p.sku ilike public.collection_search($1->>'search') or p.category_slug ilike public.collection_search($1->>'search'))
   and (coalesce($1->>'categorySlug','') in ('','all') or lower(p.category_slug)=lower($1->>'categorySlug') or lower(p.pc_builder_slot)=lower($1->>'categorySlug')
    or lower(p.category_slug) like public.collection_search(lower($1->>'categorySlug'))
    or (lower($1->>'categorySlug') in ('processors','cpu') and (p.pc_builder_slot='cpu' or p.category_slug in ('processors','cpu')))
    or (lower($1->>'categorySlug') in ('graphics-cards','gpu') and (p.pc_builder_slot='gpu' or p.category_slug in ('graphics-cards','gpu')))
    or (lower($1->>'categorySlug')='motherboards' and p.pc_builder_slot='motherboard')
    or (lower($1->>'categorySlug')='memory' and p.pc_builder_slot='ram')
    or (lower($1->>'categorySlug')='chassis' and p.pc_builder_slot='case'))
   and (coalesce(jsonb_array_length($1->'brands'),0)=0 or lower(p.brand) in(select lower(value) from jsonb_array_elements_text($1->'brands')))
   and (not ($1 ? 'minPrice') or (case when p.sale_price is not null and p.sale_price<p.retail_price then p.sale_price else p.retail_price end)>=($1->>'minPrice')::numeric)
   and (not ($1 ? 'maxPrice') or (case when p.sale_price is not null and p.sale_price<p.retail_price then p.sale_price else p.retail_price end)<=($1->>'maxPrice')::numeric)
   and (not coalesce(($1->>'inStockOnly')::boolean,false) or public.collection_stock(p.id)>0)
   and (coalesce($1->>'pcBuilderSlot','')='' or p.pc_builder_slot=$1->>'pcBuilderSlot')$q$;
 elsif p_kind='orders' then
  source_sql:=$q$select o.id,o.created_at,o.total as sort_total,null::text brand,null::text category_slug,false in_stock from public.orders o
   where ($2 is null or o.customer_id=$2) and (coalesce($1->>'id','')='' or o.id=$1->>'id')
   and public.collection_status(o.status,$1->>'status')
   and (coalesce($1->>'scope','all')='all' or (($1->>'scope'='past')=(o.status in ('completed','delivered','delivery_arrived','collected','finished','cancelled','rejected','refunded'))))
   and (coalesce($1->>'search','')='' or o.order_number ilike public.collection_search($1->>'search') or o.customer_name ilike public.collection_search($1->>'search') or o.customer_email ilike public.collection_search($1->>'search') or o.id ilike public.collection_search($1->>'search'))$q$;
 elsif p_kind='inventory' then
  source_sql:=$q$select i.id,i.updated_at created_at,case when i.stock_on_hand=0 then 0 when i.stock_on_hand<=coalesce(i.low_stock_threshold,2) then 1 else 2 end sort_total,p.name brand,p.category_slug,false in_stock from public.store_inventory i left join public.products p on p.id=i.product_id
   where i.store_id='00000000-0000-0000-0000-000000000001'
   and (coalesce($1->>'productId','')='' or i.product_id=$1->>'productId')
   and (not coalesce(($1->>'lowStockOnly')::boolean,false) or i.stock_on_hand<=coalesce(i.low_stock_threshold,2))$q$;
 elsif p_kind='products' then
  source_sql:=$q$select p.id,p.created_at,p.retail_price as sort_total,p.brand,p.category_slug,false in_stock from public.products p
   where coalesce($1->>'search','')='' or p.name ilike public.collection_search($1->>'search') or p.sku ilike public.collection_search($1->>'search') or p.brand ilike public.collection_search($1->>'search')$q$;

 else
  source_sql:=$q$select c.id,c.created_at,c.total_spent as sort_total,null::text brand,null::text category_slug,false in_stock from public.customer_profiles c
   where (coalesce($1->>'segment','') in ('','all') or c.customer_segment::text=$1->>'segment') and (not coalesce(($1->>'optInOnly')::boolean,false) or c.marketing_opt_in)
   and (coalesce($1->>'search','')='' or c.full_name ilike public.collection_search($1->>'search') or c.email ilike public.collection_search($1->>'search') or c.phone ilike public.collection_search($1->>'search') or c.city ilike public.collection_search($1->>'search') or c.lead_source ilike public.collection_search($1->>'search'))$q$;
 end if;
 if p_kind<>'catalog' and coalesce(p_filters->>'sort','date-desc') not in ('','date-desc','date-asc','total-desc','total-asc') then raise exception using errcode='22023',message='Invalid collection sort';end if;
 if coalesce(p_filters->>'scope','all') not in ('','all','past','current') then raise exception using errcode='22023',message='Invalid history scope';end if;
 execute 'with matched as materialized ('||source_sql||'), page as (select * from matched order by
  case when $5=''inventory'' then sort_total end asc,case when $5=''inventory'' then brand end asc,
  case when $1->>''sort'' in (''price-asc'',''total-asc'') then sort_total end asc nulls last,
  case when $1->>''sort'' in (''price-desc'',''total-desc'') then sort_total end desc nulls last,
  case when $1->>''sort''=''date-asc'' then created_at end asc nulls last,
  case when coalesce($1->>''sort'','''') not in (''price-asc'',''price-desc'',''total-asc'',''total-desc'',''date-asc'') then created_at end desc nulls last,
  id asc limit $3 offset $4)
 select jsonb_build_object(''ids'',coalesce((select jsonb_agg(id) from page),''[]''),''total'',(select count(*) from matched),
 ''facets'',jsonb_build_object(''brands'',coalesce((select jsonb_agg(x order by count desc,name) from(select brand name,count(*) count from matched group by brand) x),''[]''),
 ''categories'',coalesce((select jsonb_agg(x order by count desc,slug) from(select category_slug slug,category_slug name,count(*) count from matched group by category_slug) x),''[]''),
 ''priceRange'',jsonb_build_object(''min'',coalesce((select min(sort_total) from matched),0),''max'',coalesce((select max(sort_total) from matched),0)),
 ''inStockCount'',(select count(*) from matched where in_stock),''totalMatching'',(select count(*) from matched)))'
 into result using p_filters,p_owner,p_limit,(p_page-1)*p_limit,p_kind;
 ids:=result->'ids';total_count:=(result->>'total')::bigint;
 if p_kind in ('catalog','products') then
  select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('stockCount',public.collection_stock(p.id),'inStock',public.collection_stock(p.id)>0,
    'stock_available',public.collection_stock(p.id),'stock_on_hand',coalesce(inv.stock_on_hand,0),'stock_reserved',coalesce(inv.stock_reserved,0)) order by wanted.position),'[]') into rows_json
  from jsonb_array_elements_text(ids) with ordinality wanted(id,position) join public.products p on p.id=wanted.id
  left join public.store_inventory inv on inv.product_id=p.id and inv.store_id='00000000-0000-0000-0000-000000000001';
 elsif p_kind='orders' then
  select coalesce(jsonb_agg((case when p_owner is null then to_jsonb(o) else to_jsonb(o)-'notes' end)||jsonb_build_object('pickup_code',case when p_owner is null or o.paid_at is not null then o.pickup_code else null end,'items',(
   select coalesce(jsonb_agg((case when p_owner is null then to_jsonb(i) else to_jsonb(i)-'unit_cost_snapshot' end)||jsonb_build_object(
    'product',case when p.id is null then null else jsonb_build_object('id',p.id,'name',p.name,'sku',p.sku,'brand',p.brand,'images',p.images,'retail_price',p.retail_price,'pc_builder_slot',p.pc_builder_slot) end,
    'customBuild',case when b.id is null then null else jsonb_build_object('id',b.id,'build_name',b.build_name,'platform',b.platform,'total_price',b.total_price,'share_slug',b.share_slug,'configuration',b.configuration) end) order by i.id),'[]')
   from public.order_items i left join public.products p on p.id=i.product_id
   left join public.custom_builds b on b.id=i.custom_build_id and (p_owner is null or b.user_id=(select user_id from public.customer_profiles where id=p_owner)) where i.order_id=o.id)) order by wanted.position),'[]') into rows_json
  from jsonb_array_elements_text(ids) with ordinality wanted(id,position) join public.orders o on o.id=wanted.id;
  select jsonb_build_object('current',count(*) filter(where status not in ('completed','delivered','delivery_arrived','collected','finished','cancelled','rejected','refunded')),'past',count(*) filter(where status in ('completed','delivered','delivery_arrived','collected','finished','cancelled','rejected','refunded'))) into stats_json from public.orders where p_owner is null or customer_id=p_owner;
 elsif p_kind='inventory' then
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'product_id',i.product_id,'product_name',coalesce(p.name,i.product_id),'sku',coalesce(p.sku,'UNKNOWN-SKU'),
   'category',coalesce(p.category_slug,'hardware'),'brand',coalesce(p.brand,'Tethera'),'image',p.images[1],
   'stock_on_hand',i.stock_on_hand,'stock_reserved',i.stock_reserved,'stock_available',greatest(0,i.stock_on_hand-i.stock_reserved),
   'low_stock_threshold',coalesce(i.low_stock_threshold,2),'is_low_stock',i.stock_on_hand<=coalesce(i.low_stock_threshold,2),'is_out_of_stock',i.stock_on_hand=0,'aisle_bin',i.aisle_bin) order by wanted.position),'[]') into rows_json
  from jsonb_array_elements_text(ids) with ordinality wanted(id,position) join public.store_inventory i on i.id=wanted.id left join public.products p on p.id=i.product_id;
  select jsonb_build_object('totalSkus',count(*),'lowStockAlerts',count(*) filter(where stock_on_hand<=coalesce(low_stock_threshold,2)),
   'outOfStockAlerts',count(*) filter(where stock_on_hand=0),'totalStockOnHand',coalesce(sum(stock_on_hand),0)) into stats_json from public.store_inventory where store_id='00000000-0000-0000-0000-000000000001';
 else
  select coalesce(jsonb_agg(to_jsonb(c) order by wanted.position),'[]') into rows_json from jsonb_array_elements_text(ids) with ordinality wanted(id,position) join public.customer_profiles c on c.id=wanted.id;
  select jsonb_build_object('totalLeads',count(*),'optedInCount',count(*) filter(where marketing_opt_in),'optInRate',case when count(*)=0 then 0 else round(100.0*count(*) filter(where marketing_opt_in)/count(*)) end,
   'vipCount',count(*) filter(where crm_status='vip'),'totalRevenueGenerated',coalesce(sum(total_spent),0),
   'segmentBreakdown',coalesce((select jsonb_object_agg(customer_segment,n) from(select customer_segment,count(*) n from public.customer_profiles where customer_segment is not null group by customer_segment) s),'{}')) into stats_json from public.customer_profiles;
 end if;
 return jsonb_build_object('rows',rows_json,'pagination',jsonb_build_object('page',p_page,'limit',p_limit,'total',total_count,'totalPages',greatest(1,ceil(total_count::numeric/p_limit)::integer)),'facets',case when p_kind='catalog' then result->'facets' else null end,'stats',stats_json);
end;$$;
revoke all on function public.read_collection_page(text,jsonb,integer,integer,text) from public,anon,authenticated;
grant execute on function public.read_collection_page(text,jsonb,integer,integer,text) to service_role;

-- Extend the existing readiness/security contract without changing its policies.
alter function public.application_security_audit() rename to application_media_security_audit;
revoke all on function public.application_media_security_audit() from public,anon,authenticated,service_role;
create function public.application_security_audit() returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;v jsonb;t text;f regprocedure;
begin
 r:=public.application_media_security_audit();v:=r->'violations';
 foreach t in array array['read_collection_page(text,jsonb,integer,integer,text)','collection_stock(text)','collection_status(text,text)','collection_search(text)','application_media_security_audit()','application_media_schema_health()'] loop
  f:=to_regprocedure('public.'||t);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then v:=v||jsonb_build_array('collection_function_access:'||t);end if;
  if f is not null and not coalesce((select 'search_path=""'=any(proconfig) from pg_proc where oid=f),false) then v:=v||jsonb_build_array('collection_function_search_path:'||t);end if;
 end loop;
 foreach t in array array['products_active_created_page_idx','products_active_price_page_idx','orders_owner_page_idx','orders_status_page_idx','order_items_order_page_idx','variants_product_available_page_idx','inventory_product_store_page_idx'] loop
  if not exists(select 1 from pg_index where indexrelid=to_regclass('public.'||t) and indisvalid and indisready) then v:=v||jsonb_build_array('collection_index_missing:'||t);end if;
 end loop;
 return jsonb_build_object('ok',jsonb_array_length(v)=0,'violations',v);
end;$$;
revoke all on function public.application_security_audit() from public,anon,authenticated;
grant execute on function public.application_security_audit() to service_role;
insert into public.application_schema_versions(version) values('20261108100000_query_pagination');
alter function public.application_schema_health() rename to application_media_schema_health;
revoke all on function public.application_media_schema_health() from public,anon,authenticated,service_role;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$select public.application_media_schema_health() and exists(select 1 from public.application_schema_versions where version='20261108100000_query_pagination') and (public.application_security_audit()->>'ok')::boolean;$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
