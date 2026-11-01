import assert from "node:assert/strict";
import { test } from "node:test";
import { MOCK_COMPONENTS, ProductVariation } from "../src/lib/data/mockHardware";

test("Variation attribute resolution, grouping, and stock checks", () => {
  const ramItem = MOCK_COMPONENTS.find((item) => item.id === "ram-3");
  assert.ok(ramItem && ramItem.variations && ramItem.variations.length > 0);

  // Helper matching attributes
  const findVariation = (variations: ProductVariation[], selectedAttrs: Record<string, string>) => {
    return variations.find((v) =>
      Object.entries(selectedAttrs).every(([k, val]) => v.attributes[k] === val)
    );
  };

  // Test Capacity & Colour match
  const white32 = findVariation(ramItem.variations, { Capacity: "32GB (2x16GB)", Colour: "White" });
  assert.ok(white32, "Should find 32GB White variation");
  assert.equal(white32.price, 1449000);
  assert.equal(white32.stockCount, 10);

  const black64 = findVariation(ramItem.variations, { Capacity: "64GB (2x32GB)", Colour: "Black" });
  assert.ok(black64, "Should find 64GB Black variation");
  assert.equal(black64.stockCount, 0); // Out of stock

  // Attribute groups extraction
  const attributeGroups: Record<string, string[]> = {};
  for (const v of ramItem.variations) {
    for (const [key, val] of Object.entries(v.attributes)) {
      if (!attributeGroups[key]) attributeGroups[key] = [];
      if (!attributeGroups[key].includes(val)) attributeGroups[key].push(val);
    }
  }

  assert.deepEqual(attributeGroups["Colour"], ["Black", "White"]);
  assert.deepEqual(attributeGroups["Capacity"], ["16GB (2x8GB)", "32GB (2x16GB)", "64GB (2x32GB)"]);
});
