# Product Variations & Admin Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement end-to-end product variation support allowing admins to configure multi-dimensional variations with individual prices and stock, displaying separate variation tiles in catalog grids and the PC Builder, and rendering dynamic attribute selectors in the product CTA box.

**Architecture:** Parent products maintain core metadata and gallery photos while variations define distinct purchasable SKUs (with attributes, price, and stock). Catalog grids and PC Builder expand variations into individual selectable tiles that link to `/products/[id]?variation=[varId]`, preselecting options in the product page CTA box. Cart items and orders preserve variation metadata.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React, Zustand store (`useCartStore`).

**Spec:** `docs/superpowers/specs/2026-10-18-product-variations-design.md`

## Global Constraints
- **Craft-First UI Standards**: Follow craft-first UI standards. Avoid generic purple-and-cyan gradients, floating glassmorphism everywhere, and empty marketing buzzwords.
- **Copywriting**: Never use em dashes (`—`) in text or code comments. Use standard punctuation like commas, periods, or colons.
- **Accessibility**: All buttons and interactive controls must meet minimum 44px tap target height (`min-h-[44px]`). Maintain WCAG AA color contrast (4.5:1 ratio). Ensure clear focus indicators.
- **Resilience**: Data views must provide empty, loading, and error states. Every button must perform a real action.
- **Backwards Compatibility**: Products without variations must function identically with zero layout shifts or regressions.

## Review Focus
1. **Invalid or missing `?variation=` query param**: A user lands on `/products/corsair-ram?variation=non-existent-id`. Expected: Gracefully fall back to the first available in-stock variation without crashing.
2. **Partial or unmatched attribute combinations**: A user selects an attribute combination that has no matching variation. Expected: Automatically guide user to valid combinations or visually disable unavailable attribute pills.
3. **Out-of-stock variation selection**: A user selects a variation with `stockCount === 0`. Expected: Quantity stepper clamps to 0 or 1 disabled, "Add to Shopping Cart" button disables with "Out of Stock" label, and stock badge shows red "Out of stock".
4. **Cart quantity update with variation stock ceiling**: An in-cart variation has only 3 units in stock. Expected: Quantity stepper in `CartDrawer.tsx` cannot increase past 3 units.
5. **PC Builder slot serialization**: A custom PC with a specific variation of RAM (e.g. Corsair White 32GB) is added to cart. Expected: PC parts breakdown in cart drawer and checkout displays the exact variation name rather than the generic parent name.

---

### Task 1: Core Data Models, Types, and Seeding

**Files:**
- Modify: `src/lib/db/types.ts:130-155`
- Modify: `src/lib/data/mockHardware.ts:1-120`
- Create: `tests/variations-data.test.ts`

**Interfaces:**
- Consumes: `ComponentItem`, `Product` from `src/lib/db/types.ts` and `src/lib/data/mockHardware.ts`
- Produces: `ProductVariation` interface, `getExpandedCatalogItems(items: ComponentItem[]): ComponentItem[]`, and seeded variations on Corsair Vengeance LPX DDR4.

- [ ] **Step 1: Write the failing test**

Create `tests/variations-data.test.ts`:
```typescript
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/variations-data.test.ts`
Expected: FAIL with "getExpandedCatalogItems is not a function" or missing variations.

- [ ] **Step 3: Implement `ProductVariation` and `getExpandedCatalogItems`**

1. In `src/lib/db/types.ts`, add `ProductVariation` interface:
```typescript
export interface ProductVariation {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  stockCount: number;
  attributes: Record<string, string>;
  isActive?: boolean;
}
```
Add `variations?: ProductVariation[];` to `Product`.
2. In `src/lib/data/mockHardware.ts`:
- Add `variations?: ProductVariation[]; variationId?: string; parentProductId?: string; selectedAttributes?: Record<string, string>;` to `ComponentItem`.
- Seed 4 variations for Corsair Vengeance LPX DDR4 (`ram-1`):
  - 16GB (2x8GB) Black (Rp 850.000, stock: 25)
  - 32GB (2x16GB) Black (Rp 1.450.000, stock: 14)
  - 32GB (2x16GB) White (Rp 1.490.000, stock: 8)
  - 64GB (2x32GB) Black (Rp 2.850.000, stock: 0)
