import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { file: string } }
) {
  try {
    const rawFileName = params.file;
    if (!rawFileName) {
      return new NextResponse("Filename is required", { status: 400 });
    }

    // Sanitize filename to prevent directory traversal
    const safeFileName = path.basename(rawFileName);
    const filePath = path.join(process.cwd(), "public", "uploads", safeFileName);

    try {
      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(safeFileName).toLowerCase();
      const contentType = MIME_MAP[ext] || "application/octet-stream";

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return new NextResponse("Image not found", { status: 404 });
    }
  } catch (error: any) {
    return new NextResponse(error.message || "Failed to serve image", { status: 500 });
  }
}
