# Design Document: Pre-Configured Performance Rigs Redesign

## 1. Intent and Context
The homepage showcase for "Pre-Configured Performance Rigs" (`src/app/page.tsx`) previously used squashed horizontal picture containers, omitted key hardware specifications (showing only 4 components instead of the full build spec), presented cluttered status badges, lacked dynamic viewport awareness, and lacked admin management for featuring specific turnkey systems.

This redesign aligns the section with Tethera's craft-first engineering aesthetic, giving customers complete at-a-glance transparency for turnkey desktop workstations across mobile, tablet, desktop, and ultrawide displays, while giving store administrators full control over which PCs are featured on the storefront.

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Redesign the prebuilt rig card with a balanced compact picture frame and the system name centered directly below the photo.
- Showcase the complete 8-component hardware specification list: CPU, GPU, Motherboard, RAM, Storage, PSU, Tower (Chassis), and Cooling, plus Price.
- Replace generic icons with authentic vector silhouettes for each of the 8 parts.
- Eliminate all container boxes, pills, and borders around specs for an invisible, ultra-clean aesthetic.
- Support natural multi-line text wrapping for hardware names without truncation or ellipses.
- Support smooth secondary angle crossfade when hovering over the chassis picture, with no overlay badges.
- Deliver an interactive, borderless "+ Add to Cart" action with an accessible 44px tap target.
- Enforce strictly one horizontal line for Price and "+ Add to Cart" on Ultrawide, Desktop, and Tablet layouts.
- Provide a 2-column mobile and tablet layout strictly showing 2 rigs (1 fully populated row) with equalized, symmetrical top and bottom footer margins.
- Provide a 3-column desktop and ultrawide layout showing 3 rigs stretching horizontally across the full container width (`lg:grid-cols-3` spanning `max-w-[1920px]`).
- Display a prominent "View More" button linking to the prebuilt systems category page (`/products?category=Pre-Built+Systems`).
- Provide an Admin Portal interface allowing administrators to choose, reorder, and save which 3 prebuilt systems are featured on the homepage.
- Expand `mockHardware.ts` with additional complete prebuilts (`pb-4`, `pb-5`, `pb-6`) so admins have an active catalog of rigs to pick from.

### Non-Goals
- Modifying the underlying checkout or custom PC builder workflows.
- Altering other catalog sections (such as single component tiles or promotional banners).
- Adding complex multi-step configuration modals inside the homepage card.

### Anti-Goals
- Generic AI slop: No purple-to-cyan gradients, no frosted glassmorphism overlays, no cluttered badges.
- Em dashes: Never use the em dash character in UI copy, code, or comments.
- Heavy bolding on specs: Text remains clean, readable, and medium/regular weight.
- Squashed or stretched photos: PC towers must remain visually proportional with no forced distortion.
- Orphan or trailing cards: Every viewport must feature fully populated, clean rows.

## 3. Constraints
- **Framework**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React (supplemented with bespoke SVG hardware silhouettes).
- **Accessibility**: Minimum 44px interactive tap target height (`min-h-[44px]`), WCAG AA contrast ratio (minimum 4.5:1).
- **Copywriting**: Zero em dashes anywhere in UI copy or source code. Standard punctuation only.

## 4. Architectural & Visual Specifications

### 4.1 Card Anatomy & Visual Hierarchy
The redesigned prebuilt card follows a vertical flow:
1. **Chassis Hero Image (Top)**:
   - Aspect ratio: `aspect-[4/3.4]` (compact balanced frame).
   - Container background: subtle radial dark gradient (`radial-gradient(circle at center, rgba(30, 41, 59, 0.4) 0%, rgba(10, 10, 14, 0.95) 100%)`).
   - Image rendering: `object-cover` with smooth transition.
   - Hover interaction: smoothly fades from primary image to secondary gallery angle (`images[1]`).
   - Badges: Zero badges overlaying the image (removed "Stress-Tested", "Flagship Ready", and "Hover for Angle 2").
   - Navigation: Clicking the hero picture navigates to `/products/[id]`.
2. **Prebuilt Model Name (Below Image)**:
   - Placement: Centered directly below the picture frame.
   - Typography: Larger font size (`text-base sm:text-lg font-medium`), unbolded.
   - Wrapping: `white-space: normal`, `break-words` (text flows onto multiple lines naturally without truncation).
   - SKU: Removed completely.
   - Navigation: Wrapped in a link navigating to `/products/[id]`.
