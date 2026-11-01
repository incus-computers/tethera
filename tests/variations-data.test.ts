import assert from "node:assert/strict";
import { test } from "node:test";
import { getExpandedCatalogItems, MOCK_COMPONENTS } from "../src/lib/data/mockHardware";

test("ProductVariation model and catalog expansion", () => {
  const corsair = MOCK_COMPONENTS.find((item) => item.id === "ram-1");
  assert.ok(corsair, "Corsair RAM should exist in mock hardware");
  assert.ok(corsair.variations && corsair.variations.length >= 2, "Corsair RAM should have at least 2 variations");

  const expanded = getExpandedCatalogItems([corsair]);
  assert.equal(expanded.length, corsair.variations.length, "Expanded catalog items should match variation count");
  assert.ok(expanded[0].variationId, "Expanded item should carry variationId");
  assert.ok(expanded[0].parentProductId, "Expanded item should carry parentProductId");
  assert.equal(expanded[0].parentProductId, "ram-1");
});
