import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { readAdminProductPage } from "@/lib/db/collectionQueries";
import { normalizeProduct } from "@/lib/db/repositories/products.repository";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/rbac";
import {
  generateCatalogCsv,
  generateSampleCsvTemplate,
} from "@/lib/csv/productCsv";
import { StoreInventory } from "@/lib/db/types";

export const dynamic = "force-dynamic";

async function handleGET(req: NextRequest) {
  try {
    const perm = await requireAdminPermission(req, "products:read");
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

    // Bounded pages avoid a misleading partial export at PostgREST's row cap.
    const products: any[]=[];
    const inventoryMap=new Map<string,StoreInventory>();
    const seen=new Set<string>();let expectedTotal:number|undefined,bytes=0;
    for(let page=1;page<=50;page++){
      const result=await readAdminProductPage({search:searchParams.get("search")||undefined,sort:"date-asc"},page,100);
      if(result.pagination.total>5000)return NextResponse.json({success:false,error:"This export exceeds 5,000 products. Narrow the export using a search."},{status:413});
      if(expectedTotal!==undefined&&expectedTotal!==result.pagination.total)return NextResponse.json({success:false,error:"Catalog changed during export. Please retry."},{status:409});
      expectedTotal=result.pagination.total;
      for(const row of result.rows){
        if(seen.has(row.id))return NextResponse.json({success:false,error:"Catalog changed during export. Please retry."},{status:409});
        bytes+=Buffer.byteLength(JSON.stringify(row));
        if(bytes>5*1024*1024)return NextResponse.json({success:false,error:"This export is too large. Narrow the export using a search."},{status:413});
        seen.add(row.id);products.push(normalizeProduct(row));
        inventoryMap.set(row.id,{product_id:row.id,stock_on_hand:row.stock_on_hand,stock_reserved:row.stock_reserved} as StoreInventory);
      }
      if(page>=result.pagination.totalPages)break;
    }
    if(products.length!==expectedTotal)return NextResponse.json({success:false,error:"Catalog changed during export. Please retry."},{status:409});
    const specKeys=new Set(products.flatMap(p=>Object.keys(p.specs||{}).filter(k=>k!=="variations")));
    const exportRows=products.reduce((n,p)=>n+Math.max(1,p.variations?.length||0),0);
    if(specKeys.size>100||exportRows>10000)return NextResponse.json({success:false,error:"This export has too many columns or variant rows. Narrow the export using a search."},{status:413});
    const csvContent = generateCatalogCsv(products, inventoryMap);
    if(Buffer.byteLength(csvContent)>10*1024*1024)return NextResponse.json({success:false,error:"This CSV is too large. Narrow the export using a search."},{status:413});
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
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to generate CSV export." },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(withAccess(handleGET));
