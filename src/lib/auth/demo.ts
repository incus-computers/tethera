import "server-only";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, randomInt } from "crypto";
import { CustomerProfile, INITIAL_CUSTOMERS } from "@/lib/types/customer";
import { isDemoMode } from "@/lib/runtime/environment";
import { AuthError } from "./errors";

export const DEMO_ROLES = ["SUPER_ADMIN", "CATALOG_MANAGER", "FULFILLMENT_OPERATOR", "SUPPORT_AGENT"] as const;
export const DEMO_PASSWORD = "DemoOnly-2026!";
export function normaliseIdentifier(value: string): string {
  if (typeof value !== "string" || value.length > 254) throw new AuthError("Invalid contact.", 400);
  const raw = value.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return raw;
  let digits = raw.replace(/[\s()+-]/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (!/^62\d{8,13}$/.test(digits)) throw new AuthError("Use an email or complete Indonesian phone number.", 400);
  return "+" + digits;
}
function hash(password: string, salt: string) { return scryptSync(password, salt, 64); }
function makePassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return { salt, value: hash(password, salt) };
}
class DemoAuth {
  accounts = new Map<string, { id: string; contact: string; password?: ReturnType<typeof makePassword>; profile: CustomerProfile; role?: string }>();
  sessions = new Map<string, { id: string; kind: string; expires: number; contact: string; verifiedUntil?: number }>();
  otps = new Map<string, { code: string; expires: number; attempts: number }>();
  limits = new Map<string, { count: number; expires: number }>();
  constructor() {
    for (const profile of INITIAL_CUSTOMERS) {
      this.accounts.set(profile.id, { id: profile.id, contact: normaliseIdentifier(profile.email), profile: structuredClone(profile), password: makePassword(DEMO_PASSWORD) });
    }
    for (const role of DEMO_ROLES) {
      const id = "demo-" + role.toLowerCase();
      const profile = structuredClone(INITIAL_CUSTOMERS[0]);
      Object.assign(profile, { id, email: role.toLowerCase() + "@demo.example", fullName: role.replaceAll("_", " ") });
      this.accounts.set(id, { id, contact: profile.email, profile, role, password: makePassword(DEMO_PASSWORD) });
    }
  }
  login(identifier: string, password: string, admin: boolean) {
    const contact = normaliseIdentifier(identifier);
    const account = Array.from(this.accounts.values()).find(a => admin ? a.contact === contact && a.role : !a.role && a.contact === contact);
    const dummy = makePassword(DEMO_PASSWORD);
    const credential = account?.password || dummy;
    const valid = timingSafeEqual(hash(password, credential.salt), credential.value);
    if (!account || !account.password || !valid) throw new AuthError("Invalid credentials.");
    return account;
  }
  otp(contact: string) {
    const code = String(randomInt(100000, 1000000));
    this.otps.set(contact, { code, expires: Date.now() + 600000, attempts: 0 });
    return code;
  }
  verify(contact: string, code: string) {
    const record = this.otps.get(contact);
    if (!record || record.expires < Date.now() || ++record.attempts > 5 || record.code !== code) throw new AuthError("Invalid or expired verification code.", 400);
    this.otps.delete(contact);
    let account = Array.from(this.accounts.values()).find(a => !a.role && a.contact === contact);
    if (!account) {
      const id = randomUUID(), profile = structuredClone(INITIAL_CUSTOMERS[0]);
      Object.assign(profile, { id, email: contact.includes("@") ? contact : contact.slice(1) + "@phone.invalid", phone: contact.startsWith("+") ? contact : "", fullName: "" });
      profile.address = { street: "", subdistrict: "", city: "", province: "", postalCode: "", country: "Indonesia", label: "Home" };
      profile.crm = { status: "lead", leadSource: "demo", tags: [], registeredAt: new Date().toISOString(), totalOrders: 0, totalSpent: 0 };
      profile.marketing.marketingOptIn = false;
      account = { id, contact, profile };
      this.accounts.set(id, account);
    }
    return account;
  }
  setPassword(id: string, password: string) {
    const account = this.accounts.get(id);
    if (!account) throw new AuthError("Account not found.");
    account.password = makePassword(password);
  }
}

const globalDemo = globalThis as typeof globalThis & { __isolatedDemoAuth?: DemoAuth };
export function demoAuth() {
  if (!isDemoMode()) throw new AuthError("Demo authentication is disabled.", 404);
  return globalDemo.__isolatedDemoAuth ||= new DemoAuth();
}
