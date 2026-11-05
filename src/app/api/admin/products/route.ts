import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { FLAGSHIP_STORE_ID } from "@/lib/db/repositories/stores.repository";

export const dynamic = "force-dynamic";

// GET: Fetch all products with inventory levels for admin
export async function GET(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "products:read");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 401 });
    }

    const products = await db.products.findMany();
    const inventory = await db.inventory.findMany();

    const invMap = new Map(inventory.map((inv) => [inv.product_id, inv]));

    const enriched = products.map((prod) => {
      const inv = invMap.get(prod.id);
      return {
        ...prod,
        stock_on_hand: inv ? inv.stock_on_hand : 10,
        stock_reserved: inv ? inv.stock_reserved : 0,
        stock_available: inv ? inv.stock_on_hand - inv.stock_reserved : 10,
      };
    });

    return NextResponse.json({ success: true, count: enriched.length, products: enriched });
  } catch (error: any) {
    console.error("[ADMIN PRODUCTS GET ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new product (requires products:write permission)
export async function POST(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "products:write");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 403 });
    }

    const body = await req.json();
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
      return NextResponse.json(
        { success: false, error: "Product name, brand, SKU, and retail price are required." },
        { status: 400 }
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
    console.error("[ADMIN PRODUCTS POST ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update any element of a product (requires products:write permission)
export async function PUT(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "products:write");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 401 });
    }

    const body = await req.json();
    const { id, stock_on_hand, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required." }, { status: 400 });
    }

    // Capture before state for immutable audit log
    const existingProduct = await db.products.findById(id);

    // Map category to pc_builder_slot if category_slug is updated
    if (updates.category_slug && !updates.pc_builder_slot) {
      const slotMap: Record<string, any> = {
        cpu: "cpu",
        gpu: "gpu",
        motherboards: "motherboard",
        cooling: "cooler",
        ram: "ram",
        storage: "storage_primary",
        cases: "case",
        "power-supplies": "psu",
      };
      if (slotMap[updates.category_slug]) {
        updates.pc_builder_slot = slotMap[updates.category_slug];
      }
    }

    // Update product fields
    const updatedProduct = await db.products.update(id, updates);

    // If stock_on_hand was updated, synchronize with store_inventory
    if (stock_on_hand !== undefined) {
      await db.inventory.updateOnHandStock(
        id,
        Number(stock_on_hand),
        FLAGSHIP_STORE_ID,
        {
          reasonCode: body.stock_adjustment_reason || body.reason_code,
          actorId: perm.user?.id,
          notes: body.notes || "Admin product catalog stock update",
        }
      );
    }

    const currentInv = await db.inventory.getByProductAndStore(id);

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "PRODUCT_UPDATED",
      entity_type: "product",
      entity_id: id,
      before_state: existingProduct ? { retail_price: existingProduct.retail_price, sale_price: existingProduct.sale_price, is_active: existingProduct.is_active } : null,
      after_state: { ...updates, stock_on_hand },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
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
    console.error("[ADMIN PRODUCTS PUT ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete product (requires products:delete permission)
export async function DELETE(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "products:delete");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required." }, { status: 400 });
    }

    const existingProduct = await db.products.findById(id);
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

    return NextResponse.json({
      success,
      message: `Product '${id}' successfully removed.`,
    });
  } catch (error: any) {
    console.error("[ADMIN PRODUCTS DELETE ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
