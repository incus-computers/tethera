import { NextRequest, NextResponse } from "next/server";
import { db, CourierDispatchInfo, Order } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * ==============================================================================
 * BITESHIP LOGISTICS WEBHOOK HANDLER
 * ==============================================================================
 * Receives real-time tracking updates, waybill number allocations, and status
 * transitions from Biteship API:
 * - 'order.status' (allocated, picking_up, picked, in_transit, dropping_off, delivered)
 * - 'order.waybill_id' (courier resi / AWB number updates)
 * - 'order.price' (actual freight adjustments)
 * ==============================================================================
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = payload.event || "order.status";
    const biteshipOrderId = payload.order_id;
    const trackingId = payload.courier_tracking_id;
    const waybillId = payload.courier_waybill_id;
    const referenceId = payload.reference_id; // Tethera Order Number (e.g. TET-2026-0901)
    const newStatus = payload.status; // e.g. "allocated", "picking_up", "picked", "in_transit", "dropping_off", "delivered"

    console.log(`[BITESHIP WEBHOOK RECEIVED] Event: ${event}, Order: ${referenceId || biteshipOrderId}, Status: ${newStatus}`);

    // 1. Locate the corresponding order in the database
    const allOrders = await db.orders.findMany({});
    let targetOrder: Order | undefined;

    if (referenceId) {
      targetOrder = allOrders.find((o) => o.order_number === referenceId);
    }
    if (!targetOrder && biteshipOrderId) {
      targetOrder = allOrders.find(
        (o) => o.courier_info?.biteship_order_id === biteshipOrderId
      );
    }
    if (!targetOrder && waybillId) {
      targetOrder = allOrders.find(
        (o) => o.courier_info?.waybill_id === waybillId
      );
    }
    if (!targetOrder && trackingId) {
      targetOrder = allOrders.find(
        (o) => o.courier_info?.tracking_id === trackingId
      );
    }

    if (!targetOrder) {
      console.warn("[BITESHIP WEBHOOK] No matching Tethera order found for payload:", payload);
      // Return 200 OK so Biteship doesn't continually retry unrecognized payloads
      return NextResponse.json({
        success: true,
        warning: "Order reference not matched in local database",
        payload,
      });
    }

    // 2. Prepare updated courier info
    const existingCourier: CourierDispatchInfo = targetOrder.courier_info || {
      provider: "biteship",
      service_code: "standard",
      service_name: "Biteship Logistics",
      tracking_id: trackingId || `TRK-${Date.now()}`,
      dispatched_at: new Date().toISOString(),
      status: "dispatched",
      status_history: [],
    };

    const history = existingCourier.status_history || [];
    if (newStatus) {
      history.push({
        status: newStatus,
        note: payload.note || `Biteship status transitioned to '${newStatus}' via Webhook`,
        updated_at: new Date().toISOString(),
      });
    }

    const updatedCourierInfo: CourierDispatchInfo = {
      ...existingCourier,
      courier_company: payload.courier_company || existingCourier.courier_company,
      service_code: payload.courier_type || existingCourier.service_code,
      waybill_id: waybillId || existingCourier.waybill_id,
      tracking_id: trackingId || existingCourier.tracking_id,
      tracking_url: payload.courier_link || existingCourier.tracking_url,
      driver_name: payload.courier_driver_name || existingCourier.driver_name,
      driver_phone: payload.courier_driver_phone || existingCourier.driver_phone,
      driver_photo_url: payload.courier_driver_photo_url || existingCourier.driver_photo_url,
      vehicle_plate: payload.courier_driver_plate_number || existingCourier.vehicle_plate,
      status: newStatus || existingCourier.status,
      delivered_at: newStatus === "delivered" ? new Date().toISOString() : existingCourier.delivered_at,
      status_history: history,
    };

    // 3. Map Biteship status to Tethera OrderStatus
    let nextOrderStatus: Order["status"] = targetOrder.status;

    if (newStatus === "delivered") {
      nextOrderStatus = "delivery_arrived";
    } else if (
      newStatus === "in_transit" ||
      newStatus === "dropping_off" ||
      newStatus === "picked"
    ) {
      nextOrderStatus = "on_delivery";
    } else if (
      newStatus === "allocated" ||
      newStatus === "picking_up" ||
      newStatus === "scheduled"
    ) {
      nextOrderStatus = "on_delivery";
    } else if (newStatus === "cancelled" || newStatus === "rejected") {
      nextOrderStatus = "cancelled";
    }

    // 4. Update the order in the database
    const updatedOrder = await db.orders.updateStage(
      targetOrder.id,
      nextOrderStatus,
      updatedCourierInfo
    );

    // If order.price event, update shipping_fee
    if (event === "order.price" && payload.price) {
      const priceDiff = payload.price - targetOrder.shipping_fee;
      await db.orders.update(targetOrder.id, {
        shipping_fee: payload.price,
        total: targetOrder.total + priceDiff,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Biteship webhook event '${event}' successfully processed for Order #${targetOrder.order_number}`,
      orderId: targetOrder.id,
      orderNumber: targetOrder.order_number,
      courierStatus: newStatus,
      appStatus: nextOrderStatus,
      updatedOrder,
    });
  } catch (error: any) {
    console.error("[BITESHIP WEBHOOK ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process webhook" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/biteship
 * Health check & verification for webhook ping
 */
export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "/api/webhooks/biteship",
    service: "Biteship Logistics Webhook Listener",
    supportedEvents: ["order.status", "order.waybill_id", "order.price"],
  });
}
