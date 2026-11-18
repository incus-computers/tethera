import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
export const GET = withApiProtection(withAccess(async () => NextResponse.json({success:true})));
