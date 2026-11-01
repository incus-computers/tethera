import assert from "node:assert/strict";
import { test } from "node:test";
import { useCartStore } from "../src/lib/store/useCartStore";

test("useCartStore handles variations as distinct line items", () => {
  const store = useCartStore.getState();
  store.clearCart();

  const mockItemWhite = {
    id: "ram-3-var-ram-3-white-32",
    sku: "COR-CMK32GX4M2D3600C18-W",
    name: "Corsair Vengeance LPX DDR4",
    brand: "Corsair",
    category: "Memory",
    slot: "ram",
    variationId: "ram-3-white-32",
    variationName: "32GB (2x16GB) White",
    price: 1449000,
    inStock: true,
    stockCount: 10,
    image: "/images/ram.jpg",
    specs: {},
  };

  const mockItemBlack = {
    id: "ram-3-var-ram-3-black-32",
    sku: "COR-CMK32GX4M2D3600C18-B",
    name: "Corsair Vengeance LPX DDR4",
    brand: "Corsair",
    category: "Memory",
    slot: "ram",
    variationId: "ram-3-black-32",
    variationName: "32GB (2x16GB) Black",
    price: 1399000,
    inStock: true,
    stockCount: 15,
    image: "/images/ram.jpg",
    specs: {},
  };

  store.addStandardItem(mockItemWhite, 1);
  store.addStandardItem(mockItemBlack, 2);

  const items = useCartStore.getState().items;
  assert.equal(items.length, 2, "Cart should hold 2 distinct lines for different variations");
  assert.equal(items[0].item.variationName, "32GB (2x16GB) White");
  assert.equal(items[1].item.variationName, "32GB (2x16GB) Black");
  assert.equal(items[0].quantity, 1);
  assert.equal(items[1].quantity, 2);

  // Test quantity bounds
  store.updateQuantity(items[0].id, 100);
  assert.equal(useCartStore.getState().items[0].quantity, 10, "Quantity should clamp to stockCount (10)");
});

test("Cart preserves variation title, SKU, price, and image", () => {
  const store = useCartStore.getState();
  store.clearCart();

  const variationItem = {
    id: "ram-1-var-ram-1-white-32",
    parentProductId: "ram-1",
    variationId: "ram-1-white-32",
    sku: "COR-CMH32GX5M2B6000C30-W",
    name: "Corsair Vengeance RGB DDR5 - 32GB (2x16GB) - White",
    brand: "Corsair",
    category: "Memory",
    slot: "ram",
    variationName: "32GB (2x16GB) White",
    price: 2349000,
    inStock: true,
    stockCount: 8,
    image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500&auto=format&fit=crop&q=60&variant=white",
    specs: {},
  };

  store.addStandardItem(variationItem, 1);
  const cartItems = useCartStore.getState().items;
  assert.equal(cartItems.length, 1);
  assert.equal(cartItems[0].item.name, "Corsair Vengeance RGB DDR5 - 32GB (2x16GB) - White");
  assert.equal(cartItems[0].item.sku, "COR-CMH32GX5M2B6000C30-W");
  assert.equal(cartItems[0].item.price, 2349000);
  assert.equal(cartItems[0].item.image, "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500&auto=format&fit=crop&q=60&variant=white");
});

import { formatVariationTitle, MOCK_COMPONENTS } from "../src/lib/data/mockHardware";

test("Detail page cart payload builder constructs correct variation line item with formatVariationTitle", () => {
  const store = useCartStore.getState();
  store.clearCart();

  const parentComponent = MOCK_COMPONENTS.find((c) => c.id === "ram-1")!;
  assert.ok(parentComponent, "Parent component ram-1 must exist");
  const whiteVar = parentComponent.variations!.find((v) => v.id === "ram-1-white-32")!;
  assert.ok(whiteVar, "Variation ram-1-white-32 must exist");

  const formattedName = formatVariationTitle(parentComponent.name, whiteVar);
  assert.equal(formattedName, "Corsair Vengeance RGB DDR5 - 32GB (2x16GB) - White");

  // Simulate detail page handleAddToCart payload
  const cartPayload = {
    ...parentComponent,
    id: `${parentComponent.id}-var-${whiteVar.id}`,
    sku: whiteVar.sku || parentComponent.sku,
    name: formattedName,
    image: whiteVar.image || parentComponent.image,
    price: whiteVar.price,
    stockCount: whiteVar.stockCount,
    variationId: whiteVar.id,
    variationName: whiteVar.name,
    selectedAttributes: whiteVar.attributes,
  };

  store.addStandardItem(cartPayload, 1);
  const cartItems = useCartStore.getState().items;
  assert.equal(cartItems.length, 1);
  assert.equal(cartItems[0].item.sku, "COR-CMH32GX5M2B6000C30-W");
  assert.equal(cartItems[0].item.name, "Corsair Vengeance RGB DDR5 - 32GB (2x16GB) - White");
  assert.equal(cartItems[0].item.image, whiteVar.image);
});


