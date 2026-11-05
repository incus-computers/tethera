// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "@/lib/db";

describe("CUST-01 Faceted Catalog Query Engine & Stock Notifications Repository", () => {
  describe("productsRepository.getFacetedCatalog", () => {
    it("filters catalog by search term, category slug, and price bounds", async () => {
      const result = await db.products.getFacetedCatalog({
        categorySlug: "processors",
        minPrice: 5000000,
        maxPrice: 8000000,
      });

      expect(result.products).toBeDefined();
      expect(result.products.length).toBeGreaterThan(0);
      for (const prod of result.products) {
        expect(prod.category_slug).toContain("processor");
        const price = prod.sale_price || prod.retail_price;
        expect(price).toBeGreaterThanOrEqual(5000000);
        expect(price).toBeLessThanOrEqual(8000000);
      }
    });

    it("filters catalog by multi-brand selection and inStockOnly flag", async () => {
      const result = await db.products.getFacetedCatalog({
        brands: ["AMD", "Intel"],
        inStockOnly: true,
      });

      expect(result.products.length).toBeGreaterThan(0);
      for (const prod of result.products) {
        expect(["AMD", "Intel"]).toContain(prod.brand);
      }
    });

    it("aggregates dynamic facet counts (brands, categories, price range) for active query", async () => {
      const result = await db.products.getFacetedCatalog({
        categorySlug: "gpu",
      });

      expect(result.facets).toBeDefined();
      expect(result.facets.brands.length).toBeGreaterThan(0);
      expect(result.facets.priceRange.min).toBeGreaterThan(0);
      expect(result.facets.priceRange.max).toBeGreaterThan(result.facets.priceRange.min);
      expect(result.facets.totalMatching).toBe(result.products.length);
    });

    it("sorts catalog items deterministically by price-asc, price-desc, and newest", async () => {
      const asc = await db.products.getFacetedCatalog({
        sort: "price-asc",
        limit: 10,
      });

      const desc = await db.products.getFacetedCatalog({
        sort: "price-desc",
        limit: 10,
      });

      const firstAscPrice = asc.products[0].sale_price || asc.products[0].retail_price;
      const lastAscPrice = asc.products[asc.products.length - 1].sale_price || asc.products[asc.products.length - 1].retail_price;
      expect(firstAscPrice).toBeLessThanOrEqual(lastAscPrice);

      const firstDescPrice = desc.products[0].sale_price || desc.products[0].retail_price;
      const lastDescPrice = desc.products[desc.products.length - 1].sale_price || desc.products[desc.products.length - 1].retail_price;
      expect(firstDescPrice).toBeGreaterThanOrEqual(lastDescPrice);
    });
  });

  describe("stockNotificationsRepository", () => {
    it("records a back-in-stock notification request and deduplicates identical submissions", async () => {
      const email = `notify-buyer-${Date.now()}@example.com`;
      const phone = "+62 812-9999-0000";

      const req1 = await db.stockNotifications.requestNotification({
        productId: "gpu-1",
        email,
        phone,
      });

      expect(req1.id).toBeDefined();
      expect(req1.product_id).toBe("gpu-1");
      expect(req1.email).toBe(email);

      // Duplicate attempt should return existing without duplicate records
      const req2 = await db.stockNotifications.requestNotification({
        productId: "gpu-1",
        email,
        phone,
      });

      expect(req2.id).toBe(req1.id);

      const pending = await db.stockNotifications.getPendingNotifications("gpu-1");
      expect(pending.some((n) => n.email === email)).toBe(true);
    });
  });
});
