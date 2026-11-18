# Dependency security remediation (AUD-025)

Verified locally on 2026-11-06. These changes have not been deployed. The original audit reports remain historical evidence.

## Changes

- Next.js 14.2.35 to exactly 15.5.29. React 18 is retained within the declared peer range; production compilation and demo HTTP checks passed.
- Vitest 4.1.0 to exactly 4.1.12, including the patched mocker dependency.
- PostCSS pinned to 8.5.32. A scoped npm override makes Next.js use that same version instead of its vulnerable pinned 8.4.31. Keep the override until a future framework release uses a patched PostCSS itself, then review its removal.
- The locked selector parser is now 6.1.5. The originally reported source-map-js version is no longer reported vulnerable by the current registry audit.
- Image optimization accepts only images.unsplash.com and plus.unsplash.com over HTTPS. AVIF output is disabled, SVG optimization is explicitly disabled, response bodies are limited to 10 MiB, and the optimizer disk cache to 256 MiB. Local images still work. Add any future product-media host explicitly to next.config.mjs after reviewing it; arbitrary remote URLs are intentionally rejected.
- Dynamic product, review, stock-notification and upload handlers now await promise-based route parameters, and their test fixtures use promises.
- NEXT_DIST_DIR can isolate build output from a running development server; ordinary development/build/start commands still use .next.

## Verification

- Fresh isolated directory containing only package.json and package-lock.json: npm ci --ignore-scripts --no-audit --no-fund succeeded.
- npm audit --json: zero reported vulnerabilities across production and development dependencies. npm ls confirms the overridden PostCSS version is actually resolved by Next.js.
- npm test: 334 passed, zero failed.
- npm run build: production compilation, type checking and all 35 static pages passed. Local service environment values were overridden with empty strings for this build; database migrations and provider operations were not run.
- Next.js 15 demo HTTP checks: readiness, staff login/catalog, product and review routes, guest checkout with a real seeded product, simulated payment, and six rendered pages passed. An unapproved remote image host returned HTTP 400.

These checks do not establish hosted deployment, live provider behaviour, or complete browser interaction/accessibility coverage. A zero audit result means no currently reported registry findings, not a guarantee against undiscovered vulnerabilities.

## Follow-up before release

Use Node.js 24 LTS for development and CI (the verification runtime was 24.20.0). Next.js 15 is a deliberately bounded compatibility step: its extended security support ends **2027-01-31**. Schedule an upgrade to the active supported major before that date. Re-run npm audit, npm ci, build, and regression checks in deployment CI, and verify any custom image origins and host-level image resource limits.

The database migration reminder remains in [deployment-checklist.md](deployment-checklist.md); no connected migrations were applied here. Other checkout, inventory, payment and shipping release blockers remain separate work.

Sources: [Next.js support policy](https://nextjs.org/support-policy), [Next.js 15 migration guide](https://nextjs.org/docs/app/guides/upgrading/version-15), [SVG optimizer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Vitest mocker advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8).
