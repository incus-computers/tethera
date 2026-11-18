# Step 8: Biteship shipping and dispatch

**Later extension:** [Step 10 packaged fulfillment](packaged-fulfillment.md) adds measured insured split parcels and supersedes the original whole-order-only restriction below for the new quote/book flow. Its separate migration and staging acceptance are required.

## What changed

Non-demo area search and rate lookup now return provider results or explicit failures. They never turn missing credentials, invalid destinations, empty coverage, timeouts or provider errors into successful sample quotes. Rates carry item quantities, actual weight and dimensions. Instant Gojek/Grab service remains unavailable outside demo until verified coordinate routing is implemented.

Checkout stores the quote origin, selected service and package manifest on the order. Dispatch requires payment, a delivery-ready order, complete saved contact/address details, the saved courier selection, and a confirmed warehouse origin. It uses those package values and dimensions instead of a fixed 2.5 kg parcel or an invented destination. Historical orders without the saved manifest/origin require reconciliation; they are not silently filled with sample data.

A transaction locks the order, checks shipping details have not changed, creates one whole-order fulfillment and its physical line allocations, records an audit entry, and claims one shipping operation before any provider POST. Its opaque SHIP- reference binds provider evidence to that operation. This is local duplicate prevention; it does not assume that Biteship treats reference_id as an idempotency key.

Each order can have one operation. Only its initial claim can POST a booking. Repeated requests retrieve the existing shipment. An ambiguous POST outcome stays pending for review, including a process crash before sending it. Do not delete operations or automatically send another booking. Live manual/split fulfillment creation is blocked until it can share an audited allocation and booking lifecycle; bounded, paid-order split fixtures remain available in demo.

Callbacks require the configured x-biteship-token header, a supported event and the stored provider ID or opaque dispatch reference. Requests are bounded to 50 KB and malformed JSON is rejected. Outside demo the callback triggers an authenticated provider GET; callback status, waybill and price claims are not settlement evidence. Only matching provider ID/reference and recognised status are applied. Missing driver, waybill or tracking details remain empty. Updates, event deduplication, fulfillment progress and carrier-cost observations commit together. Delayed/duplicate events cannot regress terminal or later stages.

Courier charges are recorded separately from the agreed customer bill. Price updates never rewrite the customer's total or shipping fee. A failed/cancelled courier shipment becomes a shipping review, retaining the paid order and inventory state. It does not cancel merchandise or initiate a refund. Generic admin order updates cannot manufacture delivery progress or overwrite courier identifiers.

## Dummy testing, with no courier account required

1. Run `npm run dev:demo` and open the shown localhost address. The demo banner must be visible.
2. Place a delivery order with a complete Indonesian address and select a demo shipping option. Complete the simulated payment as that shopper.
3. Sign in at `/admin` using the demo Super Admin or Fulfilment Operator button. Advance the paid order through warehouse preparation to Ready for Dispatch.
4. Open courier dispatch and choose the same courier/service saved at checkout. Book pickup. The shipment uses a DEMO-prefixed waybill and makes no provider call.
5. Open the order details drawer and use Demo: in transit, Demo: delivered or Demo: failed to simulate progress, arrival or failure. Repeated booking requests retain the same provider identity. Failure retains the paid amount and requires review rather than a replacement shipment.
6. Restart the demo server for a fresh scenario. Memory data is disposable. Scheduling is available as a demo fixture only.

Automated failure/concurrency fixtures: `npm run test:shipping`. These include timeout/no second POST, provider errors, spoofed/malformed callbacks, missing destination, paid readiness, terminal-state protection, quantity allocation, SQL rollback and database role isolation. They use offline HTTP fixtures and disposable PostgreSQL; no connected service is contacted.

## Migration: user reported completion

The user reported applying all six earlier updates through `20261106230000_least_privilege.sql` and then receiving `true` from database readiness. Keep that completed work. Step 8 introduces one additional file:

`supabase/migrations/20261106233000_biteship_dispatch.sql`

