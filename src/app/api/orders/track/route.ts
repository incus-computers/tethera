import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { safeShippingUrl } from "@/lib/shipping/gateway";
import { db } from "@/lib/db";
import {
  generateGuestTrackingToken,
  verifyGuestTrackingToken,
} from "@/lib/utils/orderTracking";

export const dynamic = "force-dynamic";

/**
 * Format order details for guest presentation (scrubbing internal notes and PII)
 */
async function sanitizeOrderForTracking(order: any, items: any[]) {
  const token = generateGuestTrackingToken(order.order_number, order.customer_email);

  return {
    orderNumber: order.order_number,
    status: order.status,
    fulfillmentType: order.fulfillment_type,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    pickupCode: null, // Shared tracking capabilities never disclose pickup credentials.
    pickupStore:
      order.fulfillment_type === "click_and_collect"
        ? {
            name: "Tethera Flagship Experience Store",
            address: "Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat",
            hours: "Mon-Sat 09:00 - 18:00",
            phone: "+62 21 555 0199",
          }
        : null,
    shippingAddress: order.shipping_address
      ? {
          city: order.shipping_address.city,
          province: order.shipping_address.province,
          subdistrict: order.shipping_address.subdistrict,
          postalCode: order.shipping_address.postalCode,
        }
      : null,
    shipments:(await db.fulfillments.findMany({order_id:order.id})).map(f=>({id:f.id,carrier:f.carrier,serviceCode:f.service_code,status:f.status,waybillId:f.waybill_id||null,trackingUrl:safeShippingUrl(f.tracking_url),insuranceStatus:f.package_snapshot?.insurance_status||null})),
    courierInfo: order.courier_info
      ? {
          provider: order.courier_info.provider,
          courierCompany: order.courier_info.courier_company,
          serviceName: order.courier_info.service_name,
          waybillId: order.courier_info.waybill_id,
          trackingId: order.courier_info.tracking_id,
          trackingUrl: order.courier_info.tracking_url,
          status: order.courier_info.status,
          driverName: order.courier_info.driver_name,
          vehiclePlate: order.courier_info.vehicle_plate,
          estimatedArrival: order.courier_info.estimated_arrival,
          statusHistory: order.courier_info.status_history || [],
        }
      : null,
    items: items.map((it: any) => ({
      name:
        it.product?.name ||
        (it.is_custom_build
          ? "Custom PC Build"
          : `Hardware Component (${it.product_id || it.id})`),
      sku: it.product?.sku,
      quantity: it.quantity,
      unitPrice: it.unit_price,
      totalPrice: it.quantity * it.unit_price,
      isCustomBuild: it.is_custom_build,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shipping_fee,
    total: order.total,
    trackingToken: token,
  };
}

/**
 * GET /api/orders/track?token=...
 * Tracks order using cryptographic signed token
 */
async function handleGET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Tracking token is required." },
        { status: 400 }
      );
    }

    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: "Invalid token format." },
        { status: 400 }
      );
    }

    const orderNumber = parts[0];
    const order = await db.orders.findByOrderNumber(orderNumber);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const isValidToken = verifyGuestTrackingToken(
      token,
      order.order_number,
      order.customer_email
    );

    if (!isValidToken) {
      return NextResponse.json(
        { error: "Invalid or expired tracking token." },
        { status: 401 }
      );
    }

    const { items } = await db.orders.getOrderWithItems(order.id);
    const trackingData = await sanitizeOrderForTracking(order, items);

    return NextResponse.json({
      success: true,
      order: trackingData,
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { error: "Failed to retrieve order tracking information." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/track
 * Tracks order using Order Number and Email verification
 */
async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber, email } = body;

    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: "Order number and customer email are required." },
        { status: 400 }
      );
    }

    const order = await db.orders.findByOrderNumber(orderNumber.trim().toUpperCase());

    if (!order) {
      return NextResponse.json(
        { error: "Order not found with the provided details." },
        { status: 404 }
      );
    }

    if (
      order.customer_email.trim().toLowerCase() !== email.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Email address does not match this order record." },
        { status: 401 }
      );
    }

    const { items } = await db.orders.getOrderWithItems(order.id);
    const trackingData = await sanitizeOrderForTracking(order, items);

    return NextResponse.json({
      success: true,
      order: trackingData,
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { error: "Failed to verify order details." },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(withAccess(handleGET));
export const POST = withApiProtection(withAccess(handlePOST));
