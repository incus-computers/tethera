import { NextRequest, NextResponse } from "next/server";
import { db, getServerSupabase } from "@/lib/db";
import { MarketplaceSyncService } from "@/lib/integrations/marketplace";
import { WhatsAppNotificationService } from "@/lib/notifications/whatsapp";
import { sendOrderNotificationEmail } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentReference } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const supabase = getServerSupabase();

    // 1. Atomically reserve inventory and transition order state via db layer
    const rpcResult = await db.orders.processPaymentSuccess(
      orderId,
      paymentReference || "PAY-SUCCESS"
    );

    if (!rpcResult.success) {
      console.error("Failed to reserve stock on payment success:", rpcResult.error);
      return NextResponse.json(
        { success: false, error: rpcResult.error || "Payment processing failed" },
        { status: 409 }
      );
    }

    // 2. Fetch order details & store details for notifications
    let order: any = null;
    if (supabase) {
      const { data } = await supabase
        .from("orders")
        .select("*, stores(*), order_items(*, products(sku))")
        .eq("id", orderId)
        .single();
      order = data;
    } else {
      const { order: localOrder, items } = await db.orders.getOrderWithItems(orderId);
      const store = await db.stores.getFlagshipStore();
      order = localOrder
        ? {
            ...localOrder,
            stores: store,
            order_items: items,
          }
        : null;
    }

    const isCustomPc =
      order?.order_items?.some((item: any) => item.custom_build_id !== null || item.is_custom_build) ||
      false;
    const isCnC = order?.fulfillment_type === "click_and_collect";

    // 3. Dispatch dual WhatsApp & Email notifications with pickup codes
    const whatsappService = new WhatsAppNotificationService();

    // A. WhatsApp Notification
    if (order?.customer_phone) {
      if (isCnC && order.pickup_code) {
        whatsappService
          .sendClickAndCollectReadyMessage({
            customerPhone: order.customer_phone,
            customerName: order.customer_name,
            orderNumber: order.order_number,
            pickupCode: order.pickup_code,
            storeName: order.stores?.name || "Tethera Store - Mangga Dua Mall",
            storeAddress:
              order.stores?.address || "Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat",
            tradingHours: "Mon-Sat 09:00 - 18:00",
            qrUrl: `https://store.com/orders/pickup/${order.pickup_code}`,
          })
          .catch((err) => console.error("WhatsApp Click & Collect dispatch error:", err));
      } else {
        whatsappService
          .sendPaymentConfirmedMessage(
            order.customer_phone,
            order.customer_name,
            order.order_number,
            order.fulfillment_type,
            isCustomPc
          )
          .catch((err) => console.error("WhatsApp payment confirmation error:", err));
      }
    }

    // B. Email Notification
    if (order?.customer_email) {
      sendOrderNotificationEmail({
        toEmail: order.customer_email,
        customerName: order.customer_name,
        orderNumber: order.order_number,
        fulfillmentType: order.fulfillment_type,
        pickupCode: order.pickup_code,
        total: `$${order.total}`,
        isCustomPc,
        storeDetails: order.stores
          ? {
              name: order.stores.name,
              address: order.stores.address,
              hours: "Mon-Sat 09:00 - 18:00",
            }
          : undefined,
      }).catch((err) => console.error("Email notification dispatch error:", err));
    }

    // 4. Push stock deductions to Ginee / Jubelio for Tokopedia and Shopee (asynchronously)
    if (rpcResult.reservedItems && rpcResult.reservedItems.length > 0) {
      const syncService = new MarketplaceSyncService();

      const productIds = rpcResult.reservedItems.map((i: any) => i.product_id);
      let skuMap = new Map<string, string>();

      if (supabase) {
        const { data: products } = await supabase
          .from("products")
          .select("id, sku")
          .in("id", productIds);
        skuMap = new Map(products?.map((p) => [p.id, p.sku]));
      } else {
        for (const pid of productIds) {
          const p = await db.products.findById(pid);
          if (p) skuMap.set(p.id, p.sku);
        }
      }

      const deductionList = rpcResult.reservedItems
        .map((i: any) => ({
          sku: skuMap.get(i.product_id) || "",
          quantity: i.quantity,
        }))
        .filter((i: any) => i.sku !== "");

      const activeProvider =
        (process.env.MARKETPLACE_DEFAULT_PROVIDER as "ginee" | "jubelio") || "ginee";
      syncService
        .pushStockDeductionToMarketplace(activeProvider, deductionList)
        .catch((err) => console.error("Marketplace push error:", err));
    }

    return NextResponse.json({
      success: true,
      orderNumber: order?.order_number,
      status: order?.status || rpcResult.status,
      fulfillmentType: order?.fulfillment_type,
      pickupCode: order?.pickup_code,
      message: isCnC
        ? "Payment confirmed. 4-digit pickup code has been sent via WhatsApp and Email."
        : "Payment confirmed. Receipt sent via WhatsApp and Email.",
    });
  } catch (error: any) {
    console.error("Payment confirmation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
