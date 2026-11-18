# Server database repositories

Use the typed repositories exported by @/lib/db from server code only.

- APP_ENV=demo explicitly selects seeded shared memory. Start with npm run dev:demo.
- Every other environment requires a Supabase URL and service-role key.
- Missing configuration and failed database operations throw DatabaseError; they never return demo records or accept volatile writes.
- findMany preserves filtering, sorting and pagination; null filters use SQL IS NULL.
- createOrderWithItems persists headers/lines through a single PostgreSQL RPC.
- Homepage settings use a persisted singleton row.
- Service-role queries still require application authentication/ownership guards.

Read docs/database-storage.md for contracts/tests and docs/deployment-checklist.md for the **deferred migrations**. Do not run the baseline or seed scripts over an existing project as a repair for an unavailable database.
