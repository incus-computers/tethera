# Authentication and isolated demo environments

Step 1 replaces the application's identity layer. Production payments, inventory atomicity and the other audit workstreams remain separate work.

## Local demo

Run:

```powershell
npm install
npm run dev:demo
```

Optional port: `npm run dev:demo -- --port 3100`.

This command explicitly sets APP_ENV=demo and NODE_ENV=development for its child process. You do not need to edit .env.local. Demo accounts are unavailable outside this mode; a production Next.js process rejects demo mode.

The banner identifies the demo. On /admin, choose Super Admin, Catalog Manager, Fulfilment Operator or Support Agent using the demo buttons. On /auth, choose a seeded customer under Sign in. All demo seed accounts use `DemoOnly-2026!`; this credential is deliberately public and has no live meaning. Customers include alex.gamer@example.com and budi.builder@techcorp.id. Staff addresses are super_admin@demo.example, catalog_manager@demo.example, fulfillment_operator@demo.example and support_agent@demo.example.

You can also register a fresh email/Indonesian phone. Demo OTP responses and the UI display a generated test code. This behaviour is explicitly gated to demo mode; live responses never contain it. Signup requires a fresh verification and a password of 12–128 characters.

The same server ownership and role guards protect demo sessions. There are no magic bearer tokens or unauthenticated role switches. Session tokens are random, hashed in server memory, expire after an hour, and are revoked by logout. Demo passwords are salted with scrypt.

Demo mode isolates Supabase, Midtrans charging, Biteship booking, marketplace sync and transactional email/WhatsApp from configured live credentials. External product images, fonts and map tiles can still load in the browser. Existing shipping simulation is retained. Demo payment can mark an order paid only for its owner/guest browser. Live payment initiation returns 503 until the real gateway work is implemented.

Demo accounts, orders and tables live in process memory, shared across Next route bundles. They survive route reloads within that process, not a process restart. Stop and restart the demo command to reset seeded state. A later dedicated simulation console can add scenario controls without changing this identity boundary.

## Staging and production prerequisites

Use a separate Supabase project and sandbox integrations for staging. Never point test suites or demo mode at production data.

1. Apply schema.sql, the phase-2 migration, then `supabase/migrations/20261106090000_verified_auth_sessions.sql` to the intended isolated project. Review existing duplicates before applying unique user_id indexes. This change does not apply migrations automatically.
2. Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and server-only SUPABASE_SERVICE_ROLE_KEY. Authentication requires all three and fails closed if configuration/storage is unavailable.
3. Set APP_ENV=staging or APP_ENV=production. Set APP_URL to the actual origin, for example https://staging.example.com; unsafe requests with another Origin are rejected. Use HTTPS for deployed environments.
4. Enable Supabase email confirmation and configure the sign-in/OTP email template to include `{{ .Token }}`, because the storefront expects a six-digit code. Configure an approved SMS provider/test phone configuration if phone authentication is required. Do not disable contact verification to bypass setup.
5. Provision staff in Supabase Auth, verify their contact, and bind each intended admin_users.user_id to that actual auth.users ID. Set a canonical role and is_active=true. No role is inferred from email, browser metadata or signup input. Enrol and verify a TOTP factor for each staff user using a trusted Supabase MFA enrolment flow before first store-admin login; the store login then accepts password plus authenticator code.
6. Migrate legacy customers by explicitly verifying ownership and setting customer_profiles.user_id. Do not bulk-link accounts solely from an unverified browser email. Preserve profile IDs used by historical orders. New registrations use their provider user ID as their profile ID.
7. Generate a private TRACKING_TOKEN_SECRET with at least 32 random characters. Shared tracking links expire after 30 days and authorise tracking only. Rotate this key to invalidate all existing tracking links.
8. Set real MIDTRANS_SERVER_KEY only for the proper environment. There is no source-known fallback outside demo mode. Set BITESHIP_WEBHOOK_SECRET and configure Biteship to send it as the x-biteship-token header. Marketplace notifications use MARKETPLACE_WEBHOOK_SECRET / x-marketplace-token.
9. Rotate any credentials previously embedded in the repository and revoke old sessions through the relevant provider/operator controls. Source removal does not rotate external accounts. No external credentials or deployments were changed during implementation.
10. Schedule removal of expired auth_sessions and auth_rate_limits records, and configure edge/network abuse protection. Identifier-based database rate limits supplement, rather than replace, provider/WAF protection.

The migration introduces hashed-token session registrations and a shared atomic rate-limit function, restricts cart/return/fulfilment policies, and revokes public execution of the privileged payment function. Only trusted service-role requests can operate the session tables/rate-limit function.

## Session and credential lifecycle

Browser login uses HttpOnly, SameSite=Lax cookies (Secure in production). Tokens are never returned as login JSON or stored in localStorage. Reloading calls server /me endpoints. Legacy localStorage sessions are discarded.

Every live request checks the server session registration/expiry and verifies the provider token with getUser. Staff roles and active status are fetched from admin_users for each request; verified provider AAL2 is mandatory. Sessions last at most one hour or the provider token lifetime, whichever is shorter. Automatic long-lived refresh is intentionally not enabled; sign in again after expiry.

Logout removes the server registration so replaying the old cookie is rejected. Password recovery at /auth/recover requires a fresh delivered OTP, consumes a ten-minute single-use verification proof, changes the password through the provider, and revokes all registered sessions for that user. A normal password login alone cannot authorise a password reset. Changing the account's login email/phone requires a separate provider-verified identity flow; profile phone edits affect shipping contact data only.

Guest checkout creates an unguessable HttpOnly browser capability and stores its hash-derived subject on the order. Other browsers cannot charge or modify that order from an order number/email alone. A separate expiring tracking link allows read-only tracking without exposing the pickup PIN. Keep that link private if order status/item information is sensitive.

Anonymous cart/wishlist access is scoped to server-issued cookies. Supplied userId, email, bearer identity and guest-token overrides do not establish ownership. Merge requires a signed-in customer and the current guest cookie.

## Tests and verification

```powershell
npm test
npm run test:auth
npx tsc --noEmit --incremental false
```

Vitest is pinned in devDependencies. Test setup explicitly uses demo mode and rejects unexpected external fetches. The provider-adapter tests use offline HTTP fixtures, not a live Supabase project. Existing tests were updated to use legitimate server-side fixture sessions/cookies rather than magic tokens. Test fixture issuance is in tests/support only.

New regressions cover password omission, forged/expired/revoked sessions, cross-user IDs, staff permissions, profile mass assignment, OTP verification and recovery, cart/wishlist impersonation, guest capability scope, public review redaction and live MFA/storage failure behaviour. Existing transaction tests are not proof that the later financial/inventory audit findings are resolved.

HTTP smoke checks were also performed against the explicitly isolated demo dev server for signup, profile ownership, staff role rejection/logout, guest checkout/simulated payment, tracking, and successful rendering of /auth, /admin, /auth/recover and /account. No full interactive browser automation, real provider request, migration or production test was performed.

## Official provider references

[Supabase getUser server verification](https://supabase.com/docs/reference/javascript/auth-getuser), [password authentication](https://supabase.com/docs/guides/auth/passwords), [OTP sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [MFA challenge and verify](https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify).
