# Step 13: reproducible tests and CI (AUD-033)

The repository now has one isolated validation command and a GitHub Actions workflow. This step changes no database schema and requires no Supabase migration. The user reported the Step 12 migration completed with `database_ready = true` on 2026-11-07; that connected result was not independently verified.

## Run checks locally

Use Node **24.20.0** from `.nvmrc` and npm **11.19.0** from `packageManager`. GitHub Actions installs those versions explicitly. The lockfile pins the resolved dependency graph, including Vitest 4.1.12, PGlite 0.5.15 and Playwright 1.65.0.

```powershell
npm ci --ignore-scripts --no-audit --no-fund
node node_modules/@playwright/test/cli.js install chromium
npm run validate
```

Dependency and browser installation need internet access. Application validation is isolated from live services. There is no need to put Supabase, Midtrans, Biteship, Resend, WhatsApp or marketplace credentials into tests or GitHub secrets.

For a full fresh dependency installation inside the temporary workspace:

```powershell
npm run validate -- --clean-install
```

For a shorter targeted run:

```powershell
npm run validate -- --stage unit
npm run validate -- --stage build
npm run test:e2e
```

`unit` runs the complete unit/API/SQL/security suite and TypeScript. `build` performs a production compilation. `browser` runs the actual dummy browser journeys. `all` is the default. Failure stops subsequent stages and exits nonzero. Browser tests have no automatic retries, so a failing journey cannot be hidden by a later retry.

The existing `npm test` and feature scripts remain available for quick local development. Vitest no longer loads `.env` files. For the stronger process/environment/network boundary, use `npm run validate`.

## Isolation and artifacts

The validator copies allowlisted source/configuration/test directories into a newly created temporary directory. It excludes `.env` files and source symlinks, does not copy `.git`, and gives child application processes an allowlist of OS essentials plus explicit synthetic settings. Inherited provider tokens, cloud credentials, proxy settings and Node preload options are not forwarded. Tests cannot read the workspace's `.env.local` through the snapshot.

By default, dependencies are linked from the installed `node_modules`; `--clean-install` uses `npm ci --ignore-scripts` in the snapshot instead. Cleanup verifies the exact temporary target and unlinks any dependency junction before removing the temporary directory. It does not recursively traverse or remove the workspace's dependency directory. Tests exercise both environment filtering and this cleanup behavior.

Node application/test/build processes preload a guard that blocks external fetches and raw sockets while allowing loopback fixture servers. Tests can replace fetch with explicit offline provider fixtures. Browser requests are restricted to the loopback demo application. Existing catalog image requests use a synthetic image; Step 14's newly uploaded dummy images are actually served, decoded and previewed locally. This is a testing boundary, not a general-purpose sandbox for running hostile code.

The browser server is started with explicit demo mode, empty live credentials and fixed loopback address/port `127.0.0.1:3217`. It refuses to reuse an existing server at that port. Each test verifies that the server reports demo mode before any transactional action. Browser contexts have fresh cookies/storage. No real payment, message, shipment or marketplace write is part of validation.

Production compilation uses a separate build directory inside the snapshot. Build-generated `next-env.d.ts`, TypeScript changes, caches and simulated data do not modify the source workspace. Inter and JetBrains Mono are bundled from exact-version local font packages, so compilation does not download Google Fonts.

Reports are saved under ignored `validation-results/<UTC timestamp>-<stage>/`:

- `summary.json`: stage outcomes, runtime and exit codes.
- `unit.xml` and `unit.json`: unit/API/database regression evidence.
- `browser.xml` and `browser-report/`: browser results.
- `browser-results/`: synthetic invoice downloads, plus screenshots/traces on failures.

Reports contain test fixtures, not live customer data. No application secrets or source snapshots are uploaded as CI artifacts. Do not run these fixtures against a live deployment.

## GitHub Actions

`.github/workflows/validation.yml` runs on pull requests, pushes to `main`/`master`, and manual dispatch:

