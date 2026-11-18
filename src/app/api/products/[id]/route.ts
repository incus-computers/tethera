import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { publicCatalogProduct } from "@/lib/api/publicCatalog";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

 async function protectedGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product identifier is required." },
        { status: 400 }
      );
    }

    let product = await db.products.findById(id);
    if (!product) {
      product = await db.products.findBySlug(id);
    }

    if (!product || !product.is_active) {
      return NextResponse.json(
        { success: false, error: "Product not found." },
        { status: 404 }
      );
    }

    // Also fetch current store inventory on the server
    const inventory = await db.inventory.getByProductAndStore(product.id);

    return NextResponse.json({
      success: true,
      product: {
        ...publicCatalogProduct(product),
        stockCount: inventory ? inventory.stock_on_hand - inventory.stock_reserved : 0,
        inStock: inventory ? inventory.stock_on_hand > inventory.stock_reserved : false,
      },
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
export const GET = withApiProtection(protectedGET);
