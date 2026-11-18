# PC builder: selected design A

The builder uses grouped component rows with inline replacement cards, a configuration/change summary, individual undo, reset to the incoming PC, service selection and a review dialog before adding to cart. It has no starting-build chooser. Direct visits allow a new empty build; incoming configurations retain their selected parts and name as the editing baseline.

## Brand styling

The builder follows `brand_guidelines.json` through the shared tokens in `globals.css`: matte black `#0A0B0E`, card `#12141A`, elevated surface `#1A1D24`, sky blue `#37baf2` for active/secondary interactions, and green `#52E394` with `#0A0B0E` text for primary actions. It inherits the site's light/dark theme and Inter font, uses the storefront page width/padding, 8px cards, 6px buttons and 1.5px Lucide icons. Product names, prices, controls and summaries use the storefront Inter font with a consistent type scale. The earlier teal backgrounds, mint accents, tiny UI text and monospaced prices have been removed. Breadcrumb trails across the builder, catalogue, product, prebuilt, transaction and admin pages use slash separators and a bold current page with `aria-current="page"`; the builder reads Home / **PC Builder**. Separators are hidden from assistive technology. TypeScript and desktop/mobile checks on seven public routes passed (`validation-results/breadcrumb-style-checks.json`). The edited PC name appears beside Customize your PC in a frosted, translucent container with a subtle blue tint, border and backdrop blur. The container fits the name with normal padding instead of filling a fixed column; its right edge stays aligned with the component list, while the inline Simulation Code panel occupies the summary column and aligns with the top of the frosted name container. Share/Reset sit below the introductory text. INCUS is capitalized in the displayed name and the text is right-aligned. Short/full names, both themes and six widths passed the content-width and alignment checks (`validation-results/builder-fit-name-checks.json`). The name matches the main heading at 32px on desktop and 24px on phones; the container stacks beneath the intro on phones. Original configuration loaded is removed. A linked prebuilt name still opens its product page, and long names wrap without page overflow. Both themes, seven widths, exact edge alignment, empty-build behavior and TypeScript passed (`validation-results/builder-frosted-name-checks.json`).

The component list and review use two groups: **Main Components** (CPU, motherboard, RAM, graphics, primary storage, case and power supply), then **Additional Components** (secondary storage, tertiary storage, CPU cooling, operating system, Accessories and peripherals). Air and liquid cooling remain alternatives in the CPU cooler slot. The existing `other_peripherals` row is labelled **Accessories**, including for expansion/network-card catalog items; its internal key is retained for existing shares, cart payloads and checkout. This grouping change does not introduce new network-card products or a separate database slot. Assembly/testing remains a separate service choice after the parts. Selection, compatibility, baseline undo/reset, pricing and cart behavior are retained. Inquiry controls wait for store settings to load before enabling so a fast demo interaction cannot bypass the simulated-inquiry state.

The merchant's 2026-11-16 copy cleanup removes the visible part-update announcement, the completed-required-parts message and the overall core-parts count. An empty announcement no longer reserves space below the header. Missing-part prompts, compatibility/stock warnings, price updates and checkout readiness checks remain.

Component rows no longer repeat Customized/Added badges; the configuration summary tracks changes. The floating summary keeps its change count and net price difference visible, with individual changes and Undo controls collapsed by default. Clicking the down arrow or header expands the list downward; native keyboard Enter/Space toggling is supported. The list stays open while that configuration is edited, and returns to its default collapsed state after all changes are undone/reset and a new change is made. Component and service Undo, both themes and phone/desktop layouts passed (`validation-results/builder-collapsible-changes-checks.json`). TypeScript and all ten desktop/mobile builder journeys passed (`validation-results/2026-11-17T10-33-48-086Z-collapsible-builder-changes`). The running dummy preview is refreshed. Only changed rows show a green dot immediately after the component type and a smaller, lighter, regular-weight `(Original component: ...)` label before the price (12px on desktop, 11px on phones). The label retains the incoming baseline, or says None for a newly added component. Selecting the original part, Undo or Reset removes both indicators when that row matches its baseline again. Both themes and five screen widths passed the change/restore, addition/removal and layout checks (`validation-results/builder-changed-marker-checks.json`); TypeScript passed. The positive no-conflicts sentence is removed from readiness; missing-part prompts and actual fit/stock warnings remain. The inline picker follows the merchant's product-tile reference: a large square photo area, compact two-line name, stock dot/label and a price-difference footer. Selected tiles use the brand blue border/tint and a checkmark; equal-cost alternatives say Same price. Standalone brand/SKU labels, full part prices, inline specification tables and separate swap buttons are removed. Clicking the tile selects the part. The circular info button opens a product-details dialog with specifications, fit warnings and a selection action; incompatible or unavailable parts cannot be selected. Escape or the close button dismisses details and restores focus to the info button.

