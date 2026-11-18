# Step 7: least-privilege database access (AUD-019)

Implemented locally on 2026-11-06. `20261106230000_least_privilege.sql` is **not applied to a connected database**. Hosted Supabase roles/JWTs/PostgREST and Realtime acceptance tests remain staging release requirements.

## Access contract

| Database role | Allowed | Denied |
| --- | --- | --- |
| anon | Explicit public columns of active stores/products/banners, categories and active variants of active products | Customer/guest records, inventory counters, costs, CRM, staff data, payment records and all application writes/RPCs |
| authenticated | Same catalog reads, plus selected columns of its own profile, orders/lines, cart/items, saved builds, wishlist/reviews, fulfillment/items, returns and refunds | Other customers and guests; direct mutations, ownership reassignment, verified-review forgery and privileged RPC execution |
| service_role | Explicit server CRUD where needed; private server reads; approved application RPCs; append-only ledger/audit inserts | Legacy payment RPC, internal readiness helpers, ledger/audit rewrites/deletion, direct payment-event insertion and direct payment-attempt state changes |
| migration/object owner | Schema management and definer transaction ownership | Not a customer identity or application browser credential |

Payment events/outbox and checkout replay results are written by owner-executed transaction functions. The service can read them, checkpoint `payment_attempts.updated_at`, and eventually mark `payment_outbox.delivered_at`; it cannot rewrite their protected state/payload using ordinary table access. Auth rate-limit storage is reachable through its approved RPC, not direct service table writes.

Guest cookies are application capabilities, not SQL identities. A NULL user_id never grants guest access through the database API. Guests use verified HTTP routes that bind the HttpOnly cookie; matching a supplied token/email does not bypass RLS. Saved build share slugs do not grant public SQL access to builds. Existing client-generated builder share links are unaffected; any future database-backed sharing endpoint needs a scoped public projection.

Customer order ownership joins the historical profile ID to its explicitly verified auth user UUID. Cart/build/wishlist ownership uses the provider UUID. Fulfillment/refund/item policies follow owned parent records; fulfillment lines must also refer to an order item of that shipment's order. Customers cannot directly edit profile ownership or CRM fields; profile, cart and other writes remain behind verified server routes.

## Changes and compatibility

The migration resets both table and independent column ACLs on **37 named application tables**, enables RLS, replaces their earlier policies and applies explicit grants. Public product costs/barcodes, variant reservation counters, order line costs, staff notes, profile CRM fields and guest tokens are excluded from direct customer column access. `SELECT *` against a column-restricted table is intentionally denied; consumers must use approved columns or the HTTP API.

Server repositories use service privileges and bypass customer RLS, so HTTP responses also need projections. Public product/wishlist responses now omit product costs, barcodes and unapproved top-level fields, omit inactive products/variants, and avoid fabricated stock when a detail record has no inventory. Customer order history omits internal notes and unit-cost snapshots, only exposes pickup credentials after paid evidence, and does not enrich a foreign user's saved build. Admin catalog endpoints retain authorized cost visibility. Technical `specs` and variation attributes are public publishing fields; never store credentials, supplier costs or internal notes inside those JSON blobs.

No browser client currently consumes raw Supabase Realtime changes. The migration removes these application tables from `supabase_realtime`, preventing replication of private raw records. Future realtime features need an explicitly approved public projection/channel; reconnecting raw tables causes readiness to fail. Custom publications and unrelated tables/functions are not silently modified.

Every listed application function has an empty search_path and explicit EXECUTE grants. The unsafe legacy payment function remains revoked, including from service_role. Internal historical readiness helpers and the table manifest are callable only by their trusted owner. Extension/provider functions are not blanket-revoked; any public SECURITY DEFINER function still executable by client roles is reported for review.

Public schema CREATE is revoked from browser roles. Future tables/sequences/functions created by the migration role default to no client or service grants until deliberately granted. Global creator-default revocations are necessary to remove globally inherited grants; these affect that creator's future objects in other schemas too, without rewriting existing auth/storage/extension objects. Other object-creating roles need equivalent reviewed defaults. Apply migrations under the intended trusted creator, and review managed-platform migration requirements before rollout.

## Drift detection

`application_security_audit()` is a service-only, read-only diagnostic. It checks RLS, effective client write/private-read permissions, private catalog columns, application function execution/search_path, exposed public definer functions, unsafe client role attributes/service membership, mutable audit evidence, creator defaults and raw Realtime membership. Approved policy definitions are stored in an owner-managed baseline; extra, removed or modified policies fail the contract even if RLS stays enabled.

`application_schema_health()` includes this diagnostic. The public health endpoint exposes only ready/unavailable; it never returns grant or policy details. The opt-in `npm run db:check -- --connected` also checks permission readiness. Without `--connected`, it loads no credentials and contacts no database.

A later legitimate policy change must be reviewed and update the baseline in its owner-run migration. Do not refresh the baseline merely to silence an unexplained violation. The diagnostic is scoped to named application objects and explicit checks; it is not a whole-project security proof or protection against a malicious database owner/service-key holder.

## Verification and deferred rollout

Final local verification: **423 tests passed**, TypeScript passed, production compilation generated all 42 static pages, and demo HTTP checks passed for public catalog/wishlist privacy, customer order history, protected admin access and dummy checkout/payment. Wishlist IDs now use UUIDs after a regression run exposed a collision with the former short random suffix.

Run `npm run test:security` for cross-owner SQL/API isolation and public projection checks, `npm run test:db` for the complete migration chain, and `npm test` for the full regression suite. Tests deliberately install broad legacy table, column, function and default grants before the security migration. They execute statements as anon/authenticated/service roles with two customer identities and guest fixtures, rather than relying only on privilege inspection. Tests also prove that later policy/column/default/role drift fails readiness.

PGlite uses a disposable PostgreSQL engine and a fixture auth.uid() implementation. It does not prove hosted JWT validation, deployed role membership, PostgREST column behavior or replication configuration. Demo mode remains isolated process memory and does not claim to implement PostgreSQL RLS; its HTTP ownership tests run separately. Dummy checkout/payment and authorized staff access remain supported.

Before connected rollout:

1. Follow [deployment-checklist.md](deployment-checklist.md), back up and review existing application policies/grants, custom publications, function owners and object-creator defaults.
2. Apply the migration after the earlier deferred files. It deliberately replaces custom policies on the listed application tables; reconcile intentional customizations before applying it. A FOR ALL TABLES publication needs separate operator review, not an automatic publication-wide rewrite.
3. Run the read-only readiness/security diagnostics with the service role. Investigate violations instead of broadening customer grants.
4. In isolated staging, use actual Supabase anonymous and two authenticated JWTs to repeat owned/foreign/guest reads, column restrictions, denied writes, denied RPCs and server-authorized staff flows. Repeat after role membership or default-privilege changes.
5. Confirm authenticated customers cannot impersonate service_role or an object owner, and that browser bundles/environment contain no service key. Verify auth/storage/extension-managed objects still operate and no raw private Realtime subscriptions remain.

No connected migration, credential rotation, role change or provider action was performed by this implementation. Production activation remains blocked by the remaining staging and shipping/refund/operational release gates.
