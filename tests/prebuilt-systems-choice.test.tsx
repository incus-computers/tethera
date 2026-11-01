import React from "react";
// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import PrebuiltSystemsChoicePage from "../src/app/prebuilt-systems/page";

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

describe("Prebuilt Systems Platform Selection Page", () => {
  it("renders page header, title, and breadcrumb navigation", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltSystemsChoicePage));
    expect(html).toContain("Prebuilt Systems");
    expect(html).toContain("Incus Prebuilt Platforms");
    expect(html).toContain("Choose your computing platform");
  });

  it("renders Choice A (Gaming PCs) with destination link to /prebuilts without badge clutter", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltSystemsChoicePage));
    expect(html).toContain("Gaming PCs");
    expect(html).toContain('href="/prebuilts"');
    expect(html).toContain("Explore Gaming PCs");
    expect(html).toContain("Your next great game starts here");
    // Strictly omits Choice A badge
    expect(html).not.toContain("Choice A");
  });

  it("renders Choice B (Workstations) with destination link to /prebuilts/workstations without badge clutter", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltSystemsChoicePage));
    expect(html).toContain("Workstations");
    expect(html).toContain('href="/prebuilts/workstations"');
    expect(html).toContain("Explore Workstations");
    expect(html).toContain("High-compute precision systems engineered for 3D rendering");
    // Strictly omits Choice B badge
    expect(html).not.toContain("Choice B");
  });

  it("strictly omits the in-stock ready badge and bottom trust container", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltSystemsChoicePage));
    // Header badge
    expect(html).not.toContain("In-Stock Ready for Same-Day Pickup");
    // Bottom container standards
    expect(html).not.toContain("24-Hour Stress Tested");
    expect(html).not.toContain("3-Year On-Site Warranty");
    expect(html).not.toContain("Clean Cable Management");
    expect(html).not.toContain("Incus System Standards");
  });

  it("renders dual showcase visuals for both gaming and workstation platforms", () => {
    const html = renderToStaticMarkup(React.createElement(PrebuiltSystemsChoicePage));
    expect(html).toContain("Incus White Edition Gaming PC");
    expect(html).toContain("Incus Apex RGB Gaming PC");
    expect(html).toContain("Incus Titan Threadripper Studio Workstation");
    expect(html).toContain("Incus Precision CAD Core i9 Workstation");
    expect(html).toContain("min-h-[44px]");
  });

  it("strictly enforces zero em dashes in src/app/prebuilt-systems/page.tsx", () => {
    const filePath = path.resolve(__dirname, "../src/app/prebuilt-systems/page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const emDashChar = String.fromCharCode(8212);
    expect(content).not.toContain(emDashChar);
  });
});
