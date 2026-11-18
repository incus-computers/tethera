# Step 14: safe catalog media (AUD-024)

Implemented locally. The user reported applying `20261107130000_safe_media_storage.sql` and receiving **`database_ready = true` on 2026-11-08**. This is user-reported verification; the connected project and hosted Storage acceptance were not independently checked. Do not rerun this migration blindly.

## What changed

Staff with `products:write` can upload a single still JPEG, PNG or WebP. The server checks the actual signature, declared MIME type, extension and full image decoding. SVG, GIF, other formats, animated PNG/WebP, malformed/truncated files, empty files and mismatches are rejected. Inputs are capped at 5 MiB, 16 million pixels and 8000 pixels per side. Request bytes are counted before multipart parsing, including chunked requests and dishonest Content-Length headers. Multipart overhead is capped at 64 KiB. Upload reading has a 30-second deadline; two processing slots per app process bound concurrent buffers/decoders. Configure host/proxy body limits and request/concurrency limits as well: this is not a distributed rate limiter.

Accepted images are oriented, resized to fit 2560 × 2560 without enlarging, and re-encoded as WebP with metadata removed. Raw originals, client filenames and base64 copies are not stored or returned. Sharp is an exact direct dependency. See the [Sharp input limits](https://sharp.pixelplumbing.com/api-constructor/) and [output metadata behavior](https://sharp.pixelplumbing.com/api-output/).

Connected mode uses the dedicated **private** Supabase Storage bucket `catalog-media-v1`; it never writes `public/uploads` or falls back to dummy storage. Only server credentials access the bucket. A restrictive Storage policy excludes this bucket from existing permissive browser policies without changing other buckets. Bucket privacy, MIME/size settings and the restrictive policy are included in SQL readiness. Runtime also checks bucket settings before upload/download. Supabase documents [bucket creation and limits](https://supabase.com/docs/guides/storage/buckets/creating-buckets).

After Storage acknowledges the write, the app inserts an immutable `media_assets` record containing its UUID name, checksum, size, dimensions, staff ID and timestamp. Customers cannot query the records; the service role can insert/read but cannot update/delete them. The public `/api/uploads/{uuid}.webp` route serves only accepted catalog assets and verifies stored bytes against their checksum. Unrecorded, missing or changed objects are never served. Catalog media is intentionally public through this route: do not use it for customer documents, invoices or private photographs.

Responses use a fixed WebP content type, `nosniff`, sandbox CSP, same-origin resource policy, safe generated Content-Disposition, bounded caching and checksum ETags. Failures use generic errors and no-store. The old `/uploads/*` namespace redirects to a fixed 404 endpoint; legacy filenames are also rejected by the dynamic route.

## Apply the Supabase migration

Use the **same Supabase project** as the earlier steps. Do not rerun earlier migrations.

1. Open `supabase/migrations/20261107130000_safe_media_storage.sql` locally and copy its entire contents.
2. In Supabase, open **SQL Editor**, choose **New query**, paste the contents and click **Run**. It creates the acceptance table, private bucket, restrictive policy and readiness checks in one transaction. It is intended to run once after `20261107100000_durable_jobs.sql`.
3. Open another new query and run:

```sql
select public.application_schema_health() as database_ready;
```

The expected result is `true`. If it is false, run:

```sql
select public.application_security_audit();
select public.application_media_storage_health() as media_storage_ready;
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'catalog-media-v1';
```

The bucket must be private (`public = false`), allow only `image/webp`, and have a 5242880-byte limit. If a bucket with this ID already existed, the migration preserves its settings and readiness fails until it is configured correctly. Adjust settings through Storage/Dashboard; do not delete objects or rewrite Storage object metadata using SQL. An SQL error is not a readiness pass; stop and inspect its message before rerunning anything.

No additional provider selection is required. Existing server-only Supabase configuration is used. This step does not enable payments, shipping, notification sends, marketplace sync or live tax configuration.

## Try the dummy environment

Run `npm run dev:demo`, open the local URL it prints, visit `/admin`, choose the demo **SUPER ADMIN**, open **Products → Add Product**, and upload a PNG/JPEG/WebP in the pictures gallery. Its preview uses the same validation and serving route. Try an SVG to see rejection. No real Supabase call occurs. Demo bytes stay in process memory (64 MiB total) and disappear when the server restarts, like other dummy data; connected uploads use durable object storage instead. Re-upload dummy images after a restart.

## Legacy images and operational acceptance

- Re-upload any needed old `/uploads/...` or `/api/uploads/{timestamp-name}` images through the new endpoint and replace their catalog/banner links. The old bytes are not silently trusted or copied. No old files were deleted by this change. Purge any previously published legacy upload URLs from deployed caches/CDNs during rollout; old long-lived caches cannot be revoked by changing a route alone.
- Upload is acknowledged only after both the object and acceptance record succeed. A storage timeout or failed/unknown record insert returns 503. Review uncertain outcomes before retrying: a retry uses a fresh UUID and may leave a duplicate/orphan object. Unaccepted objects remain private. Reconcile bucket listings against `media_assets` in staging and remove confirmed unreferenced/orphan objects through the Storage API after review. There is no automatic deletion job in this step.
- Validate a real upload in isolated staging, restart/redeploy the app, then retrieve it again. Check private bucket access with an anonymous/customer token, rejected SVG/oversize cases, existing unrelated bucket behavior, native Sharp availability, hosting body/time limits, caching and storage quotas. Local SQL metadata fixtures and mocked SDK tests do not prove hosted Storage policies, durability, CDN settings or multi-instance capacity.
- Keep the service key server-only; a compromised service key bypasses Storage RLS and is outside the browser policy boundary.

## Validation

`npm run validate` runs actual image-decoder tests, streamed-size/deadline/backpressure tests, staff/CSRF checks, dummy roundtrips, mocked connected SDK success/failure/integrity scenarios, SQL role/policy-drift tests, TypeScript, production compilation, and desktop/mobile gallery uploads alongside the existing simulated purchase journeys. No connected bucket/object was created or changed by local validation. The expanded browser run also exposed an initial-render variant-selection race: product deep links now initialize their selected attributes before a hydration-time click can add the default variant. The existing quote/invoice browser assertion covers that behavior. An older queue recovery fixture now assigns its intended priority explicitly because the test database clock can give consecutive jobs the same timestamp.

Local verification on 2026-11-07: **589 regression tests passed**, TypeScript passed, production compilation generated 48 static pages, **eight desktop/mobile browser journeys passed**, and the production dependency audit reported zero vulnerabilities. The browser harness first completes the real admin development-page compilation via HTTP before opening its first browser page; it still uses real authentication, real form submission and real image retrieval, without substituting those responses or retrying failed tests. The user reported this migration ready on 2026-11-08; hosted Storage acceptance remains unverified.

Next: Step 15, query scalability and pagination.
