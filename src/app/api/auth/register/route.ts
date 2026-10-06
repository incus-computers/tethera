import { NextRequest, NextResponse } from "next/server";
import { crmService } from "@/lib/crm/crmService";
import { RegistrationInput } from "@/lib/types/customer";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegistrationInput;

    const hasEmail = Boolean(body.email && body.email.includes("@"));
    const hasPhone = Boolean(body.phone && body.phone.replace(/[^0-9]/g, "").length >= 8);

    if (!hasEmail && !hasPhone) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address or phone number." },
        { status: 400 }
      );
    }

    if (!body.fullName || body.fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Full name is required (minimum 2 characters)." },
        { status: 400 }
      );
    }

    if (body.password && body.password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const result = await crmService.register(body);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: "Account created successfully.",
    });
  } catch (err: any) {
    console.error("[AUTH REGISTER ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
