import React from "react";
// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import WorkstationsPage from "../src/app/prebuilts/workstations/page";
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

describe("Workstations Prebuilt Category Page", () => {
  it("renders workstation hero banner, breadcrumbs, and dual tower showcase", () => {
    const html = renderToStaticMarkup(React.createElement(WorkstationsPage));
    expect(html).toContain("Desktop computers");
    expect(html).toContain("Prebuilt Systems");
    expect(html).toContain("Workstations");
    expect(html).toContain("High-compute precision systems engineered for 3D rendering");
    expect(html).toContain("Incus Titan Threadripper Studio Workstation");
    expect(html).toContain("Incus Precision CAD Core i9 Workstation");
  });

  it("renders Row 1 and Row 2 workstation navigation pills", () => {
    const html = renderToStaticMarkup(React.createElement(WorkstationsPage));
    expect(html).toContain("All workstations");
    expect(html).toContain("Ready to go");
    expect(html).toContain("Built to order");
    expect(html).toContain("Custom workstation");
    expect(html).toContain("Studio CAD");
    expect(html).toContain("Creator Pro");
    expect(html).toContain("Titan Threadripper");
  });

  it("renders workstation systems with 8 hardware specs and Add to Cart CTAs", () => {
    const html = renderToStaticMarkup(React.createElement(WorkstationsPage));
    const workstationSystems = PREBUILT_SYSTEMS.filter(
      (rig) =>
        rig.systemType === "workstation" ||
        rig.name.toLowerCase().includes("workstation") ||
        rig.name.toLowerCase().includes("creator") ||
        rig.name.toLowerCase().includes("titan") ||
        rig.name.toLowerCase().includes("cad")
    );

    for (const pb of workstationSystems) {
      expect(html).toContain(pb.name);
      expect(html).toContain(pb.cpu);
      expect(html).toContain(pb.gpu);
      expect(html).toContain(pb.ram);
    }

    expect(html).toContain("Add to Cart");
    expect(html).toContain("min-h-[44px]");
  });

  it("renders secondary section header and interactive filter toolbar", () => {
    const html = renderToStaticMarkup(React.createElement(WorkstationsPage));
    expect(html).toContain("Ready-to-go workstations");
    expect(html).toContain("Prebuilt Incus workstations");
    expect(html).toContain("Category");
    expect(html).toContain("Availability");
    expect(html).toContain("Case");
    expect(html).toContain("CPU");
    expect(html).toContain("Graphics Card");
    expect(html).toContain("Memory");
    expect(html).toContain("More filters");
    expect(html).toContain("Search within results");
    expect(html).toContain("Sort:");
  });

  it("strictly enforces zero em dashes in src/app/prebuilts/workstations/page.tsx", () => {
    const filePath = path.resolve(__dirname, "../src/app/prebuilts/workstations/page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const emDashChar = String.fromCharCode(8212);
    expect(content).not.toContain(emDashChar);
  });
});
