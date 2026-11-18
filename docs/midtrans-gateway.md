# Hosted Midtrans payments and recovery

Implemented locally on 2026-11-06 for AUD-002, AUD-009 and AUD-010. Connected migrations, provider dashboard settings, real sandbox transactions and production activation remain deferred. The original audit remains historical evidence.

## Implemented flow

- The owner-authorized charge endpoint retains dummy payment simulation in explicit demo mode. Otherwise it creates a hosted Snap payment using the server order amount and contact details. No card number/CVV is sent through application checkout; non-demo customers select their method on Midtrans.
- Before a provider request, a database transaction creates one immutable attempt/provider reference per order. Concurrent or subsequent requests cannot claim another creation. A short Snap expiry fits inside the remaining stock hold, with a safety margin. Orders with less than two minutes of reservation remaining cannot start an attempt.
- A successful creation stores the hosted redirect. Browser redirects use only the selected Midtrans HTTPS origin. The finish URL returns to `/checkout/payment?orderId=...`; that page verifies through the owner-authorized status endpoint, not the browser query string or a success flag. It clears the matching purchased cart only after verified settlement, retaining a cart changed since checkout.
- Webhooks require an exact SHA-512 signature over the original order ID, status code and amount string. A valid notification is only a trigger: the server retrieves transaction status independently with its server key. Order reference, amount, currency, configured merchant, transaction binding and payment/fraud state must match the saved attempt. Missing evidence fails closed.
- Verified evidence, inventory settlement/release, event deduplication and a notification/review outbox intent commit together. Duplicate pending/expiry events cannot undo settled payment. Late captured money after stock release becomes `review`, without consuming unavailable inventory. Refund/partial-refund evidence becomes review; refunds and physical returns are still their dedicated later workstream.
- `payment_attempts`, `payment_events` and `payment_outbox` are private SQL tables, and mutation functions are service-role-only. Customer APIs expose only their own payment state or hosted redirect, not raw provider payloads or keys. Payment initiation/status checks have database-backed rate limits.

## Sandbox setup, when connected work resumes

First apply the deferred migrations through `20261106210000_midtrans_attempts.sql` after backup and review. Follow [deployment-checklist.md](deployment-checklist.md); no migration was applied here.

Configure `APP_ENV=staging`, `MIDTRANS_ENV=sandbox`, the sandbox `MIDTRANS_SERVER_KEY` (SB-Mid-server prefix), `MIDTRANS_MERCHANT_ID` and the store's HTTPS `APP_ORIGIN`. Merchant IDs and currency fields in real provider status responses must pass strict fixture-equivalent validation before activation. Configure the Midtrans notification URL as `https://<store>/api/webhooks/midtrans`. The Snap request supplies its HTTPS finish callback. No client key or browser SDK is needed for hosted redirects.

Use merchant-enabled payment methods and actual sandbox test accounts to validate pending, settlement, accepted/challenged/denied captures, cancellation, expiry, timeout, provider success plus local database failure, signed duplicate/reordered notifications and missed-notification reconciliation. Check merchant entitlements, return cookies and the hosted flow on desktop/mobile. Local tests do not establish those provider/dashboard facts.

Production is blocked unless all of these are explicitly configured: `APP_ENV=production`, a production Node process, `MIDTRANS_ENV=production`, matching production key and merchant, and `MIDTRANS_PRODUCTION_ENABLED=true`. A production storefront rejects sandbox credentials/environment. This task did not enable that flag or alter secret values. Do not enable it until remaining shipping, RLS, refund and operational release gates are complete.

## Unknown outcomes and scheduled recovery

A timeout after creation never results in a blind second POST. Retries query the original provider reference. If a redirect was saved, pending customers can resume it. A captured payment can still reconcile and settle after a lost creation response. If status is 404 and no redirect was persisted, the attempt remains unresolved: do not delete/reissue the attempt automatically. This conservative rule also covers a worker crash after claiming but before sending the request. An operator must inspect the merchant dashboard/status and deliberately resolve/cancel the attempt. Automatic creation leases or replacement attempts are not implemented.

Configure an independent random `PAYMENT_JOB_SECRET` (32+ characters) and schedule POST `/api/internal/payments/reconcile` every minute with `Authorization: Bearer <secret>`. It checks up to 50 oldest creating/pending/review attempts, rotates checkpoints, and reports failures or unresolved 404s with a non-2xx response. Monitor backlog age, review rows, job failures and payment/provider discrepancies. Inventory expiry scheduling remains required as described in [inventory-transitions.md](inventory-transitions.md). No connected scheduler was enabled here.

Payment outbox rows persist settlement and manual-review intents exactly once. **An outbox delivery/notification worker is not implemented by this step.** Monitor these rows and implement delivery/retry/operator handling before promising live receipts, pickup messages or automated review handling. Demo charge notifications retain their existing isolated simulation. Review and refund rows require operator action; the scheduled checker does not issue money refunds or fabricate stock.

## Verification

Final local verification: 406 tests passed; TypeScript passed; production compilation generated 42 static pages. Offline provider fixtures test sandbox creation, strict signatures/evidence, redirect validation, independent webhook status verification and unknown-outcome retry safety. Disposable PostgreSQL tests apply the exact migration chain and verify attempt uniqueness, transaction rollback/recovery, duplicate/reordered events, late-payment review, capture challenge and private grants. The full suite and production compilation are run separately. Demo HTTP checks cover checkout, pending/settled status, foreign-owner denial, payment simulation and the return page.

No actual sandbox/production gateway request, connected migration, shipment, provider notification or dashboard change was performed. Hosted browser acceptance and deployed multi-worker/provider recovery remain staging release checks.

Sources: [Midtrans Snap integration and hosted endpoints](https://docs.midtrans.com/docs/snap-snap-integration-guide), [transaction status retrieval](https://docs.midtrans.com/reference/get-transaction-status), [notification verification and retries](https://docs.midtrans.com/docs/https-notification-webhooks).
