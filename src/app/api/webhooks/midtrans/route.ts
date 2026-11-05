import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyMidtransSignature } from "@/lib/payment/midtrans";
import { WhatsAppNotificationService } from "@/lib/notifications/whatsapp";
import { sendOrderNotificationEmail, sendInvoiceEmail } from "@/lib/notifications/email";

export const dynamic = "force-dynamic";

/**
 * In-memory ledger of processed webhook event keys to guarantee strict idempotency
 * Key format: `${transaction_id}:${transaction_status}`
 */
const processedWebhookEvents = new Set<string>();

/**
 * Midtrans Webhook Notification Handler
 * 
 * Secure webhook receiving real-time payment notifications directly from Midtrans.
 * Verifies SHA512 signature against the server key, transitions order states,
 * atomically adjusts inventory, and fires customer notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id,
      payment_type,
      fraud_status,
    } = payload;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json(
        { error: "Missing required notification fields (order_id, status_code, gross_amount, signature_key)." },
        { status: 400 }
      );
    }

    // 1. Verify cryptographic SHA512 signature
    const isValidSignature = verifyMidtransSignature(
      order_id,
      status_code,
      gross_amount,
      signature_key
    );

    if (!isValidSignature) {
      console.warn(`[MIDTRANS WEBHOOK] Signature verification failed for order: ${order_id}`);
      return NextResponse.json(
        { error: "Invalid cryptographic signature." },
        { status: 401 }
      );
    }

    // 2. Locate target order by order_number or internal UUID
    const order =
      (await db.orders.findByOrderNumber(order_id)) ||
      (await db.orders.findById(order_id));

    if (!order) {
      console.warn(`[MIDTRANS WEBHOOK] Order not found for order_id: ${order_id}`);
      return NextResponse.json(
        { error: "Order not found in database.", order_id },
        { status: 404 }
      );
    }

    // 3. Idempotency Check: prevent duplicate event processing
    const eventKey = `${transaction_id || order_id}:${transaction_status}:${status_code}`;
    if (processedWebhookEvents.has(eventKey)) {
      return NextResponse.json({
        success: true,
        message: "Webhook event previously processed (idempotent cache).",
        order_id,
        status: order.status,
      });
    }

    const paidStatuses = [
      "order_accepted",
      "assembly_in_progress",
      "testing_bench",
      "ready_for_pickup",
      "ready_for_dispatch",
      "finding_courier",
      "dispatched",
      "on_delivery",
      "delivery_arrived",
      "finished",
      "shipped",
      "collected",
      "payment_received",
    ];

    const isSettlement =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    const isCancellation =
      transaction_status === "cancel" ||
      transaction_status === "expire" ||
      transaction_status === "deny";

    // 4. Handle Settlement / Payment Confirmation
    if (isSettlement) {
      if (paidStatuses.includes(order.status)) {
        processedWebhookEvents.add(eventKey);
        return NextResponse.json({
          success: true,
          message: "Order already marked as paid (idempotent).",
          order_id,
          status: order.status,
        });
      }

      // Transition order status and deduct reserved stock permanently
      const rpcResult = await db.orders.processPaymentSuccess(
        order.id,
        transaction_id || "MIDTRANS-SETTLED"
      );

      const channelName = payment_type
        ? `${payment_type.toUpperCase().replace(/_/g, " ")} (Midtrans)`
        : "Midtrans Payment";

      await db.orders.update(order.id, {
        payment_method: channelName,
        payment_reference: transaction_id || order.payment_reference,
      });

      processedWebhookEvents.add(eventKey);

      // Asynchronously trigger WhatsApp and Email notifications
      try {
        const freshOrder = await db.orders.findById(order.id);
        const orderData = freshOrder || order;

        if (orderData.customer_phone) {
          const whatsappService = new WhatsAppNotificationService();
          if (
            orderData.fulfillment_type === "click_and_collect" &&
            orderData.pickup_code
          ) {
            whatsappService
              .sendClickAndCollectReadyMessage({
                customerPhone: orderData.customer_phone,
                customerName: orderData.customer_name,
                orderNumber: orderData.order_number,
                pickupCode: orderData.pickup_code,
                storeName: "Tethera Flagship Experience Store",
                storeAddress: "Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat",
                tradingHours: "Mon-Sat 09:00 - 18:00",
                qrUrl: `https://tethera.com/orders/pickup/${orderData.pickup_code}`,
              })
              .catch(console.error);
          } else {
            whatsappService
              .sendPaymentConfirmedMessage(
                orderData.customer_phone,
                orderData.customer_name,
                orderData.order_number,
                orderData.fulfillment_type,
                orderData.status === "assembly_in_progress"
              )
              .catch(console.error);
          }
        }

        if (orderData.customer_email) {
          const orderDetails = await db.orders
            .getOrderWithItems(orderData.id)
            .catch(() => null);

          const invoiceItems = orderDetails?.items?.map((it: any) => ({
            name:
              it.product?.name ||
              (it.is_custom_build
                ? "Custom PC Build"
                : `Hardware Component (${it.product_id || it.id})`),
            sku: it.product?.sku,
            quantity: it.quantity,
            price: it.unit_price,
            totalPrice: it.quantity * it.unit_price,
          }));

          sendInvoiceEmail({
            toEmail: orderData.customer_email,
            customerName: orderData.customer_name,
            orderNumber: orderData.order_number,
            paymentId: transaction_id || "MIDTRANS-SETTLED",
            paymentMethod: channelName,
            fulfillmentType: orderData.fulfillment_type,
            pickupCode: orderData.pickup_code || undefined,
            shippingAddress: orderData.shipping_address
              ? `${orderData.shipping_address.street}, ${orderData.shipping_address.city} ${orderData.shipping_address.postalCode}`
              : undefined,
            items: invoiceItems,
            subtotal: orderData.subtotal,
            shippingFee: orderData.shipping_fee,
            grandTotal: orderData.total,
          }).catch(console.error);

          sendOrderNotificationEmail({
            toEmail: orderData.customer_email,
            customerName: orderData.customer_name,
            orderNumber: orderData.order_number,
            fulfillmentType: orderData.fulfillment_type,
            pickupCode: orderData.pickup_code || undefined,
            total: `IDR ${orderData.total.toLocaleString("id-ID")}`,
            isCustomPc: orderData.status === "assembly_in_progress",
            storeDetails: {
              name: "Tethera Flagship Store",
              address: "Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat",
              hours: "Mon-Sat 09:00 - 18:00",
            },
          }).catch(console.error);
        }
      } catch (notifErr) {
        console.warn("[MIDTRANS WEBHOOK] Notification dispatch warning:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: "Payment successfully verified and order transitioned to paid.",
        order_id,
        orderStatus: rpcResult.status,
      });
    }

    // 5. Handle Cancellation / Expiration / Denial
    if (isCancellation) {
      if (order.status === "cancelled") {
        processedWebhookEvents.add(eventKey);
        return NextResponse.json({
          success: true,
          message: "Order already cancelled (idempotent).",
          order_id,
          orderStatus: "cancelled",
        });
      }

      await db.orders.cancelOrder(
        order.id,
        `Midtrans transaction ${transaction_id || ""} ${transaction_status}.`
      );

      processedWebhookEvents.add(eventKey);

      return NextResponse.json({
        success: true,
        message: `Order marked as cancelled and reserved inventory released.`,
        order_id,
        orderStatus: "cancelled",
      });
    }

    // 6. Handle Pending Status
    if (transaction_status === "pending") {
      await db.orders.update(order.id, {
        status: "pending_payment",
        payment_reference: transaction_id || order.payment_reference,
      });

      processedWebhookEvents.add(eventKey);

      return NextResponse.json({
        success: true,
        message: "Order updated to pending_payment.",
        order_id,
        orderStatus: "pending_payment",
      });
    }

    // 7. Handle Challenge (Fraud Review)
    if (transaction_status === "capture" && fraud_status === "challenge") {
      await db.orders.update(order.id, {
        status: "pending_payment",
        payment_reference: transaction_id || order.payment_reference,
        notes: order.notes
          ? `${order.notes} | Flagged for fraud review in Midtrans portal.`
          : "Flagged for fraud review in Midtrans portal.",
      });

      processedWebhookEvents.add(eventKey);

      return NextResponse.json({
        success: true,
        message: "Credit card capture challenged. Order placed in pending_payment.",
        order_id,
        orderStatus: "pending_payment",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Webhook notification acknowledged for status: ${transaction_status}`,
      order_id,
      orderStatus: order.status,
    });
  } catch (error: any) {
    console.error("[MIDTRANS WEBHOOK ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process Midtrans webhook." },
      { status: 500 }
    );
  }
}
