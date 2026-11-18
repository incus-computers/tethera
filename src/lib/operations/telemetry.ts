import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();
type Event = "api_request" | "api_failure" | "storage_failure" | "provider_failure";
// Deliberate field allowlist: never serialize errors, bodies, URLs, headers or identifiers.
export function operationalEvent(event: Event, fields: { status?: number; durationMs?: number; method?: string; area?: string } = {}) {
  console.info(JSON.stringify({ event, requestId: requestContext.getStore()?.requestId,
    ...(Number.isInteger(fields.status) ? { status: fields.status } : {}),
    ...(Number.isFinite(fields.durationMs) ? { durationMs: Math.max(0, Math.round(fields.durationMs!)) } : {}),
    ...(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(fields.method || "") ? { method: fields.method } : {}),
    ...(["auth", "checkout", "shipping", "webhooks", "admin", "account", "catalog", "internal", "other"].includes(fields.area || "") ? { area: fields.area } : {}) }));
}
export function safeFailure() { operationalEvent("api_failure"); }
