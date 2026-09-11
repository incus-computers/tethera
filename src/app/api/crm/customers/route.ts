import { NextRequest, NextResponse } from "next/server";
import { crmService } from "@/lib/crm/crmService";
import { CustomerSegment } from "@/lib/types/customer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const segment = (searchParams.get("segment") as CustomerSegment | "all") || undefined;
    const optInOnly = searchParams.get("optInOnly") === "true";

    const customers = crmService.listCustomers({ search, segment, optInOnly });
    const stats = crmService.getCrmStats();
    const campaignLogs = crmService.getCampaignLogs();

    return NextResponse.json({
      success: true,
      customers,
      stats,
      campaignLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
