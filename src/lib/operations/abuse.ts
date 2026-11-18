// Edge-compatible: no Node imports, provider SDKs, browser identity or raw IP persistence.
export function abusePolicy(path: string, method: string) {
  if (method !== "GET" && method !== "HEAD" && (path.startsWith("/api/auth/") || path === "/api/admin/auth")) return { scope: "auth", limit: 30, global: 300 };
  if (path.startsWith("/api/shipping/")) return { scope: "shipping", limit: 60, global: 600 };
  if (path === "/api/orders/invoice/send") return { scope: "invoice", limit: 5, global: 100 };
  if (path.startsWith("/api/checkout/")) return { scope: "checkout", limit: 60, global: 600 };
  if (path.startsWith("/api/webhooks/")) return { scope: "webhooks", limit: 600, global: 3000 };
  if (path.startsWith("/api/internal/")) return { scope: "internal", limit: 120, global: 600 };
  if (path.startsWith("/api/builder/builds")) return method === "GET" ? { scope: "build-read", limit: 120, global: 1200 } : { scope: "build-write", limit: 20, global: 200 };
  if (path === "/api/admin/upload" || path.includes("/bulk/")) return { scope: "bulk", limit: 20, global: 100 };
  if (path.includes("/privacy")) return { scope: "privacy", limit: 20, global: 200 };
  return { scope: method === "GET" ? "read" : "write", limit: method === "GET" ? 600 : 120, global: method === "GET" ? 6000 : 1200 };
}
export function clientNetwork(headers: Headers, configured?: string) {
  if (!["cf-connecting-ip", "x-vercel-forwarded-for", "x-real-ip"].includes(configured || "")) return "shared";
  const value = headers.get(configured!)?.trim() || "";
  // The configured ingress must overwrite this header and prevent direct origin access.
  // Refuse chains and malformed values rather than trusting attacker-selected prefixes.
  if (value.length > 45 || !/^[a-fA-F0-9:.]+$/.test(value)) return "shared";
  if (value.includes(":")) {
    try { return new URL(`http://[${value}]/`).hostname.toLowerCase(); } catch { return "shared"; }
  }
  const parts = value.split(".");
  return parts.length === 4 && parts.every(p => /^(0|[1-9]\d{0,2})$/.test(p) && Number(p) <= 255) ? value : "shared";
}
export async function abuseKey(secret: string, text: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
type Counter = { count: number; expires: number };
const localState = globalThis as typeof globalThis & { __localAbuseLimits?: Map<string, Counter> };
// Bounded local budgets serve demo APIs and the public image optimizer. Connected
// application APIs continue to use their separate distributed database budgets.
export function consumeLocalLimit(key: string, limit: number, now = Date.now()) {
  const records = localState.__localAbuseLimits ||= new Map();
  for (const [k, row] of Array.from(records)) if (row.expires <= now) records.delete(k);
  const record = records.get(key) || { count: 0, expires: (Math.floor(now / 60000) + 1) * 60000 };
  if (!records.has(key) && records.size >= 10000) return false;
  records.set(key, record); return ++record.count <= limit;
}
export async function enforceAbuseLimit(req: Request, path: string) {
  const policy = abusePolicy(path, req.method);
  const demo = process.env.APP_ENV === "demo" && process.env.NODE_ENV !== "production";
  if (process.env.APP_ENV === "demo" && !demo) throw new Error("limit_unavailable");
  const secret = demo ? "local-demo-only-hmac" : process.env.ABUSE_HMAC_SECRET;
  if (!secret || (!demo && secret.length < 32)) throw new Error("limit_unavailable");
  const network = clientNetwork(req.headers, process.env.ABUSE_TRUSTED_IP_HEADER);
  // Daily HMAC rotation avoids a stable cross-day network identifier in the database.
  const key = await abuseKey(secret, `${Math.floor(Date.now() / 86400000)}:${policy.scope}:${network}`);
  if (demo) return consumeLocalLimit("global:" + policy.scope, policy.global) && consumeLocalLimit(key, policy.limit);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("limit_unavailable");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/consume_api_budget`, { method: "POST", headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_key: key, p_scope: policy.scope, p_limit: policy.limit, p_global_limit: policy.global }), signal: AbortSignal.timeout(4000), cache: "no-store" });
  if (!response.ok) throw new Error("limit_unavailable");
  const result = await response.json(); if (typeof result !== "boolean") throw new Error("limit_unavailable"); return result;
}
