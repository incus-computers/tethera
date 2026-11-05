import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { internalServerErrorProblem } from "@/lib/api/problemDetails";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || searchParams.get("categorySlug") || undefined;
    const slot = searchParams.get("slot") || undefined;

    // Support comma-separated brands (brand=AMD,Intel) or repeated params (brand=AMD&brand=Intel)
    const brandParams = searchParams.getAll("brand");
    let brands: string[] | undefined = undefined;
    if (brandParams.length > 0) {
      brands = brandParams
        .flatMap((b) => b.split(","))
        .map((s) => s.trim())
        .filter(Boolean);
      if (brands.length === 0) brands = undefined;
    }

    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const minPrice =
      minPriceParam !== null && minPriceParam !== "" && !Number.isNaN(Number(minPriceParam))
        ? Number(minPriceParam)
        : undefined;
    const maxPrice =
      maxPriceParam !== null && maxPriceParam !== "" && !Number.isNaN(Number(maxPriceParam))
        ? Number(maxPriceParam)
        : undefined;

    const inStockParam = searchParams.get("inStock");
    const inStockOnly = inStockParam === "true" || inStockParam === "1";

    const sort = (searchParams.get("sort") as any) || undefined;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const page = pageParam ? Number(pageParam) : undefined;
    const limit = limitParam ? Number(limitParam) : undefined;

    const result = await db.products.getFacetedCatalog({
      search,
      categorySlug: category && category !== "All" ? category : undefined,
      brands,
      minPrice,
      maxPrice,
      inStockOnly,
      pcBuilderSlot: slot as any,
      sort,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: result.pagination.total,
      products: result.products,
      facets: result.facets,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("[API PRODUCTS ERROR]:", error);
    return internalServerErrorProblem(error.message || "Failed to fetch products", {
      instance: req.nextUrl?.pathname || "/api/products",
    });
  }
}
