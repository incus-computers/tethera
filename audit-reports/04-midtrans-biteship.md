# Midtrans and Biteship integration assessment

Reviewed 2026-11-06 against current official public documentation. Source inspection only; dashboards, live keys, merchant capabilities and sandbox behaviour were not accessed. A correct hash helper or UI payment label does not establish a working integration.

## End-to-end transactional trace

| Stage | Actual implementation | Broken boundary / finding |
|---|---|---|
| Catalog → cart | Products/variants and local/persistent cart paths | Cart identities simulated; browser and durable cart consistency unverified (022) |
| Cart → checkout | Browser sends items, builds, contacts, address, rate, promo | Build/unknown-product prices and shipping trusted; weak input validation (005–006) |
| Stock hold | reserveStock before order insert | Read/write race, false result ignored, no rollback/expiry linkage (007) |
| Order persistence | createOrderWithItems inserts header then each line separately | No all-or-nothing transaction; partial orders and mock-success fallback (007, 011, 026) |
| Payment creation | Browser calls local charge generator | No Midtrans charge request; immediately marks paid (002) |
| Payment event | SHA-512 webhook then SQL/local transition | Default key, no amount binding, process cache, failed RPC acknowledgement/regression (008–010) |
| Inventory settlement | SQL increments reserved; fallback deducts on-hand | Double hold and inconsistent retries/cancellation (008, 017) |
| Shipment | Admin books Biteship, then updates order | No paid/duplicate guard, fixed package/default destination, synthetic success (013–015) |
| Delivery event | Public Biteship webhook scans orders and updates state/total | Unauthenticated; out-of-order updates, costs mutate customer total (012) |
| RMA/refund | Record/refund status and optional restock | No gateway refund; partial/repeated restocks unbounded (016, 018) |

## Midtrans: official comparison

