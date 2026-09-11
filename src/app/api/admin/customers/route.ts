import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const segment = searchParams.get("segment") || undefined;
    const optInOnly = searchParams.get("optInOnly") === "true";

    const customers = await db.customers.searchProfiles({ search, segment, optInOnly });

    const all = await db.customers.findMany();
    const totalLeads = all.length;
    const optedInCount = all.filter((c) => c.marketing_opt_in).length;
    const optInRate = totalLeads > 0 ? Math.round((optedInCount / totalLeads) * 100) : 0;
    const vipCount = all.filter((c) => c.crm_status === "vip").length;
    const totalRevenueGenerated = all.reduce((sum, c) => sum + (c.total_spent || 0), 0);

    const segmentBreakdown = {
      gamer: all.filter((c) => c.customer_segment === "gamer").length,
      pc_builder: all.filter((c) => c.customer_segment === "pc_builder").length,
      creator: all.filter((c) => c.customer_segment === "creator").length,
      enterprise: all.filter((c) => c.customer_segment === "enterprise").length,
      general: all.filter((c) => c.customer_segment === "general").length,
    };

    return NextResponse.json({
      success: true,
      customers,
      stats: {
        totalLeads,
        optedInCount,
        optInRate,
        vipCount,
        totalRevenueGenerated,
        segmentBreakdown,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
