import { NextRequest, NextResponse } from "next/server";
import { db, CourierDispatchInfo } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { biteship, TETHERA_WAREHOUSE_ORIGIN, COURIER_META } from "@/lib/shipping/biteship";

export const dynamic = "force-dynamic";

// Sample driver roster for on-demand & scheduled courier pickup
const COURIER_DRIVERS: Record<string, Array<{ name: string; phone: string; plate: string }>> = {
  jne: [
    { name: "Wahyu Pratama (JNE Kurir)", phone: "+62 812-4455-8899", plate: "B 1984 JNE" },
    { name: "Ahmad Subagyo (JNE Express)", phone: "+62 813-2233-4455", plate: "B 2031 JNE" },
  ],
  jnt: [
    { name: "Rizky Firmansyah (J&T Sprinter)", phone: "+62 818-7788-9900", plate: "B 3821 JNT" },
    { name: "Bambang Tri (J&T Sprinter)", phone: "+62 819-3344-1122", plate: "B 4912 JNT" },
  ],
  sicepat: [
    { name: "Deni Ramadhan (SiCepat SIGESIT)", phone: "+62 856-7788-1122", plate: "B 5183 SCP" },
    { name: "Hendra Wijaya (SiCepat SIGESIT)", phone: "+62 857-1122-3344", plate: "B 6124 SCP" },
  ],
  anteraja: [
    { name: "Gilang Pratama (AnterAja SATRIA)", phone: "+62 878-9900-1122", plate: "B 7235 ANR" },
  ],
  gojek: [
    { name: "Agus Setiawan (GoSend Driver)", phone: "+62 812-4455-6677", plate: "B 3821 TKD" },
    { name: "Bayu Pratama (GoSend Driver)", phone: "+62 813-8899-0011", plate: "B 4912 VBN" },
  ],
  grab: [
    { name: "Surya Dharma (GrabExpress)", phone: "+62 878-5566-7788", plate: "B 8346 TYU" },
    { name: "Rian Hidayat (GrabExpress)", phone: "+62 819-3344-5566", plate: "B 7235 XCV" },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "orders:dispatch");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 403 });
    }

    const body = await req.json();
    const {
      orderId,
      courierProvider = "jne",
      serviceCode = "jne-reg",
      serviceName,
      deliveryType = "now", // "now" | "scheduled"
      deliveryDate,
      deliveryTime,
      action,
      simulatedStatus,
    } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    }

    const order = await db.orders.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    // =========================================================================
    // ACTION A: SIMULATE BITESHIP WEBHOOK STATUS TRANSITION / COURIER FAILURE
    // =========================================================================
    if (action === "simulate_failure" || action === "simulate_rejection") {
      const existingCourier: CourierDispatchInfo = order.courier_info || {
        provider: "biteship",
        courier_company: courierProvider,
        service_code: serviceCode,
        service_name: serviceName || "Biteship Logistics",
        waybill_id: (order as any).waybill_id || "N/A",
        tracking_id: `TRK-${Date.now()}`,
        dispatched_at: new Date().toISOString(),
        status: "failed",
        status_history: [],
      };

      const history = existingCourier.status_history || [];
      history.push({
        status: "failed",
        note: "Courier pickup rejected or driver unavailable. Re-dispatch option unlocked.",
        updated_at: new Date().toISOString(),
      });

      const updatedCourierInfo: CourierDispatchInfo = {
        ...existingCourier,
        status: "failed" as any,
        status_history: history,
      };

      const updated = await db.orders.updateStage(orderId, "courier_failed", updatedCourierInfo);

      return NextResponse.json({
        success: true,
        message: `Courier assignment cancelled / driver rejected for Order #${order.order_number}. Re-dispatch is now unlocked.`,
        order: updated,
      });
    }

    if (action === "simulate_webhook" || action === "simulate_arrival") {
      const targetStatus = action === "simulate_arrival" ? "delivered" : simulatedStatus || "in_transit";
      const existingCourier: CourierDispatchInfo = order.courier_info || {
        provider: "biteship",
        courier_company: courierProvider,
        service_code: serviceCode,
        service_name: serviceName || "Biteship Logistics",
        waybill_id: `BIT-${courierProvider.toUpperCase()}-${Date.now().toString().slice(-8)}`,
        tracking_id: `TRK-${Date.now()}`,
        dispatched_at: new Date().toISOString(),
        status: "dispatched",
        status_history: [],
      };

      const history = existingCourier.status_history || [];
      history.push({
        status: targetStatus,
        note: `Status updated to ${targetStatus} via Biteship webhook simulation.`,
        updated_at: new Date().toISOString(),
      });

      const updatedCourierInfo: CourierDispatchInfo = {
        ...existingCourier,
        status: targetStatus === "delivered" ? "delivered" : (targetStatus as any),
        delivered_at: targetStatus === "delivered" ? new Date().toISOString() : existingCourier.delivered_at,
        status_history: history,
      };

      const nextDbStatus = targetStatus === "delivered" ? "delivery_arrived" : "on_delivery";
      const updated = await db.orders.updateStage(orderId, nextDbStatus, updatedCourierInfo);

      return NextResponse.json({
        success: true,
        message: `Order #${order.order_number} transitioned to status '${targetStatus}' (Biteship Webhook processed).`,
        order: updated,
      });
    }

    // =========================================================================
    // ACTION B: CREATE BITESHIP SHIPMENT, GENERATE WAYBILL, SCHEDULE PICKUP
    // =========================================================================
    const courierCode = courierProvider.toLowerCase();
    const meta = COURIER_META[courierCode] || {
      name: courierCode.toUpperCase(),
      brandColor: "#003399",
      brandBg: "bg-blue-50 text-blue-800",
      badge: "Partner",
      category: "regular",
    };

    const shippingAddress = order.shipping_address || {
      street: "Jl. Sudirman No. 45",
      subdistrict: "Karet Tengsin",
      city: "Jakarta Pusat",
      province: "DKI Jakarta",
      postalCode: "10220",
    };

    // 1. Call Biteship API service to create order, generate Waybill and schedule pickup
    const biteshipResult = await biteship.createOrderAndSchedulePickup({
      orderNumber: order.order_number,
      courierCompany: courierCode,
      courierType: serviceCode.replace(`${courierCode}-`, ""),
      destinationName: order.customer_name,
      destinationPhone: order.customer_phone,
      destinationEmail: order.customer_email,
      destinationAddress: `${shippingAddress.street}, ${shippingAddress.subdistrict || ""}, ${shippingAddress.city}`,
      destinationPostalCode: shippingAddress.postalCode,
      destinationNote: (shippingAddress as any).deliveryNotes || "Fragile PC Electronics",
      items: [
        {
          id: order.id,
          name: `Order #${order.order_number} Package`,
          price: order.total,
          weightGrams: 2500,
        },
      ],
      deliveryType: deliveryType as "now" | "scheduled",
      deliveryDate,
      deliveryTime,
      orderNote: `Pickup from Tethera Shop Mangga Dua Hub for #${order.order_number}`,
    });

    // Pick assignable driver from roster
    const driverRoster = COURIER_DRIVERS[courierCode] || COURIER_DRIVERS.jne;
    const driver = driverRoster[Math.floor(Math.random() * driverRoster.length)];

    const courierInfo: CourierDispatchInfo = {
      provider: "biteship",
      courier_company: courierCode,
      service_code: serviceCode,
      service_name: serviceName || `${meta.name} (${serviceCode.toUpperCase()})`,
      waybill_id: biteshipResult.waybillId, // Official courier AWB (Waybill)
      tracking_id: biteshipResult.trackingId,
      biteship_order_id: biteshipResult.biteshipOrderId,
      tracking_url: biteshipResult.trackingUrl,
      driver_name: driver.name,
      driver_phone: driver.phone,
      vehicle_plate: driver.plate,
      collection_method: "pickup",
      pickup_scheduled_time: biteshipResult.pickupTime,
      pickup_address: TETHERA_WAREHOUSE_ORIGIN.address,
      dispatched_at: new Date().toISOString(),
      estimated_arrival: courierCode === "gojek" || courierCode === "grab" ? "1 - 2 Hours" : "1 - 2 Days",
      status: "dispatched",
      status_history: [
        {
          status: "dispatched",
          note: `Courier found and assigned via Biteship. Waybill ${biteshipResult.waybillId} generated. Automated pickup scheduled from Mangga Dua Flagship Hub.`,
          updated_at: new Date().toISOString(),
        },
      ],
    };

    // Transition order state in DB automatically to Dispatched
    const nextOrderStatus = "dispatched";
    const updated = await db.orders.updateStage(orderId, nextOrderStatus, courierInfo);

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "ORDER_DISPATCHED",
      entity_type: "order",
      entity_id: orderId,
      before_state: { status: order.status },
      after_state: {
        status: nextOrderStatus,
        waybill_id: biteshipResult.waybillId,
        courier: meta.name,
        service: serviceName,
      },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Courier found! Waybill #${biteshipResult.waybillId} assigned via ${meta.name}. Order automatically progressed to Dispatched.`,
      order: updated,
      waybillId: biteshipResult.waybillId,
      trackingUrl: biteshipResult.trackingUrl,
      pickupTime: biteshipResult.pickupTime,
    });
  } catch (error: any) {
    console.error("[ADMIN COURIER DISPATCH ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