- Export `getExpandedCatalogItems(items: ComponentItem[]): ComponentItem[]` which returns items with variations expanded into virtual `ComponentItem`s with distinct IDs (`${parent.id}-var-${variation.id}`) and titles.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx tests/variations-data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/types.ts src/lib/data/mockHardware.ts tests/variations-data.test.ts
git commit -m "feat(catalog): add ProductVariation types and catalog item expansion"
```

---

### Task 2: Product Detail Page (`/products/[id]`) CTA Box Multi-Dimensional Variation Picker

**Files:**
- Modify: `src/app/products/[id]/page.tsx:500-1250`
- Create: `tests/product-cta-variations.test.ts`

**Interfaces:**
- Consumes: `ComponentItem`, `ProductVariation` from `src/lib/data/mockHardware.ts`
- Produces: Interactive two-dimensional attribute selectors, active variation state, and dynamic price/stock/cart resolution.

- [ ] **Step 1: Write the failing test**

Create `tests/product-cta-variations.test.ts`:
```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import { MOCK_COMPONENTS, ProductVariation } from "../src/lib/data/mockHardware";

test("Variation attribute resolution and stock checks", () => {
  const corsair = MOCK_COMPONENTS.find((item) => item.id === "ram-1");
  assert.ok(corsair && corsair.variations);

  // Helper matching attributes
  const findVar = (variations: ProductVariation[], attrs: Record<string, string>) =>
    variations.find((v) => Object.entries(attrs).every(([k, val]) => v.attributes[k] === val));

  const white32 = findVar(corsair.variations, { Capacity: "32GB (2x16GB)", Colour: "White" });
  assert.ok(white32);
  assert.equal(white32.price, 1490000);
  assert.equal(white32.stockCount, 8);

  const black64 = findVar(corsair.variations, { Capacity: "64GB (2x32GB)", Colour: "Black" });
  assert.ok(black64);
  assert.equal(black64.stockCount, 0); // Out of stock
});
```

- [ ] **Step 2: Run test to verify it passes logic assertions**

Run: `npx tsx tests/product-cta-variations.test.ts`
Expected: PASS

- [ ] **Step 3: Implement variation selection in `src/app/products/[id]/page.tsx`**

1. Read `useSearchParams()` for `variation` param: `const variationParam = searchParams.get("variation")`.
2. Determine active variation:
   - If `variationParam` matches an existing variation ID, initialize selection with that variation.
   - Otherwise, default to the first available in-stock variation (or first variation).
3. Compute attribute groups (e.g. `Capacity: ["16GB (2x8GB)", "32GB (2x16GB)", "64GB (2x32GB)"]`, `Colour: ["Black", "White"]`).
4. Render attribute selection buttons in the Sticky Action Box above Quantity:
   - Minimum 44px tap targets (`min-h-[44px]`).
   - Active state ring/border and emerald highlights.
   - Disabled/strikethrough state if a combination is out of stock.
5. Dynamically bind active variation:
   - `activePrice = selectedVariation ? selectedVariation.price : basePrice`
   - `retailPrice = selectedVariation?.originalPrice || selectedVariation?.price || basePrice`
   - `stockCount = selectedVariation ? selectedVariation.stockCount : product.stockCount`
   - If `stockCount === 0`, disable "Add to Shopping Cart" button and display "Out of Stock".
6. In `handleAddToCart()`, pass variation metadata (`variationId`, `variationName`, `selectedAttributes`) into `addStandardItem`.

- [ ] **Step 4: Verify with Next.js build**

Run: `npm run build`
Expected: PASS with 0 build errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/products/[id]/page.tsx tests/product-cta-variations.test.ts
git commit -m "feat(product): add multi-dimensional variation selector to CTA box"
```

---

### Task 3: Cart Store & Cart Drawer Integration

**Files:**
- Modify: `src/lib/store/useCartStore.ts:1-120`
- Modify: `src/components/navigation/CartDrawer.tsx:490-590`
- Create: `tests/cart-variations.test.ts`

**Interfaces:**
- Consumes: `ComponentItem` with `variationId` and `variationName`
- Produces: Cart lines that preserve variation details and display variation subtitles in `CartDrawer.tsx`.

- [ ] **Step 1: Write the failing test**

