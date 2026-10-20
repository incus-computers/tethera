import React from "react";
// @ts-ignore
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PrebuiltSystemCard } from "../src/components/products/PrebuiltSystemCard";
import { PREBUILT_SYSTEMS, PrebuiltSystem } from "../src/lib/data/mockHardware";
import { useCartStore } from "../src/lib/store/useCartStore";

// Mock next/image for static markup rendering in tests
vi.mock("next/image", () => ({
  default: ({ src, alt, fill, className, ...rest }: any) => {
    return React.createElement("img", {
      src,
      alt,
      className,
      "data-fill": fill ? "true" : undefined,
      ...rest,
    });
  },
}));

function findElement(node: any, predicate: (n: any) => boolean): any {
  if (!node) return null;
  if (predicate(node)) return node;
  if (node.props && node.props.children) {
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children];
    for (const child of children) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
  }
  return null;
}

describe("PrebuiltSystemCard Component", () => {
  const mockRig: PrebuiltSystem = PREBUILT_SYSTEMS[0];

  beforeEach(() => {
    useCartStore.getState().clearCart();
    useCartStore.setState({ isCartOpen: false });
  });

  it("renders all 8 hardware specs in the exact required order with vector icons", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: mockRig })
    );

    // Verify all 8 spec values exist in the rendered output
    expect(html).toContain(mockRig.cpu);
    expect(html).toContain(mockRig.gpu);
    expect(html).toContain(mockRig.motherboard);
    expect(html).toContain(mockRig.ram);
    expect(html).toContain(mockRig.storage);
    expect(html).toContain(mockRig.psu);
    expect(html).toContain(mockRig.chassis);
    expect(html).toContain(mockRig.cooling);

    // Verify each vector icon aria-label exists
    const expectedParts = [
      "cpu",
      "gpu",
      "motherboard",
      "ram",
      "storage",
      "psu",
      "tower",
      "cooling",
    ];

    expectedParts.forEach((part) => {
      expect(html).toContain(`aria-label="${part}"`);
    });

    // Verify the specs appear in strict order in HTML
    const cpuPos = html.indexOf(mockRig.cpu);
    const gpuPos = html.indexOf(mockRig.gpu);
    const moboPos = html.indexOf(mockRig.motherboard);
    const ramPos = html.indexOf(mockRig.ram);
    const storagePos = html.indexOf(mockRig.storage);
    const psuPos = html.indexOf(mockRig.psu);
    const towerPos = html.indexOf(mockRig.chassis);
    const coolingPos = html.indexOf(mockRig.cooling);

    expect(cpuPos).toBeLessThan(gpuPos);
    expect(gpuPos).toBeLessThan(moboPos);
    expect(moboPos).toBeLessThan(ramPos);
    expect(ramPos).toBeLessThan(storagePos);
    expect(storagePos).toBeLessThan(psuPos);
    expect(psuPos).toBeLessThan(towerPos);
    expect(towerPos).toBeLessThan(coolingPos);
  });

  it("renders model name linked to product page and strictly omits SKU string", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: mockRig })
    );

    expect(html).toContain(mockRig.name);
    expect(html).toContain(`href="/products/${mockRig.id}"`);
    // SKU must not appear anywhere
    expect(html).not.toContain(mockRig.sku);
  });

  it("renders formatted Indonesian Rupiah price and omits all tax subtext", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: mockRig })
    );

    // Active price for pb-1 is sale_price: 39999000 -> "Rp 39.999.000"
    expect(html).toContain("Rp 39.999.000");

    // Strictly no tax subtext
    expect(html.toLowerCase()).not.toContain("tax");
    expect(html.toLowerCase()).not.toContain("ppn");
    expect(html.toLowerCase()).not.toContain("vat");
  });

  it("contains zero em dashes across the rendered output", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: mockRig })
    );

    // Check for unicode em dash \u2014
    expect(html).not.toContain(String.fromCharCode(0x2014));
  });

  it("renders picture frame with aspect ratio, image crossfade, and zero overlay badges", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: mockRig })
    );

    // Scaled down frame aspect ratio and link
    expect(html).toContain("aspect-[16/10]");
    expect(html).toContain(`href="/products/${mockRig.id}"`);

    // Primary and secondary images
    expect(html).toContain(mockRig.image.replace(/&/g, "&amp;"));
    expect(html).toContain(mockRig.images[1].replace(/&/g, "&amp;"));
    expect(html).toContain("group-hover:opacity-0");
    expect(html).toContain("group-hover:opacity-100");

    // Zero overlay badges (e.g. no "Stress Tested", "In Stock", "Flagship Hub")
    expect(html).not.toContain("Stress Tested");
    expect(html).not.toContain("Ready for Pickup");
    expect(html).not.toContain("Flagship Hub");
  });

  it("renders responsive footer with mobile stack and desktop single-row layout", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: mockRig })
    );

    expect(html).toContain("border-t");
    expect(html).toContain("flex-col");
    expect(html).toContain("lg:flex-row");
    expect(html).toContain("lg:items-center");
    expect(html).toContain("lg:justify-between");
  });

  it("renders Add to Cart button meeting 44px tap target height", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: mockRig })
    );

    expect(html).toContain("min-h-[44px]");
    expect(html).toContain("Add to Cart");
  });

  it("applies hidden lg:flex when isThirdCard is true", () => {
    const htmlThird = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: mockRig, isThirdCard: true })
    );
    expect(htmlThird).toContain("hidden lg:flex");

    const htmlRegular = renderToStaticMarkup(
      React.createElement(PrebuiltSystemCard, { rig: mockRig, isThirdCard: false })
    );
    expect(htmlRegular).not.toContain("hidden lg:flex");
  });

  it("calls onAddToCart prop and stops event propagation when clicked", () => {
    const onAddToCartMock = vi.fn();
    const preventDefaultMock = vi.fn();
    const stopPropagationMock = vi.fn();

    const element = PrebuiltSystemCard({
      rig: mockRig,
      onAddToCart: onAddToCartMock,
    });

    const button = findElement(element, (n) => n.type === "button");
    expect(button).toBeDefined();

    button.props.onClick({
      preventDefault: preventDefaultMock,
      stopPropagation: stopPropagationMock,
    });

    expect(preventDefaultMock).toHaveBeenCalled();
    expect(stopPropagationMock).toHaveBeenCalled();
    expect(onAddToCartMock).toHaveBeenCalledWith(mockRig);
  });

  it("adds prebuilt rig to useCartStore when onAddToCart is not provided", () => {
    const preventDefaultMock = vi.fn();
    const stopPropagationMock = vi.fn();

    const element = PrebuiltSystemCard({ rig: mockRig });
    const button = findElement(element, (n) => n.type === "button");

    button.props.onClick({
      preventDefault: preventDefaultMock,
      stopPropagation: stopPropagationMock,
    });

    const state = useCartStore.getState();
    expect(state.customPCs.length).toBe(1);
    expect(state.customPCs[0].name).toBe(mockRig.name);
    expect(state.customPCs[0].isPrebuilt).toBe(true);
    expect(state.customPCs[0].totalPrice).toBe(39999000);
    expect(state.isCartOpen).toBe(true);
  });
});
