# Security findings

Severity-ranked source assessment. Verified is source/read-only evidence, not a live penetration-test result. Secret/password values are deliberately omitted. No numerical CVSS scores are invented without deployment validation. Registry severity is reported separately from application exploitability.

## AUD-001 — Administrator identity is forgeable

**Critical | P0 | Verified | Open** | CWE-287

Location: `src/lib/auth/adminAuth.ts:96`, verifyAdminClearance.

Evidence / actual: Accepts literal demo tokens and unsigned Base64 admin IDs; verifies neither signature nor expiry. ADMIN_ACCOUNTS contains plaintext passwords compared directly. Credential values omitted.

Reproduction or code reasoning: Trace any protected route into verifyAdminClearance: supplied identity needs no proof of login.

Impact: Unauthenticated administrative access to sensitive operations.

Expected behaviour / concrete fix: Replace with provider-backed MFA and signed/opaque revocable sessions; remove demo tokens and embedded credentials; rotate credentials.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-002 — Public payment routes mark unpaid orders paid

**Critical | P0 | Verified | Open** | CWE-840

Location: `src/app/api/checkout/midtrans/charge/route.ts:7`, POST.

Evidence / actual: Generates local payment details, calls processPaymentSuccess, sets paid_at and returns settlement without any Midtrans API request or ownership check. /api/checkout/payment-success similarly accepts arbitrary orderId/paymentReference. Checkout calls this charge route as its normal flow.

Reproduction or code reasoning: Trace checkout/page.tsx create-order then midtrans/charge and the paid transition. No provider charge/status call occurs.

Impact: Unpaid orders can enter pickup/fulfilment and change inventory.

Expected behaviour / concrete fix: Create real Midtrans payments; retain pending state until authenticated provider evidence matches expected payment. Remove public paid transitions; bind attempts to authenticated owners or guest capabilities.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-003 — Customer login skips missing passwords and has no verified session

**Critical | P0 | Verified | Open** | CWE-287

Location: `src/lib/crm/crmService.ts:154`, authenticate.

Evidence / actual: Password comparison runs only inside if(password). Matched customers are otherwise returned. Credentials are plaintext in memory with a default fallback password. Browser useAuthStore trusts a localStorage profile; login issues no verifiable server session.

Reproduction or code reasoning: For an existing fixture email and omitted/empty password, authenticate skips its credential check. Phone lookup also permits suffix matching.

Impact: Identifier knowledge permits obtaining a logged-in profile; accounts/credentials diverge across processes.

Expected behaviour / concrete fix: Use durable provider authentication, mandatory password/OTP proof, credential hashing and secure server sessions with expiry/revocation/recovery.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-004 — Account APIs trust caller-selected identities

**Critical | P0 | Verified | Open** | CWE-639

Location: `src/app/api/account/orders/route.ts:6`, GET.

Evidence / actual: Account/orders returns full matching orders/items by supplied email or customerId, account/update changes a supplied id, and auth/me returns profiles by id/email without session checks. Checkout trusts customer.customerId.

Reproduction or code reasoning: Proposed fixture requests: GET account/orders for another email; GET auth/me for another ID; PUT account/update for another ID. No guard precedes access. Not executed.

Impact: Other customers addresses, contact/order/pickup information can be disclosed or profiles changed.

Expected behaviour / concrete fix: Require verified sessions; derive customer IDs from the principal and enforce ownership on each read/write. Use minimal DTOs and scoped guest capabilities.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-005 — Builds and unknown products use client prices

**Critical | P0 | Verified | Open** | CWE-602

Location: `src/app/api/checkout/create-order/route.ts:102`, POST: customPCs and unknown-product branches.

Evidence / actual: Unknown product IDs fall back to request prices. Custom component/serviceTier prices and pc.totalPrice are supplied by the client; invalid variant IDs silently retain base prices.

Reproduction or code reasoning: Code fixture: real component IDs with customPC.totalPrice=1 use 1 as pcVerifiedTotal. Unknown item IDs use submitted price. No order created.

Impact: Expensive builds can be underpriced, lines invented and variants mispriced.

Expected behaviour / concrete fix: Reject unknown/inactive products and unmatched variants; resolve every component/service tier and compatibility rule on the server and recalculate totals.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-012 — Biteship webhook permits unauthenticated order/total mutations

