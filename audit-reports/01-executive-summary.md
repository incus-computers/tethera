# E-commerce audit: executive summary

Audit date: 2026-11-06. Repository: `C:/Users/darkl/OneDrive/Desktop/trial`. Instruction source: `ECOMMERCE_AUDIT.md`. Only audit documents were created; no application code, customer data, payment or shipment was modified.

## Readiness decision

**Not ready for real-money production transactions.** Payment routes mark orders paid without contacting Midtrans; administrator identity is forgeable; customer/order ownership is not enforced. These are source-verified defects, not evidence of exploitation or claims about a deployed site. Midtrans creation is simulated. Biteship has real API requests mixed with unguarded simulated success.

The repository has a broad storefront/admin foundation: filters, variants, a PC builder with compatibility checks, prebuilts, cart, promotions, accounts, tracking, RMA and inventory/audit models. Feature presence does not establish transactional correctness.

The deduplicated register contains **34 findings: 7 Critical, 20 High, 7 Medium**. “Verified” means directly established from code or an explicitly named read-only check; it does not mean a live exploit was performed. “Probable” means runtime/deployment conditions remain. “Potential” means controls lack sufficient evidence. All findings remain Open.

## Architecture and trust boundaries

| Layer | Observed | Implication |
|---|---|---|
| Frontend | Next.js 14 App Router, React 18, TypeScript, Tailwind, Zustand; storefront and admin | Browser identity, prices, quotes and state are untrusted |
| Backend | Next route handlers in src/app/api; no separate backend discovered | Each route must enforce identity, ownership, schema and state |
| Database | Supabase server client, service-role key with anon fallback; schema.sql and one migration | Service-role requests need application authorisation; shipped schema lags models |
| Mock/persistent state | BaseRepository maps, process-local CRM credentials/profiles and homepage globals | Accepted data may disappear or diverge across workers |
| Authentication | Static admin identities/unsigned Base64; customer lookup/localStorage; local OTP | No trustworthy shared customer/admin session layer |
| Payments | Generated Midtrans details, SHA-512 signature helper, webhook | Real charge/status creation absent in checkout; public paid mutations |
| Shipping | Biteship maps/rates/orders requests, synthetic fallbacks, public webhook | Quote/booking/local state and real courier assignment can diverge |
| Operations | Notifications, marketplace sync, refunds/RMA, split fulfilment, RBAC/audit helpers | No demonstrated durable outbox/jobs/reconciliation; guard coverage inconsistent |
| Deployment | next dev/build/start scripts and image configuration | Host, live schema, TLS/WAF, backups and provider dashboards unavailable |

## Top ten actions, in order

1. Remove public paid transitions and implement genuine gateway creation/verification (AUD-002).
2. Replace admin authentication, rotate embedded credentials and enforce action permissions (AUD-001, 034).
3. Establish customer sessions/ownership across accounts, invoices, carts, reviews and RMA (AUD-003, 004, 022, 023).
4. Make every component/service/variant/quote and integer-IDR amount server-authoritative (AUD-005, 006).
5. Implement one atomic order-linked stock lifecycle, expiry, settlement and cancellation (AUD-007, 008, 017).
6. Bind payment evidence to expected amounts/attempts; persist webhook processing and reconciliation (AUD-009, 010).
7. Authenticate Biteship events; remove live synthetic success; gate/lock dispatch and recover unknown outcomes (AUD-012–015).
8. Implement confirmed provider refunds and item-level fulfilment/restocking invariants (AUD-016, 018).
9. Fail closed on DB errors, supply complete migrations and patch applicable dependencies (AUD-011, 025, 026).
10. Add reproducible isolated tests, durable side effects and operational/privacy/localisation checks (AUD-021, 027–033).

## Explicit inspection coverage

**Detailed review:** checkout create-order/charge/payment-success and the browser checkout sequence; Midtrans helper/webhook; Biteship client/webhook/dispatch; inventory/order/base repositories and DB client; admin/RBAC/OTP/CRM/customer auth state; account profile/history; cart/wishlist identity resolution; review eligibility/response; RMA/refund and split-fulfilment allocation; invoice sender; uploads and dynamic media server; homepage settings; promotion rules/redemption; tax arithmetic; faceted catalog; guest tracking tokens; notification/marketplace call sites. Schema and sole migration were reviewed for the payment procedure, RLS, fields, tables and indexes. Package/config/test inventory inspected.

**Search/inventory-level review, not exhaustive line review:** other storefront/prebuilt/product/admin components, cart merge paths, category/data layers, CSV implementation, caches, marketing/email templates, marketplace implementation, existing test corpus and documentation. These need targeted dynamic regression.

**Uninspected / Not verified:** live Supabase data/grants/migrations; local secret values; production/staging deployment and dashboards; merchant entitlements; browser/mobile/accessibility rendering; Core Web Vitals; actual email/WhatsApp delivery; end-to-end checkout/refunds/shipping; concurrency/load/failure injection; TLS/WAF/live response headers; monitoring/log retention; backup restoration; full Git secret history. Not every source file was exhaustively audited.

## Checks actually executed

- Initial git status: only untracked ECOMMERCE_AUDIT.md; no tracked changes.
- Repository inventory and targeted source/schema searches.
- `tsc --noEmit --incremental false --pretty false`: exit 0. This checks compilation, not runtime correctness.
- `npm audit --json --ignore-scripts`: exit 1; four vulnerable package groups. No installation/fix performed.
- 34 test files counted; local Vitest binary absent and no declared test runner/script. Suites were not executed.
- Public official integration/privacy documentation and competitor pages browsed read-only, without accounts, purchases, scans or attacks.

No isolated development/staging environment with test accounts and sandbox integrations was established. Accordingly no active vulnerability, payment, shipment, concurrency, load or failure-injection scenario was executed. No DB check/seed script was run. Production build was not run because pre-rendering can contact configured services; compilation was checked separately. npm audit sends dependency metadata to the configured registry. Local secret values were not read or reproduced.

## Deliverables

02 contains severity-ranked security evidence; 03 functional defects and expected/actual behaviour; 04 official integration comparison and recovery; 05 sourced competitive matrix; 06 ordered implementation roadmap; 07 tests and release gates; findings.json is the canonical machine-readable register.

Source references use file paths and function/branch names where exact line numbers are not needed. Cross-listed risks retain one ID. Feature gaps and unmeasured risks are explicitly distinguished from verified defects.
