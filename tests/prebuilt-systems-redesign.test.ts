import React from "react";
// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import HomePage from "../src/app/page";
import { PrebuiltSystemCard } from "../src/components/products/PrebuiltSystemCard";
import { HardwareSpecIcon, HardwarePartType } from "../src/components/products/HardwareSpecIcon";
import { PREBUILT_SYSTEMS, PrebuiltSystem } from "../src/lib/data/mockHardware";
import {
  DEFAULT_FEATURED_PREBUILT_IDS,
  DEFAULT_HOMEPAGE_LAYOUT,
  DEFAULT_HOMEPAGE_MODULES,
  resolveActivePrebuilts,
} from "../src/lib/data/homepageConfig";
import { GET, PUT } from "../src/app/api/admin/homepage-modules/route";

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

describe("Comprehensive Verification & Quality Audit: Prebuilt Rigs Redesign", () => {
  const EM_DASH_CHAR = String.fromCharCode(0x2014);

  const REDESIGN_FILES = [
    "src/components/products/HardwareSpecIcon.tsx",
    "src/components/products/PrebuiltSystemCard.tsx",
    "src/lib/data/mockHardware.ts",
    "src/lib/data/homepageConfig.ts",
    "src/app/api/admin/homepage-modules/route.ts",
    "src/app/page.tsx",
    "src/app/admin/page.tsx",
    "tests/hardware-spec-icon.test.tsx",
    "tests/prebuilt-card.test.tsx",
    "tests/prebuilt-data.test.ts",
    "tests/storefront-prebuilt-section.test.tsx",
    "tests/admin-featured-prebuilts.test.ts",
    "tests/prebuilt-systems-redesign.test.ts",
  ];

  describe("Suite 1: Strict Zero Em Dash Audit", () => {
    it("validates zero em dashes across all modified project and test source files", () => {
      REDESIGN_FILES.forEach((relPath) => {
        const fullPath = path.resolve(process.cwd(), relPath);
        expect(fs.existsSync(fullPath), `Target file does not exist: ${relPath}`).toBe(true);
        const content = fs.readFileSync(fullPath, "utf-8");
        const containsEmDash = content.includes(EM_DASH_CHAR);
        expect(
          containsEmDash,
          `File contains forbidden em dash character: ${relPath}`
        ).toBe(false);
      });
    });

    it("validates zero em dashes across all PREBUILT_SYSTEMS catalog items, names, specs, descriptions", () => {
      PREBUILT_SYSTEMS.forEach((system: PrebuiltSystem) => {
        expect(system.name.includes(EM_DASH_CHAR)).toBe(false);
        expect(system.description.includes(EM_DASH_CHAR)).toBe(false);
        expect(system.cpu.includes(EM_DASH_CHAR)).toBe(false);
        expect(system.gpu.includes(EM_DASH_CHAR)).toBe(false);
        expect(system.motherboard.includes(EM_DASH_CHAR)).toBe(false);
        expect(system.ram.includes(EM_DASH_CHAR)).toBe(false);
        expect(system.storage.includes(EM_DASH_CHAR)).toBe(false);
        expect(system.psu.includes(EM_DASH_CHAR)).toBe(false);
        expect(system.chassis.includes(EM_DASH_CHAR)).toBe(false);
        expect(system.cooling.includes(EM_DASH_CHAR)).toBe(false);
      });
    });

    it("validates zero em dashes in rendered PrebuiltSystemCard output for every prebuilt rig", () => {
      PREBUILT_SYSTEMS.forEach((rig) => {
        const html = renderToStaticMarkup(React.createElement(PrebuiltSystemCard, { rig }));
        expect(
          html.includes(EM_DASH_CHAR),
          `Rendered PrebuiltSystemCard for ${rig.name} contains em dash`
        ).toBe(false);
      });
    });
  });

  describe("Suite 2: Hardware Component Specs Completeness & Sequencing", () => {
    it("ensures every prebuilt workstation contains all 8 hardware component specifications", () => {
      const requiredSpecFields: Array<keyof PrebuiltSystem> = [
        "cpu",
        "gpu",
        "motherboard",
        "ram",
        "storage",
        "psu",
        "chassis",
        "cooling",
      ];

      expect(PREBUILT_SYSTEMS.length).toBeGreaterThanOrEqual(6);

      PREBUILT_SYSTEMS.forEach((rig) => {
        requiredSpecFields.forEach((field) => {
          const val = rig[field];
          expect(typeof val, `Prebuilt ${rig.id} missing ${field}`).toBe("string");
          expect((val as string).trim().length, `Prebuilt ${rig.id} ${field} is empty`).toBeGreaterThan(0);
        });
      });
    });

    it("ensures every prebuilt workstation has at least 2 images for primary and hover states", () => {
      PREBUILT_SYSTEMS.forEach((rig) => {
        expect(rig.images.length, `Prebuilt ${rig.id} has fewer than 2 images`).toBeGreaterThanOrEqual(2);
        expect(rig.images[0].trim().length).toBeGreaterThan(0);
        expect(rig.images[1].trim().length).toBeGreaterThan(0);
      });
    });

    it("ensures PrebuiltSystemCard renders all 8 specs in strict order with proper vector icon aria labels", () => {
      const testRig = PREBUILT_SYSTEMS[0];
      const html = renderToStaticMarkup(React.createElement(PrebuiltSystemCard, { rig: testRig }));

      const expectedAriaLabels = [
        "aria-label=\"cpu\"",
        "aria-label=\"gpu\"",
        "aria-label=\"motherboard\"",
        "aria-label=\"ram\"",
        "aria-label=\"storage\"",
        "aria-label=\"psu\"",
        "aria-label=\"tower\"",
        "aria-label=\"cooling\"",
      ];

      expectedAriaLabels.forEach((label) => {
        expect(html).toContain(label);
      });

      const pCpu = html.indexOf(testRig.cpu);
      const pGpu = html.indexOf(testRig.gpu);
      const pMobo = html.indexOf(testRig.motherboard);
      const pRam = html.indexOf(testRig.ram);
      const pStorage = html.indexOf(testRig.storage);
      const pPsu = html.indexOf(testRig.psu);
      const pTower = html.indexOf(testRig.chassis);
      const pCooling = html.indexOf(testRig.cooling);

      expect(pCpu).toBeGreaterThan(-1);
      expect(pGpu).toBeGreaterThan(pCpu);
      expect(pMobo).toBeGreaterThan(pGpu);
      expect(pRam).toBeGreaterThan(pMobo);
      expect(pStorage).toBeGreaterThan(pRam);
      expect(pPsu).toBeGreaterThan(pStorage);
      expect(pTower).toBeGreaterThan(pPsu);
      expect(pCooling).toBeGreaterThan(pTower);
    });

    it("ensures HardwareSpecIcon renders valid SVG vector silhouetted icons for each spec part", () => {
      const partTypes: HardwarePartType[] = [
        "cpu",
        "gpu",
        "motherboard",
        "ram",
        "storage",
        "psu",
        "tower",
        "cooling",
      ];

      partTypes.forEach((part) => {
        const html = renderToStaticMarkup(
          React.createElement(HardwareSpecIcon, { part, className: "w-4 h-4 text-emerald-400" })
        );
        expect(html).toContain("<svg");
        expect(html).toContain(`aria-label="${part}"`);
        expect(html).toContain("text-emerald-400");
      });
    });
  });

  describe("Suite 3: Accessibility & 44px Tap Target Compliance", () => {
    it("validates PrebuiltSystemCard Add to Cart button meets 44px tap target height (min-h-[44px])", () => {
      const testRig = PREBUILT_SYSTEMS[0];
      const html = renderToStaticMarkup(React.createElement(PrebuiltSystemCard, { rig: testRig }));
      expect(html).toContain("min-h-[44px]");
      expect(html).toContain("Add to Cart");
    });

    it("validates Storefront prebuilt section header View More link meets 44px tap target height", () => {
      const html = renderToStaticMarkup(React.createElement(HomePage));
      const sectionMatch = html.match(/<section[^>]*id="prebuilt"[^>]*>([\s\S]*?)<\/section>/);
      expect(sectionMatch).not.toBeNull();
      const sectionHtml = sectionMatch![1];

      const headerViewMoreMatch = sectionHtml.match(
        /<a[^>]*href="\/prebuilts"[^>]*>([\s\S]*?)<\/a>/
      );
      expect(headerViewMoreMatch).not.toBeNull();
      expect(headerViewMoreMatch![0]).toContain("min-h-[44px]");
    });

    it("validates Storefront prebuilt section bottom CTA button meets 44px tap target height", () => {
      const html = renderToStaticMarkup(React.createElement(HomePage));
      const sectionMatch = html.match(/<section[^>]*id="prebuilt"[^>]*>([\s\S]*?)<\/section>/);
      expect(sectionMatch).not.toBeNull();
      const sectionHtml = sectionMatch![1];

      expect(sectionHtml).toContain("View More Prebuilts");
      const bottomCtaMatches = sectionHtml.match(
        /<a[^>]*href="\/prebuilts"[^>]*>[\s\S]*?View More Prebuilts[\s\S]*?<\/a>/
      );
      expect(bottomCtaMatches).not.toBeNull();
      expect(bottomCtaMatches![0]).toContain("min-h-[44px]");
    });

    it("validates Admin featured prebuilts control buttons satisfy 44px minimum tap targets", () => {
      const adminPath = path.resolve(process.cwd(), "src/app/admin/page.tsx");
      const adminContent = fs.readFileSync(adminPath, "utf-8");

      expect(adminContent).toContain("Featured Prebuilt Systems (Homepage Showcase)");
      // Verify admin featured prebuilts buttons contain min-h-[44px]
      expect(adminContent).toContain("handleResetFeaturedPrebuilts");
      expect(adminContent).toContain("handleSaveFeaturedPrebuilts");
      expect(adminContent).toContain("handleMoveFeaturedPrebuilt");
      expect(adminContent).toContain("handleToggleFeaturedPrebuilt");

      const minH44Count = (adminContent.match(/min-h-\[44px\]/g) || []).length;
      expect(minH44Count).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Suite 4: Viewport Density & Responsive Layout Architecture", () => {
    it("validates Storefront prebuilt section uses 1920px max-width container", () => {
      const html = renderToStaticMarkup(React.createElement(HomePage));
      expect(html).toContain('id="prebuilt"');
      expect(html).toContain("max-w-[1920px]");
    });

    it("validates Storefront prebuilt section implements 2-col to 4-col grid (grid-cols-2 lg:grid-cols-4)", () => {
      const html = renderToStaticMarkup(React.createElement(HomePage));
      expect(html).toContain("grid-cols-2 lg:grid-cols-4");
    });

    it("validates exactly 4 cards rendered with cards 3 and 4 hidden on mobile/tablet (hidden lg:flex)", () => {
      const html = renderToStaticMarkup(React.createElement(HomePage));
      const sectionMatch = html.match(/<section[^>]*id="prebuilt"[^>]*>([\s\S]*?)<\/section>/);
      expect(sectionMatch).not.toBeNull();
      const sectionHtml = sectionMatch![1];

      const articleRegex = /<article[^>]*class="([^"]*)"/g;
      const cardMatches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;
      while ((match = articleRegex.exec(sectionHtml)) !== null) {
        cardMatches.push(match);
      }

      expect(cardMatches.length).toBe(4);
      expect(cardMatches[0][1]).toContain("flex");
      expect(cardMatches[0][1]).not.toContain("hidden lg:flex");
      expect(cardMatches[1][1]).toContain("flex");
      expect(cardMatches[1][1]).not.toContain("hidden lg:flex");
      expect(cardMatches[2][1]).toContain("hidden lg:flex");
      expect(cardMatches[3][1]).toContain("hidden lg:flex");
    });

    it("validates PrebuiltSystemCard footer implements stacked mobile and horizontal desktop layout", () => {
      const testRig = PREBUILT_SYSTEMS[0];
      const html = renderToStaticMarkup(React.createElement(PrebuiltSystemCard, { rig: testRig }));
      expect(html).toContain("flex-col");
      expect(html).toContain("lg:flex-row");
      expect(html).toContain("lg:items-center");
      expect(html).toContain("lg:justify-between");
    });
  });

  describe("Suite 5: Anti-Slop Craft Standards & Visual Cleanliness", () => {
    it("strictly eliminates marketing badges (e.g. 'Stress Tested', 'Ready for Pickup', 'Flagship Hub')", () => {
      PREBUILT_SYSTEMS.forEach((rig) => {
        const html = renderToStaticMarkup(React.createElement(PrebuiltSystemCard, { rig }));
        expect(html).not.toContain("Stress Tested");
        expect(html).not.toContain("Ready for Pickup");
        expect(html).not.toContain("Flagship Hub");
      });
    });

    it("strictly eliminates tax, vat, or ppn subtext in pricing display", () => {
      PREBUILT_SYSTEMS.forEach((rig) => {
        const html = renderToStaticMarkup(React.createElement(PrebuiltSystemCard, { rig }));
        expect(html.toLowerCase()).not.toContain("ppn");
        expect(html.toLowerCase()).not.toContain("vat");
        expect(html.toLowerCase()).not.toContain("tax");
      });
    });

    it("displays product model name linked to product detail page without SKU string clutter", () => {
      PREBUILT_SYSTEMS.forEach((rig) => {
        const html = renderToStaticMarkup(React.createElement(PrebuiltSystemCard, { rig }));
        expect(html).toContain(rig.name);
        expect(html).toContain(`href="/products/${rig.id}"`);
        expect(html).not.toContain(rig.sku);
      });
    });

    it("implements picture frame aspect ratio aspect-[16/10] with smooth hover crossfade", () => {
      const testRig = PREBUILT_SYSTEMS[0];
      const html = renderToStaticMarkup(React.createElement(PrebuiltSystemCard, { rig: testRig }));
      expect(html).toContain("aspect-[16/10]");
      expect(html).toContain("group-hover:opacity-0");
      expect(html).toContain("group-hover:opacity-100");
    });
  });

  describe("Suite 6: Homepage Modules Config & Admin API Contract", () => {
    it("validates DEFAULT_FEATURED_PREBUILT_IDS contains valid prebuilt system IDs", () => {
      expect(DEFAULT_FEATURED_PREBUILT_IDS.length).toBe(4);
      DEFAULT_FEATURED_PREBUILT_IDS.forEach((id) => {
        const exists = PREBUILT_SYSTEMS.some((p) => p.id === id);
        expect(exists, `ID ${id} in DEFAULT_FEATURED_PREBUILT_IDS is not in PREBUILT_SYSTEMS`).toBe(true);
      });
    });

    it("validates DEFAULT_HOMEPAGE_LAYOUT contains prebuilt_systems module and featuredPrebuiltIds", () => {
      const moduleConfig = DEFAULT_HOMEPAGE_MODULES.find(
        (m) => m.id === "prebuilt_systems"
      );
      expect(moduleConfig).toBeDefined();
      expect(moduleConfig!.enabled).toBe(true);
      expect(DEFAULT_HOMEPAGE_LAYOUT.featuredPrebuiltIds).toEqual(
        DEFAULT_FEATURED_PREBUILT_IDS
      );
    });

    it("validates resolveActivePrebuilts fallback behavior under all edge cases", () => {
      // 1. Exactly 4 IDs
      const exactFour = resolveActivePrebuilts(["pb-4", "pb-3", "pb-2", "pb-1"], PREBUILT_SYSTEMS, 4);
      expect(exactFour.map((r) => r.id)).toEqual(["pb-4", "pb-3", "pb-2", "pb-1"]);

      // 2. Partial list (1 ID): fills remaining with distinct IDs
      const partial = resolveActivePrebuilts(["pb-3"], PREBUILT_SYSTEMS, 4);
      expect(partial.length).toBe(4);
      expect(partial[0].id).toBe("pb-3");
      expect(new Set(partial.map((r) => r.id)).size).toBe(4);

      // 3. Empty list: defaults to first 4
      const empty = resolveActivePrebuilts([], PREBUILT_SYSTEMS, 4);
      expect(empty.length).toBe(4);
      expect(empty.map((r) => r.id)).toEqual(["pb-1", "pb-2", "pb-3", "pb-4"]);

      // 4. Invalid IDs: ignored and filled with valid ones
      const invalid = resolveActivePrebuilts(["invalid-id-1", "pb-2"], PREBUILT_SYSTEMS, 4);
      expect(invalid.length).toBe(4);
      expect(invalid[0].id).toBe("pb-2");
      expect(new Set(invalid.map((r) => r.id)).size).toBe(4);

      // 5. Overflow list: truncated to 4
      const overflow = resolveActivePrebuilts(["pb-5", "pb-4", "pb-3", "pb-2", "pb-1"], PREBUILT_SYSTEMS, 4);
      expect(overflow.length).toBe(4);
      expect(overflow.map((r) => r.id)).toEqual(["pb-5", "pb-4", "pb-3", "pb-2"]);
    });

    it("validates homepage modules GET and PUT endpoints for featuredPrebuiltIds", async () => {
      // Test GET
      const getRes = await GET();
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(Array.isArray(getJson.modules)).toBe(true);
      expect(Array.isArray(getJson.featuredPrebuiltIds)).toBe(true);
      expect(getJson.featuredPrebuiltIds.length).toBe(4);

      // Test PUT update
      const newIds = ["pb-2", "pb-3", "pb-1", "pb-4"];
      const putReq = new NextRequest("http://localhost:3000/api/admin/homepage-modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featuredPrebuiltIds: newIds,
        }),
      });
      const putRes = await PUT(putReq);
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.success).toBe(true);
      expect(putJson.featuredPrebuiltIds).toEqual(newIds);

      // Restore to default
      const restoreReq = new NextRequest("http://localhost:3000/api/admin/homepage-modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featuredPrebuiltIds: DEFAULT_FEATURED_PREBUILT_IDS,
        }),
      });
      await PUT(restoreReq);
    });
  });
});