**Critical | P0 | Verified | Open** | CWE-306

Location: `src/app/api/webhooks/biteship/route.ts:17`, POST.

Evidence / actual: No source-authentication check before locating by supplied reference, changing delivery/cancellation state, changing shipping_fee/total for order.price, and returning updatedOrder.

Reproduction or code reasoning: Trace order.status/order.price payload processing: no authentication branch exists. Do not post to a configured webhook.

Impact: Known order references allow falsified delivery, financial changes and possible customer-data disclosure.

Expected behaviour / concrete fix: Validate configured Biteship secret headers before effects; bind events to known shipments, validate schema and transitions, persist dedupe. Separate carrier costs from immutable paid customer totals.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-025 — Dependency audit reports critical framework advisories

**Critical | P0 | Verified | Open** | CWE-1395

Location: `package-lock.json:1062`, node_modules/next.

Evidence / actual: npm audit --json --ignore-scripts exited 1: four vulnerable groups (next critical, nested postcss high, source-map-js high, selector-parser moderate). Locked versions respectively 14.2.35, 8.4.31, 1.2.1 and 6.1.4. next.config allows AVIF and any HTTPS image hostname. Presence of advisories verified; application exploitability not verified.

Reproduction or code reasoning: Registry lookup executed; no exploit. Primary Next.js advisory GHSA-2xp9-vwfh-vxw4 includes locked version. Other conditional advisories may not be reachable.

Impact: Known weaknesses may affect production; critical image optimiser advisories warrant immediate applicability review.

Expected behaviour / concrete fix: Upgrade to supported patched dependencies after reviewing advisory prerequisites/deployed versions; narrow image origins and bound resources. Do not blindly audit-fix.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-006 — Shipping fees and quantity validation are untrusted

**High | P0 | Verified | Open** | CWE-20

Location: `src/app/api/checkout/create-order/route.ts:152`, POST: serverShippingFee and quantity.

Evidence / actual: Shipping fee comes directly from selectedRate.price or clientShippingFee. Math.max(1,Number(quantity)) does not enforce finite integers or maxima. No strict nonempty basket/fulfilment enum validation occurs at the route boundary.

Reproduction or code reasoning: Trace a delivery rate price of zero or a fractional quantity; neither a signed quote nor integer validation is checked. Proposed fixture only.

Impact: Free/underpriced shipping, fractional/non-finite totals and invalid orders.

Expected behaviour / concrete fix: Validate strict bounded schemas and positive finite integer quantities; require eligible nonempty baskets. Requote server-side using authoritative packages/destination and persist expiring basket-bound quote IDs; enforce integer IDR.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-009 — Midtrans evidence lacks amount binding and secret failure is open

**High | P0 | Verified | Open** | CWE-345

Location: `src/lib/payment/midtrans.ts:496`, verifyMidtransSignature; webhooks/midtrans POST.

Evidence / actual: Missing MIDTRANS_SERVER_KEY uses a source-known test key without environment guard. Webhook hashes signatures but never compares gross_amount with order.total or binds a persisted provider attempt/merchant/environment. No provider status request observed.

Reproduction or code reasoning: Trace missing-key fallback, webhook order lookup and settlement branch; no local amount comparison. No forged event sent.

Impact: Missing configuration allows forgery; payment evidence for an unexpected amount can settle a local order.

Expected behaviour / concrete fix: Fail closed without proper keys; verify exact fields and bind order, amount, merchant, currency and persisted attempt. Query provider status for ambiguous evidence/reconciliation.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-019 — Supplied RLS and privileged payment function are overly permissive

**High | P0 | Probable | Open** | CWE-862

Location: `supabase/migrations/20261105_phase2_architecture_upgrade.sql:252`, RLS policies; schema.sql payment function.

Evidence / actual: cart_items FOR ALL USING(true), fulfilment/return SELECT USING(true), and carts allowing all user_id IS NULL rows lack ownership. SECURITY DEFINER payment function has no caller/payment proof or explicit EXECUTE revocation. Actual grants/exposed schema not inspected.

Reproduction or code reasoning: First inspect pg_policies/has_function_privilege read-only in staging; then isolated cross-user fixtures. No database contacted.