| Runner | Checks |
|---|---|
| Ubuntu 24.04 | Clean locked install, production dependency advisory gate, all regressions, TypeScript, production build, Chromium desktop/mobile journeys |
| Windows 2025 | Clean locked install, all regressions and TypeScript compatibility |

The advisory gate fails on known high/critical production dependency vulnerabilities and needs registry access. It is separate from the offline application validation. Action references are pinned to full commit SHAs; the workflow has read-only repository permissions, disables persisted checkout credentials and receives no application/provider secrets. It does not deploy, apply migrations, seed a connected database, send messages or publish a site. Reports are retained as artifacts for seven days.

The workflow file is prepared locally. Hosted GitHub Actions execution has not been observed until these changes are committed/pushed through the user's normal repository workflow. No commit, push or branch-protection change was performed by the assistant. After the first hosted run succeeds, make both `Verify (ubuntu-24.04)` and `Verify (windows-2025)` required checks in the repository's branch rules. This setting is an external repository administration task, not something a local YAML file can prove.

References: [Playwright CI guidance](https://playwright.dev/docs/ci-intro), [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use).

## Coverage and corrections

All six previously excluded catalog/variation files now use Vitest and run with the complete suite. No test exclusions or test skips were added to make CI pass.

The PostgreSQL tests apply the exact baseline and all migrations to disposable PGlite databases. They cover transaction rollback, role grants/RLS, stock holds and settlement, payment/refund evidence, voucher claims, parcel allocations and job leases. PGlite executes PostgreSQL semantics without a connected project; it is not hosted Supabase or a multi-connection staging load test.

Browser journeys run at desktop and narrow mobile dimensions. They cover variant selection/cart/quote/payment, immutable invoice download and ownership, queued invoice email, rejected price tampering, checkout-key replay, truthful unpaid/missing-order screens, customer sign-in and staff queue permissions. Images are fixtures, so these are functional journeys rather than visual or image-quality acceptance tests.

The first real browser runs found defects that API-only tests missed:

- The dummy worker could create an empty variant table before checkout loaded its fixtures. Canonical demo variants now initialise for the first repository regardless of module order, and later instances preserve reservations.
- Hidden delivery address inputs still required values during pickup checkout. They now require values only for delivery.
- The cart drawer now uses the dynamic viewport height, bounded panel sizing and a background scroll lock for mobile interaction.

The same browser tests retain coverage of these corrected journeys. Server-authoritative checkout, real-provider gates, tax configuration and the user's undecided marketplace provider remain in effect.

## Remaining release evidence

CI does not certify live provider entitlement, tax treatment, actual packing/insurance, hosted role configuration, worker scheduling, external delivery, multi-connection database contention or mobile Safari/Firefox behavior. Those still need the staging/provider/operator acceptance described in the deployment checklist. Steps 14-17 remain separate workstreams.

## Local acceptance (2026-11-07)

`npm run validate -- --clean-install` completed successfully on Windows with Node 24.20.0 and npm 11.19.0. The run installed 164 locked packages with dependency lifecycle scripts disabled, passed all **567 tests across 51 files**, passed TypeScript, compiled **48 static pages**, and passed **six Chromium journeys** across desktop and mobile projects. The production dependency audit reported zero vulnerabilities at the time of this check. Browser and build processes used the isolated source snapshot and network guard. The temporary snapshot and test server were removed after completion.

Evidence is in `validation-results/2026-11-07T00-03-39-449Z-all/summary.json` and its unit/browser reports. Earlier failed browser reports are retained as evidence of the defects found and corrected; the successful run uses the corrected code without skipped tests or automatic retries. No Supabase migration, real provider action, GitHub workflow execution, commit or push was performed.

A final browser run with an explicit HTTP check of the public reviews endpoint also passed all six journeys: `validation-results/2026-11-07T00-10-39-432Z-browser/summary.json`. The check warms that development route before browser request fan-out, while asserting a real HTTP 200 response. Bundled font license notices are retained under `public/licenses/fonts/`.
