import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { readAdminProductPage } from "@/lib/db/collectionQueries";
import { normalizeProduct } from "@/lib/db/repositories/products.repository";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { FLAGSHIP_STORE_ID } from "@/lib/db/repositories/stores.repository";
import {
  badRequestProblem,
  unauthorizedProblem,
  forbiddenProblem,
  notFoundProblem,
  internalServerErrorProblem,
} from "@/lib/api/problemDetails";
import { safeRevalidate } from "@/lib/cache/revalidate";

export const dynamic = "force-dynamic";

// GET: Fetch all products with inventory levels for admin
async function handleGET(req: NextRequest) {
  try {
    const perm = await requireAdminPermission(req, "products:read");
    if (!perm.authorized) {
      return perm.status === 401
        ? unauthorizedProblem(perm.error || "Administrative authentication required.", {
            instance: req.nextUrl.pathname,
          })
        : forbiddenProblem(perm.error || "Access denied.", {
            instance: req.nextUrl.pathname,
          });
    }

    const q=req.nextUrl.searchParams;
    const result=await readAdminProductPage({search:q.get("search")||undefined,sort:q.get("sort")||undefined},q.get("page"),q.get("limit"));
    return NextResponse.json({success:true,count:result.pagination.total,products:result.rows.map(normalizeProduct),pagination:result.pagination});
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return internalServerErrorProblem("Service temporarily unavailable. Please retry.", { instance: req.nextUrl.pathname });
  }
}

