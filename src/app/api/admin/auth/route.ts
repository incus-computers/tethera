import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdminCredentials,
  generateAdminClearanceToken,
  verifyAdminClearance,
} from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Username/Email and clearance password are required." },
        { status: 400 }
      );
    }

    const admin = authenticateAdminCredentials(identifier, password);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Invalid administrative credentials or insufficient clearance." },
        { status: 401 }
      );
    }

    const token = generateAdminClearanceToken(admin);

    const response = NextResponse.json({
      success: true,
      user: admin,
      token,
      message: `Cleared for ${admin.role.toUpperCase()} operations.`,
    });

    response.cookies.set("tethera_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[ADMIN AUTH POST ERROR]:", error);
    return NextResponse.json(
      { success: false, error: "Administrative authentication internal error." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const clearance = verifyAdminClearance(req, "admin");
  if (!clearance.authorized || !clearance.user) {
    return NextResponse.json({ success: false, error: clearance.error }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user: clearance.user,
  });
}
