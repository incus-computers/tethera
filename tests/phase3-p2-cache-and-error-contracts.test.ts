// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("server-only", () => ({}));

import { safeRevalidate } from "@/lib/cache/revalidate";

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
});
