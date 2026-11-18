import "server-only";
import { NextRequest } from "next/server";
import { isDemoMode } from "@/lib/runtime/environment";
import { demoAuth, normaliseIdentifier } from "./demo";
import { authClient, authDatabase, limitAuth, readSession } from "./session";
import { AuthError } from "./errors";

export type AdminRole = "SUPER_ADMIN" | "CATALOG_MANAGER" | "FULFILLMENT_OPERATOR" | "SUPPORT_AGENT";
export interface AdminUser {
  id: string; username: string; email: string; name: string; role: AdminRole; clearanceLevel: number;
}
const roles: string[] = ["SUPER_ADMIN", "CATALOG_MANAGER", "FULFILLMENT_OPERATOR", "SUPPORT_AGENT"];
async function staffUser(id: string, token: string): Promise<AdminUser> {
  const { data, error } = await authDatabase().from("admin_users").select("id,email,name,role,is_active").eq("user_id", id).eq("is_active", true).maybeSingle();
  if (error) throw new AuthError("Staff directory unavailable.", 503);
  if (!data || !roles.includes(data.role)) throw new AuthError("Staff access denied.", 403);
  // getUser has already validated this token with the provider; only then inspect its AAL claim.
  let aal: string | undefined;
  try { aal = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).aal; } catch { /* deny */ }
  if (aal !== "aal2") throw new AuthError("An enrolled authenticator and verification code are required.", 403);
  return { id: data.id, username: data.email, email: data.email, name: data.name, role: data.role, clearanceLevel: data.role === "SUPER_ADMIN" ? 2 : 1 };
}
export async function authenticateAdminCredentials(identifier: string, password: string, totpCode?: string) {
  if (typeof password !== "string" || !password || password.length > 256) throw new AuthError("Invalid credentials.");
  const contact = normaliseIdentifier(identifier);
  await limitAuth("admin-login", contact);
  if (isDemoMode()) {
    const account = demoAuth().login(contact, password, true);
    const user: AdminUser = { id: account.id, username: account.contact, email: account.profile.email, name: account.profile.fullName, role: account.role as AdminRole, clearanceLevel: account.role === "SUPER_ADMIN" ? 2 : 1 };
    return { user, providerId: account.id, contact };
  }
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword(contact.includes("@") ? { email: contact, password } : { phone: contact, password });
  if (error || !data.session || !data.user) throw new AuthError("Invalid credentials.");
  const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
  const factor = factors?.totp.find(f => f.status === "verified");
  if (factorError || !factor || !/^\d{6}$/.test(totpCode || "")) throw new AuthError("Enter your authenticator code. Staff must enrol MFA before access.", 403);
  const { data: verified, error: mfaError } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totpCode! });
  if (mfaError || !verified) throw new AuthError("Invalid authenticator code.");
  const token = verified.access_token;
  const user = await staffUser(data.user.id, token);
  return { user, providerId: data.user.id, contact, token, expiresAt: Math.floor(Date.now() / 1000) + verified.expires_in };
}
export async function verifyAdminClearance(req: NextRequest, requiredLevel: "admin" | "superadmin" = "admin"): Promise<{ authorized: boolean; user?: AdminUser; error?: string }> {
  const session = await readSession(req, "admin");
  if (!session) return { authorized: false, error: "Staff sign-in required." };
  let user: AdminUser;
  if (isDemoMode()) {
    if (!session.role || !roles.includes(session.role)) return { authorized: false, error: "Staff access denied." };
    user = { id: session.id, username: session.email, email: session.email, name: session.profile!.fullName, role: session.role as AdminRole, clearanceLevel: session.role === "SUPER_ADMIN" ? 2 : 1 };
  } else {
    try { user = await staffUser(session.id, session.token); }
    catch (error) { if (error instanceof AuthError && error.status === 403) return { authorized: false, error: error.message }; throw error; }
  }
  if (requiredLevel === "superadmin" && user.role !== "SUPER_ADMIN") return { authorized: false, error: "Superadmin permission required." };
  return { authorized: true, user };
}
