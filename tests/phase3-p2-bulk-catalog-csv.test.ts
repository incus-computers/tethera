// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  normalizeCategory,
  parseProductCsv,
  generateCatalogCsv,
  generateSampleCsvTemplate,
  validateBulkCsvRows,
} from "@/lib/csv/productCsv";

describe("P2.1 Bulk Catalog CSV Engine", () => {
  describe("Category Normalization", () => {
    it("maps common human friendly names to canonical internal slugs", () => {
      expect(normalizeCategory("CPU")).toBe("cpu");
      expect(normalizeCategory("Processor")).toBe("cpu");
      expect(normalizeCategory("GPU")).toBe("gpu");
      expect(normalizeCategory("Graphics Card")).toBe("gpu");
      expect(normalizeCategory("VGA")).toBe("gpu");
      expect(normalizeCategory("Motherboard")).toBe("motherboards");
      expect(normalizeCategory("Mobo")).toBe("motherboards");
      expect(normalizeCategory("RAM")).toBe("ram");
      expect(normalizeCategory("Memory")).toBe("ram");
      expect(normalizeCategory("Power Supply")).toBe("power-supplies");
      expect(normalizeCategory("PSU")).toBe("power-supplies");
      expect(normalizeCategory("Cooler")).toBe("cooling");
      expect(normalizeCategory("AIO")).toBe("cooling");
      expect(normalizeCategory("Case")).toBe("cases");
      expect(normalizeCategory("Chassis")).toBe("cases");
      expect(normalizeCategory("SSD")).toBe("storage");
      expect(normalizeCategory("Storage")).toBe("storage");
      expect(normalizeCategory("Operating System")).toBe("operating-systems");
    });

    it("returns null for unrecognized category names", () => {
      expect(normalizeCategory("Random Widgets")).toBeNull();
      expect(normalizeCategory("")).toBeNull();
    });
  });

  describe("CSV Serializer and Parser", () => {
    it("generates a valid sample CSV starter template with prefixed spec columns", () => {
      const template = generateSampleCsvTemplate();
      expect(template).toContain("sku,parent_sku,name,variant_name,brand,category,retail_price,sale_price,cost_price,stock_on_hand,stock_delta,status,description");
      expect(template).toContain("spec_socket");
      expect(template).toContain("spec_cores");
    });

    it("parses CSV rows handling quoted text and whitespace", () => {
      const rawCsv = `sku,parent_sku,name,variant_name,brand,category,retail_price,sale_price,cost_price,stock_on_hand,stock_delta,status,description,spec_socket,spec_cores
CPU-AMD-9800X3D,,AMD Ryzen 7 9800X3D,,AMD,CPU,8999000,,7200000,25,,ACTIVE,"High performance 8-core gaming processor, with 3D V-Cache.",AM5,8 Cores
`;
      const parsed = parseProductCsv(rawCsv);
      expect(parsed.rows.length).toBe(1);
      const row = parsed.rows[0];
      expect(row.sku).toBe("CPU-AMD-9800X3D");
      expect(row.name).toBe("AMD Ryzen 7 9800X3D");
      expect(row.category).toBe("CPU");
      expect(row.spec_socket).toBe("AM5");
      expect(row.spec_cores).toBe("8 Cores");
      expect(row.description).toContain("with 3D V-Cache.");
    });
  });

  describe("All-or-Nothing Pre-Flight Validator", () => {
    it("passes validation for valid hardware rows with spec columns", () => {
      const rows = [
        {
          sku: "CPU-9800X3D",
          name: "Ryzen 7 9800X3D",
          brand: "AMD",
          category: "CPU",
          retail_price: "8999000",
          stock_on_hand: "20",
          spec_socket: "AM5",
        },
        {
          sku: "RAM-VEN-32",
          name: "Corsair Vengeance 32GB",
          brand: "Corsair",
          category: "RAM",
          retail_price: "2199000",
          stock_delta: "10",
          spec_speed: "DDR5-6000",
        },
      ];

      const validation = validateBulkCsvRows(rows, new Set(["CPU-9800X3D"]));
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.preview.length).toBe(2);
      expect(validation.preview[0].isExistingProduct).toBe(true);
      expect(validation.preview[0].specs.socket).toBe("AM5");
      expect(validation.preview[1].isExistingProduct).toBe(false);
      expect(validation.preview[1].stockDelta).toBe(10);
    });

    it("fails validation if any row has missing required fields or invalid prices", () => {
      const rows = [
        {
          sku: "VALID-SKU-1",
          name: "Valid Hardware",
          category: "CPU",
          retail_price: "5000000",
        },
        {
          sku: "", // Missing SKU
          name: "Missing SKU Product",
          category: "GPU",
          retail_price: "12000000",
        },
        {
          sku: "BAD-PRICE",
          name: "Bad Price Item",
          category: "RAM",
          retail_price: "-50000", // Negative price
        },
      ];

      const validation = validateBulkCsvRows(rows, new Set());
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBe(2);
      expect(validation.errors.some((e) => e.rowNumber === 3 && e.field === "sku")).toBe(true);
      expect(validation.errors.some((e) => e.rowNumber === 4 && e.field === "retail_price")).toBe(true);
    });

    it("rejects duplicate SKUs present within the same CSV upload batch", () => {
      const rows = [
        { sku: "DUPLICATE-SKU", name: "Product A", category: "CPU", retail_price: "1000000" },
        { sku: "DUPLICATE-SKU", name: "Product B", category: "CPU", retail_price: "2000000" },
      ];

      const validation = validateBulkCsvRows(rows, new Set());
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.message.includes("Duplicate SKU"))).toBe(true);
    });

    it("rejects rows with conflicting stock columns or invalid numbers", () => {
      const rows = [
        {
          sku: "CONFLICT-STOCK",
          name: "Conflicting Stock Item",
          category: "PSU",
          retail_price: "1500000",
          stock_on_hand: "15",
          stock_delta: "5", // Specifying both conflicting columns is invalid
        },
      ];

      const validation = validateBulkCsvRows(rows, new Set());
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].message).toContain("both 'stock_on_hand' and 'stock_delta'");
    });

    it("enforces variant integrity requiring variant_name when parent_sku is supplied", () => {
      const rows = [
        {
          sku: "VAR-ROW-1",
          parent_sku: "PARENT-01",
          name: "Parent Product",
          variant_name: "", // Missing variant name
          category: "RAM",
          retail_price: "2000000",
        },
      ];

      const validation = validateBulkCsvRows(rows, new Set());
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].field).toBe("variant_name");
    });
  });
});
