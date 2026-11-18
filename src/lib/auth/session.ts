import "server-only";
import { createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/runtime/environment";
import { demoAuth } from "./demo";
import { AuthError } from "./errors";

export type SessionKind = "customer" | "admin";
export const SESSION_COOKIES = { customer: "tethera_customer_token", admin: "tethera_admin_token" };
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function authClient() {
  if (isDemoMode()) throw new AuthError("External authentication is disabled in demo mode.", 503);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new AuthError("Authentication is not configured.", 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
export function authDatabase() {
  if (isDemoMode()) throw new AuthError("External authentication storage is disabled in demo mode.", 503);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AuthError("Authentication storage is not configured.", 503);
  return createClient(url, key, { db: { retry: false }, auth: { persistSession: false, autoRefreshToken: false } });
}
export async function limitAuth(scope: string, identifier: string, maximum = 10) {
  const key = tokenHash(scope + ":" + identifier);
  if (isDemoMode()) {
    const db = demoAuth(), now = Date.now();
    for (const [k,v] of Array.from(db.limits)) if (v.expires <= now) db.limits.delete(k);
    const record = db.limits.get(key) || { count: 0, expires: now + 900000 };
    db.limits.set(key, record);
    if (++record.count > maximum) throw new AuthError("Too many attempts. Try again later.", 429);
    return;
  }
  const { data, error } = await authDatabase().rpc("consume_auth_rate_limit", { p_key: key, p_limit: maximum });
  if (error) throw new AuthError("Authentication temporarily unavailable.", 503);
  if (!data) throw new AuthError("Too many attempts. Try again later.", 429);
}
export async function issueSession(response: NextResponse, kind: SessionKind, id: string, contact: string, providerToken?: string, expiresAt?: number, verified = false) {
  const token = providerToken || randomBytes(32).toString("base64url");
  const expires = Math.min(expiresAt ? expiresAt * 1000 : Infinity, Date.now() + 3600000);
  if (isDemoMode()) {
    const state = demoAuth();
    for (const [key, value] of Array.from(state.sessions)) if (value.expires <= Date.now()) state.sessions.delete(key);
    state.sessions.set(tokenHash(token), { id, contact, kind, expires, verifiedUntil: verified ? Date.now()+600000 : undefined });
  } else {
    if (!providerToken) throw new AuthError("Missing provider session.", 503);
    const { error } = await authDatabase().from("auth_sessions").upsert({ token_hash: tokenHash(token), user_id: id, kind, expires_at: new Date(expires).toISOString(), verification_expires_at: verified ? new Date(Date.now()+600000).toISOString() : null }, { onConflict: "token_hash,kind" });
    if (error) throw new AuthError("Session storage unavailable.", 503);
  }
  response.cookies.set(SESSION_COOKIES[kind], token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.max(0, Math.floor((expires - Date.now()) / 1000)) });
  response.headers.set("Cache-Control", "no-store");
}
export async function readSession(req: NextRequest, kind: SessionKind) {
  // Only server-issued HttpOnly cookies identify browser users. Legacy bearer strings are never identity.
  const token = req.cookies.get(SESSION_COOKIES[kind])?.value;
  if (!token || token.length > 8192) return null;
  if (isDemoMode()) {
    const state = demoAuth(), session = state.sessions.get(tokenHash(token));
    if (!session || session.kind !== kind || session.expires <= Date.now()) return null;
    const account = state.accounts.get(session.id);
    return account ? { id: account.id, email: account.profile.email, contact: session.contact, token, role: account.role, profile: account.profile, verifiedUntil: session.verifiedUntil } : null;
  }
  const database = authDatabase();
  const { data: session, error } = await database.from("auth_sessions").select("user_id,expires_at,verification_expires_at").eq("token_hash", tokenHash(token)).eq("kind", kind).maybeSingle();
  if (error) throw new AuthError("Session storage unavailable.", 503);
  if (!session || Date.parse(session.expires_at) <= Date.now()) return null;
  const { data, error: userError } = await authClient().auth.getUser(token);
  if (userError || !data.user || data.user.id !== session.user_id) return null;
  const user = data.user;
  if (!user.email_confirmed_at && !user.phone_confirmed_at) return null;
  return { id: user.id, email: user.email || user.phone?.replace("+", "") + "@phone.invalid", contact: user.email_confirmed_at ? user.email! : user.phone!, token, role: undefined as string | undefined, profile: undefined, verifiedUntil: session.verification_expires_at ? Date.parse(session.verification_expires_at) : undefined };
}
export async function revokeSession(req: NextRequest, kind: SessionKind) {
  const token = req.cookies.get(SESSION_COOKIES[kind])?.value;
  if (token) {
    if (isDemoMode()) demoAuth().sessions.delete(tokenHash(token));
    else {
      const { error } = await authDatabase().from("auth_sessions").delete().eq("token_hash", tokenHash(token)).eq("kind", kind);
      if (error) throw new AuthError("Could not revoke session. Try again.", 503);
    }
  }
}
export function clearSessionCookie(response: NextResponse, kind: SessionKind) {
  response.cookies.set(SESSION_COOKIES[kind], "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
export function checkOrigin(req: NextRequest) {
  if (["GET","HEAD","OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if ((origin && origin !== (process.env.APP_URL ? new URL(process.env.APP_URL).origin : req.nextUrl.origin)) || req.headers.get("sec-fetch-site") === "cross-site") throw new AuthError("Cross-site request denied.", 403);
}
export function authResponse(error: unknown) {
  return NextResponse.json({ success: false, error: error instanceof AuthError ? error.message : "Authentication temporarily unavailable." }, { status: error instanceof AuthError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
}

export async function consumeVerification(req: NextRequest) {
 const session=await readSession(req,"customer");
 if(!session || !session.verifiedUntil || session.verifiedUntil <= Date.now())throw new AuthError("Request and verify a fresh code before changing credentials.",403);
 if(isDemoMode()) {
  const record=demoAuth().sessions.get(tokenHash(session.token))!;
  if(!record.verifiedUntil)throw new AuthError("Verification already used.",403);
  record.verifiedUntil=undefined;
 } else {
  const {data,error}=await authDatabase().from("auth_sessions").update({verification_expires_at:null}).eq("token_hash",tokenHash(session.token)).eq("kind","customer").gt("verification_expires_at",new Date().toISOString()).select("user_id").maybeSingle();
  if(error)throw new AuthError("Verification storage unavailable.",503);
  if(!data)throw new AuthError("Verification already used.",403);
 }
 return session;
}
