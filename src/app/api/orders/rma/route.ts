import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/rma?orderNumber=...&email=...
 * Customer checks their active return request status (CUST-05)
 */
export async function GET(req: NextRequest) {
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
      returnRequests: requests,
    });
  } catch (error: any) {
    console.error("[CUSTOMER RMA GET ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve return requests." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/rma
 * Customer submits a Return Merchandise Authorization (RMA) request (CUST-05)
 */
export async function POST(req: NextRequest) {
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
      returnRequest: rma,
    });
  } catch (error: any) {
    console.error("[CUSTOMER RMA POST ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit return request." },
      { status: 400 }
    );
  }
}
