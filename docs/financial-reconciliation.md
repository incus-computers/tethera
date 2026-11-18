# Step 11: financial reconciliation (AUD-027 / AUD-028)

New checkouts store one immutable versioned IDR financial snapshot. Merchandise, assembly and shipping are separate amounts; assembly is charged once. The total is merchandise + assembly + shipping - discount. Every monetary amount is a non-negative whole rupiah, bounded to 9,999,999,999; quantities are positive integers up to 100. Discounts use deterministic largest-remainder allocation, with input order breaking equal remainders. Product/category restrictions retain their canonical metadata for custom builds and variants. Service fees do not qualify for merchandise vouchers.

Included tax is split independently for each discounted line and shipping: net = round-half-up(gross * 10000 / (10000 + effective basis points)); tax = gross - net. Header net/tax are sums of these saved amounts. Rounding the grand total again can differ by rupiah and is deliberately avoided. An explicit zero rate is supported. The legacy database name `dpp_amount` contains commercial net before included tax, not a representation of any statutory alternative DPP basis.

Buy X Get Y aggregates qualifying quantities across duplicate SKU lines, discounts only the available get units and selects cheapest get units first. Same-SKU Buy X Get Y requires X + 1 units per group. An explicit zero percent or zero maximum discount stays zero. Product/category restrictions and cap/date checks remain in effect. An empty/NULL global cap means uncapped; zero means no uses allowed.

## Voucher lifecycle

New checkout commits reserve a private `promotion_claims` row in the same transaction as order/items/stock holds. Owner/key retries reuse the saved result and create no additional claim. Global and per-customer limits count reserved plus consumed claims. A per-customer voucher requires a signed-in verified account; changing a guest email does not bypass that rule. Capacity locks use the same promotion-before-stock order as checkout.

Settlement consumes the claim once and adds its discount to `total_discount_given`. Unpaid cancellation, expiry, or a settlement after expired holds releases the claim and decrements `usage_count` once. Refunds retain consumed claims; refunding an order does not automatically grant another voucher redemption. `usage_count` represents reserved plus consumed new claims, alongside existing historical counters. `total_discount_given` represents paid new claims plus the historical total. The inventory expiry scheduler must run and be monitored for abandoned claims to release capacity.

No legacy usage, order state or tax facts are invented. Older orders without claims continue to count conservatively for customer limits, including old cancelled orders. Historical counters require manual reconciliation before a live voucher campaign. Direct staff counter edits are rejected. Promotions with order/claim history cannot be deleted or renamed through the admin API; deactivate them and create a separate campaign when needed.

## Commercial invoices and displays

Checkout's **Review current total** requests a fresh server quote, including the selected voucher and complete custom-build eligibility. Editing the basket/contact/destination/courier/voucher invalidates that displayed quote. Payment rechecks the current total before committing. Estimates are labelled as such; tax is shown only with a verified quote.

Invoice downloads at checkout success and Transactions fetch `/api/orders/invoice` under the owning customer/guest session, rather than trusting browser storage or submitted totals. Email recipients and financial fields are loaded from that owned order. Tracking-only tokens do not grant invoice access. Printable files and invoice emails share one HTML template and escape customer/product strings. Checkout success, account order details and staff order summaries use the same saved amounts; no fixed rate is reapplied after sale. New financial headers/lines cannot be edited to alter the original bill. Refund and parcel ledgers remain separate.

The success page loads the actual order and reports whether payment was recorded; visiting a URL cannot fabricate a paid purchase. Historical orders without a snapshot retain their recorded totals and explicitly state that the historical tax breakdown is unavailable. No invented NPWP, legal company identity, mandatory tax-invoice status or delivered-email promise is printed. These are commercial order records; official tax invoice issuance is a separate merchant/tax workflow.

## Tax configuration: decision pending

The user has not confirmed whether the business is PKP. Leave connected checkout tax configuration unconfirmed until the merchant/adviser establishes the applicable treatment. No merchant tax determination has been made by this implementation. A single configured effective rate is a commercial model; mixed tax classes, exempt goods, statutory alternative bases, tax invoice numbering and Coretax/e-Faktur reporting require a separately reviewed workflow before live use.

