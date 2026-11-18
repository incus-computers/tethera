# Database storage and Step 2

## Explicit environments

Only APP_ENV=demo selects the shared in-memory adapter. Missing credentials, anonymous keys, network errors, permissions, absent tables/columns/functions and failed inserts never select memory in staging/production. Live server storage requires a URL and SUPABASE_SERVICE_ROLE_KEY; the anon key is not a fallback.

Sample data is seeded only in demo repositories. Live product normalisation does not invent variant/image data from the mock catalog. Demo mode remains usable through npm run dev:demo, including simulated checkout, staff workflows and fresh test accounts.

## Persistence contract

All base CRUD, count and custom catalog reads either return a real successful database result or throw a safe DatabaseError. A successful empty result is distinct from an outage. Returned errors and transport exceptions share the same failure path; logs contain operation/table/error code, not SQL messages or customer values.

HTTP routes translate database failures into problem responses with safe messages. Configuration/schema/permission/availability failures return 503 with Retry-After; unique conflicts return 409 and invalid/constraint data returns 400. No automatic retries are performed by the database client, since a retry of an uncertain write needs application idempotency.

Order headers and item rows use one service-role-only create_order_with_items RPC. A failed line rolls back the header and all previous lines. Unknown JSON column keys fail instead of being silently discarded. Demo order creation compensates local row writes on failure. This is order persistence atomicity, **not** the later stock-reservation/payment transaction: checkout holds, redemption, inventory settlement/cancellation and external side effects still need their subsequent workstreams.

Homepage layout/hero/featured settings now use storefront_settings rather than process globals outside demo. A successfully empty settings table means the documented initial layout; failed reads never become defaults. Concurrent first saves can conflict explicitly rather than falsely reporting a successful volatile update.

Customer wishlist ownership uses the provider auth-user UUID; customer order/review ownership uses the durable customer profile ID. This preserves historical profile IDs linked to verified users. Raw review rows contain private identifiers and are not public SQL reads; storefront review DTOs remain scrubbed.

## Schema completion

The new migration supplies checkout discount/tax fields; extended promotion fields and types; wishlist, reviews, stock-notification and homepage-settings tables; access policies/grants; indexes; new-write integrity constraints; and the order insert/readiness functions. Past tax snapshots stay NULL rather than being fabricated.

Product variations currently remain represented in specs.variations with the existing product_variants table. Trusted variant selection, table synchronisation and stock semantics belong to the upcoming checkout/inventory work, not a claim made by these persistence changes.

Readiness uses application_schema_health to check the migration marker, critical columns and the order RPC. /api/health returns only ready/unavailable status; it exposes no schema details or credentials. This is a deployment gate, not a claim that every provider or business invariant has passed.

## Verification and limitations

npm run test:db runs offline HTTP-fixture failure tests plus an actual PostgreSQL WASM engine (PGlite). The migration test creates disposable Supabase-like auth roles/schema/publication, then applies the exact baseline and migration files. It validates persisted model columns, transaction rollback, constraints, grants/RLS and readiness drift detection.

The fixture auth schema is not the hosted Supabase Auth service, and this single-process engine does not prove hosted deployment, provider behaviour or multi-connection concurrency. No connected migrations or production data were changed.

Run npm test for the complete isolated suite. A connected readiness check is opt-in: npm run db:check -- --connected. Without that flag the command does not load credentials or contact a database.

**Deferred migration reminder:** see deployment-checklist.md before staging/production work.

References: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [PGlite engine](https://pglite.dev/docs/), [PGlite extensions](https://pglite.dev/extensions/).
