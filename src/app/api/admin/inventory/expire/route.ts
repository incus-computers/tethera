import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { expireReservations } from "@/lib/inventory/lifecycle";
export const POST=withApiProtection(withAccess(async()=>NextResponse.json({success:true,results:await expireReservations()})));