// POST: Add new product (requires products:write permission)
async function handlePOST(req: NextRequest) {
  try {
    const perm = await requireAdminPermission(req, "products:write");
    if (!perm.authorized) {
      return perm.status === 401
        ? unauthorizedProblem(perm.error || "Administrative authentication required.", {
            instance: req.nextUrl.pathname,
          })
        : forbiddenProblem(perm.error || "Access denied.", {
            instance: req.nextUrl.pathname,
          });
    }

    const body = await req.json().catch(() => ({}));
    const {
      name,
      brand,
      sku,
      category_slug,
      retail_price,
      description,
      images,
      specs,
      warranty_months,
      pc_builder_slot,
      initial_stock,
      variations,
    } = body;

    if (!name || !brand || !sku || !retail_price) {
      return badRequestProblem(
        "Product name, brand, SKU, and retail price are required.",
        { instance: req.nextUrl.pathname }
      );
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const prodId = `prod-${Date.now()}`;

    const createdProduct = await db.products.create({
      id: prodId,
      sku,
      name,
      slug,
      brand,
      description: description || `${brand} ${name} high performance hardware.`,
      category_slug: category_slug || "components",
      retail_price: Number(retail_price),
      sale_price: null,
      cost_price: Math.round(Number(retail_price) * 0.8),
      images: Array.isArray(images) && images.length > 0 ? images : ["https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop&q=60"],
      specs: specs || {},
      warranty_months: Number(warranty_months) || 24,
      is_active: true,
      pc_builder_slot: pc_builder_slot || null,
      variations: Array.isArray(variations) ? variations : [],
    });

    // Initialize store inventory
    const stockCount = Number(initial_stock) || 10;
    await db.inventory.updateOnHandStock(prodId, stockCount);

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "PRODUCT_CREATED",
      entity_type: "product",
      entity_id: prodId,
      before_state: null,
      after_state: { sku, name, retail_price: Number(retail_price), initial_stock: stockCount },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    // Invalidate ISR cache paths & tags
    safeRevalidate("product", {
      productId: prodId,
      productSlug: slug,
      categorySlug: category_slug || "components",
    });

    return NextResponse.json({
      success: true,
      message: `Product '${createdProduct.name}' created successfully.`,
      product: {
        ...createdProduct,
        stock_on_hand: stockCount,
        stock_reserved: 0,
        stock_available: stockCount,
      },
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return internalServerErrorProblem("Service temporarily unavailable. Please retry.", { instance: req.nextUrl.pathname });
  }
}

// PUT: Update any element of a product (requires products:write permission)
async function handlePUT(req: NextRequest) {
  try {
    const perm = await requireAdminPermission(req, "products:write");
    if (!perm.authorized) {
      return perm.status === 401
        ? unauthorizedProblem(perm.error || "Administrative authentication required.", {
            instance: req.nextUrl.pathname,
          })
        : forbiddenProblem(perm.error || "Access denied.", {
            instance: req.nextUrl.pathname,
          });
    }

    const body = await req.json().catch(() => ({}));
    const { id, stock_on_hand, ...updates } = body;

    if (!id) {
      return badRequestProblem("Product ID is required.", {
        instance: req.nextUrl.pathname,
      });
    }

    // Capture before state for immutable audit log
    const existingProduct = await db.products.findById(id);
    if (!existingProduct) {
      return notFoundProblem(`Product with ID '${id}' was not found.`, {
        instance: req.nextUrl.pathname,
      });
    }

    // Map category to pc_builder_slot if category_slug is updated
    if (updates.category_slug && !updates.pc_builder_slot) {
      const slotMap: Record<string, any> = {
        cpu: "cpu",
        gpu: "gpu",
        motherboards: "motherboard",
        cooling: "cooler",
        ram: "ram",
        storage: "storage",
        psu: "psu",
        cases: "case",
      };
      if (slotMap[updates.category_slug]) {
        updates.pc_builder_slot = slotMap[updates.category_slug];
      }
    }

    if(updates.specs && typeof updates.specs==="object") {
      for(const key of ["shipping","assembled_shipping"]){
        if(existingProduct.specs?.[key]!==undefined)updates.specs[key]=existingProduct.specs[key];else delete updates.specs[key];
      }
    }
    const updatedProduct = await db.products.update(id, updates);

    // Update stock if explicitly passed
    if (stock_on_hand !== undefined) {
      await db.inventory.updateOnHandStock(id, Number(stock_on_hand));
    }

    const currentInv = await db.inventory.getByProductAndStore(id, FLAGSHIP_STORE_ID);

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "PRODUCT_UPDATED",
      entity_type: "product",
      entity_id: id,
      before_state: existingProduct ? { ...existingProduct } : null,
      after_state: { ...updatedProduct, stock_on_hand },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    // Invalidate ISR cache paths & tags
    safeRevalidate("product", {
      productId: id,
      productSlug: updatedProduct?.slug,
      categorySlug: updatedProduct?.category_slug,
    });

    return NextResponse.json({
      success: true,
      message: "Product elements updated successfully.",
      product: {
        ...updatedProduct,
        stock_on_hand: currentInv ? currentInv.stock_on_hand : 10,
        stock_reserved: currentInv ? currentInv.stock_reserved : 0,
        stock_available: currentInv ? currentInv.stock_on_hand - currentInv.stock_reserved : 10,
      },
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return internalServerErrorProblem("Service temporarily unavailable. Please retry.", { instance: req.nextUrl.pathname });
  }
}

// DELETE: Delete product (requires products:delete permission)
async function handleDELETE(req: NextRequest) {
  try {
    const perm = await requireAdminPermission(req, "products:delete");
    if (!perm.authorized) {
      return perm.status === 401
        ? unauthorizedProblem(perm.error || "Administrative authentication required.", {
            instance: req.nextUrl.pathname,
          })
        : forbiddenProblem(perm.error || "Access denied.", {
            instance: req.nextUrl.pathname,
          });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequestProblem("Product ID is required.", {
        instance: req.nextUrl.pathname,
      });
    }

    const existingProduct = await db.products.findById(id);
    if (!existingProduct) {
      return notFoundProblem(`Product with ID '${id}' was not found.`, {
        instance: req.nextUrl.pathname,
      });
    }

    const success = await db.products.delete(id);

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "PRODUCT_DELETED",
      entity_type: "product",
      entity_id: id,
      before_state: existingProduct ? { name: existingProduct.name, sku: existingProduct.sku } : null,
      after_state: null,
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    // Invalidate ISR cache paths & tags
    safeRevalidate("product", {
      productId: id,
      productSlug: existingProduct?.slug,
      categorySlug: existingProduct?.category_slug,
    });

    return NextResponse.json({
      success,
      message: `Product '${id}' successfully removed.`,
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return internalServerErrorProblem("Service temporarily unavailable. Please retry.", { instance: req.nextUrl.pathname });
  }
}

export const GET = withApiProtection(withAccess(handleGET));
export const POST = withApiProtection(withAccess(handlePOST));
export const PUT = withApiProtection(withAccess(handlePUT));
export const DELETE = withApiProtection(withAccess(handleDELETE));