Midtrans provides real charge APIs, provider transaction identifiers and pending/paid lifecycle evidence. Official notifications support SHA-512 over order_id + status_code + gross_amount + ServerKey, and the status API provides authoritative transaction status. Its guidance explicitly anticipates missing and out-of-order notifications. The application must handle those realities rather than using browser outcomes as proof. [Charge reference](https://docs.midtrans.com/reference/charge-transactions-1), [notification authenticity](https://docs.midtrans.com/docs/https-notification-webhooks), [notification ordering/recovery](https://docs.midtrans.com/reference/handle-notifications).

| Requirement | Assessment | Source evidence |
|---|---|---|
| Genuine creation and provider reference | Missing | charge POST calls generateMidtransPaymentDetails locally; AUD-002 |
| Server-authoritative amount | Partial | Standard known product prices reread; builds/unknown products/shipping not authoritative; AUD-005/006 |
| Unique persistent transaction IDs and retry identity | Partial | Daily order prefix plus four random digits; no checkout idempotency key or payment-attempt ledger observed; DB unique order_number alone does not prevent duplicated purchases |
| Environment separation | Missing in checkout path | No real provider creation endpoints selected; signature fallback not environment-guarded |
| Notification signature | Partial | Hash calculation present, but source-known missing-key fallback and permissive decimal variants; AUD-009 |
| Local order/amount/merchant/attempt match | Missing | No order.total check or persisted attempt association; AUD-009 |
| Browser treated as untrusted | Fails | Public payment-success and charge mark paid; AUD-002 |
| Duplicate notifications | Partial | Paid-status list/cache exists; cache volatile, SQL non-idempotent, concurrent race remains; AUD-008/010 |
| Delayed/out-of-order events | Fails | Pending/challenge can regress paid; cancellation/settlement graph not centrally enforced |
| Pending/settlement/capture/challenge/cancel/expire/deny | Partial | Branches present; failure handling and inventory accounting unsafe |
| Refund/partial refund status | Missing | Acknowledged without gateway/local reconciliation; local refunds simulated |
| Status reconciliation and durable audit | Missing in supplied implementation | No status client/scheduled reconciliation or durable event inbox found; external jobs Not verified |

Notification authenticity may be checked using a valid signature or provider status verification as documented; this report does not claim official docs require both on every event. Here the separate application defects are absent amount/attempt binding, default secret handling and unsafe state transitions. A leaked/captured notification also requires replay and status-integrity testing because the signature formula does not cover every payload field.

### Required payment recovery design

1. Persist an immutable order monetary snapshot and unique payment-attempt identifier before contacting Midtrans.
2. Create a real payment using that expected amount; on timeouts retain an unknown/pending attempt and query the provider before retry.
3. Persist incoming events, validate identity and amount, lock the local payment/order, enforce a monotonic transition and commit inventory/payment atomically.
4. If the business transaction fails, do not cache/acknowledge success. Retry with the same event/attempt identity.
5. Reconcile old pending attempts, missing events and refunds against provider status; queue irreconcilable cases for operator review.
6. Dispatch receipts/marketplace sync through a durable outbox after commit; no fulfilment before confirmed payment and readiness.
7. Treat confirmed payment with unavailable stock as a paid exception requiring explicit recovery/refund, not silent success or a swallowed error.

## Biteship: official comparison

Official rates support location identifiers/coordinates/postcodes and item data; booking creates an actual remote order. The booking reference documents using Maps area IDs and coordinates for instant delivery. Webhook configuration supports custom security headers. These provide the baseline; specific merchant/courier entitlements remain unverified. [Rates overview](https://biteship.com/en/docs/api/rates/overview), [create order](https://biteship.com/en/docs/api/orders/create), [webhook configuration/security](https://help.biteship.com/hc/en-us/articles/58382023618329-Complete-Guide-to-Understanding-Biteship-Webhooks).

| Requirement | Assessment | Evidence |
|---|---|---|
| API authentication and real HTTP requests | Partial | Server API-key header and maps/rates/orders fetches present; no live verification |
| Valid destination and courier coverage | Fails safely handling errors | Unknown areas synthesised; simulated available rates; destination defaults; AUD-013/015 |
| Quote freshness/basket binding | Missing | Selected browser rate price accepted; no quote expiry or server revalidation |
| Actual and volumetric package data | Partial quote / Missing booking fidelity | Rate items can include weight/dimensions, but dispatch uses one fixed 2500g package and omits dimensions |
| Multi-item/fragile/bulky/insured shipment | Partial / Not verified | Fragile note present; no observed packing/insurance choice or reliable package limits |
| Shipment only at appropriate state | Missing | No paid/delivery/ready-state gate; AUD-014 |
| Duplicate prevention and uncertain success | Missing | No operation lock/recovery; reference_id is not demonstrated provider idempotency |
| Tracking updates | Partial | JSON courier history exists; synthetic IDs/driver data and public webhook undermine correctness |
| Source verification | Missing | Webhook validates no secret/header; AUD-012 |
| Cancellation and return syncing | Partial | Webhook maps rejected/cancelled to whole-order cancelled; provider cancel API not observed in dispatch path |
| Split shipment status integration | Partial | Separate fulfilment rows exist; webhook primarily updates aggregate order courier_info, not demonstrated item allocation reconciliation |
| Timeouts, retries, outages | Fails | No explicit fetch timeout observed; exceptions/non-OK responses can yield invented booking success |
| Carrier price adjustments | Unsafe | Alters order.total instead of separate carrier cost ledger; AUD-012 |

### Required shipping recovery design

Persist a validated quote and package manifest with destination identifiers. Lock eligible order allocations and persist an operation ID before booking. On timeout/unknown response, reconcile the provider order/reference before another create call; do not assume reference_id guarantees deduplication without documented confirmation. Record provider IDs durably, retry failed local persistence and expose a recoverable pending state. Authenticate events, deduplicate persistently and enforce shipment-level transitions. Cancellation/rejection of a courier should trigger shipment recovery, not automatically cancel a paid merchandise order. Keep carrier cost adjustments separate from agreed customer charges.

## Minimum scenario assessment

All statuses below are static assessments; none was actively executed.

| Scenario | Code-based result / risk | Required controlled test |
|---|---|---|
| Duplicate checkout | Each POST makes another random order and holds stock; unique order_number is not request idempotency | Repeat same key; return same order without new hold/charge |
| Forged notification | Midtrans hash rejects arbitrary mismatches with a real secret, but default key/public paid routes bypass proof; Biteship has no check | Reject invalid/missing auth and altered amount/identity with no state changes |
| Duplicate paid event | In-memory cache/status precheck are insufficient across processes; SQL lacks guard | Parallel/restart replay yields one inventory/payment effect |
| Simultaneous last-stock purchase | Read/write reservation race and ignored failure | Exactly one reservation succeeds |
| Payment success + DB failure | RPC failure may be acknowledged; BaseRepository can return mock success | Retry/reconcile without losing captured money or repeating stock effects |
| Biteship timeout | May fabricate success; remote success can be unknown | No fake waybill; reconcile uncertain booking before retry |
| Invalid destination | Synthetic area/default destination used | Reject unsupported area/service without any booking |
| Cancellation/expiry | SQL/local stock semantics disagree; custom components omitted | Release only own holds; restore only actual deductions once |
| Unauthorised order/admin access | Missing ownership and forgeable tokens | Cross-user/no-session/forged-role requests denied |
| Partial refund/fulfilment | Every-item restock and unchecked allocations | Money and physical quantities bounded per line/attempt |

## Financial invariants for release

An accepted checkout has exactly one durable order and complete item set. Total equals the validated item/service/shipping/discount snapshot in integer IDR. Reserved/on-hand/available stock reconcile by SKU and order. One provider-confirmed payment settles once; paid evidence cannot regress. Total refunds never exceed captured funds. A shipment uses only its order's remaining paid allocations. Carrier adjustments do not silently rewrite the amount the buyer agreed to pay.
