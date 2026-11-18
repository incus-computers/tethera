# Step 12: durable background processing (AUD-030)

Order/payment state changes now save notification intents in the same database transaction. PostgreSQL triggers cover genuine gateway settlement, unpaid cancellation/expiry, fulfillment status and refund status changes. The demo mirrors this transaction/rollback behavior. Request handlers no longer fire off receipts or subtract marketplace stock in unawaited promises. A payment succeeds independently of whether an email provider is currently available, but failure to save the notification intent rolls the local transaction back so evidence/reconciliation can retry it.

## Queue and recovery

`background_jobs` stores a unique event key, kind, private payload, resource, state, attempt count, due time, lease token, frozen provider request, remote-attempt timestamp and provider acceptance ID. `background_job_events` records attempts/outcomes and operator repair reasons. `worker_runs` records heartbeats/completion. The three tables are private, RLS enabled, readable by the service role and writable only through reviewed service-only functions. Browser roles cannot read payloads, claim work or acknowledge jobs.

A worker claims one due job using a short database claim lock, `FOR UPDATE SKIP LOCKED` and a 90-second lease. The provider request is persisted before the network call. Finishing requires the current, unexpired lease token; an old worker cannot acknowledge another worker's job. Provider calls have an 8-second timeout. The worker processes up to 10 jobs, stops starting more after 35 seconds, and has a 60-second route duration. Recurring provider checks process one candidate each time; measure/tune deployment capacity before live traffic. This is a correctness foundation, not a high-throughput queue service.

Retries use 30-second exponential backoff up to one hour, with six attempts. Configuration failures become `blocked`; rejected requests become `dead`; uncertain unsafe outcomes become `review`. Exhausted attempts that may already have reached a provider also require review. Private worker metadata distinguishes queued/running/retry/accepted/simulated/blocked/review/dead/cancelled. `accepted` means the task completed or a provider accepted the request, not that a person received/read the message.

Email uses a stable Resend idempotency key (`job/<saved-job-id>`) and the identical saved sender/recipient/subject/HTML on retries. Resend documents a 24-hour retention window; the worker stops automatic sending after 23 hours from the first remote attempt and requires review. It never silently generates a new key for an uncertain send. Response IDs are acceptance evidence. Delivery/bounce/read webhook tracking is not implemented and no delivery claim is made. See [Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).

WhatsApp uses an explicitly configured Graph API version and approved utility template, with body parameters `[order number, event status]`. It is disabled by default. Only customers with stored WhatsApp preference and a valid Indonesian phone are eligible; guests are skipped. Merchant consent records, actual template approval, provider version/account acceptance and staging delivery must be verified before enabling it. Existing client-side inquiry links remain separate. WhatsApp has no assumed deduplication guarantee here: a lost response or abandoned remote-attempt lease is parked for review and is never blindly resent. Meta's current documentation could not be retrieved during this implementation; the adapter has offline HTTP fixtures, not claimed live provider acceptance. See [Meta WhatsApp documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/).

SQL-trigger intents cover new events only. Historical unprocessed `payment_outbox` entries are imported as **review**, not automatically emailed. The old `delivered_at` column is not repurposed to claim message delivery; new `expanded_at` marks outbox expansion. Operator review jobs for disputed payments require reconciliation of money/stock, not a retry of a receipt.

## Marketplace decision pending

The user has explicitly left Ginee/Jubelio selection undecided. Real outbound writes and inbound inventory application remain disabled. Existing stock changes generate saved mapping-specific sync intents. Dummy workers calculate **absolute available stock minus buffer**, including canonical variant stock, and record a simulated result. Replayed inbound dummy events require a durable event ID, preserve zero stock values and enter review without overwriting physical stock. This prevents webhook echoes and unreviewed external stock authority from changing on-hand counts.

The old guessed endpoints/relative `SUBTRACT` calls were removed. No worker can repeatedly deduct stock after a retry. Before enabling a chosen service, implement and accept its official authentication, warehouse/account/variant mapping, source-of-truth contract, absolute-value ordering and unknown-outcome reconciliation. Ginee's documented signing and overwrite endpoint differ from the removed guesses: [API security](https://doc.ginee.com/_get_started.html), [available-stock update](https://doc.ginee.com/api/warehouseInventory/_available_stock_update.html). No Ginee or Jubelio connection or live API request was made. Pending sync jobs can be inspected now and retried only after the chosen adapter is implemented/configured.

## Stock alerts

Stock-alert signup now requires a signed-in verified email. The server chooses the recipient from the verified session; browser-supplied email/phone/owner fields cannot redirect messages. Variants must belong to the active product. Legacy unverified subscriptions stay inactive until the customer signs in and requests the alert. No verification fact is backfilled.

The scanner checks active products, actual available stock after holds and active canonical variants. A parent product with variants requires the relevant variant subscription. It queues one job per subscription and marks `notified_at` only when that send is accepted (or simulated in demo), not at scan time. Unavailable stock or a failed provider keeps the alert unsent. Stock can change before checkout; an alert does not reserve units.

## Staff operation and dummy tests

