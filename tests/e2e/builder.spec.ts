import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PREBUILT_SYSTEMS } from "../../src/lib/data/mockHardware";
import { prebuiltBuilderUrl } from "../../src/lib/builder/configuration";

const origin = "http://127.0.0.1:3217";
const apexUrl = prebuiltBuilderUrl(PREBUILT_SYSTEMS[0])!;
test.beforeEach(async ({ page, context, request }) => {
  expect((await (await request.get("/api/auth/environment")).json()).demo).toBe(true);
  // Use local fixture photos, with genuine image elements and layout, without CDN traffic.
  const bytes = await readFile(path.resolve(process.cwd(), "public/incus-logo.png"));
  await context.route("**/*", async route => {
    if (route.request().resourceType() === "image") return route.fulfill({ contentType: "image/png", body: bytes });
    if (new URL(route.request().url()).origin === origin) return route.continue();
    return route.abort("blockedbyclient");
  });
  await page.addInitScript(() => {
    localStorage.setItem("incus_theme", "dark");
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => { (window as any).__builderShare = text; } }, configurable: true });
  });
});

test("prebuilt editing loads original parts, supports inline swaps and reset, and adds the actual variation to cart", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/products/pb-1");
  await expect(page.getByRole("heading", { name: "Apex RTX 4080S", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Customize this PC" }).click();
  await expect(page.getByRole("heading", { name: "Customize your PC" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "INCUS Apex RTX 4080S Custom Built Gaming PC", exact: true })).toBeVisible();
  for (const [name, keys] of [
    ["Main Components", ["cpu", "motherboard", "ram", "gpu", "storage_primary", "case", "psu"]],
    ["Additional Components", ["storage_secondary", "storage_tertiary", "cooler", "os", "other_peripherals", "mouse", "keyboard", "headphones", "mousepad"]],
  ] as const) {
    const group = page.getByRole("region", { name, exact: true });
    await expect(group).toBeVisible();
    expect(await group.locator('article[id^="builder-part-"]').evaluateAll(rows => rows.map(row => row.id.replace("builder-part-", "")))).toEqual([...keys]);
  }
  expect(await page.locator('section[aria-labelledby^="builder-group-"] > div > h2').allTextContents()).toEqual(["Main Components", "Additional Components"]);
  await expect(page.getByRole("region", { name: "Additional Components", exact: true }).getByRole("button", { name: "Select accessories", exact: true })).toBeVisible();
  await expect(page.getByText("Start with", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Optional", { exact: true })).toHaveCount(0);
  const total = page.locator("[data-builder-total]");
  await expect(total).toHaveText("Rp 42.491.000");
  await expect(page.locator("#builder-part-ram")).toContainText("White");
  const gpuOptions = page.getByRole("region", { name: "Graphics card options" });
  const gpuDetailsButton = gpuOptions.getByRole("button", { name: /View details for Gigabyte GeForce RTX 4070 Ti/ });
  await gpuDetailsButton.click();
  const productDetails = page.getByRole("dialog", { name: /Gigabyte GeForce RTX 4070 Ti/ });
  await expect(productDetails).toBeVisible();
  await expect(productDetails.getByText("Price difference", { exact: true })).toBeVisible();
  await expect(total).toHaveText("Rp 42.491.000");
  await page.keyboard.press("Escape");
  await expect(productDetails).not.toBeVisible();
  await expect(gpuDetailsButton).toBeFocused();
  await gpuDetailsButton.click();
  await productDetails.getByRole("button", { name: "Choose this replacement", exact: true }).click();
  await expect(productDetails).not.toBeVisible();
  await expect(total).toHaveText("Rp 40.291.000");
  const changes = page.getByRole("complementary", { name: "Your configuration", exact: true }).locator("details");
  await expect(changes).not.toHaveAttribute("open", "");
  await expect(page.getByRole("button", { name: "Undo graphics card change" })).toBeHidden();
  await changes.locator("summary").click();
  await expect(page.getByRole("button", { name: "Undo graphics card change" })).toBeVisible();
  await changes.locator("summary").click();
  await expect(page.getByRole("button", { name: "Undo graphics card change" })).toBeHidden();
  await changes.locator("summary").press("Enter");
  await page.getByRole("button", { name: "Undo graphics card change" }).click();
  await gpuOptions.getByRole("button", { name: /Swap to Gigabyte GeForce RTX 4070 Ti/ }).click();
  await expect(total).toHaveText("Rp 40.291.000");
  await expect(page.getByRole("button", { name: "Change graphics card", exact: true })).toHaveAttribute("aria-expanded", "true");
  await changes.locator("summary").click();
  await page.getByRole("button", { name: "Undo graphics card change" }).click();
  await expect(total).toHaveText("Rp 42.491.000");
  await page.getByRole("button", { name: "Change cpu", exact: true }).click();
  await page.getByRole("region", { name: "CPU options" }).getByRole("button", { name: /Swap to AMD Ryzen 9 7950X/ }).click();
  await expect(total).toHaveText("Rp 45.391.000");
  await page.getByRole("button", { name: "Reset changes", exact: true }).click();
  await expect(total).toHaveText("Rp 42.491.000");
  await expect(page.locator("#builder-part-cpu")).toContainText("7800X3D");
  await page.getByRole("button", { name: "Remove case", exact: true }).click();
  const reviewButton = page.getByRole("button", { name: "Review build", exact: true }).filter({ visible: true });
  await reviewButton.first().click();
  await expect(page.getByRole("button", { name: "Add configured PC to cart" })).toBeDisabled();
  await page.getByRole("button", { name: "Close build review" }).click();
  await changes.locator("summary").click();
  await page.getByRole("button", { name: "Undo case change" }).click();
  await page.getByRole("button", { name: "Share build", exact: true }).click();
  const shared = await page.evaluate(() => (window as any).__builderShare);
  expect(new URL(shared).searchParams.get("name")).toBe("Apex RTX 4080S");
  expect(shared).toContain("ram-1-var-ram-1-white-32");
  await page.goto(shared);
  await expect(total).toHaveText("Rp 42.491.000");
  await expect(page.getByRole("button", { name: "Reset changes", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ask about this build", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Demo: inquiry simulated" })).toBeVisible();
  await page.getByRole("button", { name: "Change graphics card", exact: true }).click();
  // Collapse and reopen so the screenshot shows the replacement shelf.
  await page.getByRole("button", { name: "Change graphics card", exact: true }).click();
  await page.screenshot({ path: path.join(process.env.VALIDATION_RESULTS_DIR!, `builder-a-${info.project.name}.png`), fullPage: !info.project.name.startsWith("mobile") });
  await reviewButton.first().click();
  await page.getByRole("button", { name: "Add configured PC to cart" }).click();
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("tethera_cart_storage")!).state.customPCs[0]);
  expect(cart.parts.ram.variationId).toBe("ram-1-white-32");
  expect(cart.parts.cpu.id).toBe("cpu-1");
  expect(cart.totalPrice).toBe(42491000);
  expect(cart.serviceTier.id).toBe("srv-standard");
  expect(cart.isPrebuilt).toBeUndefined();
  expect(cart.name).toBe("Apex RTX 4080S - Customized");
  expect(errors).toEqual([]);
});

test("three SSDs survive sharing, removal, undo and the cart with independent additional slots", async ({ page }) => {
  await page.goto(apexUrl);
  await page.getByRole("button", { name: "Select secondary storage", exact: true }).click();
  const options = page.getByRole("region", { name: "Secondary storage options", exact: true });
  await options.getByRole("button", { name: /Select Samsung 990 PRO 2TB/ }).click();
  await expect(page.locator("#builder-part-storage_primary")).toContainText("Samsung 990 PRO 2TB");
  await expect(page.locator("#builder-part-storage_secondary")).toContainText("Samsung 990 PRO 2TB");
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 45.390.000");
  await page.getByRole("button", { name: "Select tertiary storage", exact: true }).click();
  await page.getByRole("region", { name: "Tertiary storage options", exact: true }).getByRole("button", { name: /Select Samsung 990 PRO 2TB/ }).click();
  await expect(page.locator("#builder-part-storage_tertiary")).toContainText("Samsung 990 PRO 2TB");
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 48.289.000");
  await page.getByRole("button", { name: "Share build", exact: true }).click();
  const shared = await page.evaluate(() => (window as any).__builderShare);
  expect(new URL(shared).searchParams.get("parts")).toContain("storage_secondary:str-1");
  expect(new URL(shared).searchParams.get("parts")).toContain("storage_tertiary:str-1");
  await page.goto(shared);
  await expect(page.locator("#builder-part-storage_secondary")).toContainText("Samsung 990 PRO 2TB");
  await expect(page.locator("#builder-part-storage_tertiary")).toContainText("Samsung 990 PRO 2TB");
  await page.getByRole("button", { name: "Remove secondary storage", exact: true }).click();
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 45.390.000");
  await expect(page.locator("#builder-part-storage_primary")).toContainText("Samsung 990 PRO 2TB");
  await page.getByRole("complementary", { name: "Your configuration", exact: true }).locator("details > summary").click();
  await page.getByRole("button", { name: "Undo secondary storage change", exact: true }).click();
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 48.289.000");
  await page.getByRole("button", { name: "Remove tertiary storage", exact: true }).click();
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 45.390.000");
  await expect(page.locator("#builder-part-storage_secondary")).toContainText("Samsung 990 PRO 2TB");
  await page.getByRole("complementary", { name: "Your configuration", exact: true }).locator("details > summary").click();
  await page.getByRole("button", { name: "Undo tertiary storage change", exact: true }).click();
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 48.289.000");
  await page.getByRole("button", { name: "Review build", exact: true }).filter({ visible: true }).first().click();
  await expect(page.getByRole("dialog").getByText("Primary storage", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Secondary storage", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Tertiary storage", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add configured PC to cart", exact: true }).click();
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("tethera_cart_storage")!).state.customPCs[0]);
  expect(cart.parts.storage_primary.id).toBe("str-1");
  expect(cart.parts.storage_secondary.id).toBe("str-1");
  expect(cart.parts.storage_tertiary.id).toBe("str-1");
  expect(cart.totalPrice).toBe(48289000);
});

test("empty builds, fit filtering and missing linked parts remain understandable at narrow widths", async ({ page }) => {
  await page.goto("/builder");
  await expect(page.getByRole("heading", { name: "Build your PC" })).toBeVisible();
  await page.getByRole("button", { name: "Select cpu", exact: true }).click();
  await expect(page.getByRole("region", { name: "CPU options", exact: true }).locator("article")).toHaveCount(8);
  await expect(page.getByRole("button", { name: /Show more options/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Review build", exact: true }).filter({ visible: true }).first().click();
  await expect(page.getByRole("button", { name: "Add configured PC to cart" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.goto(apexUrl);
  await page.getByRole("button", { name: "Change cpu", exact: true }).click();
  const options = page.getByRole("region", { name: "CPU options" });
  await options.getByRole("checkbox", { name: "Compatible only" }).uncheck();
  await options.getByRole("textbox", { name: "Search cpu" }).fill("14700K");
  await expect(options.getByRole("button", { name: /Swap to Intel Core i7-14700K/ })).toBeDisabled();
  await expect(options).toContainText("socket");
  await options.getByRole("button", { name: /View details for Intel Core i7-14700K/ }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Choose this replacement", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Close product details", exact: true }).click();
  await options.getByRole("textbox", { name: "Search cpu" }).fill("no-such-model");
  await expect(options.getByText("No matching parts", { exact: true })).toBeVisible();
  await options.getByRole("button", { name: "Clear filters" }).click();
  await expect(options.getByText("No matching parts", { exact: true })).toHaveCount(0);
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.goto("/builder?parts=cpu:cpu-1,ram:missing,case:cpu-2");
  await expect(page.getByText(/Some linked parts could not be loaded/)).toBeVisible();
  await expect(page.locator("#builder-part-case")).toContainText("Choose a component");
  await expect(page.locator("#builder-part-ram")).toContainText("Choose a component");
  const legacy = new URL(apexUrl, origin);
  legacy.searchParams.set("name", "Incus Apex Ryzen 7 RTX 4080S");
  await page.goto(legacy.toString());
  await expect(page.getByRole("heading", { name: "INCUS Apex RTX 4080S Custom Built Gaming PC", exact: true })).toBeVisible();
});

test("build codes restore a simulation in another browser and keep sourcing-based assembly timings", async ({ page, context, browser }, info) => {
  await page.goto(apexUrl);
  const simulation = page.getByRole("form", { name: "Simulation code", exact: true });
  const codeField = simulation.getByRole("textbox", { name: "Simulation Code", exact: true });
  await expect(codeField).toBeVisible();
  const panelBox = (await simulation.boundingBox())!;
  const nameBox = (await page.locator('[class*="buildNameCard"]').boundingBox())!;
  if (page.viewportSize()!.width > 980) expect(Math.abs(panelBox.y - nameBox.y)).toBeLessThan(1);
  await expect(page.getByRole("radio", { name: /Standard Build 5-7 Working Days/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Express Priority Build 2-3 Working Days/ })).toBeVisible();
  await expect(page.getByText("After all parts have been sourced", { exact: true })).toHaveCount(3);
  await page.getByRole("region", { name: "Graphics card options", exact: true }).getByRole("button", { name: /Swap to Gigabyte GeForce RTX 4070 Ti/ }).click();
  for (const name of ["secondary", "tertiary"]) {
    await page.getByRole("button", { name: `Select ${name} storage`, exact: true }).click();
    await page.getByRole("region", { name: `${name[0].toUpperCase()}${name.slice(1)} storage options`, exact: true }).getByRole("button", { name: /Select Samsung 990 PRO 2TB/ }).click();
  }
  await page.getByRole("radio", { name: /Express Priority Build/ }).check();
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 46.289.000");

  let requests = 0;
  await context.route("**/api/builder/builds", async route => {
    if (route.request().method() === "POST" && requests++ === 0)
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: "Build saving is temporarily unavailable." }) });
    return route.continue();
  });
  await simulation.getByRole("button", { name: "Save build", exact: true }).click();
  await expect(simulation.getByRole("alert")).toHaveText("Build saving is temporarily unavailable.");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await simulation.getByRole("button", { name: "Save build", exact: true }).click();
  await expect(codeField).toHaveValue(/^INC-(?:[A-HJ-NP-Z2-9]{4}-){2}[A-HJ-NP-Z2-9]{4}$/);
  const code = await codeField.inputValue();
  await simulation.getByRole("button", { name: "Copy code", exact: true }).click();
  expect(await page.evaluate(() => (window as any).__builderShare)).toBe(code);
  await simulation.getByRole("button", { name: "Copy link", exact: true }).click();
  const sharedLink = await page.evaluate(() => (window as any).__builderShare);
  expect(new URL(sharedLink).searchParams.get("code")).toBe(code);
  await simulation.screenshot({ path: path.join(process.env.VALIDATION_RESULTS_DIR!, `build-code-${info.project.name}.png`) });
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Remove secondary storage", exact: true }).click();
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 43.390.000");
  await codeField.fill("INC-AAAA-AAAA-AAAA");
  await simulation.getByRole("button", { name: "Preview build", exact: true }).click();
  await expect(simulation.getByRole("alert")).toContainText("not found");
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 43.390.000");
  await codeField.fill(code.toLowerCase().replaceAll("-", ""));
  await simulation.getByRole("button", { name: "Preview build", exact: true }).click();
  await expect(codeField).toHaveValue(code);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[data-builder-total]")).toHaveText("Rp 46.289.000");
  await expect(page.getByRole("radio", { name: /Express Priority Build/ })).toBeChecked();
  await expect(page.getByRole("button", { name: "Reset changes", exact: true })).toBeDisabled();

  const other = await browser.newContext({ viewport: page.viewportSize()! });
  try {
    const bytes = await readFile(path.resolve(process.cwd(), "public/incus-logo.png"));
    await other.route("**/*", async route => {
      if (route.request().resourceType() === "image") return route.fulfill({ contentType: "image/png", body: bytes });
      if (new URL(route.request().url()).origin === origin) return route.continue();
      return route.abort("blockedbyclient");
    });
    const restored = await other.newPage();
    await restored.goto(sharedLink);
    await expect(restored.getByRole("textbox", { name: "Simulation Code", exact: true })).toHaveValue(code);
    await expect(restored.locator("[data-builder-total]")).toHaveText("Rp 46.289.000");
    await expect(restored.getByRole("radio", { name: /Express Priority Build/ })).toBeChecked();
    await expect(restored.locator("#builder-part-ram")).toContainText("White");
    await expect(restored.locator("#builder-part-storage_secondary")).toContainText("Samsung 990 PRO 2TB");
    await expect(restored.locator("#builder-part-storage_tertiary")).toContainText("Samsung 990 PRO 2TB");
    await expect(restored.getByRole("button", { name: "Reset changes", exact: true })).toBeDisabled();
  } finally { await other.close(); }
});

test("sticky summary stays below the header while categories animate and its height changes", async ({ page }) => {
  await page.goto(apexUrl);
  const summary = page.getByRole("complementary", { name: "Your configuration", exact: true });
  if (page.viewportSize()!.width <= 980) {
    await expect(summary).toHaveCSS("position", "static");
    return;
  }
  for (const width of [1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 760 });
    const samples = await page.evaluate(async () => {
      const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      await frame(); await frame();
      const gaps: number[] = [];
      for (const y of [1100, 900, 1200, 1000]) {
        window.scrollTo(0, y);
        for (let index = 0; index < 26; index++) {
          await frame();
          const header = document.querySelector("[data-persistent-header]")!.getBoundingClientRect();
          const island = document.querySelector('aside[aria-label="Your configuration"]')!.getBoundingClientRect();
          gaps.push(island.top - header.bottom);
        }
      }
      return gaps;
    });
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(23);
  }
  const header = page.locator("[data-persistent-header]");
  await header.evaluate(element => { element.style.paddingBottom = "32px"; });
  await expect.poll(() => page.evaluate(() => {
    const header = document.querySelector("[data-persistent-header]")!.getBoundingClientRect();
    const island = document.querySelector('aside[aria-label="Your configuration"]')!.getBoundingClientRect();
    return island.top - header.bottom;
  })).toBeGreaterThanOrEqual(23);
  await header.evaluate(element => { element.style.paddingBottom = ""; });
});
