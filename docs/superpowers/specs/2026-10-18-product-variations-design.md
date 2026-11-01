# Product Variations & Admin Portal Management Design

## 1. Intent & Context
Tethera is a high-performance PC hardware and custom PC builder e-commerce web application based in Jakarta, Indonesia.
Hardware items such as memory (RAM), storage (SSDs), chassis, and peripherals often exist in multiple configurations (such as different capacities like 16GB vs. 32GB, or different colors like Black vs. White) that share identical core branding, specifications, and primary visual galleries, but possess distinct prices, stock levels, and SKUs.

This feature enables end-to-end variation management:
1. **Admin Portal Configuration**: Store administrators can manage product variations under a parent product, defining each variation's custom name, multi-dimensional attributes (e.g., Capacity, Colour), price, and inventory stock count.
2. **Catalog & Category Representation**: Variations appear as distinct item tiles in catalog listings and category browse grids (e.g., "Corsair Vengeance LPX - White" and "Corsair Vengeance LPX - Black") showing their specific price and stock.
3. **Product Detail Page CTA Box**: Clicking a tile navigates to `/products/[id]?variation=[variationId]`, where the chosen variation is preselected in the CTA box. Shoppers can also switch between options via responsive attribute selector buttons.
4. **Custom PC Builder Integration**: In the PC Builder component picker, variations appear as separate selectable entries, allowing builders to choose the exact variation for their build.

---

## 2. Goals & Non-Goals

### Goals
- **Parent-Child Item Model**: A parent product retains common metadata (name, description, brand, gallery photos, warranty, specs), while variations represent purchasable stock-keeping units (SKUs) under that parent.
- **Catalog Item Tiles for Variations**: In catalog and category grids, distinct tiles represent each variation with its specific variation title, price, and stock.
- **Deep-Linked Preselection**: Navigating to `/products/[id]?variation=[variationId]` automatically preselects that variation in the Sticky Action Box.
- **Two-Dimensional Attribute Selectors**: Customers can switch attributes independently on the product page (e.g., Capacity: 16GB or 32GB; Colour: Black or White), resolving automatically to the corresponding combination.
- **Dynamic Pricing & Stock in CTA Box**: The Sticky Action Box updates retail price, discount percentage (if applicable), stock count badge, and button states based on the active variation.
- **Custom PC Builder Support**: In `/builder` component selection, variations are displayed as separate selectable items with individual pricing and stock.
- **Admin Management**: Administrators can view, add, edit, and delete variations directly within the Admin Portal's catalog management section.
- **Cart & Order Integrity**: Items added to the cart preserve the selected variation name, variation ID, and active price across cart drawers, checkout, and transactions.

### Non-Goals
- Per-variation individual image galleries (product photos are shared under the parent product for now).
- Dynamic stock deduction against physical external warehouse ERPs (stays synchronized with local in-memory store and Supabase).
- Complex bundling or conditional rules (e.g. buying variation A forces accessory B).

### Anti-Goals
- Do not make the cart interface ambiguous; cart line items must clearly state which variation was selected.
- No generic, clunky dropdown select boxes; use craft-first, accessible button pills.

---

## 3. Architecture & Data Model

### Data Types (`src/lib/db/types.ts` & `src/lib/data/mockHardware.ts`)

```typescript
export interface ProductVariation {
  id: string;
  productId: string;
  name: string; // e.g. "Corsair Vengeance LPX 32GB (2x16GB) White"
  sku?: string;
  price: number; // Active retail price
  originalPrice?: number; // Pre-discount price if on sale
  stockCount: number; // Inventory units available
  attributes: Record<string, string>; // e.g. { "Capacity": "32GB (2x16GB)", "Colour": "White" }
  isActive?: boolean;
}
```

The parent `Product` (and `ComponentItem`) will include an optional field:
```typescript
variations?: ProductVariation[];
```

Helper functions will flatten or expand products into distinct catalog items where needed:
- `getExpandedCatalogItems(items: ComponentItem[]): ComponentItem[]` creates virtual tiles for variations that link to `/products/[parent.id]?variation=[var.id]`.

---

## 4. User Experience & Interfaces

