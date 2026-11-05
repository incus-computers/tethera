import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/cart/merge
 * Merges anonymous guest items into customer account cart upon authentication
 */
export async function POST(req: NextRequest) {
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
    console.error("[CART MERGE ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to merge carts." },
      { status: 500 }
    );
  }
}
