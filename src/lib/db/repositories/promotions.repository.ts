import "server-only";
import { BaseRepository } from "./base.repository";
import { Promotion } from "../types";

const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: "promo-fest2026",
    code: "WHITEFEST2026",
    title: "White Edition Build Festival",
    description: "Discount of Rp 500.000 for full custom rigs with all-white aesthetic chassis and coolers.",
    discount_type: "fixed_amount",
    discount_value: 500000,
    min_spend: 15000000,
    max_discount: 500000,
    is_active: true,
    start_date: "2026-09-01T00:00:00Z",
    end_date: "2026-09-30T23:59:59Z",
    usage_count: 18,
    usage_limit: 100,
    created_at: "2026-09-01T08:00:00Z",
  },
  {
    id: "promo-rtxsuper",
    code: "RTXSUPER10",
    title: "GeForce RTX 40-Super Launch Deal",
    description: "10% off selected GeForce RTX 4070 Ti SUPER & 4080 SUPER standalone cards.",
    discount_type: "percentage",
    discount_value: 10,
    min_spend: 10000000,
    max_discount: 1500000,
    is_active: true,
    start_date: "2026-09-05T00:00:00Z",
    end_date: "2026-10-15T23:59:59Z",
    usage_count: 42,
    usage_limit: 250,
    created_at: "2026-09-05T10:00:00Z",
  },
  {
    id: "promo-clickcollect",
    code: "FLAGSHIPFREE",
    title: "Flagship Click & Collect Bonus",
    description: "Instant Rp 150.000 store voucher for picking up your custom rig at our Mangga Dua Flagship.",
    discount_type: "fixed_amount",
    discount_value: 150000,
    min_spend: 5000000,
    is_active: true,
    start_date: "2026-08-01T00:00:00Z",
    end_date: "2026-12-31T23:59:59Z",
    usage_count: 85,
    created_at: "2026-08-01T00:00:00Z",
  },
];

export class PromotionsRepository extends BaseRepository<Promotion> {
  constructor() {
    super("promotions", INITIAL_PROMOTIONS);
  }

  async findByCode(code: string): Promise<Promotion | null> {
    return this.findOne({ code: code.toUpperCase().trim() });
  }

  async getActivePromotions(): Promise<Promotion[]> {
    const all = await this.findMany();
    const now = new Date();
    return all.filter((p) => {
      if (!p.is_active) return false;
      if (p.start_date && new Date(p.start_date) > now) return false;
      if (p.end_date && new Date(p.end_date) < now) return false;
      if (p.usage_limit && p.usage_count >= p.usage_limit) return false;
      return true;
    });
  }
}

export const promotionsRepository = new PromotionsRepository();
