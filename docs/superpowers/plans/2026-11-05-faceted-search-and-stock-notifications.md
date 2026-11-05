# Faceted Catalog Search, URL Sync & Back-in-Stock Notifications (CUST-01) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full-featured faceted catalog search with URL synchronization, price bounds, in-stock filtering, and a customer back-in-stock notification capture engine (CUST-01).

**Architecture:**
1. Extend `productsRepository` with `getFacetedCatalog` computing multi-criteria filters (category, multi-brand, min/max price range, in-stock toggle, sorting, pagination) alongside facet aggregations (brand counts, category counts, dynamic price bounds).
2. Create `StockNotificationsRepository` and register in `db.stockNotifications` to record customer notification requests (`email`, `phone`, `product_id`, `variant_id`).
3. Enhance `GET /api/products` with faceted query parameters and create `POST /api/products/[id]/notify-stock` adhering to RFC 7807 error envelopes.
4. Build `BackInStockModal` client component with email/WhatsApp capture and mount it on the Product Detail Page (`/products/[id]`) when an item or variant is out of stock.
5. Upgrade storefront discovery page (`/components`) with URL query synchronization (`?category=...&brand=...&minPrice=...&maxPrice=...&inStock=...&sort=...`), filter drawer/sidebar, dynamic price bounds, and active filter badges with 1-click removal.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zustand, Tailwind CSS, Lucide React, Vitest.

**Spec:** [`tethera_e_commerce_agentic_audit_upgrade_prompt.md`](file:///C:/Users/darkl/OneDrive/Desktop/trial/tethera_e_commerce_agentic_audit_upgrade_prompt.md) (`CUST-01`).

---

## Global Constraints
- **Zero em dashes (`—`)** anywhere in code, comments, commit messages, or responses. Use standard punctuation like commas, periods, or colons.
- **Minimum 44px tap target height** (`min-h-[44px]`) on all interactive buttons, inputs, and toggles.
- **WCAG AA color contrast** (4.5:1 ratio).
- **Resilience**: Comprehensive empty, loading, and error states for all faceted filters.

---

## Task Decomposition

### Task 1: Faceted Catalog Query Engine & Stock Notifications Repository (Backend/DB)
- **Files to create/modify**:
  - `src/lib/db/types.ts`
  - `src/lib/db/repositories/products.repository.ts`
  - `src/lib/db/repositories/stockNotifications.repository.ts`
  - `src/lib/db/index.ts`
  - `tests/phase3-cust01-faceted-search-and-stock-notifications.test.ts`
- **Responsibilities**:
  - Add `StockNotificationRow`, `FacetedCatalogParams`, `CatalogFacetAggregations`, and `FacetedCatalogResult` interfaces.
  - Implement `productsRepository.getFacetedCatalog` with multi-brand, price bounds, in-stock filtering, sorting, and facet count aggregations.
  - Implement `StockNotificationsRepository` with `requestNotification` and `getPendingNotifications`.
- **Test criteria**:
  - Test multi-brand filtering, price range clamping, in-stock filtering, sorting, and facet counts.
  - Test stock notification request deduplication.

### Task 2: Faceted API Endpoints & Notification Capture Route
- **Files to create/modify**:
  - `src/app/api/products/route.ts`
  - `src/app/api/products/[id]/notify-stock/route.ts`
  - `tests/phase3-cust01-faceted-search-and-stock-notifications.test.ts`
- **Responsibilities**:
  - Upgrade `GET /api/products` to accept faceted query parameters (`search`, `category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `slot`, `sort`, `page`, `limit`) and return facets and pagination.
  - Create `POST /api/products/[id]/notify-stock` validating email and phone, returning 201 Created or RFC 7807 400 Bad Request.
- **Test criteria**:
  - Integration tests verifying `/api/products` faceted responses and `/api/products/[id]/notify-stock` request handling.

### Task 3: Client Components & Storefront URL Sync
- **Files to create/modify**:
  - `src/components/products/BackInStockModal.tsx`
  - `src/app/products/[id]/page.tsx`
  - `src/app/components/page.tsx`
  - `tests/phase3-cust01-faceted-search-and-stock-notifications.test.ts`
- **Responsibilities**:
  - Build `BackInStockModal` with email and WhatsApp inputs, loading states, and success confirmations.
  - Mount `BackInStockModal` on `src/app/products/[id]/page.tsx` when selected SKU or variant has zero stock.
  - Upgrade `src/app/components/page.tsx` with URL synchronization (`searchParams`), price slider/bounds, brand checkboxes, in-stock switch, active filter chips, and sorting dropdown.
- **Test criteria**:
  - Craftsmanship checks: zero em dashes, min 44px tap targets.

### Task 4: Full System Verification, Typecheck, and Push
- **Responsibilities**:
  - Run complete Vitest suite across all 25 test files.
  - Run `npx tsc --noEmit`.
  - Run Next.js production build (`npm run build`).
  - Commit and push to `origin/main`.
