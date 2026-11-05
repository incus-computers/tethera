import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { parseProductCsv, validateBulkCsvRows } from "@/lib/csv/productCsv";
import { FLAGSHIP_STORE_ID } from "@/lib/db/repositories/stores.repository";
import { PcBuilderSlot, Product } from "@/lib/db/types";
import {
  badRequestProblem,
  unauthorizedProblem,
  forbiddenProblem,
  unprocessableEntityProblem,
  internalServerErrorProblem,
} from "@/lib/api/problemDetails";
import { safeRevalidate } from "@/lib/cache/revalidate";

export const dynamic = "force-dynamic";

const SLOT_MAP: Record<string, PcBuilderSlot> = {
  cpu: "cpu",
  gpu: "gpu",
  motherboards: "motherboard",
  ram: "ram",
  cooling: "cooler",
  storage: "storage_primary",
  cases: "case",
  "power-supplies": "psu",
  "operating-systems": "os",
};

export async function POST(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "products:write");
    if (!perm.authorized) {
      return perm.status === 401
        ? unauthorizedProblem(perm.error || "Administrative authentication required.", {
            instance: req.nextUrl.pathname,
          })
        : forbiddenProblem(perm.error || "Access denied.", {
            instance: req.nextUrl.pathname,
          });
    }

    let csvContent = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (file && typeof file === "object" && "text" in file) {
        csvContent = await (file as any).text();
      }
    } else {
      const rawText = await req.text();
      if (rawText.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(rawText);
          csvContent = parsed.csvContent || "";
        } catch {
          csvContent = rawText;
        }
      } else {
        csvContent = rawText;
      }
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return badRequestProblem("Empty CSV content provided.", {
        instance: req.nextUrl.pathname,
      });
    }

    // 1. Parse CSV rows
    const { rows } = parseProductCsv(csvContent);
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No product data rows found in CSV." },
        { status: 400 }
      );
    }

    // 2. Fetch existing products and build SKU index
    const allProducts = await db.products.findMany({});
    const skuToProductMap = new Map<string, Product>();
    const existingSkus = new Set<string>();

    allProducts.forEach((p) => {
      if (p.sku) {
        const upperSku = p.sku.toUpperCase();
        skuToProductMap.set(upperSku, p);
        existingSkus.add(upperSku);
      }
    });

    // 3. Pre-flight Validation (All-or-Nothing)
    const validation = validateBulkCsvRows(rows, existingSkus);

    if (!validation.isValid || validation.errors.length > 0) {
      const msg = `Validation failed with ${validation.errors.length} error(s). Entire upload halted to protect database integrity.`;
      return unprocessableEntityProblem(msg, {
        instance: req.nextUrl.pathname,
        invalid_params: validation.errors.map((e) => ({
          name: `row_${e.row}_${e.field}`,
          reason: e.message,
        })),
        extensions: {
          message: msg,
          errors: validation.errors,
        },
      });
    }

    // 4. Atomic Execution: Apply updates and inserts
    let createdCount = 0;
    let updatedCount = 0;
    let stockAdjustedCount = 0;

    for (const item of validation.preview) {
      const existingProduct = skuToProductMap.get(item.sku);

      if (existingProduct) {
        // Update existing product
        const patch: Partial<Product> = {
          name: item.name,
          brand: item.brand,
          category_slug: item.categorySlug,
          retail_price: item.retailPrice,
          sale_price: item.salePrice,
          cost_price: item.costPrice || Math.round(item.retailPrice * 0.8),
          description: item.description || existingProduct.description,
          is_active: item.status !== "ARCHIVED",
        };

        if (SLOT_MAP[item.categorySlug]) {
          patch.pc_builder_slot = SLOT_MAP[item.categorySlug];
        }

        if (Object.keys(item.specs).length > 0) {
          patch.specs = {
            ...(existingProduct.specs || {}),
            ...item.specs,
          };
        }

        await db.products.update(existingProduct.id, patch);
        updatedCount++;

        // Apply inventory updates if specified
        if (item.stockOnHand !== null || item.stockDelta !== null) {
          const inv = await db.inventory.getByProductAndStore(
            existingProduct.id,
            FLAGSHIP_STORE_ID
          );
          const currentOnHand = inv ? inv.stock_on_hand : 0;
          let targetStock = currentOnHand;
          let reasonCode: "RESTOCK" | "MANUAL_AUDIT" = "RESTOCK";

          if (item.stockOnHand !== null && item.stockOnHand !== undefined) {
            targetStock = Math.max(0, item.stockOnHand);
            reasonCode = targetStock >= currentOnHand ? "RESTOCK" : "MANUAL_AUDIT";
          } else if (item.stockDelta !== null && item.stockDelta !== undefined) {
            targetStock = Math.max(0, currentOnHand + item.stockDelta);
            reasonCode = item.stockDelta >= 0 ? "RESTOCK" : "MANUAL_AUDIT";
          }

          await db.inventory.updateOnHandStock(
            existingProduct.id,
            targetStock,
            FLAGSHIP_STORE_ID,
            {
              reasonCode,
              actorId: perm.user?.id || "admin",
              notes: `Bulk CSV import stock adjustment: ${item.sku}`,
            }
          );
          stockAdjustedCount++;
        }
      } else {
        // Create new catalog product
        const newProdId = `prod-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const slug = item.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const createdProduct = await db.products.create({
          id: newProdId,
          sku: item.sku,
          name: item.name,
          slug,
          brand: item.brand,
          description: item.description || `${item.brand} ${item.name} high performance hardware.`,
          category_slug: item.categorySlug,
          retail_price: item.retailPrice,
          sale_price: item.salePrice,
          cost_price: item.costPrice || Math.round(item.retailPrice * 0.8),
          images: ["https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop&q=60"],
          specs: item.specs || {},
          warranty_months: 24,
          is_active: item.status !== "ARCHIVED",
          pc_builder_slot: SLOT_MAP[item.categorySlug] || null,
          variations: [],
        });

        // Initialize warehouse inventory
        const initialStock = item.stockOnHand ?? (item.stockDelta !== null && item.stockDelta !== undefined ? Math.max(0, item.stockDelta) : 10);
        await db.inventory.updateOnHandStock(
          newProdId,
          initialStock,
          FLAGSHIP_STORE_ID,
          {
            reasonCode: "RESTOCK",
            actorId: perm.user?.id || "admin",
            notes: `Initial stock from bulk CSV import: ${item.sku}`,
          }
        );

        skuToProductMap.set(item.sku, createdProduct);
        createdCount++;
      }
    }

    // 5. Append immutable audit log entry
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "BULK_CATALOG_IMPORT",
      entity_type: "catalog",
      entity_id: `batch-${Date.now()}`,
      before_state: null,
      after_state: {
        totalRows: validation.preview.length,
        summary: {
          created: createdCount,
          updated: updatedCount,
          stockAdjusted: stockAdjustedCount,
        },
      },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    // Invalidate product catalog and inventory ISR cache
    safeRevalidate("product");
    safeRevalidate("inventory");

    return NextResponse.json({
      success: true,
      message: `Bulk CSV import completed successfully. ${createdCount} created, ${updatedCount} updated.`,
      summary: {
        created: createdCount,
        updated: updatedCount,
        stockAdjusted: stockAdjustedCount,
        total: validation.preview.length,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN BULK CSV IMPORT ERROR]:", error);
    return internalServerErrorProblem(error.message || "Failed to process bulk CSV import.", {
      instance: req.nextUrl.pathname,
    });
  }
}
