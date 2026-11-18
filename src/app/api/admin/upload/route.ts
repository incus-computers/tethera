import { withApiProtection } from "@/lib/operations/apiProtection";
import { withAccess } from "@/lib/auth/routeGuard";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";
import { MediaError, normalizeImage, readImageFile, withImageSlot } from "@/lib/media/images";
import { saveImage } from "@/lib/media/storage";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiProtection(withAccess(async (req: NextRequest) => {
  try {
    const clearance = await verifyAdminClearance(req, "admin");
    if (!clearance.authorized || !clearance.user) return NextResponse.json({ success: false, error: "Staff sign-in required." }, { status: 401 });
    return await withImageSlot(async () => {
      const image = await normalizeImage(await readImageFile(req));
      const saved = await saveImage(image, clearance.user!.id);
      return NextResponse.json({ success: true, ...saved, message: "Image uploaded successfully." });
    });
  } catch (error) {
    const status = error instanceof MediaError ? error.status : 503;
    return NextResponse.json({ success: false, error: error instanceof MediaError ? error.message : "Image storage is temporarily unavailable. Please retry." },
      { status, headers: status === 503 ? { "Retry-After": "5" } : {} });
  }
}));
