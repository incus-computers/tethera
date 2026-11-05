import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const perm = requireAdminPermission(req, "orders:read");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 401 });
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    const order = await db.orders.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const { items } = await db.orders.getOrderWithItems(order.id);
    const enrichedItems = await Promise.all(
      items.map(async (it) => {
        const product = it.product_id ? await db.products.findById(it.product_id) : null;
        return {
          ...it,
          product: product
            ? {
                id: product.id,
                name: product.name,
                sku: product.sku,
                brand: product.brand,
                images: product.images,
                retail_price: product.retail_price,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items: enrichedItems,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN SINGLE ORDER GET ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const perm = requireAdminPermission(req, "orders:write");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 401 });
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    const existingOrder = await db.orders.findById(orderId);
    const body = await req.json();
    const {
      nextStatus,
      notes,
      waybill_id,
      tracking_number,
      courier_provider,
      courier_service_code,
    } = body;

    const validManualTransitions: string[] = [
      "order_received",
      "order_accepted",
      "finding_stock",
      "ready_for_dispatch",
      "finding_courier",
      "dispatched",
      "finished",
      "ready_for_pickup",
      "collected",
      "shipped",
      "delivered",
      "on_delivery",
      "delivery_arrived",
      "processing",
      "pending",
      "pending_payment",
      "payment_received",
      "assembly_in_progress",
      "testing_bench",
      "cancelled",
      "refunded",
    ];

    if (nextStatus && !validManualTransitions.includes(nextStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid status transition: '${nextStatus}'` },
        { status: 400 }
      );
    }

    // Release reserved stock on cancel/refund
    if (nextStatus === "cancelled" || nextStatus === "refunded") {
      try {
        const { items } = await db.orders.getOrderWithItems(orderId);
        for (const it of items) {
          if (it.product_id) {
            const inv = await db.inventory.getByProductAndStore(it.product_id);
            if (inv && inv.stock_reserved > 0) {
              await db.inventory.update(inv.id, {
                stock_reserved: Math.max(0, inv.stock_reserved - (it.quantity || 1)),
              });
            }
          }
        }
      } catch (stockErr) {
        console.warn("[ADMIN ORDER ID] Could not release reserved stock:", stockErr);
      }
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (nextStatus) updatePayload.status = nextStatus;
    if (notes !== undefined) updatePayload.notes = notes;
    if (waybill_id !== undefined) updatePayload.waybill_id = waybill_id;
    if (tracking_number !== undefined) updatePayload.tracking_number = tracking_number;
    if (courier_provider !== undefined) updatePayload.courier_provider = courier_provider;
    if (courier_service_code !== undefined) updatePayload.courier_service_code = courier_service_code;

    const updated = await db.orders.update(orderId, updatePayload as any);

    if (!updated) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: nextStatus ? "ORDER_STATUS_CHANGED" : "ORDER_UPDATED",
      entity_type: "order",
      entity_id: orderId,
      before_state: existingOrder ? { status: existingOrder.status, notes: existingOrder.notes } : null,
      after_state: { status: updated.status, notes: updated.notes },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    const msg =
      nextStatus === "cancelled"
        ? `Order #${updated.order_number} has been cancelled.`
        : nextStatus
        ? `Order #${updated.order_number} transitioned to '${nextStatus.replace(/_/g, " ").toUpperCase()}'.`
        : `Order #${updated.order_number} updated.`;

    return NextResponse.json({
      success: true,
      message: msg,
      order: updated,
    });
  } catch (error: any) {
    console.error("[ADMIN ORDER ID PUT ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return PUT(req, context);
}
