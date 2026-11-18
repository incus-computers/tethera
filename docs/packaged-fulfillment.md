# Step 10: Accurate packages, insurance and split fulfillment

## What changed

Shipping now has separate packed profiles for products, canonical variants and assembled PCs. Each profile contains whole grams, all three packed dimensions in whole centimetres and handling requirements. A variant uses its own profile; inheriting the product profile requires an explicit variants_share_package approval. Assembled PCs require a separate fragile profile; selected case variants require explicit approval that the assembled profile covers them. Missing real profiles fail delivery checkout instead of borrowing sample measurements. Demo mode retains explicitly simulated package fixtures.

Catalog staff can edit Packed shipping measurements in the product editor. The dedicated server endpoint validates and saves profiles under a product lock, preserves other specifications and records an audit entry. General product edits preserve those profile fields, including stale form submissions. Canonical variants must exist in product_variants; JSON display variations alone do not establish a purchasable or physically measured variant.

The new /api/checkout/shipping-rates endpoint resolves SKU/variant/build data on the server. The browser supplies selections and destination, not authoritative weight, price or insurance value. Delivery checkout can load current insured options for its actual saved postal destination. Outside demo, seeded standard/express choices are unavailable until provider options are retrieved. Address/basket changes invalidate them; checkout rechecks the chosen rate and accepted total before committing. Missing email/recipient phone is no longer replaced with a fabricated contact in the checkout request.

Full declared goods value is requested as courier_insurance for new quotes and bookings. Service availability requires provider insurance support and an explicit insurance fee. The provider's combined price is used once; insurance is not added again. Declared goods value comes from physical merchandise unit-price snapshots, before order-level promotions, and excludes the assembly service line. Carrier coverage, documentation requirements and settlement of an insurance claim still require operational acceptance; requesting insurance is not proof that a claim will be paid.

## Measured parcel booking

Open a paid delivery-ready order's details drawer and expand Measured parcels and split delivery. Choose exactly the physical quantities in that box, enter its measured packed weight/dimensions, confirm secured fragile contents, select a postal courier/service and retrieve an insured quote. Booking rechecks that quote and the operator's accepted carrier price. It uses the order's saved recipient, destination and warehouse origin. Shipment expenses never rewrite the customer's agreed bill; splitting can increase the store's carrier expense, which the operator explicitly accepts.

Each parcel has one durable operation, fulfillment and set of allocations. A transaction locks the order, verifies unchanged address/line snapshots, paid state, settled inventory coverage and remaining quantities, then saves all three before any provider POST. Concurrent requests cannot over-allocate a line. Different parcels may use different supported couriers. Components belonging to an assembled build must be allocated together in their full ordered quantities; virtual assembly service rows do not consume physical allocations.

A UUID v4 Idempotency-Key identifies each parcel request. Its original item quantities, measured profile, selected service and accepted carrier price are immutable. Replays use the existing operation, and only its first claim can create a provider booking. The admin retains its request draft/key before sending and across reloads. Once an operation is visible, its Check this parcel action recovers it through the provider ID, including an ID copied from the dashboard after a lost response. Worker/callback recovery is also per operation, not per order. No automatic replacement or allocation release follows failure, cancellation or an unknown outcome.

Whole-order bookings remain available using the saved quote manifest and a packing confirmation, but cannot be mixed with split parcel allocations. Pre-existing whole-order/manual fulfillments require reconciliation rather than being silently converted. Historical operations should use reconciliation rather than a newly shaped booking request. Direct service inserts/updates/deletes on fulfillment headers and lines are revoked; non-demo allocation writes go through the transaction functions. The legacy manual-waybill API remains an explicitly demo-only fixture with owned-line and quantity bounds; live callers use the measured quote/book flow.

## Tracking and insurance evidence

Every provider update remains authenticated, bound to its opaque reference/provider ID and independently retrieved outside demo. Fulfillment state, events, carrier-cost observations, insurance evidence and aggregate order progress commit together. Missing or mismatching provider insurance amounts put the operation in review; the UI reports insurance as awaiting verification. A later matching provider response can resolve that review. A missing value on a delayed update cannot erase previously confirmed insurance evidence.

The overall order is delivery_arrived only when delivered allocations cover every physical ordered quantity. A delivered first box leaves remaining goods partially fulfilled. Shipping failures retain their quantities for investigation and never mark an unpaid or refunded order delivered. Reordered/duplicate events cannot undo terminal parcel progress. Customer tracking lists each parcel's carrier, service, waybill, safe HTTPS tracking link and insurance verification status without exposing the operation request, warehouse contact or internal carrier-cost ledger.

## Dummy walkthrough

