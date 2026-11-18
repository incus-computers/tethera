# Database migration status and deployment checklist

**Dummy-data project: migration completion reported by the user.**

**Latest confirmation (2026-11-09):** the user reported that all migrations have been completed, including Step 15 (`20261108100000_query_pagination.sql`) and Step 17 (`20261109090000_operational_controls.sql`). No migration remains pending for that project based on this report. A new `database_ready` result was not supplied with this confirmation, and the assistant did not independently connect to the project. Do not rerun completed migrations. The checklist below still applies to other target projects and to the remaining deployment checks.

After confirming the existing Supabase project contained only dummy data, the user manually ran each update from 20261106090000_verified_auth_sessions.sql through 20261106230000_least_privilege.sql in SQL Editor and reported success for all six files. They then ran `select public.application_schema_health() as database_ready;` and reported `true`. The original baseline and phase-2 tables already existed and were not rerun during this walkthrough.

This is user-reported verification for that project; its project reference was not recorded and the assistant did not connect to it independently. Do not rerun these migrations there blindly. Other target databases still need their own migration/version review. Earlier implementation documents describe what was deferred at their respective milestones, not this later manual completion.

Application connectivity, hosted customer/staff role tests, real sandbox payment acceptance and scheduler configuration remain unverified. Real payment activation remains deferred. Remind the user of these remaining gates before deployment or enabling real customers/payments.

**Step 8 migration completion reported by the user:** the user ran `20261106233000_biteship_dispatch.sql` in their dummy project and reported `database_ready = true` afterward. The earlier six updates remain completed. This is user-reported verification, not an independently connected SQL check. See [Biteship shipping](biteship-shipping.md) for demo testing and connected test acceptance.

**Step 9 migration completion reported by the user:** the user ran `20261107010000_refund_recovery.sql` and reported `database_ready = true` afterward. Updates through Step 9 are complete in their dummy project based on that report. Review [refunds and returns](refunds-and-returns.md) for dummy testing and sandbox acceptance.

**Step 10 migration completion reported by the user (2026-11-07):** the user ran `20261107040000_packaged_fulfillment.sql` and reported `database_ready = true` afterward. Updates through Step 10 are complete in their dummy project based on that report. The assistant did not independently verify the connected project. Review [packaged fulfillment](packaged-fulfillment.md) for the remaining provider/staging acceptance checks.

## Before staging or production

- [ ] Confirm the target project is the intended staging/production database and record existing migration versions.
- [ ] Take and verify a backup/restore point before changing an existing database.
- [ ] For a fresh project only, apply supabase/schema.sql once. Do not rerun the baseline over existing data: its seed upserts can overwrite configuration.
- [ ] Apply any unapplied migrations in this order:
  1. supabase/migrations/20261105_phase2_architecture_upgrade.sql
  2. supabase/migrations/20261106090000_verified_auth_sessions.sql
  3. supabase/migrations/20261106120000_durable_feature_storage.sql
  4. supabase/migrations/20261106150000_trusted_checkout.sql
  5. supabase/migrations/20261106180000_inventory_transitions.sql
  6. supabase/migrations/20261106210000_midtrans_attempts.sql
  7. supabase/migrations/20261106230000_least_privilege.sql
  8. supabase/migrations/20261106233000_biteship_dispatch.sql
  9. supabase/migrations/20261107010000_refund_recovery.sql
  10. supabase/migrations/20261107040000_packaged_fulfillment.sql
  11. supabase/migrations/20261107070000_financial_reconciliation.sql
  12. supabase/migrations/20261107100000_durable_jobs.sql
  13. supabase/migrations/20261107130000_safe_media_storage.sql
  14. supabase/migrations/20261108100000_query_pagination.sql
  15. supabase/migrations/20261109090000_operational_controls.sql
- [ ] Review duplicate auth-user links before unique indexes. No historical customer ownership or tax facts are invented/backfilled by these changes.
- [ ] Configure Supabase Auth, verified customer links and staff MFA per authentication-and-demo.md.
- [ ] Run the intentionally read-only connected check: npm run db:check -- --connected.
- [ ] Confirm /api/health reports ready, then run integration checks against isolated staging accounts and sandbox providers.
- [ ] Keep live payment activation blocked until the later payment/inventory/shipping release gates are complete.

The two Step 1/2 files use distinct timestamps to avoid duplicate migration versions. The earlier un-applied Step 1 filename was renamed accordingly.

## During current local development

Use npm run dev:demo. It selects isolated seeded memory explicitly, even if .env.local contains connected credentials. Run npm run test:db to validate migrations in disposable in-process PostgreSQL without connecting to a database. No migration is automatically applied by startup, readiness or tests.

Inventory lifecycle: see [inventory-transitions.md](inventory-transitions.md). Configure and monitor the authenticated expiry job before staging/live checkout. Historical orders without order-linked reservations require reconciliation.

Hosted gateway: follow [midtrans-gateway.md](midtrans-gateway.md) for sandbox validation, notification/return URLs, reconciliation scheduling and the remaining production gates. No provider or scheduler configuration was changed.

Step 7: review [database permissions](database-permissions.md) before applying the least-privilege migration. It replaces policies on the listed application tables, resets table/column ACLs, narrows service rights and removes their raw Realtime publication membership. Repeat role/JWT/PostgREST tests in isolated staging; local tests do not prove hosted role configuration.

Step 8: configure the actual warehouse origin, Biteship test credentials, callback custom header and reconciliation scheduler per [biteship-shipping.md](biteship-shipping.md). These external settings and actual provider acceptance remain unverified.

