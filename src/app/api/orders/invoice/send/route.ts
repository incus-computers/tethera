import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendInvoiceEmail } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderNumber,
      orderId,
      email,
      customerName,
      paymentId,
      paymentMethod,
      fulfillmentType,
      pickupCode,
      shippingAddress,
      items,
      subtotal,
      shippingFee,
      grandTotal,
    } = body;

    let targetEmail = email;
    let targetName = customerName || "Valued Customer";
    let targetOrderNumber = orderNumber;
    let targetPaymentId = paymentId;
    let targetPaymentMethod = paymentMethod || "Online Payment";
    let targetFulfillment = fulfillmentType || "delivery";
    let targetPickupCode = pickupCode;
    let targetShippingAddress = shippingAddress;
    let targetItems = items || [];
    let targetSubtotal = subtotal || 0;
    let targetShippingFee = shippingFee || 0;
    let targetGrandTotal = grandTotal || 0;

    // Retrieve order record if orderNumber or orderId is supplied
    if (orderNumber || orderId) {
      let order = null;
      if (orderNumber) {
        order = await db.orders.findByOrderNumber(orderNumber).catch(() => null);
      }
      if (!order && orderId) {
        order = await db.orders.findById(orderId).catch(() => null);
      }

      if (order) {
        targetEmail = targetEmail || order.customer_email;
        targetName = targetName === "Valued Customer" ? order.customer_name : targetName;
        targetOrderNumber = order.order_number;
        targetPaymentId = targetPaymentId || order.payment_reference || undefined;
        targetPaymentMethod = targetPaymentMethod === "Online Payment" && order.payment_method ? order.payment_method : targetPaymentMethod;
        targetFulfillment = order.fulfillment_type;
        targetPickupCode = targetPickupCode || order.pickup_code || undefined;
        targetSubtotal = targetSubtotal || order.subtotal;
        targetShippingFee = targetShippingFee || order.shipping_fee;
        targetGrandTotal = targetGrandTotal || order.total;

        if (order.shipping_address) {
          targetShippingAddress = targetShippingAddress || `${order.shipping_address.street}, ${order.shipping_address.city} ${order.shipping_address.postalCode}`;
        }

        if (!targetItems || targetItems.length === 0) {
          const detailed = await db.orders.getOrderWithItems(order.id).catch(() => null);
          if (detailed?.items && detailed.items.length > 0) {
            targetItems = detailed.items.map((it: any) => ({
              name: it.product?.name || (it.is_custom_build ? "Custom PC Build" : `Hardware Item (${it.product_id || it.id})`),
              sku: it.product?.sku,
              quantity: it.quantity,
              price: it.unit_price,
              totalPrice: it.quantity * it.unit_price,
            }));
          }
        }
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: "Recipient email is required to dispatch invoice." },
        { status: 400 }
      );
    }

    if (!targetOrderNumber) {
      return NextResponse.json(
        { error: "Order reference number is required." },
        { status: 400 }
      );
    }

    const result = await sendInvoiceEmail({
      toEmail: targetEmail,
      customerName: targetName,
      orderNumber: targetOrderNumber,
      paymentId: targetPaymentId,
      paymentMethod: targetPaymentMethod,
      fulfillmentType: targetFulfillment,
      pickupCode: targetPickupCode,
      shippingAddress: targetShippingAddress,
      items: targetItems,
      subtotal: targetSubtotal,
      shippingFee: targetShippingFee,
      grandTotal: targetGrandTotal,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch invoice email." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tax invoice dispatched to ${targetEmail}`,
      orderNumber: targetOrderNumber,
      recipientEmail: targetEmail,
    });
  } catch (error: any) {
    console.error("Invoice send route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error dispatching invoice." },
      { status: 500 }
    );
  }
}
