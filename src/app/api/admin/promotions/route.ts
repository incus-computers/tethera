import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "promotions:read");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 401 });
    }

    const promotions = await db.promotions.findMany();
    return NextResponse.json({ success: true, count: promotions.length, promotions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create promotion (requires promotions:write permission)
export async function POST(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "promotions:write");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 403 });
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

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "PROMOTION_CREATED",
      entity_type: "promotion",
      entity_id: newPromo.id,
      before_state: null,
      after_state: { code: newPromo.code, discount_type, discount_value: Number(discount_value) },
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Promotion '${newPromo.code}' created successfully.`,
      promotion: newPromo,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update promotion (requires promotions:write permission)
export async function PUT(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "promotions:write");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Promotion ID is required." }, { status: 400 });
    }

    const existing = await db.promotions.findById(id);
    const updated = await db.promotions.update(id, updates);

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "PROMOTION_UPDATED",
      entity_type: "promotion",
      entity_id: id,
      before_state: existing ? { code: existing.code, is_active: existing.is_active } : null,
      after_state: updates,
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Promotion updated successfully.",
      promotion: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete promotion (requires promotions:write permission)
export async function DELETE(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "promotions:write");
    if (!perm.authorized) {
      return NextResponse.json({ success: false, error: perm.error }, { status: perm.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Promotion ID is required." }, { status: 400 });
    }

    const existing = await db.promotions.findById(id);
    const success = await db.promotions.delete(id);

    // Record immutable audit log
    await db.auditLogs.log({
      actor_id: perm.user?.id || "unknown",
      actor_name: perm.user?.name || "Staff Admin",
      role: perm.user?.role || "ADMIN",
      action: "PROMOTION_DELETED",
      entity_type: "promotion",
      entity_id: id,
      before_state: existing ? { code: existing.code } : null,
      after_state: null,
      ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1",
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success,
      message: "Promotion deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
