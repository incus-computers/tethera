import "server-only";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
import { getServerSupabase } from "@/lib/db/client";
import { databaseError } from "@/lib/db/errors";
import { AuthError } from "@/lib/auth/errors";
import type { CustomerProfile } from "@/lib/types/customer";

export interface PrivacyRequest { id: string; customer_id: string; kind: "access" | "erasure" | "correction"; status: "requested" | "in_review" | "completed" | "declined"; requester_notes: string; response_notes: string; internal_evidence: string; decided_by?: string; created_at: string; updated_at: string }
export const privacyRequests = new BaseRepository<PrivacyRequest>("privacy_requests");
export const privacyEvents = new BaseRepository<any>("privacy_request_events");
export function publicPrivacyRequest(r: PrivacyRequest) {
  return { id: r.id, kind: r.kind, status: r.status, requester_notes: r.requester_notes, response_notes: r.response_notes, created_at: r.created_at, updated_at: r.updated_at };
}
async function rpc(name: string, params: object) {
  const { data, error } = await getServerSupabase()!.rpc(name, params);
  if (error) databaseError("privacy", "privacy_requests", error);
  return data;
}
export async function submitPrivacy(owner: string, kind: unknown, notes: unknown) {
  if (!["access", "erasure", "correction"].includes(String(kind)) || typeof notes !== "string" || notes.length > 2000) throw new AuthError("Choose a request type and use at most 2000 characters.", 400);
  if (getServerSupabase()) return rpc("submit_privacy_request", { p_owner: owner, p_kind: kind, p_notes: notes.trim() });
  const existing = (await privacyRequests.findMany({ customer_id: owner, kind })).find(r => ["requested", "in_review"].includes(r.status));
  if (existing) return existing;
  if ((await privacyRequests.findMany({ customer_id: owner })).filter(r => Date.parse(r.created_at) > Date.now() - 86400000).length >= 5) throw new AuthError("Too many privacy requests. Contact support for the existing request.", 429);
  const now = new Date().toISOString();
  const row = await privacyRequests.create({ customer_id: owner, kind: kind as PrivacyRequest["kind"], status: "requested", requester_notes: notes.trim(), response_notes: "", internal_evidence: "", created_at: now, updated_at: now });
  await privacyEvents.create({ request_id: row.id, actor_id: owner, status: "requested", evidence: "", created_at: now });
  return row;
}
export async function reviewPrivacy(id: unknown, status: unknown, actor: string, response: unknown, evidence: unknown) {
  if (typeof id !== "string" || id.length > 100 || !["in_review", "completed", "declined"].includes(String(status)) || [response, evidence].some(v => typeof v !== "string" || v.trim().length < 5 || v.length > 2000)) throw new AuthError("Provide a request, status, customer response and evidence reference (5-2000 characters).", 400);
  if (getServerSupabase()) return rpc("review_privacy_request", { p_id: id, p_status: status, p_actor: actor, p_response: (response as string).trim(), p_evidence: (evidence as string).trim() });
  const row = await privacyRequests.findById(id);
  if (!row) throw new AuthError("Request not found.", 404);
  if (["completed", "declined"].includes(row.status) || status !== "in_review" && row.status !== "in_review") throw new AuthError("Review the open request before recording its outcome.", 409);
  const updated = await privacyRequests.update(id, { status: status as PrivacyRequest["status"], response_notes: (response as string).trim(), internal_evidence: (evidence as string).trim(), decided_by: actor, updated_at: new Date().toISOString() });
  await privacyEvents.create({ request_id: id, actor_id: actor, status, evidence, created_at: new Date().toISOString() });
  return updated;
}
function project(row: any, keys: string[]) { return Object.fromEntries(keys.filter(k => row[k] !== undefined).map(k => [k, row[k]])); }
async function exportRows(table: string, filter: object, keys: string[]) {
  const rows = await new BaseRepository<any>(table).findMany(filter, { limit: 1001, orderBy: "id", orderDirection: "asc", select: keys.join(",") });
  if (rows.length > 1000) throw new AuthError("Account data is too large for an immediate download. Submit an access request for staff assistance.", 409);
  return rows.map(row => project(row, keys));
}
export async function accountDataExport(profile: CustomerProfile, userId: string) {
  const orders = await exportRows("orders", { customer_id: profile.id }, ["id", "order_number", "customer_name", "customer_email", "customer_phone", "shipping_address", "fulfillment_type", "subtotal", "shipping_fee", "assembly_fee", "discount_amount", "total", "tax_amount", "status", "payment_method", "paid_at", "created_at"]);
  const [builds, reviews, wishlist, subscriptions, requests] = await Promise.all([
    exportRows("custom_builds", { user_id: userId }, ["id", "build_name", "platform", "configuration", "total_price", "created_at"]),
    exportRows("product_reviews", { user_id: profile.id }, ["id", "product_id", "rating", "title", "content", "customer_name", "created_at"]),
    exportRows("customer_wishlist", { user_id: userId }, ["id", "product_id", "created_at"]),
    exportRows("stock_notifications", { owner_id: profile.id }, ["id", "product_id", "variant_id", "email", "phone", "notified_at", "created_at"]),
    privacyRequests.findMany({ customer_id: profile.id }, { limit: 1001, orderBy: "id", orderDirection: "asc" }),
  ]);
  if (requests.length > 1000) throw new AuthError("Submit an access request for a larger export.", 409);
  const result = { generatedAt: new Date().toISOString(), scope: "Self-service account data. This is not a complete data-subject access response. Request staff review for order lines, returns, correspondence, provider records and other operational records.",
    profile: { id: profile.id, email: profile.email, fullName: profile.fullName, phone: profile.phone, address: profile.address, marketing: profile.marketing }, orders, builds, reviews, wishlist, subscriptions, privacyRequests: requests.map(publicPrivacyRequest) };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > 5 * 1024 * 1024) throw new AuthError("Export is too large. Submit an access request for staff assistance.", 409);
  return result;
}
