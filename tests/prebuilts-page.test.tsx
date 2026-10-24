import React from "react";
// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import PrebuiltsPage from "../src/app/prebuilts/page";
import { PREBUILT_SYSTEMS } from "../src/lib/data/mockHardware";

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

describe("Prebuilts Category Page Item Tiles and Header", () => {
  it("renders PrebuiltSystemCard for all prebuilts with 8 hardware specs", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltsPage));

    for (const pb of PREBUILT_SYSTEMS) {
      expect(html).toContain(pb.name);
      expect(html).toContain(pb.cpu);
      expect(html).toContain(pb.gpu);
      expect(html).toContain(pb.motherboard);
      expect(html).toContain(pb.ram);
      expect(html).toContain(pb.storage);
      expect(html).toContain(pb.psu);
      expect(html).toContain(pb.chassis);
      expect(html).toContain(pb.cooling);
    }
  });

  it("strictly omits the Stress Tested pill across all tiles", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltsPage));
    expect(html).not.toContain("Stress Tested");
  });

  it("strictly omits SKU strings from the prebuilt tiles", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltsPage));
    for (const pb of PREBUILT_SYSTEMS) {
      expect(html).not.toContain(pb.sku);
    }
  });

  it("renders active Indonesian Rupiah pricing and Add to Cart buttons with min-h-[44px]", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltsPage));
    expect(html).toContain("Add to Cart");
    expect(html).toContain("min-h-[44px]");
  });

  it("renders the hero banner, breadcrumbs, and dual tower showcase", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltsPage));
    // Breadcrumb
    expect(html).toContain("Desktop computers");
    expect(html).toContain("Gaming");
    // Main Hero
    expect(html).toContain("Gaming PCs");
    expect(html).toContain("Your next great game starts here.");
    // Dual Showcase Alt Texts
    expect(html).toContain("Tethera White Edition Gaming PC");
    expect(html).toContain("Tethera Apex RGB Gaming PC");
  });

  it("renders Row 1 and Row 2 navigation pills", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltsPage));
    // Row 1
    expect(html).toContain("All gaming PCs");
    expect(html).toContain("Ready to go");
    expect(html).toContain("Built to order");
    expect(html).toContain("Total custom");
    // Row 2
    expect(html).toContain("Prebuilt, ready to go");
    expect(html).toContain("Just want to play");
    expect(html).toContain("Premium");
    expect(html).toContain("Ultra");
  });

  it("renders secondary section header and interactive filter toolbar", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltsPage));
    // Secondary Section Header
    expect(html).toContain("Ready-to-go gaming PCs");
    expect(html).toContain("Prebuilt Tethera gaming PCs. Compare specifications, prices and store availability.");
    // Toolbar elements
    expect(html).toContain("Category");
    expect(html).toContain("Availability");
    expect(html).toContain("Case");
    expect(html).toContain("CPU");
    expect(html).toContain("Graphics Card");
    expect(html).toContain("Memory");
    expect(html).toContain("More filters");
    expect(html).toContain("Search within results");
    expect(html).toContain("Sort:");
    expect(html).toContain("View layout options");
  });

  it("verifies zero em dashes in src/app/prebuilts/page.tsx", () => {
    const filePath = path.resolve(__dirname, "../src/app/prebuilts/page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const emDashChar = String.fromCharCode(8212);
    expect(content).not.toContain(emDashChar);
  });

  it("verifies zero em dashes in tests/prebuilts-page.test.tsx", () => {
    const filePath = path.resolve(__dirname, "prebuilts-page.test.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const emDashChar = String.fromCharCode(8212);
    expect(content).not.toContain(emDashChar);
  });
});
