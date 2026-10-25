import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CANONICAL_PROMO_BANNERS,
  CANONICAL_PROMO_SLIDES,
  mapBannerToPromoSlide,
  areSlidesEqual,
} from "../src/lib/data/promotionalBannersData";

test("Canonical promotional banners has 6 complete slides with consistent copywriting", () => {
  assert.equal(CANONICAL_PROMO_BANNERS.length, 6, "Must define all 6 canonical promotion banners");

  const whiteFestival = CANONICAL_PROMO_BANNERS.find(
    (b) => b.title === "Incus White Edition Build Festival"
  );
  assert.ok(whiteFestival, "Incus White Edition Build Festival banner must exist");
  assert.equal(whiteFestival.display_order, 1);
  assert.ok(
    whiteFestival.description?.includes("custom white braided cables"),
    "First banner description must include custom white braided cables to prevent text switching"
  );

  const rtxDrop = CANONICAL_PROMO_BANNERS.find(
    (b) => b.title === "RTX 4070 Ti SUPER & 4080 SUPER Drop"
  );
  assert.ok(rtxDrop, "RTX Drop banner must exist");
  assert.ok(
    rtxDrop.description?.includes("assembled same-day"),
    "Third banner description must include assembled same-day"
  );
});

test("mapBannerToPromoSlide produces correct client slide format without data loss", () => {
  for (const banner of CANONICAL_PROMO_BANNERS) {
    const slide = mapBannerToPromoSlide(banner);
    assert.equal(slide.id, banner.id);
    assert.equal(slide.title, banner.title);
    assert.equal(slide.highlight, banner.highlight);
    assert.equal(slide.description, banner.description);
    assert.equal(slide.badge, banner.badge);
    assert.equal(slide.perk, banner.perk);
    assert.equal(slide.ctaLink, banner.cta_link);
    assert.equal(slide.ctaText, banner.cta_text || "Explore Now");
  }
});

test("areSlidesEqual accurately detects identical and modified slide lists", () => {
  const initial = CANONICAL_PROMO_SLIDES;
  const identicalMapped = CANONICAL_PROMO_BANNERS.map(mapBannerToPromoSlide);

  // Exact match should return true (preventing state update and re-render flicker)
  assert.equal(
    areSlidesEqual(initial, identicalMapped),
    true,
    "Identical mapped slides must evaluate as equal to prevent re-render"
  );

  // Altered description must return false
  const altered = identicalMapped.map((s, idx) =>
    idx === 0 ? { ...s, description: "Altered description text" } : s
  );
  assert.equal(
    areSlidesEqual(initial, altered),
    false,
    "Changed description must be detected so admin updates still take effect"
  );

  // Different length must return false
  assert.equal(
    areSlidesEqual(initial, initial.slice(0, 3)),
    false,
    "Different slide counts must be detected"
  );
});
