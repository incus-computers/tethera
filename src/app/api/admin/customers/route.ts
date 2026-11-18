import { withApiProtection } from "@/lib/operations/apiProtection";
import { readCustomerPage } from "@/lib/db/collectionQueries";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

async function handleGET(req: NextRequest) {
  try {
    const clearance = await verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const q=req.nextUrl.searchParams;
    const result=await readCustomerPage({search:q.get("search")||undefined,segment:q.get("segment")||undefined,optInOnly:q.get("optInOnly")==="true",sort:q.get("sort")||undefined},q.get("page"),q.get("limit"));
    return NextResponse.json({success:true,count:result.pagination.total,customers:result.rows,pagination:result.pagination,stats:result.stats});
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    return NextResponse.json({ success: false, error: "Service temporarily unavailable. Please retry." }, { status: 500 });
  }
}

export const GET = withApiProtection(withAccess(handleGET));
