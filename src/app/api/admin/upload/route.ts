import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image file provided." },
        { status: 400 }
      );
    }

    // Validate file type
    const validMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/avif",
    ];

    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file format. Please upload JPEG, PNG, WEBP, GIF, or SVG images.",
        },
        { status: 400 }
      );
    }

    // Read bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename and create uploads directory
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const cleanBaseName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-|-$/g, "");
    const uniqueFileName = `${Date.now()}-${cleanBaseName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${uniqueFileName}`;
    const base64DataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      dataUrl: base64DataUrl,
      fileName: uniqueFileName,
      originalName: file.name,
      sizeBytes: buffer.length,
      message: "Image uploaded successfully from local computer.",
    });
  } catch (error: any) {
    console.error("[ADMIN IMAGE UPLOAD ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload image." },
      { status: 500 }
    );
  }
}
