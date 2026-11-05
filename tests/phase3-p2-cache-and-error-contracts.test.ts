// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("server-only", () => ({}));

import { safeRevalidate } from "@/lib/cache/revalidate";
import {
  badRequestProblem,
  unauthorizedProblem,
  forbiddenProblem,
  notFoundProblem,
  unprocessableEntityProblem,
  internalServerErrorProblem,
  createProblemResponse,
} from "@/lib/api/problemDetails";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  POST as postProductRoute,
  PUT as putProductRoute,
} from "@/app/api/admin/products/route";
import { POST as postReviewRoute } from "@/app/api/products/[id]/reviews/route";

describe("P2.3 Cache Invalidation Engine (OPT-BE-02)", () => {
  it("computes all target paths and tags for product entity mutations", () => {
    const res = safeRevalidate("product", {
      productId: "gpu-rtx-4080",
      productSlug: "geforce-rtx-4080-super",
      categorySlug: "gpu",
    });

    expect(res.paths).toContain("/");
    expect(res.paths).toContain("/components");
    expect(res.paths).toContain("/components/gpu");
    expect(res.paths).toContain("/products/gpu-rtx-4080");
    expect(res.paths).toContain("/products/geforce-rtx-4080-super");
    expect(res.paths).toContain("/builder");
    expect(res.tags).toContain("products");
    expect(res.tags).toContain("product-gpu-rtx-4080");
  });

  it("computes target paths and tags for banner mutations", () => {
    const res = safeRevalidate("banner");
    expect(res.paths).toEqual(["/"]);
    expect(res.tags).toEqual(["banners"]);
  });

  it("computes target paths and tags for promotion mutations", () => {
    const res = safeRevalidate("promotion");
    expect(res.paths).toContain("/");
    expect(res.paths).toContain("/components");
    expect(res.tags).toContain("promotions");
  });

  it("computes target paths and tags for inventory adjustments", () => {
    const res = safeRevalidate("inventory", { productId: "cpu-amd-7800x3d" });
    expect(res.paths).toContain("/products/cpu-amd-7800x3d");
    expect(res.tags).toContain("inventory");
    expect(res.tags).toContain("product-cpu-amd-7800x3d");
  });

  it("tolerates missing Next.js static generation store without throwing uncaught exceptions", () => {
    // In Vitest runner, Next.js static store is inactive, so safeRevalidate catches and reports error safely
    expect(() => {
      const res = safeRevalidate("product", { productId: "mb-rog" });
      expect(res.paths.length).toBeGreaterThan(0);
      expect(res.tags.length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  describe("RFC 7807 Problem Details Contracts (OPT-BE-03)", () => {
    it("generates 400 Bad Request problem response with standard fields and backwards compatibility", async () => {
      const res = badRequestProblem("Product SKU is required.", {
        instance: "/api/admin/products",
      });

      expect(res.status).toBe(400);
      expect(res.headers.get("content-type")).toContain("application/problem+json");

      const body = await res.json();
      expect(body.type).toBe("https://tethera.com/problems/bad-request");
      expect(body.title).toBe("Bad Request");
      expect(body.status).toBe(400);
      expect(body.detail).toBe("Product SKU is required.");
      expect(body.instance).toBe("/api/admin/products");

      // Backwards-compatible fields for legacy clients
      expect(body.success).toBe(false);
      expect(body.error).toBe("Product SKU is required.");
    });

    it("generates 401 Unauthorized problem response", async () => {
      const res = unauthorizedProblem("Administrative clearance required.", {
        instance: "/api/admin/audit-logs",
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.type).toBe("https://tethera.com/problems/unauthorized");
      expect(body.title).toBe("Unauthorized");
      expect(body.status).toBe(401);
      expect(body.detail).toBe("Administrative clearance required.");
    });

    it("generates 403 Forbidden problem response", async () => {
      const res = forbiddenProblem("Staff role lacks permission 'refunds:write'.", {
        instance: "/api/admin/rma",
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.type).toBe("https://tethera.com/problems/forbidden");
      expect(body.title).toBe("Forbidden");
      expect(body.status).toBe(403);
    });

    it("generates 404 Not Found problem response", async () => {
      const res = notFoundProblem("Product with ID 'gpu-999' not found.", {
        instance: "/api/products/gpu-999",
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.type).toBe("https://tethera.com/problems/not-found");
      expect(body.title).toBe("Not Found");
      expect(body.status).toBe(404);
      expect(body.detail).toContain("gpu-999");
    });

    it("generates 422 Unprocessable Entity with invalid_params array", async () => {
      const res = unprocessableEntityProblem("Validation failed for product submission.", {
        instance: "/api/admin/products",
        invalid_params: [
          { name: "retail_price", reason: "Price must be greater than 0" },
          { name: "stock_on_hand", reason: "Stock cannot be negative" },
        ],
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.type).toBe("https://tethera.com/problems/unprocessable-entity");
      expect(body.status).toBe(422);
      expect(body.invalid_params).toHaveLength(2);
      expect(body.invalid_params[0].name).toBe("retail_price");
    });

    it("generates 500 Internal Server Error problem response", async () => {
      const res = internalServerErrorProblem("Unexpected database disconnect.", {
        instance: "/api/checkout/create-order",
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.type).toBe("https://tethera.com/problems/internal-server-error");
      expect(body.title).toBe("Internal Server Error");
      expect(body.status).toBe(500);
    });
  });

  describe("API Route Integration: Cache Revalidation & RFC 7807 Error Responses", () => {
    it("returns RFC 7807 400 Bad Request when admin product creation lacks required fields", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer superadmin",
        },
        body: JSON.stringify({
          name: "Incomplete GPU",
          // missing brand, sku, retail_price
        }),
      });

      const res = await postProductRoute(req);
      expect(res.status).toBe(400);
      expect(res.headers.get("content-type")).toContain("application/problem+json");

      const body = await res.json();
      expect(body.type).toBe("https://tethera.com/problems/bad-request");
      expect(body.title).toBe("Bad Request");
      expect(body.status).toBe(400);
      expect(body.detail).toMatch(/required/i);
      expect(body.success).toBe(false);
    });

    it("returns RFC 7807 403 Forbidden when review submission is from unverified buyer", async () => {
      const req = new NextRequest("http://localhost:3000/api/products/cpu-1/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerEmail: "unverified-guest@example.com",
          customerName: "Guest",
          rating: 4,
          title: "Good but unverified",
          content: "Did not buy from store.",
        }),
      });

      const res = await postReviewRoute(req, { params: { id: "cpu-1" } });
      expect(res.status).toBe(403);
      expect(res.headers.get("content-type")).toContain("application/problem+json");

      const body = await res.json();
      expect(body.type).toBe("https://tethera.com/problems/forbidden");
      expect(body.status).toBe(403);
      expect(body.detail).toMatch(/only verified buyers/i);
      expect(body.success).toBe(false);
    });

    it("ensures zero em dashes across all P2.3 files", () => {
      const files = [
        "src/lib/cache/revalidate.ts",
        "src/lib/api/problemDetails.ts",
        "src/app/api/admin/products/route.ts",
        "src/app/api/admin/products/bulk/import/route.ts",
        "src/app/api/admin/banners/route.ts",
        "src/app/api/admin/promotions/route.ts",
        "src/app/api/admin/inventory/route.ts",
        "src/app/api/products/[id]/reviews/route.ts",
      ];
      for (const relPath of files) {
        const fullPath = path.resolve(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, "utf-8");
        expect(content.includes("\u2014")).toBe(false);
      }
    });
  });
});
