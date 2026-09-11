import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const slot = searchParams.get("slot");

    if (search) {
      const products = await db.products.search(search);
      return NextResponse.json({ success: true, count: products.length, products });
    }

    if (category && category !== "All") {
      const products = await db.products.findByCategory(category);
      return NextResponse.json({ success: true, count: products.length, products });
    }

    if (slot) {
      const products = await db.products.findBySlot(slot as any);
      return NextResponse.json({ success: true, count: products.length, products });
    }

    const products = await db.products.findMany({ is_active: true });
    return NextResponse.json({ success: true, count: products.length, products });
  } catch (error: any) {
    console.error("[API PRODUCTS ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}
