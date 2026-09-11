/**
 * Omnichannel Marketplace Synchronization Service
 * Supports Ginee Open API and Jubelio Omnichannel API for Tokopedia, Shopee, and Lazada.
 */

import { getServerSupabase } from "@/lib/db";

export type MarketplaceProvider = "ginee" | "jubelio";

export interface StockUpdatePayload {
  sku: string;
  availableStock: number;
  bufferStock?: number;
}

export interface InboundStockWebhook {
  provider: MarketplaceProvider;
  channel: "tokopedia" | "shopee" | "lazada";
  externalSku: string;
  newStockOnHand: number;
  timestamp: string;
}

export class MarketplaceSyncService {
  private get supabase() {
    return getServerSupabase();
  }

  constructor() {}

  /**
   * Pulls real-time inventory from Ginee Open API
   * Endpoint: POST /open/api/v1/stock/page
   */
  async pullStockFromGinee(skus: string[]): Promise<Map<string, number>> {
    const appKey = process.env.GINEE_APP_KEY;
    const appSecret = process.env.GINEE_APP_SECRET;
    const stockMap = new Map<string, number>();

    if (!appKey || !appSecret) {
      console.warn("Ginee API credentials missing. Skipping Ginee pull.");
      return stockMap;
    }

    try {
      const response = await fetch("https://open.ginee.com/open/api/v1/stock/page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GINEE_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          page: 1,
          size: 100,
          masterSkuList: skus
        })
      });

      const resData = await response.json();
      if (resData.code === "SUCCESS" && resData.data?.list) {
        for (const item of resData.data.list) {
          // Master available stock
          stockMap.set(item.masterSku, item.availableStock);
        }
      }
    } catch (err) {
      console.error("Failed to pull stock from Ginee:", err);
    }

    return stockMap;
  }

  /**
   * Pulls real-time inventory from Jubelio API
   * Endpoint: GET /inventory/item/
   */
  async pullStockFromJubelio(skus: string[]): Promise<Map<string, number>> {
    const token = process.env.JUBELIO_BEARER_TOKEN;
    const stockMap = new Map<string, number>();

    if (!token) {
      console.warn("Jubelio Bearer token missing. Skipping Jubelio pull.");
      return stockMap;
    }

    try {
      const response = await fetch("https://api2.jubelio.com/inventory/item/", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const resData = await response.json();
      if (resData.data) {
        for (const item of resData.data) {
          if (skus.includes(item.item_code)) {
            stockMap.set(item.item_code, item.available);
          }
        }
      }
    } catch (err) {
      console.error("Failed to pull stock from Jubelio:", err);
    }

    return stockMap;
  }

  /**
   * Push stock deduction to Ginee/Jubelio when webstore order payment succeeds
   */
  async pushStockDeductionToMarketplace(
    provider: MarketplaceProvider,
    items: { sku: string; quantity: number }[]
  ): Promise<boolean> {
    try {
      if (provider === "ginee") {
        const response = await fetch("https://open.ginee.com/open/api/v1/stock/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GINEE_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            items: items.map(item => ({
              masterSku: item.sku,
              changeType: "SUBTRACT",
              changeQuantity: item.quantity
            }))
          })
        });
        return response.ok;
      } else if (provider === "jubelio") {
        const response = await fetch("https://api2.jubelio.com/inventory/stock-adjustment/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.JUBELIO_BEARER_TOKEN}`
          },
          body: JSON.stringify({
            items: items.map(item => ({
              item_code: item.sku,
              qty: -item.quantity,
              note: "Webstore order deduction"
            }))
          })
        });
        return response.ok;
      }
      return false;
    } catch (error) {
      console.error(`Failed to push stock deduction to ${provider}:`, error);
      return false;
    }
  }

  /**
   * Syncs inbound stock updates from Tokopedia/Shopee webhooks into Supabase
   */
  async handleInboundMarketplaceWebhook(webhook: InboundStockWebhook) {
    const flagshipStoreId = "00000000-0000-0000-0000-000000000001";

    if (!this.supabase) {
      console.warn(
        `[MARKETPLACE WEBHOOK] Supabase not configured. Simulated sync for SKU: ${webhook.externalSku} (${webhook.newStockOnHand} units)`
      );
      return;
    }

    // 1. Locate product mapping
    const { data: mapping } = await this.supabase
      .from("marketplace_product_mappings")
      .select("product_id, buffer_stock")
      .eq("external_sku", webhook.externalSku)
      .eq("external_provider", webhook.provider)
      .single();

    if (!mapping) {
      throw new Error(`SKU ${webhook.externalSku} not found in marketplace mappings.`);
    }

    // 2. Compute available stock with buffer protection
    const effectiveStock = Math.max(0, webhook.newStockOnHand - (mapping.buffer_stock || 0));

    // 3. Update Supabase store_inventory
    await this.supabase
      .from("store_inventory")
      .upsert({
        store_id: flagshipStoreId,
        product_id: mapping.product_id,
        stock_on_hand: effectiveStock,
        updated_at: new Date().toISOString()
      }, { onConflict: "store_id,product_id" });

    // 4. Record sync log
    await this.supabase.from("marketplace_sync_logs").insert({
      direction: "inbound_webhook",
      provider: webhook.provider,
      payload: webhook,
      status: "success"
    });
  }
}
