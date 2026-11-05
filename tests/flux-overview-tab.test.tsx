import React from "react";
// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FluxOverviewTab } from "../src/components/admin/FluxOverviewTab";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: any) => {
    return React.createElement("img", { src, alt, ...rest });
  },
}));

describe("FluxOverviewTab Enhancements", () => {
  const mockOrders = [
    {
      id: "ord-test-01",
      order_number: "TET-20261101-001",
      status: "order_accepted",
      total: 12500000,
      customer_name: "Budi Santoso",
      created_at: new Date().toISOString(),
    },
    {
      id: "ord-test-02",
      order_number: "TET-20261101-002",
      status: "finding_stock",
      total: 8900000,
      customer_name: "Siti Rahma",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const mockProducts = [
    {
      id: "prod-1",
      name: "AMD Ryzen 9 9950X",
      retail_price: 10999000,
      stock_on_hand: 10,
    },
  ];

  const defaultProps = {
    orders: mockOrders,
    products: mockProducts,
    customers: [],
    user: { name: "Admin Incus" },
    onNavigateTab: vi.fn(),
    onInspectOrder: vi.fn(),
    onOpenNewProductModal: vi.fn(),
  };

  it("renders Weekly Revenue card instead of Total Revenue", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    expect(html).toContain("Weekly Revenue");
    expect(html).toContain("Trailing 7 Days");
  });

  it("renders circular containers (rounded-full) for the logos and icons", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    // Verify rounded-full icon wrappers exist
    expect(html).toContain("w-10 h-10 rounded-full");
  });

  it("does not render the welcome back box", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    expect(html).not.toContain("Welcome back");
  });

  it("renders subtle gradient with sheen on the right on info cards and trajectory card", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    // Verify subtle gradient background has sheen on the right, not in the middle
    expect(html).toContain("bg-gradient-to-r from-[#12141A] to-[#161B22]");
    expect(html).not.toContain("via-[#161B22]");
  });

  it("renders left-to-right progressive reveal clip path for Weekly Sales Trajectory graph", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    expect(html).toContain('id="fluxChartReveal"');
    expect(html).toContain('url(#fluxChartReveal)');
    expect(html).toContain("1.25s cubic-bezier(0.16, 1, 0.3, 1)");
  });

  it("renders pure line graph without bar graph elements", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    expect(html).toContain("Weekly Sales Trajectory");
    expect(html).toContain("7D Sales:");
    expect(html).toContain("Daily Avg:");
    expect(html).toContain("<svg");
    // Verify line stroke path exists
    expect(html).toContain("stroke=\"#37baf2\"");
    // Verify vertical bar column tracks are NOT rendered
    expect(html).not.toContain("group/bar");
  });

  it("renders unboxed stats for 7D sales and daily avg without containers", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    // Verify no pill containers around 7D sales
    expect(html).not.toContain("px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-2");
    expect(html).toContain("7D Sales:</span>");
    expect(html).toContain("Daily Avg:</span>");
  });

  it("uses unified font with no font-mono in overview", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    expect(html).not.toContain("font-mono");
  });

  it("renders non-stretched circular nodes aligned with mathematical precision with the X axis", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    // Verify circle nodes are rendered as HTML rounded-full elements with 1:1 aspect ratio
    expect(html).toContain("rounded-full border-2 transition-all duration-200 block");
    // Verify mathematical center alignment for column 0: (0.5 / 7) * 100 = 7.142857%
    expect(html).toContain("left:7.142857142857142%");
    // Verify center alignment for column 3: (3.5 / 7) * 100 = 50%
    expect(html).toContain("left:50%");
  });

  it("renders faint page load animation classes and Flux animation system", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    expect(html).toContain("animate-in fade-in slide-in-from-bottom-2 duration-700");
    expect(html).toContain("flux-animate-fade");
    expect(html).toContain("flux-animate-slide-up");
    expect(html).toContain("flux-card-hover");
  });

  it("removes featured catalog items and aligns low stock warning with recent orders and pipeline", () => {
    const html = renderToStaticMarkup(React.createElement(FluxOverviewTab, defaultProps));
    // Verify Featured Catalog Items is completely removed
    expect(html).not.toContain("Featured Catalog Items");
    // Verify Low Stock Warning is present and aligned with matching container
    expect(html).toContain("Low Stock Warning");
    // Verify Recent Orders, Pipeline, and Low Stock Warning share the matching card styling
    expect(html).toContain("Order Fulfillment Pipeline");
    expect(html).toContain("Recent Orders");
  });
});
