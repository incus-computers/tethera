import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextResponse } from "next/server";
import { getStorefrontProfile } from "@/lib/storefront/profile";
export const dynamic = "force-dynamic";
 function protectedGET() { return NextResponse.json(getStorefrontProfile(), { headers: { "Cache-Control": "no-store" } }); }
export const GET = withApiProtection(protectedGET);
