# Trusted checkout and duplicate-request protection

Implemented locally on 2026-11-06 for AUD-005, AUD-006 and the checkout portion of AUD-007. Connected migrations remain deferred; this is not a production release or closure of the inventory/payment findings.

## Focused checkout layout

`/checkout` and `/checkout/payment` (including nested payment routes) hide the storefront header/category navigation, catalogue footer and floating contact widget. Checkout retains its compact logo, return control, contact/delivery/payment fields and policy acknowledgement; the payment-status page retains verification and order/checkout links. Normal navigation returns on the receipt and shopping pages. The desktop order summary now sticks 24px from the top, without the removed header's 140px/190px offsets. Cart/session initialization and the global location dialog remain available.

TypeScript and four desktop/mobile browser checks passed (`validation-results/2026-11-17T11-23-19-811Z-focused-payment`). These include the complete dummy variant-cart/verified-quote/payment/invoice flow, payment-status rechecks, hidden navigation and restored storefront navigation. The refreshed dummy preview also passed route/layout checks (`validation-results/focused-payment-layout-checks.json`). This layout change does not alter payment verification or transaction logic.

## Request contract

1. GET /api/checkout/session establishes an HttpOnly guest cookie before checkout. Verified customers use their server session. An uninitialized guest submit returns 409 and a cookie without creating an order; this avoids concurrent first requests creating separate guest owners.
2. POST /api/checkout/quote accepts product/variant IDs and quantities, build part IDs and service tier IDs, customer contact, fulfillment, postal address, courier/service selection and optional promotion. The server ignores browser prices, names, totals, discounts, package data and courier prices.
3. POST /api/checkout/create-order requires a UUID v4 Idempotency-Key and expectedTotal matching a fresh server calculation. A changed total returns 409 with the quote before writes. The browser asks the customer to accept a changed verified total before submitting.
4. Reuse the same key and payload after a timeout, lost response or payment initiation failure. The browser persists the attempt in sessionStorage before submission and blocks simultaneous local submits. Creating an order does not mark it paid. Live payment initiation remains disabled pending its dedicated workstream.

The stored key is scoped to the verified owner. Same key and normalized payload returns the original order, items, totals and tracking capability; different contents returns 409. Replays do not reprice or reserve again. Another owner cannot retrieve that result with the key. Different keys represent separate purchase intents. Keep durable request records; deleting an order/request or clearing the cookie after an unknown outcome defeats automatic recovery. After the guest tracking capability expires, owner-authorized tracking can issue a fresh one independently.

Requests are limited to 200,000 UTF-8 bytes while reading. The basket allows at most 100 physical selections, 10 builds and integer quantities 1–100 per combined product/variant. Non-finite, fractional, negative, null or string quantities are rejected. Amounts are whole IDR within the persisted numeric range; fractional catalog prices must be corrected rather than silently rounded.

## Price and fulfillment authority

Products must exist and be active. Variant selections must belong to the product and use canonical product_variants prices and stock. Products with active variants require an explicit selection. Existing variation tile IDs are resolved to their canonical parent plus variation ID; arbitrary unknown products cannot supply a price.

Custom builds store physical component lines, grouping metadata and a separate service line rather than an unpersisted browser custom_build_id. Prices come from products/variants and the server SERVICE_TIERS configuration. Assembly is charged once. Required core components, slot compatibility, CPU socket, memory type, GPU clearance and PSU capacity are checked. This does not claim exhaustive physical/electrical compatibility; broader builder rules remain later work.

Prebuilt carts now carry catalogProductId and use a stocked catalog product. Demo products/inventory include the sample prebuilts. Before live use, provision those products and all canonical variant rows through reviewed catalog data. JSON variation display metadata is not a substitute for canonical variant pricing/stock. Previously saved prebuilts without a catalog ID must be removed and re-added. Do not enable live checkout until catalog/variant administration synchronizes those records.

