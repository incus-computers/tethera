# Testing strategy and execution record

## What was actually executed

| Check | Result | Limits |
|---|---|---|
| Repository/config/source/schema inspection | Completed targeted read-only review | Explicit inspected/uninspected list in report 01 |
| TypeScript: tsc --noEmit --incremental false --pretty false | Exit 0 | Compilation only; no assertions, browser or integration execution |
| npm audit --json --ignore-scripts | Exit 1; 4 vulnerable package groups | Registry findings, not exploit confirmation; no dependency changes |
| Existing tests/tooling | 34 test files; Vitest binary absent; no declared runner/test script | Suites not run, no packages installed |
| Public integration/privacy/competitor research | Completed with sources/limits in reports 02/04/05 | No accounts, payment, shipment, scanning or competitor attack |

No application endpoint, live database script, payment/refund, shipment, notification, active exploit, concurrency or failure-injection test was performed. No authorised isolated runtime with sandbox credentials/test accounts was established. The following are recommended tests, **not passes**.

## Establish a controlled test environment

Use a disposable local/staging Postgres/Supabase instance with fixture-only customers/admin roles/products/orders. Explicitly configure Midtrans and Biteship sandbox modes/keys and test-only email/WhatsApp sinks. Remove live credentials from the process, block unexpected outbound destinations and point marketplace sync at a stub. Never assume that NODE_ENV=test alone prevents external effects.

Pin the test runner/libraries and scripts after implementation is approved; current package.json cannot reproduce the suite. Inspect tests' imports/mocks before execution: some route tests can call database/notification layers if environment values are loaded. Supplied mock repository behaviour cannot validate actual Postgres transactions, RLS or schema completeness.

Use stable clocks, deterministic fixture IDs, recorded provider fixtures without sensitive data, and isolated test schemas per worker. Log only synthetic identifiers. Retain assertions/event histories as evidence.

## High-value unit tests

| Area | Assertions |
|---|---|
| Monetary engine | Known SKU/variant/service prices override browser values; unknown/inactive/mismatched SKU rejected; integer finite IDR; no NaN/Infinity/negative/fractional amounts |
| Build pricing | BOM and assembly counted once; repeated components aggregate quantity; compatibility enforced server-side; missing/forged total rejected |
| Promotions | Eligibility uses trusted product/category data; fixed discount limited to eligible subtotal; same preview/checkout result; expiry/minimum/caps/free shipping/BOGO boundaries |
| Tax/snapshots | Line allocations reconcile to order totals across discount/shipping/assembly and rounding; immutable snapshot unaffected by later catalog edit |
| State machine | Allowed current-to-next transitions only; paid cannot regress to pending; shipment cancellation does not erase captured payment; terminal/refund handling explicit |
| Signature/identity | Wrong/missing secret rejected; exact notification amount and order/merchant/currency/attempt checked; malformed tokens/expired sessions rejected |
| Destination/packages | Validated Indonesian area/postcode/coordinates; actual/volumetric packed weight, quantities and high-value/fragile rules; no fabricated area/rate |
| Media/limits | Reject active/disallowed content, MIME mismatch, oversized bytes/pixels; normal image path works; bounded batch/body/quantity sizes |

## API and security tests

Build a matrix for anonymous, guest capability, customer A/B, catalog, fulfilment, support and superadmin principals. Check every method on every sensitive route, including legacy aliases, merge endpoints, upload, homepage settings, invoice, reviews and RMA.

For a synthetic customer B/order, customer A and anonymous requests must get 401/403 or non-enumerating 404 without side effects or private fields. Query/body customer IDs, emails and simulated bearer strings must not override the session principal. Cart item update/delete and merges must remain scoped to owned carts. Logout/revocation and expiry must invalidate server access.

Test absent/forged/expired admin tokens, literal demo values and unsigned Base64 identities. Verify catalog users cannot read CRM/refunds or dispatch; support permissions match explicit policy; mutations include trusted actor audit records. Old routes must enforce the same rules as new routes.

Public review DTOs must exclude email, customer/order IDs and admin notes; verified-purchase eligibility requires actual ownership. RMA lookups require ownership, not merely predictable order/RMA numbers. Invoice resends may not choose an arbitrary destination. OTP cannot return/log the code, resend cannot reset distributed abuse limits, and verification proof is single-use and action-bound.

Test CSRF/Origin handling for cookie writes, CORS from unapproved origins, response headers, sanitised errors, upload isolation and request throttles with bounded development-only tests. Do not infer safety from UI-hidden actions.

## Database and transaction integration tests

Run against the actual supplied-plus-approved migrations, not in-memory fallback:

1. Bootstrap an empty database; compare expected table/column/index/RLS/function catalog with repository models.
2. Test anonymous/authenticated/service-role grants independently, including payment RPC execution and cross-owner RLS reads/writes.
3. Inject header/item insert failure: no partial order or stock hold persists and no success is returned.
4. Reserve multiple products with a later insufficient-stock line: all earlier changes roll back.
5. Consume/release/expire reservations by order/variant/store and check ledger sums, on-hand and reserved invariants.
6. A paid transition replay returns prior success without additional stock/ledger/payment changes.
7. Cancel before payment, after payment, after partial shipment, and a build order; stock movement matches actual prior state once.
8. Refund cumulative amount cannot exceed captured balance; financial refund and physical restock use independent item/attempt records.
9. Fulfilment allocations reject foreign lines, excess quantities and duplicate active allocations; completion is per SKU, excluding cancelled allocation.
10. DB outage/permission/schema errors never return mock success or unfiltered sample rows in production mode.

