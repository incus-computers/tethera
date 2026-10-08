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
  phone?: string;
  street?: string;
  unit?: string;
  subdistrict?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  addressLabel?: "Home" | "Office" | "Workshop" | "Other";
  deliveryNotes?: string;
  marketingOptIn?: boolean;
  newsletterFrequency?: NewsletterFrequency;
  customerSegment?: CustomerSegment;
  hardwarePreference?: HardwarePreference;
  whatsappUpdates?: boolean;
  leadSource?: string;
  termsAccepted?: boolean;
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

// Default Initial Seed Customers for realistic CRM and DB exploration
export const INITIAL_CUSTOMERS: CustomerProfile[] = [
  {
    id: "cust-001",
    email: "alex.gamer@example.com",
    fullName: "Alex Rivera",
    phone: "+62 812-3456-7890",
    address: {
      street: "Jl. Sudirman No. 45, RT.01/RW.02",
      unit: "Apt 12B",
      subdistrict: "Karet Tengsin",
      city: "Jakarta Pusat",
      province: "DKI Jakarta",
      postalCode: "10220",
      country: "Indonesia",
      label: "Home",
      deliveryNotes: "Call security lobby upon arrival",
    },
    marketing: {
      marketingOptIn: true,
      newsletterFrequency: "weekly",
      customerSegment: "gamer",
      hardwarePreference: "intel_nvidia",
      whatsappUpdates: true,
    },
    crm: {
      status: "vip",
      leadSource: "custom_pc_builder",
      tags: ["registered_user", "enthusiast", "high_gpu_lead"],
      registeredAt: "2026-08-15T10:30:00Z",
      totalOrders: 3,
      totalSpent: 48500000,
    },
  },
  {
    id: "cust-002",
    email: "budi.builder@techcorp.id",
    fullName: "Budi Santoso",
    phone: "+62 819-8765-4321",
    address: {
      street: "Jl. Boulevard Barat Raya Blok XC No. 8",
      subdistrict: "Kelapa Gading Barat",
      city: "Jakarta Utara",
      province: "DKI Jakarta",
      postalCode: "14240",
      country: "Indonesia",
      label: "Workshop",
      deliveryNotes: "Deliver to Hardware Lab 2nd floor",
    },
    marketing: {
      marketingOptIn: true,
      newsletterFrequency: "drops_only",
      customerSegment: "pc_builder",
      hardwarePreference: "amd",
      whatsappUpdates: true,
    },
    crm: {
      status: "active_customer",
      leadSource: "ecommerce_registration",
      tags: ["registered_user", "custom_watercooling"],
      registeredAt: "2026-08-28T14:15:00Z",
      totalOrders: 2,
      totalSpent: 32000000,
    },
  },
  {
    id: "cust-003",
    email: "citra.vfx@studio.com",
    fullName: "Citra Lestari",
    phone: "+62 856-1122-3344",
    address: {
      street: "Jl. Senopati No. 88",
      unit: "Studio 3",
      subdistrict: "Selong",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12110",
      country: "Indonesia",
      label: "Office",
      deliveryNotes: "Reception desk open 09:00 - 18:00",
    },
    marketing: {
      marketingOptIn: false,
      newsletterFrequency: "monthly",
      customerSegment: "creator",
      hardwarePreference: "all",
      whatsappUpdates: false,
    },
    crm: {
      status: "lead",
      leadSource: "direct_signup",
      tags: ["registered_user", "workstation_inquiry"],
      registeredAt: "2026-09-02T09:00:00Z",
      totalOrders: 0,
      totalSpent: 0,
    },
  },
];
