-- Step 2: complete persisted feature models. Apply only after the baseline,
-- phase-2 and verified-auth migrations. Test on staging before deployment.
begin;

alter table public.orders
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists promo_code text,
  add column if not exists dpp_amount numeric(12,2),
  add column if not exists tax_amount numeric(12,2),
  add column if not exists tax_rate numeric(5,4),
  add column if not exists waybill_id text,
  add column if not exists tracking_number text,
  add column if not exists courier_provider text,
  add column if not exists courier_service_code text;
-- Historical tax snapshots remain NULL; do not invent tax facts for past orders.
alter table public.promotions
  drop constraint if exists promotions_discount_type_check;
alter table public.promotions
  add constraint promotions_discount_type_check
    check (discount_type in ('percentage','fixed_amount','free_shipping','buy_x_get_y')),
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists max_global_uses integer,
  add column if not exists max_uses_per_user integer,
  add column if not exists total_discount_given numeric(16,2) not null default 0,
  add column if not exists eligible_categories text[] not null default array[]::text[],
  add column if not exists eligible_product_ids text[] not null default array[]::text[],
  add column if not exists buy_x_get_y jsonb,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_wishlist (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_session_token text,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlist_single_owner check ((user_id is not null) <> (anonymous_session_token is not null))
);
create unique index if not exists wishlist_user_product_unique on public.customer_wishlist(user_id,product_id) where user_id is not null;
create unique index if not exists wishlist_guest_product_unique on public.customer_wishlist(anonymous_session_token,product_id) where user_id is null;
create index if not exists wishlist_product_idx on public.customer_wishlist(product_id);

create table if not exists public.product_reviews (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products(id) on delete cascade,
  user_id text references public.customer_profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null,
  content text not null,
  verified_purchase boolean not null default false,
  helpful_votes integer not null default 0 check (helpful_votes >= 0),
  created_at timestamptz not null default now()
);
create unique index if not exists reviews_user_product_unique on public.product_reviews(product_id,user_id) where user_id is not null;
create unique index if not exists reviews_email_product_unique on public.product_reviews(product_id,lower(customer_email));
create index if not exists reviews_product_created_idx on public.product_reviews(product_id,created_at desc);

create table if not exists public.stock_notifications (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products(id) on delete cascade,
  variant_id text references public.product_variants(id) on delete cascade,
  email text,
  phone text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint stock_notification_contact check (nullif(btrim(email),'') is not null or nullif(btrim(phone),'') is not null)
);
create unique index if not exists stock_notification_email_pending_unique on public.stock_notifications(product_id,coalesce(variant_id,''),lower(email)) where email is not null and notified_at is null;
create unique index if not exists stock_notification_phone_pending_unique on public.stock_notifications(product_id,coalesce(variant_id,''),phone) where phone is not null and notified_at is null;
create index if not exists stock_notification_pending_idx on public.stock_notifications(product_id) where notified_at is null;

