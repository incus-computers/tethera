import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { operationsSnapshot } from "@/lib/operations/monitor";
export const dynamic = "force-dynamic";
export const GET = withApiProtection(withAccess(async () => NextResponse.json({ success: true, ...await operationsSnapshot() })));