## Required concurrency/retry scenarios

| Scenario | Setup | Pass criterion |
|---|---|---|
| Duplicate checkout | Concurrent/sequential same idempotency key and payload | One order/header/item set, reservation set and payment attempt; identical result |
| Reused key with different payload | Same key, different quantity/destination | Conflict; original order unaffected |
| Last unit | Two isolated buyers, stock=1 | One successful hold; no oversell, nonnegative availability |
| Replayed settlement | Parallel events across workers and after restart | One payment/stock transition and one durable notification intent |
| Mid-loop stock failure | Two product lines; later one insufficient | No earlier-line committed change |
| Payment confirmed + local failure | Provider paid, DB unavailable/commit failure | Recoverable retry/exception; no lost payment or duplicate deduction |
| Paid then delayed pending | Valid settlement then older pending/challenge | Paid remains confirmed; event recorded appropriately |
| Cancel/settlement race | Both events arrive together | One valid resulting state with money/stock reconciled |
| Expiry/new attempt race | Old attempt expires while later attempt settles | Attempt association prevents cancelling the new successful payment |
| Partial refunds repeated | Different/same request keys against captured balance | Same attempt idempotent; cumulative refunds bounded |
| Dispatch double click | Two requests for same eligible allocation | One active booking/operation; no duplicated courier costs |
| Remote success + local failure | Biteship creates but response/update lost | Reconcile existing booking; retry does not create a second shipment |
| Repeated restock | Same returned item/refund submitted repeatedly | Restock exactly once per inspected physical quantity |

These checks need database assertions before/after, provider request counts and restart/multiworker coverage. A single-process Set or mocked serial test does not establish concurrency correctness.

## Midtrans sandbox integration

Exercise enabled merchant channels only: QRIS/VA/e-wallet/card/etc. UI listing does not demonstrate entitlement. Verify real transaction creation uses authoritative amount and unique persisted attempt ID; pending creation never marks paid.

Test invalid/missing signatures, wrong amount/order/merchant/currency/attempt, genuine settlement/capture accept, challenge/deny/cancel/expire, duplicate/reordered events and missing-notification reconciliation. Test timeout where the provider created the payment; retrieve status before retry. Test refund/partial-refund confirmation and failure.

Verify production key/URL configuration fails closed on missing or sandbox credentials. Browser success/redirect tampering must have no paid effect. Record provider sandbox evidence and local payment/event ledger, with secrets/customer details redacted.

## Biteship sandbox integration

Use supported test areas and couriers; inspect actual rates with accurate packed multi-item weights/dimensions. Test invalid IDs, unsupported destination/service, stale quote, mixed instant/regular requirements, bulky builds and insurance policy.

Simulate timeout, quota/401/4xx/5xx, non-JSON response and remote success with lost response. No case may produce a synthetic successful booking. Confirm selected destination coordinates/area survive checkout through booking and package data matches the quote.

Test configured authentication headers with missing/incorrect values, duplicate/out-of-order statuses, waybill changes, cost adjustments, cancelled/rejected booking and unmatched references. Events update correct shipment allocations; carrier costs do not rewrite customer paid totals. Verify cancellation against the supported current provider API in sandbox.

## Browser E2E and localisation

On desktop and narrow mobile viewports: search/filter/category/no-result, product/variant availability and discounts, add/update/remove cart, sign-in/merge/logout, custom build compatibility, prebuilts, accurate Indonesian address/phone inputs, quote refresh, promotion errors, pickup/delivery, pending payment/resume/retry, paid history, guest tracking, RMA and invoice resend.

Check keyboard/focus, screen-reader labels, modal traps, validation, error recovery, disabled double-submit controls and layout overflow. Confirm Bahasa Indonesia and IDR formatting, verified contact channels, timezone presentation, warranty/returns/privacy policy access. Browser disabling of a button must not substitute for server idempotency.

Run admin role-specific product/variant/inventory/order/refund/dispatch/homepage/CSV journeys with test data; verify cache invalidation and audit before/after state. Verify invoice snapshot accuracy after catalog price/title changes.

## Performance, resilience and operations

Measure mobile LCP/INP/CLS and image/bundle budgets on representative pages; no target score was measured in this audit. Profile indexed catalog/history/shipment queries above the normal API result cap; validate complete pagination, stable ordering and bounded page sizes. Use small controlled loads first, then explicitly approved larger staging workloads.

Restart workers during outbox delivery and webhook processing; prove retries/dead-letter/operator repair. Exercise scheduled hold expiry, missed payment/shipment reconciliation and back-in-stock alerts. Check credential rotation, error-rate/unknown-payment/stock-drift/queue alerts, backup restoration and incident/data-rights procedures. Never perform production failure injection.

## Regression and closure

Prioritise negative payment/auth/stock assertions over tests that merely repeat implementation behaviour. Link each regression to AUD IDs and retain actual command/environment/results. Test migrations from a clean database and an existing fixture snapshot. Close a finding only when the intended invariant passes in the relevant layer and the residual deployment limits are documented.
