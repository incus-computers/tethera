import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { limitAuth, authResponse } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/errors";
import { isDemoMode } from "@/lib/runtime/environment";
import { initiateHostedPayment } from "@/lib/payment/attempts";
import { GatewayError } from "@/lib/payment/gateway";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MIDTRANS_PAYMENT_METHODS, generateMidtransPaymentDetails } from "@/lib/payment/midtrans";

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderNumber, paymentChannel } = body;

    if (!orderId && !orderNumber) {
      return NextResponse.json(
        { error: "orderId or orderNumber is required" },
        { status: 400 }
      );
    }

    const order = orderId
      ? await db.orders.findById(orderId)
      : await db.orders.findByOrderNumber(orderNumber);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if(!isDemoMode()){await limitAuth("gateway-create",order.id,10);return NextResponse.json(await initiateHostedPayment(order.id),{headers:{"Cache-Control":"no-store"}});}

    const channel = paymentChannel || "qris";
    const method = MIDTRANS_PAYMENT_METHODS.find((m) => m.id === channel);
    const channelName = method?.name || "Midtrans Instant Pay";

    // 1. Generate authentic Midtrans Payment ID and Details using server-verified order total
    const paymentDetails = generateMidtransPaymentDetails(
      order.order_number,
      channel,
      order.total
    );
    const paymentReference = `DEMO-${order.id}`;

    // 2. Process stock reservation & transition order state
    const rpcResult = await db.orders.processPaymentSuccess(order.id, paymentReference);

    if(!rpcResult.success)return NextResponse.json({success:false,error:rpcResult.error},{status:409});

    // 3. Update order with payment method details
    const updatedOrder = rpcResult.changed ? await db.orders.update(order.id, {
      payment_method: `${channelName} (Midtrans)`,
      payment_reference: paymentReference,
      status: rpcResult.status as any || order.status,
    }) : await db.orders.findById(order.id);

    const activeOrder = updatedOrder || order;

    // Order transition and notification jobs committed together.

    return NextResponse.json({
      success: true,
      paymentId: paymentReference,
      orderNumber: order?.order_number || orderNumber,
      paymentMethod: `${channelName} (Midtrans)`,
      transactionStatus: "settlement",
      paidAt: activeOrder?.paid_at,
      details: paymentDetails,
    });
  } catch (error: any) {
    if(error instanceof AuthError)return authResponse(error);
    if(error instanceof GatewayError)return NextResponse.json({success:false,error:"Service temporarily unavailable. Please retry."},{status:error.status});
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { error: "Midtrans payment processing failed" },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(withAccess(handlePOST));
