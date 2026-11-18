import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { isDemoMode } from "@/lib/runtime/environment";
import { demoTransaction } from "@/lib/inventory/demoTransaction";
import { shippingOperations } from "@/lib/shipping/dispatch";
import { applyShipment,reconcileShipment } from "@/lib/shipping/dispatch";
import { quoteParcel,bookParcel } from "@/lib/shipping/parcels";
import { shipmentEvidence } from "@/lib/shipping/gateway";
import { ShippingError } from "@/lib/shipping/gateway";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { db,BaseRepository } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/fulfillments?orderId=...
 * Lists fulfillments and line-item allocations for an order (ADMIN-01)
 */
async function handleGET(req: NextRequest) {
  try {
    const perm = await requireAdminPermission(req, "orders:read");
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
    const operations=await shippingOperations.findMany({order_id:orderId});

    return NextResponse.json({
      success: true,
      orderId,
      fulfillments,
      operations,
    });
  } catch (error: any) {
    if(error instanceof ShippingError)return NextResponse.json({success:false,error:"Service temporarily unavailable. Please retry."},{status:error.status});
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to retrieve fulfillments." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/fulfillments
 * Creates a split or partial multi-carrier fulfillment shipment (ADMIN-01)
 */
async function handlePOST(req: NextRequest) {
  try {
    const perm = await requireAdminPermission(req, "orders:dispatch");
    if (!perm.authorized) {
      return NextResponse.json(
        { success: false, error: perm.error },
        { status: perm.status || 403 }
      );
    }

    const body = await req.json();
    if(body.action==="quote")return NextResponse.json({success:true,...await quoteParcel(body)});
    if(body.action==="book"){
      const result=await bookParcel(body,req.headers.get("Idempotency-Key")||"",perm.user!.id);
      return NextResponse.json({success:true,...result,fulfillment:await db.fulfillments.findById(result.operation!.fulfillment_id),message:result.operation!.state==="review"?"Parcel needs review; no replacement booking was created.":"Parcel booking recorded. The customer bill is unchanged."});
    }
    if(body.action==="reconcile" || body.action==="simulate"){
      const operation=typeof body.operationId==="string"?await shippingOperations.findById(body.operationId):null;
      if(!operation||operation.order_id!==body.orderId)throw new ShippingError("Parcel operation not found.",404);
      if(body.action==="simulate"&&!isDemoMode())throw new ShippingError("Simulation is available only in demo.",403);
      const result=body.action==="reconcile"?await reconcileShipment(operation,body.biteshipOrderId):await applyShipment(operation,shipmentEvidence({success:true,id:operation.provider_id,reference_id:operation.reference_id,status:body.status,courier:{waybill_id:operation.evidence?.waybill_id,insurance:{amount:operation.request.courier_insurance??0,fee:operation.request._quote?.insuranceFee??0}}},operation.reference_id,operation.provider_id||undefined));
      return NextResponse.json({success:true,...result});
    }
    if(body.action)throw new ShippingError("Unsupported parcel action.",400);
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

    if(!isDemoMode())throw new ShippingError("Live split/manual shipping needs its audited allocation workflow. Use whole-order courier dispatch.",409);
    const result = await demoTransaction(async()=>{
      const fresh=await db.orders.findById(orderId);
      if(!fresh?.paid_at || fresh.fulfillment_type!=="delivery" || ["cancelled","refunded","finished","collected"].includes(fresh.status))throw new ShippingError("Paid delivery order required for fulfillment.",409);
      if((await new BaseRepository<any>("refund_operations").findMany({order_id:orderId})).length||(await new BaseRepository<any>("return_receipts").findMany({order_id:orderId})).length)throw new ShippingError("Refund/return requires fulfillment review.",409);
      if((await shippingOperations.findMany({order_id:orderId})).length)throw new ShippingError("A courier operation already owns these allocations.",409);
      const lines=(await db.orders.getOrderWithItems(orderId)).items,prior=await db.fulfillments.getFulfillmentsByOrder(orderId),used=new Map<string,number>();
      for(const p of prior)for(const line of p.items)used.set(line.order_item_id,(used.get(line.order_item_id)||0)+line.quantity);
      for(const item of items){const line=lines.find(l=>l.id===item.orderItemId);if(!line||!line.product_id||!Number.isInteger(item.quantity)||item.quantity<1)throw new ShippingError("Invalid fulfillment allocation.",400);const count=(used.get(item.orderItemId)||0)+item.quantity;if(count>line.quantity)throw new ShippingError("Fulfillment exceeds ordered quantity.",409);used.set(item.orderItemId,count);}
      return db.fulfillments.createSplitFulfillment(orderId, {
      carrier,
      serviceCode: serviceCode || "standard",
      waybillId: waybillId || null,
      trackingUrl: trackingUrl || null,
      dispatchedBy: perm.user?.name || "Staff Admin",
      notes: notes || null,
      items,
    });
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
    if(error instanceof ShippingError)return NextResponse.json({success:false,error:"Service temporarily unavailable. Please retry."},{status:error.status});
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to create fulfillment." },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(withAccess(handleGET));
export const POST = withApiProtection(withAccess(handlePOST));
