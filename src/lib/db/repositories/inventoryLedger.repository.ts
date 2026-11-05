import "server-only";
import { BaseRepository } from "./base.repository";
import { InventoryAdjustmentLedgerRow } from "../types";
import { FLAGSHIP_STORE_ID } from "./stores.repository";

export class InventoryAdjustmentLedgerRepository extends BaseRepository<InventoryAdjustmentLedgerRow> {
  constructor() {
    super("inventory_adjustment_ledger", []);
  }

  async recordAdjustment(entry: {
    productId: string;
    variantId?: string | null;
    storeId?: string;
    deltaQuantity: number;
    previousStock: number;
    newStock: number;
    reasonCode:
      | "SALE"
      | "RESTOCK"
      | "RETURN"
      | "DAMAGE"
      | "MANUAL_AUDIT"
      | "CANCELLED_ORDER";
    referenceOrderId?: string | null;
    actorId?: string;
    notes?: string | null;
  }): Promise<InventoryAdjustmentLedgerRow> {
    return this.create({
      product_id: entry.productId,
      variant_id: entry.variantId || null,
      store_id: entry.storeId || FLAGSHIP_STORE_ID,
      delta_quantity: entry.deltaQuantity,
      previous_stock: entry.previousStock,
      new_stock: entry.newStock,
      reason_code: entry.reasonCode,
      reference_order_id: entry.referenceOrderId || null,
      actor_id: entry.actorId || "system",
      notes: entry.notes || null,
      created_at: new Date().toISOString(),
    });
  }

  async getRecentMovements(limit: number = 50): Promise<InventoryAdjustmentLedgerRow[]> {
    const list = await this.findMany({});
    return list
      .sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
      )
      .slice(0, limit);
  }

  async getMovementsByProduct(productId: string): Promise<InventoryAdjustmentLedgerRow[]> {
    const list = await this.findMany({ product_id: productId });
    return list.sort(
      (a, b) =>
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
    );
  }

  async getMovementsByOrder(orderId: string): Promise<InventoryAdjustmentLedgerRow[]> {
    const list = await this.findMany({ reference_order_id: orderId });
    return list.sort(
      (a, b) =>
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
    );
  }

  async getLedgerSummary(): Promise<{
    totalMovements: number;
    byReason: Record<string, number>;
  }> {
    const all = await this.findMany({});
    const byReason: Record<string, number> = {
      SALE: 0,
      RESTOCK: 0,
      RETURN: 0,
      DAMAGE: 0,
      MANUAL_AUDIT: 0,
      CANCELLED_ORDER: 0,
    };
    for (const row of all) {
      if (row.reason_code in byReason) {
        byReason[row.reason_code] += 1;
      }
    }
    return {
      totalMovements: all.length,
      byReason,
    };
  }
}

export const inventoryLedgerRepository = new InventoryAdjustmentLedgerRepository();
