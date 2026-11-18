import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest, NextResponse } from "next/server";
import { customerProfile, customerSession } from "@/lib/auth/customer";
import { checkOrigin, authResponse } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/errors";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { accountDataExport, privacyRequests, publicPrivacyRequest, submitPrivacy } from "@/lib/operations/privacy";

export const dynamic = "force-dynamic";
async function identity(req: NextRequest, fresh: boolean) {
  const session = await customerSession(req), profile = await customerProfile(req);
  if (fresh && (!session.verifiedUntil || session.verifiedUntil <= Date.now())) throw new AuthError("Verify a fresh sign-in code before downloading data or submitting a privacy request.", 403);
  return { session, profile };
}
 async function protectedGET(req: NextRequest) {
  try {
    const download = req.nextUrl.searchParams.get("download") === "1";
    const { profile, session } = await identity(req, download);
    if (download) return NextResponse.json(await accountDataExport(profile, session.id), { headers: { "Content-Disposition": 'attachment; filename="incus-account-data.json"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    const rows = await privacyRequests.findMany({ customer_id: profile.id }, { limit: 100, orderBy: "created_at", orderDirection: "desc" });
    return NextResponse.json({ success: true, verificationContact: session.contact, requests: rows.map(publicPrivacyRequest), showingMostRecent: 100 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return databaseFailureResponse(error) || authResponse(error); }
}
export const GET = withApiProtection(protectedGET);
 async function protectedPOST(req: NextRequest) {
  try {
    checkOrigin(req); const { profile } = await identity(req, true); const body = await req.json();
    return NextResponse.json({ success: true, request: publicPrivacyRequest(await submitPrivacy(profile.id, body.kind, body.notes || "")) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return databaseFailureResponse(error) || authResponse(error); }
}
export const POST = withApiProtection(protectedPOST);
