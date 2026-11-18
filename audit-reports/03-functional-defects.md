# Functional defects and feature inventory

Verified findings below are established by code reasoning or explicitly named checks. No browser journey or database integration scenario was executed. Expected versus actual behaviour and proposed fixture reproductions are included per finding. Security defects affecting normal checkout/accounts retain the same IDs in report 02.

## Implemented feature inventory

| Area | Evidence | Assessment |
|---|---|---|
| Discovery | products/categories APIs, predictive search, category pages, facets | Partial: implemented; browser and scale correctness unverified |
| Product details | specs, gallery, price/variation selection, wishlist/reviews/stock signup | Partial: identity/schema defects |
| PC shopping | builder socket/RAM/GPU-length/estimated-power checks; gaming/workstation/prebuilts | Partial: useful client checks; trusted checkout validation missing |
| Cart/checkout | Zustand cart, persistent repository/merge APIs, courier/promo/pickup selection | Partial: inventory/quote/payment correctness fails |
| Accounts | registration/login/profile/history and guest signed tracking | Partial: authentication/ownership/persistence fails |
| After sales | RMA, refund records, split fulfilments and tracking | Partial: simulated refunds and unsafe allocation/events |
| Administration | catalog/gallery/variants/CSV, inventory ledger, orders/CRM/promos/banners/homepage/audit | Partial: granular guard coverage inconsistent; full UI not exercised |
| Localisation | IDR formatting, Indonesian address fields, couriers, WhatsApp links | Partial: English text and placeholder contacts/location |
| Warranty/serial/quotes/compare | no dedicated supplied customer routes/model lifecycle found | Missing in inspected inventory; optional scope depends on business |

AUD-001/003/004/020/021/022/023/034 cover access control. AUD-002/005/006/009/012 are also transactional defects; see report 02 for their full evidence.

## AUD-007 — Checkout ignores failed reservations and leaks non-atomic holds

**High | P0 | Verified | Open** | CWE-362

Location: `src/lib/db/repositories/inventory.repository.ts:30`, reserveStock; create-order POST.

Evidence / actual: reserveStock reads availability then separately writes an absolute reserved count. Checkout continues when it returns success=false. reservedProductIds is accumulated without rollback; holds precede order persistence and this path creates no order-linked expiry records.

Reproduction or code reasoning: Two buyers may read the same last unit and both overwrite reserved count; a failed reserve does not abort checkout. Later failure leaves earlier holds. Concurrency not run.

Impact: Lost updates/overselling, selling unavailable items and indefinite stock holds after abandoned/failed checkout.

Expected behaviour / concrete fix: Use one transactional order/reservation operation with conditional updates or row locks, order-linked expiring holds and idempotent release/rollback.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-008 — Payment procedure double-reserves and is not atomic on business failure

**High | P0 | Verified | Open** | CWE-841

Location: `supabase/schema.sql:348`, process_order_payment_success.

Evidence / actual: Locks the order but has no already-paid guard. Increments stock_reserved again after checkout hold, never deducts on-hand, and returns JSON failure after prior loop writes without raising/rollback. Local fallback instead deducts on-hand without paid-state idempotency.

Reproduction or code reasoning: Stock=1, checkout hold=1 makes SQL available=0 for its own payment. A normal RETURN does not undo previous writes. Database tests not run.

Impact: Last-unit checkout fails against its own hold; retries reserve/deduct repeatedly, later-line failure leaves earlier updates, and real/local behaviour diverges.

Expected behaviour / concrete fix: Use an order-linked inventory ledger; transactionally consume a hold once, deduct once and transition payment once. Roll back all lines on failure; retries return prior result.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-010 — Webhook retries and event ordering are unsafe

**High | P0 | Verified | Open** | CWE-841

Location: `src/app/api/webhooks/midtrans/route.ts:13`, POST; processedWebhookEvents.

Evidence / actual: Deduplication is a process-local Set. Settlement does not reject rpcResult.success=false before caching/acknowledging. Pending/challenge can overwrite paid state; refund statuses are acknowledged without financial transition.

Reproduction or code reasoning: Proposed scenarios: false RPC result then duplicate notification; settlement then delayed pending; restart then replay. No failure injection executed.

