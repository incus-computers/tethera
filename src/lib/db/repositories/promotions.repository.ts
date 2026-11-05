import "server-only";
import { BaseRepository } from "./base.repository";
import {
  Promotion,
  PromotionValidationParams,
  PromotionValidationResult,
} from "../types";

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
      const startDateStr = p.starts_at || p.start_date;
      if (startDateStr && new Date(startDateStr) > now) return false;
      const endDateStr = p.ends_at || p.end_date;
      if (endDateStr && new Date(endDateStr) < now) return false;
      const limit = p.max_global_uses ?? p.usage_limit;
      if (limit && p.usage_count >= limit) return false;
      return true;
    });
  }

  /**
   * Validates a promotion against active status, date windows, usage caps,
   * minimum spend thresholds, and SKU/category restrictions.
   */
  async validatePromotion(
    code: string,
    params: PromotionValidationParams
  ): Promise<PromotionValidationResult> {
    if (!code || typeof code !== "string") {
      return {
        valid: false,
        discountAmount: 0,
        message: "Please enter a valid promotion code.",
      };
    }

    const promo = await this.findByCode(code);
    if (!promo) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Promotion code '${code.toUpperCase()}' not found.`,
      };
    }

    if (!promo.is_active) {
      return {
        valid: false,
        discountAmount: 0,
        message: "This promotion code is currently inactive.",
        promotion: promo,
      };
    }

    const now = new Date();
    const startDateStr = promo.starts_at || promo.start_date;
    if (startDateStr && new Date(startDateStr) > now) {
      return {
        valid: false,
        discountAmount: 0,
        message: "This promotion code has not started yet.",
        promotion: promo,
      };
    }

    const endDateStr = promo.ends_at || promo.end_date;
    if (endDateStr && new Date(endDateStr) < now) {
      return {
        valid: false,
        discountAmount: 0,
        message: "This promotion code has expired.",
        promotion: promo,
      };
    }

    const globalLimit = promo.max_global_uses ?? promo.usage_limit;
    if (globalLimit !== undefined && promo.usage_count >= globalLimit) {
      return {
        valid: false,
        discountAmount: 0,
        message: "This promotion code usage limit reached.",
        promotion: promo,
      };
    }

    const subtotal = Math.max(0, Number(params.subtotal || 0));
    if (promo.min_spend !== undefined && subtotal < promo.min_spend) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Minimum spend of Rp ${promo.min_spend.toLocaleString("id-ID")} required for this voucher.`,
        promotion: promo,
      };
    }

    // Check eligible items or categories if defined
    let eligibleSubtotal = subtotal;
    if (
      params.items &&
      Array.isArray(params.items) &&
      params.items.length > 0 &&
      ((promo.eligible_categories && promo.eligible_categories.length > 0) ||
        (promo.eligible_product_ids && promo.eligible_product_ids.length > 0))
    ) {
      const matchedItems = params.items.filter((item) => {
        const prodId = item.product_id || item.id;
        const cat = item.category || item.category_slug;
        const matchesCategory =
          promo.eligible_categories && cat
            ? promo.eligible_categories.some(
                (c) => c.toLowerCase() === cat.toLowerCase()
              )
            : false;
        const matchesProduct =
          promo.eligible_product_ids && prodId
            ? promo.eligible_product_ids.includes(prodId)
            : false;
        return matchesCategory || matchesProduct;
      });

      if (matchedItems.length === 0) {
        return {
          valid: false,
          discountAmount: 0,
          message: "No eligible products in cart for this promotion code.",
          promotion: promo,
        };
      }

      eligibleSubtotal = matchedItems.reduce((acc, item) => {
        const p = Number(item.unit_price ?? item.price ?? 0);
        const q = Number(item.quantity ?? 1);
        return acc + p * q;
      }, 0);
    }

    let discountAmount = 0;
    const normType = (promo.discount_type || "percentage").toLowerCase();

    if (normType === "percentage") {
      const calc = Math.round((eligibleSubtotal * Math.min(100, promo.discount_value)) / 100);
      discountAmount = promo.max_discount ? Math.min(calc, promo.max_discount) : calc;
    } else if (normType === "fixed_amount") {
      discountAmount = Math.min(subtotal, promo.discount_value);
    } else if (normType === "free_shipping") {
      const shippingFee = Math.max(0, Number(params.shippingFee || 0));
      discountAmount = promo.discount_value > 0 ? Math.min(shippingFee, promo.discount_value) : shippingFee;
    } else if (normType === "buy_x_get_y" && promo.buy_x_get_y && params.items) {
      const buySku = promo.buy_x_get_y.buy_sku;
      const getSku = promo.buy_x_get_y.get_sku;
      const buyItem = params.items.find((i) => i.id === buySku || i.product_id === buySku);
      const getItem = params.items.find((i) => i.id === getSku || i.product_id === getSku);
      if (buyItem && (buyItem.quantity || 1) >= promo.buy_x_get_y.buy_quantity && getItem) {
        const getItemPrice = Number(getItem.unit_price ?? getItem.price ?? 0);
        discountAmount = Math.round((getItemPrice * (promo.buy_x_get_y.get_discount_percent || 100)) / 100);
      } else {
        return {
          valid: false,
          discountAmount: 0,
          message: "Bundle requirements for Buy X Get Y promotion not met.",
          promotion: promo,
        };
      }
    }

    return {
      valid: true,
      discountAmount,
      discountType: promo.discount_type,
      message: `${promo.title}: ${normType === "percentage" ? `${promo.discount_value}% off` : "Discount applied"}`,
      code: promo.code,
      promotion: promo,
    };
  }

  /**
   * Atomically records promotion redemption and tracks cumulative discount given.
   */
  async recordUsage(promoIdOrCode: string, discountGiven: number = 0): Promise<Promotion | null> {
    const promo =
      (await this.findById(promoIdOrCode)) || (await this.findByCode(promoIdOrCode));
    if (!promo) return null;

    const currentCount = Number(promo.usage_count || 0);
    const currentDiscount = Number(promo.total_discount_given || 0);

    return this.update(promo.id, {
      usage_count: currentCount + 1,
      total_discount_given: currentDiscount + Math.max(0, Math.round(discountGiven)),
      updated_at: new Date().toISOString(),
    });
  }
}

export const promotionsRepository = new PromotionsRepository();
