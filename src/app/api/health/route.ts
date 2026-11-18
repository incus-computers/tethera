import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextResponse } from "next/server";
import { checkDatabaseReadiness } from "@/lib/db/health";
export const dynamic = "force-dynamic";
 async function protectedGET() {
  try {
    const database = await checkDatabaseReadiness();
    return NextResponse.json({ status: "ready", database }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } });
  }
}
export const GET = withApiProtection(protectedGET);
