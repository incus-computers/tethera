import { NextRequest, NextResponse } from "next/server";
import { biteship } from "@/lib/shipping/biteship";

export const dynamic = "force-dynamic";

/**
 * GET /api/shipping/areas?query={query}
 * Searches Indonesian sub-districts and postal codes via Biteship Maps API.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || searchParams.get("input") || "";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        areas: [],
        message: "Query must be at least 2 characters.",
      });
    }

    const areas = await biteship.searchAreas(query);

    return NextResponse.json({
      success: true,
      query,
      count: areas.length,
      areas,
    });
  } catch (error: any) {
    console.error("[BITESHIP AREA SEARCH ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to search sub-districts" },
      { status: 500 }
    );
  }
}
