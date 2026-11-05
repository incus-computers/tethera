// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { db } from "@/lib/db";
import { POST as createOrderPOST } from "@/app/api/checkout/create-order/route";
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

  describe("API Route: POST /api/checkout/create-order (Tax Snapshots)", () => {
    it("persists line-item tax snapshots and order-level DPP/PPN amounts on creation", async () => {
      const email = `tax-buyer-${Date.now()}@example.com`;
      const req = new NextRequest("http://localhost:3000/api/checkout/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: "Tax Verification Buyer",
            phone: "+62 812-7777-6666",
            email,
          },
          fulfillmentType: "click_and_collect",
          items: [
            {
              id: "cpu-1",
              quantity: 1,
            },
            {
              id: "cpu-2",
              quantity: 2,
            },
          ],
        }),
      });

      const res = await createOrderPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.orderId).toBeDefined();
      expect(json.tax).toBeDefined();
      expect(json.tax.taxRate).toBe(0.11);
      expect(json.tax.dpp).toBeGreaterThan(0);
      expect(json.tax.taxAmount).toBeGreaterThan(0);
      expect(json.tax.dpp + json.tax.taxAmount).toBe(json.subtotal);

      // Verify Order record in database
      const { order, items: orderItems } = await db.orders.getOrderWithItems(json.orderId);
      expect(order).toBeDefined();
      expect(order!.tax_rate).toBe(0.11);
      expect(order!.tax_amount).toBe(json.tax.taxAmount);
      expect(order!.dpp_amount).toBe(json.tax.dpp);

      // Verify OrderItem snapshots in database
      expect(orderItems.length).toBe(2);
      for (const item of orderItems) {
        expect(item.tax_rate_snapshot).toBe(0.11);
        expect(item.tax_amount_snapshot).toBeGreaterThan(0);
        expect(item.product_title_snapshot).toBeDefined();
      }
    });
  });
});
