# Inventory settlement, cancellation and expiry

Implemented locally on 2026-11-06 for the inventory transition portions of AUD-007, AUD-008 and AUD-017. The migration is **not applied to any connected database**.

## Guarantees

`transition_order_inventory` locks the order and its order-linked reservations. Settlement requires coverage of all physical lines, a nonempty payment reference, unexpired holds and sufficient reserved/on-hand stock. It consumes each hold, deducts physical stock, records SALE ledger movements and marks payment in one PostgreSQL transaction. A later failure raises and rolls back all previous lines and ledger writes. Variant stock is independent of parent stock; build components are physical order lines covered by the same check.

A replay with the same settled reference succeeds without another movement. A different reference conflicts. Pending/challenge events leave state unchanged. Unpaid cancellation or expiry releases only that order's holds, without increasing physical stock. Paid cancellation is rejected: physical returns and refunds require their dedicated workflow. No automatic restocking is inferred from a paid order's cancellation request.

An expired or cancelled order cannot settle automatically. The caller receives a reconciliation error; actual captured money must be handled by the next gateway recovery/refund workstream. Historical orders without complete order-linked holds also require reconciliation; counters alone are not sufficient evidence to consume stock.

The unsafe legacy payment RPC is revoked from application roles. Both admin order routes use guarded cancellation, block direct paid/refunded mutations, reject terminal reopening and require paid evidence before fulfillment advancement. Other shipping/refund routes remain subject to their later audit workstreams.

Demo checkout, settlement and cancellation share a process-wide transaction queue and rollback snapshots. Demo charge references are stable per order and retries retain the paid timestamp. Notifications and marketplace dispatch are skipped on replay. Demo webhook processing no longer uses a process-local deduplication Set, and checks the expected amount. Live webhook processing is explicitly unavailable until provider status retrieval, attempt binding and durable event recovery are implemented in the next step. This is not a claim of verified live payment processing or durable notification delivery.

## Expiry operations

- In `npm run dev:demo`, a Node instrumentation timer checks expiry every minute. No live credentials are used. Restarting demo resets its process memory as before.
- Staff with inventory adjustment permission can POST `/api/admin/inventory/expire` using their verified session.
- For staging/production, configure an independent random `INVENTORY_JOB_SECRET` of at least 32 characters, then schedule a POST to `/api/internal/inventory/expire` every minute with `Authorization: Bearer <secret>`. The job endpoint refuses missing configuration and invalid credentials. Do not put this secret in a browser variable.
- Alternatively schedule the service-role-only SQL `select public.expire_order_reservations(100)` using the database platform's reviewed scheduler. Batches are bounded to 100 by default (maximum 500), lock orders and skip concurrently locked orders. Drain additional batches when backlogged.
- Monitor non-2xx responses, failed results, reservation age and drift errors. A corrupt inventory record blocks its transaction and needs operator reconciliation; the worker never silently clamps counters or fabricates success. Retry after correction. SQL batches roll back on an exception; demo guarantees rollback per order.

**No connected scheduler was installed or enabled.** Configuring and monitoring one is a deployment prerequisite. Holds have a 15-minute deadline; the endpoint/timer releases them on the following successful run.

## Validation and deployment limits

Final verification: 384 tests passed, TypeScript passed, and production compilation generated all 39 static pages. Regression tests cover duplicate settlements, cancellation/settlement races in demo, stock drift and ledger-write rollback, amount mismatch, expiry batches, late events, role grants and canonical variant stock. PostgreSQL tests use the exact migrations in disposable PGlite; they do not prove hosted multi-connection concurrency or live Supabase configuration. HTTP checks exercise demo checkout, concurrent payment retries with stable references/timestamps, and staff expiry processing.

Apply `20261106180000_inventory_transitions.sql` only after the earlier migrations and a backup/reconciliation review, per [deployment-checklist.md](deployment-checklist.md). Readiness includes the new migration/functions. No connected migrations, actual payments, shipments or notifications were performed during this work.

Next: genuine Midtrans payment creation, independently verified evidence, attempt/event persistence and recovery. Keep live payment activation blocked until that and the remaining shipping/refund release gates pass.

Subsequent gateway implementation: [midtrans-gateway.md](midtrans-gateway.md) now supplies configured hosted initiation, verified callbacks and recovery. The earlier gateway-disabled notes above describe the inventory-only milestone; production activation still remains deferred.
