import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest, NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { db } from "@/lib/db";
import { GatewayError } from "@/lib/payment/gateway";
import { RefundError } from "@/lib/refunds/contracts";
import { createReturn, issueRefund, receiveReturn, reconcileRefund, refundOperations, returnReceipts, returnReceiptItems, transitionReturn } from "@/lib/refunds/service";
export const dynamic = "force-dynamic";
function failure(error: unknown) {
  return databaseFailureResponse(error) || NextResponse.json({success: false, error: error instanceof RefundError || error instanceof GatewayError ? error.message : "Return/refund processing is unavailable. Keep the same request key when retrying."},
    {status: error instanceof RefundError || error instanceof GatewayError ? error.status : 503});
}
async function handleGET(req: NextRequest) {
  try {
    const access = await requireAdminPermission(req, "refunds:read");
    if (!access.authorized) return NextResponse.json({success: false, error: access.error}, {status: access.status || 403});
    const orderId = req.nextUrl.searchParams.get("orderId") || undefined;
    const returnRequests = await db.rma.getReturnRequests({orderId, status: req.nextUrl.searchParams.get("status") as any || undefined});
    const operations = await refundOperations.findMany(orderId ? {order_id: orderId} : undefined, {limit: 100, orderBy: "updated_at", orderDirection: "desc"});
    const receipts = await returnReceipts.findMany(orderId ? {order_id: orderId} : undefined, {limit: 100});
    const receiptItems = (await Promise.all(receipts.map(receipt => returnReceiptItems.findMany({receipt_id: receipt.id})))).flat();
    return NextResponse.json({success: true, count: returnRequests.length, returnRequests, operations, receipts, receiptItems});
  } catch (error) { return failure(error); }
}
async function handlePUT(req: NextRequest) {
  try {
    const access = await requireAdminPermission(req, "refunds:write");
    if (!access.authorized) return NextResponse.json({success: false, error: access.error}, {status: access.status || 403});
    const body = await req.json();
    if (typeof body.rmaId !== "string" || typeof body.status !== "string") throw new RefundError("Return ID and status are required.", 400);
    const updated = await transitionReturn(body.rmaId, body.status as any, body.adminNotes, access.user!.id);
    return NextResponse.json({success: true, returnRequest: updated, message: "Return case updated. This does not move money or restock inventory."});
  } catch (error) { return failure(error); }
}
async function handlePOST(req: NextRequest) {
  try {
    const access = await requireAdminPermission(req, "refunds:write");
    if (!access.authorized) return NextResponse.json({success: false, error: access.error}, {status: access.status || 403});
    const body = await req.json(), actor = access.user!.id;
    if (body.action === "receive_items") {
      const result = await receiveReturn({...body, requestKey: req.headers.get("Idempotency-Key")}, actor);
      return NextResponse.json({success: true, ...result, message: "Inspected return quantities recorded. No refund was issued."});
    }
    if (body.action === "create_return") {
      const result = await createReturn(body.orderId, body.reason, body.customerNotes);
      return NextResponse.json({success: true, returnRequest: result});
    }
    let result;
    if (body.action === "reconcile") {
      const operation = typeof body.operationId === "string" ? await refundOperations.findById(body.operationId) : null;
      if (!operation || (body.orderId && operation.order_id !== body.orderId)) throw new RefundError("Refund operation not found.", 404);
      result = await reconcileRefund(operation);
    } else {
      if (body.action && body.action !== "refund") throw new RefundError("Unsupported refund action.", 400);
      result = await issueRefund({...body, requestKey: req.headers.get("Idempotency-Key")}, actor);
    }
    return NextResponse.json({success: true, ...result, message: result.pending ? "Refund is awaiting provider confirmation or review. Keep this operation; do not issue another." : "Refund confirmed. Inventory is unchanged."});
  } catch (error) { return failure(error); }
}
export const GET = withApiProtection(withAccess(handleGET));
export const PUT = withApiProtection(withAccess(handlePUT));
export const POST = withApiProtection(withAccess(handlePOST));
