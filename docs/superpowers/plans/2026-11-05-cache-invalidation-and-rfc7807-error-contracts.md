# Cache Invalidation Hooks & Standardized RFC 7807 Error Responses (P2.3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated on-demand ISR cache invalidation hooks (`OPT-BE-02`) across product, banner, promotion, and inventory mutations, alongside standardized RFC 7807 Problem Details error responses (`OPT-BE-03`) across serverless API routes.

**Architecture:** 
1. Build `src/lib/cache/revalidate.ts` to map business mutations to target Next.js paths (`/`, `/components`, `/products/[id]`, `/builder`) and cache tags (`products`, `banners`, `promotions`, `inventory`), with graceful fallback for non-Next environments.
2. Build `src/lib/api/problemDetails.ts` providing RFC 7807 compliant error envelopes (`type`, `title`, `status`, `detail`, `instance`, `invalid_params`) while preserving backward-compatible `success: false` and `error: detail` fields.
3. Wire cache invalidation and RFC 7807 problem responses into product mutations, bulk CSV imports, banner updates, promotion updates, inventory adjustments, and product reviews.
4. Verify with comprehensive unit and integration tests and ensure zero em dashes across all code and documentation.

**Tech Stack:** Next.js 14 App Router (`next/cache`), TypeScript, RFC 7807 / RFC 9457 specification, Vitest.

**Spec:** [`phase2_gap_analysis_and_remediation_plan.md`](file:///C:/Users/darkl/.gemini/antigravity-cli/brain/365b3ad2-8b57-4f41-886e-7ea7521a1ca9/phase2_gap_analysis_and_remediation_plan.md) (Items `OPT-BE-02` and `OPT-BE-03`).

---

## Global Constraints
- **Zero em dashes (`—`)** anywhere in code, comments, commit messages, or responses. Use standard punctuation like commas, periods, or colons.
- **Minimum 44px tap target height** (`min-h-[44px]`) on any UI components.
- **Backward compatibility**: All error responses must retain `{ success: false, error: string }` so existing frontend consumers never break.
- **Resilience**: `safeRevalidate` must catch and tolerate environments where the Next.js static generation store is not active (e.g. Vitest test runner), reporting status without crashing the process.

---

## Task Decomposition

### Task 1: Cache Invalidation Engine (`OPT-BE-02`)
- **Files to create/modify**:
  - `src/lib/cache/revalidate.ts`
  - `tests/phase3-p2-cache-and-error-contracts.test.ts`
- **Responsibilities**:
  - Provide `safeRevalidate(entity, options)` mapping `product`, `banner`, `promotion`, `inventory`, and `category` to precise paths and tags.
  - Return `{ revalidated: boolean, paths: string[], tags: string[], error?: string }`.
- **Test criteria**:
  - Verifies correct paths and tags are computed for all 5 entities.
  - Verifies resilient error handling outside Next runtime.

### Task 2: Standardized RFC 7807 Problem Details Envelopes (`OPT-BE-03`)
- **Files to create/modify**:
  - `src/lib/api/problemDetails.ts`
  - `tests/phase3-p2-cache-and-error-contracts.test.ts`
- **Responsibilities**:
  - Define `ProblemDetails` interface conforming to RFC 7807 / RFC 9457.
  - Provide factory helpers: `badRequestProblem`, `unauthorizedProblem`, `forbiddenProblem`, `notFoundProblem`, `conflictProblem`, `unprocessableEntityProblem`, `internalServerErrorProblem`.
  - Set `Content-Type: application/problem+json`.
- **Test criteria**:
  - Verifies exact RFC 7807 fields, HTTP status codes, problem types, and backward-compatible fields.

### Task 3: API Route Integration
- **Files to create/modify**:
  - `src/app/api/admin/products/route.ts`
  - `src/app/api/admin/products/bulk/import/route.ts`
  - `src/app/api/admin/banners/route.ts`
  - `src/app/api/admin/promotions/route.ts`
  - `src/app/api/admin/inventory/route.ts`
  - `src/app/api/products/[id]/reviews/route.ts`
- **Responsibilities**:
  - Integrate `safeRevalidate` on all create/update/delete mutations.
  - Replace raw error responses with RFC 7807 problem responses on validation, permission, and entity lookups.
- **Test criteria**:
  - End-to-end integration tests confirming RFC 7807 error format and cache invalidation calls on product and review endpoints.

### Task 4: Full System Verification, Typecheck, and Push
- **Responsibilities**:
  - Run complete Vitest suite (all test files must pass).
  - Run `npx tsc --noEmit` (0 errors).
  - Run `npm run build` (Next.js production build).
  - Commit and push to `origin/main`.
