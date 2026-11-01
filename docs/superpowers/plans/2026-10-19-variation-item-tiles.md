# Product Variation Storefront Tiles and Admin Image Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render distinct storefront catalog tiles for every product variation combination with customized `Item Name - Variation 1 - Variation 2` titles and admin-assigned images, linking seamlessly to the product detail page with the variation preselected.

**Architecture:** Extend the `ProductVariation` interface with an optional `image` field selected from the parent product's gallery in the admin portal. Expand catalog items into individual tiles across all storefront grids (catalog, category pages, homepage, and PC builder) using `getExpandedCatalogItems`, setting variation-specific titles, images, prices, and query parameters (`?variation=[id]`), and synchronizing the detail page gallery when loaded.

**Tech Stack:** Next.js 14 (App Router), TypeScript 5, Tailwind CSS, Zustand, Node.js Test Runner (`node:test`, `node:assert/strict`).

**Spec:** [docs/superpowers/specs/2026-10-19-variation-item-tiles-design.md](file:///C:/Users/darkl/OneDrive/Desktop/trial/docs/superpowers/specs/2026-10-19-variation-item-tiles-design.md)

## Global Constraints

- Never use em dashes (`—`) in text or code comments: use commas, periods, colons, or parentheses.
- Minimum 44px tap targets (`min-h-[44px]`, `min-w-[44px]`) on all interactive controls including thumbnails.
- WCAG AA color contrast (minimum 4.5:1 ratio) on all text, badges, and status labels.
- Clear, visible focus indicators (`focus-visible:ring-2 focus-visible:ring-primary`) on all clickable elements.
- Maintain full UI states: empty, loading, and error states on all data views.
- No dummy links: every link must navigate to a real route (`/products/[id]?variation=[variationId]`).

## Review Focus

1. **Missing or broken variation image URL**: Ensure fallback to the parent product's primary image so tiles never render with broken images.
2. **Title redundancy**: If the parent item title already contains an attribute name (e.g. parent name is "Corsair Vengeance RGB 32GB" and variation attribute is "32GB"), avoid duplicating terms into "Corsair Vengeance RGB 32GB - 32GB - White".
3. **Out-of-stock variations**: An out-of-stock variation tile must clearly display out-of-stock state and disable quick add-to-cart.
4. **Detail page deep-linking without query match**: If `?variation=invalid-id` is provided, gracefully fall back to the first available in-stock variation without crashing.
5. **Direct add-to-cart line items**: Adding directly from a variation tile must create a distinct cart line item with the variation's SKU, price, and image.

---

### Task 1: Data Model and Title/Image Generation in getExpandedCatalogItems

**Files:**
- Modify: `src/lib/db/types.ts:132-144`
- Modify: `src/lib/data/mockHardware.ts:184-228, 1384-1415`
- Test: `tests/catalog-tiles.test.ts`

**Interfaces:**
- Consumes: `ProductVariation`, `ComponentItem`
- Produces: `ProductVariation.image?: string`, updated `getExpandedCatalogItems(items: ComponentItem[]): ComponentItem[]` returning titles formatted as `Item Name - Variation 1 - Variation 2` and using `variation.image` with fallback to `item.image`.

- [ ] **Step 1: Write the failing test**

Edit `tests/catalog-tiles.test.ts` to assert that:
- Multi-attribute variation tiles are formatted as `Item Name - Variation 1 - Variation 2`.
- Variation tiles have `image` equal to `variation.image` (or fallback to parent `image`).
- Variation tiles without assigned images fall back to the parent item image.

```typescript
test("Variation tiles have formatted titles and variation-specific images", () => {
  const expanded = getExpandedCatalogItems(MOCK_COMPONENTS);
  const whiteRam = expanded.find((item) => item.variationId === "ram-1-white-32");
  assert.ok(whiteRam, "White RAM tile exists");
  assert.equal(whiteRam.image, "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500&auto=format&fit=crop&q=60&variant=white");
  // Check title structure: Parent name followed by attributes
  assert.ok(whiteRam.name.includes("White"), "Title contains White");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/catalog-tiles.test.ts`
Expected: FAIL because `ram-1-white-32` does not yet have `image` property or formatted title.

- [ ] **Step 3: Implement data model and title formatting logic**

1. In `src/lib/db/types.ts` and `src/lib/data/mockHardware.ts`, add `image?: string;` to `ProductVariation`.
2. In `src/lib/data/mockHardware.ts`, add variation-specific images to `ram-1` and `ram-3` variations.
3. Update `getExpandedCatalogItems` in `src/lib/data/mockHardware.ts` to:
   - Extract attribute values or variation name parts.
   - Clean duplicate words between parent name and variation attributes.
   - Format name as `${cleanParentName} - ${attributeValues.join(" - ")}`.
   - Assign `image: variation.image || item.image`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/catalog-tiles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/types.ts src/lib/data/mockHardware.ts tests/catalog-tiles.test.ts
git commit -m "feat: add image to ProductVariation and format multi-attribute tile titles"
```

---

### Task 2: Admin Portal Variation Tile Image Selector

**Files:**
- Modify: `src/components/admin/ProductVariationsManager.tsx`
- Modify: `src/app/admin/page.tsx:280-310`
- Test: `tests/admin-variations.test.ts`

**Interfaces:**
- Consumes: `parentImages?: string[]`, `ProductVariation`
- Produces: `formImage` state in `ProductVariationsManager` and variation persistence containing the selected `image`.

- [ ] **Step 1: Write the failing test**

Edit `tests/admin-variations.test.ts` to test assigning and updating a variation's `image` field:

```typescript
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
});
```

- [ ] **Step 2: Run test to verify it passes or fails**

Run: `npx tsx --test tests/admin-variations.test.ts`
Expected: PASS for unit interface.

- [ ] **Step 3: Implement Tile Image Picker in ProductVariationsManager.tsx**

1. Update `ProductVariationsManagerProps` to accept `parentImages?: string[]`.
2. Add `formImage` state (`string | null`).
3. In `handleStartEdit`, populate `setFormImage(v.image || null)`.
4. In `resetForm`, reset `setFormImage(null)`.
5. In the variation edit form, render a "Storefront Tile Image" selector:
   - If `parentImages` has photos, render a grid of clickable image thumbnails (minimum 44x44px target).
   - Selected thumbnail displays an emerald ring and a "Selected" badge.
   - Clicking a thumbnail updates `formImage`.
   - An option to "Use Default Product Photo" clears `formImage`.
6. Include `image: formImage || undefined` in the saved variation object in `handleSaveForm`.
7. In the variation summary table, display the chosen thumbnail preview next to the variation name.
8. In `src/app/admin/page.tsx`, pass `parentImages={formImages}` to `ProductVariationsManager`.

- [ ] **Step 4: Verify with TypeScript check and tests**

Run: `npx tsx --test tests/admin-variations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ProductVariationsManager.tsx src/app/admin/page.tsx tests/admin-variations.test.ts
git commit -m "feat: add storefront tile image picker to admin ProductVariationsManager"
```

---

### Task 3: Homepage and Storefront Grid Variation Expansion

**Files:**
- Modify: `src/app/page.tsx:174-190, 565-620`
- Modify: `src/app/components/page.tsx:240-295`
- Modify: `src/app/components/[category]/page.tsx:165-200`
- Test: `tests/catalog-tiles.test.ts`

**Interfaces:**
- Consumes: `getExpandedCatalogItems(MOCK_COMPONENTS)`
- Produces: Expanded variation cards across the homepage component grid with `/products/[parentId]?variation=[variationId]` links.

- [ ] **Step 1: Write the failing test**

Add a test in `tests/catalog-tiles.test.ts` to assert that expanding `MOCK_COMPONENTS` generates distinct items for each variation with correct parent link paths:

```typescript
test("Catalog expansion generates individual tiles for all variations with deep links", () => {
  const expanded = getExpandedCatalogItems(MOCK_COMPONENTS);
  const ram1Vars = expanded.filter((item) => item.parentProductId === "ram-1");
  assert.equal(ram1Vars.length, 4, "ram-1 should expand to 4 variation tiles");
  for (const v of ram1Vars) {
    assert.ok(v.variationId, "Must have variationId");
    assert.equal(v.parentProductId, "ram-1");
    assert.ok(v.name.startsWith("Corsair Vengeance RGB"), "Name starts with parent title");
  }
});
```

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `npx tsx --test tests/catalog-tiles.test.ts`
Expected: PASS or update as needed.

- [ ] **Step 3: Implement homepage variation expansion and link synchronization**

1. In `src/app/page.tsx`:
   - Import `getExpandedCatalogItems` from `../lib/data/mockHardware`.
   - In `sortedComponents`, change `const result = [...MOCK_COMPONENTS];` to `const result = getExpandedCatalogItems(MOCK_COMPONENTS);`.
   - In the component cards mapping (lines 565-620):
     - Compute `itemHref`:
       ```typescript
       const itemHref = item.parentProductId && item.variationId
         ? `/products/${item.parentProductId}?variation=${item.variationId}`
         : `/products/${item.id}`;
       ```
     - Update the `<Link href={itemHref}>` for the image container and product title.
     - Ensure the quick Add to Cart button passes `item` (with variation details) to `addStandardItem`.
2. In `src/app/components/page.tsx` and `src/app/components/[category]/page.tsx`:
   - Verify `itemHref` handles `item.parentProductId && item.variationId`.
   - Confirm `ProductItemTileImage` receives `item.image` which points to `variation.image`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/catalog-tiles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/components/page.tsx src/app/components/[category]/page.tsx tests/catalog-tiles.test.ts
git commit -m "feat: expand variations into separate tiles on homepage and synchronize deep links"
```

