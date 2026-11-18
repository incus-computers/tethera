import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RefundError } from "@/lib/refunds/contracts";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/rma?orderNumber=...&email=...
 * Customer checks their active return request status (CUST-05)
 */
async function handleGET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");
    const rmaNumber = searchParams.get("rmaNumber");
    const email = searchParams.get("email");

    if (!orderNumber && !rmaNumber) {
      return NextResponse.json(
        { success: false, error: "orderNumber or rmaNumber is required." },
        { status: 400 }
      );
    }

    let requests = await db.rma.getReturnRequests({
      orderId: searchParams.get("_ownedOrderId") || undefined,
      customerEmail: email || undefined,
    });

    if (rmaNumber) {
      requests = requests.filter((r) => r.rma_number === rmaNumber.trim().toUpperCase());
    }

    if (orderNumber) {
      const order = await db.orders.findByOrderNumber(orderNumber.trim().toUpperCase());
      if (order) {
        requests = requests.filter((r) => r.order_id === order.id);
      } else {
        requests = [];
      }
    }

    return NextResponse.json({
      success: true,
      count: requests.length,
      returnRequests: requests.map(r=>({id:r.id,rma_number:r.rma_number,order_id:r.order_id,status:r.status,reason:r.reason,customer_notes:r.customer_notes,requested_at:r.requested_at})),
    });
  } catch (error: any) {
    if(error instanceof RefundError)return NextResponse.json({success:false,error:"Service temporarily unavailable. Please retry."},{status:error.status});
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to retrieve return requests." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/rma
 * Customer submits a Return Merchandise Authorization (RMA) request (CUST-05)
 */
async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber, email, reason, customerNotes, photos } = body;

    if (!orderNumber || !email || !reason) {
      return NextResponse.json(
        { success: false, error: "orderNumber, email, and reason are required to submit an RMA request." },
        { status: 400 }
      );
    }

    const rma = await db.rma.createReturnRequest({
      orderNumber,
      customerEmail: email,
      reason,
      customerNotes,
      photos: Array.isArray(photos) ? photos : [],
    });

    return NextResponse.json({
      success: true,
      message: `Return request '${rma.rma_number}' submitted successfully. Our support team will inspect and review your request.`,
      returnRequest: {id:rma.id,rma_number:rma.rma_number,order_id:rma.order_id,status:rma.status,reason:rma.reason,customer_notes:rma.customer_notes,requested_at:rma.requested_at},
    });
  } catch (error: any) {
    if(error instanceof RefundError)return NextResponse.json({success:false,error:"Service temporarily unavailable. Please retry."},{status:error.status});
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to submit return request." },
      { status: 400 }
    );
  }
}

export const GET = withApiProtection(withAccess(handleGET));
export const POST = withApiProtection(withAccess(handlePOST));