### 4.1. Product Detail Page CTA Box (`src/app/products/[id]/page.tsx`)
- Reads optional `variation` query parameter from the URL to initialize selection.
- When `product.variations` exists and has entries:
  - Dynamically extracts available attribute groups (e.g., `["Capacity", "Colour"]`).
  - For each attribute group, renders accessible option pills (`min-h-[44px]` touch targets, keyboard-navigable).
  - Highlights the currently active option with emerald accents or dark-mode active rings.
  - Automatically identifies whether an attribute combination is available or out of stock (`stockCount === 0`).
  - Clicking an option resolves to the active `ProductVariation` and updates:
    - Displayed retail price (and discount badge if `originalPrice > price`).
    - Stock count display (`"In Stock (14 Available)"` or `"Out of Stock"`).
    - Maximum selectable quantity bounded by the variation's `stockCount`.
    - If out of stock, disables "Add to Shopping Cart" and displays "Out of Stock".

### 4.2. Catalog & Category Grid Tiles
- Products with variations generate separate visual tiles in catalog/browse views (e.g. `/components`, search results).
- Each tile displays:
  - Variation-specific title (e.g., `Corsair Vengeance LPX DDR4 - White (32GB)`).
  - Variation-specific price and stock status.
  - Clicking the tile navigates to `/products/[id]?variation=[variationId]`.

### 4.3. Custom PC Builder (`src/components/builder/ComponentSelectModal.tsx` & `PCBuilderView.tsx`)
- When browsing components (e.g., RAM slot):
  - Items with variations are expanded so each variation appears as an individual selectable item.
  - Selecting that variation attaches the exact variation name, variation ID, and price to the PC configuration.

### 4.4. Admin Portal (`src/app/admin/page.tsx`)
- In the Products management view, within the Product Edit/Add modal:
  - Dedicated **"Product Variations"** tab or panel.
  - Displays a clean table listing existing variations for the selected product:
    - Columns: Variation Name, Attributes Summary, Price (Rp), Stock Count, Actions (Edit, Delete).
  - Quick **"Add Variation"** inline drawer/modal:
    - Fields:
      - Variation Name (e.g. "32GB (2x16GB) White")
      - SKU (optional)
      - Price (IDR)
      - Sale / Original Price (optional)
      - Stock Count (numeric)
      - Dynamic Attribute Key-Value pairs (e.g., Key: "Capacity", Value: "32GB"; Key: "Colour", Value: "White")
    - "Save Variation" appends or updates the variation in the product record.

### 4.5. Cart & Checkout Drawer (`src/lib/store/useCartStore.ts` & `src/components/navigation/CartDrawer.tsx`)
- When a product with an active variation is added to the cart:
  - Cart item records:
    - `variationId`: ID of the selected variation.
    - `variationName`: Friendly title of the variation.
    - `selectedAttributes`: Object holding chosen attributes.
    - `price`: Variation's active price.
    - `originalPrice`: Variation's original price.
  - `CartDrawer.tsx` renders the variation label beneath the product title:
    - Example: `Capacity: 32GB (2x16GB) • Colour: White` in high-contrast subtle typography (`text-xs text-slate-500 dark:text-zinc-400`).

---

## 5. Quality & Compliance Constraints
- **Craft-First UI Standards**: Clean borders, subtle shadows, crisp typography, no generic gradients or slop.
- **Copywriting**: Never use em dashes (`—`). Use commas, periods, or colons.
- **Accessibility**: All buttons and variation pills must have `min-h-[44px]` tap targets, focus rings (`focus-visible:ring-2`), and appropriate ARIA attributes.
- **Resilience**: Products without variations must continue working seamlessly without any regressions or layout shifts.

---

## 6. Settled Architectural Decisions (Builder Calls)
- **Order & Invoice Persistence**: Cart items and checkout orders pass variation identifiers, friendly variation names, and SKUs cleanly into the order metadata, preserving receipt and invoice fidelity without requiring destructive database schema rewrites.
- **Inventory Sync**: Individual variation stock is tracked on the variation record and decremented upon order payment completion.
- **Selection Fallback**: If a user selects an attribute combination that doesn't exist, automatically select the closest available valid variation or show a disabled option pill.
