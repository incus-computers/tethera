import { withApiProtection } from "@/lib/operations/apiProtection";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { operationsSnapshot } from "@/lib/operations/monitor";
export const dynamic = "force-dynamic";
 async function protectedGET(req: NextRequest) {
  const secret = process.env.OPERATIONS_MONITOR_SECRET, provided = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!secret || secret.length < 32 || Buffer.byteLength(provided) !== Buffer.byteLength(secret) || !timingSafeEqual(Buffer.from(secret), Buffer.from(provided))) return NextResponse.json({ success: false, error: "Monitor authorization required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const snapshot = await operationsSnapshot();
  return NextResponse.json(snapshot, { status: snapshot.healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
export const GET = withApiProtection(protectedGET);