3. **Invisible 8-Component Specifications (Body)**:
   - Container: Invisible, transparent, borderless rows (no boxes, pills, or cards).
   - Layout: Single column.
   - Alignment: Left hardware logo/silhouette (20x20px, top-aligned) + hardware description text.
   - Typography: Sized prominently, unbolded (`font-normal`), natural multi-line wrapping.
   - The 8 Components:
     1. **CPU**: Desktop processor package silhouette (integrated heat spreader, substrate wings, pin 1 marker).
     2. **GPU**: Dedicated PCIe graphics card silhouette (gold fingers, rear I/O bracket, dual axial fans).
     3. **Motherboard**: ATX motherboard blueprint (CPU socket, dual DIMM slots, reinforced PCIe lanes).
     4. **RAM**: High-performance DDR5 memory module (heatsink ridges, gold connector notch).
     5. **Storage**: M.2 2280 NVMe SSD stick (controller chip, NAND packages, rear mounting notch).
     6. **PSU**: ATX power supply enclosure (fan grill, modular connector bank).
     7. **Tower**: Modern dual-chamber panoramic glass chassis.
     8. **Cooling**: 360mm liquid AIO radiator with pump block and braided tubes (or dual-tower air cooler for air-cooled systems).
4. **Footer (Price & Action)**:
   - Price: Formatted in Indonesian Rupiah (e.g. `Rp 39.999.000`), active effective price (using `sale_price` if available), unbolded tax text removed completely.
   - Action: Transparent, borderless button with plus icon: `+ Add to Cart`. Meets 44px tap target height with emerald hover accent (`hover:text-emerald-500`). Clicking calls cart state store without triggering route navigation.
   - Desktop and Ultrawide Layout: Strictly single horizontal row with `white-space: nowrap` and `flex-wrap: nowrap`.
   - Mobile Layout: Stacked vertically with equalized margins (distance from footer top border to Price equals distance from Add to Cart button to footer bottom border) and comfortable vertical separation (`gap-2` to `gap-2.5`).

### 4.2 Display Density & Viewport Rules
To guarantee perfectly filled rows without trailing orphan cards across all device viewports:
- **Mobile (< 640px)**:
  - Strictly displays **2 cards** in a 2-column grid (`grid-cols-2`).
  - Forms 1 completely filled row.
- **Tablet (640px to 1023px)**:
  - Strictly displays **2 cards** in a 2-column grid (`md:grid-cols-2`).
  - Forms 1 completely filled row.
- **Desktop & Ultrawide (>= 1024px)**:
  - Displays all **3 featured cards** in a 3-column grid (`lg:grid-cols-3`).
  - The 3 cards stretch to fill the container width (`max-w-[1920px]`), ensuring every card has substantial presence and no vacant 4th column is left open.
- **Responsive Slicing & Implementation**:
  - The third featured card is conditionally shown on larger screens (`hidden lg:flex`), allowing mobile and tablet users to see a clean 2-card row while desktop/ultrawide users see all 3.
  - The "View More" button links to `/products?category=Pre-Built+Systems` for browsing the complete collection.

### 4.3 Admin Management for Featured Rigs
1. **Homepage Configuration Schema**:
   In `src/lib/data/homepageConfig.ts`, extend `HomepageLayoutConfig`:
   ```typescript
   export interface HomepageLayoutConfig {
     modules: HomepageModuleItem[];
     customPcHero: CustomPcHeroConfig;
     featuredPrebuiltIds?: string[]; // Array of exactly 3 prebuilt IDs (e.g. ["pb-1", "pb-2", "pb-3"])
   }
   ```
2. **Admin UI in `src/app/admin/page.tsx`**:
   - Add a "Featured Prebuilt Systems" configuration section within the Homepage / Promotions tab.
   - Displays all available prebuilt systems with their chassis thumbnails, names, and specs.
   - Allows the administrator to check/uncheck systems (enforcing a selection of 3 systems), reorder which rig appears 1st, 2nd, and 3rd, and click "Save Featured Systems".
   - The 1st and 2nd selected rigs will appear across all viewports (Mobile, Tablet, Desktop, Ultrawide). The 3rd selected rig will appear on Desktop and Ultrawide viewports.
   - Persists changes via the existing `/api/admin/homepage-modules` endpoint and Supabase/localStorage fallback with live event dispatching (`tethera_homepage_updated`).
3. **Storefront Hydration in `src/app/page.tsx`**:
   - Reads `featuredPrebuiltIds` from the layout configuration.
   - Retrieves and displays the configured prebuilts.
   - Falls back gracefully to the first systems in `PREBUILT_SYSTEMS` if unconfigured.

### 4.4 Data Layer Updates
In `src/lib/data/mockHardware.ts`:
- Ensure `PREBUILT_SYSTEMS` has top-level `motherboard` property populated for all entries.
- Add additional complete mock prebuilt systems (`pb-4`: Tethera Creator Studio RTX 4070, `pb-5`: Tethera Stealth Compact ITX, `pb-6`: Tethera Esports Valkyrie) with complete 8-component hardware specs, gallery queues, and pricing so administrators have a diverse pool to choose from.

## 5. What is Left to the Builder
- Component extraction: Create `PrebuiltSystemCard.tsx` and `HardwareSpecIcon.tsx` under `src/components/products/` or `src/components/home/`.
- Admin integration: Add the Featured Prebuilt selector in `src/app/admin/page.tsx`.
- Integration test coverage: Verify rendering of all 8 specs, 2-card mobile & tablet layout, 3-card desktop & ultrawide stretch, hover image crossfade, admin saving, and zero em dashes across all files.
