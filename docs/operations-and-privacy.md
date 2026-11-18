# Step 17: abuse controls, privacy operations and recovery (AUD-032)

Implemented locally. No hosted firewall, DNS/TLS, credentials, scheduler, monitoring service, backup configuration or connected database was changed. This is the last numbered implementation step; it does not establish production readiness or close the audit's external evidence requirements.

## What changed

- Shared endpoint budgets run before API handlers. Connected API counters use one service-only PostgreSQL RPC and transaction locks across app instances. Dummy API counters stay in a bounded local map. Public image optimization has a separate local budget and works without API secrets or database availability.
- Every declared API method has a request-body budget, safe failure handling, a server-generated request ID and structured diagnostics that exclude personal values and secrets.
- HTML uses per-request script nonces, an enforced Content Security Policy, frame restrictions, content-type protection, referrer and browser-permission policies. Production HTTPS responses also set HSTS.
- Customers can verify a fresh code, download scoped account data and submit owned privacy requests. A restricted staff queue records review and outcomes with evidence references.
- Operations monitoring reports database readiness, worker freshness, blocked/review/dead jobs, overdue pending work, expired leases and open privacy requests. Expired operational credentials/counters are cleaned without purging business evidence.
- A disposable local restore test checks actual order records, line items, privacy evidence, readiness and access boundaries after restoring a database snapshot.

## Database update and configuration

The migration is [20261109090000_operational_controls.sql](../supabase/migrations/20261109090000_operational_controls.sql). It requires all preceding migrations, including Step 15's `20261108100000_query_pagination.sql`. On 2026-11-09, the user reported completing all migrations, including Steps 15 and 17. No migration remains pending for their existing project based on that report. Do not rerun completed migrations.

For another project where these updates have not yet been applied:

1. Confirm whether Step 15 was applied. If it has not been applied, run that file once in Supabase SQL Editor first.
2. Open a new SQL Editor query, paste the complete Step 17 migration file and run it once.
3. In a new query run `select public.application_schema_health() as database_ready;`. A successful result is `true`.

The assistant has not independently verified the connected project. The latest completion confirmation did not include a new readiness-query result. For another project, review its migration history and take a verified restore point first. Readiness now requires the Step 17 version as well as the earlier schema/security contracts.

Staging/production additionally needs:

| Setting | Purpose |
| --- | --- |
| `ABUSE_HMAC_SECRET` | Independent random secret of at least 32 characters, kept server-side |
| `ABUSE_TRUSTED_IP_HEADER` | Optional verified single-IP ingress header; see below |
| `OPERATIONS_MONITOR_SECRET` | Separate random bearer secret, at least 32 characters, for the private monitor |
| Existing `BACKGROUND_JOB_SECRET` and scheduler | Existing authenticated worker schedule, once per minute, also performs operational cleanup |

The examples contain blank values, not new real secrets. No `.env.local` was read or changed. `npm run dev:demo` requires none of these connected settings.

### Request budgets

Budgets are fixed windows of one minute. They are starting operational settings that need representative staging traffic measurements; they are not demonstrated capacity limits.

| Endpoint group | Network budget/minute | Whole-store budget/minute |
| --- | ---: | ---: |
| Authentication writes | 30 | 300 |
| Shipping/address services | 60 | 600 |
| Checkout | 60 | 600 |
| Invoice sends | 5 | 100 |
| Webhooks | 600 | 3000 |
| Internal schedulers/monitor | 120 | 600 |
| Uploads and bulk operations | 20 | 100 |
| Privacy requests/downloads | 20 | 200 |
| Other API reads | 600 | 6000 |
| Other writes | 120 | 1200 |

Existing per-contact authentication limits remain additional checks. Webhooks have a separate budget and keep their signature/idempotency checks; they are not silently discarded. Budget denials return 429 with `Retry-After`. Missing secrets, database/RPC errors, malformed responses and a four-second limiter timeout return 503. Financial callbacks therefore need provider retry/reconciliation acceptance. There is no connected fallback to local counters or demo data. A fixed-window boundary can admit a burst spanning adjacent windows; ingress controls should smooth traffic and bound connection/request volume before it reaches PostgreSQL.

Read-only authentication/session/environment checks use the normal read budget, so ordinary page navigation does not consume the sign-in/code-attempt allowance.