Impact: Failures can be acknowledged permanently, delayed events regress paid orders, restarts/workers duplicate effects and external refunds go unreconciled.

Expected behaviour / concrete fix: Persist an inbox with unique event/attempt constraints and atomic state transitions. Acknowledge only durable success; retry failures; prevent regression and reconcile refunds.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-011 — Database failures silently accept volatile mock writes

**High | P0 | Verified | Open** | CWE-703

Location: `src/lib/db/repositories/base.repository.ts:152`, create; findMany; update.

Evidence / actual: Insert failures store records in local memory and return success. findMany errors return the entire fallback collection without reapplying filters/options. Production can use missing-configuration fallback; updates may merge locally.

Reproduction or code reasoning: Inspect create error branch and findMany error return; no outage was injected.

Impact: Accepted orders/features disappear after restart; schema/permission failures look successful; query filtering assumptions fail.

Expected behaviour / concrete fix: Fail closed for production transactional writes, isolate explicit development adapters, propagate structured errors and monitor DB health.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-013 — Biteship failures become simulated success

**High | P0 | Verified | Open** | CWE-754

Location: `src/lib/shipping/biteship.ts:400`, getRates; searchAreas; createOrderAndSchedulePickup.

Evidence / actual: Missing keys, non-OK responses and exceptions fall through to random waybills/provider IDs with success=true. Rates become synthetic available quotes; unmatched destinations get fabricated area IDs. Dispatch assigns a sample driver even after live API success.

Reproduction or code reasoning: Trace a non-OK Biteship order response to the random success fallback. No provider call performed.

Impact: Staff/customers see coverage and shipped status without a real booking.

Expected behaviour / concrete fix: Separate mock/sandbox adapter explicitly; fail closed for live bookings, preserve errors and unknown outcomes; display only actual provider tracking/driver data.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-014 — Dispatch lacks payment gate, duplicate lock and recovery

**High | P0 | Verified | Open** | CWE-841

Location: `src/app/api/admin/courier/dispatch/route.ts:35`, POST: ACTION B.

Evidence / actual: After permission/order existence checks, books without paid/delivery/ready-state checks or existing-shipment exclusion. No durable operation lock surrounds remote booking then local update. Simulation actions have no environment guard.

Reproduction or code reasoning: Reason through two identical requests or remote success then update failure: both can reach booking. Not executed.

Impact: Unpaid/pickup orders can ship, retries book multiple couriers, and remote success/local failure can orphan billable shipments.

Expected behaviour / concrete fix: Enforce state/payment/allocations, persist a dispatch operation before remote call, lock active allocations and reconcile uncertain outcomes before retries. Isolate simulations.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-015 — Booking uses fixed package weight and loses destination identifiers

**High | P1 | Verified | Open**

Location: `src/app/api/admin/courier/dispatch/route.ts:176`, POST: weightGrams 2500.

Evidence / actual: Books a single fixed 2500g package with value order.total and no real line dimensions/insurance choice. Checkout does not persist area/coordinates; dispatch does not pass them, so service uses default destination area/postcode when missing.

Reproduction or code reasoning: Compare saved shipping_address, dispatch arguments and Biteship defaults. No shipment created.

Impact: Wrong/unsupported destination, freight underquotes and insufficient protection of bulky/high-value electronics.

Expected behaviour / concrete fix: Persist validated area/coordinates, use real packing units and SKU quantity/weight/dimensions/merchandise value, and choose appropriate insurance/fragile handling. Quote and book the same package.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-016 — Refunds are simulated and repeated restocking inflates stock

**High | P0 | Verified | Open** | CWE-840

Location: `src/lib/db/repositories/rma.repository.ts:106`, processRefund.

Evidence / actual: Writes generated gateway_refund_id and completed without contacting Midtrans. No remaining-captured-balance, cumulative limit or idempotency check. A partial refund with restockInventory restocks every product; repeats add all stock again.

Reproduction or code reasoning: Trace repeated fixture processRefund calls and a small partial refund with restockInventory=true. No refund executed.

Impact: Customer funds remain unreturned while records say completed; inventory/accounting drift.

