import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest, NextResponse } from "next/server";
import { loadImage } from "@/lib/media/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

 async function protectedGET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const headers = {
    "Content-Type": "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cache-Control": "public, max-age=3600, must-revalidate",
  };
  try {
    const { file } = await params;
    const image = await loadImage(file);
    if (!image) return new NextResponse("Image not found", { status: 404, headers: { ...headers, "Content-Type": "text/plain", "Cache-Control": "no-store" } });
    const safeHeaders = { ...headers, ETag: image.etag, "Content-Disposition": `inline; filename="${file}"` };
    if (req.headers.get("if-none-match") === image.etag) return new NextResponse(null, { status: 304, headers: safeHeaders });
    return new NextResponse(new Uint8Array(image.bytes), { headers: { ...safeHeaders, "Content-Length": String(image.bytes.length) } });
  } catch {
    return new NextResponse("Image storage is temporarily unavailable.", { status: 503,
      headers: { ...headers, "Content-Type": "text/plain", "Cache-Control": "no-store", "Retry-After": "5" } });
  }
}
export const GET = withApiProtection(protectedGET);
