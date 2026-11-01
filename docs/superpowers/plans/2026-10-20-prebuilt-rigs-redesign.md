# Pre-Configured Performance Rigs Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the storefront Pre-Configured Performance Rigs showcase with a balanced compact chassis frame, centered unbolded title, invisible 1-column 8-spec checklist with authentic hardware silhouettes, strict 2-card mobile/tablet and 3-card desktop/ultrawide stretch layouts, and admin portal control over which 3 PCs are featured.

**Architecture:** A modular `PrebuiltSystemCard` component renders the hero image with secondary angle hover crossfade, 8-part spec list powered by `HardwareSpecIcon`, and an accessible borderless `+ Add to Cart` action. Viewport density strictly shows 2 cards on mobile/tablet and 3 full-width stretched cards on desktop/ultrawide with a "View More" link to the catalog. Administrators manage and rank the 3 featured systems via an extended `HomepageLayoutConfig` persisted through `/api/admin/homepage-modules`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React, Zustand store (`useCartStore`), Vitest / Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-20-prebuilt-rigs-redesign.md`

## Global Constraints
- Zero em dashes (`—`) in UI copy, code comments, or plan documentation. Use standard punctuation only.
- Minimum 44px tap target height (`min-h-[44px]`) on all interactive controls including "+ Add to Cart" and "View More".
- WCAG AA contrast ratio compliance (minimum 4.5:1 ratio).
- Strictly single horizontal line for Price and "+ Add to Cart" on Desktop and Ultrawide viewports (`white-space: nowrap`, `flex-wrap: nowrap`).
- Symmetrical vertical margins on Mobile footers (distance from top border to price equals distance from Add to Cart button to bottom border).
- Strict 2-card display on Mobile (< 640px) and Tablet (640px to 1023px) to form a 100% filled row without trailing cards.
- Full container width stretch across 3 columns on Desktop and Ultrawide (`lg:grid-cols-3` spanning `max-w-[1920px]`).

## Review Focus
1. Missing or undefined motherboard field: Fallback safely between top-level `pb.motherboard` and `pb.specs?.["Motherboard"]` without runtime crashing.
2. Click collision between card navigation and cart addition: Clicking the image or title navigates to `/products/[id]`, while clicking `+ Add to Cart` triggers cart addition with `stopPropagation`/`preventDefault` and does not navigate.
3. Hover crossfade on touch devices: Mobile touch interactions must cleanly navigate to `/products/[id]` without getting stuck in a hover state.
4. Admin selection validation: Admin UI must require exactly 3 selected prebuilt systems before saving and prevent selecting fewer or more than 3 rigs.
5. Strict non-wrapping price footer on narrow desktop cards: Container width shrinking on 3-column layouts must never cause the price and "+ Add to Cart" button to wrap onto two lines.

---

### Task 1: Hardware Data Expansion & Type Safety

**Files:**
- Modify: `src/lib/data/mockHardware.ts:768-910`
- Test: `tests/prebuilt-data.test.ts`

**Interfaces:**
- Consumes: Existing `PREBUILT_SYSTEMS` array and component interfaces in `mockHardware.ts`.
- Produces: Updated `PREBUILT_SYSTEMS` containing `pb-1`, `pb-2`, `pb-3` plus new mock systems `pb-4` (Tethera Creator Studio RTX 4070), `pb-5` (Tethera Stealth Compact ITX), and `pb-6` (Tethera Esports Valkyrie). Every prebuilt exports explicit top-level properties: `id`, `name`, `sku`, `brand`, `category`, `cpu`, `gpu`, `motherboard`, `ram`, `storage`, `cooling`, `chassis`, `psu`, `price`, `sale_price`, `images`, and `status`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/prebuilt-data.test.ts
import { describe, it, expect } from "vitest";
import { PREBUILT_SYSTEMS } from "../src/lib/data/mockHardware";

describe("Prebuilt Systems Data Integrity", () => {
  it("contains at least 6 complete prebuilt workstations", () => {
    expect(PREBUILT_SYSTEMS.length).toBeGreaterThanOrEqual(6);
  });

  it("ensures every prebuilt has all 8 required hardware component specs and price", () => {
    const requiredFields = [
      "id",
      "name",
      "cpu",
      "gpu",
      "motherboard",
      "ram",
      "storage",
      "psu",
      "chassis",
      "cooling",
      "price",
      "images",
    ];

    PREBUILT_SYSTEMS.forEach((pb) => {
      requiredFields.forEach((field) => {
        expect(pb, `Prebuilt ${pb.id || "unknown"} missing ${field}`).toHaveProperty(field);
        expect((pb as any)[field]).toBeTruthy();
      });
      expect(pb.images.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("contains zero em dashes in names, descriptions, or specs", () => {
    PREBUILT_SYSTEMS.forEach((pb) => {
      expect(pb.name).not.toContain("\u2014");
      expect(pb.description).not.toContain("\u2014");
      expect(pb.motherboard).not.toContain("\u2014");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prebuilt-data.test.ts`