Expected behaviour / concrete fix: Implement pending/provider-confirmed refund attempts with idempotency and remaining-balance validation. Restock only inspected physical line quantities once, independently of financial refunds.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-017 — Cancellation inflates stock and omits build components

**High | P0 | Verified | Open** | CWE-841

Location: `src/lib/db/repositories/orders.repository.ts:439`, cancelOrder.

Evidence / actual: Paid cancellation increments on-hand although supplied SQL payment only reserves. It leaves reserved quantity in the paid branch and processes product_id only, omitting custom-build component holds.

Reproduction or code reasoning: Trace SQL paid_at then cancelOrder: unchanged on-hand is incremented while reservation remains. No cancellation executed.

Impact: Stock appears that never left inventory; components remain reserved and state drift compounds.

Expected behaviour / concrete fix: Use locked order-linked inventory ledger transitions; restore only actual deductions, release holds separately, include components and reconcile captured money/refunds.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-018 — Split fulfilment allows foreign lines and over-allocation

**High | P1 | Verified | Open** | CWE-20

Location: `src/lib/db/repositories/fulfillments.repository.ts:21`, createFulfillment.

Evidence / actual: Checks order has items then writes supplied orderItemId allocations without membership/remaining quantity validation. Total quantity across fulfilments determines completion, regardless of SKU and cancelled allocations.

Reproduction or code reasoning: Fixture: allocate twice one SKU in an order with two SKUs, or supply a foreign orderItemId. No membership/remaining check precedes writes.

Impact: Other order lines can be assigned, quantities overshipped and incomplete orders marked shipped.

Expected behaviour / concrete fix: Transactionally validate ownership and positive integer remaining quantity per line, lock allocations, exclude cancelled allocations and require paid/ready state.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-026 — Feature models do not match supplied database schema

**High | P0 | Verified | Open**

Location: `supabase/schema.sql:230`, orders and supplied migration.

Evidence / actual: Orders lacks checkout-written discount_amount, promo_code, dpp_amount, tax_amount, tax_rate in supplied SQL. No supplied table creation for customer_wishlist, product_reviews, stock_notifications; extended promotion fields absent. Live schema may differ.

Reproduction or code reasoning: Compare checkout orderData/repository table names to schema.sql and sole migration. No live schema inspected.

Impact: Fresh deployment cannot durably implement current features; mock fallbacks conceal errors.

Expected behaviour / concrete fix: Version every required schema field/table, constraints/indexes/RLS; test empty-database bootstrap and deployed drift; remove production fallback success.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-027 — Assembly fees can double-count and tax snapshots do not reconcile

**Medium | P1 | Verified | Open**

Location: `src/app/api/checkout/create-order/route.ts:136`, pcVerifiedTotal; serverTotal.

Evidence / actual: Without pc.totalPrice, subtotal includes componentTotal+assemblyTierFee then serverTotal adds assemblyFee again. Tax snapshots use undiscounted subtotal and independently rounded lines without later discount/fee allocation.

Reproduction or code reasoning: Code arithmetic: components 1000000 + tier 100000, totalPrice omitted, produces 1200000 instead of 1100000. No order submitted.

Impact: Overcharging builds and inconsistent invoices. Legal suitability of fixed 11% representation not assessed.

Expected behaviour / concrete fix: Count assembly once; define immutable integer-IDR financial snapshots and allocation/reconciliation rules. Obtain merchant-specific Indonesian tax review before compliance claims.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-028 — Redemption is non-atomic and checkout loses promotion eligibility

**Medium | P1 | Verified | Open** | CWE-840

Location: `src/lib/db/repositories/promotions.repository.ts:240`, validatePromotion; recordUsage.

Evidence / actual: Validation then read/modify/write usage are separate; checkout records usage before payment. Checkout items omit categories needed for category rules. Restricted fixed_amount discounts use total subtotal instead of eligible subtotal.

Reproduction or code reasoning: Trace category-only rule against category-less checkout items; concurrent usage_count reads; unpaid checkout recordUsage. No usage changed.

Impact: Abandoned orders consume vouchers, limits race, category codes fail and ineligible spend can be discounted.

