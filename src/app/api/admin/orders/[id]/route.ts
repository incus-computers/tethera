import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function handleGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const perm = await requireAdminPermission(req, "orders:read");
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
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json({ success: false, error: "Service temporarily unavailable. Please retry." }, { status: 500 });
  }
}

async function handlePUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const perm = await requireAdminPermission(req, "orders:write");
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

    const guardedOrder=await db.orders.findById(orderId);
    if (!guardedOrder) return NextResponse.json({success:false,error:"Order not found."},{status:404});
    if(nextStatus === "refunded" || nextStatus === "payment_received") return NextResponse.json({success:false,error:"Use the verified payment/refund workflow."},{status:409});
    if(nextStatus && nextStatus !== guardedOrder.status && ["cancelled","refunded"].includes(guardedOrder.status)) return NextResponse.json({success:false,error:"Terminal orders cannot be reopened."},{status:409});
    if(guardedOrder.fulfillment_type==="delivery" && nextStatus && nextStatus!==guardedOrder.status && ["dispatched","on_delivery","delivery_arrived","delivered","shipped","partially_fulfilled","finished"].includes(nextStatus))return NextResponse.json({success:false,error:"Use verified shipment updates for shipping progress."},{status:409});
    if(guardedOrder.fulfillment_type==="delivery" && [waybill_id,tracking_number,courier_provider,courier_service_code].some(value=>value!==undefined)) return NextResponse.json({success:false,error:"Use the verified shipment workflow for courier details."},{status:409});
    if(nextStatus === "cancelled") {
      const cancelled=await db.orders.cancelOrder(orderId,notes || "Cancelled by staff.");
      if(!cancelled.success)return NextResponse.json({success:false,error:cancelled.error},{status:409});
    } else if(nextStatus && !["order_received","pending_payment"].includes(nextStatus) && !guardedOrder.paid_at) return NextResponse.json({success:false,error:"Payment is required before fulfillment."},{status:409});
    if(["pending_payment","order_received"].includes(nextStatus) && guardedOrder.paid_at)return NextResponse.json({success:false,error:"Paid state cannot regress."},{status:409});

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (nextStatus && nextStatus !== "cancelled") updatePayload.status = nextStatus;
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
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json({ success: false, error: "Service temporarily unavailable. Please retry." }, { status: 500 });
  }
}

async function handlePATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return PUT(req, context);
}

export const GET = withApiProtection(withAccess(handleGET));
export const PUT = withApiProtection(withAccess(handlePUT));
export const PATCH = withApiProtection(withAccess(handlePATCH));
