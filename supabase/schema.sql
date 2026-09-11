-- ==============================================================================
-- PLE-INSPIRED E-COMMERCE & CUSTOM PC PLATFORM: SUPABASE POSTGRESQL SCHEMA
-- Features:
-- 1. Single Flagship Physical Store (Click & Collect & Retail Counter)
-- 2. Custom PC Builder Matrix & Specifications
-- 3. Ginee & Jubelio Omnichannel Marketplace Integration (Tokopedia, Shopee)
-- 4. Atomic Payment-Success Stock Reservation (Single Products & PC Builder Kits)
-- 5. Realtime Per-Store Inventory Subscriptions
-- ==============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- -----------------------------------------------------------------------------
-- 1. FLAGSHIP RETAIL STORE & FULFILLMENT HUB
-- -----------------------------------------------------------------------------
create table public.stores (
    id uuid primary key default uuid_generate_v4(),
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
    pickup_lead_time_minutes integer default 60, -- "Ready in 1 hour"
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

-- Seed single flagship store
insert into public.stores (
    id, name, slug, address, city, province, postal_code, phone, whatsapp, email
) values (
    '00000000-0000-0000-0000-000000000001',
    'Flagship Retail & Experience Center',
    'flagship-store',
    '123 High-Tech Boulevard',
    'Central City',
    'State',
    '10110',
    '+62 21 555 0199',
    '+62 812 3456 7890',
    'support@pcexpress.com'
) on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES & PC BUILDER COMPONENT SLOTS
-- -----------------------------------------------------------------------------
create table public.categories (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text unique not null,
    parent_id uuid references public.categories(id) on delete set null,
    icon text,
    sort_order integer default 0,
    pc_builder_slot text null check (pc_builder_slot in (
        'cpu', 'cooler', 'motherboard', 'ram', 'gpu', 
        'storage_primary', 'storage_secondary', 'case', 'psu', 'os', 'service'
    ))
);

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS & SPECIFICATIONS
-- -----------------------------------------------------------------------------
create table public.products (
    id uuid primary key default uuid_generate_v4(),
    sku text unique not null,
    barcode text,
    name text not null,
    slug text unique not null,
    brand text not null,
    description text,
    category_id uuid references public.categories(id) on delete set null,
    retail_price numeric(12, 2) not null,
    sale_price numeric(12, 2),
    cost_price numeric(12, 2),
    images text[] default array[]::text[],
    
    -- Technical specifications for PC builder compatibility & filter facets
    -- e.g. {"socket": "AM5", "tdp_watts": 105, "length_mm": 310, "ram_type": "DDR5"}
    specs jsonb default '{}'::jsonb,
    warranty_months integer default 24,
    is_active boolean default true,
    created_at timestamptz default now()
);

create index products_search_idx on public.products using gin(
    to_tsvector('english', name || ' ' || sku || ' ' || brand)
);

-- -----------------------------------------------------------------------------
-- 4. REAL-TIME STORE INVENTORY
-- -----------------------------------------------------------------------------
create table public.store_inventory (
    id uuid primary key default uuid_generate_v4(),
    store_id uuid not null references public.stores(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    stock_on_hand integer not null default 0,
    stock_reserved integer not null default 0, -- Allocated for Click & Collect / Paid orders
    low_stock_threshold integer default 2,
    aisle_bin text,                            -- Physical picking bin
    updated_at timestamptz default now(),
    unique(store_id, product_id)
);

alter publication supabase_realtime add table public.store_inventory;

-- -----------------------------------------------------------------------------
-- 5. OMNICHANNEL MARKETPLACE INTEGRATION (GINEE / JUBELIO)
-- -----------------------------------------------------------------------------
create type marketplace_provider_enum as enum ('ginee', 'jubelio');
create type marketplace_channel_enum as enum ('tokopedia', 'shopee', 'lazada', 'tiktok_shop');

create table public.marketplace_integrations (
    id uuid primary key default uuid_generate_v4(),
    provider marketplace_provider_enum not null,
    channel marketplace_channel_enum not null,
    channel_shop_id text not null,
    shop_name text not null,
    is_sync_enabled boolean default true,
    created_at timestamptz default now(),
    unique(provider, channel, channel_shop_id)
);

create table public.marketplace_product_mappings (
    id uuid primary key default uuid_generate_v4(),
    product_id uuid not null references public.products(id) on delete cascade,
    external_provider marketplace_provider_enum not null,
    external_sku text not null,                  -- Master SKU in Ginee or Jubelio
    external_item_id text,                       -- Item ID in Jubelio/Ginee
    buffer_stock integer default 0,              -- Safety buffer to guard against overselling
    last_synced_at timestamptz,
    last_synced_stock integer default 0,
    sync_status text default 'synced',           -- 'synced', 'pending', 'error'
    error_message text,
    unique(product_id, external_provider, external_sku)
);

create table public.marketplace_sync_logs (
    id uuid primary key default uuid_generate_v4(),
    direction text not null check (direction in ('inbound_webhook', 'outbound_push', 'reconciliation_cron')),
    provider marketplace_provider_enum not null,
    payload jsonb not null,
    status text not null, -- 'success', 'failed'
    response jsonb,
    created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 6. SAVED CUSTOM PC BUILDS & SHARE PERMALINKS
-- -----------------------------------------------------------------------------
create table public.custom_builds (
    id uuid primary key default uuid_generate_v4(),
    share_slug text unique not null,
    user_id uuid references auth.users(id) on delete set null,
    build_name text default 'Custom Gaming Rig',
    platform text not null check (platform in ('intel', 'amd')),
    configuration jsonb not null, -- {"cpu": "uuid", "gpu": "uuid", "motherboard": "uuid", ...}
    total_price numeric(12, 2) not null,
    estimated_wattage integer not null,
    recommended_psu_wattage integer not null,
    assembly_tier text default 'standard', -- 'standard_48h', 'express_24h'
    created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 7. ORDERS & OMNICHANNEL FULFILLMENT
-- -----------------------------------------------------------------------------
create type fulfillment_type_enum as enum ('delivery', 'click_and_collect');
create type order_status_enum as enum (
    'pending_payment',       -- Unreserved inventory
    'payment_received',      -- Stock locked immediately upon payment
    'assembly_in_progress',  -- Custom PC workshop assembly
    'testing_bench',         -- BIOS & 24h burn-in stress test
    'ready_for_pickup',      -- Transferred to Flagship Store Holding Bay
    'collected',             -- Counter handover completed
    'shipped',               -- Courier transit
    'cancelled',
    'refunded'
);

create table public.orders (
    id uuid primary key default uuid_generate_v4(),
    order_number text unique not null,
    customer_id uuid references auth.users(id) on delete set null,
    customer_email text not null,
    customer_phone text not null,
    customer_name text not null,
    
    fulfillment_type fulfillment_type_enum not null,
    pickup_store_id uuid references public.stores(id) default '00000000-0000-0000-0000-000000000001',
    pickup_code text,                -- 4-digit PIN / QR verification token for counter pickup
    id_verified_at_pickup boolean default false,
    shipping_address jsonb,
    
    subtotal numeric(12, 2) not null,
    shipping_fee numeric(12, 2) default 0.00,
    assembly_fee numeric(12, 2) default 0.00,
    total numeric(12, 2) not null,
    
    status order_status_enum default 'pending_payment',
    payment_method text,
    payment_reference text,
    notes text,
    created_at timestamptz default now(),
    paid_at timestamptz
);

create table public.order_items (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id uuid references public.products(id),
    custom_build_id uuid references public.custom_builds(id),
    quantity integer not null default 1,
    unit_price numeric(12, 2) not null,
    is_custom_build boolean default false
);

-- -----------------------------------------------------------------------------
-- 8. ATOMIC PAYMENT-SUCCESS STOCK RESERVATION PROCEDURE
-- Locks stock for both standalone products and custom PC component kits
-- -----------------------------------------------------------------------------
create or replace function public.process_order_payment_success(
    p_order_id uuid,
    p_payment_reference text
) returns jsonb as $$
declare
    v_order record;
    v_item record;
    v_build record;
    v_component_id text;
    v_prod_uuid uuid;
    v_available integer;
    v_flagship_store_id uuid := '00000000-0000-0000-0000-000000000001';
    v_reserved_skus jsonb := '[]'::jsonb;
    v_is_custom_pc boolean := false;
begin
    -- 1. Lock the order row and verify it is pending payment
    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Order not found');
    end if;

    if v_order.status != 'pending_payment' then
        return jsonb_build_object('success', false, 'error', 'Order is already processed or cancelled');
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
                    'error', 'Insufficient stock for product id: ' || v_item.product_id::text
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
                    -- Extract product id from slot config
                    v_prod_uuid := (v_build.configuration->>v_component_id)::uuid;
                    
                    if v_prod_uuid is not null then
                        select (stock_on_hand - stock_reserved) into v_available
                        from public.store_inventory
                        where store_id = v_flagship_store_id and product_id = v_prod_uuid
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
                        where store_id = v_flagship_store_id and product_id = v_prod_uuid;

                        v_reserved_skus := v_reserved_skus || jsonb_build_object(
                            'product_id', v_prod_uuid,
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
            when v_is_custom_pc then 'assembly_in_progress'::order_status_enum
            when v_order.fulfillment_type = 'click_and_collect' then 'ready_for_pickup'::order_status_enum
            else 'payment_received'::order_status_enum
        end,
        paid_at = now(),
        payment_reference = p_payment_reference,
        pickup_code = case 
            when v_order.fulfillment_type = 'click_and_collect' 
            then lpad(floor(random() * 10000)::text, 4, '0')
            else null
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
-- 9. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_inventory enable row level security;
alter table public.custom_builds enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.marketplace_integrations enable row level security;
alter table public.marketplace_product_mappings enable row level security;

create policy "Public can view stores" on public.stores for select using (true);
create policy "Public can view categories" on public.categories for select using (true);
create policy "Public can view active products" on public.products for select using (is_active = true);
create policy "Public can view store inventory" on public.store_inventory for select using (true);
create policy "Public can view saved builds" on public.custom_builds for select using (true);

create policy "Users can view own orders" on public.orders
    for select using (auth.uid() = customer_id);

create policy "Users can view own order items" on public.order_items
    for select using (
        exists (
            select 1 from public.orders
            where orders.id = order_items.order_id and orders.customer_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 10. CUSTOMER PROFILES & CRM MARKETING INTEGRATION
-- -----------------------------------------------------------------------------
create type customer_crm_status_enum as enum ('lead', 'active_customer', 'vip', 'inactive');
create type customer_segment_enum as enum ('gamer', 'pc_builder', 'creator', 'enterprise', 'general');

create table public.customer_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique not null,
    full_name text not null,
    phone text not null,
    
    -- E-Commerce Fulfillment & Shipping Address
    address_line1 text not null,
    address_line2 text,
    subdistrict text not null,
    city text not null,
    province text not null,
    postal_code text not null,
    country text default 'Indonesia',
    address_label text default 'Home',
    delivery_notes text,
    
    -- CRM & Marketing Automation
    marketing_opt_in boolean default true,
    newsletter_frequency text default 'weekly', -- 'weekly', 'drops_only', 'monthly'
    customer_segment customer_segment_enum default 'gamer',
    hardware_preference text default 'all',      -- 'amd', 'intel_nvidia', 'all'
    crm_status customer_crm_status_enum default 'lead',
    lead_source text default 'ecommerce_registration',
    tags text[] default array['registered_user']::text[],
    
    -- Order & Spend Aggregates
    total_orders integer default 0,
    total_spent numeric(12, 2) default 0.00,
    last_order_at timestamptz,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- CRM Email Campaigns Log
create table public.crm_email_campaigns (
    id uuid primary key default uuid_generate_v4(),
    campaign_name text not null,
    subject text not null,
    target_segment text default 'all',
    recipients_count integer default 0,
    sent_by text default 'admin',
    content_preview text,
    sent_at timestamptz default now()
);

alter table public.customer_profiles enable row level security;
alter table public.crm_email_campaigns enable row level security;

create policy "Users can view own profile" on public.customer_profiles
    for select using (auth.uid() = id);

create policy "Users can update own profile" on public.customer_profiles
    for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.customer_profiles
    for insert with check (auth.uid() = id);

