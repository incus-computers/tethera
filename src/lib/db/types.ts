// ==============================================================================
// TETHERA SERVER-SIDE DATABASE SCHEMA TYPES
// Matches PostgreSQL tables defined in supabase/schema.sql
// ==============================================================================

export type MarketplaceProvider = "ginee" | "jubelio";
export type MarketplaceChannel = "tokopedia" | "shopee" | "lazada" | "tiktok_shop";
export type FulfillmentType = "delivery" | "click_and_collect";
export type OrderStatus =
  | "order_received"
  | "order_accepted"
  | "finding_stock"
  | "finding_courier"
  | "on_delivery"
  | "delivery_arrived"
  | "pending_payment"
  | "payment_received"
  | "assembly_in_progress"
  | "testing_bench"
  | "ready_for_pickup"
  | "collected"
  | "shipped"
  | "cancelled"
  | "refunded";

export interface CourierDispatchInfo {
  provider: "gojek" | "grab" | "custom";
  service_code: string;
  service_name: string;
  driver_name: string;
  driver_phone: string;
  vehicle_plate: string;
  tracking_id: string;
  tracking_url?: string;
  dispatched_at: string;
  estimated_arrival?: string;
  delivered_at?: string;
  status: "dispatched" | "in_transit" | "arrived" | "failed";
}

export type CustomerCrmStatus = "lead" | "active_customer" | "vip" | "inactive";
export type CustomerSegment = "gamer" | "pc_builder" | "creator" | "enterprise" | "general";
export type HardwarePreference = "amd" | "intel_nvidia" | "all";
export type PcBuilderSlot =
  | "cpu"
  | "cooler"
  | "motherboard"
  | "ram"
  | "gpu"
  | "storage_primary"
  | "storage_secondary"
  | "case"
  | "psu"
  | "os"
  | "service";

// 1. Stores Table
export interface Store {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  whatsapp?: string | null;
  email: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  is_click_and_collect: boolean;
  pickup_lead_time_minutes: number;
  trading_hours: Record<string, string>;
  created_at?: string;
}

// 2. Categories Table
export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  icon?: string | null;
  sort_order: number;
  pc_builder_slot?: PcBuilderSlot | null;
}

// 3. Products Table
export interface ProductSpecs {
  socket?: string;
  ram_type?: "DDR4" | "DDR5";
  form_factor?: "ATX" | "Micro-ATX" | "Mini-ITX";
  tdp_watts?: number;
  length_mm?: number;
  max_gpu_length_mm?: number;
  radiator_size_mm?: number;
  wattage?: number;
  capacity?: string;
  speed?: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  slug: string;
  brand: string;
  description?: string | null;
  category_id?: string | null;
  category_slug?: string;
  retail_price: number;
  sale_price?: number | null;
  cost_price?: number | null;
  images: string[];
  specs: ProductSpecs;
  warranty_months: number;
  is_active: boolean;
  pc_builder_slot?: PcBuilderSlot | null;
  created_at?: string;
}

// 4. Store Inventory Table
export interface StoreInventory {
  id: string;
  store_id: string;
  product_id: string;
  stock_on_hand: number;
  stock_reserved: number;
  low_stock_threshold: number;
  aisle_bin?: string | null;
  updated_at?: string;
}

// 5. Custom Builds Table
export interface CustomBuild {
  id: string;
  share_slug: string;
  user_id?: string | null;
  build_name: string;
  platform: "intel" | "amd";
  configuration: Record<string, string>; // { cpu: "prod-uuid", gpu: "prod-uuid", ... }
  total_price: number;
  estimated_wattage: number;
  recommended_psu_wattage: number;
  assembly_tier: "parts_only" | "standard_48h" | "express_24h";
  created_at?: string;
}

// 6. Orders Table
export interface Order {
  id: string;
  order_number: string;
  customer_id?: string | null;
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  fulfillment_type: FulfillmentType;
  pickup_store_id?: string | null;
  pickup_code?: string | null;
  id_verified_at_pickup?: boolean;
  shipping_address?: {
    street: string;
    unit?: string;
    subdistrict: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    label?: string;
    deliveryNotes?: string;
  } | null;
  subtotal: number;
  shipping_fee: number;
  assembly_fee: number;
  total: number;
  status: OrderStatus;
  courier_info?: CourierDispatchInfo | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  paid_at?: string | null;
}

// 7. Order Items Table
export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  custom_build_id?: string | null;
  quantity: number;
  unit_price: number;
  is_custom_build: boolean;
}

// 8. Customer Profiles Table
export interface CustomerProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  subdistrict: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  address_label?: string | null;
  delivery_notes?: string | null;
  marketing_opt_in: boolean;
  newsletter_frequency: "weekly" | "drops_only" | "monthly";
  customer_segment: CustomerSegment;
  hardware_preference: HardwarePreference;
  crm_status: CustomerCrmStatus;
  lead_source: string;
  tags: string[];
  total_orders: number;
  total_spent: number;
  last_order_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// 9. CRM Email Campaigns Table
export interface CrmEmailCampaignRow {
  id: string;
  campaign_name: string;
  subject: string;
  target_segment: string;
  recipients_count: number;
  sent_by: string;
  content_preview?: string | null;
  sent_at?: string;
}

// 10. Marketplace Integrations Table
export interface MarketplaceIntegration {
  id: string;
  provider: MarketplaceProvider;
  channel: MarketplaceChannel;
  channel_shop_id: string;
  shop_name: string;
  is_sync_enabled: boolean;
  created_at?: string;
}

// 11. Marketplace Product Mappings Table
export interface MarketplaceProductMapping {
  id: string;
  product_id: string;
  external_provider: MarketplaceProvider;
  external_sku: string;
  external_item_id?: string | null;
  buffer_stock: number;
  last_synced_at?: string | null;
  last_synced_stock: number;
  sync_status: "synced" | "pending" | "error";
  error_message?: string | null;
}

// 12. Marketplace Sync Logs Table
export interface MarketplaceSyncLog {
  id: string;
  direction: "inbound_webhook" | "outbound_push" | "reconciliation_cron";
  provider: MarketplaceProvider;
  payload: Record<string, any>;
  status: "success" | "failed";
  response?: Record<string, any> | null;
  created_at?: string;
}

// 13. Promotions Table
export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number; // e.g. 15 for 15% or 500000 for Rp 500.000
  min_spend?: number;
  max_discount?: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  usage_count: number;
  usage_limit?: number;
  created_at?: string;
}

// 14. Promotional Banners Table
export interface DynamicBannerSlide {
  id: string;
  type: "content" | "image";
  title: string;
  highlight?: string;
  description?: string;
  badge?: string;
  badge_type?: "hot" | "flagship" | "event" | "bundle" | "partner";
  cta_text?: string;
  cta_link: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
  image_url?: string;
  hide_overlay?: boolean;
  perk?: string;
  bg_gradient?: string;
  tag_color?: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
}