The picker uses smaller tiles in a fixed six-column grid and renders every matching product as soon as a category opens, with no pagination or Show more button. Search and Compatible only still filter the available products. Selecting a part leaves its tile in place: Default order follows catalog order, and both price sorts retain their order after selection. At narrower widths the grid scrolls horizontally inside the picker without page overflow. Original pricing, compatibility, undo/reset and cart behavior remain. Both themes passed checks for eight CPU options appearing immediately, six tiles in the first row, stable selection, sorting/search and page widths from 320 to 1920px (`validation-results/builder-six-column-layout-checks.json`). TypeScript and all six desktop/mobile builder journeys passed, including the immediate eight-option CPU picker and absence of Show more (`validation-results/2026-11-16T11-13-02-695Z-builder-six-column-options`). The running dummy preview includes the changes.

Brand acceptance on 2026-11-11: all four existing desktop/mobile builder journeys passed (`validation-results/2026-11-11T12-05-51-706Z-builder-brand`). Computed theme colours, primary-button contrast, review-dialog surfaces and six viewport widths passed in both themes (`validation-results/builder-brand-visual-checks.json`), with `builder-brand-*` screenshots alongside it. The running isolated dummy preview was refreshed with the revised stylesheet.

Grouping/typography acceptance on 2026-11-11: all four updated desktop/mobile journeys passed with explicit group and row-order checks (`validation-results/2026-11-11T12-22-14-472Z-builder-groups`); TypeScript passed. The builder's product names and prices were compared with the rendered catalogue's font family, and both themes passed six viewport widths and review-dialog checks (`validation-results/builder-groups-fonts-checks.json`). The running dummy preview includes the updated grouping, typography and inquiry loading fix.

## Prebuilt model names

Prebuilt catalogue names use the model and GPU: for example **Apex RTX 4080S** and **Kinetic Core RTX 4070 Ti**. The other models follow the same pattern: Minimalist White RTX 4080S, Creator Studio RTX 4070, Stealth Compact RTX 4060 Ti, Valkyrie RTX 4070S, Titan Studio RTX 4090 and Precision CAD RTX 4080S. Hardware selections and specifications retain their existing values.

The builder header and its review display **INCUS Apex RTX 4080S Custom Built Gaming PC**. The INCUS prefix and Custom Built Gaming PC suffix are presentation for this page; catalogue/product titles, shared name metadata and cart names use the model/GPU name. The linked product still opens normally. Both the old long names and earlier model-only names resolve to the new titles in public catalogue responses and shared builds, without writing to a connected database.

Acceptance: TypeScript, 82 focused catalogue/builder/privacy tests and all six desktop/mobile builder journeys passed (`validation-results/2026-11-16T14-05-57-165Z-prebuilt-gpu-names`). Live dummy-preview checks covered all eight public titles, product/cards, the exact builder title, older short-name links, right alignment and six widths (`validation-results/prebuilt-gpu-name-checks.json`). The dummy preview is refreshed.

## Opening a prebuilt in the builder

Prebuilts need explicit catalog links, not descriptive part names. `prebuiltBuilderUrl` accepts `builderParts`, a record of builder slot keys and selectable component IDs. The product page also reads this record from `specs.builderParts`. It offers **Customize this PC** only when those links resolve and every required slot is present. No approximate matching or substitution is used. The Apex sample (`pb-1`) includes an explicit mapping for testing; the other descriptive-only samples do not yet have mappings.

