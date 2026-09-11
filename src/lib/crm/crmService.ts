/**
 * CRM & Customer Account Service
 * Provides registration, authentication, address profile management,
 * and CRM marketing email campaign broadcasting.
 * Integrates with Supabase when configured, with built-in resilient mock storage for local dev.
 */

import { createClient } from "@supabase/supabase-js";
import {
  CustomerProfile,
  RegistrationInput,
  CrmCampaignPayload,
  CrmCampaignLog,
  CustomerSegment,
} from "../types/customer";
import { sendWelcomeEmail, sendMarketingCampaignEmail } from "../notifications/email";

// Default Initial Seed Customers for realistic CRM exploration
const INITIAL_CUSTOMERS: CustomerProfile[] = [
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

// In-memory mock database store (persists across API calls in same Node runtime)
class CrmDatabase {
  private customers: Map<string, CustomerProfile> = new Map();
  private credentials: Map<string, string> = new Map(); // email -> password
  private campaignLogs: CrmCampaignLog[] = [];

  constructor() {
    INITIAL_CUSTOMERS.forEach((c) => {
      this.customers.set(c.id, c);
      this.credentials.set(c.email.toLowerCase(), "Password123!");
    });

    this.campaignLogs.push({
      id: "camp-001",
      campaignName: "RTX 40-Super Clearance Drop",
      subject: "⚡ VIP Drop: Exclusive RTX 4080 Super Bundles + Free 24h Build",
      targetSegment: "gamer",
      recipientsCount: 42,
      sentAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      status: "sent",
    });
  }

  private getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key && !url.includes("placeholder")) {
      return createClient(url, key);
    }
    return null;
  }

  async register(input: RegistrationInput): Promise<{ user: CustomerProfile; error?: string }> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check duplicate
    const existing = Array.from(this.customers.values()).find(
      (c) => c.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      return { user: existing, error: "An account with this email address already exists. Please sign in instead." };
    }

    const newId = `cust-${Date.now()}`;
    const newCustomer: CustomerProfile = {
      id: newId,
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      address: {
        street: input.street.trim(),
        unit: input.unit?.trim() || "",
        subdistrict: input.subdistrict.trim(),
        city: input.city.trim(),
        province: input.province.trim(),
        postalCode: input.postalCode.trim(),
        country: input.country || "Indonesia",
        label: input.addressLabel || "Home",
        deliveryNotes: input.deliveryNotes?.trim() || "",
      },
      marketing: {
        marketingOptIn: !!input.marketingOptIn,
        newsletterFrequency: input.newsletterFrequency || "weekly",
        customerSegment: input.customerSegment || "gamer",
        hardwarePreference: input.hardwarePreference || "all",
        whatsappUpdates: input.whatsappUpdates ?? true,
      },
      crm: {
        status: "lead",
        leadSource: "ecommerce_registration",
        tags: ["registered_user", input.customerSegment || "gamer"],
        registeredAt: new Date().toISOString(),
        totalOrders: 0,
        totalSpent: 0,
      },
    };

    // Store in memory
    this.customers.set(newId, newCustomer);
    if (input.password) {
      this.credentials.set(normalizedEmail, input.password);
    }

    // Try Supabase sync if configured
    const supabase = this.getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("customer_profiles").insert({
          id: newId,
          email: newCustomer.email,
          full_name: newCustomer.fullName,
          phone: newCustomer.phone,
          address_line1: newCustomer.address.street,
          address_line2: newCustomer.address.unit,
          subdistrict: newCustomer.address.subdistrict,
          city: newCustomer.address.city,
          province: newCustomer.address.province,
          postal_code: newCustomer.address.postalCode,
          country: newCustomer.address.country,
          address_label: newCustomer.address.label,
          delivery_notes: newCustomer.address.deliveryNotes,
          marketing_opt_in: newCustomer.marketing.marketingOptIn,
          newsletter_frequency: newCustomer.marketing.newsletterFrequency,
          customer_segment: newCustomer.marketing.customerSegment,
          hardware_preference: newCustomer.marketing.hardwarePreference,
          crm_status: newCustomer.crm.status,
          lead_source: newCustomer.crm.leadSource,
          tags: newCustomer.crm.tags,
        });
      } catch (err) {
        console.warn("[CRM] Supabase insert skipped/failed, using fallback store:", err);
      }
    }

    // Dispatch welcome email asynchronously
    sendWelcomeEmail(newCustomer).catch((err) => {
      console.error("[CRM] Error sending welcome onboarding email:", err);
    });

    return { user: newCustomer };
  }

  async authenticate(email: string, password?: string): Promise<{ user?: CustomerProfile; error?: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const foundCustomer = Array.from(this.customers.values()).find(
      (c) => c.email.toLowerCase() === normalizedEmail
    );

    if (!foundCustomer) {
      return { error: "No customer account found with this email. Please check your spelling or create an account." };
    }

    // If password supplied, verify password
    const storedPassword = this.credentials.get(normalizedEmail);
    if (password && storedPassword && storedPassword !== password) {
      return { error: "Incorrect password. Please verify and try again." };
    }

    return { user: foundCustomer };
  }

  getCustomerById(id: string): CustomerProfile | undefined {
    return this.customers.get(id);
  }

  getCustomerByEmail(email: string): CustomerProfile | undefined {
    const norm = email.trim().toLowerCase();
    return Array.from(this.customers.values()).find(
      (c) => c.email.toLowerCase() === norm
    );
  }

  async updateProfile(id: string, updates: Partial<CustomerProfile>): Promise<CustomerProfile | null> {
    const customer = this.customers.get(id);
    if (!customer) return null;

    const updated: CustomerProfile = {
      ...customer,
      ...updates,
      address: {
        ...customer.address,
        ...(updates.address || {}),
      },
      marketing: {
        ...customer.marketing,
        ...(updates.marketing || {}),
      },
      crm: {
        ...customer.crm,
        ...(updates.crm || {}),
      },
    };

    this.customers.set(id, updated);
    return updated;
  }

  listCustomers(filter?: {
    search?: string;
    segment?: CustomerSegment | "all";
    optInOnly?: boolean;
  }): CustomerProfile[] {
    let result = Array.from(this.customers.values());

    if (filter?.optInOnly) {
      result = result.filter((c) => c.marketing.marketingOptIn);
    }

    if (filter?.segment && filter.segment !== "all") {
      result = result.filter((c) => c.marketing.customerSegment === filter.segment);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.address.city.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.crm.registeredAt).getTime() - new Date(a.crm.registeredAt).getTime());
  }

  getCrmStats() {
    const all = Array.from(this.customers.values());
    const totalLeads = all.length;
    const optedInCount = all.filter((c) => c.marketing.marketingOptIn).length;
    const optInRate = totalLeads > 0 ? Math.round((optedInCount / totalLeads) * 100) : 0;

    const segmentBreakdown = {
      gamer: all.filter((c) => c.marketing.customerSegment === "gamer").length,
      pc_builder: all.filter((c) => c.marketing.customerSegment === "pc_builder").length,
      creator: all.filter((c) => c.marketing.customerSegment === "creator").length,
      enterprise: all.filter((c) => c.marketing.customerSegment === "enterprise").length,
      general: all.filter((c) => c.marketing.customerSegment === "general").length,
    };

    return {
      totalLeads,
      optedInCount,
      optInRate,
      segmentBreakdown,
      recentCampaignsCount: this.campaignLogs.length,
    };
  }

  async broadcastCampaign(payload: CrmCampaignPayload): Promise<{
    success: boolean;
    sentCount: number;
    campaignLog: CrmCampaignLog;
  }> {
    let recipients = Array.from(this.customers.values());

    // Target filtering
    if (payload.targetSegment === "opted_in") {
      recipients = recipients.filter((c) => c.marketing.marketingOptIn);
    } else if (payload.targetSegment !== "all") {
      recipients = recipients.filter(
        (c) => c.marketing.customerSegment === payload.targetSegment && c.marketing.marketingOptIn
      );
    } else {
      recipients = recipients.filter((c) => c.marketing.marketingOptIn);
    }

    let sentSuccess = 0;
    for (const customer of recipients) {
      const ok = await sendMarketingCampaignEmail({
        toEmail: customer.email,
        customerName: customer.fullName,
        subject: payload.subject,
        headline: payload.headline,
        messageBody: payload.messageBody,
        promoCode: payload.promoCode,
        ctaText: payload.ctaText,
        ctaUrl: payload.ctaUrl,
        campaignName: payload.campaignName,
      });
      if (ok) sentSuccess++;
    }

    const campaignLog: CrmCampaignLog = {
      id: `camp-${Date.now()}`,
      campaignName: payload.campaignName,
      subject: payload.subject,
      targetSegment: payload.targetSegment,
      recipientsCount: sentSuccess,
      sentAt: new Date().toISOString(),
      status: sentSuccess > 0 ? "sent" : "failed",
    };

    this.campaignLogs.unshift(campaignLog);

    return {
      success: true,
      sentCount: sentSuccess,
      campaignLog,
    };
  }

  getCampaignLogs(): CrmCampaignLog[] {
    return this.campaignLogs;
  }
}

// Global Singleton for Node runtime
declare global {
  // eslint-disable-next-line no-var
  var __crmDatabase: CrmDatabase | undefined;
}

export const crmService = global.__crmDatabase || (global.__crmDatabase = new CrmDatabase());
