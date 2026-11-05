import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { FLAGSHIP_STORE_ID } from "@/lib/db/repositories/stores.repository";
import { Product, StoreInventory } from "@/lib/db/types";
import {
  badRequestProblem,
  unauthorizedProblem,
  forbiddenProblem,
  notFoundProblem,
  internalServerErrorProblem,
} from "@/lib/api/problemDetails";
import { safeRevalidate } from "@/lib/cache/revalidate";

export const dynamic = "force-dynamic";

const VALID_REASON_CODES = [
  "SALE",
  "RESTOCK",
  "RETURN",
  "DAMAGE",
  "MANUAL_AUDIT",
  "CANCELLED_ORDER",
] as const;

type ReasonCode = (typeof VALID_REASON_CODES)[number];

// GET: Retrieve warehouse inventory with low stock alerts and ledger trail
export async function GET(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "inventory:read");
    if (!perm.authorized) {
      return perm.status === 401
        ? unauthorizedProblem(perm.error || "Administrative authentication required.", {
            instance: req.nextUrl.pathname,
          })
        : forbiddenProblem(perm.error || "Access denied.", {
            instance: req.nextUrl.pathname,
          });
    }

    const { searchParams } = new URL(req.url);
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const productId = searchParams.get("productId");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));

    const [allProducts, allInventory, recentMovements] = await Promise.all([
      db.products.findMany({}),
      db.inventory.findMany({ store_id: FLAGSHIP_STORE_ID }),
      productId
        ? db.inventoryLedger.getMovementsByProduct(productId)
        : db.inventoryLedger.getRecentMovements(limit),
    ]);

    const productMap = new Map<string, Product>(allProducts.map((p: Product) => [p.id, p]));

    // Enrich inventory items with product catalog data
    let enrichedItems = allInventory.map((inv: StoreInventory) => {
      const prod = productMap.get(inv.product_id);
      const stockOnHand = inv.stock_on_hand || 0;
      const stockReserved = inv.stock_reserved || 0;
      const threshold = inv.low_stock_threshold ?? 2;
      return {
        id: inv.id,
        product_id: inv.product_id,
        product_name: prod ? prod.name : inv.product_id,
        sku: prod ? prod.sku : "UNKNOWN-SKU",
        category: prod ? prod.category_slug : "hardware",
        brand: prod ? prod.brand : "Tethera",
        image: prod?.images?.[0] || null,
        stock_on_hand: stockOnHand,
        stock_reserved: stockReserved,
        stock_available: Math.max(0, stockOnHand - stockReserved),
        low_stock_threshold: threshold,
        is_low_stock: stockOnHand <= threshold,
        is_out_of_stock: stockOnHand === 0,
        aisle_bin: inv.aisle_bin || "A-01",
      };
    });

    if (productId) {
      enrichedItems = enrichedItems.filter((item) => item.product_id === productId);
    }

    if (lowStockOnly) {
      enrichedItems = enrichedItems.filter((item) => item.is_low_stock);
    }

    // Sort by out of stock first, then low stock, then product name
    enrichedItems.sort((a, b) => {
      if (a.is_out_of_stock && !b.is_out_of_stock) return -1;
      if (!a.is_out_of_stock && b.is_out_of_stock) return 1;
      if (a.is_low_stock && !b.is_low_stock) return -1;
      if (!a.is_low_stock && b.is_low_stock) return 1;
      return a.product_name.localeCompare(b.product_name);
    });

    const summary = {
      totalSkus: allInventory.length,
      lowStockAlerts: allInventory.filter(
        (i: StoreInventory) => (i.stock_on_hand || 0) <= (i.low_stock_threshold ?? 2)
      ).length,
      outOfStockAlerts: allInventory.filter((i: StoreInventory) => (i.stock_on_hand || 0) === 0).length,
      totalStockOnHand: allInventory.reduce((acc: number, i: StoreInventory) => acc + (i.stock_on_hand || 0), 0),
    };

    return NextResponse.json({
      success: true,
      items: enrichedItems,
      movements: recentMovements,
      summary,
    });
  } catch (error: any) {
    console.error("[ADMIN INVENTORY GET ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load inventory." },
      { status: 500 }
    );
  }
}

