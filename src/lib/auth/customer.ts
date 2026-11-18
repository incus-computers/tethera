import "server-only";
import { normalizeIndonesianPhone } from "@/lib/i18n/indonesia";
import { NextRequest } from "next/server";
import { CustomerProfile, RegistrationInput } from "@/lib/types/customer";
import { isDemoMode } from "@/lib/runtime/environment";
import { demoAuth, normaliseIdentifier } from "./demo";
import { authDatabase, readSession, consumeVerification } from "./session";
import { AuthError } from "./errors";

export function profileFromRow(row: any): CustomerProfile {
  return { id: row.id, email: row.email, fullName: row.full_name, phone: row.phone || "",
    address: { street: row.address_line1, unit: row.address_line2 || "", subdistrict: row.subdistrict, city: row.city, province: row.province, postalCode: row.postal_code, country: row.country || "Indonesia", label: row.address_label || "Home", deliveryNotes: row.delivery_notes || "" },
    marketing: { marketingOptIn: !!row.marketing_opt_in, newsletterFrequency: row.newsletter_frequency || "weekly", customerSegment: row.customer_segment || "general", hardwarePreference: row.hardware_preference || "all", whatsappUpdates: !!row.whatsapp_updates },
    crm: { status: row.crm_status || "lead", leadSource: row.lead_source || "registration", tags: row.tags || [], registeredAt: row.created_at || new Date().toISOString(), totalOrders: row.total_orders || 0, totalSpent: row.total_spent || 0 }
  };
}
export async function customerSession(req: NextRequest) {
  const session = await readSession(req, "customer");
  if (!session) throw new AuthError("Customer sign-in required.");
  return session;
}
export async function customerProfile(req: NextRequest) {
  const session = await customerSession(req);
  if (isDemoMode()) { if(!session.profile?.fullName) throw new AuthError("Complete your verified registration.",409); return session.profile; }
  const { data, error } = await authDatabase().from("customer_profiles").select("*").eq("user_id", session.id).maybeSingle();
  if (error) throw new AuthError("Profile storage unavailable.", 503);
  if (!data) throw new AuthError("Complete your verified registration.", 409);
  return profileFromRow(data);
}
function text(value: unknown, max = 250) { if (typeof value !== "string" || value.length > max) throw new AuthError("Invalid profile field.", 400); return value.trim(); }
export function profilePatch(input: Partial<CustomerProfile>) {
  const patch: Record<string, unknown> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AuthError("Invalid profile.", 400);
  if (Object.keys(input).some(k => !["fullName","phone","address","marketing"].includes(k))) throw new AuthError("Identity/contact changes require a separate verified flow.", 400);
  if (input.fullName !== undefined) { const name = text(input.fullName); if (name.length < 2) throw new AuthError("Full name is required.", 400); patch.full_name = name; }
  if (input.phone !== undefined) { try { patch.phone=input.phone?normalizeIndonesianPhone(input.phone):""; } catch(error) { throw new AuthError((error as Error).message,400); } }
  const fields: Record<string,string> = { street:"address_line1",unit:"address_line2",subdistrict:"subdistrict",city:"city",province:"province",postalCode:"postal_code",label:"address_label",deliveryNotes:"delivery_notes" };
  if (input.address) {
    for (const [key,value] of Object.entries(input.address)) {
      if (key === "country") { if (value !== "Indonesia") throw new AuthError("Only Indonesian addresses are supported.", 400); continue; }
      if (!fields[key]) throw new AuthError("Invalid address field.", 400);
      if (key === "label" && !["Home","Office","Workshop","Other"].includes(value)) throw new AuthError("Invalid address label.", 400);
      patch[fields[key]] = text(value, key === "deliveryNotes" ? 1000 : 250);
    }
  }
  if (input.marketing) {
    const allowed: Record<string,readonly unknown[]> = { newsletterFrequency:["weekly","drops_only","monthly"],customerSegment:["gamer","pc_builder","creator","enterprise","general"],hardwarePreference:["amd","intel_nvidia","all"] };
    const names: Record<string,string> = { marketingOptIn:"marketing_opt_in",newsletterFrequency:"newsletter_frequency",customerSegment:"customer_segment",hardwarePreference:"hardware_preference",whatsappUpdates:"whatsapp_updates" };
    for (const [key,value] of Object.entries(input.marketing)) {
      if (!names[key] || (allowed[key] ? !allowed[key].includes(value) : typeof value !== "boolean")) throw new AuthError("Invalid preference.", 400);
      patch[names[key]]=value;
    }
  }
  return patch;
}
export async function updateCustomer(req: NextRequest, updates: Partial<CustomerProfile>) {
  const current = await customerProfile(req), patch = profilePatch(updates);
  if (isDemoMode()) {
    const account = demoAuth().accounts.get((await customerSession(req)).id)!;
    account.profile = { ...current, phone: updates.phone !== undefined ? String(patch.phone) : current.phone, fullName: updates.fullName?.trim() || current.fullName, address: { ...current.address, ...updates.address }, marketing: { ...current.marketing, ...updates.marketing } };
    return account.profile;
  }
  const { data, error } = await authDatabase().from("customer_profiles").update(patch).eq("id", current.id).eq("user_id", (await customerSession(req)).id).select("*").single();
  if (error || !data) throw new AuthError("Profile update failed.", 503);
  return profileFromRow(data);
}
export async function finishRegistration(req: NextRequest, input: RegistrationInput) {
  const session = await customerSession(req);
  if (typeof input.password !== "string" || input.password.length < 12 || input.password.length > 128 || input.termsAccepted !== true) throw new AuthError("Accept terms and use a password of 12–128 characters.", 400);
  // Never attach an account or authorise orders using an unverified secondary contact.
  const claimed = session.contact.includes("@") ? input.email?.trim().toLowerCase() : input.phone?.replace(/[\s()-]/g, "");
  const phone = (claimed || "").startsWith("0") ? "+62" + claimed!.slice(1) : claimed;
  if ((session.contact.includes("@") ? claimed : phone) !== session.contact) throw new AuthError("Verified contact does not match registration.", 403);
  const patch = profilePatch({ fullName: input.fullName, phone: input.phone || "", address: { street: input.street || "",unit: input.unit || "",subdistrict: input.subdistrict || "",city: input.city || "",province: input.province || "",postalCode: input.postalCode || "",country:"Indonesia",label:input.addressLabel || "Home",deliveryNotes:input.deliveryNotes || "" }, marketing: { marketingOptIn: !!input.marketingOptIn,newsletterFrequency: input.newsletterFrequency || "weekly",customerSegment: input.customerSegment || "general",hardwarePreference: input.hardwarePreference || "all",whatsappUpdates: input.whatsappUpdates ?? false } });
  if (isDemoMode()) {
    const account = demoAuth().accounts.get(session.id)!;
    if (account.password) throw new AuthError("This account already exists. Sign in instead.", 409);
    await consumeVerification(req);
    demoAuth().setPassword(session.id, input.password);
    account.profile.fullName = input.fullName.trim();
    account.profile.phone = String(patch.phone || "");
    account.profile.address = { ...account.profile.address, street: input.street || "", unit: input.unit || "", subdistrict: input.subdistrict || "",city:input.city || "",province:input.province || "",postalCode:input.postalCode || "",label:input.addressLabel || "Home" };
    account.profile.marketing.marketingOptIn = !!input.marketingOptIn;
    return account.profile;
  }
  const database = authDatabase();
  const { data: existing, error: lookupError } = await database.from("customer_profiles").select("id").eq("user_id", session.id).maybeSingle();
  if (lookupError) throw new AuthError("Profile storage unavailable.", 503);
  if (existing) throw new AuthError("This account already exists. Sign in instead.", 409);
  await consumeVerification(req);
  const { error: passwordError } = await database.auth.admin.updateUserById(session.id, { password: input.password });
  if (passwordError) throw new AuthError("Could not set password.", 400);
  const { data, error } = await database.from("customer_profiles").insert({ id:session.id,user_id:session.id,email:session.email,phone:session.contact.startsWith("+")?session.contact:"",...patch }).select("*").single();
  if (error || !data) throw new AuthError("Could not save registration. Contact support if this continues.", 503);
  return profileFromRow(data);
}