1. Run npm run dev:demo. In /admin sign in as demo Super Admin or Catalog Manager, edit a product and open Packed shipping measurements. Save its packed grams, dimensions and handling. Variants and assembled PCs have separate profile targets. General product Save does not erase these measurements.
2. As a shopper, add two units of that product. In delivery checkout fill in actual-format dummy contact/address details, click Load current insured shipping rates, and select an available option. Complete the simulated payment.
3. Sign in as demo Super Admin or Fulfilment Operator, open the new order, advance it through warehouse preparation to Ready for Dispatch, and expand Measured parcels and split delivery.
4. Put one unit in the first parcel. Enter its measurements and tick the packing confirmation. For the simple demo use courier jne and service jne-reg. Retrieve the quote and Book this parcel. Its waybill is DEMO-prefixed; no provider request is sent.
5. Use that parcel's Demo: delivered action. The order remains partially fulfilled because one physical unit is still outstanding.
6. Book the second unit with a new parcel request. Repeating the first saved request retains its booking identity; trying a third unit is refused. Deliver the second parcel. Only now does the order show delivery arrived. Open the customer's signed tracking link to see both parcels.
7. Restart for a fresh failure scenario. Demo: failed retains its allocation and needs review; no replacement booking is generated. The dummy engine also supports its earlier payment/refund/return flows. Restarting clears process-memory fixtures.

Demo rate calculation uses an illustrative 6000 cm3/kg volumetric divisor and simulated insurance fee. Real provider quotes receive dimensions/weight/value; this local illustration does not prescribe the actual carrier's billing divisor, packaging rules or insurance price.

## New migration and connected acceptance

The user reported applying all updates through 20261107010000_refund_recovery.sql and receiving database_ready = true. Those completed updates remain completed. Step 10 introduces one new migration:

supabase/migrations/20261107040000_packaged_fulfillment.sql

On 2026-11-07 the user reported applying this file and receiving database_ready = true. This is user-reported confirmation for their dummy project; the assistant did not independently connect to verify it. It adds package metadata fields, per-parcel request identities, transactional parcel allocation/profile functions, aggregate delivery/insurance handling, profile-preservation protection and narrower service fulfillment permissions. Existing shipment/payment/financial rows are preserved. Apply this file once after Step 9; do not rerun the baseline or completed migrations. Then run select public.application_schema_health() as database_ready; and the intentionally read-only npm run db:check -- --connected. Startup/tests do not apply migrations. Current application readiness requires this new marker, so the earlier readiness result does not certify Step 10.

Before connected testing, configure the approved actual warehouse origin, matching Biteship test key/environment and callback header per biteship-shipping.md. Enter measured real catalog/variant/assembled package profiles. Check service coverage and insurance support for the intended postal destinations; use the actual service code returned by the provider (for example reg, rather than the demo jne-reg label). Validate pickup eligibility and insurance activation/insured amounts in the real sandbox records.

Repeat independent parcel booking, duplicate submission, unknown POST outcome/local DB recovery, differing carriers, partial/all delivery, insurance mismatch and refund/return interlocks against isolated staging. Confirm costs and insurance evidence with the provider account. No real booking, sandbox provider request, insurance purchase, dashboard change or connected migration was performed by the assistant. Instant-coordinate and live scheduled pickup remain unavailable until their separate verified workflows are accepted. Replacement booking/allocation release, claim handling, serial-level packing and quarantine-to-sellable reclassification remain explicit additional operational workflows.

## Verification

Run npm run test:shipping for offline adapter/demo tests and actual PostgreSQL migration/transaction checks; npm test runs the full regression suite. 2026-11-06: the full isolated suite passed 507 tests. TypeScript passed, and an isolated production build compiled and generated 46 static pages with connected-service values cleared. Local demo HTTP checks passed profile editing/stale-form preservation, server-derived insured quotes, payment/stock settlement, two parcel bookings, same-key replay, over-allocation rejection, partial/all delivery, safe customer multi-parcel tracking and unchanged original charges. The final code also rejects new parcel bookings when payment attempts require review; live parcels require a settled payment attempt in the matching environment. The temporary demo server was stopped after verification. No interactive browser automation or actual provider acceptance was performed. Disposable PostgreSQL and localhost HTTP tests do not certify hosted role/JWT configuration, physical packaging adequacy or actual insurance coverage.

## Official references

[Biteship rate inputs and insured combined prices](https://biteship.com/en/docs/api/rates/retrieve), [order creation and insurance amount](https://biteship.com/en/docs/api/orders/create), [order retrieval](https://biteship.com/en/docs/api/orders/retrieve), and [Biteship insurance activation/confirmation guidance](https://help.biteship.com/hc/en-us/articles/44022964384921-Guide-to-Activating-Shipping-Insurance-via-Biteship-API).
