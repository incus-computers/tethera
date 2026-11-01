import React from "react";
// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FluxProductsTab } from "../src/components/admin/FluxProductsTab";

// Mock next/image for testing
vi.mock("next/image", () => ({
  default: ({ src, alt, fill, className, priority, ...rest }: any) => {
    return React.createElement("img", {
      src,
      alt,
      className,
      "data-fill": fill ? "true" : undefined,
      "data-priority": priority ? "true" : undefined,
      ...rest,
    });
  },
}));

describe("FluxProductsTab Hardware Catalog Enhancements", () => {
  const mockProducts = [
    {
      id: "prod-1",
      name: "AMD Ryzen 9 9950X",
      brand: "AMD",
      sku: "AMD-100-9950X",
      category_slug: "cpu",
      retail_price: 10999000,
      sale_price: 9899000,
      stock_on_hand: 12,
      images: ["https://example.com/cpu.jpg"],
      variations: [],
    },
    {
      id: "prod-2",
      name: "NVIDIA GeForce RTX 4080 Super",
      brand: "ASUS",
      sku: "ROG-STRIX-RTX4080S",
      category_slug: "gpu",
      retail_price: 21500000,
      stock_on_hand: 3,
      images: ["https://example.com/gpu.jpg"],
      variations: [{ id: "v1", name: "White Edition" }],
    },
  ];

  it("renders resizable column handles on table column headers", () => {
    const html = renderToStaticMarkup(
      React.createElement(FluxProductsTab, {
        products: mockProducts,
        onOpenNewProductModal: vi.fn(),
        onEditProduct: vi.fn(),
        onDeleteProduct: vi.fn(),
      })
    );

    // Should include cursor-col-resize resizer handles
    expect(html).toContain("cursor-col-resize");
    expect(html).toContain("Drag to resize column (double-click to reset)");
    expect(html).toContain("table-fixed");
    expect(html).toContain("<colgroup>");
  });

  it("renders SKU with standard font rather than font-mono", () => {
    const html = renderToStaticMarkup(
      React.createElement(FluxProductsTab, {
        products: mockProducts,
        onOpenNewProductModal: vi.fn(),
        onEditProduct: vi.fn(),
        onDeleteProduct: vi.fn(),
      })
    );

    expect(html).toContain("AMD-100-9950X");
    expect(html).toContain("ROG-STRIX-RTX4080S");
    // Table body should not contain font-mono for SKU
    expect(html).not.toContain("font-mono text-slate-500");
  });

  it("renders stock amount directly without a container badge or pill", () => {
    const html = renderToStaticMarkup(
      React.createElement(FluxProductsTab, {
        products: mockProducts,
        onOpenNewProductModal: vi.fn(),
        onEditProduct: vi.fn(),
        onDeleteProduct: vi.fn(),
      })
    );

    // Stock should show unit count
    expect(html).toContain("12 units");
    expect(html).toContain("3 units");

    // Must not wrap stock in badge containers
    expect(html).not.toContain("px-2.5 py-0.5 rounded-full text-[11px] font-bold border");
    expect(html).not.toContain("bg-emerald-500/10 text-emerald-400 border-emerald-500/20");
  });

  it("renders categories directly without container boxes", () => {
    const html = renderToStaticMarkup(
      React.createElement(FluxProductsTab, {
        products: mockProducts,
        onOpenNewProductModal: vi.fn(),
        onEditProduct: vi.fn(),
        onDeleteProduct: vi.fn(),
      })
    );

    // Categories are rendered
    expect(html).toContain("Processors (CPUs)");
    expect(html).toContain("Graphics Cards (GPUs)");

    // Must not have container pill/box around category
    expect(html).not.toContain("px-2.5 py-1 rounded-md bg-white/5 border border-white/5");
  });

  it("uses increased font sizes for higher legibility across table rows", () => {
    const html = renderToStaticMarkup(
      React.createElement(FluxProductsTab, {
        products: mockProducts,
        onOpenNewProductModal: vi.fn(),
        onEditProduct: vi.fn(),
        onDeleteProduct: vi.fn(),
      })
    );

    // Product title font size increased to text-sm sm:text-base
    expect(html).toContain("text-sm sm:text-base");
    // Table header font size increased to text-xs sm:text-sm
    expect(html).toContain("text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400");
  });
});
