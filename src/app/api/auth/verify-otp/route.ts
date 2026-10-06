import { NextRequest, NextResponse } from "next/server";
import { otpService } from "@/lib/auth/otpService";

export async function POST(req: NextRequest) {
  try {
    const { identifier, code } = await req.json();

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: "Identifier (email or phone) is required." },
        { status: 400 }
      );
    }

    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter the 6-digit verification code." },
        { status: 400 }
      );
    }

    const verificationResult = otpService.verifyOtp(identifier, code.trim());

    if (!verificationResult.success) {
      return NextResponse.json(
        { success: false, error: verificationResult.error || "Verification failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contact verified successfully.",
    });
  } catch (err: any) {
    console.error("[AUTH VERIFY OTP ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}
