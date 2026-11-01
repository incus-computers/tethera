# Design Document: Product Variation Storefront Tiles and Admin Image Assignment

- Date: 2026-10-19
- Status: Draft
- Author: Pair Programming Session

---

## 1. Intent and Problem Statement

In the Tethera hardware e-commerce platform, products such as memory kits, PC cases, cables, and peripherals often come in multiple variations (such as Colour: White vs Black, or Capacity: 32GB vs 64GB).

Currently:
- In the admin portal and product detail pages, variations belong to a single parent product.
- However, shoppers browsing category listings or the homepage often miss available colors and configurations if only a single default parent tile is displayed.
- The storefront needs to display distinct, dedicated product tiles for every variation combination (for example, "Corsair RAM - White" and "Corsair RAM - Black"), while keeping product management centralized in the admin portal and directing shoppers to a unified product page with the clicked variation preselected.
- Furthermore, admins must be able to specify which photo from the product's uploaded gallery displays on that variation's storefront tile so that white items display white photos, black items display black photos, etc.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
1. **Dedicated Storefront Tiles per Variation**: Every variation combination of a product renders as its own individual tile across the store (Catalog page, Category pages, Homepage featured/component lists, and PC Builder picker).
2. **Standardized Title Pattern**: Variation tile titles must follow the format `Item Name - Variation 1 - Variation 2` (or `Item Name - Variation 1` for single-attribute items).
3. **Admin Tile Image Assignment**: In the admin portal, admins can select one photo from the product's existing uploaded gallery to serve as the featured storefront tile image for each variation.
4. **Deep-Linked Preselection**: Clicking any variation tile navigates to `/products/[id]?variation=[variationId]`, automatically activating that variation's attributes, price, stock status, and gallery image on the product detail page.
5. **Direct Add to Cart**: Clicking the quick "Add to Cart" button on a variation tile adds that exact variation (with its respective SKU, price, variation title, and image) directly to the cart.
6. **Backward Compatibility**: Products without variations continue to render as single standard product tiles without disruption.

### Non-Goals
1. **Separate Database Parent Records**: Variations will NOT be split into independent parent rows in PostgreSQL. They remain managed as items inside `product.variations` on the parent `Product` record.
2. **External Arbitrary Image Uploads per Variation**: Admins will not upload separate external image files inside the variation row; they will pick from the parent product's centrally managed photo gallery.

### Anti-Goals
1. **Title Duplication**: Avoid appending redundant text if a variation attribute is already present in the parent item title.
2. **Dead Links or Ghost Variations**: Never display variation tiles for inactive variations or variations with missing identifiers.

---

## 3. Architecture and Data Flow

### 3.1 Data Model Changes
In `src/lib/db/types.ts` and `src/lib/data/mockHardware.ts`:
Extend `ProductVariation` with an optional `image` field:
```typescript
export interface ProductVariation {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  salePrice?: number;
  stockCount: number;
  attributes: Record<string, string>;
  isActive?: boolean;
  image?: string; // URL from parent's images array used for this variation tile
}
```

### 3.2 Storefront Tile Expansion (`getExpandedCatalogItems`)
In `src/lib/data/mockHardware.ts`:
Update the `getExpandedCatalogItems(items: ComponentItem[])` utility function:
1. When a product has no variations, push the item unchanged.
2. When a product has variations:
   - For each active variation:
     - Determine the tile name: `Item Name - Variation 1 - Variation 2` using the attribute values (or the variation name).
     - Assign `image: variation.image || item.image`.
     - Assign `price: variation.price`, `sale_price: variation.salePrice`, `stockCount: variation.stockCount`, `sku: variation.sku || item.sku`.
     - Set `parentProductId: item.id` and `variationId: variation.id`.
     - Set `itemHref: /products/${item.id}?variation=${variation.id}`.

### 3.3 Storefront Catalog Views Integration
Ensure consistent usage of `getExpandedCatalogItems`:
- `src/app/components/page.tsx`: already uses `getExpandedCatalogItems`. Update title generation and image selection to reflect `variation.image`.
- `src/app/components/[category]/page.tsx`: already uses `getExpandedCatalogItems`. Update title generation and image selection.
- `src/app/page.tsx`: currently uses raw `MOCK_COMPONENTS`. Update to use `getExpandedCatalogItems(MOCK_COMPONENTS)` for sorted and featured component grids, ensuring links follow `/products/[parentId]?variation=[variationId]`.
- `src/components/builder/ComponentSelectModal.tsx`: already expands items. Ensure variation image and clean title formatting are applied.

### 3.4 Product Detail Page Preselection
In `src/app/products/[id]/page.tsx`:
- The page already parses `searchParams.get("variation")`.
- Ensure that when a variation is preselected via query parameter:
  - If that variation has a designated `image`, set the gallery's active image index to match that image.
  - The attributes pills are active and synchronized.

### 3.5 Admin Portal: Variation Image Selector
In `src/components/admin/ProductVariationsManager.tsx`:
- Add a gallery image picker to the variation form.
- The component receives the parent product's images array (`parentImages: string[]`).
- In the variation editing/creation form:
  - Display a section: "Tile Featured Image".
  - Show clickable thumbnail tiles of all images in `parentImages`.
  - The currently selected image is highlighted with an emerald/sky border and a check badge.
  - Clicking a thumbnail sets `formImage` to that image URL.
  - If no image is selected, it defaults to the first image in `parentImages`.
- In the variations summary table:
  - Display a small thumbnail next to the variation name showing the chosen tile image.

---

## 4. Craftsmanship, Accessibility, and Quality Standards

1. **Anti-Slop Compliance**:
   - Zero em dashes (`—`) in copy or code comments.
   - Clean, purposeful styling matching Tethera design tokens.
2. **Accessibility (WCAG AA)**:
   - All interactive thumbnail selectors and variation buttons meet minimum 44px tap target height (`min-h-[44px]`).
   - Image thumbnails have accessible `aria-label` tags (e.g. `aria-label="Select photo 1 as tile image for White variation"`).
   - Visible keyboard focus rings on all selectable thumbnails (`focus-visible:ring-2 focus-visible:ring-primary`).
3. **Resilience**:
   - If a parent product has no images yet, gracefully show a placeholder in the admin picker.
   - If a designated variation image URL is missing or broken, fallback to `item.image` or default hardware placeholder.

---

## 5. What is Left to the Builder

1. The exact layout styling of thumbnail tiles in `ProductVariationsManager.tsx` (compact grid of 64px or 80px preview squares with rounded corners).
2. Sanitization helper function for title formatting to prevent duplicate strings when parent title already contains attribute terms.
