import "server-only";
import { BaseRepository } from "./base.repository";
import { CustomerProfileRow, CrmEmailCampaignRow } from "../types";

const INITIAL_CUSTOMER_PROFILES: CustomerProfileRow[] = [
  {
    id: "cust-001",
    email: "alex.gamer@example.com",
    full_name: "Alex Rivera",
    phone: "+62 812-3456-7890",
    address_line1: "Jl. Sudirman No. 45, RT.01/RW.02",
    address_line2: "Apt 12B",
    subdistrict: "Karet Tengsin",
    city: "Jakarta Pusat",
    province: "DKI Jakarta",
    postal_code: "10220",
    country: "Indonesia",
    address_label: "Home",
    delivery_notes: "Call security lobby upon arrival",
    marketing_opt_in: true,
    newsletter_frequency: "weekly",
    customer_segment: "gamer",
    hardware_preference: "intel_nvidia",
    crm_status: "vip",
    lead_source: "custom_pc_builder",
    tags: ["registered_user", "enthusiast", "high_gpu_lead"],
    total_orders: 3,
    total_spent: 48500000,
    created_at: "2026-08-15T10:30:00Z",
  },
  {
    id: "cust-002",
    email: "budi.builder@techcorp.id",
    full_name: "Budi Santoso",
    phone: "+62 819-8765-4321",
    address_line1: "Jl. Boulevard Barat Raya Blok XC No. 8",
    subdistrict: "Kelapa Gading Barat",
    city: "Jakarta Utara",
    province: "DKI Jakarta",
    postal_code: "14240",
    country: "Indonesia",
    address_label: "Workshop",
    delivery_notes: "Deliver to Hardware Lab 2nd floor",
    marketing_opt_in: true,
    newsletter_frequency: "drops_only",
    customer_segment: "pc_builder",
    hardware_preference: "amd",
    crm_status: "active_customer",
    lead_source: "ecommerce_registration",
    tags: ["registered_user", "custom_watercooling"],
    total_orders: 2,
    total_spent: 32000000,
    created_at: "2026-08-28T14:15:00Z",
  },
  {
    id: "cust-003",
    email: "citra.vfx@studio.com",
    full_name: "Citra Lestari",
    phone: "+62 856-1122-3344",
    address_line1: "Jl. Senopati No. 88",
    address_line2: "Studio 3",
    subdistrict: "Selong",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postal_code: "12110",
    country: "Indonesia",
    address_label: "Office",
    delivery_notes: "Reception desk open 09:00 - 18:00",
    marketing_opt_in: false,
    newsletter_frequency: "monthly",
    customer_segment: "creator",
    hardware_preference: "all",
    crm_status: "lead",
    lead_source: "social_media_campaign",
    tags: ["lead", "workstation_inquiry"],
    total_orders: 0,
    total_spent: 0,
    created_at: "2026-09-02T09:00:00Z",
  },
];

export class CustomersRepository extends BaseRepository<CustomerProfileRow> {
  constructor() {
    super("customer_profiles", INITIAL_CUSTOMER_PROFILES);
  }

  async findByEmail(email: string): Promise<CustomerProfileRow | null> {
    return this.findOne({ email: email.toLowerCase().trim() });
  }

  async searchProfiles(filters: {
    search?: string;
    segment?: string;
    optInOnly?: boolean;
  }): Promise<CustomerProfileRow[]> {
    let results = await this.findMany();

    if (filters.segment && filters.segment !== "all") {
      results = results.filter((c) => c.customer_segment === filters.segment);
    }

    if (filters.optInOnly) {
      results = results.filter((c) => c.marketing_opt_in);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.city.toLowerCase().includes(q)
      );
    }

    return results;
  }
}

export class CrmCampaignsRepository extends BaseRepository<CrmEmailCampaignRow> {
  constructor() {
    super("crm_email_campaigns", []);
  }
}

export const customersRepository = new CustomersRepository();
export const crmCampaignsRepository = new CrmCampaignsRepository();
