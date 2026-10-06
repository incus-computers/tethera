-- ==============================================================================
-- TETHERA E-COMMERCE & CUSTOM PC PLATFORM: SUPABASE POSTGRESQL SCHEMA
-- Features:
-- 1. Flagship Physical Store (Click & Collect & Retail Counter)
-- 2. Complete PC Hardware Catalog & Categories
-- 3. Custom PC Builder Matrix & Specifications
-- 4. Omnichannel Marketplace Integration (Ginee & Jubelio)
-- 5. Real-Time Store Inventory Management
-- 6. Orders, Courier Dispatch & Atomic Payment Stock Reservation
-- 7. Customer Profiles & CRM Marketing Automation
-- 8. Dynamic Promotional Banners & Discount Codes
-- ==============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- -----------------------------------------------------------------------------
-- 1. FLAGSHIP RETAIL STORE & FULFILLMENT HUB
-- -----------------------------------------------------------------------------
create table if not exists public.stores (
    id text primary key default gen_random_uuid()::text,
    name text not null default 'Flagship Store',
    slug text unique not null default 'flagship-store',
    address text not null,
    city text not null,
    province text not null,
    postal_code text not null,
    phone text not null,
    whatsapp text,
    email text not null,
    latitude decimal(10, 8),
    longitude decimal(11, 8),
    is_active boolean default true,
    is_click_and_collect boolean default true,
    pickup_lead_time_minutes integer default 60,
    trading_hours jsonb not null default '{
        "mon": "09:00 - 18:00",
        "tue": "09:00 - 18:00",
        "wed": "09:00 - 18:00",
        "thu": "09:00 - 18:00",
        "fri": "09:00 - 18:00",
        "sat": "09:00 - 17:00",
        "sun": "10:00 - 15:00"
    }'::jsonb,
    created_at timestamptz default now()
);

-- Seed Flagship Retail Store
insert into public.stores (
    id, name, slug, address, city, province, postal_code, phone, whatsapp, email, latitude, longitude
) values (
    '00000000-0000-0000-0000-000000000001',
    'Flagship Retail & Experience Center',
    'flagship-store',
    'Mangga Dua Mall Lt. 3 No. 36',
    'Jakarta Pusat',
    'DKI Jakarta',
    '10730',
    '+62 21 555 0199',
    '+62 812 3456 7890',
    'flagship@tethera.com',
    -6.13520000,
    106.82940000
) on conflict (slug) do update set
    name = excluded.name,
    address = excluded.address,
    city = excluded.city,
    province = excluded.province,
    postal_code = excluded.postal_code,
    phone = excluded.phone,
    whatsapp = excluded.whatsapp,
    email = excluded.email;

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES & PC BUILDER COMPONENT SLOTS
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
    id text primary key default gen_random_uuid()::text,
    name text not null,
    slug text unique not null,
    parent_id text references public.categories(id) on delete set null,
    icon text,
    sort_order integer default 0,
    pc_builder_slot text null
);

-- Seed Initial Categories
insert into public.categories (id, name, slug, sort_order, pc_builder_slot) values
    ('cat-cpu', 'Processors', 'cpu', 1, 'cpu'),
    ('cat-gpu', 'Graphics Cards', 'gpu', 2, 'gpu'),
    ('cat-motherboards', 'Motherboards', 'motherboards', 3, 'motherboard'),
    ('cat-cooling', 'Cooling', 'cooling', 4, 'cooler'),
    ('cat-cases', 'Chassis', 'cases', 5, 'case'),
    ('cat-ram', 'Memory (RAM)', 'ram', 6, 'ram'),
    ('cat-storage', 'Storage', 'storage', 7, 'storage_primary'),
    ('cat-power-supplies', 'Power Supplies', 'power-supplies', 8, 'psu'),
    ('cat-peripherals', 'Gaming Peripherals', 'peripherals', 9, 'other_peripherals'),
    ('cat-monitors', 'Monitors', 'monitors', 10, null),
    ('cat-accessories', 'Cables & Accessories', 'accessories', 11, null)
