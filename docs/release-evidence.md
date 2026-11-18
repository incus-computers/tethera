# Release evidence record

Status: **Not approved for production**. Steps 1-17 have local implementation work, and the user reported all migrations completed on 2026-11-09. Hosted acceptance and business-policy decisions remain separate. This file is a starting record, not a fabricated sign-off.

For each completed check record a date, operator/reviewer, exact target project/deployment identifier, sanitized evidence location and result. Keep secrets, customer exports, full logs and identity documents out of this repository.

| Gate | Current evidence | Required next evidence |
| --- | --- | --- |
| Target database | User reported all migrations completed, including Steps 15 and 17, on 2026-11-09; earlier readiness results covered Step 14 | Record target reference/applied versions and current readiness evidence; no independent connected verification or new readiness result was supplied with the latest confirmation |
| Local regression/build/browser checks | 2026-11-10: 655 tests, TypeScript, production build and 14 desktop/mobile journeys passed, including real local image optimization and fixed English; report paths in operations-and-privacy.md | Hosted CI checks/branch protection still need setup; retain CI artifacts for the release revision |
| Hosted Auth/MFA/ownership/RLS | Local negative and PostgreSQL role tests | Actual staging JWT/PostgREST tests and staff enrollment/access review |
| Hosted shared budgets | Local RPC tests and denial/outage fixtures | Multi-instance staging test, verified ingress header overwrite/origin restriction, 429/503 recovery and chosen limits |
| HTTPS, CSP, host time/body limits, WAF | Local CSP/header implementation and browser checks | Deployed headers/nonces/TLS checks, real map/payment compatibility and edge-limit tests |
| Merchant policies/contact/hours | Supplied Incus contacts/address; bilingual starters remain drafts | Merchant-approved final terms/retention/processors, true hours and effective version |
| Tax treatment | User undecided; connected tax confirmation disabled | Merchant-reviewed treatment/configuration and invoice acceptance |
| Payments/refunds | Dummy simulations and isolated provider fixtures | Midtrans sandbox lifecycle, callback/reconciliation/unknown-outcome acceptance; explicit production activation decision |
| Shipping/insurance/packages | Dummy and fixture workflows | Actual warehouse/package metadata and Biteship test quotes/booking/callback/insurance/split acceptance |
| Notifications and jobs | Durable queue, local worker, safe simulations | Minute scheduler, alert delivery, verified sender/templates/consent, restart/lease/provider acceptance |
| Media and Storage | Decoding/validation and private Storage fixtures | Hosted native image support, private-object retrieval across restart, legacy links/cache retirement |
| Query performance | Indexed/paged queries and bounded local fixtures | Representative staging query plans, latency, response bytes and mobile performance |
| Privacy access/correction/erasure | Owned requests, fresh verification, scoped export, reviewed event trail | Named owner, request-response/retention/hold rules, complete source inventory and assisted fulfillment drill |
| Logging and monitoring | Safe application events, request IDs and authenticated health/operations endpoints | Host/provider redaction and retention, restricted access, tested independent alert delivery/escalation |
| Backup and recovery | Actual disposable local DB snapshot restoration | Verified hosted database **and Storage bytes** restoration; record actual recovery point/time against approved targets |
| Incident response | Starting procedure in operations-and-privacy.md | Designated lead, secure case/evidence location and dated rehearsal |
| Marketplace | Deliberately undecided/disabled | Provider/stock authority and acceptance only when chosen |

## Restore drill record (complete only after a real isolated drill)

- Date/operator/reviewer: pending
- Source backup identifier and recovery point: pending
- Isolated target project: pending
- Proof production integrations/schedulers were disabled before use: pending
- Database/schema/roles/Auth check results: pending
- Storage object counts/sample hashes/private retrieval: pending
- Financial/inventory/outbox/provider reconciliation results: pending
- Dummy/sandbox purchase, refund and recovery evidence: pending
- Chosen RPO/RTO and actual observed loss/restore duration: pending
- Exceptions, remedial actions and approval: pending

## Incident rehearsal record

- Date/lead/reviewer and scenario: pending
- Detection and alert delivery evidence: pending
- Containment, credential/session response and evidence access: pending
- Recovery and reconciliation actions: pending
- Business/legal notification assessment: pending
- Actual elapsed times, gaps and follow-up owners: pending
