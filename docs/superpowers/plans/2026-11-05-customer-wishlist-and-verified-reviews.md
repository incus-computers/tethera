# Customer Wishlist & Verified Buyer Reviews (P2.2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a strictly verified customer review system (only buyers with delivered orders can submit reviews) with star rating histograms and a persistent hybrid customer wishlist with session merging and storefront integration.

**Architecture:** Database repositories (`reviews.repository.ts`, `wishlist.repository.ts`) provide data access, delivered purchase verification against `db.orders`, rating distribution calculations, and anonymous session merging. Next.js API endpoints (`/api/products/[id]/reviews`, `/api/wishlist`, `/api/wishlist/merge`) expose these capabilities with strict validation. Frontend components (`ProductReviewsSection.tsx`, PDP wishlist toggle, Account wishlist tab in `account/page.tsx`) deliver responsive, craft-first customer interactions.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React, Vitest.

**Spec:** [tethera_e_commerce_agentic_audit_upgrade_prompt.md](file:///C:/Users/darkl/OneDrive/Desktop/trial/tethera_e_commerce_agentic_audit_upgrade_prompt.md) (`CUST-06`), [phase2_gap_analysis_and_remediation_plan.md](file:///C:/Users/darkl/.gemini/antigravity-cli/brain/365b3ad2-8b57-4f41-886e-7ea7521a1ca9/phase2_gap_analysis_and_remediation_plan.md).

## Global Constraints
- NEVER use em dashes in code, comments, commit messages, or user-facing text.
- Minimum 44px tap target height (`min-h-[44px]`) on all buttons, inputs, and interactive controls.
- Maintain WCAG AA color contrast ratios (4.5:1).
- Reviews must be strictly gated: only customers who have purchased the item and whose order status is `collected`, `delivery_arrived`, or `finished` can submit a review.
- Prevent duplicate reviews for the same customer/product combination.

## Review Focus
- Unverified customer attempting review submission: rejected with 403 Forbidden and informative error message.
- Customer attempting second review for same item: rejected with 409 Conflict.
- Anonymous visitor adding items to wishlist: persisted via 30-day cookie and automatically merged upon user login.
- Star rating calculation with 0 reviews: handled gracefully without NaN or divide-by-zero errors.
- Real-time stock status in wishlist view: correctly displays "Out of Stock" or "In Stock" alongside live prices.

---

### Task 1: Reviews and Wishlist Data Models & Repositories

**Files:**
- Modify: `src/lib/db/types.ts`
- Create: `src/lib/db/repositories/reviews.repository.ts`
- Create: `src/lib/db/repositories/wishlist.repository.ts`
- Modify: `src/lib/db/index.ts`
- Test: `tests/phase3-p2-wishlist-and-reviews.test.ts`

**Interfaces:**
- Consumes: `BaseRepository`, `Order`, `Product` from `src/lib/db/types.ts`.
- Produces:
  - `ProductReviewRow`: interface with `id`, `product_id`, `user_id`, `customer_name`, `customer_email`, `rating`, `title`, `content`, `verified_purchase`, `created_at`.
  - `WishlistItemRow`: interface with `id`, `user_id`, `anonymous_session_token`, `product_id`, `created_at`.
  - `reviewsRepository.getByProductId(productId)`: returns reviews and `{ averageRating, totalCount, distribution: { 5: N, 4: N, 3: N, 2: N, 1: N } }`.
  - `reviewsRepository.canUserReview(productId, email, userId)`: boolean check verifying delivered order and no existing review.
  - `reviewsRepository.createVerifiedReview(data)`: creates review if eligible.
  - `wishlistRepository.getWishlist(filter)`: returns wishlist items.
  - `wishlistRepository.addItem(filter, productId)`: adds product.
  - `wishlistRepository.removeItem(filter, productId)`: removes product.
  - `wishlistRepository.mergeSessionWishlist(sessionToken, userId)`: merges guest items to user.

- [ ] **Step 1: Write failing repository unit tests**
Create `tests/phase3-p2-wishlist-and-reviews.test.ts` covering:
- Blocking review submission if user has no delivered order for that product.
- Allowing review submission when user has an order with status `delivery_arrived` or `collected`.
- Aggregating star ratings and 1-5 histogram distribution.
- Adding and removing items in wishlist for anonymous session token.
- Merging anonymous wishlist items into user account upon login.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/phase3-p2-wishlist-and-reviews.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement data models and repositories**
Update `src/lib/db/types.ts`, implement `reviews.repository.ts`, `wishlist.repository.ts`, and register in `src/lib/db/index.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/phase3-p2-wishlist-and-reviews.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/db/types.ts src/lib/db/repositories/reviews.repository.ts src/lib/db/repositories/wishlist.repository.ts src/lib/db/index.ts tests/phase3-p2-wishlist-and-reviews.test.ts
git commit -m "feat: implement reviews and wishlist repositories with delivery verification"
```

---

### Task 2: Reviews and Wishlist API Route Endpoints

**Files:**
- Create: `src/app/api/products/[id]/reviews/route.ts`
- Create: `src/app/api/wishlist/route.ts`
- Create: `src/app/api/wishlist/merge/route.ts`
- Modify: `tests/phase3-p2-wishlist-and-reviews.test.ts`

**Interfaces:**
- Consumes: `db.reviews`, `db.wishlist`, `db.products`, `db.orders`.
- Produces:
  - `GET /api/products/[id]/reviews`: returns reviews, aggregate score, and histogram.
  - `POST /api/products/[id]/reviews`: verifies delivered order, validates rating (1-5), persists review, returns 201 or 403.
  - `GET /api/wishlist`: returns saved products with current catalog details.
  - `POST /api/wishlist`: adds product ID to session/user wishlist.
  - `DELETE /api/wishlist`: removes product ID from session/user wishlist.
  - `POST /api/wishlist/merge`: merges session items into user account.

- [ ] **Step 1: Write failing API route integration tests**
Add tests in `tests/phase3-p2-wishlist-and-reviews.test.ts` verifying:
- `POST /api/products/[id]/reviews` rejects unverified buyer with 403.
- `POST /api/products/[id]/reviews` accepts verified buyer and returns review with `verified_purchase: true`.
- `GET /api/wishlist` hydrates saved product details.
- `POST /api/wishlist/merge` deduplicates and moves guest items to user ID.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/phase3-p2-wishlist-and-reviews.test.ts`
Expected: FAIL (routes not found).

- [ ] **Step 3: Implement API route handlers**
Implement `/api/products/[id]/reviews`, `/api/wishlist`, and `/api/wishlist/merge`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/phase3-p2-wishlist-and-reviews.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/api/products/[id]/reviews/route.ts src/app/api/wishlist/route.ts src/app/api/wishlist/merge/route.ts tests/phase3-p2-wishlist-and-reviews.test.ts
git commit -m "feat: add reviews and wishlist API routes with verified buyer enforcement"
```

---

### Task 3: Storefront Reviews UI & Account Wishlist Dashboard

**Files:**
- Create: `src/components/products/ProductReviewsSection.tsx`
- Create: `src/components/products/WishlistToggleButton.tsx`
- Modify: `src/app/products/[id]/page.tsx`
- Modify: `src/app/account/page.tsx`
- Test: `tests/phase3-p2-wishlist-and-reviews.test.ts`

**Interfaces:**
- Consumes: `/api/products/[id]/reviews`, `/api/wishlist`.
- Produces:
  - Interactive star breakdown histogram and verified review cards on product detail pages.
  - "Write a Review" modal checking purchase verification.
  - Heart toggle button on PDP with active states and tap target >= 44px.
  - Saved Wishlist tab in `/account` with "Move to Cart" and "Remove".

- [ ] **Step 1: Write frontend component tests**
Add static markup tests in `tests/phase3-p2-wishlist-and-reviews.test.ts` verifying:
- ProductReviewsSection renders star rating histogram bars and Verified Buyer badge.
- WishlistToggleButton renders accessible button with min 44px height.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/phase3-p2-wishlist-and-reviews.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement UI components and integrate into PDP and Account page**
Build `ProductReviewsSection.tsx`, `WishlistToggleButton.tsx`, update `/products/[id]/page.tsx`, and add Wishlist tab to `/account/page.tsx`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/phase3-p2-wishlist-and-reviews.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/products/ProductReviewsSection.tsx src/components/products/WishlistToggleButton.tsx src/app/products/[id]/page.tsx src/app/account/page.tsx tests/phase3-p2-wishlist-and-reviews.test.ts
git commit -m "feat: add product reviews section with verified badges and account wishlist view"
```

---

### Task 4: End-to-End Verification & Production Build

**Files:**
- Test: Full Vitest suite (`npx vitest run`)
- Check: TypeScript compiler (`npx tsc --noEmit`)
- Build: Next.js production build (`npm run build`)

- [ ] **Step 1: Run complete test suite**
Run: `npx vitest run`
Expected: All test files pass.

- [ ] **Step 2: Verify TypeScript types**
Run: `npx tsc --noEmit`
Expected: Exit code 0.

- [ ] **Step 3: Verify Next.js production build**
Run: `npm run build`
Expected: All routes compile and generate successfully.

- [ ] **Step 4: Commit and push to GitHub**
```bash
git commit -m "feat: complete P2.2 customer wishlist and verified buyer reviews"
git push origin main
```