on conflict (slug) do update set
    name = excluded.name,
    sort_order = excluded.sort_order,
    pc_builder_slot = excluded.pc_builder_slot;

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS & TECHNICAL SPECIFICATIONS
-- -----------------------------------------------------------------------------
create table if not exists public.products (
    id text primary key default gen_random_uuid()::text,
    sku text unique not null,
    barcode text,
    name text not null,
    slug text unique not null,
    brand text not null,
    description text,
    category_id text references public.categories(id) on delete set null,
    category_slug text,
    retail_price numeric(12, 2) not null,
    sale_price numeric(12, 2),
    cost_price numeric(12, 2),
    images text[] default array[]::text[],
    specs jsonb default '{}'::jsonb,
    warranty_months integer default 24,
    is_active boolean default true,
    pc_builder_slot text null,
    created_at timestamptz default now()
);

create index if not exists products_search_idx on public.products using gin(
    to_tsvector('english', name || ' ' || sku || ' ' || brand)
);

create index if not exists products_category_slug_idx on public.products(category_slug);
create index if not exists products_slot_idx on public.products(pc_builder_slot);

-- -----------------------------------------------------------------------------
-- 4. REAL-TIME STORE INVENTORY
-- -----------------------------------------------------------------------------
create table if not exists public.store_inventory (
    id text primary key default gen_random_uuid()::text,
    store_id text not null references public.stores(id) on delete cascade,
    product_id text not null references public.products(id) on delete cascade,
    stock_on_hand integer not null default 0,
    stock_reserved integer not null default 0,
    low_stock_threshold integer default 2,
    aisle_bin text default 'A-01',
    updated_at timestamptz default now(),
    unique(store_id, product_id)
);

-- Enable Supabase Realtime updates on store inventory
alter publication supabase_realtime add table public.store_inventory;

-- -----------------------------------------------------------------------------
-- 5. OMNICHANNEL MARKETPLACE INTEGRATION (GINEE / JUBELIO)
-- -----------------------------------------------------------------------------
do $$ begin
    create type marketplace_provider_enum as enum ('ginee', 'jubelio');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type marketplace_channel_enum as enum ('tokopedia', 'shopee', 'lazada', 'tiktok_shop');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.marketplace_integrations (
    id text primary key default gen_random_uuid()::text,
    provider marketplace_provider_enum not null,
    channel marketplace_channel_enum not null,
    channel_shop_id text not null,
    shop_name text not null,
    is_sync_enabled boolean default true,
    created_at timestamptz default now(),
    unique(provider, channel, channel_shop_id)
);

create table if not exists public.marketplace_product_mappings (
    id text primary key default gen_random_uuid()::text,
    product_id text not null references public.products(id) on delete cascade,
    external_provider marketplace_provider_enum not null,
    external_sku text not null,
    external_item_id text,
    buffer_stock integer default 0,
    last_synced_at timestamptz,
    last_synced_stock integer default 0,
    sync_status text default 'synced',
    error_message text,
    unique(product_id, external_provider, external_sku)
);

