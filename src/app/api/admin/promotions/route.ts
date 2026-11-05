import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";
import {
  badRequestProblem,
  unauthorizedProblem,
  forbiddenProblem,
  internalServerErrorProblem,
} from "@/lib/api/problemDetails";
import { safeRevalidate } from "@/lib/cache/revalidate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "promotions:read");
    if (!perm.authorized) {
      return perm.status === 401
        ? unauthorizedProblem(perm.error || "Administrative authentication required.", {
            instance: req.nextUrl.pathname,
          })
        : forbiddenProblem(perm.error || "Access denied.", {
            instance: req.nextUrl.pathname,
          });
    }

    const promotions = await db.promotions.findMany();
    return NextResponse.json({ success: true, count: promotions.length, promotions });
  } catch (error: any) {
    return internalServerErrorProblem(error.message, { instance: req.nextUrl.pathname });
  }
}

// POST: Create promotion (requires promotions:write permission)
export async function POST(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "promotions:write");
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
      code,
      title,
      description,
      discount_type,
      discount_value,
      min_spend,
      max_discount,
      start_date,
      starts_at,
      end_date,
      ends_at,
      usage_limit,
      max_global_uses,
      max_uses_per_user,
      eligible_categories,
      eligible_product_ids,
      buy_x_get_y,
    } = body;

    if (!code || !title) {
      return badRequestProblem(
        "Promotion code and title are required.",
        { instance: req.nextUrl.pathname }
      );
    }

    const normType = discount_type || "percentage";
    const numDiscountValue = discount_value !== undefined ? Number(discount_value) : 0;

    if (normType === "percentage" && (numDiscountValue <= 0 || numDiscountValue > 100)) {
      return badRequestProblem(
        "Percentage discount must be between 1 and 100.",
        { instance: req.nextUrl.pathname }
      );
    }

    const existing = await db.promotions.findByCode(code);
    if (existing) {
      return badRequestProblem(
        `Promotion code '${code.toUpperCase()}' already exists.`,
        { instance: req.nextUrl.pathname }
      );
    }

    const resolvedStartsAt = starts_at || start_date || new Date().toISOString();
    const resolvedEndsAt = ends_at || end_date || new Date(Date.now() + 86400000 * 30).toISOString();
    const resolvedMaxUses = max_global_uses !== undefined
      ? Number(max_global_uses)
      : usage_limit !== undefined
      ? Number(usage_limit)
      : undefined;

    const newPromo = await db.promotions.create({
      id: `promo-${Date.now()}`,
      code: code.toUpperCase().trim(),
      title,
      description: description || "",
      discount_type: normType,
      discount_value: numDiscountValue,
      min_spend: min_spend ? Number(min_spend) : undefined,
      max_discount: max_discount ? Number(max_discount) : undefined,
      is_active: true,
      start_date: resolvedStartsAt,
      starts_at: resolvedStartsAt,
      end_date: resolvedEndsAt,
      ends_at: resolvedEndsAt,
      usage_count: 0,
      usage_limit: resolvedMaxUses,
      max_global_uses: resolvedMaxUses,
      max_uses_per_user: max_uses_per_user ? Number(max_uses_per_user) : undefined,
      total_discount_given: 0,
      eligible_categories: Array.isArray(eligible_categories) ? eligible_categories : undefined,
      eligible_product_ids: Array.isArray(eligible_product_ids) ? eligible_product_ids : undefined,
      buy_x_get_y: buy_x_get_y && typeof buy_x_get_y === "object" ? buy_x_get_y : undefined,
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

    // Invalidate promotion ISR cache
    safeRevalidate("promotion");

    return NextResponse.json({
      success: true,
      message: `Promotion '${newPromo.code}' created successfully.`,
      promotion: newPromo,
    });
  } catch (error: any) {
    return internalServerErrorProblem(error.message, { instance: req.nextUrl.pathname });
  }
}

// PUT: Update promotion (requires promotions:write permission)
export async function PUT(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "promotions:write");
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
    const { id, ...updates } = body;

    if (!id) {
      return badRequestProblem("Promotion ID is required.", {
        instance: req.nextUrl.pathname,
      });
    }

    if (updates.code) {
      updates.code = String(updates.code).toUpperCase().trim();
    }
    if (updates.max_global_uses !== undefined && updates.usage_limit === undefined) {
      updates.usage_limit = updates.max_global_uses;
    }
    if (updates.starts_at && !updates.start_date) {
      updates.start_date = updates.starts_at;
    }
    if (updates.ends_at && !updates.end_date) {
      updates.end_date = updates.ends_at;
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

    // Invalidate promotion ISR cache
    safeRevalidate("promotion");

    return NextResponse.json({
      success: true,
      message: "Promotion updated successfully.",
      promotion: updated,
    });
  } catch (error: any) {
    return internalServerErrorProblem(error.message, { instance: req.nextUrl.pathname });
  }
}

// DELETE: Delete promotion (requires promotions:write permission)
export async function DELETE(req: NextRequest) {
  try {
    const perm = requireAdminPermission(req, "promotions:write");
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
      return badRequestProblem("Promotion ID is required.", {
        instance: req.nextUrl.pathname,
      });
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

    // Invalidate promotion ISR cache
    safeRevalidate("promotion");

    return NextResponse.json({
      success,
      message: "Promotion deleted successfully.",
    });
  } catch (error: any) {
    return internalServerErrorProblem(error.message, { instance: req.nextUrl.pathname });
  }
}
