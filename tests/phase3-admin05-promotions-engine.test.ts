// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { db } from "@/lib/db";
import { Promotion } from "@/lib/db/types";
import { POST as validatePromoPOST } from "@/app/api/promotions/validate/route";
import { POST as createOrderPOST } from "@/app/api/checkout/create-order/route";

describe("ADMIN-05 Tiered Promotional Discount Rules Engine", () => {
  describe("PromotionsRepository: validatePromotion", () => {
    it("validates percentage discount with max_discount cap", async () => {
      const promo: Promotion = {
        id: `promo-test-${Date.now()}-1`,
        code: `TESTPCT${Date.now()}`,
        title: "15% Off with Cap",
        description: "15% discount capped at Rp 1.000.000",
        discount_type: "percentage",
        discount_value: 15,
        min_spend: 2000000,
        max_discount: 1000000,
        is_active: true,
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 3600000 * 24).toISOString(),
        usage_count: 0,
        max_global_uses: 100,
      };
      await db.promotions.create(promo);

      // Cart subtotal: 10,000,000. 15% is 1,500,000, capped at 1,000,000
      const res = await db.promotions.validatePromotion(promo.code, {
        subtotal: 10000000,
      });

      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(1000000);
      expect(res.discountType).toBe("percentage");
    });

    it("rejects promotion if cart subtotal is below min_spend", async () => {
      const promo: Promotion = {
        id: `promo-test-${Date.now()}-2`,
        code: `MINSPEND${Date.now()}`,
        title: "Big Spender Only",
        description: "Must spend at least 5 million",
        discount_type: "fixed_amount",
        discount_value: 300000,
        min_spend: 5000000,
        is_active: true,
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 3600000 * 24).toISOString(),
        usage_count: 0,
      };
      await db.promotions.create(promo);

      const res = await db.promotions.validatePromotion(promo.code, {
        subtotal: 3000000,
      });

      expect(res.valid).toBe(false);
      expect(res.discountAmount).toBe(0);
      expect(res.message).toMatch(/minimum spend/i);
    });

    it("rejects expired and inactive promotions", async () => {
      const expiredPromo: Promotion = {
        id: `promo-test-${Date.now()}-3`,
        code: `EXPIRED${Date.now()}`,
        title: "Old Sale",
        description: "Expired yesterday",
        discount_type: "percentage",
        discount_value: 10,
        is_active: true,
        starts_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        ends_at: new Date(Date.now() - 86400000).toISOString(),
        usage_count: 0,
      };
      await db.promotions.create(expiredPromo);

      const res = await db.promotions.validatePromotion(expiredPromo.code, {
        subtotal: 5000000,
      });
      expect(res.valid).toBe(false);
      expect(res.message).toMatch(/expired/i);

      const inactivePromo: Promotion = {
        id: `promo-test-${Date.now()}-4`,
        code: `INACTIVE${Date.now()}`,
        title: "Disabled",
        description: "Disabled promo",
        discount_type: "fixed_amount",
        discount_value: 100000,
        is_active: false,
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 86400000).toISOString(),
        usage_count: 0,
      };
      await db.promotions.create(inactivePromo);

      const resInactive = await db.promotions.validatePromotion(inactivePromo.code, {
        subtotal: 5000000,
      });
      expect(resInactive.valid).toBe(false);
      expect(resInactive.message).toMatch(/inactive|not valid/i);
    });

    it("rejects promo when global usage cap is reached", async () => {
      const cappedPromo: Promotion = {
        id: `promo-test-${Date.now()}-5`,
        code: `CAPPED${Date.now()}`,
        title: "Limited to 5 buyers",
        description: "Only 5 claims allowed",
        discount_type: "fixed_amount",
        discount_value: 200000,
        is_active: true,
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 86400000).toISOString(),
        usage_count: 5,
        max_global_uses: 5,
      };
      await db.promotions.create(cappedPromo);

      const res = await db.promotions.validatePromotion(cappedPromo.code, {
        subtotal: 5000000,
      });
      expect(res.valid).toBe(false);
      expect(res.message).toMatch(/usage limit|limit reached|exhausted/i);
    });

    it("calculates free_shipping discount correctly", async () => {
      const freeShipPromo: Promotion = {
        id: `promo-test-${Date.now()}-6`,
        code: `FREESHIP${Date.now()}`,
        title: "Free Courier Delivery",
        description: "Waives shipping fee up to Rp 100.000",
        discount_type: "free_shipping",
        discount_value: 100000, // max shipping waived
        is_active: true,
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 86400000).toISOString(),
        usage_count: 0,
      };
      await db.promotions.create(freeShipPromo);

      const res = await db.promotions.validatePromotion(freeShipPromo.code, {
        subtotal: 4000000,
        shippingFee: 45000,
      });

      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(45000);
      expect(res.discountType).toBe("free_shipping");
    });
  });

  describe("PromotionsRepository: recordUsage", () => {
    it("atomically increments usage count and tracks redeemed discount total", async () => {
      const promo: Promotion = {
        id: `promo-test-${Date.now()}-usage`,
        code: `USAGE${Date.now()}`,
        title: "Usage Tracker Test",
        description: "Tracks redemption metrics",
        discount_type: "fixed_amount",
        discount_value: 250000,
        is_active: true,
        usage_count: 0,
        total_discount_given: 0,
      };
      await db.promotions.create(promo);

      await db.promotions.recordUsage(promo.id, 250000);
      await db.promotions.recordUsage(promo.id, 250000);

      const updated = await db.promotions.findById(promo.id);
      expect(updated).toBeDefined();
      expect(updated!.usage_count).toBe(2);
      expect(updated!.total_discount_given).toBe(500000);
    });
  });

  describe("API Route: POST /api/promotions/validate", () => {
    it("returns 400 Problem Details when code is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/promotions/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subtotal: 1000000 }),
      });
      const res = await validatePromoPOST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.type).toContain("bad-request");
    });

    it("returns 422 Problem Details when promotion code does not meet minimum spend", async () => {
      const code = `APIFAIL${Date.now()}`;
      await db.promotions.create({
        id: `promo-api-${Date.now()}`,
        code,
        title: "Requires 10jt spend",
        description: "10jt minimum",
        discount_type: "fixed_amount",
        discount_value: 500000,
        min_spend: 10000000,
        is_active: true,
        usage_count: 0,
      });

      const req = new NextRequest("http://localhost:3000/api/promotions/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, subtotal: 2000000 }),
      });
      const res = await validatePromoPOST(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.type).toContain("unprocessable-entity");
      expect(json.detail).toMatch(/minimum spend/i);
    });

    it("returns 200 with discount details when promo code is valid", async () => {
      const code = `APISUCC${Date.now()}`;
      await db.promotions.create({
        id: `promo-succ-${Date.now()}`,
        code,
        title: "Flash Sale 10%",
        description: "10% off",
        discount_type: "percentage",
        discount_value: 10,
        is_active: true,
        usage_count: 0,
      });

      const req = new NextRequest("http://localhost:3000/api/promotions/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, subtotal: 5000000 }),
      });
      const res = await validatePromoPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.valid).toBe(true);
      expect(json.discountAmount).toBe(500000);
      expect(json.discountType).toBe("percentage");
    });
  });

  describe("API Route: POST /api/checkout/create-order (Promo Usage Tracking)", () => {
    it("deducts verified promo discount and increments promo usage count", async () => {
      const code = `ORDERPROMO${Date.now()}`;
      const promo = await db.promotions.create({
        id: `promo-ord-${Date.now()}`,
        code,
        title: "Order Discount Test",
        description: "Rp 300.000 off orders over 5jt",
        discount_type: "fixed_amount",
        discount_value: 300000,
        min_spend: 5000000,
        is_active: true,
        usage_count: 0,
        total_discount_given: 0,
      });

      const email = `promo-buyer-${Date.now()}@example.com`;
      const req = new NextRequest("http://localhost:3000/api/checkout/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: "Promo Buyer",
            phone: "+62 812-9999-8888",
            email,
          },
          fulfillmentType: "click_and_collect",
          items: [{ id: "cpu-1", quantity: 1 }], // cpu-1 is ~7,199,000
          promoCode: code,
        }),
      });

      const res = await createOrderPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify promo record was updated
      const updatedPromo = await db.promotions.findById(promo.id);
      expect(updatedPromo).toBeDefined();
      expect(updatedPromo!.usage_count).toBe(1);
      expect(updatedPromo!.total_discount_given).toBe(300000);
    });
  });
});
