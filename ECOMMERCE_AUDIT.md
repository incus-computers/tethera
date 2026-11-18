# E-commerce Website Audit — Agent Instructions

## Role and goal
Act as a senior **application security engineer, e-commerce architect, QA engineer, and product analyst**. Audit this repository for security vulnerabilities, business-logic defects, missing functionality, and production-readiness gaps. Compare its capabilities with relevant Indonesian electronics/PC retailers. **Audit first; do not change application code without explicit approval.**

## Business context
- Store: Indonesia-only online retailer of PCs, components, peripherals, and electronics.
- Currency: IDR; language and address/payment/shipping expectations: Indonesia.
- Payment gateway: **Midtrans**.
- Shipping/fulfilment integration: **Biteship**.
- Competitor candidates: Enter Komputer, Nano Komputer, COC Komputer, Pemmz; use Tokopedia/Shopee only as broader UX benchmarks.
- Discover the actual stack, architecture, features, and integrations from the code. Do not assume they exist or work.

## Audit scope

### 1. Architecture and security
Map frontend, backend, database, authentication, permissions, APIs, environment configuration, deployments, webhooks, background jobs, and admin tools. Review:
- OWASP Top 10 / API Top 10 issues: broken access control (including IDOR/BOLA), injection, XSS, CSRF, SSRF, unsafe uploads, insecure redirects, and information leakage.
- Authentication, sessions, password resets, admin access, role enforcement, rate limiting, and server-side input validation.
- Secrets, dependency vulnerabilities, CORS, security headers, TLS, logs, sensitive customer data, and relevant Indonesian privacy requirements (including UU PDP).
- Whether customer/admin/API actions are authorised **server-side**, not merely hidden in the UI.

### 2. Financial and transactional integrity — highest priority
Trace **product → cart → checkout → payment → inventory → order → shipment → delivery/refund**. Investigate:
- Server-authoritative prices, discounts, quantities, shipping fees, IDR rounding, and stale checkout data.
- Overselling, concurrent purchases, stock reservation/deduction/restoration, duplicate submissions, and atomic database operations.
- Valid order state transitions; failures, cancellations, expirations, refunds, and partial fulfilment.
- Retries, idempotency, race conditions, and recovery after partial failures.

### 3. Midtrans
Verify the implementation against applicable **current official Midtrans documentation**:
- Payment creation, amount integrity, unique transaction IDs, sandbox/production separation.
- Notification authenticity/signature checks and server-side payment-status verification; never trust browser redirects as payment proof.
- Duplicated, delayed, missing, or out-of-order notifications; pending, settlement, expiry, cancellation, failure, and refund handling (as applicable).
- Reconciliation between Midtrans and local orders, audit trails, and protection against falsely marking an unpaid order as paid.

### 4. Biteship
Verify the implementation against applicable **current official Biteship documentation**:
- Indonesian address/location identifiers, delivery coverage, courier/service availability, and error handling.
- Rates based on actual and volumetric weight, dimensions, multi-item orders, bulky/fragile electronics, and insurance where applicable.
- Shipment creation only at the appropriate order state; duplicate prevention; tracking, cancellation, webhook validation, and status syncing.
- API outages, timeouts, stale quotes, unsupported destinations, and remote success followed by local database failure.

### 5. Functional and competitive gaps
Inventory existing storefront, checkout, customer account, and admin functionality. Test normal flows and edge cases: search, filters, categories, specifications, variants, cart, checkout, order history, tracking, returns, refunds, product/inventory/order management, and mobile UX.

Evaluate PC-specific features by **business value**, not just competitor parity: detailed specifications, compatibility filters, component comparisons, PC builder, bundles, prebuilt systems, warranty/RMA, serial tracking, and quotation workflows. Check Indonesian localisation: Bahasa Indonesia, IDR, phone numbers, addresses, timezone, WhatsApp support, payment options, and fulfilment experience.

Research competitor websites when browsing is available. Compare verified features and customer expectations; mark inaccessible or unconfirmed features **Not verified**. Distinguish critical parity gaps from optional enhancements.

### 6. Performance and reliability
Review Core Web Vitals, images/bundles, mobile performance, database indexes and N+1 queries, pagination, caching, background processing, third-party API resilience, monitoring, backups, error handling, code quality, and automated test coverage.

## Testing rules
- **Do not modify source code, production data, payments, or shipments.** Do not expose secrets or private customer information.
- Restrict active vulnerability testing, payment simulations, load/concurrency checks, and failure injection to **explicitly authorised staging/development environments**, with test accounts and sandbox integrations.
- Use non-destructive, low-impact inspection for production; do not scan or attack competitor websites.
- Where execution is not permitted or possible, describe the test to run rather than claiming it passed.
- At minimum, assess scenarios such as duplicate checkout, forged/duplicate payment notification, simultaneous purchase of last stock, payment success plus database failure, Biteship timeout, invalid destination, order cancellation, and unauthorised order/admin access.

## Evidence requirements
For each finding, give file path and line/function references where possible, reproducible steps or code reasoning, impact, severity, and a concrete fix. Classify confidence as **Verified**, **Probable**, **Potential**, or **Not verified**. Distinguish bugs from absent features and risks from proven vulnerabilities. Never invent test results or competitor capabilities. Note any access or tooling limitations.

## Output files
Create reports under `audit-reports/` (create this folder if needed):

1. `01-executive-summary.md` — overall readiness, scope/limitations, top risks, top 10 actions.
2. `02-security-findings.md` — severity-ranked security register, evidence, impact, remediation (CWE/CVSS where appropriate).
3. `03-functional-defects.md` — verified/possible defects, reproduction steps, expected vs actual outcomes.
4. `04-midtrans-biteship.md` — separate integration assessments, financial risks, failure recovery, recommended tests.
5. `05-competitor-gap-analysis.md` — sourced feature matrix: **Full / Partial / Missing / Not verified / N/A**; gaps, value, complexity.
6. `06-prioritised-roadmap.md` — **P0** release blockers, **P1** major issues, **P2** improvements, **P3** optional features; impact, effort (S/M/L/XL), dependencies, order.
7. `07-testing-strategy.md` — high-value unit, integration, API, E2E, security, concurrency, and regression tests.
8. `findings.json` — machine-readable entries with unique ID, category, title, severity, confidence, location, evidence, impact, recommendation, priority, and status.

## Execution process
1. Inventory the repository, architecture, and implemented features.
2. Audit security and high-risk trust boundaries.
3. Trace checkout, Midtrans, Biteship, inventory, and order state transitions end-to-end.
4. Audit storefront/admin behaviour, localisation, performance, and reliability.
5. Verify competitor features using public sources and compile the gap analysis.
6. Deduplicate findings, prioritise by **real business risk**, and write all reports.

**Start with discovery. Maintain an explicit list of inspected and uninspected areas. Do not implement fixes until I review the audit and authorise changes.**
