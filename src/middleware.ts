import { NextRequest, NextResponse } from "next/server";
import { enforceAbuseLimit, consumeLocalLimit } from "@/lib/operations/abuse";
import { contentSecurityPolicy } from "@/lib/operations/securityHeaders";

export async function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID()), csp = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce); headers.set("Content-Security-Policy", csp);
  let response: NextResponse;
  if (req.nextUrl.pathname.startsWith("/api/") || req.nextUrl.pathname === "/_next/image") {
    try {
      // Public, allowlisted/cached image optimization must work independently of
      // API credentials or database availability. Keep a local resource budget;
      // deployment-wide image traffic is controlled by the hosting ingress.
      const allowed = req.nextUrl.pathname === "/_next/image" ? consumeLocalLimit("public-images", 1200) : await enforceAbuseLimit(req, req.nextUrl.pathname);
      response = allowed ? NextResponse.next({ request: { headers } }) : NextResponse.json({ success: false, error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
    } catch {
      response = NextResponse.json({ success: false, error: "Service temporarily unavailable. Please retry." }, { status: 503, headers: { "Retry-After": "5", "Cache-Control": "no-store" } });
    }
  } else response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  if (!req.nextUrl.pathname.startsWith("/api/") && req.nextUrl.pathname !== "/_next/image") response.headers.set("Cache-Control", "private, no-store");
  if (process.env.NODE_ENV === "production" && req.nextUrl.protocol === "https:") response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}
export const config = { matcher: ["/api/:path*", "/_next/image", "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|gif|ico|woff2|svg)$).*)"] };
