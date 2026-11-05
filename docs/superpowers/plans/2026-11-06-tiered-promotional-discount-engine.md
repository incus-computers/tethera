# Tiered Promotional Discount Rules Engine (ADMIN-05) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive promotion, coupon, and campaign rules engine (ADMIN-05) supporting multi-type discounts (percentage, fixed amount, free shipping, buy X get Y), date scheduling, usage limits, minimum spend thresholds, SKU/category eligibility, public validation API, checkout integration, and full admin management with redemption tracking.

**Architecture:**
1. Schema & Repository: Extend `Promotion` in `src/lib/db/types.ts` and enhance `PromotionsRepository` with `validatePromotion` (handling date windows, global/user usage caps, min spend, SKU eligibility, max discount caps) and `recordUsage`.
2. Public Validation Endpoint: Create `POST /api/promotions/validate` returning structured validation result and discount calculation or RFC 7807 problem details.
3. Checkout & Order Integration: Upgrade `src/app/checkout/page.tsx` to validate promo codes dynamically against `/api/promotions/validate` (replacing hardcoded static list), and update `src/app/api/checkout/create-order/route.ts` to record promo redemption and enforce server-side validation.
4. Admin API & Flux Management UI: Upgrade `src/app/api/admin/promotions/route.ts` and `src/components/admin/FluxPromotionsTab.tsx` with metrics (usage count vs limit, total redeemed revenue), toggle activation, date scheduling, category/SKU eligibility, and an upgraded creation modal.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, Tailwind CSS, Lucide React.

---

## Global Constraints
- **Zero em dashes (`—`)** anywhere in code, comments, commit messages, or responses. Use standard punctuation like commas, periods, or colons.
- **Minimum 44px tap target height** (`min-h-[44px]`) on all interactive buttons, inputs, and toggles.
- **WCAG AA color contrast** (4.5:1 ratio).
- **Comprehensive UI states**: empty, loading, error, and feedback states.

---

## Task Decomposition

### Task 1: Promotion Engine Types & Validation Logic in Repository (Backend/DB)
- **Files to create/modify**:
  - `src/lib/db/types.ts`
  - `src/lib/db/repositories/promotions.repository.ts`
  - `tests/phase3-admin05-promotions-engine.test.ts`
- **Responsibilities**:
  - Extend `Promotion` interface with `starts_at`, `ends_at`, `max_global_uses`, `max_uses_per_user`, `min_spend`, `max_discount`, `total_discount_given`, `eligible_categories`, `eligible_product_ids`.
  - Implement `validatePromotion` supporting:
    - active status and date scheduling (starts_at / ends_at).
    - global usage cap (`usage_count < max_global_uses`).
    - per-user usage cap (`max_uses_per_user`).
    - minimum subtotal spend (`min_spend`).
    - percentage discounts with `max_discount` ceiling.
    - fixed amount discounts.
    - free shipping discount type.
    - eligible category and SKU restrictions.
  - Implement `recordUsage` updating `usage_count` and `total_discount_given`.
- **Test criteria**:
  - Unit tests for all discount types, min spend rejections, expired code rejections, usage limit rejections, and usage tracking.

### Task 2: Public Promo Code Validation Route & Create-Order Redemption Capture
- **Files to create/modify**:
  - `src/app/api/promotions/validate/route.ts`
  - `src/app/api/checkout/create-order/route.ts`
  - `tests/phase3-admin05-promotions-engine.test.ts`
- **Responsibilities**:
  - Create `POST /api/promotions/validate` accepting `{ code, subtotal, shippingFee, items, customerEmail }`.
  - Integrate server-side validation and call `db.promotions.recordUsage` in `src/app/api/checkout/create-order/route.ts`.
- **Test criteria**:
  - Integration tests verifying `/api/promotions/validate` success and RFC 7807 problem responses.
  - Test order creation records promo usage count and discount amount.

### Task 3: Storefront Checkout Dynamic Promo Integration
- **Files to create/modify**:
  - `src/app/checkout/page.tsx`
  - `tests/phase3-admin05-promotions-engine.test.ts`
- **Responsibilities**:
  - Replace static promo switch in `handleApplyDiscount` with `fetch("/api/promotions/validate", ...)`.
  - Handle free shipping discounts (dynamically setting shipping discount).
  - Provide inline error messaging when promo criteria are not met.
  - Maintain 44px tap targets and zero em dashes.
- **Test criteria**:
  - UI craftsmanship assertions: no em dashes, 44px tap targets, removal of hardcoded promo code switch.

### Task 4: Admin Promotions Management UI & Enhanced API
- **Files to create/modify**:
  - `src/app/api/admin/promotions/route.ts`
  - `src/components/admin/FluxPromotionsTab.tsx`
  - `src/app/admin/page.tsx`
  - `tests/phase3-admin05-promotions-engine.test.ts`
- **Responsibilities**:
  - Enhance `/api/admin/promotions` with complete field support (`min_spend`, `max_discount`, `starts_at`, `ends_at`, `usage_limit`, `eligible_categories`, `eligible_product_ids`, `discount_type`).
  - Upgrade `FluxPromotionsTab` with discount type badges, date indicators, usage progress bars, total discount tracked, inline activate/deactivate toggle, delete action, and comprehensive create modal.
- **Test criteria**:
  - Test admin endpoints with RBAC enforcement and verify Flux tab craftsmanship.

### Task 5: Full System Verification, Typecheck, and Push
- **Responsibilities**:
  - Run complete Vitest suite (all 27 test files).
  - Run `npx tsc --noEmit`.
  - Run Next.js production build (`npm run build`).
  - Commit and push to `origin/main`.
