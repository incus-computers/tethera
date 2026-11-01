import React from "react";
// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import HomePage from "../src/app/page";
import ComponentsPage from "../src/app/components/page";
import CategoryPage from "../src/app/components/[category]/page";
import { PrebuiltSystemCard } from "../src/components/products/PrebuiltSystemCard";
import { PREBUILT_SYSTEMS, MOCK_COMPONENTS } from "../src/lib/data/mockHardware";

// Mock next/navigation for category params
vi.mock("next/navigation", () => ({
  useParams: () => ({ category: "cpu" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/components/cpu",
}));

// Mock next/image for static markup rendering in tests
vi.mock("next/image", () => ({
  default: ({ src, alt, fill, className, priority, ...rest }: any) => {
    return React.createElement("img", {
      src,
      alt,
      className,
      "data-fill": fill ? "true" : undefined,
      "data-priority": priority ? "true" : undefined,
      ...rest,
    });
  },
}));

describe("Item Tile Top-Left Red Discount Badge", () => {
  it("renders red discount badge on top-left of discounted item tiles in HomePage catalog", () => {
    const html = renderToStaticMarkup(React.createElement(HomePage));
    // Find a discounted item from MOCK_COMPONENTS (e.g. cpu-1: 7.199.000 -> 6.499.000 is -10%)
    const discountedItem = MOCK_COMPONENTS.find(
      (c) => c.sale_price && c.sale_price < c.price
    );
    expect(discountedItem).toBeDefined();

    const expectedPercent = Math.round(
      ((discountedItem!.price - discountedItem!.sale_price!) / discountedItem!.price) * 100
    );

    // Should contain the red discount percentage badge
    expect(html).toContain(`-${expectedPercent}%`);
    expect(html).toContain("bg-red-600");
    expect(html).toContain("text-white");
    expect(html).toContain("absolute top-2 left-2");
  });

  it("renders red discount badge on top-left of discounted item tiles in ComponentsPage", () => {
    const html = renderToStaticMarkup(React.createElement(ComponentsPage));
    expect(html).toContain("bg-red-600 text-white");
    expect(html).toContain("absolute top-2 left-2");
  });

  it("renders red discount badge on top-left of discounted item tiles in CategoryPage", () => {
    const html = renderToStaticMarkup(React.createElement(CategoryPage));
    expect(html).toContain("bg-red-600 text-white");
    expect(html).toContain("absolute top-2 left-2");
  });

  it("renders red discount badge on top-left of discounted PrebuiltSystemCard", () => {
    const discountedRig = PREBUILT_SYSTEMS.find(
      (r) => (r as any).sale_price && (r as any).sale_price < r.price
    );
    expect(discountedRig).toBeDefined();

    const html = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: discountedRig! })
    );

    const expectedPercent = Math.round(
      ((discountedRig!.price - (discountedRig as any).sale_price) / discountedRig!.price) * 100
    );

    expect(html).toContain(`-${expectedPercent}%`);
    expect(html).toContain("bg-red-600");
    expect(html).toContain("text-white");
  });

  it("strictly enforces zero em dashes across modified catalog pages", () => {
    const checkZeroEmDash = (relPath: string) => {
      const fullPath = path.resolve(__dirname, relPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      const emDashChar = String.fromCharCode(8212);
      expect(content).not.toContain(emDashChar);
    };

    checkZeroEmDash("../src/app/page.tsx");
    checkZeroEmDash("../src/app/components/page.tsx");
    checkZeroEmDash("../src/app/components/[category]/page.tsx");
    checkZeroEmDash("../src/app/products/[id]/page.tsx");
    checkZeroEmDash("../src/components/products/PrebuiltSystemCard.tsx");
    checkZeroEmDash("item-tile-discount.test.tsx");
  });
});