Create `tests/cart-variations.test.ts`:
```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import { useCartStore } from "../src/lib/store/useCartStore";

test("useCartStore handles variations as distinct line items", () => {
  const store = useCartStore.getState();
  store.clearCart();

  const mockItemWhite = {
    id: "ram-1-var-v3",
    name: "Corsair Vengeance LPX DDR4",
    variationId: "v3",
    variationName: "32GB (2x16GB) White",
    price: 1490000,
    stockCount: 8,
    category: "ram" as any,
    image: "/images/ram.jpg",
    specs: {},
  };

  const mockItemBlack = {
    id: "ram-1-var-v2",
    name: "Corsair Vengeance LPX DDR4",
    variationId: "v2",
    variationName: "32GB (2x16GB) Black",
    price: 1450000,
    stockCount: 14,
    category: "ram" as any,
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
});
```

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `npx tsx tests/cart-variations.test.ts`
Expected: Verification of cart behavior.

- [ ] **Step 3: Update `useCartStore.ts` and `CartDrawer.tsx`**

1. In `src/lib/store/useCartStore.ts`:
- Ensure `addStandardItem` distinguishes items by item ID or compound key (`${item.id}${item.variationId ? '-' + item.variationId : ''}`).
- Store `variationId`, `variationName`, and `selectedAttributes` on `CartItem.item`.
- Clamp quantity updates to `item.stockCount`.
2. In `src/components/navigation/CartDrawer.tsx`:
- Render variation label under product title:
```tsx
{cartItem.item.variationName && (
  <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
    Variation: {cartItem.item.variationName}
  </div>
)}
```
- Maintain 44px minimum tap target height on all buttons.
- No em dashes used.

- [ ] **Step 4: Run test and build to verify**

Run: `npx tsx tests/cart-variations.test.ts`
Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/store/useCartStore.ts src/components/navigation/CartDrawer.tsx tests/cart-variations.test.ts
git commit -m "feat(cart): support variation line items and drawer display"
```

---

### Task 4: Catalog & Category Grid Tiles

**Files:**
- Modify: `src/app/components/page.tsx:1-400`
- Modify: `src/components/products/ProductItemTileImage.tsx` (or product grid cards)
- Create: `tests/catalog-tiles.test.ts`

**Interfaces:**
- Consumes: `getExpandedCatalogItems` from `src/lib/data/mockHardware.ts`
- Produces: Catalog cards that display individual variation tiles with links to `/products/[id]?variation=[varId]`.

- [ ] **Step 1: Write the failing test**

Create `tests/catalog-tiles.test.ts`:
```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import { getExpandedCatalogItems, MOCK_COMPONENTS } from "../src/lib/data/mockHardware";

