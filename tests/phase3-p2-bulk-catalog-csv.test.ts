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

  describe("Bulk Export API Endpoint (/api/admin/products/bulk/export)", () => {
    it("blocks unauthenticated requests with 401 Unauthorized", async () => {
      const { GET: exportGET } = await import("@/app/api/admin/products/bulk/export/route");
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3000/api/admin/products/bulk/export");
      const res = await exportGET(req);
      expect(res.status).toBe(401);
    });

    it("allows CATALOG_MANAGER to download the complete catalog as CSV", async () => {
      const { GET: exportGET } = await import("@/app/api/admin/products/bulk/export/route");
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3000/api/admin/products/bulk/export", {
        headers: { authorization: "Bearer catalog" },
      });
      const res = await exportGET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/csv");
      expect(res.headers.get("content-disposition")).toContain("attachment; filename=");
      const text = await res.text();
      expect(text).toContain("sku,parent_sku,name,variant_name,brand,category");
      expect(text).toContain("AMD-100-100000910WOF");
    });

    it("serves starter CSV template when ?template=true is requested", async () => {
      const { GET: exportGET } = await import("@/app/api/admin/products/bulk/export/route");
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3000/api/admin/products/bulk/export?template=true", {
        headers: { authorization: "Bearer catalog" },
      });
      const res = await exportGET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-disposition")).toContain("tethera-catalog-sample-template.csv");
      const text = await res.text();
      expect(text).toContain("CPU-AMD-9800X3D");
      expect(text).toContain("spec_socket");
    });
  });

  describe("Bulk Import API Endpoint (/api/admin/products/bulk/import)", () => {
    it("blocks SUPPORT_AGENT lacking products:write with 403 Forbidden", async () => {
      const { POST: importPOST } = await import("@/app/api/admin/products/bulk/import/route");
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3000/api/admin/products/bulk/import", {
        method: "POST",
        headers: { authorization: "Bearer support" },
        body: JSON.stringify({ csvContent: "sku,name,category,retail_price\nCPU-TEST,Test,CPU,1000\n" }),
      });
      const res = await importPOST(req);
      expect(res.status).toBe(403);
    });

    it("halts entire batch with 422 and commits 0 changes if any row has validation errors", async () => {
      const { POST: importPOST } = await import("@/app/api/admin/products/bulk/import/route");
      const { NextRequest } = await import("next/server");
      const { db } = await import("@/lib/db");

      // Batch with 1 good row and 1 invalid row
      const badCsv = `sku,name,category,retail_price,stock_on_hand
NEW-GOOD-ITEM-1,Good Item 1,CPU,5000000,10
BAD-ROW-ITEM-2,Bad Item 2,UnknownCategory,-9999,5
`;
      const req = new NextRequest("http://localhost:3000/api/admin/products/bulk/import", {
        method: "POST",
        headers: { authorization: "Bearer catalog" },
        body: JSON.stringify({ csvContent: badCsv }),
      });

      const res = await importPOST(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errors.length).toBeGreaterThan(0);

      // Verify that even the good item was NOT created
      const goodProduct = await db.products.findOne({ sku: "NEW-GOOD-ITEM-1" });
      expect(goodProduct).toBeNull();
    });

    it("atomically creates new products and updates existing inventory with ledger tracking", async () => {
      const { POST: importPOST } = await import("@/app/api/admin/products/bulk/import/route");
      const { NextRequest } = await import("next/server");
      const { db } = await import("@/lib/db");

      const testSkuNew = `CPU-BULK-NEW-${Date.now()}`;
      const testSkuExisting = "AMD-100-100000910WOF"; // existing 7800X3D

      const initialInv = await db.inventory.getByProductAndStore("cpu-1");
      const initialStock = initialInv?.stock_on_hand || 14;

      const validCsv = `sku,parent_sku,name,variant_name,brand,category,retail_price,sale_price,cost_price,stock_on_hand,stock_delta,status,description,spec_socket,spec_cores
${testSkuNew},,NextGen Flagship CPU,,AMD,CPU,9999000,,7999000,30,,ACTIVE,Brand new processor from CSV batch,AM5,16 Cores
${testSkuExisting},,AMD Ryzen 7 7800X3D 8-Core 16-Thread Processor,,AMD,CPU,7199000,,,,+10,ACTIVE,Stock adjustment via CSV delta,,,
`;

      const req = new NextRequest("http://localhost:3000/api/admin/products/bulk/import", {
        method: "POST",
        headers: {
          authorization: "Bearer catalog",
          "x-forwarded-for": "10.0.4.88",
          "user-agent": "StaffBulkUploader/2.0",
        },
        body: JSON.stringify({ csvContent: validCsv }),
      });

      const res = await importPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.summary.created).toBe(1);
      expect(json.summary.updated).toBe(1);

      // Verify new product was created with specs
      const newProduct = await db.products.findOne({ sku: testSkuNew });
      expect(newProduct).toBeDefined();
      expect(newProduct?.name).toBe("NextGen Flagship CPU");
      expect(newProduct?.specs?.socket).toBe("AM5");
      expect(newProduct?.specs?.cores).toBe("16 Cores");

      // Verify existing product stock delta (+10) was applied
      const updatedInv = await db.inventory.getByProductAndStore("cpu-1");
      expect(updatedInv?.stock_on_hand).toBe(initialStock + 10);

      // Verify inventory adjustment ledger recorded RESTOCK entry
      const ledgerMovements = await db.inventoryLedger.getMovementsByProduct("cpu-1");
      const restockEntry = ledgerMovements.find((m) => m.delta_quantity === 10);
      expect(restockEntry).toBeDefined();
      expect(restockEntry?.reason_code).toBe("RESTOCK");

      // Verify audit log entry was written
      const auditLogs = await db.auditLogs.getRecentLogs(10, "catalog");
      const bulkLog = auditLogs.find((l) => l.action === "BULK_CATALOG_IMPORT");
      expect(bulkLog).toBeDefined();
      expect(bulkLog?.actor_name).toBe("Catalog Lead");
      expect(bulkLog?.after_state?.summary?.created).toBe(1);
    });
  });
});
