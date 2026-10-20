// @ts-ignore
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import {
  DEFAULT_FEATURED_PREBUILT_IDS,
  DEFAULT_HOMEPAGE_LAYOUT,
  HomepageLayoutConfig,
} from "../src/lib/data/homepageConfig";
import { PREBUILT_SYSTEMS } from "../src/lib/data/mockHardware";
import { GET, PUT } from "../src/app/api/admin/homepage-modules/route";

describe("Admin Featured Prebuilt Systems Configuration", () => {
  it("exports DEFAULT_FEATURED_PREBUILT_IDS with default system IDs", () => {
    expect(DEFAULT_FEATURED_PREBUILT_IDS).toBeDefined();
    expect(Array.isArray(DEFAULT_FEATURED_PREBUILT_IDS)).toBe(true);
    expect(DEFAULT_FEATURED_PREBUILT_IDS).toEqual(["pb-1", "pb-2", "pb-3", "pb-4"]);
  });

  it("ensures all DEFAULT_FEATURED_PREBUILT_IDS exist in PREBUILT_SYSTEMS", () => {
    const systemIds = PREBUILT_SYSTEMS.map((sys) => sys.id);
    for (const id of DEFAULT_FEATURED_PREBUILT_IDS) {
      expect(systemIds).toContain(id);
    }
  });

  it("exports DEFAULT_HOMEPAGE_LAYOUT with featuredPrebuiltIds populated", () => {
    expect(DEFAULT_HOMEPAGE_LAYOUT).toBeDefined();
    expect(DEFAULT_HOMEPAGE_LAYOUT.featuredPrebuiltIds).toEqual(
      DEFAULT_FEATURED_PREBUILT_IDS
    );
    expect(DEFAULT_HOMEPAGE_LAYOUT.modules.length).toBeGreaterThan(0);
    expect(DEFAULT_HOMEPAGE_LAYOUT.customPcHero).toBeDefined();
  });

  it("validates HomepageLayoutConfig type structure", () => {
    const customConfig: HomepageLayoutConfig = {
      modules: DEFAULT_HOMEPAGE_LAYOUT.modules,
      customPcHero: DEFAULT_HOMEPAGE_LAYOUT.customPcHero,
      featuredPrebuiltIds: ["pb-4", "pb-5", "pb-6"],
    };
    expect(customConfig.featuredPrebuiltIds).toHaveLength(3);
    expect(customConfig.featuredPrebuiltIds[0]).toBe("pb-4");
  });

  it("API route GET returns featuredPrebuiltIds", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.featuredPrebuiltIds).toBeDefined();
    expect(Array.isArray(data.featuredPrebuiltIds)).toBe(true);
    expect(data.featuredPrebuiltIds.length).toBe(4);
  });

  it("API route PUT updates and returns updated featuredPrebuiltIds", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/homepage-modules", {
      method: "PUT",
      body: JSON.stringify({
        featuredPrebuiltIds: ["pb-3", "pb-2", "pb-1"],
      }),
    });
    const res = await PUT(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.featuredPrebuiltIds).toEqual(["pb-3", "pb-2", "pb-1"]);

    // Verify subsequent GET returns the newly set order
    const getRes = await GET();
    const getData = await getRes.json();
    expect(getData.featuredPrebuiltIds).toEqual(["pb-3", "pb-2", "pb-1"]);

    // Restore to default
    const restoreReq = new NextRequest("http://localhost:3000/api/admin/homepage-modules", {
      method: "PUT",
      body: JSON.stringify({
        featuredPrebuiltIds: DEFAULT_FEATURED_PREBUILT_IDS,
      }),
    });
    await PUT(restoreReq);
  });

  it("ensures homepageConfig.ts contains zero em dashes", () => {
    const filePath = path.resolve(__dirname, "../src/lib/data/homepageConfig.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("\u2014");
  });

  it("ensures admin homepage-modules route contains zero em dashes", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/api/admin/homepage-modules/route.ts"
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("\u2014");
  });

  it("ensures admin page.tsx contains zero em dashes", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("\u2014");
  });
});
