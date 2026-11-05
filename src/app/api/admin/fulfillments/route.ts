import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/fulfillments?orderId=...
 * Lists fulfillments and line-item allocations for an order (ADMIN-01)
 */
export async function GET(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "orders:read");
    if (!perm.authorized) {
      return NextResponse.json(
        { success: false, error: perm.error },
        { status: perm.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId query parameter is required." },
        { status: 400 }
      );
    }

    const fulfillments = await db.fulfillments.getFulfillmentsByOrder(orderId);

    return NextResponse.json({
      success: true,
      orderId,
      fulfillments,
    });
  } catch (error: any) {
    console.error("[ADMIN FULFILLMENTS GET ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve fulfillments." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/fulfillments
 * Creates a split or partial multi-carrier fulfillment shipment (ADMIN-01)
 */
export async function POST(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "orders:dispatch");
    if (!perm.authorized) {
      return NextResponse.json(
        { success: false, error: perm.error },
        { status: perm.status || 403 }
      );
    }

    const body = await req.json();
    const {
      orderId,
      carrier,
      serviceCode,
      waybillId,
      trackingUrl,
      items,
      notes,
    } = body;

    if (!orderId || !carrier || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "orderId, carrier, and items array with quantities are required." },
        { status: 400 }
      );
    }

    const order = await db.orders.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const result = await db.fulfillments.createSplitFulfillment(orderId, {
      carrier,
      serviceCode: serviceCode || "standard",
      waybillId: waybillId || null,
      trackingUrl: trackingUrl || null,
      dispatchedBy: perm.user?.name || "Staff Admin",
      notes: notes || null,
      items,
    });

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "FULFILLMENT_CREATED",
      entity_type: "fulfillment",
      entity_id: result.fulfillment.id,
      before_state: { orderStatus: order.status },
      after_state: {
        fulfillmentNumber: result.fulfillment.fulfillment_number,
        carrier,
        waybillId,
        itemsCount: items.length,
        nextOrderStatus: "shipped",
      },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Fulfillment shipment '${result.fulfillment.fulfillment_number}' created.`,
      fulfillment: result.fulfillment,
      items: result.items,
    });
  } catch (error: any) {
    console.error("[ADMIN FULFILLMENTS POST ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create fulfillment." },
      { status: 500 }
    );
  }
}