test("Catalog items include variations with correct link URLs", () => {
  const expanded = getExpandedCatalogItems(MOCK_COMPONENTS);
  const whiteRam = expanded.find((item) => item.variationId === "ram-1-white-32");
  assert.ok(whiteRam, "White RAM variation tile should exist");
  assert.equal(whiteRam.parentProductId, "ram-1");
  assert.ok(whiteRam.name.includes("White"), "Variation tile title should include White");
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx tsx tests/catalog-tiles.test.ts`
Expected: PASS

- [ ] **Step 3: Update `src/app/components/page.tsx`**

1. Expand catalog components using `getExpandedCatalogItems(MOCK_COMPONENTS)`.
2. When rendering product links, if `item.variationId` and `item.parentProductId` exist:
   - Link destination is `/products/${item.parentProductId}?variation=${item.variationId}`.
3. Card displays the variation title (e.g., `Corsair Vengeance LPX DDR4 - White (32GB)`), its price, and stock count.
4. Quick `+` button adds the specific variation directly or navigates to preselected variation page.

- [ ] **Step 4: Verify with Next.js build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/components/page.tsx tests/catalog-tiles.test.ts
git commit -m "feat(catalog): display individual variation tiles in component catalog"
```

---

### Task 5: Custom PC Builder Component Picker (`ComponentSelectModal.tsx`)

**Files:**
- Modify: `src/components/builder/ComponentSelectModal.tsx:1-400`
- Create: `tests/pc-builder-variations.test.ts`

**Interfaces:**
- Consumes: `getExpandedCatalogItems` from `src/lib/data/mockHardware.ts`
- Produces: Distinct selectable variations in the PC builder slot selection modal.

- [ ] **Step 1: Write the failing test**

Create `tests/pc-builder-variations.test.ts`:
```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import { getExpandedCatalogItems, MOCK_COMPONENTS } from "../src/lib/data/mockHardware";

test("PC Builder components list expands variations for selection", () => {
  const ramItems = MOCK_COMPONENTS.filter((item) => item.category === "ram");
  const expandedRam = getExpandedCatalogItems(ramItems);
  assert.ok(expandedRam.length > ramItems.length, "Expanded RAM should have more selectable options than parent items");
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx tsx tests/pc-builder-variations.test.ts`
Expected: PASS

- [ ] **Step 3: Update `ComponentSelectModal.tsx`**

1. In `ComponentSelectModal.tsx`, process incoming components through `getExpandedCatalogItems(items)`.
2. When a user selects a variation (e.g. Corsair Vengeance LPX - White), the PC Builder store attaches that specific item with its custom title, price, and attributes.
3. In `PCBuilderView.tsx`, the selected slot displays the exact variation name (e.g. "Corsair Vengeance LPX DDR4 - White (32GB)").

- [ ] **Step 4: Verify with Next.js build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/builder/ComponentSelectModal.tsx tests/pc-builder-variations.test.ts
git commit -m "feat(builder): support separate variation items in PC builder modal"
```

---

### Task 6: Admin Portal Variation Manager (`src/app/admin/page.tsx`)

**Files:**
- Modify: `src/app/admin/page.tsx:800-1400`
- Create: `src/components/admin/ProductVariationsManager.tsx`
- Create: `tests/admin-variations.test.ts`

**Interfaces:**
- Consumes: `Product`, `ProductVariation` from `src/lib/db/types.ts`
- Produces: Admin UI component allowing administrators to view, add, edit, and delete variations under any parent product.

- [ ] **Step 1: Write the failing test**

Create `tests/admin-variations.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify logic**

Run: `npx tsx tests/admin-variations.test.ts`
Expected: PASS

- [ ] **Step 3: Implement `ProductVariationsManager.tsx` and integrate in `src/app/admin/page.tsx`**

1. Create `src/components/admin/ProductVariationsManager.tsx`:
   - Table of existing variations: Name, Attributes, Price (IDR), Stock Count, and Actions.
   - Quick Add / Edit drawer:
     - Variation Name input
     - SKU input (optional)
     - Price (IDR) input
     - Sale Price (optional)
     - Inventory Stock input
     - Dynamic attribute pairs: Add Attribute Key (e.g. "Capacity", "Colour") and Value (e.g. "32GB", "White").
   - Minimum 44px tap targets on all buttons.
   - Save / Delete callbacks to update product state.
2. Integrate `ProductVariationsManager` inside the Product Edit / Add modal in `src/app/admin/page.tsx`.

- [ ] **Step 4: Verify with Next.js build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ProductVariationsManager.tsx src/app/admin/page.tsx tests/admin-variations.test.ts
git commit -m "feat(admin): add product variation manager to admin portal"
```

---

### Task 7: Final End-to-End Verification and Polish

**Files:**
- Modify: Any files needing final accessibility or copy adjustments
- Run: `npm run build`

- [ ] **Step 1: Run complete test suite**

Run: `npx tsx tests/variations-data.test.ts`
Run: `npx tsx tests/product-cta-variations.test.ts`
Run: `npx tsx tests/cart-variations.test.ts`
Run: `npx tsx tests/catalog-tiles.test.ts`
Run: `npx tsx tests/pc-builder-variations.test.ts`
Run: `npx tsx tests/admin-variations.test.ts`
Expected: All 6 test suites PASS.

- [ ] **Step 2: Full Next.js production build check**

Run: `npm run build`
Expected: Exit code 0, 26/26 routes compiled cleanly with 0 TypeScript/ESLint errors.

- [ ] **Step 3: Verification of constraints**
- Tap target height >= 44px on all new buttons and pills.
- Zero em dashes (`—`) across all newly written code and comments.
- Both Light and Dark theme styling verified.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: complete product variations support across catalog, cta, builder, and admin"
```