create table if not exists public.marketplace_sync_logs (
    id text primary key default gen_random_uuid()::text,
    direction text not null check (direction in ('inbound_webhook', 'outbound_push', 'reconciliation_cron')),
    provider marketplace_provider_enum not null,
    payload jsonb not null,
    status text not null,
    response jsonb,
    created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 6. SAVED CUSTOM PC BUILDS & SHARE PERMALINKS
-- -----------------------------------------------------------------------------
create table if not exists public.custom_builds (
    id text primary key default gen_random_uuid()::text,
    share_slug text unique not null,
    user_id uuid references auth.users(id) on delete set null,
    build_name text default 'Custom Gaming Rig',
    platform text not null check (platform in ('intel', 'amd')),
    configuration jsonb not null,
    total_price numeric(12, 2) not null,
    estimated_wattage integer not null,
    recommended_psu_wattage integer not null,
    assembly_tier text default 'standard',
    created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 7. ORDERS & OMNICHANNEL FULFILLMENT
-- -----------------------------------------------------------------------------
do $$ begin
    create type fulfillment_type_enum as enum ('delivery', 'click_and_collect');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.orders (
    id text primary key default gen_random_uuid()::text,
    order_number text unique not null,
    customer_id text,
    customer_email text not null,
    customer_phone text not null,
    customer_name text not null,
    
    fulfillment_type fulfillment_type_enum not null,
    pickup_store_id text references public.stores(id) default '00000000-0000-0000-0000-000000000001',
    pickup_code text,
    id_verified_at_pickup boolean default false,
    shipping_address jsonb,
    courier_info jsonb,
    
    subtotal numeric(12, 2) not null,
    shipping_fee numeric(12, 2) default 0.00,
    assembly_fee numeric(12, 2) default 0.00,
    total numeric(12, 2) not null,
    
    status text not null default 'order_received',
    payment_method text,
    payment_reference text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    paid_at timestamptz
);

create table if not exists public.order_items (
    id text primary key default gen_random_uuid()::text,
    order_id text not null references public.orders(id) on delete cascade,
    product_id text references public.products(id) on delete set null,
    custom_build_id text references public.custom_builds(id) on delete set null,
    quantity integer not null default 1,
    unit_price numeric(12, 2) not null,
    is_custom_build boolean default false
);

-- -----------------------------------------------------------------------------
-- 8. PROMOTIONAL BANNERS & DISCOUNT CODES
-- -----------------------------------------------------------------------------
create table if not exists public.promotions (
    id text primary key default gen_random_uuid()::text,
    code text unique not null,
    title text not null,
    description text,
    discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
    discount_value numeric(12, 2) not null,
    min_spend numeric(12, 2) default 0,
    max_discount numeric(12, 2),
    is_active boolean default true,
    start_date timestamptz default now(),
    end_date timestamptz,
    usage_count integer default 0,
    usage_limit integer,
    created_at timestamptz default now()
);

create table if not exists public.promotional_banners (
    id text primary key default gen_random_uuid()::text,
    type text not null default 'content' check (type in ('content', 'image')),
    title text not null,
    highlight text,
    description text,
    badge text,
    badge_type text check (badge_type in ('hot', 'flagship', 'event', 'bundle', 'partner')),
    cta_text text,
    cta_link text not null,
    secondary_cta_text text,
    secondary_cta_link text,
    image_url text,
    hide_overlay boolean default false,
    perk text,
    bg_gradient text,
    tag_color text,
    is_active boolean default true,
    display_order integer default 0,
    created_at timestamptz default now()
);

-- Seed Promotions
insert into public.promotions (id, code, title, description, discount_type, discount_value, min_spend, max_discount, is_active, usage_limit) values
    ('promo-fest2026', 'WHITEFEST2026', 'White Edition Build Festival', 'Discount of Rp 500.000 for full custom rigs with all-white aesthetic chassis.', 'fixed_amount', 500000, 15000000, 500000, true, 100),
    ('promo-rtxsuper', 'RTXSUPER10', 'GeForce RTX 40-Super Deal', '10% off selected GeForce RTX 4070 Ti SUPER & 4080 SUPER standalone cards.', 'percentage', 10, 10000000, 1500000, true, 250),
    ('promo-clickcollect', 'FLAGSHIPFREE', 'Flagship Click & Collect Bonus', 'Instant Rp 150.000 store voucher for picking up your custom rig at our Mangga Dua Flagship.', 'fixed_amount', 150000, 5000000, 150000, true, 500)
on conflict (code) do nothing;

-- Seed Promotional Banners
insert into public.promotional_banners (id, type, badge, badge_type, title, highlight, description, cta_text, cta_link, secondary_cta_text, secondary_cta_link, perk, bg_gradient, tag_color, is_active, display_order) values
    ('banner-1', 'content', 'Limited Time Event', 'event', 'Tethera White Edition Build Festival', 'Free 72-Hour Rig Stress Test & Cable Combs', 'Design an all-white custom rig in our Configurator Studio this month. All white builds receive complimentary 72-hour burn-in calibration and Windows 11 Pro setup.', 'Configure White Rig', '/builder', 'Browse Pre-Builts', '/prebuilts', 'Hemat hingga Rp 3.500.000 untuk sasis putih & komponen premium', 'from-slate-50 via-white to-slate-100', 'bg-zinc-900 text-white', true, 1),
    ('banner-2', 'image', 'Official Brand Partner', 'partner', 'ASUS ROG GeForce RTX 4080 SUPER Matrix', 'Direct Factory Sealed Inventory • In Stock', 'Flagship allocation from ASUS Indonesia. Integrated liquid cooling loop with 360mm radiator ready for 60-minute pickup or express dispatch.', 'Explore ROG Hardware', '/components/gpu', null, null, 'Full 3-Year Official Manufacturer Replacement Warranty', null, 'bg-red-600 text-white', true, 2),
    ('banner-3', 'content', 'Flagship In Stock', 'hot', 'RTX 4070 Ti SUPER & 4080 SUPER Drop', 'Ready for Pickup at Mangga Dua in 60 Minutes', 'Direct factory-sealed stock from ASUS ROG, MSI, and Gigabyte. Reserve online with instant post-payment stock lock.', 'Shop Graphics Cards', '/components/gpu', 'View Stock', '/components', 'Guaranteed Indonesian Official Distributor Unit', 'from-emerald-950/20 via-zinc-900 to-black', 'bg-emerald-500 text-black', true, 3)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 9. ATOMIC PAYMENT-SUCCESS STOCK RESERVATION PROCEDURE
-- Locks stock for both standalone products and custom PC component kits
-- -----------------------------------------------------------------------------
create or replace function public.process_order_payment_success(
    p_order_id text,
    p_payment_reference text
) returns jsonb as $$
declare
    v_order record;
    v_item record;
    v_build record;
    v_component_id text;
    v_prod_id text;
    v_available integer;
    v_flagship_store_id text := '00000000-0000-0000-0000-000000000001';
    v_reserved_skus jsonb := '[]'::jsonb;
    v_is_custom_pc boolean := false;
begin
    -- 1. Lock the order row and verify it exists
    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Order not found');
    end if;

    -- 2. Process all order items
    for v_item in 
        select * from public.order_items where order_id = p_order_id
    loop
        -- Case A: Standalone Product
        if v_item.product_id is not null then
            select (stock_on_hand - stock_reserved) into v_available
            from public.store_inventory
            where store_id = v_flagship_store_id and product_id = v_item.product_id
            for update;

            if coalesce(v_available, 0) < v_item.quantity then
                return jsonb_build_object(
                    'success', false, 
                    'error', 'Insufficient stock for product id: ' || v_item.product_id
                );
            end if;

            update public.store_inventory
            set stock_reserved = stock_reserved + v_item.quantity,
                updated_at = now()
            where store_id = v_flagship_store_id and product_id = v_item.product_id;

            v_reserved_skus := v_reserved_skus || jsonb_build_object(
                'product_id', v_item.product_id,
                'quantity', v_item.quantity
            );

        -- Case B: Custom PC System (reserves all component parts in the build)
        elsif v_item.custom_build_id is not null then
            v_is_custom_pc := true;
            select * into v_build
            from public.custom_builds
            where id = v_item.custom_build_id;

            if found and v_build.configuration is not null then
                for v_component_id in 
                    select jsonb_object_keys(v_build.configuration)
                loop
                    v_prod_id := (v_build.configuration->>v_component_id);
                    
                    if v_prod_id is not null then
                        select (stock_on_hand - stock_reserved) into v_available
                        from public.store_inventory
                        where store_id = v_flagship_store_id and product_id = v_prod_id
                        for update;

                        if coalesce(v_available, 0) < v_item.quantity then
                            return jsonb_build_object(
                                'success', false, 
                                'error', 'Insufficient stock for PC component slot: ' || v_component_id
                            );
                        end if;

                        update public.store_inventory
                        set stock_reserved = stock_reserved + v_item.quantity,
                            updated_at = now()
                        where store_id = v_flagship_store_id and product_id = v_prod_id;

                        v_reserved_skus := v_reserved_skus || jsonb_build_object(
                            'product_id', v_prod_id,
                            'quantity', v_item.quantity,
                            'slot', v_component_id
                        );
                    end if;
                end loop;
            end if;
        end if;
    end loop;

    -- 3. Update order status based on fulfillment type & PC build
    update public.orders
    set status = case 
            when v_is_custom_pc then 'assembly_in_progress'
            when v_order.fulfillment_type = 'click_and_collect' then 'ready_for_pickup'
            else 'payment_received'
        end,
        paid_at = now(),
        updated_at = now(),
        payment_reference = p_payment_reference,
        pickup_code = case 
            when v_order.fulfillment_type = 'click_and_collect' and v_order.pickup_code is null
            then lpad(floor(random() * 10000)::text, 4, '0')
            else v_order.pickup_code
        end
    where id = p_order_id;

    return jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', (select status from public.orders where id = p_order_id),
        'reserved_items', v_reserved_skus
    );
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------------------------
-- 10. CUSTOMER PROFILES & CRM MARKETING INTEGRATION
-- -----------------------------------------------------------------------------
do $$ begin
    create type customer_crm_status_enum as enum ('lead', 'active_customer', 'vip', 'inactive');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type customer_segment_enum as enum ('gamer', 'pc_builder', 'creator', 'enterprise', 'general');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.customer_profiles (
    id text primary key default gen_random_uuid()::text,
    user_id uuid references auth.users(id) on delete set null,
    email text unique not null,
    full_name text not null,
    phone text not null,
    
    address_line1 text not null,
    address_line2 text,
    subdistrict text not null,
    city text not null,
    province text not null,
    postal_code text not null,
    country text default 'Indonesia',
    address_label text default 'Home',
    delivery_notes text,
    
    marketing_opt_in boolean default true,
    newsletter_frequency text default 'weekly',
    customer_segment customer_segment_enum default 'gamer',
    hardware_preference text default 'all',
    crm_status customer_crm_status_enum default 'lead',
    lead_source text default 'ecommerce_registration',
    tags text[] default array['registered_user']::text[],
    
    total_orders integer default 0,
    total_spent numeric(12, 2) default 0.00,
    last_order_at timestamptz,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.crm_email_campaigns (
    id text primary key default gen_random_uuid()::text,
    campaign_name text not null,
    subject text not null,
    target_segment text default 'all',
    recipients_count integer default 0,
    sent_by text default 'admin',
    content_preview text,
    sent_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_inventory enable row level security;
alter table public.promotions enable row level security;
alter table public.promotional_banners enable row level security;
alter table public.custom_builds enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.crm_email_campaigns enable row level security;
alter table public.marketplace_integrations enable row level security;
alter table public.marketplace_product_mappings enable row level security;
alter table public.marketplace_sync_logs enable row level security;

-- Public Storefront Access Policies
create policy "Public can view stores" on public.stores for select using (true);
create policy "Public can view categories" on public.categories for select using (true);
create policy "Public can view active products" on public.products for select using (is_active = true);
create policy "Public can view store inventory" on public.store_inventory for select using (true);
create policy "Public can view active promotions" on public.promotions for select using (is_active = true);
create policy "Public can view active banners" on public.promotional_banners for select using (is_active = true);
create policy "Public can view saved builds" on public.custom_builds for select using (true);

-- Authenticated User Policies
create policy "Users can view own orders" on public.orders
    for select using (auth.uid()::text = customer_id);

create policy "Users can view own profile" on public.customer_profiles
    for select using (auth.uid() = user_id);

create policy "Users can update own profile" on public.customer_profiles
    for update using (auth.uid() = user_id);
