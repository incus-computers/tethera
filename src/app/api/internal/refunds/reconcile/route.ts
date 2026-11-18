import { withApiProtection } from "@/lib/operations/apiProtection";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { reconcileRefunds } from "@/lib/refunds/service";
 async function protectedPOST(req: NextRequest) {
  const secret = process.env.REFUND_JOB_SECRET || "", expected = "Bearer " + secret, given = req.headers.get("authorization") || "";
  if (secret.length < 32) return NextResponse.json({success: false}, {status: 503});
  if (Buffer.byteLength(given) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return NextResponse.json({success: false}, {status: 401});
  try { const results = await reconcileRefunds(), success = results.every(result => result.success); return NextResponse.json({success, results}, {status: success ? 200 : 503}); }
  catch { return NextResponse.json({success: false}, {status: 503}); }
}
export const POST = withApiProtection(protectedPOST);
