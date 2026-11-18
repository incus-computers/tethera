import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest, NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { authResponse } from "@/lib/auth/session";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { privacyRequests, reviewPrivacy } from "@/lib/operations/privacy";
export const dynamic = "force-dynamic";
export const GET = withApiProtection(withAccess(async () => {
  const rows = (await Promise.all((["requested", "in_review"] as const).map(status => privacyRequests.findMany({status}, { limit: 100, orderBy: "created_at", orderDirection: "asc" })))).flat().sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)).slice(0,100);
  return NextResponse.json({ success: true, requests: rows, showingOldest: 100 });
}));
export const POST = withApiProtection(withAccess(async (req: NextRequest) => {
  try {
    const access = await requireAdminPermission(req, "privacy:manage");
    if (!access.authorized) return NextResponse.json({ success: false, error: "Privacy management permission required." }, { status: access.status || 403 });
    const body = await req.json();
    return NextResponse.json({ success: true, request: await reviewPrivacy(body.id, body.status, access.user!.id, body.response, body.evidence) });
  } catch (error) { return databaseFailureResponse(error) || authResponse(error); }
}));
