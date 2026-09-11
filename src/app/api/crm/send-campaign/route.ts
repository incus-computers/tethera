import { NextRequest, NextResponse } from "next/server";
import { crmService } from "@/lib/crm/crmService";
import { CrmCampaignPayload } from "@/lib/types/customer";

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as CrmCampaignPayload;

    if (!payload.subject || !payload.headline || !payload.messageBody) {
      return NextResponse.json(
        { success: false, error: "Subject, Headline, and Message Body are required for a marketing campaign." },
        { status: 400 }
      );
    }

    const result = await crmService.broadcastCampaign({
      campaignName: payload.campaignName || `Campaign-${Date.now()}`,
      subject: payload.subject,
      previewText: payload.previewText,
      targetSegment: payload.targetSegment || "opted_in",
      promoCode: payload.promoCode,
      headline: payload.headline,
      messageBody: payload.messageBody,
      ctaText: payload.ctaText,
      ctaUrl: payload.ctaUrl,
    });

    return NextResponse.json({
      success: true,
      sentCount: result.sentCount,
      campaignLog: result.campaignLog,
      message: `Campaign "${payload.subject}" successfully pushed to ${result.sentCount} recipients!`,
    });
  } catch (err: any) {
    console.error("[CRM SEND CAMPAIGN ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