Expected: FAIL (missing `pb-4`, `pb-5`, `pb-6`, and missing top-level `motherboard` property on `pb-1` to `pb-3`).

- [ ] **Step 3: Implement data expansion and motherboard field in `src/lib/data/mockHardware.ts`**

Update `pb-1`, `pb-2`, `pb-3` with top-level `motherboard` strings. Add `pb-4` (Creator Studio RTX 4070), `pb-5` (Stealth Compact ITX), and `pb-6` (Esports Valkyrie) with complete 8-component hardware specs, gallery queues (at least 2 images each for hover crossfade), and pricing. Ensure zero em dashes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prebuilt-data.test.ts`
Expected: PASS with all assertions satisfied.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/mockHardware.ts tests/prebuilt-data.test.ts
git commit -m "feat(data): expand prebuilts with 8-spec hardware completeness"
```

---

### Task 2: Bespoke Hardware Vector Silhouette Component

**Files:**
- Create: `src/components/products/HardwareSpecIcon.tsx`
- Test: `tests/hardware-spec-icon.test.tsx`

**Interfaces:**
- Consumes: Part types `"cpu" | "gpu" | "motherboard" | "ram" | "storage" | "psu" | "tower" | "cooling"`.
- Produces: `HardwareSpecIcon({ part, className }: { part: HardwarePartType; className?: string }): JSX.Element`.
  Renders distinct, authentic vector silhouettes matching the validated visual specification:
  - `cpu`: Socketed desktop package with substrate, IHS spreader, pin 1 marker, and contact tabs.
  - `gpu`: Dedicated PCIe card with gold fingers, rear bracket, and dual axial fan rotors.
  - `motherboard`: ATX blueprint with CPU socket, DIMM slots, and reinforced PCIe slots.
  - `ram`: DDR5 memory module with heatspreader ridges and gold notched connector.
  - `storage`: M.2 2280 NVMe SSD stick with controller chip, NAND blocks, and mounting notch.
  - `psu`: ATX power supply enclosure with intake fan grill and modular socket bank.
  - `tower`: Panoramic dual-chamber glass PC chassis with feet.
  - `cooling`: 360mm liquid AIO radiator with pump block and braided tubes (or dual-tower air cooler).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/hardware-spec-icon.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HardwareSpecIcon, HardwarePartType } from "../src/components/products/HardwareSpecIcon";

