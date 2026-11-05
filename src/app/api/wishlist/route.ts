import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const WISHLIST_COOKIE_NAME = "tethera_wishlist_token";

function resolveWishlistSession(req: NextRequest, explicitToken?: string, explicitUser?: string): {
  sessionToken: string;
  isNewToken: boolean;
  userId?: string | null;
} {
  const cookieToken = req.cookies.get(WISHLIST_COOKIE_NAME)?.value;
  const headerToken = req.headers.get("x-wishlist-token") || req.headers.get("x-session-token");
  const queryToken = req.nextUrl.searchParams.get("sessionToken");
  const queryUser = req.nextUrl.searchParams.get("userId");
  const authHeader = req.headers.get("authorization");

  let userId: string | null = explicitUser || queryUser || null;
  if (!userId && authHeader?.startsWith("Bearer usr_")) {
    userId = authHeader.replace("Bearer ", "").trim();
  }

  const existingToken = explicitToken || queryToken || cookieToken || headerToken;
  if (existingToken) {
    return { sessionToken: existingToken, isNewToken: false, userId };
  }

  const newToken = `wsh_${crypto.randomUUID()}`;
  return { sessionToken: newToken, isNewToken: true, userId };
}

/**
 * GET /api/wishlist
 * Returns customer or session wishlist hydrated with live product pricing, specs, and stock
 */
export async function GET(req: NextRequest) {
  try {
    const { sessionToken, isNewToken, userId } = resolveWishlistSession(req);

    const rawItems = await db.wishlist.getWishlist({ userId, sessionToken });

    // Hydrate items with live product catalog and stock information
    const hydratedItems = await Promise.all(
      rawItems.map(async (item) => {
        const product = await db.products.findById(item.product_id);
        const inventory = product ? await db.inventory.getByProductAndStore(product.id) : null;

        const stockCount = inventory
          ? Math.max(0, inventory.stock_on_hand - inventory.stock_reserved)
          : 10;
        const inStock = inventory ? stockCount > 0 : true;

        return {
          ...item,
          product: product
            ? {
                ...product,
                stockCount,
                inStock,
              }
            : null,
        };
      })
    );

    const validHydratedItems = hydratedItems.filter((i) => i.product !== null);

    const response = NextResponse.json({
      success: true,
      items: validHydratedItems,
      sessionToken,
    });

    if (isNewToken) {
      response.cookies.set(WISHLIST_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("[WISHLIST GET ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load wishlist." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wishlist
 * Adds an item to the user or anonymous session wishlist
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productId, sessionToken: explicitToken, userId: explicitUser } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required." },
        { status: 400 }
      );
    }

    const { sessionToken, isNewToken, userId } = resolveWishlistSession(
      req,
      explicitToken,
      explicitUser
    );

    const item = await db.wishlist.addItem({ userId, sessionToken }, productId);

    const response = NextResponse.json({
      success: true,
      item,
      sessionToken,
    });

    if (isNewToken) {
      response.cookies.set(WISHLIST_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("[WISHLIST POST ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add item to wishlist." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wishlist
 * Removes an item from the user or session wishlist
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const productId = body.productId || req.nextUrl.searchParams.get("productId");
    const explicitToken = body.sessionToken || req.nextUrl.searchParams.get("sessionToken");
    const explicitUser = body.userId || req.nextUrl.searchParams.get("userId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required." },
        { status: 400 }
      );
    }

    const { sessionToken, userId } = resolveWishlistSession(
      req,
      explicitToken,
      explicitUser
    );

    const removed = await db.wishlist.removeItem({ userId, sessionToken }, productId);

    return NextResponse.json({
      success: true,
      removed,
    });
  } catch (error: any) {
    console.error("[WISHLIST DELETE ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove item from wishlist." },
      { status: 500 }
    );
  }
}
