import { NextRequest, NextResponse } from "next/server";
import { BuildInputError, saveBuildSnapshot } from "@/lib/builder/savedBuilds";
import { withApiProtection } from "@/lib/operations/apiProtection";
import { databaseFailureResponse } from "@/lib/api/problemDetails";

export const dynamic = "force-dynamic";
export const POST = withApiProtection(async (request: NextRequest) => {
  try {
    const code = await saveBuildSnapshot(await request.json());
    return NextResponse.json({ success: true, code }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BuildInputError || error instanceof SyntaxError)
      return NextResponse.json({ success: false, error: error instanceof BuildInputError ? error.message : "Invalid build configuration." }, { status: 400 });
    return databaseFailureResponse(error) || NextResponse.json({ success: false, error: "Could not save this build. Please try again." }, { status: 503 });
  }
});