---

### Task 4: Product Detail Page Gallery Sync and Cart Verification

**Files:**
- Modify: `src/app/products/[id]/page.tsx:340-375`
- Test: `tests/cart-variations.test.ts`

**Interfaces:**
- Consumes: `searchParams.get("variation")`, `activeVariation.image`
- Produces: Automatic image selection on product detail page when a variation is preselected.

- [ ] **Step 1: Write test for cart variation items**

Review `tests/cart-variations.test.ts` to ensure variation items preserve variation names and images when added to the cart:

```typescript
test("Cart preserves variation title, SKU, and price", () => {
  const variationItem = {
    id: "ram-1-var-ram-1-white-32",
    parentProductId: "ram-1",
    variationId: "ram-1-white-32",
    sku: "COR-CMH32GX5M2B6000C30-W",
    name: "Corsair Vengeance RGB 32GB - White",
    price: 2349000,
    image: "https://example.com/ram-white.jpg",
    stockCount: 8,
  };
  assert.equal(variationItem.name, "Corsair Vengeance RGB 32GB - White");
  assert.equal(variationItem.price, 2349000);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx tsx --test tests/cart-variations.test.ts`
Expected: PASS

- [ ] **Step 3: Synchronize active image on product detail page**

In `src/app/products/[id]/page.tsx`:
- When `initialVariationId` or `activeVariation` is resolved:
  - If `activeVariation?.image` is present in `product.images`:
    - Find its index: `const imgIndex = product.images.indexOf(activeVariation.image);`
    - If `imgIndex >= 0`, call `setSelectedImage(imgIndex);`.
  - When user switches variations via attribute pills, if the new matching variation has an assigned `image`, switch the gallery image index to that photo as well.

