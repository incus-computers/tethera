import { NextRequest, NextResponse } from "next/server";
import { db, CourierDispatchInfo } from "@/lib/db";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";
import { gojekCourierProvider } from "@/lib/shipping/couriers/gojek";
import { grabCourierProvider } from "@/lib/shipping/couriers/grab";

export const dynamic = "force-dynamic";

const MOCK_GOJEK_DRIVERS = [
  { name: "Agus Setiawan", phone: "+62 812-4455-6677", plate: "B 3821 TKD" },
  { name: "Bayu Pratama", phone: "+62 813-8899-0011", plate: "B 4912 VBN" },
  { name: "Fajar Nugraha", phone: "+62 815-6677-8899", plate: "B 5183 SIK" },
];

const MOCK_GRAB_DRIVERS = [
  { name: "Deni Saputra", phone: "+62 818-1122-3344", plate: "B 6124 KLP" },
  { name: "Rian Hidayat", phone: "+62 819-3344-5566", plate: "B 7235 XCV" },
  { name: "Surya Dharma", phone: "+62 878-5566-7788", plate: "B 8346 TYU" },
];

export async function POST(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, courierProvider = "gojek", serviceCode, action } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    }

    const order = await db.orders.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    // Action A: Simulate delivery arrival (Webhook from Gojek/Grab)
    if (action === "simulate_arrival") {
      if (order.status !== "on_delivery") {
        return NextResponse.json(
          { success: false, error: "Order must be 'on_delivery' to record arrival." },
          { status: 400 }
        );
      }

      const updatedCourierInfo: CourierDispatchInfo = {
        ...(order.courier_info || {
          provider: courierProvider,
          service_code: serviceCode || "instant",
          service_name: courierProvider === "gojek" ? "GoSend Instant" : "GrabExpress Instant",
          driver_name: "Courier Partner",
          driver_phone: "+62 812-0000-0000",
          vehicle_plate: "B 1234 ABC",
          tracking_id: `TRACK-${Date.now()}`,
          dispatched_at: new Date().toISOString(),
        }),
        status: "arrived",
        delivered_at: new Date().toISOString(),
      };

      const updated = await db.orders.updateStage(orderId, "delivery_arrived", updatedCourierInfo);

      return NextResponse.json({
        success: true,
        message: `Order #${order.order_number} has successfully arrived at destination! (Automated Delivery Webhook received)`,
        order: updated,
      });
    }

    // Action B: Dispatch Courier (Gojek / Grab) and transition to "on_delivery"
    const isGojek = courierProvider === "gojek";
    const driverList = isGojek ? MOCK_GOJEK_DRIVERS : MOCK_GRAB_DRIVERS;
    const selectedDriver = driverList[Math.floor(Math.random() * driverList.length)];

    const trackingSuffix = Math.floor(100000 + Math.random() * 900000);
    const trackingId = isGojek ? `GOSEND-JKT-${trackingSuffix}` : `GRABEX-JKT-${trackingSuffix}`;
    const serviceName = isGojek ? "GoSend Instant" : "GrabExpress Instant";

    const courierInfo: CourierDispatchInfo = {
      provider: isGojek ? "gojek" : "grab",
      service_code: serviceCode || (isGojek ? "gosend-instant" : "grabexpress-instant"),
      service_name: serviceName,
      driver_name: selectedDriver.name,
      driver_phone: selectedDriver.phone,
      vehicle_plate: selectedDriver.plate,
      tracking_id: trackingId,
      tracking_url: isGojek
        ? `https://gofleet.gojek.com/track/${trackingId}`
        : `https://express.grab.com/track/${trackingId}`,
      dispatched_at: new Date().toISOString(),
      estimated_arrival: "30 - 45 mins",
      status: "in_transit",
    };

    const updated = await db.orders.updateStage(orderId, "on_delivery", courierInfo);

    return NextResponse.json({
      success: true,
      message: `Order #${order.order_number} dispatched via ${serviceName}! Driver ${selectedDriver.name} (${selectedDriver.plate}) is on the way.`,
      order: updated,
    });
  } catch (error: any) {
    console.error("[ADMIN COURIER DISPATCH ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
