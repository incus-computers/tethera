import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/cart/merge
 * Merges anonymous guest items into customer account cart upon authentication
 */
async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const { anonymousToken, userId } = body;

    if (!anonymousToken || !userId) {
      return NextResponse.json(
        { error: "anonymousToken and userId are required for cart merging." },
        { status: 400 }
      );
    }

    const mergedCart = await db.cart.mergeCarts(anonymousToken, userId);

    return NextResponse.json({
      success: true,
      message: "Guest cart successfully merged into user account.",
      cart: mergedCart,
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { error: "Failed to merge carts." },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(withAccess(handlePOST));
