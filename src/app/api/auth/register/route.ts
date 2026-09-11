import { NextRequest, NextResponse } from "next/server";
import { crmService } from "@/lib/crm/crmService";
import { RegistrationInput } from "@/lib/types/customer";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegistrationInput;

    // Validation
    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!body.fullName || body.fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Full name is required (minimum 2 characters)." },
        { status: 400 }
      );
    }

    if (!body.phone || body.phone.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: "A valid phone number is required for courier delivery & verification." },
        { status: 400 }
      );
    }

    if (!body.street || !body.city || !body.province || !body.postalCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Full delivery address (street, city, province, postal code) is required for e-commerce orders.",
        },
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
      message: "Registration successful! Welcome confirmation & discount voucher dispatched to your email.",
    });
  } catch (err: any) {
    console.error("[AUTH REGISTER ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
