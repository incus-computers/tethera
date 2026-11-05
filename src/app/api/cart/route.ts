import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const CART_COOKIE_NAME = "tethera_cart_token";

/**
 * Extracts anonymous session token or user ID from cookies or headers
 */
function resolveCartSession(req: NextRequest): {
  anonymousToken: string;
  isNewToken: boolean;
  userId?: string | null;
} {
  const cookieToken = req.cookies.get(CART_COOKIE_NAME)?.value;
  const headerToken = req.headers.get("x-cart-token");
  const authHeader = req.headers.get("authorization");

  let userId: string | null = null;
  // If bearer token has user id or similar auth simulation
  if (authHeader?.startsWith("Bearer usr_")) {
    userId = authHeader.replace("Bearer ", "").trim();
  }

  const existingToken = cookieToken || headerToken;
  if (existingToken) {
    return { anonymousToken: existingToken, isNewToken: false, userId };
  }

  const newToken = `gst_${crypto.randomUUID()}`;
  return { anonymousToken: newToken, isNewToken: true, userId };
}

/**
 * GET /api/cart
 * Hydrates cart with live product prices, SKU variants, and inventory stock availability
 */
export async function GET(req: NextRequest) {
  try {
    const { anonymousToken, isNewToken, userId } = resolveCartSession(req);

    const cart = await db.cart.getOrCreateCart({
      userId,
      anonymousToken,
    });

    const hydrated = await db.cart.getCartWithItems(cart.id);

    const response = NextResponse.json({
      success: true,
      cart: hydrated,
      anonymousToken,
    });

    if (isNewToken) {
      response.cookies.set(CART_COOKIE_NAME, anonymousToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("[CART GET ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load cart" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart
 * Adds an item or updates quantity in the persistent session cart
 */
export async function POST(req: NextRequest) {
  try {
    const { anonymousToken, isNewToken, userId } = resolveCartSession(req);
    const body = await req.json();

    const { productId, variantId, customBuildId, quantity = 1, cartItemId } = body;

    const cart = await db.cart.getOrCreateCart({
      userId,
      anonymousToken,
    });

    if (cartItemId && quantity !== undefined) {
      // Update specific item quantity
      await db.cart.updateQuantity(cart.id, cartItemId, Number(quantity));
    } else if (productId || customBuildId) {
      // Add or increment item
      await db.cart.addItem(cart.id, {
        productId,
        variantId,
        customBuildId,
        quantity: Number(quantity),
      });
    } else {
      return NextResponse.json(
        { error: "productId, customBuildId, or cartItemId is required" },
        { status: 400 }
      );
    }

    const hydrated = await db.cart.getCartWithItems(cart.id);

    const response = NextResponse.json({
      success: true,
      cart: hydrated,
      anonymousToken,
    });

    if (isNewToken) {
      response.cookies.set(CART_COOKIE_NAME, anonymousToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("[CART POST ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update cart" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart
 * Removes an item or clears the entire cart
 */
export async function DELETE(req: NextRequest) {
  try {
    const { anonymousToken, userId } = resolveCartSession(req);
    const body = await req.json().catch(() => ({}));
    const cartItemId = body.cartItemId || req.nextUrl.searchParams.get("cartItemId");
    const isClear = body.clear === true || req.nextUrl.searchParams.get("clear") === "true";

    const cart = await db.cart.getOrCreateCart({
      userId,
      anonymousToken,
    });

    if (isClear) {
      await db.cart.clearCart(cart.id);
    } else if (cartItemId) {
      await db.cart.removeItem(cart.id, cartItemId);
    } else {
      return NextResponse.json(
        { error: "cartItemId or clear=true is required" },
        { status: 400 }
      );
    }

    const hydrated = await db.cart.getCartWithItems(cart.id);

    return NextResponse.json({
      success: true,
      cart: hydrated,
    });
  } catch (error: any) {
    console.error("[CART DELETE ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove cart item" },
      { status: 500 }
    );
  }
}
