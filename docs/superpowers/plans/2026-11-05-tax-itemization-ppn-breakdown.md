# Indonesian Tax Itemization & PPN Breakdown (CUST-04) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement centralized Indonesian Tax Calculation (PPN 11% / 12% Breakdown & DPP Base) across the checkout summary, order creation snapshots, order database models, and invoice dispatch, strictly excluding NPWP / NIK capture at checkout per user directive.

**Architecture:**
1. Create `src/lib/tax/taxCalculation.ts`: A modular tax calculation utility supporting inclusive (default for Indonesian B2C hardware) and exclusive tax calculations, configurable rates (11% and 12%), and line-item tax breakdown aggregation.
2. Update `src/lib/db/types.ts`: Add `tax_amount`, `tax_rate`, and `dpp_amount` to `Order` interface, ensuring compatibility with `tax_rate_snapshot` and `tax_amount_snapshot` on `OrderItem`.
3. Enhance `src/app/api/checkout/create-order/route.ts`: Compute tax breakdown on order creation and populate line-item snapshots (`tax_rate_snapshot`, `tax_amount_snapshot`) and order-level tax totals (`tax_amount`, `dpp_amount`, `tax_rate`).
4. Update `src/app/checkout/page.tsx`: Display an explicit, transparent tax itemization in the Order Summary sidebar (Gross Subtotal, Shipping, DPP / Net Tax Base, PPN 11% Included, and Grand Total). Ensure NO NPWP or NIK input fields are present.
5. Harmonize Invoice Utilities: Refactor `src/app/checkout/success/page.tsx`, `src/lib/utils/invoiceDownload.ts`, and `src/lib/notifications/email.ts` to consume the centralized tax calculation engine.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest.

---

## Global Constraints
- **Zero em dashes (`—`)** anywhere in code, comments, commit messages, or responses. Use standard punctuation like commas, periods, or colons.
- **Minimum 44px tap target height** (`min-h-[44px]`) on all interactive controls.
- **WCAG AA color contrast** (4.5:1 ratio).
- **NO NPWP / NIK capture at checkout** (explicit user requirement).

---

## Task Decomposition

### Task 1: Centralized Indonesian Tax Calculation Engine & DB Types
- **Files to create/modify**:
  - `src/lib/tax/taxCalculation.ts`
  - `src/lib/db/types.ts`
  - `tests/phase3-cust04-tax-itemization.test.ts`
- **Responsibilities**:
  - Implement `calculateInclusiveTax`, `calculateExclusiveTax`, and `calculateOrderTaxBreakdown`.
  - Support standard 11% PPN rate and 12% future rate.
  - Add tax fields to `Order` in `src/lib/db/types.ts`.
- **Test criteria**:
  - Test inclusive tax math (`dpp + ppn === gross`).
  - Test exclusive tax math.
  - Test multi-item order tax breakdown with shipping and discounts.

### Task 2: Server-Side Order Tax Snapshotting in Create-Order API
- **Files to create/modify**:
  - `src/app/api/checkout/create-order/route.ts`
  - `tests/phase3-cust04-tax-itemization.test.ts`
- **Responsibilities**:
  - In `create-order`, calculate DPP and PPN per line item and for the overall order.
  - Store `tax_rate_snapshot: 0.11` and `tax_amount_snapshot` on each `OrderItem`.
  - Store `tax_amount`, `dpp_amount`, and `tax_rate` on `Order`.
  - Return `tax: { dpp, taxAmount, taxRate }` in JSON response.
- **Test criteria**:
  - Verify `POST /api/checkout/create-order` populates `OrderItem` tax snapshots and `Order` tax amounts.

### Task 3: Checkout Order Summary UI & Invoice Harmonization
- **Files to create/modify**:
  - `src/app/checkout/page.tsx`
  - `src/app/checkout/success/page.tsx`
  - `src/lib/utils/invoiceDownload.ts`
  - `src/lib/notifications/email.ts`
  - `tests/phase3-cust04-tax-itemization.test.ts`
- **Responsibilities**:
  - Add transparent DPP and PPN 11% (Included) rows to checkout sidebar in `src/app/checkout/page.tsx`.
  - Verify zero NPWP / NIK input fields exist at checkout.
  - Refactor success page, invoice download, and email dispatch to import from `@/lib/tax/taxCalculation`.
- **Test criteria**:
  - Test that checkout order summary displays DPP and PPN.
  - Confirm NPWP/NIK inputs are absent.
  - Verify zero em dashes and minimum 44px tap targets.

### Task 4: Full System Verification, Typecheck, and Push
- **Responsibilities**:
  - Run complete Vitest suite (all 26 test files).
  - Run `npx tsc --noEmit`.
  - Run Next.js production build (`npm run build`).
  - Push commits to `origin/main`.
