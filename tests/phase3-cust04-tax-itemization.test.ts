// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  calculateInclusiveTax,
  calculateExclusiveTax,
  calculateOrderTaxBreakdown,
  DEFAULT_PPN_RATE,
} from "@/lib/tax/taxCalculation";

describe("CUST-04 Indonesian Tax Itemization & PPN Breakdown", () => {
  describe("Tax Calculation Service: calculateInclusiveTax", () => {
    it("calculates DPP and PPN accurately from inclusive gross pricing at default 11% rate", () => {
      const gross = 11100000;
      const res = calculateInclusiveTax(gross);

      expect(res.taxRate).toBe(0.11);
      expect(res.isInclusive).toBe(true);
      expect(res.dpp).toBe(10000000);
      expect(res.taxAmount).toBe(1100000);
      expect(res.dpp + res.taxAmount).toBe(gross);
    });

    it("supports future 12% PPN rate under UU HPP regulations", () => {
      const gross = 11200000;
      const res = calculateInclusiveTax(gross, 0.12);

      expect(res.taxRate).toBe(0.12);
      expect(res.dpp).toBe(10000000);
      expect(res.taxAmount).toBe(1200000);
      expect(res.dpp + res.taxAmount).toBe(gross);
    });

    it("handles fractional amounts with deterministic integer rounding for IDR", () => {
      const gross = 2500000;
      const res = calculateInclusiveTax(gross);

      // 2,500,000 / 1.11 = 2,252,252.25... -> 2,252,252
      expect(res.dpp).toBe(Math.round(2500000 / 1.11));
      expect(res.taxAmount).toBe(gross - res.dpp);
      expect(res.dpp + res.taxAmount).toBe(gross);
    });
  });

  describe("Tax Calculation Service: calculateExclusiveTax", () => {
    it("calculates tax and gross from net base price", () => {
      const net = 10000000;
      const res = calculateExclusiveTax(net);

      expect(res.dpp).toBe(10000000);
      expect(res.taxAmount).toBe(1100000);
      expect(res.grossAmount).toBe(11100000);
    });
  });

  describe("Tax Calculation Service: calculateOrderTaxBreakdown", () => {
    it("computes comprehensive line-item and aggregate order tax breakdown", () => {
      const items = [
        { id: "cpu-1", name: "Ryzen 7 7800X3D", unitPrice: 7199000, quantity: 1 },
        { id: "ram-1", name: "Corsair Vengeance 32GB", unitPrice: 2199000, quantity: 2 },
      ];
      // Item 1: 7,199,000
      // Item 2: 2 * 2,199,000 = 4,398,000
      // Gross items = 11,597,000
      const breakdown = calculateOrderTaxBreakdown({
        items,
        shippingFee: 50000,
        assemblyFee: 250000,
        discountAmount: 100000,
      });

      expect(breakdown.taxRate).toBe(DEFAULT_PPN_RATE);
      expect(breakdown.grossSubtotal).toBe(11597000 + 250000);
      expect(breakdown.dpp).toBe(Math.round(breakdown.grossSubtotal / 1.11));
      expect(breakdown.taxAmount).toBe(breakdown.grossSubtotal - breakdown.dpp);
      expect(breakdown.grandTotal).toBe(breakdown.grossSubtotal + 50000 - 100000);
      expect(breakdown.lineItems.length).toBe(2);
      expect(breakdown.lineItems[0].lineTotal).toBe(7199000);
      expect(breakdown.lineItems[0].lineDpp + breakdown.lineItems[0].lineTax).toBe(7199000);
    });
  });
});
