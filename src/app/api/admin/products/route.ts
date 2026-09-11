import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

// GET: Fetch all products with inventory levels for admin
export async function GET(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 401 });
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

// POST: Add new product (SUPERADMIN ONLY)
export async function POST(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
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
    });

    // Initialize store inventory
    const stockCount = Number(initial_stock) || 10;
    await db.inventory.updateOnHandStock(prodId, stockCount);

    return NextResponse.json({
      success: true,
      message: `Product '${createdProduct.name}' created successfully by Superadmin.`,
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

// PUT: Update any element of a product (ADMIN & SUPERADMIN)
export async function PUT(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 401 });
    }

    const body = await req.json();
    const { id, stock_on_hand, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required." }, { status: 400 });
    }

    // Update product fields (name, description, price, specs, images, etc.)
    const updatedProduct = await db.products.update(id, updates);

    // If stock_on_hand was updated, synchronize with store_inventory
    if (stock_on_hand !== undefined) {
      await db.inventory.updateOnHandStock(id, Number(stock_on_hand));
    }

    const currentInv = await db.inventory.getByProductAndStore(id);

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

// DELETE: Delete product (SUPERADMIN ONLY)
export async function DELETE(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required." }, { status: 400 });
    }

    const success = await db.products.delete(id);
    return NextResponse.json({
      success,
      message: `Product '${id}' successfully removed by Superadmin.`,
    });
  } catch (error: any) {
    console.error("[ADMIN PRODUCTS DELETE ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