Expected behaviour / concrete fix: Atomically reserve/redeem per order/customer, release expiry, snapshot trusted categories and calculate only eligible spend.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-029 — Unbounded collection scans precede filtering and pagination

**Medium | P1 | Verified | Open**

Location: `src/lib/db/repositories/products.repository.ts:216`, getFacetedCatalog.

Evidence / actual: Loads all products/inventory before application filter/sort/slice with no upper page-size cap. Account/orders scans all orders and enriches per line; Biteship webhook scans orders. Supabase row caps can truncate datasets before filtering.

Reproduction or code reasoning: Static query trace shows findMany before filtering and nested enrichments; timing/truncation thresholds not measured.

Impact: Higher latency/query volume and incomplete catalog/history/webhook matches at scale; no measured CWV/load result.

Expected behaviour / concrete fix: Push indexed filters/stable pagination/aggregation into DB, cap page size, batch joins and index provider/reference lookups. Measure representative mobile CWV/query plans.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-030 — Durable notification and reconciliation processing is not established

**High | P1 | Probable | Open**

Location: `src/app/api/checkout/payment-success/route.ts:57`, notification and marketplace call sites.

Evidence / actual: Effects started with unawaited promises/catch logging. No supplied outbox/retry worker, reservation expiry job or gateway reconciliation discovered. Stock notification request/markNotified helpers exist but no dispatch consumer observed; external jobs unknown.

Reproduction or code reasoning: Inspect call sites and supplied job/config inventory; actual deployment background jobs Not verified.

Impact: Termination/provider errors lose receipts/stock sync; missed events/holds require manual repair; signup alone does not prove stock alert delivery.

Expected behaviour / concrete fix: Persist transactional outbox and monitored idempotent workers with retries/dead letters; add reservation expiry, payment/shipment reconciliation and stock-alert consumers.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-031 — Localisation, accurate contact and policy workflows are incomplete

**Medium | P1 | Verified | Open**

Location: `src/app/layout.tsx:36`, RootLayout; checkout and route inventory.

Evidence / actual: lang=en and predominantly English checkout/payment text. Checkout fabricates missing email/phone; account location initialisation sets fixed Jakarta coordinates. No dedicated supplied privacy/terms/warranty policy pages, serial tracking, quotation or comparison routes found.

Reproduction or code reasoning: Inspect root language, checkout fallback, useAuthStore coordinate sync and route inventory. Browser/mobile UX not executed.

Impact: Wrong contact/rates, reduced Indonesian usability and unclear after-sales expectations. Optional PC features are gaps rather than vulnerabilities.

Expected behaviour / concrete fix: Require accurate contacts/destinations, Bahasa Indonesia content/local times, reviewed privacy/terms/warranty policies; prioritise warranty/serial lifecycle over optional comparison/quotation polish.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-033 — Existing tests lack a reproducible declared runner

**Medium | P1 | Verified | Open**

Location: `package.json:24`, devDependencies and vitest.config.mjs.

Evidence / actual: 34 test files exist, but no declared Vitest dependency/test script and local vitest.cmd absent. Config excludes several suites. tsc noEmit passed; no tests executed.

Reproduction or code reasoning: Manifest/runner existence checked. No tool installed or integration-capable suite run because isolation was not established.

Impact: Clean installs cannot reliably run tests; compilation is not payment/security assurance.

Expected behaviour / concrete fix: Pin runner/libraries, add documented scripts/CI, justify exclusions and implement negative/invariant tests with isolated DB/sandbox providers.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## Follow-up areas, not independently confirmed bugs

- Validate UI/local cart versus persistent cart hydration/merge across sign-in, devices, variant edits and out-of-stock changes.
- Exercise mobile menus, focus/keyboard navigation, filter URL persistence, no-results, disabled states and slow/failing requests in a browser.
- Back-in-stock signup exists, but delivery is not established (AUD-030).
- Comparison, quotation acceptance and serial tracking are feature gaps, not automatic parity blockers. Secure checkout, compatibility and clear warranty service take precedence.
- The correct legal tax treatment depends on merchant/product circumstances. Arithmetic defects are established independently; fixed 11% compliance was not certified.
