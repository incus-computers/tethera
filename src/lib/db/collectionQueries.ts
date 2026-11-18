import "server-only";
import { db } from "@/lib/db";
import { connectedPage, listFilters, type ListFilters, type CollectionPage } from "./collectionPage";
import { pageInput, pagination } from "./pagination";
import { FLAGSHIP_STORE_ID } from "./repositories/stores.repository";

const past = (status: string) => ["completed", "delivered", "delivery_arrived", "collected", "finished", "cancelled", "rejected", "refunded"].includes(status);
function statusMatches(status: string, filter = "") {
  const groups: Record<string, string[]> = { pending: ["pending", "pending_payment", "order_received"],
    processing: ["order_accepted", "finding_stock", "ready_for_dispatch", "payment_received", "assembly_in_progress", "testing_bench", "assembling", "quality_check", "finding_courier", "ready_for_pickup", "processing", "packed"],
    shipped: ["on_delivery", "in_transit", "shipped", "dispatched"], delivered: ["completed", "delivered", "delivery_arrived", "collected", "finished"], cancelled: ["cancelled", "rejected", "refunded"] };
  return !filter || filter === "all" || (groups[filter] || [filter]).includes(status);
}
function sorted(rows: any[], sort = "date-desc") {
  return [...rows].sort((a, b) => {
    const result = sort.startsWith("total") ? (Number(a.total ?? a.total_spent ?? a.retail_price) || 0) - (Number(b.total ?? b.total_spent ?? b.retail_price) || 0)
      : (a.created_at || "").localeCompare(b.created_at || "");
    return result * (sort.endsWith("asc") ? 1 : -1) || a.id.localeCompare(b.id);
  });
}
function slice(rows: any[], page: number, limit: number) { return rows.slice((page - 1) * limit, page * limit); }
function contains(row: any, fields: string[], term = "") { return !term || fields.some(key => String(row[key] || "").toLowerCase().includes(term.toLowerCase())); }

export async function readOrderPage(filters: ListFilters = {}, page?: unknown, limit?: unknown, owner: string | null = null): Promise<CollectionPage> {
  filters = listFilters(filters); const input = pageInput(page, limit);
  const live = await connectedPage("orders", filters, input.page, input.limit, owner); if (live) return live;
  // Demo only: connected mode never materializes entire tables in the app.
  const all = await db.orders.findMany(owner === null ? undefined : { customer_id: owner });
  const matches = sorted(all.filter(o => (!filters.id || o.id === filters.id) && statusMatches(o.status, filters.status) &&
    (!filters.scope || filters.scope === "all" || (filters.scope === "past") === past(o.status)) &&
    contains(o, ["id", "order_number", "customer_name", "customer_email"], filters.search)), filters.sort);
  const profile = owner ? await db.customers.findById(owner) : null;
  const rows = await Promise.all(slice(matches, input.page, input.limit).map(async order => {
    const detail = await db.orders.getOrderWithItems(order.id);
    const items = await Promise.all(detail.items.map(async item => {
      const product = item.product_id ? await db.products.findById(item.product_id) : null;
      let build = item.custom_build_id ? await db.customBuilds.findById(item.custom_build_id) : null;
      if (owner !== null && (!profile?.user_id || build?.user_id !== profile.user_id)) build = null;
      const { unit_cost_snapshot, ...publicItem } = item;
      return { ...(owner === null ? item : publicItem), product: product ? { id: product.id, name: product.name, sku: product.sku,
        brand: product.brand, images: product.images, retail_price: product.retail_price, pc_builder_slot: product.pc_builder_slot } : null,
        customBuild: build ? { id: build.id, build_name: build.build_name, platform: build.platform, total_price: build.total_price, share_slug: build.share_slug, configuration: build.configuration } : null };
    }));
    const { notes, ...publicOrder } = order;
    return { ...(owner === null ? order : publicOrder), pickup_code: owner === null || order.paid_at ? order.pickup_code : null, items };
  }));
  return { rows, pagination: pagination(matches.length, input.page, input.limit), stats: { current: all.filter(o => !past(o.status)).length, past: all.filter(o => past(o.status)).length } };
}

export async function readAdminProductPage(filters: ListFilters = {}, page?: unknown, limit?: unknown): Promise<CollectionPage> {
  filters = listFilters(filters); const input = pageInput(page, limit);
  const live = await connectedPage("products", filters, input.page, input.limit); if (live) return live;
  const all = await db.products.findMany();
  const matches = sorted(all.filter(p => contains(p, ["name", "brand", "sku"], filters.search)), filters.sort);
  const inventory = await db.inventory.findMany({ store_id: FLAGSHIP_STORE_ID });
  return { rows: slice(matches, input.page, input.limit).map(p => {
    const inv = inventory.find(i => i.product_id === p.id);
    return { ...p, stock_on_hand: inv?.stock_on_hand || 0, stock_reserved: inv?.stock_reserved || 0, stock_available: Math.max(0, (inv?.stock_on_hand || 0) - (inv?.stock_reserved || 0)) };
  }), pagination: pagination(matches.length, input.page, input.limit) };
}

export async function readCustomerPage(filters: ListFilters = {}, page?: unknown, limit?: unknown): Promise<CollectionPage> {
  filters = listFilters(filters); const input = pageInput(page, limit);
  const live = await connectedPage("customers", filters, input.page, input.limit); if (live) return live;
  const all = await db.customers.findMany();
  const matches = sorted(all.filter(c => (!filters.segment || filters.segment === "all" || c.customer_segment === filters.segment) &&
    (!filters.optInOnly || c.marketing_opt_in) && contains(c, ["full_name", "email", "phone", "city", "lead_source"], filters.search)), filters.sort);
  const optedInCount = all.filter(c => c.marketing_opt_in).length;
  return { rows: slice(matches, input.page, input.limit), pagination: pagination(matches.length, input.page, input.limit), stats: {
    totalLeads: all.length, optedInCount, optInRate: all.length ? Math.round(100 * optedInCount / all.length) : 0,
    vipCount: all.filter(c => c.crm_status === "vip").length, totalRevenueGenerated: all.reduce((n, c) => n + (c.total_spent || 0), 0),
    segmentBreakdown: Object.fromEntries(["gamer", "pc_builder", "creator", "enterprise", "general"].map(segment => [segment, all.filter(c => c.customer_segment === segment).length])),
  } };
}
