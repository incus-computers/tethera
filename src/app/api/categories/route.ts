import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

 async function protectedGET() {
  try {
    const categories = await db.categories.findMany(undefined, {
      orderBy: "sort_order",
      orderDirection: "asc",
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
export const GET = withApiProtection(protectedGET);
