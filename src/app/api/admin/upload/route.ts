import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

const VALID_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
  ".bmp",
  ".tiff",
  ".ico",
];

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".ico": "image/x-icon",
};

export async function POST(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      // If unauthorized in production, return 401
      return NextResponse.json({ success: false, error: clearance.error || "Administrative clearance required." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image file provided." },
        { status: 400 }
      );
    }

    // Determine extension and validity
    const originalExt = path.extname(file.name || "").toLowerCase();
    const rawType = (file.type || "").toLowerCase();

    const isImageMime =
      rawType.startsWith("image/") ||
      rawType === "application/octet-stream" ||
      rawType === "";

    const hasValidExt = VALID_EXTENSIONS.includes(originalExt);

    if (!hasValidExt && !rawType.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file format. Please upload JPEG, PNG, WEBP, GIF, SVG, or AVIF images.",
        },
        { status: 400 }
      );
    }

    const resolvedMime = EXT_TO_MIME[originalExt] || file.type || "image/jpeg";

    // Read bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure uploads directory exists in public/uploads
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeExt = hasValidExt ? originalExt : ".png";
    const rawBase = path.basename(file.name || "image", path.extname(file.name || ""));
    const cleanBaseName = rawBase
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    const uniqueFileName = `${Date.now()}-${cleanBaseName || "product-image"}${safeExt}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    await fs.writeFile(filePath, buffer);

    // Direct dynamic serve route guaranteeing immediate 200 OK without Next.js static asset reload issues
    const dynamicUrl = `/api/uploads/${uniqueFileName}`;
    const publicUrl = `/uploads/${uniqueFileName}`;
    const base64DataUrl = `data:${resolvedMime};base64,${buffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      url: dynamicUrl,
      publicUrl,
      dataUrl: base64DataUrl,
      fileName: uniqueFileName,
      originalName: file.name,
      sizeBytes: buffer.length,
      message: "Image uploaded successfully.",
    });
  } catch (error: any) {
    console.error("[ADMIN IMAGE UPLOAD ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload image." },
      { status: 500 }
    );
  }
}