Example metadata:

```json
{
  "cpu": "cpu-1",
  "motherboard": "mb-1",
  "ram": "ram-1-var-ram-1-white-32",
  "gpu": "gpu-1",
  "cooler": "clr-1",
  "storage_primary": "str-1",
  "case": "cas-1",
  "psu": "psu-1",
  "os": "os-1"
}
```

The handoff uses `/builder?parts=slot:id,...&name=...&source=...&service=...`. Loading replaces the whole previous configuration atomically, so stale peripherals cannot leak into a different prebuilt. Share URLs include variation identity and the chosen service. The original handoff is the undo/reset baseline for that editing session. Opening a shared edited build makes its current selection the new baseline.

The picker continues to use the existing local hardware catalog; this change does not introduce a live catalog synchronizer or apply database updates. Linked IDs must be available in that catalog. A parent ID from an older share URL resolves to its first active variation. Unknown IDs and slot mismatches show an explicit missing-parts notice.

Custom PC estimates use individual component/variation prices, including available sale prices, plus the chosen service. They do not retain a prebuilt bundle discount. The UI discloses this. Checkout independently verifies catalog prices, stock, variation IDs and compatibility. An edited build enters the cart as a custom PC with real component selections, not as an unchanged prebuilt SKU.

## Additional drives

Primary storage stays in Main Components. Additional Components starts with Secondary storage and Tertiary storage, allowing up to three drives in total. The extra rows have no Optional tag and can remain empty without blocking checkout. All three slots use the same storage catalog and can hold different drives or three of the same SSD. Each selection is priced and reviewed separately, survives share URLs and the custom-PC cart payload, and supports baseline undo/reset.

Checkout accepts `storage_secondary` and `storage_tertiary` as additional selections from the `storage_primary` catalog. It prices every unit and aggregates inventory holds when the same SKU is selected more than once. Existing two-drive links and carts remain accepted. The extra slot is carried in existing JSON build metadata, so no schema migration is required. Available motherboard connectors and physical fit remain part of the existing final build review.

Acceptance: TypeScript, 43 focused configuration/checkout tests and all six desktop/mobile builder journeys passed (`validation-results/2026-11-16T11-06-28-925Z-builder-three-drives`), including three identical SSDs, insufficient combined stock, shared configurations, independent removal/undo, correct review rows and cart totals. The isolated dummy preview is refreshed.

## Assembly timings and saved build codes

The assembly choices are **Standard Build 5-7 Working Days** and **Express Priority Build 2-3 Working Days**. Both show **After all parts have been sourced** below the name, so the duration is not repeated. The same service IDs/prices are retained, and loaded configurations use the current service descriptions and timings. Desktop/mobile checks passed for the renamed options, sourcing caveat and unchanged service pricing.

The always-visible **Simulation Code** field replaces the Save/Load popups. **Save build** generates a code such as `INC-ABCD-EFGH-JKLM` and fills the field. Enter a code and choose **Preview build** to restore it on the page; lowercase and unhyphenated codes are accepted. Once a code is saved or previewed, the adjacent **Copy code** and **Copy link** icons share it. Errors and confirmation appear inline, and shared-code links fill the field automatically. Shared `/builder?code=...` links work in a fresh browser without an account or local storage. A saved simulation retains its component and variation IDs, all three storage selections, assembly service, name and source product. Loading replaces the entire current configuration and makes the loaded selection the new Undo/Reset baseline. Saving an incomplete or conflicting simulation is allowed once at least one valid part has been selected. Existing direct share links remain available.

Codes address immutable public snapshots in the existing `custom_builds` table. No new table or schema migration is needed. Twelve random unambiguous characters provide a short transferable code; creation is limited separately from reads. The read endpoint exposes only explicitly public simulation rows and whitelisted configuration fields. It does not return owners, stored prices or private build rows. Server parsing rejects unknown slots, misplaced/unknown products and injected IDs. Loading resolves current catalogue prices/availability and warns about missing historical parts. Saving does not create an order, reserve stock or call a provider.

