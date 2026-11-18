# Step 9: Refunds and inspected returns

## Behaviour

Financial refunds and physical stock recovery are separate, server-authorised operations. The former implementation's invented GW-REF identifier, unconditional completed status, implicit full amount and blanket restock flag have been removed. A caller must supply an explicit positive integer IDR amount and a UUID v4 Idempotency-Key. Existing customer ownership and staff refund permissions remain required; only Super Admin currently has refunds:write.

A transaction locks the paid order, validates any linked approved return belongs to it, reserves one unresolved refund operation, and checks cumulative refunds cannot exceed the original paid total. Existing records without operation linkage require historical reconciliation. They are preserved, not converted into verified provider evidence. Customer totals, tax snapshots, shipping fees, paid_at and payment reference remain unchanged by a refund.

Outside demo, the server retrieves Midtrans payment status, verifies merchant/currency/gross amount/transaction identity, checks settled status and reconciles existing provider refund history before preparing a new refund. The saved payment attempt must match the order's actual payment reference and environment. Bank transfers and other unsupported methods require a separately verified manual reimbursement workflow; this API never fabricates one. ShopeePay and OVO partial refunds are blocked according to the current provider contract.

The initial durable claim alone can POST /v2/<transaction_id>/refund with the saved refund_key, amount and reason. Using transaction_id also accommodates GoPay Static QRIS. An HTTP response alone does not mark local money refunded: the server independently retrieves status and matches the exact refund key, refund ID and amount. A listed refund with no confirmation remains pending. An online confirmation method or valid bank_confirmed_at confirms the provider request; completed locally means provider-confirmed, not a promise that a customer's bank has already credited their account.

Refund events, confirmed refund record, order financial status and audit record commit together. Replays cannot add another refund or regress completion. Partial refunds accumulate; the order becomes refunded only once their confirmed sum equals the original total. Unknown history/cumulative mismatches stop processing for investigation. Existing shipments can be checked for recovery, while a warehouse status edit cannot start a new shipment after a refund operation or physical return.

## Lost responses and reconciliation

A timeout, provider rejection or process crash retains the refund operation and blocks another key for that order. Repeating the same request checks status; it never blindly sends a second refund. If status has not acknowledged the key, the operation requires review. There is no delete/reset/replacement-key button. Although Midtrans documents same-key retries within seven days, this implementation conservatively uses GET recovery only after the first claimed POST. Resolve genuinely rejected/never-sent requests through a separately audited operator process; do not remove rows or change keys to bypass the guard.

The admin panel shows each operation and a Check provider confirmation button. Refund and receipt drafts retain their exact keys/body in localStorage before sending and across reloads. After an uncertain response, retry or reconcile the saved request. The UI permits correcting a definitive rejected request only after successfully checking that it has no durable operation. There are no session tokens or provider credentials in these drafts.

Authenticated Midtrans notifications still trigger independent payment verification and now also reconcile that order's known refund operations. They do not trust callback refund amounts or statuses. External dashboard refunds with no local operation remain a payment-review case; they are not silently imported or used to restore stock. Partial-refund notifications with the same payment status still retrieve fresh refund evidence. Configure a separate scheduler to POST /api/internal/refunds/reconcile with Authorization: Bearer <REFUND_JOB_SECRET>, using an independent random secret of at least 32 characters. It checks up to 50 oldest unresolved operations per call and never issues a refund POST. Monitor review/non-success responses. No scheduler was installed.

## Physical returns

Return case transitions are requested -> approved -> item_received -> inspected -> completed. Requested/approved cases can instead be rejected. Invalid jumps and reopening closed cases are refused. Closing a return case does not itself confirm a refund or restore inventory.

After inspection, record explicit order item IDs, quantities and either restock or quarantine. Each request uses its own UUID v4 key. The order and return case are locked; rows must belong to that order and be physical items. Cumulative received quantities across all return cases and keys cannot exceed ordered quantities or the settled order-linked inventory coverage. Missing historical sale coverage is a reconciliation case, not permission to invent stock.

Sellable quantities increase the original variant stock or the correct original warehouse stock and add RETURN ledger entries in the same transaction as the receipt/audit. Quarantined quantities count as received but do not increase sellable stock. Repeated keys replay the receipt; different keys cannot exceed the remaining quantities. Any later write failure rolls back the whole receipt and stock change. Reclassifying quarantine stock, exchanges/replacements, serial-number inspection, reverse courier pickup and manual non-Midtrans reimbursement remain separate workflows; this change does not simulate those as completed live actions.

