# Bulk Catalog CSV Engine (P2.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, non-technical bulk catalog CSV import/export engine featuring human-friendly category mapping, multi-row SKU variant grouping, prefixed specification columns (`spec_*`), dual-mode stock controls (`stock_on_hand` vs `stock_delta`), strict all-or-nothing validation, immutable ledger auditing, and an admin UI modal.

**Architecture:** A modular CSV service layer (`src/lib/csv/productCsv.ts`) handles serialization, parsing, category normalization, and row-level pre-flight validation. Next.js API endpoints (`/api/admin/products/bulk/export` and `/api/admin/products/bulk/import`) enforce RBAC clearance (`products:read`, `products:write`), execute atomic batch imports without partial commits on error, and append entries to `inventory_adjustment_ledger` and `admin_audit_logs`. The admin UI in `FluxProductsTab.tsx` and `FluxBulkCsvModal.tsx` provides accessible, real-time import previews, error diagnostic callouts, template downloads, and catalog exports.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React, Vitest.

**Spec:** [tethera_e_commerce_agentic_audit_upgrade_prompt.md](file:///C:/Users/darkl/OneDrive/Desktop/trial/tethera_e_commerce_agentic_audit_upgrade_prompt.md) (`ADMIN-03`), [phase2_gap_analysis_and_remediation_plan.md](file:///C:/Users/darkl/.gemini/antigravity-cli/brain/365b3ad2-8b57-4f41-886e-7ea7521a1ca9/phase2_gap_analysis_and_remediation_plan.md).

## Global Constraints
- NEVER use em dashes in code, comments, commit messages, or user-facing text.
- Minimum 44px tap target height (`min-h-[44px]`) on all buttons and inputs.
- All monetary amounts stored and computed in integer IDR currency units (no floating-point rounding errors).
- All-or-nothing atomicity: If even a single row has an error, halt the entire upload and commit zero database changes.
- Append immutable records to `inventory_adjustment_ledger` for all stock changes and `admin_audit_logs` for staff operations.

## Review Focus
- Malformed CSV row (missing quotes on multi-line text or unbalanced delimiters): parsed safely without crashing the server.
- Conflicting stock columns (both `stock_on_hand` and `stock_delta` specified on same row): flagged as an explicit validation error.
- Duplicate SKUs within the same uploaded CSV file: rejected during pre-flight before database write.
- Negative or non-numeric prices: flagged with row number and rejected.
- Variant row with missing `variant_name` or invalid `parent_sku`: flagged with row number and rejected.

---

### Task 1: CSV Parser, Category Auto-Mapping & Pre-flight Validator

**Files:**
- Create: `src/lib/csv/productCsv.ts`
- Test: `tests/phase3-p2-bulk-catalog-csv.test.ts`

**Interfaces:**
- Consumes: `Product`, `ProductVariantRow`, `StoreInventory` from `src/lib/db/types.ts`.
- Produces:
  - `normalizeCategory(input: string): string | null`
  - `parseProductCsv(csvContent: string): { headers: string[]; rows: Record<string, string>[] }`
  - `generateCatalogCsv(products: Product[], inventoryMap: Map<string, StoreInventory>): string`
  - `generateSampleCsvTemplate(): string`
  - `validateBulkCsvRows(rows: Record<string, string>[], existingSkus: Set<string>): { isValid: boolean; errors: CsvRowError[]; preview: CsvImportPreviewItem[] }`

- [ ] **Step 1: Write the failing unit tests for parser and validator**
Add tests in `tests/phase3-p2-bulk-catalog-csv.test.ts` covering:
- CSV row parsing with quoted commas and whitespace trimming.
- Human category normalization (`CPU` -> `cpu`, `Graphics Card` -> `gpu`, `Mobo` -> `motherboards`).
- Aggregating `spec_*` columns into a clean specifications dictionary.
- All-or-nothing validation failure when a row has negative price or missing SKU.
- Validation failure when duplicate SKUs exist in the same batch.
- Handling dual-mode stock columns (`stock_on_hand` vs `stock_delta`).

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/phase3-p2-bulk-catalog-csv.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `src/lib/csv/productCsv.ts`**
Implement the category lookup dictionary, RFC 4180-compliant CSV serializer/parser, `spec_*` column extractor, and strict row validator.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/phase3-p2-bulk-catalog-csv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/csv/productCsv.ts tests/phase3-p2-bulk-catalog-csv.test.ts
git commit -m "feat: implement bulk catalog CSV parser, category mapper, and validator"
```

---

### Task 2: Bulk Export & Sample Template API Route

**Files:**
- Create: `src/app/api/admin/products/bulk/export/route.ts`
- Modify: `tests/phase3-p2-bulk-catalog-csv.test.ts`

**Interfaces:**
- Consumes: `requireAdminPermission` from `src/lib/auth/rbac.ts`, `db` from `src/lib/db`, `generateCatalogCsv`, `generateSampleCsvTemplate` from `src/lib/csv/productCsv.ts`.
- Produces:
  - `GET /api/admin/products/bulk/export`: Returns `text/csv; charset=utf-8` stream with `Content-Disposition: attachment; filename="tethera-catalog-export-YYYYMMDD.csv"`.
  - Supports `?template=true` query parameter to return sample starter CSV template.

- [ ] **Step 1: Write the failing tests for CSV export endpoint**
Add tests in `tests/phase3-p2-bulk-catalog-csv.test.ts` verifying:
- Rejects unauthenticated request with 401.
- Allows `products:read` staff to download full catalog CSV.
- Verifies CSV headers include `sku`, `parent_sku`, `name`, `category`, `stock_on_hand`, and dynamic `spec_*` columns.
- Query parameter `?template=true` returns pre-populated starter template.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/phase3-p2-bulk-catalog-csv.test.ts`
Expected: FAIL (route module not found).

- [ ] **Step 3: Implement `src/app/api/admin/products/bulk/export/route.ts`**
Read products from `db.products` and inventory from `db.inventory`, generate CSV payload, and set response headers.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/phase3-p2-bulk-catalog-csv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/api/admin/products/bulk/export/route.ts tests/phase3-p2-bulk-catalog-csv.test.ts
git commit -m "feat: add admin catalog CSV export and starter template endpoint"
```

---

### Task 3: Atomic Bulk Import Endpoint with Ledger & Audit Logging

**Files:**
- Create: `src/app/api/admin/products/bulk/import/route.ts`
- Modify: `tests/phase3-p2-bulk-catalog-csv.test.ts`

**Interfaces:**
- Consumes: `requireAdminPermission(req, "products:write")`, `validateBulkCsvRows`, `parseProductCsv`, `db.products`, `db.inventory`, `db.inventoryLedger`, `db.auditLogs`.
- Produces:
  - `POST /api/admin/products/bulk/import`:
    - If validation errors exist: returns `422 Unprocessable Entity` with `{ success: false, errors: [...] }` without touching database.
    - If 100% valid: executes atomic batch upsert, adjusts inventory, logs entries in `inventory_adjustment_ledger` and `admin_audit_logs`.
    - Returns `200 OK` with `{ success: true, summary: { created: N, updated: N, stockAdjusted: N } }`.

- [ ] **Step 1: Write failing tests for bulk import endpoint**
Add tests in `tests/phase3-p2-bulk-catalog-csv.test.ts` verifying:
- Rejects `SUPPORT_AGENT` who lacks `products:write` with 403 Forbidden.
- Rejects batch containing even 1 invalid row (e.g. negative price or bad category) with 422 and confirms 0 database changes were made.
- Successfully creates new product from CSV row with `spec_*` columns.
- Successfully updates existing product pricing and stock.
- Confirms `inventory_adjustment_ledger` records adjustments with reason `RESTOCK` or `MANUAL_AUDIT`.
- Confirms `admin_audit_logs` records `BULK_CATALOG_IMPORT`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/phase3-p2-bulk-catalog-csv.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/app/api/admin/products/bulk/import/route.ts`**
Implement the endpoint with strict all-or-nothing validation, atomic upsert execution, inventory adjustment tracking, and audit logging.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/phase3-p2-bulk-catalog-csv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/api/admin/products/bulk/import/route.ts tests/phase3-p2-bulk-catalog-csv.test.ts
git commit -m "feat: implement atomic bulk catalog CSV import with ledger auditing"
```

---

### Task 4: Admin UI Modal & Catalog Toolbar Integration

**Files:**
- Create: `src/components/admin/FluxBulkCsvModal.tsx`
- Modify: `src/components/admin/FluxProductsTab.tsx`
- Test: `tests/flux-products-catalog.test.tsx`

**Interfaces:**
- Consumes: `/api/admin/products/bulk/export`, `/api/admin/products/bulk/import`.
- Produces:
  - Accessible "Export CSV", "Download Template", and "Bulk Import" buttons on the products catalog toolbar.
  - Interactive CSV import modal with file upload zone, client pre-flight summary (counts of new vs updated items), error diagnostic table showing row numbers, and real action submission.

- [ ] **Step 1: Write frontend test verifying toolbar action buttons and modal opening**
Update `tests/flux-products-catalog.test.tsx` to verify:
- "Export CSV" and "Bulk Import" buttons are rendered with `min-h-[44px]` tap targets.
- Clicking "Bulk Import" opens the `FluxBulkCsvModal`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/flux-products-catalog.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `FluxBulkCsvModal.tsx` and update `FluxProductsTab.tsx`**
Create `FluxBulkCsvModal.tsx` with drag-and-drop file upload, CSV parsing preview, validation error callouts, and submit flow. Mount it in `FluxProductsTab.tsx`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/flux-products-catalog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/admin/FluxBulkCsvModal.tsx src/components/admin/FluxProductsTab.tsx tests/flux-products-catalog.test.tsx
git commit -m "feat: add admin bulk CSV import modal and catalog export toolbar"
```

---

### Task 5: End-to-End Verification & Build Check

**Files:**
- Test: Full Vitest test suite (`tests/`)
- Command: `npx vitest run`
- Command: `npx tsc --noEmit`
- Command: `npm run build`

- [ ] **Step 1: Run complete test suite**
Run: `npx vitest run`
Expected: All test files pass with 0 failures.

- [ ] **Step 2: Verify TypeScript types**
Run: `npx tsc --noEmit`
Expected: Exit code 0.

- [ ] **Step 3: Verify Next.js production build**
Run: `npm run build`
Expected: All routes compile and generate successfully.

- [ ] **Step 4: Final commit and push**
```bash
git commit -m "feat: complete P2.1 bulk catalog CSV engine with export, atomic import, and UI modal"
git push origin main
```
