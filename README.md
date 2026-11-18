# Incus / Tethera storefront

Run an isolated demo with `npm run dev:demo`, or configure Supabase Auth for staging/production.

See [authentication and demo setup](docs/authentication-and-demo.md) for demo accounts, OTP testing, migrations, staff MFA and session configuration.

Run `npm test` for the isolated regression suite and `npm run test:auth` for the authentication boundary tests.

The original audit reports are in [audit-reports](audit-reports/01-executive-summary.md). Implementation notes below track subsequent fixes and their remaining deployment gates.

Step 2 storage details: [database contracts](docs/database-storage.md). **Migration status**: see the [deployment checklist](docs/deployment-checklist.md) before staging/production. Run `npm run test:db` for offline schema/rollback checks.

Trusted checkout: [request contract and verification](docs/trusted-checkout.md). Run `npm run test:checkout` for pricing, retry and transaction checks. Dependency remediation: [security patch notes](docs/dependency-security.md).

Inventory lifecycle: [settlement, cancellation and expiry](docs/inventory-transitions.md). Live expiry scheduling and target-project migration verification remain deployment prerequisites.

Hosted Midtrans: [gateway, sandbox setup and recovery](docs/midtrans-gateway.md). Run `npm run test:payments` for offline provider and transaction checks. Dummy payments remain available with `npm run dev:demo`.

Step 7: [database permissions and RLS](docs/database-permissions.md). Run `npm run test:security` for SQL role isolation and public response privacy checks. The user reported applying this migration to their dummy project; hosted-role acceptance remains unverified.

Step 8: [Biteship shipping, dummy testing and booking recovery](docs/biteship-shipping.md). Run `npm run test:shipping`. The user reported completing the Step 8 migration and receiving database readiness `true`; the earlier six updates remain completed. Real courier activation remains disabled.

Step 9: [refunds, inspected returns and dummy walkthrough](docs/refunds-and-returns.md). Run `npm run test:refunds`. The user reported completing the Step 9 migration and receiving database readiness true; earlier updates remain complete. Provider refund initiation is disabled until sandbox setup/acceptance.

Step 10: [measured packages, insurance and split delivery](docs/packaged-fulfillment.md). Run `npm run test:shipping`. Catalog package editing, server-derived insured options, durable per-parcel allocation/booking and multi-parcel tracking are available in the dummy environment. The user reported completing the Step 10 migration and receiving database readiness true on 2026-11-07. Connected provider/staging acceptance remains unverified.

Step 11: [whole-rupiah pricing, voucher claims and commercial invoices](docs/financial-reconciliation.md). Run `npm run test:financials`. The user reported applying this migration and receiving `database_ready = true`. Dummy checkout and payment simulation remain available; connected checkout requires confirmed tax configuration. The merchant's PKP/tax treatment is still undecided.

Step 11 migration status: the user reported running `20261107070000_financial_reconciliation.sql` and receiving `database_ready = true` on 2026-11-07. This is user-reported verification; the connected project was not independently checked. Do not rerun that migration blindly.

Step 12: [durable jobs, notification delivery and dummy testing](docs/durable-jobs.md). Run `npm run test:jobs`. Notification intents commit with order changes; the queue has worker leases, retries, operator review and a scheduler endpoint. In demo, the worker runs locally and sends no real messages. Live marketplace sync remains disabled by the user's choice. The user reported applying the Step 12 migration and receiving `database_ready = true`.

Step 13: [isolated validation and GitHub Actions](docs/testing-and-ci.md). Run `npm run validate` for regressions, TypeScript, an isolated production build and desktop/mobile dummy browser journeys. Use `npm run validate -- --clean-install` to check the lockfile from a fresh dependency install. CI is prepared locally; no hosted workflow run or branch protection was configured. No Supabase migration is needed for Step 13.

Step 14: [safe media uploads and durable private storage](docs/media-uploads.md). Still JPEG/PNG/WebP uploads are bounded, decoded and re-encoded; dummy uploads remain local. Apply `20261107130000_safe_media_storage.sql` once in the same Supabase project, then check `application_schema_health()` returns true. The user reported applying this migration and receiving `database_ready = true` on 2026-11-08; the connected project was not independently checked. Re-upload any legacy local images through the new endpoint before rollout; old upload URLs are retired.

Step 15: [indexed queries and pagination](docs/query-pagination.md). Connected catalog/order/admin collection filters and counts run in the database, related order data is returned together, and list screens have page controls. Dummy mode remains available. The user reported this migration completed on 2026-11-09 as part of confirming all migrations done. The connected project and hosted performance were not independently checked; do not rerun the migration there.

Step 16: [Indonesian storefront, supplied business contacts and starter policies](docs/localisation-and-policies.md). The storefront stays in English by merchant request (2026-11-10), with the top delivery/language bar removed. Explicit local dates, genuine destinations, policy acknowledgements and customer return requests are available. Incus Computers contact details are configured; opening hours remain unset. Privacy, purchase, warranty/returns and shipping pages remain labelled drafts pending merchant review. Dummy payments and returns remain testable; real checkout requires reviewed policies and the prior activation gates. No new SQL migration is needed for Step 16. The user reported all migrations completed on 2026-11-09.

Step 17: [abuse controls, privacy operations, monitoring and recovery](docs/operations-and-privacy.md). Shared API budgets, bounded bodies, safe diagnostics, nonce CSP, verified customer data requests/account downloads and a restricted staff review queue are implemented locally. Dummy flows send no real messages. The user reported all migrations completed on 2026-11-09, including this update and Step 15. No new readiness result or independent connected check is claimed. Configure independent limiter/monitor secrets before connected use. Hosted monitoring/WAF/TLS, full privacy fulfillment/retention and backup restoration need the [release evidence record](docs/release-evidence.md). This finishes local work for the numbered roadmap, not production acceptance.
