import { NextRequest, NextResponse } from "next/server";
import { crmService } from "@/lib/crm/crmService";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    const result = await crmService.authenticate(email, password);

    if (result.error || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || "Authentication failed." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: "Successfully signed in.",
    });
  } catch (err: any) {
    console.error("[AUTH LOGIN ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login. Please try again." },
      { status: 500 }
    );
  }
}
