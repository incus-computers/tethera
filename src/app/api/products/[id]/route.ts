import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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

    if (!product) {
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
        ...product,
        stockCount: inventory ? inventory.stock_on_hand - inventory.stock_reserved : 10,
        inStock: inventory ? inventory.stock_on_hand > inventory.stock_reserved : true,
      },
    });
  } catch (error: any) {
    console.error("[API PRODUCT BY ID ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch product" },
      { status: 500 }
    );
  }
}
