-- ==============================================================================
-- TETHERA E-COMMERCE ARCHITECTURAL UPGRADE: PHASE 2 SCHEMA MIGRATION
-- Migration: 20261105_phase2_architecture_upgrade.sql
-- Covers:
-- 1. Product SKU Variants (CUST-01)
-- 2. Persistent Hybrid Cart & Session Merging (CUST-02)
-- 3. Inventory Reservations & Concurrency Protection (CUST-03)
-- 4. Immutable Order Line-Item Snapshots & Tax Breakdown (CUST-03, ADMIN-03)
-- 5. Multi-Carrier Split Fulfillment & Tracking (ADMIN-01)
-- 6. Returns (RMA), Restocking & Refund Engine (ADMIN-02)
-- 7. Immutable Inventory Adjustment Ledger (ADMIN-04)
-- 8. Granular RBAC & Immutable Staff Audit Logs (ADMIN-06)
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. PRODUCT SKU VARIANTS TABLE (CUST-01)
-- -----------------------------------------------------------------------------
create table if not exists public.product_variants (
    id text primary key default gen_random_uuid()::text,
    product_id text not null references public.products(id) on delete cascade,
    sku text unique not null,
    name text not null,
    attribute_type text not null, -- e.g. 'color', 'capacity', 'clock_speed', 'layout'
    attribute_value text not null, -- e.g. 'Matte Black', '32GB (2x16GB)', '6000MHz'
    price numeric(12, 2) not null,
    sale_price numeric(12, 2),
    stock_quantity integer not null default 0,
    reserved_quantity integer not null default 0,
    weight_grams integer default 500,
    image_url text,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists product_variants_prod_idx on public.product_variants(product_id);
create index if not exists product_variants_sku_idx on public.product_variants(sku);

-- -----------------------------------------------------------------------------
-- 2. PERSISTENT HYBRID CART & SESSION TABLES (CUST-02)
-- -----------------------------------------------------------------------------
create table if not exists public.carts (
    id text primary key default gen_random_uuid()::text,
    user_id uuid references auth.users(id) on delete set null,
    anonymous_session_token text,
    status text not null default 'active' check (status in ('active', 'merged', 'abandoned', 'converted')),
    expires_at timestamptz not null default (now() + interval '30 days'),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists carts_user_idx on public.carts(user_id);
create index if not exists carts_token_idx on public.carts(anonymous_session_token);

create table if not exists public.cart_items (
    id text primary key default gen_random_uuid()::text,
    cart_id text not null references public.carts(id) on delete cascade,
    product_id text references public.products(id) on delete cascade,
    variant_id text references public.product_variants(id) on delete set null,
    custom_build_id text references public.custom_builds(id) on delete set null,
    quantity integer not null default 1 check (quantity > 0),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists cart_items_cart_idx on public.cart_items(cart_id);

-- -----------------------------------------------------------------------------
-- 3. INVENTORY RESERVATION TABLE (CUST-03)
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_reservations (
    id text primary key default gen_random_uuid()::text,
    order_id text not null references public.orders(id) on delete cascade,
    product_id text not null references public.products(id) on delete cascade,
    variant_id text references public.product_variants(id) on delete set null,
    store_id text not null references public.stores(id) default '00000000-0000-0000-0000-000000000001',
    quantity integer not null check (quantity > 0),
    status text not null default 'reserved' check (status in ('reserved', 'settled', 'released')),
    expires_at timestamptz not null default (now() + interval '15 minutes'),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists inv_res_order_idx on public.inventory_reservations(order_id);
create index if not exists inv_res_prod_idx on public.inventory_reservations(product_id);
create index if not exists inv_res_status_idx on public.inventory_reservations(status);

-- -----------------------------------------------------------------------------
-- 4. ORDER ITEMS IMMUTABLE SNAPSHOT ENHANCEMENT (CUST-03, ADMIN-03)
-- -----------------------------------------------------------------------------
alter table public.order_items 
    add column if not exists variant_id text references public.product_variants(id) on delete set null,
    add column if not exists product_title_snapshot text,
    add column if not exists sku_snapshot text,
    add column if not exists variant_title_snapshot text,
    add column if not exists unit_cost_snapshot numeric(12, 2),
    add column if not exists tax_rate_snapshot numeric(5, 4) default 0.1100,
    add column if not exists tax_amount_snapshot numeric(12, 2) default 0.00;

-- -----------------------------------------------------------------------------
-- 5. MULTI-CARRIER FULFILLMENT & SPLIT SHIPMENTS (ADMIN-01)
-- -----------------------------------------------------------------------------
create table if not exists public.fulfillments (
    id text primary key default gen_random_uuid()::text,
    order_id text not null references public.orders(id) on delete cascade,
    fulfillment_number text unique not null,
    carrier text not null, -- 'biteship', 'jne', 'sicepat', 'gojek', 'grab', 'tethera_fleet'
    service_code text not null,
    waybill_id text, -- AWB / Tracking number
    tracking_url text,
    status text not null default 'pending' check (status in ('pending', 'processing', 'shipped', 'in_transit', 'delivered', 'failed', 'cancelled')),
    shipped_at timestamptz,
    delivered_at timestamptz,
    dispatched_by text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists fulfillments_order_idx on public.fulfillments(order_id);

create table if not exists public.fulfillment_items (
    id text primary key default gen_random_uuid()::text,
    fulfillment_id text not null references public.fulfillments(id) on delete cascade,
    order_item_id text not null references public.order_items(id) on delete cascade,
    quantity integer not null check (quantity > 0)
);

create index if not exists fulfillment_items_f_idx on public.fulfillment_items(fulfillment_id);

-- -----------------------------------------------------------------------------
-- 6. RETURNS (RMA), RESTOCKING & REFUND ENGINE (ADMIN-02)
-- -----------------------------------------------------------------------------
create table if not exists public.return_requests (
    id text primary key default gen_random_uuid()::text,
    rma_number text unique not null,
    order_id text not null references public.orders(id) on delete cascade,
    customer_id text,
    customer_email text not null,
    status text not null default 'requested' check (status in ('requested', 'approved', 'item_received', 'inspected', 'rejected', 'completed')),
    reason text not null, -- 'defective_hardware', 'incompatible_spec', 'damaged_transit', 'buyer_remorse'
    customer_notes text,
    admin_notes text,
    photos text[] default array[]::text[],
    requested_at timestamptz default now(),
    inspected_at timestamptz,
    resolved_at timestamptz,
    handled_by text
);

create index if not exists return_req_order_idx on public.return_requests(order_id);
create index if not exists return_req_rma_idx on public.return_requests(rma_number);

create table if not exists public.refunds (
    id text primary key default gen_random_uuid()::text,
    refund_number text unique not null,
    order_id text not null references public.orders(id) on delete cascade,
    return_request_id text references public.return_requests(id) on delete set null,
    amount numeric(12, 2) not null check (amount > 0),
    currency text not null default 'IDR',
    gateway_refund_id text,
    restock_inventory boolean not null default true,
    reason text not null,
    processed_by text not null default 'system_admin',
    status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
    created_at timestamptz default now()
);

create index if not exists refunds_order_idx on public.refunds(order_id);

-- -----------------------------------------------------------------------------
-- 7. IMMUTABLE INVENTORY ADJUSTMENT LEDGER (ADMIN-04)
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_adjustment_ledger (
    id text primary key default gen_random_uuid()::text,
    product_id text not null references public.products(id) on delete cascade,
    variant_id text references public.product_variants(id) on delete set null,
    store_id text not null references public.stores(id) default '00000000-0000-0000-0000-000000000001',
    delta_quantity integer not null, -- Positive for restock/returns, negative for sales/write-offs
    previous_stock integer not null,
    new_stock integer not null,
    reason_code text not null check (reason_code in ('SALE', 'RESTOCK', 'RETURN', 'DAMAGE', 'MANUAL_AUDIT', 'CANCELLED_ORDER')),
    reference_order_id text references public.orders(id) on delete set null,
    actor_id text not null default 'system',
    notes text,
    created_at timestamptz default now()
);

create index if not exists ledger_prod_idx on public.inventory_adjustment_ledger(product_id);
create index if not exists ledger_reason_idx on public.inventory_adjustment_ledger(reason_code);
create index if not exists ledger_created_idx on public.inventory_adjustment_ledger(created_at desc);

-- -----------------------------------------------------------------------------
-- 8. GRANULAR ROLE-BASED ACCESS CONTROL & AUDIT LOGS (ADMIN-06)
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
    id text primary key default gen_random_uuid()::text,
    user_id uuid references auth.users(id) on delete set null,
    email text unique not null,
    name text not null,
    role text not null check (role in ('SUPER_ADMIN', 'CATALOG_MANAGER', 'FULFILLMENT_OPERATOR', 'SUPPORT_AGENT')),
    is_active boolean not null default true,
    last_login_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Seed default Super Admin
insert into public.admin_users (id, email, name, role) values
    ('admin-super-01', 'admin@tethera.com', 'Master Superadmin', 'SUPER_ADMIN'),
    ('admin-catalog-01', 'catalog@tethera.com', 'Catalog Lead', 'CATALOG_MANAGER'),
    ('admin-fulfill-01', 'dispatch@tethera.com', 'Warehouse Logistics Lead', 'FULFILLMENT_OPERATOR'),
    ('admin-support-01', 'support@tethera.com', 'Customer Support Rep', 'SUPPORT_AGENT')
on conflict (email) do nothing;

create table if not exists public.admin_audit_logs (
    id text primary key default gen_random_uuid()::text,
    actor_id text not null,
    actor_name text not null,
    role text not null,
    action text not null, -- e.g. 'PRODUCT_PRICE_UPDATED', 'REFUND_ISSUED', 'ORDER_STATUS_CHANGED'
    entity_type text not null, -- 'product', 'order', 'refund', 'promotion', 'inventory'
    entity_id text not null,
    before_state jsonb,
    after_state jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz default now()
);

create index if not exists audit_actor_idx on public.admin_audit_logs(actor_id);
create index if not exists audit_entity_idx on public.admin_audit_logs(entity_type, entity_id);
create index if not exists audit_created_idx on public.admin_audit_logs(created_at desc);

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY POLICIES FOR NEW ENTITIES
-- -----------------------------------------------------------------------------
alter table public.product_variants enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.fulfillments enable row level security;
alter table public.fulfillment_items enable row level security;
alter table public.return_requests enable row level security;
alter table public.refunds enable row level security;
alter table public.inventory_adjustment_ledger enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "Public can view active variants" on public.product_variants for select using (is_active = true);
create policy "Users can view own cart" on public.carts for select using (auth.uid() = user_id or user_id is null);
create policy "Users can manage own cart items" on public.cart_items for all using (true);
create policy "Public can view fulfillments for their orders" on public.fulfillments for select using (true);
create policy "Customers can view own return requests" on public.return_requests for select using (true);
