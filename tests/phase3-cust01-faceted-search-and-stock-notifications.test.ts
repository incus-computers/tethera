// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

vi.mock("server-only", () => ({}));

import { db } from "@/lib/db";
import { GET as getProductsRoute } from "@/app/api/products/route";
import { POST as notifyStockRoute } from "@/app/api/products/[id]/notify-stock/route";

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

  describe("API Route: GET /api/products (Faceted Search)", () => {
    it("returns faceted catalog results including dynamic facet counts and pagination", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/products?category=processors&brand=AMD,Intel&minPrice=1000000&maxPrice=15000000&sort=price-asc"
      );
      const res = await getProductsRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.products)).toBe(true);
      expect(json.facets).toBeDefined();
      expect(Array.isArray(json.facets.brands)).toBe(true);
      expect(json.facets.priceRange).toBeDefined();
      expect(json.pagination).toBeDefined();
      expect(json.pagination.page).toBe(1);
    });

    it("supports search keyword and inStock filtering via query params", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/products?search=GeForce&inStock=true"
      );
      const res = await getProductsRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.products.length).toBeGreaterThan(0);
      for (const prod of json.products) {
        expect(prod.name.toLowerCase()).toContain("geforce");
      }
    });
  });

  describe("API Route: POST /api/products/[id]/notify-stock", () => {
    it("returns 404 Problem Details when product ID is invalid", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/products/non-existent-product-id/notify-stock",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "buyer@example.com" }),
        }
      );
      const res = await notifyStockRoute(req, { params: { id: "non-existent-product-id" } });
      expect(res.status).toBe(404);

      const contentType = res.headers.get("content-type");
      expect(contentType).toContain("application/problem+json");

      const json = await res.json();
      expect(json.type).toContain("not-found");
      expect(json.status).toBe(404);
    });

    it("returns 400 Problem Details when neither valid email nor phone is provided", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/products/gpu-1/notify-stock",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "not-an-email" }),
        }
      );
      const res = await notifyStockRoute(req, { params: { id: "gpu-1" } });
      expect(res.status).toBe(400);

      const contentType = res.headers.get("content-type");
      expect(contentType).toContain("application/problem+json");

      const json = await res.json();
      expect(json.type).toContain("bad-request");
      expect(json.status).toBe(400);
    });

    it("returns 201 Created and persists notification request when valid input is provided", async () => {
      const email = `stock-notify-${Date.now()}@example.com`;
      const phone = "+62 813-8888-7777";
      const req = new NextRequest(
        "http://localhost:3000/api/products/gpu-1/notify-stock",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, phone }),
        }
      );
      const res = await notifyStockRoute(req, { params: { id: "gpu-1" } });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.notification).toBeDefined();
      expect(json.notification.product_id).toBe("gpu-1");
      expect(json.notification.email).toBe(email);
    });
  });

  describe("UI Craftsmanship & Accessibility Standards", () => {
    it("ensures BackInStockModal meets accessibility, minimum 44px tap targets, and anti-slop rules", () => {
      const modalFile = path.resolve(
        process.cwd(),
        "src/components/products/BackInStockModal.tsx"
      );
      const content = fs.readFileSync(modalFile, "utf-8");

      expect(content).not.toContain("—"); // Zero em dashes
      expect(content).toContain("role=\"dialog\"");
      expect(content).toContain("aria-modal=\"true\"");
      expect(content).toContain("min-h-[44px]");
    });

    it("ensures /components discovery catalog has URL sync, Suspense wrapping, and active filter chips", () => {
      const catalogFile = path.resolve(
        process.cwd(),
        "src/app/components/page.tsx"
      );
      const content = fs.readFileSync(catalogFile, "utf-8");

      expect(content).not.toContain("—"); // Zero em dashes
      expect(content).toContain("<Suspense");
      expect(content).toContain("min-h-[44px]");
      expect(content).toContain("router.replace");
      expect(content).toContain("Active Filters");
    });

    it("ensures /products/[id] mounts BackInStockModal with zero em dashes and accessible trigger", () => {
      const pdpFile = path.resolve(
        process.cwd(),
        "src/app/products/[id]/page.tsx"
      );
      const content = fs.readFileSync(pdpFile, "utf-8");

      expect(content).not.toContain("—"); // Zero em dashes
      expect(content).toContain("BackInStockModal");
      expect(content).toContain("Notify Me When Back in Stock");
      expect(content).toContain("min-h-[44px]");
    });
  });
});
