import { Product, StoreInventory } from "../db/types";

export interface CsvRowError {
  rowNumber: number;
  sku: string;
  field: string;
  message: string;
}

export interface CsvImportPreviewItem {
  rowNumber: number;
  sku: string;
  parentSku?: string | null;
  name: string;
  variantName?: string | null;
  brand: string;
  categorySlug: string;
  retailPrice: number;
  salePrice?: number | null;
  costPrice?: number | null;
  stockOnHand?: number | null;
  stockDelta?: number | null;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  description?: string | null;
  specs: Record<string, string>;
  isExistingProduct: boolean;
}

// Canonical category aliases dictionary
const CATEGORY_MAP: Record<string, string> = {
  cpu: "cpu",
  processor: "cpu",
  processors: "cpu",
  gpu: "gpu",
  vga: "gpu",
  "graphics card": "gpu",
  "graphics cards": "gpu",
  graphic: "gpu",
  motherboard: "motherboards",
  motherboards: "motherboards",
  mobo: "motherboards",
  ram: "ram",
  memory: "ram",
  "power supply": "power-supplies",
  "power supplies": "power-supplies",
  psu: "power-supplies",
  cooling: "cooling",
  cooler: "cooling",
  coolers: "cooling",
  aio: "cooling",
  case: "cases",
  cases: "cases",
  chassis: "cases",
  storage: "storage",
  ssd: "storage",
  hdd: "storage",
  "hard drive": "storage",
  "operating system": "operating-systems",
  "operating systems": "operating-systems",
  os: "operating-systems",
  peripheral: "peripherals",
  peripherals: "peripherals",
  mouse: "peripherals",
  keyboard: "peripherals",
  headset: "peripherals",
  monitor: "monitors",
  monitors: "monitors",
};

/**
 * Normalizes human-friendly category names to canonical database slugs
 */
export function normalizeCategory(input?: string | null): string | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();
  return CATEGORY_MAP[clean] || null;
}

/**
 * Robust RFC 4180 CSV line parser supporting quoted commas and escaped quotes
 */
export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let cur = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        cur += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(cur.trim());
      cur = "";
      i++;
      continue;
    }

    cur += char;
    i++;
  }

  values.push(cur.trim());
  return values;
}

/**
 * Parses full CSV text into headers and an array of record objects
 */
