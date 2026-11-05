import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/wishlist/merge
 * Merges anonymous guest items into customer account wishlist upon authentication
 */
export async function POST(req: NextRequest) {
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
    console.error("[WISHLIST MERGE ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to merge wishlists." },
      { status: 500 }
    );
  }
}