Public `/_next/image` requests use a separate bounded budget of 1200 requests/minute per application instance. They never call the database-backed API limiter or require its secrets. Applying that dependency to public images caused 503 responses when connected API limits were unavailable; this was corrected on 2026-11-10. Next.js retains its narrow remote-source allowlist, decoding/resource limits and caching. The local image budget is not distributed; configure deployment-wide image traffic limits at the hosting ingress. Regression checks cover database/secret outages and a real local image passing through optimization and browser decoding. CDN fixtures remain isolated from external networking during the automated suite.

Do **not** enable arbitrary `X-Forwarded-For` trust. Supported configured headers are `cf-connecting-ip`, `x-vercel-forwarded-for` and `x-real-ip`; each must contain one valid address. The selected ingress must overwrite the header, and direct origin access must be blocked. Verify that property on the actual host. Chains, malformed or missing addresses use a shared visitor bucket. An unset/unsupported header also uses that conservative shared bucket, which can limit unrelated visitors together. The independent whole-store budget remains active. IPv6 addresses are canonicalized; this is not IPv6 subnet aggregation or bot identity assurance.

The database stores a daily rotated HMAC of the endpoint group and network address, counts and expiry, rather than raw IPs, emails, cookies or query strings. Expired buckets are removed in bounded batches by the scheduled worker. Network budgets supplement authentication/ownership; they never establish identity. Infrastructure denial-of-service protections, bot controls, provider spending alerts and Google key/domain restrictions still require operator configuration. The public browser Maps key cannot be treated as a server secret or protected solely by these application routes.

### Body and execution limits

The API wrapper reads and counts actual bytes before downstream parsing, including requests without honest `Content-Length`. Authentication is limited to 16 KiB, normal APIs to 200,000 bytes, CSV import to 6 MiB and image upload to 12 MiB of multipart/request data. The existing image processor independently enforces its stricter 5 MiB source-image limit and decode/pixel limits. CSV and checkout retain their own semantic limits. Other methods and unsigned webhooks are not exemptions.

Configure smaller/equal host body limits where appropriate, plus header/connection/read/execute timeouts. The application byte limit does not prove resistance to slow connections or establish hosted execution limits. The shared limiter itself consumes database capacity; edge/WAF limits are still required before origin traffic.

## Security headers and caching

The middleware generates a fresh nonce, overwrites incoming nonce/CSP request headers and passes the nonce to Next.js and the layout's fixed theme script. Production scripts use the nonce and `strict-dynamic`; `unsafe-eval` is limited to development. Inline styles remain allowed for the existing React/map UI. The CSP restricts objects, frames, base URIs, form targets and the configured image/map/payment hosts. It is enforced, not merely report-only. The previous narrow remote image host list remains unchanged.

Nonce-bearing pages are dynamically rendered and sent with private/no-store caching. This intentionally changes the previous static-page optimization; measure latency and hosting cost in staging. It does not introduce user-specific HTML caching. JSON endpoints retain their own response-cache contracts; private/error data remains no-store. Static assets bypass the page middleware, while all API paths (including filenames with image suffixes) and `/_next/image` are explicitly matched.

