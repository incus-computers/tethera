import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/wishlist/merge
 * Merges anonymous guest items into customer account wishlist upon authentication
 */
async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionToken, userId } = body;

    if (!sessionToken || !userId) {
      return NextResponse.json(
        { success: false, error: "sessionToken and userId are required for wishlist merging." },
        { status: 400 }
      );
    }

    const mergedItems = await db.wishlist.mergeSessionWishlist(sessionToken, userId);

    return NextResponse.json({
      success: true,
      message: "Guest wishlist successfully merged into user account.",
      items: mergedItems,
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to merge wishlists." },
      { status: 500 }
    );
  }
}

export const POST = withApiProtection(withAccess(handlePOST));
