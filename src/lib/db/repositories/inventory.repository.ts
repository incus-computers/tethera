import "server-only";
import { BaseRepository } from "./base.repository";
import { StoreInventory } from "../types";
import { FLAGSHIP_STORE_ID } from "./stores.repository";
import { MOCK_COMPONENTS } from "../../data/mockHardware";

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

  async updateOnHandStock(
    productId: string,
    newStockOnHand: number,
    storeId: string = FLAGSHIP_STORE_ID
  ): Promise<StoreInventory | null> {
    const record = await this.getByProductAndStore(productId, storeId);
    if (!record) {
      return this.create({
        store_id: storeId,
        product_id: productId,
        stock_on_hand: newStockOnHand,
        stock_reserved: 0,
        low_stock_threshold: 2,
      });
    }

    return this.update(record.id, {
      stock_on_hand: newStockOnHand,
    });
  }
}

export const inventoryRepository = new InventoryRepository();
