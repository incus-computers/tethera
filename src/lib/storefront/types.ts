export type StoreLocale = "id" | "en";
export type PolicyKey = "privacy" | "terms" | "warranty" | "shipping";
export interface PolicyDocument { title: string; sections: { heading: string; text: string }[]; }
export interface StorefrontProfile {
  status: "unconfigured" | "draft" | "published" | "demo";
  brand: string; legalName: string | null; supportEmail: string | null; whatsapp: string | null;
  pickupAddress: string | null; openingHours: string | null; timeZone: "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura";
  policyVersion: string; policyHash: string; effectiveDate: string | null;
  documents: Record<PolicyKey, Record<StoreLocale, PolicyDocument>>;
}
export interface PolicyAcceptance { accepted: true; version: string; hash: string; locale: StoreLocale; }