Relevant framework guidance: [Next.js CSP and dynamic rendering](https://nextjs.org/docs/app/guides/content-security-policy). Validate actual hosted HTML, script nonces, navigation, maps, admin uploads, payment redirects, HTTPS/HSTS and proxy behavior before rollout. Local builds and dummy browser tests cannot establish deployed TLS/WAF behavior or live third-party compatibility.

## Privacy request handling

Open `/privacy/requests` or use the privacy policy page's link. A customer signs in, sends/verifies a fresh code to the account's verified contact, then downloads data or submits a request. The server checks the actual account session and verification expiry on each sensitive action. Requests cannot choose another customer by email, identifier or query parameter. Guest customers use verified store support for identity/ownership assessment; entering an order number alone is not sufficient.

Self-service JSON includes the public profile/address/preferences, owned order summaries, saved builds, reviews, wishlist, verified stock subscriptions and customer-visible privacy request history. It excludes credentials, raw payment/provider records and internal review notes. The page and download disclose that this is **not a complete data-subject access response**. Order lines, returns, communications, provider records and other sources require an access request and staff review. Each collection has a 1000-record bound and the output a 5 MiB bound; larger results fail explicitly and require assisted preparation. There is no silent partial export, public export URL or emailed download.

Access, correction and erasure requests are durable, with one open request per kind/customer. Duplicate submissions return the existing open case. At most five new cases per customer/day are allowed in addition to HTTP limits. Customers can see their most recent 100 requests. Only `SUPER_ADMIN` has privacy read/manage and operations-read permissions by default. In Admin → Orders, the operations panel shows the oldest 100 open cases so closed history cannot hide pending work.

Staff must start review before recording completion or refusal, supply a customer-visible response, and record a separate internal evidence reference. Events are append-only for the application service role. Customer responses/downloads omit that evidence and staff identifiers. The completion control records an action already performed; it does **not** erase data, change identity, send an export, contact providers or certify that erasure happened. Evidence references should point to an access-controlled case record; do not paste passwords, identity documents or unnecessary personal details into notes.

### Staff procedure

1. Verify identity and ownership using the signed-in case and any necessary additional checks. Never send data to a replacement address without verifying the change.
2. Identify all relevant data sources and third-party processors. Collect only the requesting person's records and remove unrelated third-party data.
3. Check legal/financial/warranty retention, open orders/returns/disputes, fraud evidence and any legal hold. Record a reason and scope for retained records. Do not infer a legal retention period from this document.
4. Carry out the approved access, correction or erasure action using a reviewed runbook and appropriate backup/rollback controls. Revoke affected sessions and reconcile provider-side records where required. Complete a second-person review for destructive actions.
5. Deliver the verified response securely, record the evidence reference and customer-visible outcome, then mark the case completed or declined. A scoped account download alone does not close a complete access request.

Automatic erasure and a general business-data purge job are deliberately absent while merchant retention rules remain undecided. That is an outstanding operational gate, not an implemented deletion service. Statutory response periods, lawful bases, processor terms, cross-border processing and the final published privacy text need business/legal review. See the existing [starter policy review](localisation-and-policies.md).

## Retention decisions to approve

| Data | Current local behavior | Owner decision/evidence still needed |
| --- | --- | --- |
| API network counters | Minute expiry; worker removes expired rows in bounded batches | Verify cleanup cadence and ingress-log retention |
| Authentication sessions | Existing access expiry; worker removes expired session rows | Hosted Auth/provider session and security-event retention |
| Authentication attempt counters | Existing authentication limiter behavior | Review separate auth-counter housekeeping and retention |
| Profiles, saved addresses, marketing preferences | Kept until reviewed correction/erasure action | Purpose, retention duration, withdrawal/deletion procedure |
| Orders, financial snapshots, payment/refund/shipping evidence | Retained; no automatic purge | Applicable record periods, legal holds and reconciliation needs |
| Queue payloads and provider requests | Existing durable operational storage, including needed recipient data | Completed/failed job retention and reviewed redaction/purge procedure |
| Privacy cases, staff audit and incident evidence | Protected records retained | Case/audit retention, access reviews and destruction procedure |
| Application, hosting and provider logs | Application fields minimized; host/provider settings unchanged | Actual retention, redaction, access, export and alert configuration |
| Backups and catalog objects | No hosted changes | Backup schedule, encryption/access, expiry and verified restore evidence |

The only new automated cleanup removes already-expired API counters and authentication sessions. It does not delete order, customer, queue, privacy or audit evidence. Marketing consent stays separate from essential order processing. Provider-side copies and backups must be included in an approved erasure/retention policy; the application cannot promise immediate removal from them.

## Monitoring and incident response

`GET /api/health` remains the no-store database readiness probe. `GET /api/admin/operations` requires operations permission. `GET /api/internal/operations` requires `Authorization: Bearer <OPERATIONS_MONITOR_SECRET>`; query-string secrets are rejected. The private monitor returns 200 for healthy worker/queue conditions and 503 when attention is required. Unexpected/server-failure bodies are sanitized; use the staff panel for counts and the request-ID header for investigation. Private monitoring must never become a public metrics feed.

Current attention rules are: no completed worker within three minutes, a failed/incomplete latest run, blocked/review/dead jobs, pending/retry work overdue by ten minutes, or an expired running lease. Open privacy counts and oldest unreviewed age are visible; no legal deadline is inferred or automatically enforced. A worker pass is not a release attestation. The panel explicitly leaves hosted restoration unverified, and marketplace writes remain disabled.

Configure an independent monitor to call readiness and the private monitor every minute, notify a designated operator on failure/staleness, and test alert delivery. Monitor sustained 429/5xx rates, queue age, provider failures, storage/DB errors, dependency advisories and budget/spend. There is no new Slack/email/WhatsApp alert send and no external monitoring service was configured. Infrastructure monitoring should still detect limiter/DB outages when application handlers cannot run.

Application events contain a generated request ID, broad area, method, status and duration. Raw request bodies, full URLs, query strings, contacts, order/customer identifiers, cookies, auth headers, OTPs, error stacks and provider payloads are excluded. Legacy raw console calls were replaced with safe events, and unexpected/server-error responses have generic messages with correlation IDs. Infrastructure/framework/provider logs require separate configuration: access logs may otherwise contain query tokens or addresses even though application events do not. Restrict log access and use case records rather than copying personal payloads into logs.

Incident procedure: designate an incident lead; record detection/time/scope in a restricted case; stop affected new operations at the ingress/provider configuration; preserve relevant evidence; revoke compromised sessions and rotate affected credentials; determine impacted records and provider outcomes; recover in isolation; validate financial/inventory invariants; then reopen service after approval. Assess required notifications with the responsible business/legal owner. Do not blindly replay uncertain payment, refund, courier or notification operations. Maintain a dated timeline and a follow-up review with prevention actions.

## Backup and restoration acceptance

The local test restores a disposable PGlite data-directory snapshot and verifies order header/line data, privacy evidence, schema readiness and browser-role denial. It does not test Supabase backups, Auth email/SMS settings, Storage bytes, external queues, hosting secrets or production recovery time.

Before live operation:

1. Choose and record recovery point and recovery time targets, backup schedule/retention, responsible operator and escalation contact. These business decisions remain unset.
2. Confirm the actual Supabase plan/backup availability and secure off-site copies appropriate to those targets. Inventory database, Auth, private Storage objects, configuration and external-provider dependencies separately.
3. Restore a selected backup into an isolated staging project. Disable/strip production provider credentials, schedulers, webhook deliveries and external sends **before** restored jobs can run. Restored SQL triggers/cron/integrations also need review; do not expose a clone to production callbacks.
4. Restore catalog Storage bytes as well as metadata, verify sample hashes/retrieval and privacy of the bucket, then run schema/permission checks, customer/staff ownership tests and a dummy/sandbox transaction/return.
5. Compare counts, order lines/totals, inventory reservations, financial and provider evidence, privacy/audit records and job/outbox states against the selected recovery point. Reconcile unknown provider outcomes instead of retrying charges, refunds or bookings blindly. Revoke/expire restored sessions as appropriate.
6. Record actual restore duration and observed data loss, source backup identifier, target-project identifier, object evidence, test results, exceptions and reviewer approval. Repeat on the chosen schedule and after material changes.

Supabase documents that [database backups omit Storage object bytes](https://supabase.com/docs/guides/platform/backups); see also [restoring into a new project](https://supabase.com/docs/guides/platform/clone-project). A local schema pass or an available backup is not evidence of a successful hosted restore.

## Dummy walkthrough and validation

Run `npm run dev:demo`. Sign in as a seeded dummy customer, open `/privacy/requests`, send a fresh code and use the displayed **simulated** code. Download account JSON, submit an erasure request for review, and check its status. No real email/SMS, external export or erasure occurs. Sign in as `SUPER_ADMIN`, open Orders and inspect Operations & privacy review. Start a review with test notes; support/catalog/fulfillment roles cannot manage privacy cases. Existing dummy payments, shipments, uploads and background jobs remain testable. If you deliberately exceed a demo HTTP budget, wait for the next minute or restart that isolated demo server.

Run `npm run validate`. New tests exercise pseudonymous budgets and denial/outage behavior, trusted-header parsing, actual byte bounds, safe diagnostics, route coverage, fresh verification, cross-user/privacy-role denial, export limits and migrated columns, deduplicated/transactional case review, expired-state cleanup and an actual disposable snapshot restore. Desktop/mobile journeys cover the customer verification/download/request path and staff review in addition to existing checkout/payment/upload flows. Tests use stripped credentials and blocked external networking.

Keep the [release evidence checklist](release-evidence.md) as the record of what has actually been verified. All external evidence entries begin as pending; none should be marked passed from a local dummy run alone.

Local validation on 2026-11-09 passed: **654 unit/API/SQL/security tests**, TypeScript, production compilation and **12 desktop/mobile browser journeys**. Passing reports are `validation-results/2026-11-09T08-07-44-569Z-unit`, `validation-results/2026-11-09T08-10-38-625Z-build` and `validation-results/2026-11-09T08-12-00-493Z-browser`. They are local generated artifacts; earlier development runs are retained separately. No hosted/provider acceptance is inferred from these results.

The 2026-11-10 image/English correction passed **655 automated tests, TypeScript, production compilation and 14 desktop/mobile journeys** in `validation-results/2026-11-10T09-40-52-052Z-all`. Browser checks now decode a real optimized local image without interception and confirm English despite an old Indonesian cookie. Separate read-only browser inspection of the existing local server confirmed actual external product photographs render through the optimizer. Hosted launch gates remain separate.
