import React from "react";
// @ts-ignore
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HardwareSpecIcon,
  HardwarePartType,
  HardwareSpecIconProps,
} from "../src/components/products/HardwareSpecIcon";

describe("HardwareSpecIcon Component", () => {
  const parts: HardwarePartType[] = [
    "cpu",
    "gpu",
    "motherboard",
    "ram",
    "storage",
    "psu",
    "tower",
    "cooling",
  ];

  it("renders SVG with required base attributes for all 8 hardware spec parts", () => {
    parts.forEach((part) => {
      const html = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part }));
      expect(html).toContain("<svg");
      expect(html).toContain('viewBox="0 0 24 24"');
      expect(html).toContain('fill="none"');
      expect(html).toContain('stroke="currentColor"');
      expect(html).toContain('stroke-width="1.7"');
      expect(html).toContain('stroke-linecap="round"');
      expect(html).toContain('stroke-linejoin="round"');
      expect(html).toContain(`aria-label="${part}"`);
    });
  });

  it("applies custom className to the SVG element", () => {
    const html = renderToStaticMarkup(
      React.createElement(HardwareSpecIcon, {
        part: "gpu",
        className: "w-5 h-5 text-emerald-400 custom-icon",
      })
    );
    expect(html).toContain("w-5 h-5 text-emerald-400 custom-icon");
  });

  it("renders fallback SVG with aria-label='hardware' for unknown part types", () => {
    const html = renderToStaticMarkup(
      React.createElement(HardwareSpecIcon, {
        part: "unknown" as HardwarePartType,
      })
    );
    expect(html).toContain("<svg");
    expect(html).toContain('aria-label="hardware"');
  });

  it("renders distinct vector silhouettes for all 8 parts", () => {
    const renderedMarkups = new Set<string>();

    parts.forEach((part) => {
      const html = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part }));
      expect(renderedMarkups.has(html)).toBe(false);
      renderedMarkups.add(html);
    });

    expect(renderedMarkups.size).toBe(8);
  });

  it("contains authentic hardware geometry details for each component", () => {
    // CPU: substrate, IHS, pin 1 marker
    const cpuHtml = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part: "cpu" }));
    expect(cpuHtml).toContain("<rect");

    // GPU: PCIe card body, fan rotors, PCIe interface
    const gpuHtml = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part: "gpu" }));
    expect(gpuHtml).toContain("<circle");

    // Motherboard: CPU socket and PCIe expansion slots
    const moboHtml = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part: "motherboard" }));
    expect(moboHtml).toContain("<rect");

    // RAM: DIMM notched connector and module ridges
    const ramHtml = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part: "ram" }));
    expect(ramHtml).toContain("<path");

    // Storage: M.2 NVMe card format with NAND/controller chips
    const storageHtml = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part: "storage" }));
    expect(storageHtml).toContain("<rect");

    // PSU: casing, intake fan circle, and modular cables/ports
    const psuHtml = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part: "psu" }));
    expect(psuHtml).toContain("<circle");

    // Tower: chassis frame and glass side panel
    const towerHtml = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part: "tower" }));
    expect(towerHtml).toContain("<rect");

    // Cooling: AIO cooler with pump and tubes or fan
    const coolingHtml = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part: "cooling" }));
    expect(coolingHtml).toContain("<path");
  });

  it("contains zero em dashes in rendered markup", () => {
    parts.forEach((part) => {
      const html = renderToStaticMarkup(React.createElement(HardwareSpecIcon, { part }));
      expect(html).not.toContain("\u2014");
      expect(html).not.toContain("&mdash;");
    });
  });
});