// POST: Adjust stock on hand or low stock threshold with immutable ledger recording
export async function POST(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "inventory:adjust");
    if (!perm.authorized) {
      return perm.status === 401
        ? unauthorizedProblem(perm.error || "Administrative authentication required.", {
            instance: req.nextUrl.pathname,
          })
        : forbiddenProblem(perm.error || "Access denied.", {
            instance: req.nextUrl.pathname,
          });
    }

    const body = await req.json().catch(() => ({}));
    const {
      productId,
      variantId,
      storeId = FLAGSHIP_STORE_ID,
      deltaQuantity,
      newStockOnHand,
      reasonCode,
      notes,
      lowStockThreshold,
    } = body;

    if (!productId) {
      return badRequestProblem("Missing required field: 'productId'.", {
        instance: req.nextUrl.pathname,
      });
    }

    const product = await db.products.findById(productId);
    if (!product) {
      return notFoundProblem(`Product '${productId}' not found.`, {
        instance: req.nextUrl.pathname,
      });
    }

    if (!reasonCode || !VALID_REASON_CODES.includes(reasonCode as ReasonCode)) {
      return badRequestProblem(
        `Invalid or missing 'reasonCode'. Must be one of: ${VALID_REASON_CODES.join(", ")}`,
        { instance: req.nextUrl.pathname }
      );
    }

    if (
      deltaQuantity === undefined &&
      newStockOnHand === undefined &&
      lowStockThreshold === undefined
    ) {
      return badRequestProblem(
        "At least one adjustment field ('deltaQuantity', 'newStockOnHand', or 'lowStockThreshold') must be provided.",
        { instance: req.nextUrl.pathname }
      );
    }

    // Get current inventory record
    let currentInv = await db.inventory.getByProductAndStore(productId, storeId);
    const previousStock = currentInv ? currentInv.stock_on_hand : 0;

    let targetStock = previousStock;
    if (deltaQuantity !== undefined) {
      targetStock = previousStock + Number(deltaQuantity);
    } else if (newStockOnHand !== undefined) {
      targetStock = Number(newStockOnHand);
    }
    targetStock = Math.max(0, targetStock);

    // Update stock on hand and create immutable ledger entry
    const updatedInv = await db.inventory.updateOnHandStock(
      productId,
      targetStock,
      storeId,
      {
        reasonCode: reasonCode as ReasonCode,
        actorId: perm.user?.id || "admin",
        notes: notes || `Manual stock adjustment: ${reasonCode}`,
        variantId: variantId || null,
      }
    );

    // Update low stock threshold if supplied
    if (lowStockThreshold !== undefined) {
      await db.inventory.updateLowStockThreshold(
        productId,
        Math.max(0, Number(lowStockThreshold)),
        storeId
      );
    }

    // Fetch the updated inventory and latest movement
    const finalInv = await db.inventory.getByProductAndStore(productId, storeId);
    const productMovements = await db.inventoryLedger.getMovementsByProduct(productId);
    const latestMovement = productMovements[0] || null;

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "INVENTORY_ADJUSTED",
      entity_type: "inventory",
      entity_id: productId,
      before_state: {
        stock_on_hand: previousStock,
        low_stock_threshold: currentInv?.low_stock_threshold ?? 2,
      },
      after_state: {
        stock_on_hand: finalInv?.stock_on_hand,
        low_stock_threshold: finalInv?.low_stock_threshold,
        reason_code: reasonCode,
        delta: targetStock - previousStock,
      },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    // Invalidate inventory ISR cache
    safeRevalidate("inventory", { productId });

    return NextResponse.json({
      success: true,
      message: `Stock for '${product.name}' updated from ${previousStock} to ${targetStock} units (${reasonCode}).`,
      inventory: finalInv,
      ledgerEntry: latestMovement,
    });
  } catch (error: any) {
    console.error("[ADMIN INVENTORY POST ERROR]:", error);
    return internalServerErrorProblem(error.message || "Failed to update inventory.", {
      instance: req.nextUrl.pathname,
    });
  }
}