create table if not exists public.storefront_settings (
  id text primary key check (id='homepage'),
  modules jsonb not null check (jsonb_typeof(modules)='array'),
  custom_pc_hero jsonb not null check (jsonb_typeof(custom_pc_hero)='object'),
  featured_prebuilt_ids text[] not null,
  updated_at timestamptz not null default now()
);
create index if not exists orders_customer_created_idx on public.orders(customer_id,created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
-- Existing legacy rows are not rewritten; these constraints protect all new writes.
alter table public.order_items add constraint order_items_quantity_positive check (quantity > 0) not valid;
alter table public.order_items add constraint order_items_price_nonnegative check (unit_price >= 0) not valid;
alter table public.orders add constraint orders_amounts_nonnegative
 check (subtotal >= 0 and shipping_fee >= 0 and assembly_fee >= 0 and discount_amount >= 0 and total >= 0) not valid;


alter table public.customer_wishlist enable row level security;
alter table public.product_reviews enable row level security;
alter table public.stock_notifications enable row level security;
alter table public.storefront_settings enable row level security;
revoke all on public.customer_wishlist,public.product_reviews,public.stock_notifications,public.storefront_settings from anon,authenticated;
grant all on public.customer_wishlist,public.product_reviews,public.stock_notifications,public.storefront_settings to service_role;
-- Raw review rows contain personal identifiers: public reads use the scrubbed app API.
grant select on public.customer_wishlist,public.product_reviews to authenticated;
-- Ownership-policy subqueries require read privileges on their referenced tables.
-- These tables retain their owner-scoped RLS policies.
grant select on public.customer_profiles,public.carts,public.orders,public.fulfillments,public.return_requests to authenticated;
grant select,insert,update,delete on
  public.stores,public.categories,public.products,public.store_inventory,
  public.marketplace_integrations,public.marketplace_product_mappings,public.marketplace_sync_logs,
  public.custom_builds,public.orders,public.order_items,public.promotions,public.promotional_banners,
  public.customer_profiles,public.crm_email_campaigns,public.product_variants,
  public.carts,public.cart_items,public.inventory_reservations,public.fulfillments,
  public.fulfillment_items,public.return_requests,public.refunds,
  public.inventory_adjustment_ledger,public.admin_users,public.admin_audit_logs to service_role;
drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders" on public.orders for select to authenticated
 using (exists(select 1 from public.customer_profiles c where c.id=orders.customer_id and c.user_id=auth.uid()));
create policy "Customers read own wishlist" on public.customer_wishlist for select to authenticated using (user_id=auth.uid());
create policy "Customers read own review records" on public.product_reviews for select to authenticated
 using (exists(select 1 from public.customer_profiles c where c.id=product_reviews.user_id and c.user_id=auth.uid()));

-- One RPC = one transaction: an invalid line cannot leave an accepted header.
-- Stock reservation/settlement remains a separate subsequent workstream.
create or replace function public.create_order_with_items(p_order jsonb,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_order public.orders;
  v_item public.order_items;
  v_input jsonb;
  v_items jsonb := '[]'::jsonb;
  v_id text := coalesce(nullif(p_order->>'id',''),gen_random_uuid()::text);
begin
  if jsonb_typeof(p_order) is distinct from 'object' or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode='22023',message='Invalid order payload';
  end if;
  if exists(select 1 from jsonb_object_keys(p_order) k where not exists(
    select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='orders' and c.column_name=k)) then
    raise exception using errcode='42703',message='Unknown order column';
  end if;
  v_order := jsonb_populate_record(null::public.orders,
    jsonb_build_object('id',v_id,'shipping_fee',0,'assembly_fee',0,'discount_amount',0,
      'status','order_received','id_verified_at_pickup',false,'created_at',now(),'updated_at',now(),
      'pickup_store_id','00000000-0000-0000-0000-000000000001') || p_order || jsonb_build_object('id',v_id));
  insert into public.orders select (v_order).* returning * into v_order;
  for v_input in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_input) is distinct from 'object' then
      raise exception using errcode='22023',message='Invalid order item';
    end if;
    if exists(select 1 from jsonb_object_keys(v_input) k where not exists(
      select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='order_items' and c.column_name=k)) then
      raise exception using errcode='42703',message='Unknown order item column';
    end if;
    v_item := jsonb_populate_record(null::public.order_items,
      jsonb_build_object('quantity',1,'is_custom_build',false,'tax_rate_snapshot',0.11,'tax_amount_snapshot',0)
      || v_input || jsonb_build_object('id',coalesce(nullif(v_input->>'id',''),gen_random_uuid()::text),'order_id',v_id));
    insert into public.order_items select (v_item).* returning * into v_item;
    v_items := v_items || jsonb_build_array(to_jsonb(v_item));
  end loop;
  return jsonb_build_object('order',to_jsonb(v_order),'items',v_items);
end;
$$;
revoke all on function public.create_order_with_items(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_order_with_items(jsonb,jsonb) to service_role;

create table if not exists public.application_schema_versions (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table public.application_schema_versions enable row level security;
revoke all on public.application_schema_versions from anon,authenticated;
grant all on public.application_schema_versions to service_role;
insert into public.application_schema_versions(version) values('20261106120000_durable_feature_storage') on conflict do nothing;

create or replace function public.application_schema_health()
returns boolean language sql security definer set search_path='' as $$
  with expected(table_name,column_name) as (
    values ('orders','discount_amount'),('orders','promo_code'),('orders','dpp_amount'),
      ('orders','tax_amount'),('orders','tax_rate'),('order_items','product_title_snapshot'),
      ('order_items','tax_amount_snapshot'),('promotions','buy_x_get_y'),
      ('promotions','eligible_categories'),('promotions','max_global_uses'),
      ('customer_wishlist','anonymous_session_token'),('product_reviews','verified_purchase'),
      ('stock_notifications','notified_at'),('storefront_settings','custom_pc_hero'),
      ('auth_sessions','verification_expires_at'),('admin_users','user_id'),
      ('inventory_reservations','expires_at'),('fulfillment_items','quantity'),
      ('refunds','gateway_refund_id'),('inventory_adjustment_ledger','reason_code')
  )
  select exists(select 1 from public.application_schema_versions where version='20261106120000_durable_feature_storage')
    and not exists(select 1 from expected e where not exists(
      select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name))
    and to_regprocedure('public.create_order_with_items(jsonb,jsonb)') is not null;
$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;

commit;
