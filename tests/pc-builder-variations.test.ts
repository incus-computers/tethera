import assert from "node:assert/strict";
import { test } from "node:test";
import { getExpandedCatalogItems, MOCK_COMPONENTS } from "../src/lib/data/mockHardware";

test("PC Builder components list expands variations for selection", () => {
  const ramItems = MOCK_COMPONENTS.filter((item) => item.slot === "ram");
  const expandedRam = getExpandedCatalogItems(ramItems);

  assert.ok(
    expandedRam.length > ramItems.length,
    "Expanded RAM should have more selectable options than parent items"
  );

  const whiteRam = expandedRam.find((item) => item.variationId === "ram-3-white-32");
  assert.ok(whiteRam, "White RAM variation should be present in builder options");
  assert.ok(
    whiteRam.name.includes("White"),
    "Builder option title should include variation name"
  );
  assert.equal(whiteRam.price, 1449000);
  assert.equal(whiteRam.specs.ramType, "DDR4");
});
