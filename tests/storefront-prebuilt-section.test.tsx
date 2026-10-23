import React from "react";
// @ts-ignore
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import HomePage from "../src/app/page";
import { PREBUILT_SYSTEMS } from "../src/lib/data/mockHardware";
import {
  DEFAULT_FEATURED_PREBUILT_IDS,
  resolveActivePrebuilts,
} from "../src/lib/data/homepageConfig";

// Mock next/image for static markup rendering in tests
vi.mock("next/image", () => ({
  default: ({ src, alt, fill, className, ...rest }: any) => {
    return React.createElement("img", {
      src,
      alt,
      className,
      "data-fill": fill ? "true" : undefined,
      ...rest,
    });
  },
}));

function extractLinksFromHtml(html: string): Array<{ attrs: string; content: string }> {
  const linkRegex = /<a\s+([^>]+)>([\s\S]*?)<\/a>/g;
  const links: Array<{ attrs: string; content: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    links.push({ attrs: match[1], content: match[2] });
  }
  return links;
}

describe("Storefront Prebuilt Rigs Section Integration & Density Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders #prebuilt section with container max-width 1920px", () => {
    const html = renderToStaticMarkup(React.createElement(HomePage));
    expect(html).toContain('id="prebuilt"');
    expect(html).toContain("max-w-[1920px]");
  });

  it("renders section header with title, subtitle, and View More navigation without turnkey label", () => {
    const html = renderToStaticMarkup(React.createElement(HomePage));
    expect(html).not.toContain("Turnkey Gaming Workstations");
    expect(html).toContain("Ready to Go PCs");
    expect(html).toContain("Assembled, stress-tested, and ready for same-day Click &amp; Collect pickup.");

    // Header action link must point to /prebuilts
    expect(html).toMatch(/href="\/prebuilts"[\s\S]*?>[\s\S]*?View More/);
  });

  it("renders prominent View More header action meeting 44px tap target height with bold font", () => {
    const html = renderToStaticMarkup(React.createElement(HomePage));
    const prebuiltSectionMatch = html.match(/<section[^>]*id="prebuilt"[^>]*>([\s\S]*?)<\/section>/);
    expect(prebuiltSectionMatch).not.toBeNull();
    const sectionHtml = prebuiltSectionMatch![1];

    const links = extractLinksFromHtml(sectionHtml);
    const headerLink = links.find(
      (l) =>
        l.attrs.includes('href="/prebuilts"') &&
        l.content.includes("View More") &&
        !l.content.includes("Prebuilts")
    );
    expect(headerLink).toBeDefined();
    expect(headerLink!.attrs).toContain("min-h-[44px]");
    expect(headerLink!.attrs).toContain("font-bold");
  });

  it("ensures redundant bottom View More Prebuilts CTA is removed to avoid duplicate actions", () => {
    const html = renderToStaticMarkup(React.createElement(HomePage));
    const prebuiltSectionMatch = html.match(/<section[^>]*id="prebuilt"[^>]*>([\s\S]*?)<\/section>/);
    expect(prebuiltSectionMatch).not.toBeNull();
    const sectionHtml = prebuiltSectionMatch![1];

    const links = extractLinksFromHtml(sectionHtml);
    const bottomCta = links.find(
      (l) =>
        l.attrs.includes('href="/prebuilts"') &&
        l.content.includes("View More Prebuilts")
    );
    expect(bottomCta).toBeUndefined();
  });

  it("enforces viewport density with grid-cols-2 lg:grid-cols-4", () => {
    const html = renderToStaticMarkup(React.createElement(HomePage));
    expect(html).toContain("grid-cols-2 lg:grid-cols-4");
  });

  it("renders exactly 4 prebuilt cards with cards 3 and 4 hidden on mobile/tablet (hidden lg:flex)", () => {
    const html = renderToStaticMarkup(React.createElement(HomePage));

    // Extract the #prebuilt section html
    const prebuiltSectionMatch = html.match(/<section[^>]*id="prebuilt"[^>]*>([\s\S]*?)<\/section>/);
    expect(prebuiltSectionMatch).not.toBeNull();
    const sectionHtml = prebuiltSectionMatch![1];

    // Card articles in the prebuilt section
    const articleRegex = /<article[^>]*class="([^"]*)"/g;
    const cardMatches: RegExpExecArray[] = [];
    let match: RegExpExecArray | null;
    while ((match = articleRegex.exec(sectionHtml)) !== null) {
      cardMatches.push(match);
    }
    expect(cardMatches.length).toBe(4);

    // First two cards are visible on all viewports (class contains flex, not hidden lg:flex)
    expect(cardMatches[0][1]).toContain("flex");
    expect(cardMatches[0][1]).not.toContain("hidden lg:flex");
    expect(cardMatches[1][1]).toContain("flex");
    expect(cardMatches[1][1]).not.toContain("hidden lg:flex");

    // Third and fourth cards are strictly hidden below lg (hidden lg:flex)
    expect(cardMatches[2][1]).toContain("hidden lg:flex");
    expect(cardMatches[3][1]).toContain("hidden lg:flex");
  });

  it("uses PrebuiltSystemCard rendering all 8 hardware specs and zero SKU or badge slop", () => {
    const html = renderToStaticMarkup(React.createElement(HomePage));
    const prebuiltSectionMatch = html.match(/<section[^>]*id="prebuilt"[^>]*>([\s\S]*?)<\/section>/);
    expect(prebuiltSectionMatch).not.toBeNull();
    const sectionHtml = prebuiltSectionMatch![1];

    // Default featured rigs are pb-1, pb-2, pb-3
    const defaultRigs = DEFAULT_FEATURED_PREBUILT_IDS.map(
      (id) => PREBUILT_SYSTEMS.find((p) => p.id === id)!
    );

    for (const rig of defaultRigs) {
      expect(sectionHtml).toContain(rig.name);
      expect(sectionHtml).toContain(rig.cpu);
      expect(sectionHtml).toContain(rig.gpu);
      expect(sectionHtml).toContain(rig.motherboard);
      expect(sectionHtml).toContain(rig.ram);
      expect(sectionHtml).toContain(rig.storage);
      expect(sectionHtml).toContain(rig.psu);
      expect(sectionHtml).toContain(rig.chassis);
      expect(sectionHtml).toContain(rig.cooling);
      // Zero SKU slop in PrebuiltSystemCard
      expect(sectionHtml).not.toContain(rig.sku);
    }

    // Zero "Stress Tested" badge slop
    expect(sectionHtml).not.toContain("Stress Tested");
  });

  it("resolves activePrebuilts with accurate fallback logic", () => {
    // 1. Exactly 4 custom IDs
    const fourCustom = resolveActivePrebuilts(["pb-4", "pb-3", "pb-2", "pb-1"], PREBUILT_SYSTEMS, 4);
    expect(fourCustom.map((r) => r.id)).toEqual(["pb-4", "pb-3", "pb-2", "pb-1"]);

    // 2. Only 1 custom ID: falls back with distinct items from PREBUILT_SYSTEMS
    const oneCustom = resolveActivePrebuilts(["pb-2"], PREBUILT_SYSTEMS, 4);
    expect(oneCustom).toHaveLength(4);
    expect(oneCustom[0].id).toBe("pb-2");
    expect(new Set(oneCustom.map((r) => r.id)).size).toBe(4);

    // 3. Empty list: falls back to first 4 PREBUILT_SYSTEMS
    const emptyCustom = resolveActivePrebuilts([], PREBUILT_SYSTEMS, 4);
    expect(emptyCustom).toHaveLength(4);
    expect(emptyCustom.map((r) => r.id)).toEqual(["pb-1", "pb-2", "pb-3", "pb-4"]);

    // 4. Invalid ID with valid IDs
    const invalidId = resolveActivePrebuilts(["pb-nonexistent", "pb-3"], PREBUILT_SYSTEMS, 4);
    expect(invalidId).toHaveLength(4);
    expect(invalidId[0].id).toBe("pb-3");
    expect(new Set(invalidId.map((r) => r.id)).size).toBe(4);

    // 5. More than 4 IDs: truncates to first 4
    const fiveIds = resolveActivePrebuilts(["pb-5", "pb-4", "pb-3", "pb-2", "pb-1"], PREBUILT_SYSTEMS, 4);
    expect(fiveIds).toHaveLength(4);
    expect(fiveIds.map((r) => r.id)).toEqual(["pb-5", "pb-4", "pb-3", "pb-2"]);
  });

  it("verifies src/app/page.tsx has zero em dashes across the entire file", () => {
    const pageSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/page.tsx"),
      "utf-8"
    );
    const emDashChar = String.fromCharCode(8212);
    expect(pageSource.includes(emDashChar)).toBe(false);
  });

  it("verifies tests/storefront-prebuilt-section.test.tsx has zero em dashes", () => {
    const testSource = fs.readFileSync(
      path.join(process.cwd(), "tests/storefront-prebuilt-section.test.tsx"),
      "utf-8"
    );
    const emDashChar = String.fromCharCode(8212);
    expect(testSource.includes(emDashChar)).toBe(false);
  });
});
