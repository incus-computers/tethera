import { NextRequest, NextResponse } from "next/server";
import { BuildInputError, findBuildSnapshot } from "@/lib/builder/savedBuilds";
import { withApiProtection } from "@/lib/operations/apiProtection";
import { databaseFailureResponse } from "@/lib/api/problemDetails";

export const dynamic = "force-dynamic";
export const GET = withApiProtection(async (_request: NextRequest, context: { params: Promise<{ code: string }> }) => {
  try {
    const result = await findBuildSnapshot((await context.params).code);
    if (!result) return NextResponse.json({ success: false, error: "Build code not found. Check the code and try again." }, { status: 404 });
    return NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BuildInputError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return databaseFailureResponse(error) || NextResponse.json({ success: false, error: "Could not load this build. Please try again." }, { status: 503 });
  }
});