The existing database assembly identifiers retain their historical names for compatibility; displayed timings come from `SERVICE_TIERS`. Connected deployments persist codes in Supabase. The isolated demo uses its existing shared in-memory repository, so demo codes survive different browser sessions but reset when that demo server restarts.

`tests/saved-builds.test.ts` covers shared snapshot fidelity, variation/drive identity, public projection, malformed input, missing/private codes, failed storage, unchanged inventory/orders and immutable saves. Browser checks include inline save failure/retry, code/link copying, invalid-code recovery, restored service/totals, the absence of save/preview dialogs, top alignment with the PC-name container and loading a link in another browser context.

Acceptance: all 690 tests across 61 files and TypeScript passed (`validation-results/2026-11-17T05-03-29-528Z-unit`), all eight desktop/mobile builder journeys passed (`validation-results/2026-11-17T05-04-02-686Z-builder-save-codes`), and isolated production compilation passed (`validation-results/2026-11-17T05-05-17-839Z-build`). The refreshed dummy preview also passed save/code-link restoration and dialog geometry at six widths (`validation-results/build-code-preview-checks.json`).

Inline-control acceptance: TypeScript and all eight desktop/mobile builder journeys passed (`validation-results/2026-11-17T06-03-14-962Z-inline-simulation-code`). Both themes and seven screen widths passed page-width, exact desktop top alignment and save-without-dialog checks (`validation-results/inline-simulation-layout.json`). The running dummy preview includes the new inline field and actions.

## Sticky summary clearance

The floating configuration summary uses the persistent header's measured height plus 24px, rather than fixed 112px/145px offsets. The header publishes its height through `--persistent-header-height`, using ResizeObserver for responsive/content changes. It reserves the full category-bar height before revealing the bar, and follows its animated height as it collapses. The same offset sets component scroll margins and the summary's available viewport height. Mobile keeps its existing static summary.

Frame-by-frame checks at 1024, 1280, 1440 and 1920px maintained at least 24px clearance while scrolling both ways and rapidly reversing direction (`validation-results/builder-header-clearance-checks.json`). Before the correction the gap was 0px collapsed and -15px expanded. A browser regression also covers viewport resizing and a header-height change after scrolling. TypeScript and all ten desktop/mobile builder journeys passed (`validation-results/2026-11-17T10-25-13-446Z-builder-header-clearance`). The running dummy preview is refreshed.

## Dummy preview

Run `npm run preview:builder`, then open `http://127.0.0.1:3219/products/pb-1` and select **Customize this PC**. The launcher copies the app into a temporary directory, excludes environment files, strips provider credentials and runs with `APP_ENV=demo`. Payments, shipments and notifications remain simulated. Public image downloads are allowed for visual review. Stop the launcher to remove its temporary copy. Restart the preview after source changes to refresh that copy.

No database migration is needed for this layout. Linking real prebuilts to their actual catalog parts is separate content preparation.

## Validation

`tests/builder-configuration.test.ts` covers atomic handoff/reset, variation and sale-price identity, shared links, invalid slot/ID handling, explicit prebuilt mappings, and relevant socket/memory/dimension checks. `tests/e2e/builder.spec.ts` covers the actual product-to-builder handoff, swaps, undo/reset, missing components, sharing, a simulated inquiry, cart identity and six screen widths across desktop/mobile projects. Browser fixtures do not send messages, create real orders or contact real providers.

Use `npm run validate -- --stage unit`, `--stage browser` and `--stage build` for the isolated checks. Screenshots use fixture images and are functional layout evidence, not approval of final catalog photography.

Local acceptance on 2026-11-11: 664 tests across 60 files and TypeScript passed (`validation-results/2026-11-11T11-31-06-042Z-unit`), all 18 desktop/mobile browser journeys passed (`validation-results/2026-11-11T11-34-48-867Z-browser`), and final isolated production compilation passed (`validation-results/2026-11-11T11-41-27-104Z-build`). A subsequent detail correction makes variation capacity override the parent's capacity in replacement cards; all 13 focused configuration/variation/cart tests passed after that correction. The dummy preview also loaded its three visible product images through the real image optimizer. These results do not certify hosted catalog content or live provider behavior.

