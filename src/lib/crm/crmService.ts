import { isDemoMode } from "@/lib/runtime/environment";
/**
 * CRM & Customer Account Service
 * Provides registration, authentication, address profile management,
 * and CRM marketing email campaign broadcasting.
 * Integrates with Supabase when configured, with built-in resilient mock storage for local dev.
 */

import { getServerSupabase } from "@/lib/db";
import {
  CustomerProfile,
  RegistrationInput,
  CrmCampaignPayload,
  CrmCampaignLog,
  CustomerSegment,
  INITIAL_CUSTOMERS,
} from "../types/customer";
import { sendWelcomeEmail, sendMarketingCampaignEmail } from "../notifications/email";

// In-memory mock database store (persists across API calls in same Node runtime)
class CrmDatabase {
  private customers: Map<string, CustomerProfile> = new Map();
  private campaignLogs: CrmCampaignLog[] = [];

  constructor() {
    (isDemoMode() ? INITIAL_CUSTOMERS : []).forEach((c) => {
      this.customers.set(c.id, c);
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
    return isDemoMode() ? null : getServerSupabase();
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
