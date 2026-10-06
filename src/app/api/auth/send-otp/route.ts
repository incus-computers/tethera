import { NextRequest, NextResponse } from "next/server";
import { otpService } from "@/lib/auth/otpService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawIdentifier = (body.identifier || "").trim();

    if (!rawIdentifier) {
      return NextResponse.json(
        { success: false, error: "Please provide an email address or phone number." },
        { status: 400 }
      );
    }

    const isEmail = rawIdentifier.includes("@");
    const channel: "email" | "phone" = isEmail ? "email" : "phone";

    if (channel === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawIdentifier)) {
        return NextResponse.json(
          { success: false, error: "Please provide a valid email address." },
          { status: 400 }
        );
      }
    } else {
      const digitsOnly = rawIdentifier.replace(/[^0-9]/g, "");
      if (digitsOnly.length < 8) {
        return NextResponse.json(
          { success: false, error: "Please provide a valid phone number (at least 8 digits)." },
          { status: 400 }
        );
      }
    }

    const otpData = otpService.generateOtp(rawIdentifier, channel);

    // Provide friendly destination masking for privacy in the response
    const maskedDestination = channel === "email"
      ? rawIdentifier.replace(/^(.)(.*)(@.*)$/, (_: string, first: string, middle: string, domain: string) => `${first}${"*".repeat(Math.min(middle.length, 5))}${domain}`)
      : rawIdentifier.replace(/(\d{3})\d+(\d{3})/, "$1****$2");

    return NextResponse.json({
      success: true,
      channel,
      destination: maskedDestination,
      expiresAt: otpData.expiresAt,
      // Provide demoCode for frictionless testing in development and sandbox environments
      demoCode: otpData.code,
      message: `A 6-digit verification code has been dispatched to ${maskedDestination}.`,
    });
  } catch (err: any) {
    console.error("[AUTH SEND OTP ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch verification code. Please try again." },
      { status: 500 }
    );
  }
}