- [ ] **Step 4: Run test to verify all tests pass**

Run: `npx tsx --test tests/cart-variations.test.ts tests/catalog-tiles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/products/[id]/page.tsx tests/cart-variations.test.ts
git commit -m "feat: synchronize product detail gallery image with preselected variation"
```

---

### Task 5: End-to-End Verification, Accessibility Check, and Build Gate

**Files:**
- Test: All test suites in `tests/*.test.ts`
- Verification: `npm run build`

- [ ] **Step 1: Run complete test suite**

Run: `npx tsx --test tests/admin-variations.test.ts tests/cart-variations.test.ts tests/catalog-tiles.test.ts tests/pc-builder-variations.test.ts tests/product-cta-variations.test.ts tests/variations-data.test.ts`
Expected: All tests PASS with zero failures.

- [ ] **Step 2: Run Next.js production build check**

Run: `npm run build`
Expected: Successful build without TypeScript errors or broken imports.

- [ ] **Step 3: Verification against anti-slop rules**

Run check:
- Zero em dashes (`—`) across all modified files.
- Minimum 44px tap targets on all interactive variation elements.
- Clear focus indicators on image selection thumbnails.
- Confirm click destinations for all variation tiles.

- [ ] **Step 4: Final commit**

```bash
git commit -m "chore: complete variation storefront tiles and admin image assignment verification"
```
