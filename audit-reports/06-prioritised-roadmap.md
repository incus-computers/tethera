# Prioritised roadmap

Recommendations only. No fixes, migrations, deployments or production changes were implemented. Effort: S = small bounded change, M = several related changes, L = cross-layer workflow work, XL = multiple coordinated systems. Relative effort is not a delivery estimate.

## P0: release blockers

| Order | Workstream / IDs | Business impact | Effort | Dependencies / exit evidence |
|---|---|---|---|---|
| 1 | Authentication, sessions, RBAC and ownership: 001,003,004,020–023,034 | Prevent takeover, customer-data exposure and unauthorised writes | XL | Identity provider, staff/customer mapping, credential rotation; complete route permission matrix and negative tests |
| 2 | Dependency applicability and patching: 025 | Remove applicable critical framework risks | L | Supported version choice and deployment inventory; advisory review plus clean install/build/regression |
| 3 | Durable schema and fail-closed storage: 011,026 | Ensure accepted orders/features actually persist | L | Migration review/bootstrap, backups before later deployment; database failure cannot return mock success |
| 4 | Trusted checkout and request idempotency: 005,006,007 | Protect prices, shipping and duplicate purchases | L | Authoritative SKU/build/service/package data; same key yields one order, strict IDR/input tests |
| 5 | Atomic inventory and payment transitions: 007,008,017 | Prevent oversell, double holds and stock inflation | XL | Order-linked reservation ledger and complete schema; concurrent last-unit and rollback tests |
| 6 | Genuine Midtrans creation, evidence and recovery: 002,009,010 | Prevent unpaid fulfilment and lost captured money | L | Correct order amount/stock contract; sandbox secrets, durable attempt/inbox and reconciliation tests |
| 7 | Least-privilege database policies/functions: 019 | Protect direct API/database trust boundary | M | Role/grant/RLS inventory; cross-user and function execution tests with actual staging roles |
| 8 | Biteship authenticity, honest booking, dispatch idempotency: 012–014 | Prevent falsified/duplicate/unpaid shipments | L | Paid-state machine, operation ledger, configured secret header; unknown-outcome recovery tests |
| 9 | Real refunds and bounded physical recovery: 016,017 | Correct customer money and returned stock | L | Provider payment attempts and inventory ledger; partial/repeated refund/restock invariants |

P0 activities can overlap where independent, but no release should precede all applicable gates. Protecting the existing deployment, if any, is an operator action; this audit made no external changes.

## P1: major correctness and operational work

| Order | Workstream / IDs | Impact | Effort | Dependencies |
|---|---|---|---|---|
| 10 | Accurate destination/packages/insurance and split allocations: 015,018 | Prevent misdelivery/overshipment/freight disputes | L | Catalog physical metadata and fulfilment allocation locks |
| 11 | Integer-IDR assembly/tax/discount reconciliation: 027,028 | Avoid overcharges, broken vouchers and misleading invoices | M–L | Authoritative snapshot model; merchant-specific tax review |
| 12 | Durable notifications, marketplace sync, expiry and reconciliation: 030 | Recover from provider/network/process failures | L | Transactional outbox, worker infrastructure and monitored queues |
| 13 | Repeatable tests and CI: 033 | Reproducible evidence of release readiness | M | Pinned runner, isolated database and sandbox environment without live secrets |
| 14 | Safe media processing and storage: 024 | Restrict active content and bound upload resources | M | Media policy, durable object storage and headers |
| 15 | Query scalability: 029 | Correct complete pagination and acceptable latency | L | DB indexes/queries/joins; representative volume and measurements |
| 16 | Localisation, valid contact/location and policies: 031 | Improve Indonesian usability and support clarity | L | Verified contact data, Bahasa content and operational/legal policy owners |
| 17 | Abuse/privacy/observability/deployment evidence: 032 | Bound costs and establish protection/recovery evidence | L | Infra access, retention/incident/backup policy and WAF/logging configuration |

## P2: improvements after transactional release gates

- Serial-number intake/dispatch/RMA linkage; SKU-level warranty dates and evidence. Impact high for operations; L; depends on inventory/returns lifecycle.
- Expand structured specifications and compatibility (BIOS/CPU generation, cooler/radiator/case clearances, power connectors, motherboard form factor). L; depends on catalog taxonomy and server checks.
- Improve mobile accessibility, measured Core Web Vitals, image budgets and caching from actual profiling. M–L; no fabricated performance score.
- Harden administrative audit immutability, event history, operator exception queues and reconciliation dashboards. L; depends on trustworthy identity and durable events.
- Improve saved builds, multi-device cart continuity and quote expiry/repricing. M–L; depends on sessions and authoritative monetary snapshots.
- Complete stock-alert delivery/consent/preferences and policy request operations. M; depends on outbox and privacy design. If alerts are advertised for launch, their operational completion belongs in P1.

