import assert from "node:assert/strict";
import { test } from "node:test";
import { getExpandedCatalogItems, MOCK_COMPONENTS } from "../src/lib/data/mockHardware";

test("Catalog items include variations with correct link URLs and titles", () => {
  const expanded = getExpandedCatalogItems(MOCK_COMPONENTS);

  // ram-3 has 4 variations
  const whiteRam = expanded.find((item) => item.variationId === "ram-3-white-32");
  assert.ok(whiteRam, "White RAM variation tile should exist");
  assert.equal(whiteRam.parentProductId, "ram-3");
  assert.ok(whiteRam.name.includes("White"), "Variation tile title should include White");
  assert.equal(whiteRam.price, 1449000);
  assert.equal(whiteRam.stockCount, 10);

  // Link destination check
  const linkUrl = `/products/${whiteRam.parentProductId}?variation=${whiteRam.variationId}`;
  assert.equal(linkUrl, "/products/ram-3?variation=ram-3-white-32");

  // Non-variation items should remain intact
  const standardCpu = expanded.find((item) => item.id === "cpu-1");
  assert.ok(standardCpu, "Standard items without variations should remain in catalog");
  assert.equal(standardCpu.variationId, undefined);
});

test("Variation tiles have formatted titles and variation-specific images", () => {
  const expanded = getExpandedCatalogItems(MOCK_COMPONENTS);
  const whiteRam = expanded.find((item) => item.variationId === "ram-1-white-32");
  assert.ok(whiteRam, "White RAM tile exists");
  assert.equal(
    whiteRam.image,
    "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500&auto=format&fit=crop&q=60&variant=white"
  );
  // Multi-attribute format: Item Name - Variation 1 - Variation 2
  assert.equal(
    whiteRam.name,
    "Corsair Vengeance RGB DDR5 - 32GB (2x16GB) - White"
  );
});

test("Catalog expansion generates individual tiles for all variations with deep links", () => {
  const expanded = getExpandedCatalogItems(MOCK_COMPONENTS);
  const ram1Vars = expanded.filter((item) => item.parentProductId === "ram-1");
  assert.equal(ram1Vars.length, 4, "ram-1 should expand to 4 variation tiles");
  for (const v of ram1Vars) {
    assert.ok(v.variationId, "Must have variationId");
    assert.equal(v.parentProductId, "ram-1");
    assert.ok(v.name.startsWith("Corsair Vengeance RGB DDR5"), "Name starts with parent title");
    const itemHref = `/products/${v.parentProductId}?variation=${v.variationId}`;
    assert.ok(itemHref.startsWith("/products/ram-1?variation="));
  }
});

test("Catalog expansion propagates variation SKU and filters inactive variations", () => {
  const expanded = getExpandedCatalogItems(MOCK_COMPONENTS);
  const whiteRam = expanded.find((item) => item.variationId === "ram-1-white-32");
  assert.ok(whiteRam, "White RAM tile exists");
  // Reviewer Finding 1: Variation SKU must be set
  assert.equal(whiteRam.sku, "COR-CMH32GX5M2B6000C30-W");

  // Reviewer Finding 3: Inactive variations must not be included
  const mockWithInactive = [
    {
      id: "test-prod",
      sku: "TEST-SKU",
      name: "Test Parent Item",
      brand: "TestBrand",
      category: "Memory",
      slot: "ram",
      price: 1000000,
      image: "/test.jpg",
      inStock: true,
      stockCount: 10,
      specs: {},
      variations: [
        {
          id: "var-active",
          productId: "test-prod",
          name: "Active Variation",
          sku: "TEST-VAR-ACTIVE",
          price: 1000000,
          stockCount: 5,
          attributes: { Colour: "Red" },
          isActive: true,
        },
        {
          id: "var-inactive",
          productId: "test-prod",
          name: "Inactive Variation",
          sku: "TEST-VAR-INACTIVE",
          price: 1000000,
          stockCount: 5,
          attributes: { Colour: "Blue" },
          isActive: false,
        },
      ],
    },
  ];

  const expandedInactive = getExpandedCatalogItems(mockWithInactive as any);
  assert.equal(expandedInactive.length, 1, "Only active variation should be expanded");
  assert.equal(expandedInactive[0].variationId, "var-active");
});



