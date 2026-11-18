# Step 16: Indonesian storefront and starter policies (AUD-031)

Implemented locally. No connected database, payment, courier, messaging or hosting settings were changed by this step. This step needs no new SQL migration. On 2026-11-09, the user reported all migrations completed, including Steps 15 and 17. The latest confirmation did not include a new readiness result; earlier reported readiness covered Step 14.

## Merchant details supplied on 2026-11-08

| Field | Configured value |
| --- | --- |
| Business/trading name | Incus Computers |
| WhatsApp | +62 817 0815555 (link format: `628170815555`) |
| Support email | incuscomputers@gmail.com |
| Collection address | Mangga Dua Mall Lt. 3 No. 36, 10730 |
| Business time zone | Asia/Jakarta (WIB) |
| Opening hours | Not supplied; left unset |

These are merchant-provided facts. Company registration, ownership of contact channels and actual opening hours were not independently verified. No coordinates, staffing availability, service turnaround, tax status or uniform product warranty were invented.

The public, non-secret configuration is [businessConfig.ts](../src/lib/storefront/businessConfig.ts). It imports the bilingual [starter policy text](../src/lib/storefront/draftPolicies.ts). An optional server-side `STOREFRONT_BUSINESS_JSON` can replace that configuration using the same structure; it must contain the complete documents, not only changed fields. Do not put credentials or private reviewer information in the policy text. The API projects only the public fields and omits `reviewedBy`. Invalid overrides produce an unconfigured profile and prevent real checkout.

## Pages and proposed terms

| Route | Content |
| --- | --- |
| `/contact` | Supplied business details, WhatsApp and email; truthful notice where hours are missing |
| `/privacy` | Order data, configured processors, map/search services, data requests, session/language storage and separate marketing choices |
| `/terms` | Order review, server-verified totals/payment status, cancellation and complaint information to finalize |
| `/warranty` | Product-specific warranty, reporting problems, inspection, proposed return shipping and refund process |
| `/shipping` | Genuine destination details, courier estimates, tracking and confirmed store collection |
| `/returns/request` | Submit or check an owned paid order's return request through the existing RMA workflow |

All four stored policy documents have Indonesian and English text; the storefront now displays English at the merchant's request (2026-11-10). They are visibly **drafts**, have no effective date, and are excluded from indexing until published. These are starting documents, not a certification of legal compliance or a promise that merchant decisions have already been made.

The warranty starter proposes reporting an incorrect, damaged-on-arrival or mismatched item within **seven calendar days** to start assessment promptly. It explicitly preserves the product warranty and applicable consumer rights. An unboxing video may help but is not the sole acceptable evidence. It proposes store-funded return shipping when assessment establishes a store-responsible error or damage; other charges need written confirmation before dispatch. Neither proposal is treated as an approved live term. There is no blanket warranty duration, guaranteed replacement, fixed refund turnaround or universal 60-minute collection promise.

Return requests require the order owner's verified account or original guest session. The server resolves ownership and does not accept an email address as proof. The form captures a reason, optional serial number and issue notes; customer responses omit internal inspection notes. An accepted request means assessment is pending, not that warranty or payment refund is approved. This is a customer-facing entry into the existing returns workflow, not a complete inventory of serial numbers or distributor warranty entitlements.

### Decisions before publishing

- Confirm the correct seller identity and any registration details that should appear, plus the actual opening/collection hours.
- Review product/distributor warranty coverage and the proposed initial-reporting and return-shipping terms. Specify cancellation, complaint escalation, assessment and refund procedures that the store can actually deliver.
- Confirm the actual processors, international processing, retention/deletion rules and how staff will verify and handle privacy requests. Do not publish unresolved placeholders as a completed privacy policy.
- Review both language versions together, replace draft/proposal wording with the approved terms, assign a new `policyVersion`, set the true `effectiveDate`, record the responsible `reviewedBy`, and only then set `policiesReviewed: true`.

The default configuration deliberately remains `policiesReviewed: false`. Real order creation checks publication on the server and refuses new orders while this remains false. Collection additionally requires a configured address and opening hours. Delivery can be enabled after policy review without inventing collection hours. Publishing policies alone does not resolve the separate payment, shipping, database or tax activation requirements from previous steps.

### Checkout acknowledgement

Checkout links to the real policy pages and starts with an unchecked purchase-terms/warranty acknowledgement. The server validates the supplied locale, current version and SHA-256 content hash. Missing acknowledgement is rejected; stale content requires review and confirmation again. Changing the language or policy content clears the effective browser acknowledgement. The reload button retrieves current policies without creating an order.

