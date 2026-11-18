import "server-only";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { operationalEvent, requestContext } from "./telemetry";

type Handler = (request: NextRequest, context: any) => Promise<Response> | Response;
class BodyLimitError extends Error {}
export function apiArea(path: string) {
  const segment = path.split("/")[2];
  return ["auth", "checkout", "shipping", "webhooks", "admin", "account", "internal"].includes(segment) ? segment : /\/(products|categories)/.test(path) ? "catalog" : "other";
}
export function bodyLimit(path: string) {
  if (path === "/api/admin/upload") return 12 * 1024 * 1024;
  if (path === "/api/admin/products/bulk/import") return 6 * 1024 * 1024;
  return path.startsWith("/api/auth/") ? 16384 : 200000;
}
async function boundedRequest(req: NextRequest): Promise<NextRequest> {
  if (!req.body) return req;
  const maximum = bodyLimit(req.nextUrl.pathname);
  const declared = req.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum)) throw new BodyLimitError();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const result = await reader.read(); if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > maximum) { void reader.cancel(); throw new BodyLimitError(); }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  const headers = new Headers(req.headers); headers.delete("content-length");
  return new NextRequest(req.url, { method: req.method, headers, body });
}
export function withApiProtection(handler: Handler) {
  return async (req: NextRequest, context?: any): Promise<Response> => {
    // Ignore all browser-provided correlation IDs.
    const requestId = randomUUID(), began = performance.now();
    return requestContext.run({ requestId }, async () => {
      let response: Response;
      try { response = await handler(await boundedRequest(req), context); }
      catch (error) {
        operationalEvent("api_failure");
        response = NextResponse.json({ success: false, error: error instanceof BodyLimitError ? "Request body is too large." : "Service temporarily unavailable. Please retry." }, { status: error instanceof BodyLimitError ? 413 : 503 });
      }
      if (response.status >= 500) {
        operationalEvent("api_failure", { status: response.status });
        // Do not expose database/provider payloads or accidental stack traces, even from legacy catches.
        const headers = new Headers(response.headers); headers.delete("content-length");
        const message = "Service temporarily unavailable. Please retry.";
        const problem = headers.get("content-type")?.includes("application/problem+json");
        const body = req.nextUrl.pathname === "/api/health" ? { status: "unavailable" } : problem ? { type: "about:blank", title: "Service unavailable", status: response.status, detail: message, error: message, success: false, requestId } : { success: false, error: message, requestId };
        response = NextResponse.json(body, { status: response.status, headers });
      }
      response.headers.set("X-Request-ID", requestId);
      response.headers.set("X-Content-Type-Options", "nosniff");
      if (response.status >= 400) response.headers.set("Cache-Control", "no-store");
      if (response.status === 429 && !response.headers.has("Retry-After")) response.headers.set("Retry-After", "60");
      operationalEvent("api_request", { status: response.status, durationMs: performance.now() - began, method: req.method, area: apiArea(req.nextUrl.pathname) });
      return response;
    });
  };
}