Review and apply this file once to the intended dummy/staging database after those earlier updates. It creates private operation/event/cost tables and service-only transaction functions, and extends the permissions/readiness checks. No migration is applied by application startup or tests. The user subsequently reported applying this file and receiving `database_ready = true`. The assistant did not run it independently. The application readiness check now requires its version marker as well as successful schema/permission checks, so the older database correctly remains unavailable until it is updated. Do not rerun the baseline or previously completed migrations blindly.

## Connected Biteship test acceptance

Use a separate staging project, dummy customer details and a Biteship test key. Set APP_ENV=staging, BITESHIP_ENV=test and BITESHIP_API_KEY to the matching test key. Leave BITESHIP_PRODUCTION_ENABLED=false. The API origin is restricted to https://api.biteship.com/v1; redirected requests are rejected. Requests have a ten-second timeout and explicit errors.

Confirm that TETHERA_WAREHOUSE_ORIGIN in `src/lib/shipping/biteship.ts` contains the actual approved origin contact, phone, address and postcode used by this store; quotes and new orders must use that origin. Only then set BITESHIP_ORIGIN_CONFIRMED=true. Changing this confirmation flag does not fix an inaccurate origin or historical snapshots. Live scheduled pickup is blocked pending a verified scheduled booking contract.

Set a random BITESHIP_WEBHOOK_SECRET of at least 32 characters. In the provider dashboard configure the HTTPS callback `/api/webhooks/biteship`, the events order.status, order.waybill_id and order.price, and custom header x-biteship-token with that secret. No dashboard configuration was changed during implementation.

Run the read-only `npm run db:check -- --connected`, verify `/api/health`, then test paid postal dispatch, actual package/rate coverage, duplicate submission, tracking updates and failure recovery. Compare provider account records with local operations, events, costs, fulfillments and unchanged customer totals. Biteship test-key shipment creation does not request a physical pickup, according to its create-order documentation. No actual sandbox acceptance was performed here.

Configure an authenticated scheduler to POST `/api/internal/shipping/reconcile` with `Authorization: Bearer <SHIPPING_JOB_SECRET>` using a separate random secret of at least 32 characters. It checks up to 50 oldest operations per call, retrieves known provider IDs, and never creates shipments. Monitor non-success responses and unknown IDs; no scheduler was installed. Delivered operations can still be checked for late carrier-cost observations; set cadence and retention against provider quotas.

If a POST response was lost, find the existing booking in the provider dashboard using its SHIP- reference. In the admin dispatch dialog enter its Biteship order ID in Recover an existing booking. This sends a GET and verifies the reference before recording anything. An authenticated callback carrying the same reference and ID can also recover it. If no provider ID can be found, leave the operation for operator investigation; the current workflow deliberately has no automatic replacement booking or deletion/reset button.

Production additionally requires matching live credentials, APP_ENV=production, NODE_ENV=production and BITESHIP_PRODUCTION_ENABLED=true. Keep it disabled until staging acceptance is complete. Instant coordinates, split live bookings, replacement/cancellation workflows, insurance selection, fragile/bulky packaging confirmation and carrier-cost dispute handling still require explicit operational acceptance or additional workflows. Sending dimensions is not proof of adequate packaging, coverage or insurance.

## Verification record

2026-11-06: the full offline suite passed 450 tests. The isolated production build passed compilation, type validation and page generation with connected-service values cleared. A localhost demo HTTP check passed delivery checkout, simulated payment, paid warehouse readiness, booking replay, blocked manual delivered status, simulated arrival, unchanged paid totals and callback authentication. The final admin/checkout pages returned HTTP 200. The temporary demo server was stopped after verification. No interactive browser automation or actual Biteship sandbox request was performed. Tests do not certify hosted Supabase roles, actual provider responses, dashboard delivery, physical pickup or production readiness.

## Official references

[Biteship create shipment](https://biteship.com/en/docs/api/orders/create), [retrieve shipment](https://biteship.com/en/docs/api/orders/retrieve), [authentication and key environments](https://biteship.com/en/docs/api/authentication), [webhook events](https://biteship.com/en/docs/api/webhook/overview), and [Biteship custom webhook headers](https://help.biteship.com/hc/en-us/articles/58382023618329-Complete-Guide-to-Understanding-Biteship-Webhooks).
