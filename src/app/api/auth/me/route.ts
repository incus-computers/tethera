import { NextRequest, NextResponse } from "next/server";
import { crmService } from "@/lib/crm/crmService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    let user;
    if (id) {
      user = crmService.getCustomerById(id);
    } else if (email) {
      user = crmService.getCustomerByEmail(email);
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Customer not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
