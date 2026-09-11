import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MarketplaceSyncService } from "@/lib/integrations/marketplace";
import { WhatsAppNotificationService } from "@/lib/notifications/whatsapp";
import { sendOrderNotificationEmail } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentReference } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Atomically reserve inventory and transition order state (payment succeeded)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "process_order_payment_success",
      {
        p_order_id: orderId,
        p_payment_reference: paymentReference || "PAY-SUCCESS"
      }
    );

    if (rpcError || !rpcResult.success) {
      console.error("Failed to reserve stock on payment success:", rpcError || rpcResult.error);
      return NextResponse.json(
        { success: false, error: rpcResult?.error || rpcError?.message },
        { status: 409 }
      );
    }

    // 2. Fetch order details & store details for notifications
    const { data: order } = await supabase
      .from("orders")
      .select("*, stores(*), order_items(*, products(sku))")
      .eq("id", orderId)
      .single();

    const isCustomPc = order?.order_items?.some((item: any) => item.custom_build_id !== null) || false;
    const isCnC = order?.fulfillment_type === "click_and_collect";

    // 3. Dispatch dual WhatsApp & Email notifications with pickup codes
    const whatsappService = new WhatsAppNotificationService();

    // A. WhatsApp Notification
    if (order?.customer_phone) {
      if (isCnC && order.pickup_code) {
        // Send pickup PIN immediately if it's a standard Click & Collect order
        whatsappService.sendClickAndCollectReadyMessage({
          customerPhone: order.customer_phone,
          customerName: order.customer_name,
          orderNumber: order.order_number,
          pickupCode: order.pickup_code,
          storeName: order.stores?.name || "Tethera Store - Mangga Dua Mall",
          storeAddress: order.stores?.address || "Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat",
          tradingHours: "Mon-Sat 09:00 - 18:00",
          qrUrl: `https://store.com/orders/pickup/${order.pickup_code}`
        }).catch(err => console.error("WhatsApp Click & Collect dispatch error:", err));
      } else {
        // Send payment confirmation
        whatsappService.sendPaymentConfirmedMessage(
          order.customer_phone,
          order.customer_name,
          order.order_number,
          order.fulfillment_type,
          isCustomPc
        ).catch(err => console.error("WhatsApp payment confirmation error:", err));
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
        storeDetails: order.stores ? {
          name: order.stores.name,
          address: order.stores.address,
          hours: "Mon-Sat 09:00 - 18:00"
        } : undefined
      }).catch(err => console.error("Email notification dispatch error:", err));
    }

    // 4. Push stock deductions to Ginee / Jubelio for Tokopedia and Shopee (asynchronously)
    if (rpcResult.reserved_items && rpcResult.reserved_items.length > 0) {
      const syncService = new MarketplaceSyncService();
      
      const productIds = rpcResult.reserved_items.map((i: any) => i.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, sku")
        .in("id", productIds);

      const skuMap = new Map(products?.map(p => [p.id, p.sku]));

      const deductionList = rpcResult.reserved_items.map((i: any) => ({
        sku: skuMap.get(i.product_id) || "",
        quantity: i.quantity
      })).filter((i: any) => i.sku !== "");

      const activeProvider = (process.env.MARKETPLACE_DEFAULT_PROVIDER as "ginee" | "jubelio") || "ginee";
      syncService.pushStockDeductionToMarketplace(activeProvider, deductionList)
        .catch(err => console.error("Marketplace push error:", err));
    }

    return NextResponse.json({
      success: true,
      orderNumber: order?.order_number,
      status: order?.status,
      fulfillmentType: order?.fulfillment_type,
      pickupCode: order?.pickup_code, // 4-digit PIN for Click & Collect
      message: isCnC
        ? "Payment confirmed. 4-digit pickup code has been sent via WhatsApp and Email."
        : "Payment confirmed. Receipt sent via WhatsApp and Email."
    });
  } catch (error: any) {
    console.error("Payment confirmation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