The accepted version, hash, language, server timestamp, environment and full bilingual policy snapshot are stored in the first order line's existing `checkout_metadata.policyReceipt`, within the trusted order transaction. Replaying a completed idempotent request returns its original order and receipt. This uses the existing protected JSON storage; it is not a new database column, external signature or independent tamper-proof archive.

## Indonesian usability and accurate destinations

As requested on 2026-11-10, the storefront stays in **English**. The top delivery/currency bar and language selector were removed. Server-rendered HTML and the client document use `lang="en"`; the retired `tethera_locale` cookie is ignored and cleared, including an old Indonesian preference. Policy titles, demo contact-hours wording and the known legacy promotional badge also use English. Indonesian translation resources and bilingual historical policy snapshots are retained for compatibility; they do not enable a storefront language toggle. Merchant-authored catalog or promotional content is not automatically translated.

Phone normalization accepts common `08`, `62` and `+62` input, stores the canonical `+62` form and rejects foreign or malformed values. Single-word customer names work. Order dates use an explicit business time zone instead of the browser machine's zone; WIB, WITA and WIT are supported. Existing whole-rupiah financial calculations remain unchanged.

Checkout and account location no longer manufacture missing Jakarta addresses, postcodes or coordinates. Old unverified location caches are ignored. A new saved destination needs a complete actual street/subdistrict/city/province and five-digit postcode. Optional coordinates must form a valid pair within the supported Indonesian bounds. The initial map centre is only a viewport; it is not a selected destination. Manual entry remains available when geocoding is unavailable. Real autocomplete/geocoding failures do not return seeded demo places or guessed postal data.

Translations live in [id.json](../src/lib/i18n/id.json). The optional `node scripts/localize-storefront.mjs` codemod applies reviewed exact keys to supported React display expressions. It does not translate arbitrary product names, route identifiers or DOM nodes at runtime. Review changes when extending the catalog or codemod.

## Try everything with dummy data

1. In the project terminal, run `npm run dev:demo` and open the local URL printed by Next.js.
2. Visit `/contact`, `/privacy`, `/terms`, `/warranty` and `/shipping`. The storefront and policy display stay in English, without a language selector.
3. Add a product, open checkout, enter a test name/email and Indonesian phone number, review the current total and tick the policy acknowledgement. Use the dummy payment flow. No real payment or courier booking is made.
4. Copy the paid dummy order number. In the same browser session, open `/returns/request`, enter it with an issue description, and submit/check the request. Staff can inspect it in the existing dummy returns workflow.
5. Test the floating WhatsApp control: demo shows a local simulation message. Contact pages display the supplied details without clickable WhatsApp/email links, avoiding accidental communication during tests.

Demo policy pages are explicitly samples. Demo collection uses clearly labelled simulated hours so the full pickup path remains available without pretending the real store has confirmed hours. Existing dummy uploads, queues and other prior-step features remain available. No live policy publication or connected acceptance was performed.

## Validation and remaining acceptance

Run `npm run validate` for the isolated unit/API/SQL tests, TypeScript, production build and desktop/mobile dummy browser journeys. Targeted cases cover phone formats, explicit time zones, profile validation, unchecked/stale acknowledgements, persisted policy receipts, removal of invented destinations and geocoder failure/country handling. Browser journeys exercise English checkout, simulated payment, policy navigation and an owned paid-order return request, including ignoring the retired Indonesian language preference on desktop and mobile. A real local image is fetched, optimized and decoded without a substituted response. Tests run with stripped credentials and blocked external networking.

Remaining work before live use is merchant approval of actual terms/hours and the prior staging/provider/deployment gates. Step 17 (abuse, privacy operations, observability and recovery evidence) is the next and final numbered audit step; it is not implemented by this step. Optional comparison/quotation tools and a complete product serial lifecycle are not claimed here.

## References used for the starter structure

Original prose was drafted with common Indonesian computer-retailer support patterns in mind: [Enterkomputer terms and warranty information](https://enterkomputer.com/faq/term-and-condition), [Pemmz warranty information](https://pemmz.com/about-warranty) and [Pemmz FAQ](https://pemmz.com/faq). Their terms are not adopted as Incus terms. The seven-day proposal is an explicit draft business choice, not a claimed legal minimum.

Official context for merchant review includes [Indonesia's personal data protection law, UU 27/2022](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/) and [PP 80/2019 on electronic commerce](https://jdih.kemendag.go.id/peraturan/peraturan-pemerintah-nomor-80-tahun-2019-tentang-perdagangan-melalui-sistem-elektronik). These references do not establish that the starters meet every requirement applicable to the business.
