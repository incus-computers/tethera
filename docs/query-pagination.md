# Step 15: indexed queries and bounded pages (AUD-029)

Implemented locally. The user reported completing all migrations, including Step 15, on 2026-11-09. The assistant did not independently connect to the project or apply this migration. Do not rerun it in that project; the instructions below are for other targets with the migration still unapplied.

## Changed behavior

Connected catalog, customer history, administrator orders/products/customers and inventory collections use a service-only `read_collection_page` RPC. Filtering, ordering, total counts, catalog facets and customer/inventory aggregates execute in PostgreSQL before the response page is selected. Only the selected records and their related display data cross the application/database boundary. A single JSON response prevents PostgREST's row cap from cutting off a nested collection before filtering. A missing function or database error returns an error; connected reads never switch to seeded data.

Pages default to 50 records, with an enforced size of 1–100 and a maximum page number of 10,000. Invalid limits, fractions, negative values, excessive filter lengths and unsupported sorts are rejected. Queries use unique ordering with an ID tie-breaker; newest sorting uses creation time. Catalog featured/rating fall back to creation-time ordering because no authoritative featured/rating rank exists in this query contract. Price filters use the effective sale/retail price. Missing stock is unavailable; active variants determine variant-product availability, otherwise the actual selling warehouse stock is used.

Customer order history binds ownership from the verified session before querying. It preserves private-note/cost redaction, paid-only pickup codes and custom-build ownership checks. Related order items/products/builds are joined in the same database operation instead of making requests per order and per item. Administrator detail queries keep their authorized fields. Browser and anonymous database roles cannot execute the collection RPC or its helper functions.

The migration adds indexes for common owner/status/date/price/category/brand/slot queries, literal product/name/email searches, order lines, stock lookups and recent audit/stock movements. Required indexes and function permissions are included in readiness. Biteship callbacks already use exact provider/reference lookups against the unique `shipping_operations` keys from Step 8; this path does not scan orders.

Admin Orders, Products and CRM, Account order views and Transactions have previous/next controls with total-result counts. The all-record search/sort/status controls query the full collection. Existing admin table filters refine only the loaded page and are labelled accordingly. The admin overview/analytics screen discloses when its calculations cover loaded pages; it is not presented as a complete financial reporting system. CRM totals are database aggregates over the full stored customer population. Product mutations refresh the selected page. Requests superseded by new paging/search selections are aborted in the browser.

Recent audit and stock-movement queries apply ordering/limits in the database. Inventory responses include page metadata and full warehouse summary counts. CSV export fetches bounded product pages rather than accepting a silent 1,000-row cutoff. Interactive exports allow up to 5,000 products and 5 MiB of serialized source data, at most 100 specification columns/10,000 variant rows and a 10 MiB generated CSV. They support a `search` query parameter, and fail clearly when too large or when row counts/identities change during collection. CSV export is not a point-in-time snapshot; use a scheduled export/backup workflow for larger or archival datasets.

Numbered pagination can shift between requests when records are inserted, deleted or their sort values change. It is not a cross-request snapshot. Exact counts/facets still require database work over the matching rows; this change does not make broad aggregations constant-time. Deep offsets are bounded, and substantially larger workloads should adopt cursor pagination after measuring representative queries. See [PostgreSQL's ordering and offset guidance](https://www.postgresql.org/docs/current/queries-limit.html), [expression indexes](https://www.postgresql.org/docs/current/indexes-expressional.html) and [Supabase ranges](https://supabase.com/docs/reference/javascript/range).

## Apply the migration

Use the same Supabase project as the earlier steps. Do not rerun Step 14.

1. Copy the complete contents of `supabase/migrations/20261108100000_query_pagination.sql`.
2. In Supabase **SQL Editor → New query**, paste it and click **Run** once.
3. Run a separate query:

```sql
select public.application_schema_health() as database_ready;
```

Expected: `true`. If false, inspect:

```sql
select public.application_security_audit();
```

An SQL error is not a successful migration. Inspect it before rerunning. The transaction creates ordinary indexes; for a large connected dataset, first measure build time and locking on an isolated copy and choose a maintenance/concurrent-index rollout suitable for that environment. Do not test load against production or rerun old migrations. Local validation never connects to the real database.

## Dummy environment and verification

`npm run dev:demo` retains the same seeded products, orders, simulated checkout and dummy uploads. Demo collections use the same page bounds, filtering, stable ordering and privacy projections in local memory. No migration is needed for demo mode. Admin product pages can be populated through the existing dummy Add Product form; search the entire collection and use Next page. Existing static component/builder merchandising views still use their bundled fixture data; migrating those views to a live merchandising/search experience is a separate product change, not a claim of this query migration.

`npm run validate` exercises disposable PostgreSQL fixtures with more than 1,000 matching products/orders, records beyond the old cutoff, equal-price/date page boundaries, facet totals, missing/variant stock, wildcard-shaped search, foreign owners, nested order items beyond a transport row cap, role execution denial, index drift, SDK query counts/failures, TypeScript and production compilation. Browser journeys create synthetic products in an isolated demo process and search/navigate two actual pages on desktop and mobile, alongside simulated checkout and upload tests.

The local index-plan check proves an index is usable on its synthetic dataset; it does not certify hosted speed. Before connected acceptance, use a staging copy with representative distributions, inspect `EXPLAIN (ANALYZE, BUFFERS)` for common and worst-case filters, and measure query count, response bytes, p50/p95 latency and mobile Core Web Vitals under realistic network conditions. Verify role grants and PostgREST limits on the actual hosted project. No production load test, hosted query-plan measurement or CWV result is claimed.

Local verification on 2026-11-08: **615 regression tests, TypeScript, production compilation (48 static pages), and ten desktop/mobile browser journeys passed**. Evidence: `validation-results/2026-11-07T15-23-12-301Z-all/summary.json` (UTC timestamp; local date is 2026-11-08). The user subsequently reported all migrations completed on 2026-11-09. Hosted performance measurements and independent connected verification remain pending.

Next: Step 16, Indonesian localization and policy workflows. Marketplace provider and live tax configuration remain undecided.