## Dummy walkthrough

1. Run npm run dev:demo and place an order. Complete the simulated payment as the shopper.
2. Sign in to /admin with the demo Super Admin button, open the order details drawer, and expand Returns and refunds.
3. For money only, enter a refund reason and a partial whole-rupiah amount, then Request refund. The confirmation uses a DEMO-REFUND identifier and contacts no provider. Try a second partial amount; anything above the remaining paid amount is refused. Refresh to see durable-in-process operation history.
4. For stock recovery, enter New return case reason and Create return case (or submit a return as the shopper). Mark it approved, item received, then inspected. Select that case, the actual order item and quantity.
5. Record one inspected/sellable unit, then try a larger remaining quantity. Over-returns are refused. Record a different unit as quarantine and observe that it does not add sellable stock. Refund and receipt are independent; either can happen first when its own prerequisites hold.
6. Close the return case only when its operational work is done. Restart the demo process to reset dummy data. Historical seeded orders without genuine dummy settlement/stock coverage need a new checkout for stock recovery testing.

Offline checks: npm run test:refunds. Tests cover whole-IDR inputs, paid/ownership/role gates, one concurrent claim, cumulative partial refunds, unknown POST recovery with one provider POST, pending/confirmed evidence, wrong merchant/amount/history, inspection sequencing, per-item/variant bounds, quarantine, transactional rollback, SQL grants and shipment interlocks.

## New migration and connected sandbox acceptance

The user reported completing the seven updates through 20261106233000_biteship_dispatch.sql and receiving database_ready = true. Those updates remain completed. The user subsequently reported applying the Step 9 migration and receiving database_ready = true:

supabase/migrations/20261107010000_refund_recovery.sql

Review/apply this file once after the shipping migration. It introduces private operation/event/receipt tables, links future confirmed refunds to operations, removes direct service writes to refund/return case rows, and extends the service transaction functions and readiness/security checks. It preserves legacy refund rows for explicit reconciliation. No migration is applied by startup or tests. Current application readiness requires the Step 9 marker, so an earlier true result does not certify this new version.

Use a separate dummy/staging project and sandbox Midtrans payment attempt created by this application's new checkout. Configure MIDTRANS_ENV=sandbox, the matching server key/merchant ID and APP_ENV=staging. MIDTRANS_REFUNDS_ENABLED=true permits new provider refund requests; leave it false until the account, sandbox methods and test plan are ready. Turning this flag off stops new requests while authenticated reconciliation remains available. Existing production gateway environment/key/activation gates still apply.

Have Midtrans activate refund capability for the merchant if needed, confirm channel support/refund windows and available payable balance, and test settlement before refunding. Actual refund receipt/confirmation delays and partial support vary by channel. Test supported full/partial refunds, insufficient balance, bank confirmation delay, lost responses, database failure/recovery and notifications against real sandbox evidence. Verify the local operation/refund/event records, unchanged original bill, and independently inspected inventory receipts. Run npm run db:check -- --connected and verify /api/health after migration. No provider refund, dashboard change or sandbox acceptance was performed during implementation.

## Verification record

2026-11-06: the full isolated suite passed 478 tests. TypeScript and the isolated production build passed, generating 44 static pages with connected-service environment values cleared. Local demo HTTP checks passed paid checkout, customer-owned return creation, foreign-user rejection, inspection sequencing, partial/full refunds, same-key refund replay, over-refund rejection, bounded restock/quarantine, same-key receipt replay, unchanged original charges, protected refunded status, and /admin and /checkout rendering. No interactive browser automation or actual provider sandbox request was performed. A read-only check using the configured Supabase API connection was attempted after implementation and did not report readiness; the Step 9 migration was unconfirmed at that time. The user subsequently reported applying it and receiving database_ready = true. No connected database writes were performed by the assistant. Offline PostgreSQL and HTTP fixtures do not prove hosted JWT/role configuration, provider account capabilities, actual bank credit or real-world physical inspection.

## Official references

[Midtrans refund endpoint and refund keys](https://docs.midtrans.com/reference/refund-transaction), [payment status and refund history](https://docs.midtrans.com/docs/get-status-api-requests), [refund history/confirmation fields](https://docs.midtrans.com/reference/get-transaction-status), [refund activation/prerequisites](https://docs.midtrans.com/docs/how-can-i-refund-transaction).
