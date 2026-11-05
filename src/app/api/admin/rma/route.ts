import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/rma
 * Retrieves customer RMA return requests for staff review (ADMIN-02)
 */
export async function GET(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "refunds:read");
    if (!perm.authorized) {
      return NextResponse.json(
        { success: false, error: perm.error },
        { status: perm.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId") || undefined;
    const status = searchParams.get("status") as any || undefined;

    const returnRequests = await db.rma.getReturnRequests({ orderId, status });

    return NextResponse.json({
      success: true,
      count: returnRequests.length,
      returnRequests,
    });
  } catch (error: any) {
    console.error("[ADMIN RMA GET ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve RMA requests." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/rma
 * Updates RMA status (approved, item_received, inspected, rejected, completed) (ADMIN-02)
 */
export async function PUT(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "refunds:write");
    if (!perm.authorized) {
      return NextResponse.json(
        { success: false, error: perm.error },
        { status: perm.status || 403 }
      );
    }

    const body = await req.json();
    const { rmaId, status, adminNotes } = body;

    if (!rmaId || !status) {
      return NextResponse.json(
        { success: false, error: "rmaId and status are required." },
        { status: 400 }
      );
    }

    const updated = await db.rma.updateRmaStatus(rmaId, {
      status,
      adminNotes,
      handledBy: perm.user?.name || "Staff Admin",
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "RMA record not found." },
        { status: 404 }
      );
    }

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "RMA_STATUS_UPDATED",
      entity_type: "rma",
      entity_id: rmaId,
      before_state: null,
      after_state: { status, adminNotes },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `RMA request '${updated.rma_number}' transitioned to '${status}'.`,
      returnRequest: updated,
    });
  } catch (error: any) {
    console.error("[ADMIN RMA PUT ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update RMA record." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rma
 * Issues financial refund with optional hardware inventory restocking (ADMIN-02)
 */
export async function POST(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "refunds:write");
    if (!perm.authorized) {
      return NextResponse.json(
        { success: false, error: perm.error },
        { status: perm.status || 403 }
      );
    }

    const body = await req.json();
    const {
      orderId,
      returnRequestId,
      amount,
      reason,
      restockInventory = true,
    } = body;

    if (!orderId || !reason) {
      return NextResponse.json(
        { success: false, error: "orderId and reason are required for refund processing." },
        { status: 400 }
      );
    }

    const result = await db.rma.processRefund({
      orderId,
      returnRequestId,
      amount,
      reason,
      restockInventory: Boolean(restockInventory),
      processedBy: perm.user?.name || "Staff Admin",
    });

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "REFUND_PROCESSED",
      entity_type: "refund",
      entity_id: result.refund.id,
      before_state: { orderId },
      after_state: {
        refundNumber: result.refund.refund_number,
        amount: result.refund.amount,
        restockInventory: result.refund.restock_inventory,
        newOrderStatus: result.orderStatus,
      },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Refund #${result.refund.refund_number} of Rp ${result.refund.amount.toLocaleString("id-ID")} processed successfully.`,
      refund: result.refund,
      orderStatus: result.orderStatus,
    });
  } catch (error: any) {
    console.error("[ADMIN REFUND POST ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process refund." },
      { status: 500 }
    );
  }
}
