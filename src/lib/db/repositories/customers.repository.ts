import "server-only";
import { BaseRepository } from "./base.repository";
import { CustomerProfileRow } from "../types";
import { INITIAL_CUSTOMERS } from "../../types/customer";

const INITIAL_CUSTOMER_PROFILES: CustomerProfileRow[] = INITIAL_CUSTOMERS.map((c) => ({
  id: c.id,
  email: c.email,
  full_name: c.fullName,
  phone: c.phone,
  address_line1: c.address.street,
  address_line2: c.address.unit || null,
  subdistrict: c.address.subdistrict,
  city: c.address.city,
  province: c.address.province,
  postal_code: c.address.postalCode,
  country: c.address.country,
  address_label: c.address.label,
  delivery_notes: c.address.deliveryNotes || null,
  marketing_opt_in: c.marketing.marketingOptIn,
  newsletter_frequency: c.marketing.newsletterFrequency,
  customer_segment: c.marketing.customerSegment,
  hardware_preference: c.marketing.hardwarePreference,
  crm_status: c.crm.status,
  lead_source: c.crm.leadSource,
  tags: c.crm.tags,
  total_orders: c.crm.totalOrders,
  total_spent: c.crm.totalSpent,
  created_at: c.crm.registeredAt,
}));

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

export const customersRepository = new CustomersRepository();
