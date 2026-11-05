import "server-only";
import { BaseRepository } from "./base.repository";
import { StoreInventory } from "../types";
import { FLAGSHIP_STORE_ID } from "./stores.repository";
import { MOCK_COMPONENTS } from "../../data/mockHardware";
import { inventoryLedgerRepository } from "./inventoryLedger.repository";

const INITIAL_INVENTORY: StoreInventory[] = MOCK_COMPONENTS.map((item) => ({
  id: `inv-${item.id}`,
  store_id: FLAGSHIP_STORE_ID,
  product_id: item.id,
  stock_on_hand: item.stockCount,
  stock_reserved: 0,
  low_stock_threshold: 2,
  aisle_bin: "A-01",
}));

export class InventoryRepository extends BaseRepository<StoreInventory> {
  constructor() {
    super("store_inventory", INITIAL_INVENTORY);
  }

  async getByProductAndStore(
    productId: string,
    storeId: string = FLAGSHIP_STORE_ID
  ): Promise<StoreInventory | null> {
    return this.findOne({ product_id: productId, store_id: storeId });
  }

  async reserveStock(
    productId: string,
    quantity: number,
    storeId: string = FLAGSHIP_STORE_ID
  ): Promise<{ success: boolean; error?: string }> {
    const record = await this.getByProductAndStore(productId, storeId);
    if (!record) {
      return { success: false, error: "Inventory record not found." };
    }

    const available = record.stock_on_hand - record.stock_reserved;
    if (available < quantity) {
      return {
        success: false,
        error: `Insufficient stock. Requested: ${quantity}, Available: ${available}`,
      };
    }

    await this.update(record.id, {
      stock_reserved: record.stock_reserved + quantity,
    });

    return { success: true };
  }

  async releaseReservedStock(
    productId: string,
    quantity: number,
    storeId: string = FLAGSHIP_STORE_ID
  ): Promise<{ success: boolean; error?: string }> {
    const record = await this.getByProductAndStore(productId, storeId);
    if (!record) return { success: false, error: "Inventory record not found." };
    const newReserved = Math.max(0, record.stock_reserved - quantity);
    await this.update(record.id, { stock_reserved: newReserved });
    return { success: true };
  }

  async deductReservedStock(
    productId: string,
    quantity: number,
    storeId: string = FLAGSHIP_STORE_ID,
    options?: {
      referenceOrderId?: string | null;
      actorId?: string;
      notes?: string | null;
      variantId?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const record = await this.getByProductAndStore(productId, storeId);
    if (!record) return { success: false, error: "Inventory record not found." };
    const newReserved = Math.max(0, record.stock_reserved - quantity);
    const newOnHand = Math.max(0, record.stock_on_hand - quantity);
    await this.update(record.id, {
      stock_reserved: newReserved,
      stock_on_hand: newOnHand,
    });

    // Record immutable ledger entry
    try {
      await inventoryLedgerRepository.recordAdjustment({
        productId,
        variantId: options?.variantId,
        storeId,
        deltaQuantity: -quantity,
        previousStock: record.stock_on_hand,
        newStock: newOnHand,
        reasonCode: "SALE",
        referenceOrderId: options?.referenceOrderId,
        actorId: options?.actorId || "midtrans_webhook",
        notes: options?.notes || "Settled order sale",
      });
    } catch (err) {
      console.warn("[LEDGER WARN] Failed to log inventory deduction:", err);
    }

    return { success: true };
  }

  async updateOnHandStock(
    productId: string,
    newStockOnHand: number,
    storeId: string = FLAGSHIP_STORE_ID,
    ledgerOptions?: {
      reasonCode?:
        | "SALE"
        | "RESTOCK"
        | "RETURN"
        | "DAMAGE"
        | "MANUAL_AUDIT"
        | "CANCELLED_ORDER";
      referenceOrderId?: string | null;
      actorId?: string;
      notes?: string | null;
      variantId?: string | null;
    }
  ): Promise<StoreInventory | null> {
    const record = await this.getByProductAndStore(productId, storeId);
    const previousStock = record ? record.stock_on_hand : 0;
    const delta = newStockOnHand - previousStock;

    let result: StoreInventory | null = null;
    if (!record) {
      result = await this.create({
        store_id: storeId,
        product_id: productId,
        stock_on_hand: newStockOnHand,
        stock_reserved: 0,
        low_stock_threshold: 2,
      });
    } else {
      result = await this.update(record.id, {
        stock_on_hand: newStockOnHand,
      });
    }

    // Record immutable ledger entry
    try {
      await inventoryLedgerRepository.recordAdjustment({
        productId,
        variantId: ledgerOptions?.variantId,
        storeId,
        deltaQuantity: delta,
        previousStock,
        newStock: newStockOnHand,
        reasonCode:
          ledgerOptions?.reasonCode || (delta >= 0 ? "RESTOCK" : "MANUAL_AUDIT"),
        referenceOrderId: ledgerOptions?.referenceOrderId,
        actorId: ledgerOptions?.actorId || "system",
        notes: ledgerOptions?.notes,
      });
    } catch (err) {
      console.warn("[LEDGER WARN] Failed to log inventory adjustment:", err);
    }

    return result;
  }

  async updateLowStockThreshold(
    productId: string,
    threshold: number,
    storeId: string = FLAGSHIP_STORE_ID
  ): Promise<StoreInventory | null> {
    const record = await this.getByProductAndStore(productId, storeId);
    if (!record) return null;
    return this.update(record.id, {
      low_stock_threshold: Math.max(0, threshold),
    });
  }

  async getLowStockItems(storeId: string = FLAGSHIP_STORE_ID): Promise<StoreInventory[]> {
    const all = await this.findMany({ store_id: storeId });
    return all.filter((inv) => inv.stock_on_hand <= inv.low_stock_threshold);
  }
}

export const inventoryRepository = new InventoryRepository();
