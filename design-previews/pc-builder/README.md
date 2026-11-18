# PC Builder design concepts

Visual prototypes for merchant review. The selected A direction has now been implemented in the application's `/builder` page, without the starting-build chooser. See `docs/pc-builder.md` at the repository root for the implementation, prebuilt handoff and dummy preview. Historical prototypes remain isolated from the application state.

- **A — Guided:** calm, light layout; component progress on the left, focused card selection in the centre, persistent summary on the right.
- **B — Studio:** dark, photographic layout; selected components frame a large PC inspiration image, with a separate purchase summary.
- **C — Workbench:** compact comparison table, technical specifications and an itemized build overview.

Open `index.html` locally, or serve this folder with `python -m http.server 3218 --bind 127.0.0.1 --directory design-previews/pc-builder`. Use `?view=guided`, `?view=studio` or `?view=workbench` to open a particular concept. GPU selection and vendor filters update the sample subtotal; Save stores the sample in this tab's session, and Review shows a local dialog. There are no real cart, payment, messaging or provider calls.

The same sample configuration is used across concepts: six selected parts, with case and cooling still missing. Its default subtotal is Rp 26.490.000. Selecting a different sample GPU updates the subtotal consistently. Pricing is illustrative. Compatibility language refers to selected parts and explicitly leaves final case/cooling checks pending; no new warranty, delivery-time, tax or performance promise is introduced.

English only, with IDR pricing. Local assets avoid blank previews or dependencies on the live API configuration. PC photos are existing storefront Unsplash references, used as build inspiration, not as a claim that the pictured machine matches the selected configuration. Generic GPU illustrations are authored SVG. Font licenses are the existing Inter and JetBrains Mono OFL files under `public/licenses/fonts`.

Desktop and mobile PNG renders are in `renders/`. The prototypes document the explored layouts; A is the selected direction.

## Complete builds and inline selection — latest exploration

The merchant preferred the complete-build and inline-selection concepts. [Open three related alternatives](refinements.html) at `http://127.0.0.1:3218/refinements.html`:

- **A / Build & refine** (`?flow=packages`): the selected direction, now without the starting-build chooser. It opens an incoming sample PC directly, with grouped inline replacements, customization costs, per-part undo and reset all. The application implementation is documented in `docs/pc-builder.md` at the repository root.
- **B / Parts & compare** (`?flow=split`): a compact selected-parts rail beside a specification comparison table. Part prices and the differences against the current selection align across columns.
- **C / Build tiles** (`?flow=tiles`): eight component tiles, with a replacement shelf opening immediately beneath the selected tile's row. Mobile uses two tiles per row.

All three start with eight selected sample parts, show live subtotals and restrict replacements using the shared sample compatibility checks. B and C retain their starting-build selectors. Restoring one starter part is blocked when it conflicts with the current configuration; resetting the entire configuration restores its linked parts together. Changes in these static previews are in memory only and do not affect saved Studio samples. These previews do not create orders or make external requests. The selected A layout has also been implemented in the application's builder.

The variants use `refinements.html`, `refinements.js`, `refinements.css` and the existing isolated `flows.js` / `studio-core.js` helpers. Run `node design-previews/pc-builder/verify-refinements.cjs`; `refinement-verification.json` records subtotal/delta reconciliation, restore actions, compact-case restrictions and corrective swaps, dialogs/focus, mobile shelf placement and six viewport widths. The original workflow checks also pass. New desktop/mobile images use the `refine-` prefix in `renders/`.

## Three workflow alternatives — previous exploration

The merchant rejected Studio / 03 as too close to the live builder. [Open the new workflows](flows.html), served at `http://127.0.0.1:3218/flows.html`, to compare three interaction models:

- **Inline selection:** expand one component row and select from specification cards inside it. No product-picker modal. The subtotal stays visible.
- **Guided setup:** a full-width product-selection step, with a clickable eight-part checklist and persistent subtotal, Back and Next controls. Missing selections block Next.
- **Start with a build:** choose a complete sample configuration, then select any included part to swap. Options show the difference against the current part's price; compact-case clearance blocks oversized graphics cards.

Use `?flow=inline`, `?flow=guided` or `?flow=preset`. Each opens an independent in-memory sample. The initial inline/guided examples have six parts selected to make choosing the remaining parts easy to try; the preset examples have all eight. These concepts reuse the isolated sample catalog in `studio-core.js`, with their own `flows.html`, `flows.js` and `flows.css`. They do not alter the live builder, save over Studio samples, create orders or contact external services.

Run `node design-previews/pc-builder/verify-flows.cjs`. `flow-verification.json` records exact subtotal and swap-difference checks, missing-step handling, fit constraints, review dialogs, mobile interactions, keyboard focus and six viewport widths. New desktop/mobile renders use the `flow-` prefix. Product illustrations are generic; prices and checks are sample data.

## Studio / 03 — previous exploration

The current [Studio preview](studio.html), at `http://127.0.0.1:3218/studio.html`, returns to the original builder's clear two-column structure in response to merchant feedback. It keeps the dark Studio styling, removes the large inspiration image and promotional headlines, and places all eight component rows beside the build summary. Each row has an explicit Select/Change action; comparison and detailed fit checks open only when requested.

The preview retains sample selections, removal, filters, comparison, assembly/accessory pricing, saved names, sharing, and platform-change confirmation. Mobile has the same component list and a fixed subtotal/review button. Use `node design-previews/pc-builder/verify-studio.cjs` for the current checks; results in `studio-verification.json` cover exact totals, the revised selection flow and six screen widths. Current renders use `studio-v03-` filenames. The live builder remains unchanged.

The current view uses `studio-core.js` for the isolated sample model, `studio.js` for the interface and `studio-v03.css` for styling. Its saved-build namespace is separate from the live application and can read an earlier Studio sample save. No real orders or provider calls are made.

## Studio / 02 — archived

The earlier expanded Studio prototype is [studio-v02.html](studio-v02.html). The gallery's Studio button and `?view=studio` open the current revision above. Use `?view=studio&original=1` for the initial sketch; its original renders remain available.

Studio / 02 adds:

- Eight selectable core component categories, with search, brand/fit filters and price sorting.
- A full PC inspiration image, plus parts-list and specification-check views.
- Two-part comparison, itemized price breakdown and a build-review dialog.
- Explicit confirmation before a processor/motherboard platform change removes the mismatched counterpart.
- Optional assembly, mouse and keyboard choices that reconcile with the subtotal.
- Named sample builds saved on this device, and share URLs that restore the chosen sample in a fresh browser context.
- A persistent mobile subtotal/review control, keyboard-operated view tabs and explicit pending/conflict states.

All logic is confined to this design preview. It uses illustrative prices/specifications, not the production catalog or compatibility engine. The live `/builder` page has not been replaced. No transaction, message, external-provider request or connected database mutation is made. Shared links contain the sample build name and selected component/service/accessory IDs; avoid putting personal information in a build name.

The archived version's browser script is `verify-studio-v02.cjs`. Its earlier checks covered selection, exact totals, comparisons, completion/review, saves, share restoration, platform confirmation, conflict filtering, search recovery, keyboard tabs and escaped names. The clipboard is intercepted in the verification browser so tests do not overwrite the user's clipboard.

Verification passed at 320, 390, 768, 1024, 1440 and 1920 pixels with no page overflow or missing images. New renders use the `studio-v02-` prefix, including desktop, mobile, component picker, comparison, checks and build review. Font license copies are included in `assets/`.
