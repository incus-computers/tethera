import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";
import {
  generateCatalogCsv,
  generateSampleCsvTemplate,
} from "@/lib/csv/productCsv";
import { FLAGSHIP_STORE_ID } from "@/lib/db/repositories/stores.repository";
import { StoreInventory } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "products:read");
    if (!perm.authorized) {
      return NextResponse.json(
        { success: false, error: perm.error },
        { status: perm.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const isTemplate = searchParams.get("template") === "true";

    if (isTemplate) {
      const templateContent = generateSampleCsvTemplate();
      return new NextResponse(templateContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="tethera-catalog-sample-template.csv"',
          "Cache-Control": "no-store",
        },
      });
    }

    // Full catalog export
    const [products, inventoryList] = await Promise.all([
      db.products.findMany({}),
      db.inventory.findMany({ store_id: FLAGSHIP_STORE_ID }),
    ]);

    const inventoryMap = new Map<string, StoreInventory>(
      inventoryList.map((inv: StoreInventory) => [inv.product_id, inv])
    );

    const csvContent = generateCatalogCsv(products, inventoryMap);
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tethera-catalog-export-${dateStamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[ADMIN BULK CSV EXPORT ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate CSV export." },
      { status: 500 }
    );
  }
}