Impact: With usual database grants callers may access others carts/returns/shipments or directly invoke paid transitions.

Expected behaviour / concrete fix: Apply owner-scoped policies and WITH CHECK; revoke public/anon/authenticated function execution, grant trusted role only, set safe search_path and inspect deployed grants.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-020 — Homepage administration has no authorisation or durable storage

**High | P0 | Verified | Open** | CWE-306

Location: `src/app/api/admin/homepage-modules/route.ts:48`, PUT.

Evidence / actual: Accepts modules, hero and featured prebuilt IDs without any clearance check, writing globalThis.

Reproduction or code reasoning: PUT applies request JSON to globalForHomepage without any authentication guard. No request sent.

Impact: Unauthenticated merchandising changes; restart/multiworker inconsistency.

Expected behaviour / concrete fix: Require merchandising permission, strict fields/URLs, durable versioned settings, audit history and cache invalidation.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-021 — OTP code is returned to requester and logged

**High | P0 | Verified | Open** | CWE-200

Location: `src/app/api/auth/send-otp/route.ts:50`, POST: demoCode.

Evidence / actual: demoCode always returned, without production guard. OtpService logs code/destination, uses Math.random/local memory and no send throttle. verify-otp issues no action-bound proof for registration/login.

Reproduction or code reasoning: Inspect unconditional response and verify-otp success. No OTP request or notification sent.

Impact: Contact verification proves no destination control; sensitive logs and unreliable multiprocess verification.

Expected behaviour / concrete fix: Use real delivery, cryptographic randomness, shared expiring state and distributed send/attempt limits; omit codes from responses/logs and issue a single-use action-bound verification grant.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-022 — Cart, wishlist, reviews and RMA trust supplied identities

**High | P0 | Verified | Open** | CWE-639

Location: `src/app/api/wishlist/route.ts:9`, resolveWishlistSession; cart/review/RMA routes.

Evidence / actual: Wishlist accepts userId query/body or simulated bearer; cart accepts caller Bearer usr_ identity. Reviews trust email/userId, and public summaries return raw review objects. RMA GET makes email optional and returns full records by order/RMA number.

Reproduction or code reasoning: Inspect identity resolvers, review eligibility/response, RMA GET optional email filter. No API requests executed.

Impact: Cross-customer data/modification, forged verified reviews and RMA/private identifier disclosure.

Expected behaviour / concrete fix: Use verified principals and ownership checks everywhere, scoped guest tokens, and public review DTOs omitting email/user/order/admin fields. Protect RMA lookup.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-023 — Invoice endpoint can send private order details to arbitrary recipients

**High | P0 | Verified | Open** | CWE-862

Location: `src/app/api/orders/invoice/send/route.ts:5`, POST.

Evidence / actual: Accepts arbitrary recipient and order identifier without auth, loads order data, retains supplied targetEmail and sends invoice/pickup details. Also accepts caller-authored invoice content.

Reproduction or code reasoning: Trace targetEmail=email then targetEmail||order.customer_email into sender. No email sent.

Impact: Invoice/pickup data exfiltration and sender abuse when email delivery is configured.

Expected behaviour / concrete fix: Require owner/staff permission, immutable server invoice snapshots, verified allowed recipients, resend limits, escaped templates and delivery audit.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-034 — Legacy admin routes bypass granular permissions and transition rules

**High | P0 | Verified | Open** | CWE-862

Location: `src/app/api/admin/orders/route.ts:101`, GET/PUT; admin/customers.

Evidence / actual: Legacy orders/customers routes use generic verifyAdminClearance(admin), while newer routes require action permissions. Manual order status is checked against an allowlist rather than a current-to-next transition graph.

Reproduction or code reasoning: Compare legacy guards/status allowlist to newer requireAdminPermission routes. No staff mutation sent.

Impact: Valid low-privilege staff can exceed role limits and bypass payment/fulfilment constraints; token forgery separately compounds this.

Expected behaviour / concrete fix: Consolidate authenticated action permission guards and central server state machine with paid/allocation preconditions and audit history.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-024 — Active SVG uploads lack content/size isolation

**Medium | P1 | Probable | Open** | CWE-434

