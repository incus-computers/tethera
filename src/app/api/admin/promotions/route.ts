import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 401 });
    }

    const promotions = await db.promotions.findMany();
    return NextResponse.json({ success: true, count: promotions.length, promotions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create promotion (SUPERADMIN ONLY)
export async function POST(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const body = await req.json();
    const { code, title, description, discount_type, discount_value, min_spend, max_discount, start_date, end_date, usage_limit } = body;

    if (!code || !title || !discount_value) {
      return NextResponse.json(
        { success: false, error: "Promotion code, title, and discount value are required." },
        { status: 400 }
      );
    }

    const existing = await db.promotions.findByCode(code);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Promotion code '${code.toUpperCase()}' already exists.` },
        { status: 400 }
      );
    }

    const newPromo = await db.promotions.create({
      id: `promo-${Date.now()}`,
      code: code.toUpperCase().trim(),
      title,
      description: description || "",
      discount_type: discount_type || "percentage",
      discount_value: Number(discount_value),
      min_spend: min_spend ? Number(min_spend) : undefined,
      max_discount: max_discount ? Number(max_discount) : undefined,
      is_active: true,
      start_date: start_date || new Date().toISOString(),
      end_date: end_date || new Date(Date.now() + 86400000 * 30).toISOString(),
      usage_count: 0,
      usage_limit: usage_limit ? Number(usage_limit) : undefined,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Promotion '${newPromo.code}' created successfully by Superadmin.`,
      promotion: newPromo,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update promotion (SUPERADMIN ONLY)
export async function PUT(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Promotion ID is required." }, { status: 400 });
    }

    const updated = await db.promotions.update(id, updates);
    return NextResponse.json({
      success: true,
      message: "Promotion updated successfully.",
      promotion: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete promotion (SUPERADMIN ONLY)
export async function DELETE(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Promotion ID is required." }, { status: 400 });
    }

    const success = await db.promotions.delete(id);
    return NextResponse.json({
      success,
      message: "Promotion deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