## P3: optional product differentiation

Component comparison (M), formal B2B quotation/approval (L), advanced benchmark configurator (L–XL), richer bundle campaigns and merchandising experiments (M). These are business choices, not asserted competitor parity blockers. Establish demand/operational ownership before committing.

## Release gates

1. No source-known/demo authentication and no unauthenticated sensitive mutation; cross-account access denied.
2. A production-mode process fails startup or transactional requests on missing keys/schema/storage; no synthetic payment/shipping success.
3. Price, quantity, tax/discount and shipping snapshot invariants pass; repeat checkout returns one order.
4. Actual staging Postgres tests prove reservation/settlement/cancel/refund/allocation invariants under retries and concurrency.
5. Midtrans and Biteship sandbox evidence proves remote/local failure recovery, event ordering and verification.
6. Notifications, reconciliation and reservations survive worker restart; operators can see failed/unknown operations.
7. Applicable dependency issues resolved, mobile/browser regression complete, monitoring/restore/privacy evidence reviewed.

## Canonical finding queue

| ID | Priority | Severity | Confidence | Effort | Title |
|---|---|---|---|---|---|
| AUD-001 | P0 | Critical | Verified | L | Administrator identity is forgeable |
| AUD-002 | P0 | Critical | Verified | L | Public payment routes mark unpaid orders paid |
| AUD-003 | P0 | Critical | Verified | L | Customer login skips missing passwords and has no verified session |
| AUD-004 | P0 | Critical | Verified | L | Account APIs trust caller-selected identities |
| AUD-005 | P0 | Critical | Verified | L | Builds and unknown products use client prices |
| AUD-006 | P0 | High | Verified | M | Shipping fees and quantity validation are untrusted |
| AUD-007 | P0 | High | Verified | L | Checkout ignores failed reservations and leaks non-atomic holds |
| AUD-008 | P0 | High | Verified | L | Payment procedure double-reserves and is not atomic on business failure |
| AUD-009 | P0 | High | Verified | M | Midtrans evidence lacks amount binding and secret failure is open |
| AUD-010 | P0 | High | Verified | L | Webhook retries and event ordering are unsafe |
| AUD-011 | P0 | High | Verified | L | Database failures silently accept volatile mock writes |
| AUD-012 | P0 | Critical | Verified | M | Biteship webhook permits unauthenticated order/total mutations |
| AUD-013 | P0 | High | Verified | M | Biteship failures become simulated success |
| AUD-014 | P0 | High | Verified | L | Dispatch lacks payment gate, duplicate lock and recovery |
| AUD-015 | P1 | High | Verified | L | Booking uses fixed package weight and loses destination identifiers |
| AUD-016 | P0 | High | Verified | L | Refunds are simulated and repeated restocking inflates stock |
| AUD-017 | P0 | High | Verified | L | Cancellation inflates stock and omits build components |
| AUD-018 | P1 | High | Verified | M | Split fulfilment allows foreign lines and over-allocation |
| AUD-019 | P0 | High | Probable | M | Supplied RLS and privileged payment function are overly permissive |
| AUD-020 | P0 | High | Verified | M | Homepage administration has no authorisation or durable storage |
| AUD-021 | P0 | High | Verified | M | OTP code is returned to requester and logged |
| AUD-022 | P0 | High | Verified | L | Cart, wishlist, reviews and RMA trust supplied identities |
| AUD-023 | P0 | High | Verified | M | Invoice endpoint can send private order details to arbitrary recipients |
| AUD-024 | P1 | Medium | Probable | M | Active SVG uploads lack content/size isolation |
| AUD-025 | P0 | Critical | Verified | L | Dependency audit reports critical framework advisories |
| AUD-026 | P0 | High | Verified | L | Feature models do not match supplied database schema |
| AUD-027 | P1 | Medium | Verified | M | Assembly fees can double-count and tax snapshots do not reconcile |
| AUD-028 | P1 | Medium | Verified | M | Redemption is non-atomic and checkout loses promotion eligibility |
| AUD-029 | P1 | Medium | Verified | L | Unbounded collection scans precede filtering and pagination |
| AUD-030 | P1 | High | Probable | L | Durable notification and reconciliation processing is not established |
| AUD-031 | P1 | Medium | Verified | L | Localisation, accurate contact and policy workflows are incomplete |
| AUD-032 | P1 | Medium | Potential | L | Abuse, privacy and deployment hardening controls lack evidence |
| AUD-033 | P1 | Medium | Verified | M | Existing tests lack a reproducible declared runner |
| AUD-034 | P0 | High | Verified | M | Legacy admin routes bypass granular permissions and transition rules |

All entries are Open. Acceptance requires the behaviour in the findings' remediation plus the relevant report-07 tests; a passing compilation alone does not close a finding.