Location: `src/app/api/admin/upload/route.ts:8`, POST; api/uploads/[file] GET.

Evidence / actual: SVG allowed based on extension/MIME, no byte-content inspection/size cap. Dynamic route serves image/svg+xml from store origin without sandbox CSP/attachment isolation. Files stored on local app filesystem.

Reproduction or code reasoning: Inspect validation and serve headers; active document behaviour/hosting not tested. No payload uploaded.

Impact: A directly opened active SVG may execute in store origin; memory/disk exhaustion and hosting persistence risk. AUD-001 expands upload access.

Expected behaviour / concrete fix: Reencode bounded raster uploads; sanitise required SVG and serve from untrusted media origin with restrictive headers. Use durable object storage and byte/pixel limits.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## AUD-032 — Abuse, privacy and deployment hardening controls lack evidence

**Medium | P1 | Potential | Open**

Location: `next.config.mjs:2`, nextConfig; API/logging inventory.

Evidence / actual: No shared application rate limiter/security header configuration found. Raw error.message often returned; OTP logs include codes/contact. No deletion/export/retention flow found. Image remotePattern permits all HTTPS hosts. Edge/TLS/WAF/backups/log retention not inspected.

Reproduction or code reasoning: Source/config assessment only; verify deployed headers/TLS/WAF, retention and restoration with operator. No live scans.

Impact: Abuse/cost exposure, excessive error/data disclosure and incomplete privacy governance evidence; not a legal noncompliance conclusion.

Expected behaviour / concrete fix: Add distributed endpoint limits, redacted logs/external errors, appropriate CSP/frame/nosniff/referrer controls, narrow image sources. Document retention/data rights/processors/incidents and prove backup restoration.

Validation: Static inspection unless a read-only command is explicitly named; no live exploit or integration mutation performed.

## Other security classes and positive evidence

- SQL injection: reviewed Supabase calls generally use parameterised query methods; no verified SQL injection found. Full search grammar, CSV inputs and other surfaces were not fuzzed.
- XSS: RichTextRenderer renders text via React rather than inserting product HTML. Layout's dangerouslySetInnerHTML holds a fixed theme script, not observed user input. SVG is AUD-024. Email templates interpolate user/catalog strings; escaping and client behaviour require tests. No general stored storefront XSS claim.
- CSRF/CORS: admin cookie is HttpOnly, SameSite=Lax and Secure in production. No global permissive CORS found. After session repair, validate Origin/CSRF protection for cookie writes; deployed headers remain unknown.
- SSRF/redirects: no verified arbitrary-URL server fetch/open redirect in inspected handlers. Wildcard image origins and dependency prerequisites need review; no internal-network request tested.
- Traversal: media server uses path.basename, preventing simple directory traversal. Active content/size/isolation remain weak.
- RBAC: newer requireAdminPermission guards are positive scaffolding; legacy routes/settings remain inconsistent. authorizeAdminRequest has a missing-header superadmin fallback, but no source caller was found. It is a latent unsafe helper, not a separately proven exposed route.
- Logs/errors: raw error.message and OTP/contact logging are observed; operational access and retention controls unknown.
- Secrets: ignored local env values were not read. Embedded source credentials/default secrets were identified but are not reproduced. Full history scanning not completed.

## Indonesian personal-data governance

UU No. 27/2022 covers personal-data processing, subject rights and controller/processor obligations. The access-control/logging weaknesses create material protection risk. Source review cannot establish organisational lawful basis, notices, retention, deletion/export operations, processor arrangements, transfers or incident procedures. Obtain evidence from the operator and Indonesian counsel; this is not a legal compliance determination. [Official BPK law record](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022.)

## Primary references

- [Midtrans notification authenticity](https://docs.midtrans.com/docs/https-notification-webhooks).
- [Biteship configurable webhook security](https://help.biteship.com/hc/en-us/articles/58382023618329-Complete-Guide-to-Understanding-Biteship-Webhooks).
- [PostgreSQL function permissions / SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html): new functions normally grant PUBLIC execution; actual exposed-schema grants must be checked before confirming deployed RPC exposure.
- [Next.js primary AVIF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4): affected range includes locked Next.js. Exploit prerequisites/deployed versions remain unverified.
