import { NextRequest, NextResponse } from "next/server";
import { MarketplaceSyncService, InboundStockWebhook } from "@/lib/integrations/marketplace";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-marketplace-token");
    if (authHeader !== process.env.MARKETPLACE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
    }

    const body = await req.json();
    const syncService = new MarketplaceSyncService();

    // Standardized payload format
    const webhookData: InboundStockWebhook = {
      provider: body.provider, // 'ginee' | 'jubelio'
      channel: body.channel,   // 'tokopedia' | 'shopee'
      externalSku: body.sku || body.item_code,
      newStockOnHand: body.available_stock || body.qty,
      timestamp: new Date().toISOString()
    };

    await syncService.handleInboundMarketplaceWebhook(webhookData);

    return NextResponse.json({ success: true, processedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error("Error processing marketplace webhook:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