Live delivery requires trusted product specs.shipping metadata: weight_grams plus dimensions_cm with length, width, height. Assembled builds require specs.assembled_shipping on their case, covering the complete packaged system. Configure these from actual package measurements; incomplete metadata blocks delivery. Demo mode alone uses explicit package fixtures. Click-and-collect does not require shipping metadata.

Checkout requests fresh Biteship rates using those packages and the saved postal destination. It selects only an available matching courier/service. Missing credentials, malformed prices and provider failure cannot become simulated checkout rates outside demo. Stale browser area IDs/coordinates are ignored; postal routing is saved consistently. Coordinate/area validation, on-demand courier coverage and actual booking remain part of the later shipping workstream. The existing general shipping-estimate/booking endpoints have not all been hardened by this checkout change.

Promotion eligibility receives trusted product/category metadata. Fixed discounts are bounded by eligible merchandise, free shipping by shipping, and discount snapshots stay on eligible lines. Redemption/caps commit once with the order. Integer discount allocation preserves exact totals; order tax includes discounted merchandise, assembly and shipping and agrees with line plus shipping snapshots. The existing configured tax rate is retained; this implementation is not a new tax-policy determination. Success-page and downloadable invoice totals consume the verified snapshots when present. Other historical invoice/notification paths require their own audit follow-up.

## Transaction and remaining inventory work

20261106150000_trusted_checkout.sql adds checkout_requests, financial/grouping snapshots and service-role-only commit_checkout. PostgreSQL locks an owner/key, rejects catalog/variant drift, inserts the order/items, conditionally reserves every combined stock line, inserts order-linked holds, applies promotion usage and saves the replay result in one transaction. Any later failure raises and rolls back all earlier writes. Fixed lock order and conditional stock updates protect checkout contention; indexes/grants/readiness are included.

Demo uses a shared process queue and restores its isolated table snapshots on failed checkout. It does not provide cross-process durability. Demo payment consumption understands the new product/variant holds so simulations remain usable.

**Next workstream:** atomically consume or release these holds during verified payment/cancellation, implement scheduled expiry/reconciliation and prevent repeated or reordered settlement/restock. expires_at records a 15-minute hold deadline; this step does not yet run an expiry worker. The older live payment procedure must be replaced before activation. Financial settlement, refunds, notifications and shipment booking are not made production-ready by checkout idempotency.

## Verification

- npm run test:checkout covers tampering, invalid quantities, catalog/variant rejection, core build checks, prebuilt and delivery pricing, owner-scoped concurrent retries, lost-response recovery, stock failures, promotion eligibility/caps, private grants and PostgreSQL rollback.
- Migration tests apply the exact baseline and all migrations to disposable PGlite. This proves PostgreSQL statement/rollback behaviour, not hosted multi-connection contention or deployed Supabase configuration.
- Final local verification: 371 isolated tests passed; TypeScript and production compilation passed (37 static pages). Local HTTP checks cover concurrent duplicate submits, payload conflict, tracking, base/variant simulated payments, prebuilt/delivery quotes and rendered checkout/catalog pages. These are HTTP checks, not a complete interactive browser/mobile acceptance run.
- Production compilation blanks configured service values. No connected database migration, live payment, shipment or notification is performed.

Before staging, follow [deployment-checklist.md](deployment-checklist.md). Run npm run dev:demo for dummy transactions and npm run test:checkout for offline checks.

Subsequent gateway implementation: see [midtrans-gateway.md](midtrans-gateway.md) for hosted payment initiation and verification. Earlier references to disabled live initiation describe the checkout-only milestone; actual provider acceptance and production activation remain pending.

Step 11 supersedes the earlier tax/invoice and redemption notes: see [financial reconciliation](financial-reconciliation.md). New checkout snapshots freeze the selected commercial policy and all line/fee/discount/tax amounts. Invoice email/download/account/staff summaries consume that snapshot without applying current tax settings. Voucher claims reserve capacity at checkout, consume on settlement and release on unpaid cancellation/expiry. Earlier milestone limitations above remain historical context.