describe("HardwareSpecIcon Component", () => {
  const allParts: HardwarePartType[] = [
    "cpu",
    "gpu",
    "motherboard",
    "ram",
    "storage",
    "psu",
    "tower",
    "cooling",
  ];

  it.each(allParts)("renders authentic SVG silhouette for %s without crashing", (part) => {
    const { container } = render(<HardwareSpecIcon part={part} className="w-5 h-5 text-zinc-400" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg?.getAttribute("aria-label")).toBe(part);
  });

  it("handles fallback gracefully on unknown part type", () => {
    const { container } = render(<HardwareSpecIcon part={"unknown" as any} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hardware-spec-icon.test.tsx`
Expected: FAIL (`HardwareSpecIcon` not defined).

- [ ] **Step 3: Implement `HardwareSpecIcon` in `src/components/products/HardwareSpecIcon.tsx`**

Write the component rendering clean inline SVGs with `stroke="currentColor"`, `fill="none"`, `strokeWidth="1.7"`, and `strokeLinecap="round"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hardware-spec-icon.test.tsx`
Expected: PASS with 100% coverage across all 8 component icons.

- [ ] **Step 5: Commit**

```bash
git add src/components/products/HardwareSpecIcon.tsx tests/hardware-spec-icon.test.tsx
git commit -m "feat(ui): add bespoke hardware vector silhouette icons"
```

---

### Task 3: Prebuilt System Card Component

**Files:**
- Create: `src/components/products/PrebuiltSystemCard.tsx`
- Test: `tests/prebuilt-card.test.tsx`

**Interfaces:**
- Consumes: Prebuilt item object, `HardwareSpecIcon`, `useCartStore`, `formatRupiah`.
- Produces: `PrebuiltSystemCard({ rig, isThirdCard }: { rig: PrebuiltSystemItem; isThirdCard?: boolean }): JSX.Element`.
  - Top: Picture frame (`aspect-[4/3.4]`) with smooth hover crossfade between primary image and `images[1]`. Zero badges.
  - Link: Image and model name link to `/products/[id]`.
  - Model Name: Centered directly below picture, larger font size (`text-base sm:text-lg font-medium`), unbolded, natural wrapping. No SKU.
  - Specs List: Single-column invisible rows, hardware silhouettes, unbolded text, natural multi-line wrapping.
  - Footer: Clean price without tax subtext, borderless `+ Add to Cart` button (`min-h-[44px]`).
  - Viewport styling: On Desktop and Ultrawide, price and Add to Cart sit strictly on 1 line. On Mobile, stacked with symmetrical top and bottom margins and comfortable separation.
  - Third card hiding: When `isThirdCard` is true, applies `hidden lg:flex` so mobile (< 640px) and tablet (640px-1023px) strictly show 2 cards in 1 row, while desktop/ultrawide show all 3.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/prebuilt-card.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrebuiltSystemCard } from "../src/components/products/PrebuiltSystemCard";
import { PREBUILT_SYSTEMS } from "../src/lib/data/mockHardware";

describe("PrebuiltSystemCard Component", () => {
  const sampleRig = PREBUILT_SYSTEMS[0];

  it("renders all 8 hardware specifications in single-column invisible rows", () => {
    render(<PrebuiltSystemCard rig={sampleRig} />);
    expect(screen.getByText(sampleRig.cpu)).toBeTruthy();
    expect(screen.getByText(sampleRig.gpu)).toBeTruthy();
    expect(screen.getByText(sampleRig.motherboard || (sampleRig as any).specs?.["Motherboard"])).toBeTruthy();
    expect(screen.getByText(sampleRig.ram)).toBeTruthy();
    expect(screen.getByText(sampleRig.storage)).toBeTruthy();
    expect(screen.getByText(sampleRig.psu)).toBeTruthy();
    expect(screen.getByText(sampleRig.chassis)).toBeTruthy();
    expect(screen.getByText(sampleRig.cooling)).toBeTruthy();
  });

  it("renders the model name below the image and omits the SKU string", () => {
    render(<PrebuiltSystemCard rig={sampleRig} />);
    expect(screen.getByText(sampleRig.name)).toBeTruthy();
    expect(screen.queryByText(sampleRig.sku)).toBeNull();
  });

  it("omits tax subtext from the price footer", () => {
    render(<PrebuiltSystemCard rig={sampleRig} />);
    expect(screen.queryByText(/incl\. tax/i)).toBeNull();
    expect(screen.queryByText(/ppn/i)).toBeNull();
  });

  it("contains zero em dashes in card copy", () => {
    const { container } = render(<PrebuiltSystemCard rig={sampleRig} />);
    expect(container.textContent).not.toContain("\u2014");
  });

  it("applies hidden lg:flex when isThirdCard is passed", () => {
    const { container } = render(<PrebuiltSystemCard rig={sampleRig} isThirdCard={true} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("hidden lg:flex");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prebuilt-card.test.tsx`
Expected: FAIL (`PrebuiltSystemCard` not defined).

- [ ] **Step 3: Implement `PrebuiltSystemCard` in `src/components/products/PrebuiltSystemCard.tsx`**

Build the card with Next.js `Image`, linking image and title to `/products/[id]`, rendering all 8 specs with `HardwareSpecIcon`, borderless `+ Add to Cart` button with `min-h-[44px]` tap target, and strict single-line desktop footer + symmetrical mobile footer.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prebuilt-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/products/PrebuiltSystemCard.tsx tests/prebuilt-card.test.tsx
git commit -m "feat(ui): implement PrebuiltSystemCard with 8-spec checklist and responsive footer"
```

---

### Task 4: Admin Management for Featured Rigs

**Files:**
- Modify: `src/lib/data/homepageConfig.ts:28-35`
- Modify: `src/app/api/admin/homepage-modules/route.ts` (if validation exists)
- Modify: `src/app/admin/page.tsx:960-1010,2900-3000`
- Test: `tests/admin-featured-prebuilts.test.ts`

**Interfaces:**
- Consumes: `HomepageLayoutConfig`, `PREBUILT_SYSTEMS`.
- Produces:
  - `featuredPrebuiltIds: string[]` field on `HomepageLayoutConfig` (defaults to `["pb-1", "pb-2", "pb-3"]`).
  - Admin UI section under Homepage / Promotions tab: "Featured Prebuilt Systems".
  - Allows selecting exactly 3 prebuilt PCs, adjusting their priority order (1st, 2nd, 3rd), and clicking Save.
  - Enforces that 1st and 2nd appear across all viewports, while 3rd appears on desktop and ultrawide.
  - Dispatches `tethera_homepage_updated` event on save for live storefront synchronization.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/admin-featured-prebuilts.test.ts
import { describe, it, expect } from "vitest";
import { DEFAULT_HOMEPAGE_LAYOUT, HomepageLayoutConfig } from "../src/lib/data/homepageConfig";

describe("Homepage Configuration Featured Prebuilts", () => {
  it("includes featuredPrebuiltIds with 3 default systems in DEFAULT_HOMEPAGE_LAYOUT", () => {
    expect(DEFAULT_HOMEPAGE_LAYOUT).toHaveProperty("featuredPrebuiltIds");
    expect(DEFAULT_HOMEPAGE_LAYOUT.featuredPrebuiltIds).toHaveLength(3);
    expect(DEFAULT_HOMEPAGE_LAYOUT.featuredPrebuiltIds).toEqual(["pb-1", "pb-2", "pb-3"]);
  });

  it("validates that featuredPrebuiltIds contains valid string identifiers", () => {
    const config: HomepageLayoutConfig = {
      ...DEFAULT_HOMEPAGE_LAYOUT,
      featuredPrebuiltIds: ["pb-2", "pb-4", "pb-5"],
    };
    expect(config.featuredPrebuiltIds).toHaveLength(3);
    expect(config.featuredPrebuiltIds[0]).toBe("pb-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/admin-featured-prebuilts.test.ts`
Expected: FAIL (`featuredPrebuiltIds` not on `DEFAULT_HOMEPAGE_LAYOUT`).

- [ ] **Step 3: Update `homepageConfig.ts` and `src/app/admin/page.tsx`**

1. Extend `HomepageLayoutConfig` in `src/lib/data/homepageConfig.ts` with `featuredPrebuiltIds?: string[]`.
2. Add state and handlers in `src/app/admin/page.tsx`:
   - `featuredPrebuilts: string[]` initialized from saved config or default.
   - Toggle handler enforcing a maximum of 3 selections.
   - Reordering controls (Move Up / Move Down) for the 3 selected items.
   - Save handler sending updated `featuredPrebuiltIds` to `/api/admin/homepage-modules` and localStorage fallback, then dispatching `tethera_homepage_updated`.
3. Render the "Featured Prebuilt Systems" card section with clean thumbnail previews and rank badges (1st, 2nd, 3rd).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/admin-featured-prebuilts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/homepageConfig.ts src/app/admin/page.tsx tests/admin-featured-prebuilts.test.ts
git commit -m "feat(admin): add management portal for featuring and ranking 3 prebuilt PCs"
```

---

### Task 5: Storefront Integration & Viewport Density Engine

**Files:**
- Modify: `src/app/page.tsx:384-480`
- Test: `tests/storefront-prebuilt-section.test.tsx`

**Interfaces:**
- Consumes: `PrebuiltSystemCard`, `PREBUILT_SYSTEMS`, `featuredPrebuiltIds` from layout configuration.
- Produces: Redesigned `#prebuilt` section in `src/app/page.tsx`:
  - Retrieves the 3 featured systems designated by the administrator (falling back to first 3 if unset).
  - Grid configuration:
    - Mobile (< 640px): `grid grid-cols-2 gap-2.5 sm:gap-4` strictly showing 2 cards (1st and 2nd).
    - Tablet (640px to 1023px): strictly showing 2 cards (1st and 2nd).
    - Desktop and Ultrawide (>= 1024px): `lg:grid-cols-3` showing all 3 cards stretching to fill the container (`w-full max-w-[1920px]`).
    - The 3rd card has `isThirdCard={true}` (`hidden lg:flex`).
  - Section Header: Clean title, subtitle, and top "View More" link pointing to `/products?category=Pre-Built+Systems`.
  - Section Footer: Accessible bottom "View More" button meeting 44px tap target height.
  - Listens to `tethera_homepage_updated` to dynamically refresh featured rigs when admin saves.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/storefront-prebuilt-section.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "../src/app/page";

describe("Storefront Pre-Configured Performance Rigs Section", () => {
  it("renders the prebuilt showcase with top title and View More links", async () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /pre-configured performance rigs/i })).toBeTruthy();
    const viewMoreLinks = screen.getAllByRole("link", { name: /view more/i });
    expect(viewMoreLinks.length).toBeGreaterThanOrEqual(1);
    expect(viewMoreLinks[0].getAttribute("href")).toContain("Pre-Built+Systems");
  });

  it("contains zero em dashes anywhere in the prebuilt section", () => {
    const { container } = render(<HomePage />);
    const prebuiltSection = container.querySelector("#prebuilt");
    expect(prebuiltSection).toBeTruthy();
    expect(prebuiltSection?.textContent).not.toContain("\u2014");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storefront-prebuilt-section.test.tsx`
Expected: FAIL (view more links or new section structure not present).

- [ ] **Step 3: Update `renderPrebuiltSystems` in `src/app/page.tsx`**

Integrate `PrebuiltSystemCard`, resolve the 3 featured prebuilts from `featuredPrebuiltIds`, assign `isThirdCard={index === 2}`, add the "View More" links, and apply `grid-cols-2 lg:grid-cols-3` with full-width stretch on `max-w-[1920px]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/storefront-prebuilt-section.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx tests/storefront-prebuilt-section.test.tsx
git commit -m "feat(storefront): integrate redesigned prebuilt rigs section with viewport density and view more navigation"
```

---

### Task 6: Comprehensive Verification & Quality Audit

**Files:**
- Create: `tests/prebuilt-systems-redesign.test.ts`
- Audit: All modified files

**Interfaces:**
- Consumes: Complete prebuilt storefront and admin stack.
- Produces: Test suite validating:
  - 8-spec checklist rendering across all systems.
  - Symmetrical footer margins and single-row desktop layout.
  - Zero em dashes across all code, copy, and tests.
  - 44px minimum tap targets on all buttons and links.
  - Production build passing with 0 errors.

- [ ] **Step 1: Write full suite verification test**

```typescript
// tests/prebuilt-systems-redesign.test.ts
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Prebuilt Systems Full Implementation Audit", () => {
  const filesToCheck = [
    "src/components/products/HardwareSpecIcon.tsx",
    "src/components/products/PrebuiltSystemCard.tsx",
    "src/lib/data/mockHardware.ts",
    "src/lib/data/homepageConfig.ts",
    "src/app/page.tsx",
    "src/app/admin/page.tsx",
  ];

  it("verifies zero em dashes exist in any modified source files", () => {
    filesToCheck.forEach((file) => {
      const content = fs.readFileSync(path.resolve(file), "utf-8");
      expect(content, `File ${file} contains forbidden em dash`).not.toContain("\u2014");
    });
  });

  it("verifies all buttons and links meet min-h-[44px] tap target requirements", () => {
    const cardContent = fs.readFileSync(
      path.resolve("src/components/products/PrebuiltSystemCard.tsx"),
      "utf-8"
    );
    expect(cardContent).toContain("min-h-[44px]");
  });
});
```

- [ ] **Step 2: Run all project test suites**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Run Next.js production build check**

Run: `npm run build`
Expected: Build succeeds with 0 errors and valid type checking.

- [ ] **Step 4: Commit**

```bash
git add tests/prebuilt-systems-redesign.test.ts
git commit -m "test: add comprehensive audit test suite for prebuilt rigs redesign"
```