Step 9: configure sandbox refund capability, verify supported methods and provider confirmation/recovery, schedule authenticated refund reconciliation and accept the inspected-returns workflow per [refunds-and-returns.md](refunds-and-returns.md). New provider requests remain disabled by default; no external refund was issued.

Step 10: configure actual packed product/variant/assembled profiles and accept insured postal quotes, independent split bookings, aggregate tracking and unknown-outcome recovery per [packaged-fulfillment.md](packaged-fulfillment.md). This step does not activate insurance policies or physical courier pickups.

Step 11: [financial reconciliation](financial-reconciliation.md). The user reported applying `20261107070000_financial_reconciliation.sql` and receiving `database_ready = true` on 2026-11-07. It adds immutable financial snapshots and transactional voucher claims; historical financial/tax facts and voucher counters are not backfilled. Confirm the merchant's tax status and applicable product/service/shipping treatment before setting `TAX_POLICY_CONFIRMED=true`. The user is not yet sure of PKP status. Review historical counts and configure/monitor expiry so abandoned reservations release their voucher capacity. This does not enable live payments or create official tax invoices.

Step 11 migration status: the user reported running `20261107070000_financial_reconciliation.sql` and receiving `database_ready = true` on 2026-11-07. This is user-reported verification; the connected project was not independently checked. Do not rerun that migration blindly.

Step 12: [durable jobs](durable-jobs.md). The user reported applying `20261107100000_durable_jobs.sql` and receiving `database_ready = true` on 2026-11-07. Notifications are durable intents, not promises of delivery. Configure and monitor the authenticated worker schedule every minute before connected operations. Set the independent worker secret in both app and scheduler, configure a verified Resend sender and approve WhatsApp utility templates/consent before enabling sends. Run provider fixtures and hosted restart/lease/network acceptance in staging. The user has left marketplace provider selection undecided; real marketplace writes and inbound inventory application remain disabled. Review historical unprocessed payment outbox entries before manually retrying them. Legacy unverified stock subscriptions do not send automatically.

Step 13: [tests and CI](testing-and-ci.md). No database migration is required. Run `npm run validate`; after committing/pushing through the normal repository workflow, inspect both hosted GitHub Actions jobs and configure them as required branch checks. Local execution does not establish a hosted CI pass, staging/provider acceptance or branch protection. Unit/API/SQL tests and browser journeys use isolated fixtures; do not put live credentials in CI. Marketplace choice and live tax configuration remain pending.

Step 14: [safe media uploads](media-uploads.md). Apply `20261107130000_safe_media_storage.sql` once after durable jobs, then verify `application_schema_health()` is true. It creates the private catalog bucket and immutable acceptance records, blocks direct browser access even under broad Storage policies, and extends readiness. The user reported applying this migration and receiving `database_ready = true` on 2026-11-08. This is user-reported verification; the connected project and hosted Storage behavior were not independently checked. Re-upload legacy local images, replace their links and purge previously published upload caches. Prove upload/retrieve after staging restart, native Sharp support, hosting body/time limits and unrelated bucket access before rollout. Review uncertain uploads/orphans through Storage rather than deleting metadata directly. Dummy uploads require no migration and reset on demo restart.

Step 15: [indexed queries and bounded pagination](query-pagination.md). The user reported `20261108100000_query_pagination.sql` completed on 2026-11-09; do not rerun it in their project. The migration adds a service-only collection RPC, stable filtering/paging/aggregates and query indexes; required function/index drift makes readiness false. Completion is user-reported; the connected project was not independently checked. Inspect representative staging query plans, latency/response bytes and mobile CWV; local large fixtures and an index-eligibility test do not establish hosted performance. Plan index-build locking for a large dataset. Account/admin paging and dummy environments remain testable. Interactive CSV exports are bounded and are not archival snapshots. Admin overview figures disclose page scope; static fixture-based component/builder merchandising is unchanged. Marketplace provider and live tax decisions remain pending.

Step 16: [localisation, contacts and starter policies](localisation-and-policies.md). No new SQL migration. The supplied Incus Computers name, WhatsApp, email and collection address are configured locally; opening hours and legal registration have not been confirmed. Review both language versions of the starter privacy, purchase, warranty/returns and shipping policies, finalize actual retention/processor/cancellation/complaint terms, and resolve the proposed seven-day reporting and return-shipping rules. Replace draft wording, set a new version/effective date and responsible reviewer before setting `policiesReviewed: true`. New connected checkout is blocked until review; collection also needs real hours. Test acknowledgement and owned-order return requests in staging alongside prior gates. Dummy transactions remain available without publishing live terms. The user subsequently reported all migrations completed on 2026-11-09; a UI pass alone does not verify hosted behavior.

Step 17: [operations and privacy](operations-and-privacy.md). The user reported all migrations completed on 2026-11-09, including `20261109090000_operational_controls.sql` and Step 15. No new readiness result was included and the connected project was not independently checked. Do not rerun completed migrations. Set independent `ABUSE_HMAC_SECRET` and `OPERATIONS_MONITOR_SECRET`, verify any trusted ingress IP header/origin restriction, configure independent monitor alerts and run the existing authenticated worker every minute. Verify deployed nonce CSP/TLS/WAF/body/time limits and measure the dynamic-rendering cost. Assign privacy/incident/retention owners, test complete assisted privacy fulfillment and perform a hosted isolated restore of database plus Storage bytes. Only expired security sessions/counters are cleaned automatically. Local fixtures/restore tests do not establish external acceptance. Maintain [release-evidence.md](release-evidence.md) before approving live customers or providers. Dummy transactions remain available without connected setup.
