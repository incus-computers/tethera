import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MIDTRANS_PAYMENT_METHODS, generateMidtransPaymentDetails } from "@/lib/payment/midtrans";
import { WhatsAppNotificationService } from "@/lib/notifications/whatsapp";
import { sendOrderNotificationEmail } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderNumber, paymentChannel, amount } = body;

    if (!orderId || !orderNumber) {
      return NextResponse.json(
        { error: "orderId and orderNumber are required" },
        { status: 400 }
      );
    }

    const channel = paymentChannel || "qris";
    const method = MIDTRANS_PAYMENT_METHODS.find((m) => m.id === channel);
    const channelName = method?.name || "Midtrans Instant Pay";

    // 1. Generate authentic Midtrans Payment ID and Details
    const paymentDetails = generateMidtransPaymentDetails(orderNumber, channel, amount);
    const paymentReference = paymentDetails.paymentId;

    // 2. Process stock reservation & transition order state
    const rpcResult = await db.orders.processPaymentSuccess(orderId, paymentReference);

    // 3. Update order with payment method details
    const order = await db.orders.findById(orderId);
    if (order) {
      await db.orders.update(orderId, {
        payment_method: `${channelName} (Midtrans)`,
        payment_reference: paymentReference,
        status: "order_accepted",
        paid_at: new Date().toISOString(),
      });
    }

    // 4. Send dual WhatsApp & Email notifications
    try {
      if (order?.customer_phone) {
        const whatsappService = new WhatsAppNotificationService();
        if (order.fulfillment_type === "click_and_collect" && order.pickup_code) {
          whatsappService.sendClickAndCollectReadyMessage({
            customerPhone: order.customer_phone,
            customerName: order.customer_name,
            orderNumber: order.order_number,
            pickupCode: order.pickup_code,
            storeName: "Tethera Flagship Experience Store",
            storeAddress: "Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat",
            tradingHours: "Mon-Sat 09:00 - 18:00",
            qrUrl: `https://tethera.com/orders/pickup/${order.pickup_code}`,
          }).catch(console.error);
        } else {
          whatsappService.sendPaymentConfirmedMessage(
            order.customer_phone,
            order.customer_name,
            order.order_number,
            order.fulfillment_type,
            false
          ).catch(console.error);
        }
      }

      if (order?.customer_email) {
        sendOrderNotificationEmail({
          toEmail: order.customer_email,
          customerName: order.customer_name,
          orderNumber: order.order_number,
          fulfillmentType: order.fulfillment_type,
          pickupCode: order.pickup_code || undefined,
          total: `IDR ${order.total.toLocaleString("id-ID")}`,
          isCustomPc: false,
          storeDetails: {
            name: "Tethera Flagship Store",
            address: "Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat",
            hours: "Mon-Sat 09:00 - 18:00",
          },
        }).catch(console.error);
      }
    } catch (notifErr) {
      console.warn("Notification dispatch warning:", notifErr);
    }

    return NextResponse.json({
      success: true,
      paymentId: paymentReference,
      orderNumber: order?.order_number || orderNumber,
      paymentMethod: `${channelName} (Midtrans)`,
      transactionStatus: "settlement",
      paidAt: new Date().toISOString(),
      details: paymentDetails,
    });
  } catch (error: any) {
    console.error("Midtrans charge error:", error);
    return NextResponse.json(
      { error: error.message || "Midtrans payment processing failed" },
      { status: 500 }
    );
  }
}
