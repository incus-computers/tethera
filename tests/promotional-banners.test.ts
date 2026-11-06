// @ts-ignore
import { describe, it, expect } from "vitest";
import {
  CANONICAL_PROMO_BANNERS,
  CANONICAL_PROMO_SLIDES,
  mapBannerToPromoSlide,
  areSlidesEqual,
} from "@/lib/data/promotionalBannersData";

describe("Promotional Banners Consistency", () => {
  it("Canonical promotional banners has 6 complete slides with consistent copywriting", () => {
    expect(CANONICAL_PROMO_BANNERS.length).toBe(6);

    const whiteFestival = CANONICAL_PROMO_BANNERS.find(
      (b) => b.title === "Incus White Edition Build Festival"
    );
    expect(whiteFestival).toBeDefined();
    expect(whiteFestival!.display_order).toBe(1);
    expect(whiteFestival!.description).toContain("custom white braided cables");

    const rtxDrop = CANONICAL_PROMO_BANNERS.find(
      (b) => b.title === "RTX 4070 Ti SUPER & 4080 SUPER Drop"
    );
    expect(rtxDrop).toBeDefined();
    expect(rtxDrop!.description).toContain("assembled same-day");
  });

  it("mapBannerToPromoSlide produces correct client slide format without data loss", () => {
    for (const banner of CANONICAL_PROMO_BANNERS) {
      const slide = mapBannerToPromoSlide(banner);
      expect(slide.id).toBe(banner.id);
      expect(slide.title).toBe(banner.title);
      expect(slide.highlight).toBe(banner.highlight);
      expect(slide.description).toBe(banner.description);
      expect(slide.badge).toBe(banner.badge);
      expect(slide.perk).toBe(banner.perk);
      expect(slide.ctaLink).toBe(banner.cta_link);
      expect(slide.ctaText).toBe(banner.cta_text || "Explore Now");
    }
  });

  it("areSlidesEqual accurately detects identical and modified slide lists", () => {
    const initial = CANONICAL_PROMO_SLIDES;
    const identicalMapped = CANONICAL_PROMO_BANNERS.map(mapBannerToPromoSlide);

    // Exact match should return true (preventing state update and re-render flicker)
    expect(areSlidesEqual(initial, identicalMapped)).toBe(true);

    // Altered description must return false
    const altered = identicalMapped.map((s, idx) =>
      idx === 0 ? { ...s, description: "Altered description text" } : s
    );
    expect(areSlidesEqual(initial, altered)).toBe(false);

    // Different length must return false
    expect(areSlidesEqual(initial, initial.slice(0, 3))).toBe(false);
  });
});