Official background: [DJP explanation of PMK 131/2024](https://pajak.go.id/node/113453), [DJP tax invoice regulations](https://www.pajak.go.id/id/peraturan/faktur-pajak). The statutory rate and effective burden need not be identical. The demo 11% is an arithmetic fixture, not approval for this merchant's live treatment.

For connected staging/live checkout the server requires all of:

- `TAX_POLICY_CONFIRMED=true` only after that review.
- `TAX_POLICY_ID` identifying the approved policy/version (1-80 letters, digits, underscores, dots or hyphens; first character alphanumeric or underscore).
- `TAX_COLLECTION_MODE=inclusive` or `not_collected`.
- `TAX_EFFECTIVE_RATE_BPS` as integer basis points, from 0 to 10000. `not_collected` requires 0.

Unconfirmed/invalid setup fails checkout quoting with 503, before order/payment writes. Previously committed checkout retries and invoice downloads retain their saved policy. `.env.local` and external project/provider configuration were not changed.

## Migration: user-reported completion

The user reported the earlier Step 10 migration completed and `database_ready = true`. The user subsequently reported running the following file and receiving `database_ready = true` on 2026-11-07:

`supabase/migrations/20261107070000_financial_reconciliation.sql`

It adds the snapshot column/private claim table, replaces public wrappers for checkout and stock/payment transitions, protects financial/counter updates and extends security/readiness checks. Compatibility functions remain private. It does not delete dummy data, backfill financial facts, call providers or apply itself automatically. It runs in a transaction and should be applied once, after the earlier migrations. Local disposable PostgreSQL tests apply the entire chain; these do not independently verify the hosted project.

The following describes the completed manual walkthrough. Do not rerun this migration blindly. The next pending file is the Step 12 migration in [durable jobs](durable-jobs.md). Verification queries are:

```sql
select public.application_schema_health() as database_ready;
select public.application_security_audit() as security_audit;
```

Expected: `database_ready = true`; security audit has `ok: true`, `violations: []`. Do not rerun older completed files or this migration blindly after an ambiguous SQL result. Inspect `public.application_schema_versions` first.

## Dummy walkthrough

1. Run `npm run dev:demo`. This explicitly uses isolated in-memory fixtures even when local connected credentials exist. No database migration is required for this mode. Restarting resets dummy data.
2. Add components or a custom PC with assembly. Fill in customer details; select collection or load a demo delivery quote.
3. Choose **Review current total**. Verify merchandise + assembly + shipping - discount = order total; before-tax amount + included tax = order total.
4. In the demo admin Promotions panel create a fixed, percentage, category/product, shipping, or Buy X Get Y voucher. Apply it at checkout and review again. Custom PC parts keep their eligible SKU/category information; assembly remains separate.
5. Complete a simulated payment. Open the success page, download/print the invoice and request the demo email. Amounts should agree with Transactions, account and admin order details. Demo email is simulated; no email or real payment is sent.
6. Start another unpaid checkout with a capped voucher and cancel it in admin, or exercise expiry via the configured local inventory job. The unused claim becomes released; paid claims stay consumed. Expiry requires a running worker or an explicit test invocation, not just a timestamp.
7. To test a zero-rate fixture, stop the demo server, set `$env:DEMO_TAX_EFFECTIVE_RATE_BPS="0"` in PowerShell and restart `npm run dev:demo`. Use `"1200"` for a 12% arithmetic fixture. Remove the variable afterwards with `Remove-Item Env:DEMO_TAX_EFFECTIVE_RATE_BPS`. Changing the current policy does not rewrite invoices already saved in that running environment.

Run `npm run test:financials` for exact rounding, restrictions, zero rates/caps, duplicate SKU rules, transactional rollback, claim lifecycle, immutable snapshots, invoice ownership and shared email/download rendering. The full regression suite, typecheck and credential-free production build must also pass. Offline PostgreSQL/provider fixtures do not prove hosted multi-connection concurrency, real tax compliance, sandbox acceptance or email delivery. Existing deployment gates and later audit steps remain open.

## Local verification (2026-11-07)

All 537 regression tests passed. TypeScript validation and the credential-free production build passed (46 static pages). HTTP checks on the temporary isolated demo server exercised a custom PC with one assembly fee, a restricted 101-rupiah voucher, conserved tax/totals, owner-only saved invoices, idempotent order retries, capped checkout reservation, unpaid cancellation/reuse, repeated simulated payment with one redemption and simulated invoice email. Checkout, success, Transactions, account and admin page HTTP responses passed. These were HTTP and automated arithmetic/rendering checks, not a full interactive browser/device acceptance test. The temporary server was stopped. No hosted SQL migration, real payment, courier booking or external email was performed.

Step 11 migration status: the user reported running `20261107070000_financial_reconciliation.sql` and receiving `database_ready = true` on 2026-11-07. This is user-reported verification; the connected project was not independently checked. Do not rerun that migration blindly.