export function parseProductCsv(csvContent: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());

  const rows: Record<string, string>[] = [];

  for (let idx = 1; idx < lines.length; idx++) {
    const values = parseCsvLine(lines[idx]);
    const row: Record<string, string> = {};

    headers.forEach((header, colIndex) => {
      row[header] = values[colIndex] ?? "";
    });

    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Escapes values for safe CSV output
 */
function escapeCsvValue(val: any): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an empty sample starter CSV template for warehouse staff
 */
export function generateSampleCsvTemplate(): string {
  const headers = [
    "sku",
    "parent_sku",
    "name",
    "variant_name",
    "brand",
    "category",
    "retail_price",
    "sale_price",
    "cost_price",
    "stock_on_hand",
    "stock_delta",
    "status",
    "description",
    "spec_socket",
    "spec_cores",
    "spec_boost_clock",
    "spec_tdp",
    "spec_form_factor",
    "spec_wattage",
    "spec_speed",
  ];

  const sampleRows = [
    [
      "CPU-AMD-9800X3D",
      "",
      "AMD Ryzen 7 9800X3D",
      "",
      "AMD",
      "CPU",
      "8999000",
      "",
      "7200000",
      "25",
      "",
      "ACTIVE",
      "High-performance 8-core gaming processor with 3D V-Cache.",
      "AM5",
      "8 Cores / 16 Threads",
      "5.2 GHz",
      "120W",
      "",
      "",
      "",
    ],
    [
      "RAM-VEN-BLK-32",
      "RAM-COR-VEN",
      "Corsair Vengeance DDR5",
      "Black 32GB",
      "Corsair",
      "RAM",
      "2199000",
      "",
      "1750000",
      "15",
      "",
      "ACTIVE",
      "Low profile DDR5 desktop memory module.",
      "",
      "",
      "",
      "",
      "",
      "",
      "DDR5-6000",
    ],
    [
      "RAM-VEN-WHT-32",
      "RAM-COR-VEN",
      "Corsair Vengeance DDR5",
      "White 32GB",
      "Corsair",
      "RAM",
      "2299000",
      "",
      "1800000",
      "10",
      "",
      "ACTIVE",
      "Low profile DDR5 desktop memory module in pure white.",
      "",
      "",
      "",
      "",
      "",
      "",
      "DDR5-6000",
    ],
  ];

  const headerLine = headers.join(",");
  const dataLines = sampleRows.map((r) => r.map(escapeCsvValue).join(",")).join("\n");
  return `${headerLine}\n${dataLines}\n`;
}

/**
 * Exports complete catalog products and inventory as a clean CSV string
 */
export function generateCatalogCsv(
  products: Product[],
  inventoryMap: Map<string, StoreInventory>
): string {
  // Collect all unique spec keys across all products
  const specKeySet = new Set<string>();
  products.forEach((p) => {
    if (p.specs && typeof p.specs === "object") {
      Object.keys(p.specs).forEach((k) => {
        if (k !== "variations") specKeySet.add(k);
      });
    }
  });

  const sortedSpecKeys = Array.from(specKeySet).sort();
  const specHeaders = sortedSpecKeys.map((k) => `spec_${k}`);

  const baseHeaders = [
    "sku",
    "parent_sku",
    "name",
    "variant_name",
    "brand",
    "category",
    "retail_price",
    "sale_price",
    "cost_price",
    "stock_on_hand",
    "stock_delta",
    "status",
    "description",
  ];

  const allHeaders = [...baseHeaders, ...specHeaders];
  const lines: string[] = [allHeaders.join(",")];

  products.forEach((prod) => {
    const inv = inventoryMap.get(prod.id);
    const stockOnHand = inv ? inv.stock_on_hand : 10;
    const baseRow = [
      prod.sku,
      "",
      prod.name,
      "",
      prod.brand,
      prod.category_slug,
      prod.retail_price,
      prod.sale_price ?? "",
      prod.cost_price ?? "",
      stockOnHand,
      "", // stock_delta empty on export
      prod.is_active ? "ACTIVE" : "DRAFT",
      prod.description ?? "",
    ];

    const specValues = sortedSpecKeys.map((k) => {
      const val = prod.specs ? prod.specs[k] : undefined;
      return val !== undefined ? String(val) : "";
    });

    lines.push([...baseRow, ...specValues].map(escapeCsvValue).join(","));
  });

  return lines.join("\n") + "\n";
}

/**
 * Strict All-or-Nothing pre-flight validator for bulk product CSV rows
 */
export function validateBulkCsvRows(
  rows: Record<string, string>[],
  existingSkus: Set<string>
): {
  isValid: boolean;
  errors: CsvRowError[];
  preview: CsvImportPreviewItem[];
} {
  const errors: CsvRowError[] = [];
  const preview: CsvImportPreviewItem[] = [];
  const seenSkusInBatch = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header row
    const sku = (row.sku || "").trim().toUpperCase();
    const name = (row.name || "").trim();
    const categoryRaw = (row.category || row.category_slug || "").trim();
    const retailPriceRaw = (row.retail_price || row.price || "").trim();
    const stockOnHandRaw = (row.stock_on_hand || "").trim();
    const stockDeltaRaw = (row.stock_delta || "").trim();
    const parentSku = (row.parent_sku || "").trim().toUpperCase() || null;
    const variantName = (row.variant_name || "").trim() || null;

    // 1. Mandatory SKU Check
    if (!sku) {
      errors.push({
        rowNumber,
        sku: "UNKNOWN",
        field: "sku",
        message: `Row ${rowNumber}: 'sku' is required and cannot be blank.`,
      });
    } else if (seenSkusInBatch.has(sku)) {
      errors.push({
        rowNumber,
        sku,
        field: "sku",
        message: `Row ${rowNumber}: Duplicate SKU '${sku}' found within the uploaded CSV file.`,
      });
    } else {
      seenSkusInBatch.add(sku);
    }

    // 2. Mandatory Name Check
    if (!name) {
      errors.push({
        rowNumber,
        sku: sku || `ROW-${rowNumber}`,
        field: "name",
        message: `Row ${rowNumber}: 'name' is required.`,
      });
    }

    // 3. Category Validation
    const normalizedCat = normalizeCategory(categoryRaw);
    if (!normalizedCat) {
      errors.push({
        rowNumber,
        sku: sku || `ROW-${rowNumber}`,
        field: "category",
        message: `Row ${rowNumber}: Invalid or unrecognized category '${categoryRaw}'. Use standard names like CPU, GPU, Motherboard, RAM, Power Supply, Case, Cooling, Storage.`,
      });
    }

    // 4. Retail Price Validation
    const retailPrice = Number(retailPriceRaw.replace(/[^0-9.-]/g, ""));
    if (isNaN(retailPrice) || retailPrice < 0 || retailPriceRaw.length === 0) {
      errors.push({
        rowNumber,
        sku: sku || `ROW-${rowNumber}`,
        field: "retail_price",
        message: `Row ${rowNumber}: 'retail_price' must be a valid non-negative number. Got '${retailPriceRaw}'.`,
      });
    }

    // 5. Dual-Mode Stock Column Validation
    let stockOnHand: number | null = null;
    let stockDelta: number | null = null;

    if (stockOnHandRaw.length > 0 && stockDeltaRaw.length > 0) {
      errors.push({
        rowNumber,
        sku: sku || `ROW-${rowNumber}`,
        field: "stock_on_hand",
        message: `Row ${rowNumber}: You cannot specify both 'stock_on_hand' and 'stock_delta' on the same row. Provide one or the other.`,
      });
    } else {
      if (stockOnHandRaw.length > 0) {
        const val = Number(stockOnHandRaw.replace(/[^0-9.-]/g, ""));
        if (isNaN(val) || val < 0) {
          errors.push({
            rowNumber,
            sku: sku || `ROW-${rowNumber}`,
            field: "stock_on_hand",
            message: `Row ${rowNumber}: 'stock_on_hand' must be a non-negative integer. Got '${stockOnHandRaw}'.`,
          });
        } else {
          stockOnHand = Math.floor(val);
        }
      }

      if (stockDeltaRaw.length > 0) {
        const val = Number(stockDeltaRaw.replace(/[^0-9.-]/g, ""));
        if (isNaN(val)) {
          errors.push({
            rowNumber,
            sku: sku || `ROW-${rowNumber}`,
            field: "stock_delta",
            message: `Row ${rowNumber}: 'stock_delta' must be a valid integer. Got '${stockDeltaRaw}'.`,
          });
        } else {
          stockDelta = Math.floor(val);
        }
      }
    }

    // 6. Variant Integrity
    if (parentSku && !variantName) {
      errors.push({
        rowNumber,
        sku: sku || `ROW-${rowNumber}`,
        field: "variant_name",
        message: `Row ${rowNumber}: Row has 'parent_sku' ('${parentSku}') but is missing 'variant_name'. Specify the variant label (e.g. 'Black 32GB').`,
      });
    }

    // 7. Extract dynamic prefixed spec_* columns
    const specs: Record<string, string> = {};
    Object.keys(row).forEach((header) => {
      if (header.startsWith("spec_")) {
        const specKey = header.replace(/^spec_/, "").trim();
        const specVal = row[header].trim();
        if (specKey && specVal) {
          specs[specKey] = specVal;
        }
      }
    });

    // Optional numbers
    const salePriceRaw = (row.sale_price || "").trim();
    const salePrice = salePriceRaw ? Number(salePriceRaw.replace(/[^0-9.-]/g, "")) : null;

    const costPriceRaw = (row.cost_price || "").trim();
    const costPrice = costPriceRaw ? Number(costPriceRaw.replace(/[^0-9.-]/g, "")) : null;

    const statusRaw = (row.status || "").trim().toUpperCase();
    const status: "ACTIVE" | "DRAFT" | "ARCHIVED" =
      statusRaw === "DRAFT" || statusRaw === "ARCHIVED" ? statusRaw : "ACTIVE";

    preview.push({
      rowNumber,
      sku,
      parentSku,
      name,
      variantName,
      brand: (row.brand || "Tethera").trim(),
      categorySlug: normalizedCat || "components",
      retailPrice: isNaN(retailPrice) ? 0 : retailPrice,
      salePrice: salePrice && !isNaN(salePrice) ? salePrice : null,
      costPrice: costPrice && !isNaN(costPrice) ? costPrice : null,
      stockOnHand,
      stockDelta,
      status,
      description: (row.description || "").trim() || null,
      specs,
      isExistingProduct: existingSkus.has(sku),
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    preview,
  };
}
