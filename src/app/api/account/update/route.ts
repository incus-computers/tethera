import { NextRequest, NextResponse } from "next/server";
import { crmService } from "@/lib/crm/crmService";

export async function PUT(req: NextRequest) {
  try {
    const { id, updates } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing customer id." }, { status: 400 });
    }

    const updated = await crmService.updateProfile(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Customer not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: updated,
      message: "Profile updated successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
