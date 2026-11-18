import { withApiProtection } from "@/lib/operations/apiProtection";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { homepageSettingsRepository } from "@/lib/db/repositories/homepageSettings.repository";
import { DEFAULT_HOMEPAGE_LAYOUT, HomepageLayoutConfig } from "@/lib/data/homepageConfig";
import { badRequestProblem, databaseFailureResponse, internalServerErrorProblem } from "@/lib/api/problemDetails";

export const dynamic = "force-dynamic";
async function handleGET() {
  try {
    return NextResponse.json({ success: true, ...await homepageSettingsRepository.getLayout() });
  } catch (error) {
    return databaseFailureResponse(error) || internalServerErrorProblem("Could not load homepage settings.");
  }
}
async function handlePUT(req: NextRequest) {
  try {
    const body = await req.json();
    const patch: Partial<HomepageLayoutConfig> = {};
    if (body.modules !== undefined) {
      const ids = DEFAULT_HOMEPAGE_LAYOUT.modules.map(m => m.id);
      if (!Array.isArray(body.modules) || body.modules.length > ids.length || body.modules.some((m: any) => !ids.includes(m.id) || typeof m.enabled !== "boolean" || typeof m.name !== "string" || typeof m.description !== "string"))
        return badRequestProblem("Invalid homepage modules.");
      patch.modules = body.modules;
    }
    if (body.customPcHero !== undefined) {
      if (!body.customPcHero || typeof body.customPcHero !== "object" || Array.isArray(body.customPcHero))
        return badRequestProblem("Invalid homepage hero.");
      for (const [key, value] of Object.entries(body.customPcHero)) {
        if (!(key in DEFAULT_HOMEPAGE_LAYOUT.customPcHero) || typeof value !== "string" || value.length > 5000)
          return badRequestProblem("Invalid homepage hero field.");
        if ((key.endsWith("Link") || key === "imageUrl") && value && !(/^(https:\/\/|\/(?!\/))/.test(value)))
          return badRequestProblem("Homepage links must use HTTPS or a local path.");
      }
      patch.customPcHero = body.customPcHero;
    }
    if (body.featuredPrebuiltIds !== undefined) {
      if (!Array.isArray(body.featuredPrebuiltIds) || body.featuredPrebuiltIds.length > 100 || body.featuredPrebuiltIds.some((id: unknown) => typeof id !== "string" || !id || id.length > 100))
        return badRequestProblem("Invalid featured prebuilt IDs.");
      patch.featuredPrebuiltIds = body.featuredPrebuiltIds;
    }
    return NextResponse.json({ success: true, message: "Homepage layout and featured rigs saved.", ...await homepageSettingsRepository.saveLayout(patch) });
  } catch (error) {
    return databaseFailureResponse(error) || internalServerErrorProblem("Could not save homepage settings.");
  }
}
export const GET = withApiProtection(withAccess(handleGET));
export const PUT = withApiProtection(withAccess(handlePUT));
