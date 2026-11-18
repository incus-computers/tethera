import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { readOrderPage } from "@/lib/db/collectionQueries";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function handleGET(req: NextRequest) {
  try {
    const q=req.nextUrl.searchParams;
    const customerId=q.get("customerId");
    if(!customerId)return NextResponse.json({success:false,error:"Customer sign-in required."},{status:401});
    const result=await readOrderPage({search:q.get("search")||undefined,scope:q.get("scope")||"all",sort:q.get("sort")||undefined},q.get("page"),q.get("limit"),customerId);
    return NextResponse.json({success:true,count:result.pagination.total,orders:result.rows,pagination:result.pagination,stats:result.stats});
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to retrieve account orders." },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(withAccess(handleGET));
