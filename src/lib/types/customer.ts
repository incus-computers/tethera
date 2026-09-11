export type CustomerSegment = "gamer" | "pc_builder" | "creator" | "enterprise" | "general";
export type HardwarePreference = "amd" | "intel_nvidia" | "all";
export type NewsletterFrequency = "weekly" | "drops_only" | "monthly";
export type CrmStatus = "lead" | "active_customer" | "vip";

export interface CustomerAddress {
  street: string;
  unit?: string;
  subdistrict: string; // Kecamatan / Kelurahan
  city: string;
  province: string;
  postalCode: string;
  country: string;
  label: "Home" | "Office" | "Workshop" | "Other";
  deliveryNotes?: string;
}

export interface CustomerMarketingPreferences {
  marketingOptIn: boolean;
  newsletterFrequency: NewsletterFrequency;
  customerSegment: CustomerSegment;
  hardwarePreference: HardwarePreference;
  whatsappUpdates: boolean;
}

export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  address: CustomerAddress;
  marketing: CustomerMarketingPreferences;
  crm: {
    status: CrmStatus;
    leadSource: string;
    tags: string[];
    registeredAt: string;
    totalOrders: number;
    totalSpent: number;
  };
}

export interface RegistrationInput {
  email: string;
  password?: string;
  fullName: string;
  phone: string;
  street: string;
  unit?: string;
  subdistrict: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  addressLabel?: "Home" | "Office" | "Workshop" | "Other";
  deliveryNotes?: string;
  marketingOptIn: boolean;
  newsletterFrequency?: NewsletterFrequency;
  customerSegment?: CustomerSegment;
  hardwarePreference?: HardwarePreference;
  whatsappUpdates?: boolean;
}

export interface CrmCampaignPayload {
  campaignName: string;
  subject: string;
  previewText?: string;
  targetSegment: "all" | CustomerSegment | "opted_in";
  promoCode?: string;
  headline: string;
  messageBody: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface CrmCampaignLog {
  id: string;
  campaignName: string;
  subject: string;
  targetSegment: string;
  recipientsCount: number;
  sentAt: string;
  status: "sent" | "partial" | "failed";
}
