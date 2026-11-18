import "server-only";
import { createHash } from "node:crypto";
import { isDemoMode } from "@/lib/runtime/environment";
import { draftPolicies } from "./draftPolicies";
import { businessConfig } from "./businessConfig";
import type { PolicyAcceptance, PolicyKey, StorefrontProfile } from "./types";
import { CheckoutError } from "@/lib/checkout/errors";

function hash(value: object) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
const draft = (): StorefrontProfile => ({ status: "unconfigured", brand: "Incus Computers", legalName: null, supportEmail: null, whatsapp: null,
  pickupAddress: null, openingHours: null, timeZone: "Asia/Jakarta", policyVersion: "draft-v1", policyHash: hash(draftPolicies), effectiveDate: null, documents: draftPolicies });
export function policySnapshot(profile:StorefrontProfile){
  return {legalName:profile.legalName,supportEmail:profile.supportEmail,pickupAddress:profile.pickupAddress,openingHours:profile.openingHours,policyVersion:profile.policyVersion,effectiveDate:profile.effectiveDate,documents:profile.documents};
}
function required(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error("Invalid business configuration.");
  return value.trim();
}
export function parseStorefrontProfile(raw: string): StorefrontProfile {
  if (raw.length > 60000) throw new Error("Business configuration is too large.");
  const config = JSON.parse(raw);
  if (config.confirmed !== true) throw new Error("Business details require confirmation.");
  const base = draft();
  const legalName = required(config.legalName, 200), supportEmail = required(config.supportEmail, 200);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(supportEmail) || /[\r\n]/.test(supportEmail)) throw new Error("Invalid support email.");
  const whatsapp = config.whatsapp ? required(config.whatsapp, 16) : null;
  if (whatsapp && !/^628\d{7,11}$/.test(whatsapp)) throw new Error("Use an Indonesian WhatsApp number beginning 628.");
  if (!["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"].includes(config.timeZone)) throw new Error("Select the actual business time zone.");
  const policyVersion = required(config.policyVersion, 60);
  if (!/^[a-zA-Z0-9._-]+$/.test(policyVersion)) throw new Error("Invalid policy version.");
  if (config.policiesReviewed === true) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(config.effectiveDate) || Number.isNaN(Date.parse(config.effectiveDate)) || new Date(config.effectiveDate).toISOString().slice(0,10)!==config.effectiveDate) throw new Error("Invalid policy effective date.");
    required(config.reviewedBy, 120);
  }
  const documents = {} as StorefrontProfile["documents"];
  for (const key of ["privacy", "terms", "warranty", "shipping"] as PolicyKey[]) {
    documents[key] = {} as StorefrontProfile["documents"][PolicyKey];
    for (const locale of ["id", "en"] as const) {
      const doc = config.documents?.[key]?.[locale];
      if (!Array.isArray(doc?.sections) || doc.sections.length < 1 || doc.sections.length > 12) throw new Error("Provide reviewed policy sections in both languages.");
      documents[key][locale] = { title: required(doc.title, 150), sections: doc.sections.map((section: any) => ({ heading: required(section.heading, 150), text: required(section.text, 4000) })) };
    }
  }
  const pickupAddress = config.pickupAddress ? required(config.pickupAddress, 500) : null;
  const openingHours = config.openingHours ? required(config.openingHours, 500) : null;
  const publicProfile:StorefrontProfile = { ...base, status: config.policiesReviewed === true ? "published" : "draft", legalName, supportEmail, whatsapp, pickupAddress, openingHours,
    timeZone: config.timeZone, policyVersion, effectiveDate: config.policiesReviewed === true ? config.effectiveDate : null, documents };
  return { ...publicProfile, policyHash: hash(policySnapshot(publicProfile)) };
}
export function getStorefrontProfile(): StorefrontProfile {
  if (isDemoMode()) {
    const demo:StorefrontProfile={...draft(),status:"demo",legalName:"Incus Computers (DEMO)",supportEmail:businessConfig.supportEmail,whatsapp:businessConfig.whatsapp,pickupAddress:businessConfig.pickupAddress,openingHours:"Simulation only — confirm store opening hours before visiting.",policyVersion:"demo-v1"};
    return {...demo,policyHash:hash(policySnapshot(demo))};
  }
  const raw = process.env.STOREFRONT_BUSINESS_JSON;
  if (!raw) return parseStorefrontProfile(JSON.stringify(businessConfig));
  try { return parseStorefrontProfile(raw); } catch { return draft(); }
}
export function policyAcceptance(profile: StorefrontProfile, locale: "id" | "en" = "id"): PolicyAcceptance {
  return { accepted: true, version: profile.policyVersion, hash: profile.policyHash, locale };
}
export function validatePolicyAcceptance(value: unknown, profile: StorefrontProfile, collection: boolean) {
  if (profile.status !== "published" && profile.status !== "demo") throw new CheckoutError("Store contact details and policies are not yet published. Real ordering is unavailable.", 503);
  if (collection && (!profile.pickupAddress || !profile.openingHours)) throw new CheckoutError("Store collection details are not available. Choose delivery.", 409);
  const ack = value as PolicyAcceptance | null;
  if (!ack || ack.accepted !== true || !["id", "en"].includes(ack.locale)) throw new CheckoutError("Please read and accept the purchase terms and warranty policy.", 400);
  if (ack.version !== profile.policyVersion || ack.hash !== profile.policyHash) throw new CheckoutError("Store policies changed. Read the current policies and confirm again.", 409);
  return { ...policyAcceptance(profile, ack.locale), acceptedAt: new Date().toISOString(), environment: profile.status === "demo" ? "demo" : "connected", snapshot:policySnapshot(profile) };
}