The Orders tab includes **Background jobs & notifications**. Super admins can retry a failed job, resolve a provider-reviewed outcome or cancel queued work, with a required reason. Support/fulfillment roles can inspect a redacted queue; catalog staff do not have queue access. Payloads/HTML/recipient contacts are not included in this overview. Retries of unsafe remote attempts and email attempts outside the idempotency window are refused. Resolve only after checking the provider/money/stock outcome; resolving a queue entry does not correct the underlying financial state automatically.

1. Start `npm run dev:demo`. Data and jobs are isolated in memory. No actual payments, emails, WhatsApp messages or marketplace requests occur.
2. Sign in to demo admin as `super_admin@demo.example` using the demo password shown by the application. Open Orders and the background-jobs panel.
3. Make a dummy checkout and simulated payment. The invoice job is saved once; repeating payment confirmation does not add another receipt. The local worker ticks every 15 seconds, or select **Run dummy worker now**.
4. Refresh the panel. The receipt becomes `simulated`; guest WhatsApp jobs are skipped/cancelled because a preference is unavailable. Requesting another invoice queues it, rather than claiming it was delivered.
5. Sign in as a demo customer, request a stock alert for a product/variant, and change its available inventory in admin. The scan queues the alert (up to one minute later); the worker simulates acceptance. Use **Run dummy worker now** to scan immediately.
6. Automated tests inject storage/provider failure, abandon leases and re-create worker instances. Do not inject failures against a live store. Run `npm run test:jobs` for these scenarios.

Restarting the **demo server** resets its memory; it is intentionally not a durable hosted environment. Worker restarts against the connected PostgreSQL tables preserve jobs, leases, payloads and attempt history. Offline PostgreSQL tests demonstrate that persistence/lease contract. Hosted multi-process, serverless runtime and provider sandbox acceptance still need their own staging evidence.

## Connected scheduler setup

The application does not install a production timer or silently modify external scheduler/provider settings. Configure a deployment scheduler to run `npm run jobs:run` **once per minute**. That command calls `POST /api/internal/jobs/run` using `BACKGROUND_WORKER_URL` and `BACKGROUND_JOB_SECRET` from the scheduler environment. The URL must be HTTPS (localhost HTTP is allowed for local testing); redirects are rejected. The secret must contain at least 32 random characters and be identical in the app and scheduler. Inject it through the host's secret store, not a command line or tracked file.

The route durably schedules reservation expiry, pending payment checks, shipment checks, refund checks and stock scans, then drains due jobs. It schedules at most one pending/running/retry job for each recurring kind, preventing a backlog of duplicate scans. Existing independently authenticated maintenance routes remain available; avoid installing redundant schedules. No external scheduler was configured during this work.

Set `NOTIFICATIONS_ENABLED=true`, a verified `EMAIL_FROM` and `RESEND_API_KEY` only after sender/provider staging acceptance. Enable WhatsApp separately with `WHATSAPP_ENABLED=true`, token, phone-number ID, reviewed `WHATSAPP_GRAPH_VERSION`, approved `WHATSAPP_ORDER_TEMPLATE` and language. All real sends are disabled by default. Provider choice for marketplaces remains pending regardless of other flags.

The queue panel reports a stale/missing worker completion after three minutes and shows blocked/review/dead counts. **A healthy database check is not proof the scheduler or providers work.** Configure external alerts for missed scheduler runs, oldest due-job age, repeated failures/review jobs and provider acceptance/delivery rates before live use. Install a monitored scheduler, rather than relying on an open browser or a developer computer. Configure private queue payload retention/redaction with the later privacy/operations step.

## Migration status

The user reported Step 11's migration and `database_ready = true` on 2026-11-07. Do not rerun the earlier migrations. The next prepared migration is:

`supabase/migrations/20261107100000_durable_jobs.sql`

The user reported applying it and receiving `database_ready = true` on 2026-11-07. This is user-reported verification; the assistant did not independently check the connected project. Do not rerun it blindly. It creates the queue and service-only routines, transactional triggers, stock-alert verification fields, marketplace variant mapping and security/readiness extensions. It runs as one transaction. Applying it sends no message or marketplace request. Review the target project and migration history before running it once in Supabase SQL Editor.

After successful application, run:

```sql
select public.application_schema_health() as database_ready;
select public.application_security_audit() as security_audit;
```

Expected: `true`, and an audit object with `ok: true`, `violations: []`. Connected schema readiness, configured jobs and successful provider acceptance are separate checks. Real payments and live tax setup remain subject to earlier deployment gates.

## Local acceptance (2026-11-07)

All 551 isolated regression tests passed, including SQL transaction rollback, lease expiry and fencing, frozen Resend requests, unknown WhatsApp outcome quarantine, queue permissions, recurring scheduling and verified stock-alert acceptance. TypeScript validation and the final credential-isolated production build passed (48 static pages). Dummy HTTP checks proved one receipt across repeated payment confirmation, simulated processing, idempotent queued resends, redacted staff views, role restrictions, verified-recipient stock alerts and replay/review of zero-stock marketplace events. Admin, product, checkout, success and Transactions pages returned successful HTTP responses. This was not a full interactive browser/mobile acceptance run. The temporary demo server was stopped. No connected migration, real payment, provider delivery or external scheduler setup was performed.
