// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeProduct } from "../src/lib/db/repositories/products.repository";
import { FluxProductsTab } from "../src/components/admin/FluxProductsTab";
import { FluxOverviewTab, getProductStock, getStatusBadge } from "../src/components/admin/FluxOverviewTab";

describe("Database & Admin Product Variations Integration", () => {
  it("normalizes ram-1 to include its 4 defined variations", () => {
    const rawRam = {
      id: "ram-1",
      sku: "COR-CMH32GX5M2B6000C30",
      name: "Corsair Vengeance RGB DDR5",
      brand: "Corsair",
      category_slug: "memory",
      retail_price: 2299000,
      specs: { speed: "6000MHz", ramType: "DDR5", capacity: "32GB" },
    };

    const normalized = normalizeProduct(rawRam);
    expect(normalized.variations).toBeDefined();
    expect(normalized.variations?.length).toBe(4);
    expect(normalized.variations?.[0].name).toContain("32GB (2x16GB) Black");
    expect(normalized.variations?.[1].name).toContain("32GB (2x16GB) White");
    expect(normalized.variations?.[2].name).toContain("64GB (2x32GB) Black");
    expect(normalized.variations?.[3].name).toContain("64GB (2x32GB) White");
  });

  it("extracts variations stored in specs.variations when raw variations is empty", () => {
    const rawProd = {
      id: "custom-ram",
      sku: "CUST-RAM-01",
      name: "Custom Hyper RAM",
      brand: "CustomBrand",
      specs: {
        variations: [
          {
            id: "var-1",
            productId: "custom-ram",
            name: "16GB Black",
            price: 1000000,
            stockCount: 10,
            attributes: { Capacity: "16GB" },
          },
          {
            id: "var-2",
            productId: "custom-ram",
            name: "32GB White",
            price: 1800000,
            stockCount: 5,
            attributes: { Capacity: "32GB" },
          },
        ],
      },
    };

    const normalized = normalizeProduct(rawProd);
    expect(normalized.variations?.length).toBe(2);
    expect(normalized.variations?.[0].id).toBe("var-1");
    expect(normalized.variations?.[1].id).toBe("var-2");
  });

  it("displays variations count accurately in FluxProductsTab", () => {
    const testProducts = [
      {
        id: "ram-1",
        name: "Corsair Vengeance RGB DDR5",
        brand: "Corsair",
        sku: "COR-CMH32GX5M2B6000C30",
        category_slug: "memory",
        retail_price: 2299000,
        stock_on_hand: 22,
        images: ["https://example.com/ram.jpg"],
        variations: [
          { id: "v1", productId: "ram-1", name: "32GB Black", price: 2299000, stockCount: 14, attributes: {} },
          { id: "v2", productId: "ram-1", name: "32GB White", price: 2349000, stockCount: 8, attributes: {} },
          { id: "v3", productId: "ram-1", name: "64GB Black", price: 4399000, stockCount: 5, attributes: {} },
          { id: "v4", productId: "ram-1", name: "64GB White", price: 4449000, stockCount: 0, attributes: {} },
        ],
      },
      {
        id: "cpu-1",
        name: "AMD Ryzen 7 7800X3D",
        brand: "AMD",
        sku: "AMD-7800X3D",
        category_slug: "processors",
        retail_price: 7199000,
        stock_on_hand: 14,
        images: ["https://example.com/cpu.jpg"],
        variations: [],
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(FluxProductsTab, {
        products: testProducts as any,
        onOpenNewProductModal: () => {},
        onEditProduct: () => {},
        onDeleteProduct: () => {},
      })
    );

    expect(html).toContain("4 options");
    expect(html).toContain("None");
  });

  it("calculates product stock accurately from various schema fields", () => {
    expect(getProductStock({ stock_available: 3, stock_on_hand: 5 })).toBe(3);
    expect(getProductStock({ stock_on_hand: 8 })).toBe(8);
    expect(getProductStock({ stockCount: 15 })).toBe(15);
    expect(getProductStock({ stock: 20 })).toBe(20);
    expect(getProductStock({})).toBe(10);
  });

  it("accurately reports status badge for Tethera workflow states", () => {
    expect(getStatusBadge("order_accepted").label).toBe("Order Accepted");
    expect(getStatusBadge("finding_stock").label).toBe("Finding Stock");
    expect(getStatusBadge("shipped").label).toContain("In Transit");
    expect(getStatusBadge("delivered").label).toBe("Delivered");
  });

  it("renders accurate low stock alerts in FluxOverviewTab without false positives", () => {
    const products = [
      { id: "p1", name: "High Stock CPU", stock_available: 25 },
      { id: "p2", name: "Low Stock GPU", stock_available: 3 },
      { id: "p3", name: "Medium Stock Cooler", stock_available: 18 },
    ];

    const orders = [
      {
        id: "ord-1",
        total: 5000000,
        status: "order_accepted",
        customer_name: "Test Customer",
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(FluxOverviewTab, {
        orders: orders as any,
        products: products as any,
        customers: [],
        user: { name: "Admin" },
        onNavigateTab: () => {},
        onInspectOrder: () => {},
        onOpenNewProductModal: () => {},
      })
    );

    // Total revenue reflects order.total
    expect(html).toContain("5.000.000");
    // Only 1 item is low stock
    expect(html).toContain("Low Stock Warning (1)");
    expect(html).toContain("Low Stock GPU");
    expect(html).toContain("Only 3 units left");
  });
});
