import { reservePromotion } from "./promotionClaims";
import { demoTransaction } from "@/lib/inventory/demoTransaction";
import "server-only";
import { createHash } from "crypto";
import { BaseRepository, db, InventoryReservationRow, Order, OrderItem } from "@/lib/db";
import { DatabaseError } from "@/lib/db/errors";
import { checkoutVariants, checkoutProducts, catalogSnapshot, variantSnapshot } from "./catalog";
import { priceCheckout } from "./pricing";
import { CheckoutError } from "./errors";

type RequestRow = { id: string; owner_id: string; request_key: string; fingerprint: string; result: {order: Order; items: OrderItem[]} };
const reservations = new BaseRepository<InventoryReservationRow>("inventory_reservations");
export class CheckoutRepository extends BaseRepository<RequestRow> {
  constructor() { super("checkout_requests"); }
  async replay(owner: string, key: string, fingerprint: string) {
    const existing = await this.findOne({ owner_id: owner, request_key: key });
    if (!existing) return null;
    if (existing.fingerprint !== fingerprint) throw new CheckoutError("This checkout key was already used for a different basket. Start a new checkout.",409);
    return existing.result;
  }
  async commit(owner: string, key: string, fingerprint: string, order: Partial<Order>, pricing: Awaited<ReturnType<typeof priceCheckout>>) {
    const client = this.getClient();
    if (client) {
      let result;
      try { result = await client.rpc("commit_checkout", { p_request: { owner_id: owner, request_key: key, fingerprint }, p_order: order, p_items: pricing.lines,
        p_stock: pricing.stock, p_catalog: pricing.catalog, p_variants: pricing.variants, p_promotion: pricing.promotion }); }
      catch { throw new DatabaseError("commitCheckout","checkout_requests"); }
      if (result.error?.code === "PT409") throw new CheckoutError("Checkout changed or stock is unavailable. Refresh your basket and retry.",409);
      if (result.error) throw new DatabaseError("commitCheckout","checkout_requests",result.error.code);
      if (!result.data?.order?.id || !Array.isArray(result.data.items)) throw new DatabaseError("commitCheckout","checkout_requests");
      return result.data as RequestRow["result"];
    }
    return demoTransaction(async()=>{
      const prior = await this.replay(owner,key,fingerprint); if (prior) return prior;
      for (const expected of pricing.catalog) {
        const p = await checkoutProducts.findById(expected.id);
        if (!p || JSON.stringify(catalogSnapshot(p)) !== JSON.stringify(expected)) throw new CheckoutError("Catalog changed. Refresh your basket.",409);
      }
      for (const expected of pricing.variants) {
        const v = await checkoutVariants.findById(expected.id);
        if (!v || JSON.stringify(variantSnapshot(v)) !== JSON.stringify(expected)) throw new CheckoutError("Variant changed. Refresh your basket.",409);
      }
      const result = await db.orders.createOrderWithItems(order,pricing.lines);
      for (const s of pricing.stock) {
        if (s.variantId) {
          const v = await checkoutVariants.findById(s.variantId);
          if (!v || v.stock_quantity-v.reserved_quantity < s.quantity) throw new CheckoutError("Insufficient stock.",409);
          await checkoutVariants.update(v.id,{reserved_quantity:v.reserved_quantity+s.quantity});
        } else {
          const reserved = await db.inventory.reserveStock(s.productId,s.quantity);
          if (!reserved.success) throw new CheckoutError("Insufficient stock.",409);
        }
        await reservations.create({ order_id: result.order.id, product_id:s.productId, variant_id:s.variantId, store_id:"00000000-0000-0000-0000-000000000001", quantity:s.quantity, status:"reserved", expires_at:new Date(Date.now()+900000).toISOString() });
      }
      if (pricing.promotion) {
        const fresh = await db.promotions.validatePromotion(pricing.promotion.code,{subtotal:pricing.subtotal,shippingFee:pricing.shippingFee,items:pricing.eligibleItems,customerId:owner});
        if (!fresh.valid || fresh.discountAmount !== pricing.discount) throw new CheckoutError("Promotion changed. Refresh your basket.",409);
        await reservePromotion(fresh.promotion!,result.order.id,owner,pricing.discount);
      }
      await this.create({ id:createHash("sha256").update(owner+":"+key).digest("hex"), owner_id:owner, request_key:key, fingerprint, result });
      return result;
    });
  }
}
export const checkoutRepository = new CheckoutRepository();
