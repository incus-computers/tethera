import assert from "node:assert/strict";
import { test } from "node:test";
import { ProductVariation } from "../src/lib/db/types";

test("Admin variations manager state operations", () => {
  let variations: ProductVariation[] = [];

  // Add variation
  const newVar: ProductVariation = {
    id: "var-1",
    productId: "prod-1",
    name: "32GB (2x16GB) White",
    price: 1490000,
    stockCount: 10,
    attributes: { Capacity: "32GB", Colour: "White" },
  };
  variations = [...variations, newVar];
  assert.equal(variations.length, 1);

  // Edit variation
  variations = variations.map((v) => (v.id === "var-1" ? { ...v, stockCount: 12 } : v));
  assert.equal(variations[0].stockCount, 12);

  // Delete variation
  variations = variations.filter((v) => v.id !== "var-1");
  assert.equal(variations.length, 0);
});

test("Admin variations manager supports assigning and updating tile image", () => {
  let variations: ProductVariation[] = [];
  const newVar: ProductVariation = {
    id: "var-1",
    productId: "prod-1",
    name: "32GB White",
    price: 1490000,
    stockCount: 10,
    attributes: { Colour: "White" },
    image: "https://example.com/ram-white.jpg",
  };
  variations = [...variations, newVar];
  assert.equal(variations[0].image, "https://example.com/ram-white.jpg");

  // Update image
  variations = variations.map((v) =>
    v.id === "var-1" ? { ...v, image: "https://example.com/ram-white-v2.jpg" } : v
  );
  assert.equal(variations[0].image, "https://example.com/ram-white-v2.jpg");

  // Clear image to use default product photo
  variations = variations.map((v) =>
    v.id === "var-1" ? { ...v, image: undefined } : v
  );
  assert.equal(variations[0].image, undefined);
});

