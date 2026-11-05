import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";
import {
  badRequestProblem,
  forbiddenProblem,
  internalServerErrorProblem,
} from "@/lib/api/problemDetails";
import { safeRevalidate } from "@/lib/cache/revalidate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    const isAdmin = clearance.authorized;

    const banners = await db.banners.findMany(
      isAdmin ? undefined : { is_active: true },
      {
        orderBy: "display_order",
        orderDirection: "asc",
      }
    );

    return NextResponse.json({ success: true, count: banners.length, banners });
  } catch (error: any) {
    return internalServerErrorProblem(error.message, { instance: req.nextUrl.pathname });
  }
}

// POST: Add new promotional banner (SUPERADMIN ONLY)
export async function POST(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return forbiddenProblem(clearance.error || "Superadmin authorization required.", {
        instance: req.nextUrl.pathname,
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      type = "content",
      highlight,
      description,
      badge,
      badge_type = "event",
      cta_text = "Explore Now",
      cta_link = "/components",
      secondary_cta_text,
      secondary_cta_link,
      image_url,
      hide_overlay = false,
      perk,
      bg_gradient = "from-slate-50 via-white to-slate-100",
      tag_color = "bg-zinc-900 text-white",
      display_order,
    } = body;

    if (!title || !cta_link) {
      return badRequestProblem("Banner title and CTA link are required.", {
        instance: req.nextUrl.pathname,
      });
    }

    const count = await db.banners.count();
    const newBanner = await db.banners.create({
      id: `banner-${Date.now()}`,
      title,
      type,
      highlight,
      description,
      badge,
      badge_type,
      cta_text,
      cta_link,
      secondary_cta_text,
      secondary_cta_link,
      image_url,
      hide_overlay,
      perk,
      bg_gradient,
      tag_color,
      is_active: true,
      display_order: display_order !== undefined ? Number(display_order) : count + 1,
      created_at: new Date().toISOString(),
    });

    // Invalidate banner ISR cache
    safeRevalidate("banner");

    return NextResponse.json({
      success: true,
      message: "New promotional banner added by Superadmin.",
      banner: newBanner,
    });
  } catch (error: any) {
    return internalServerErrorProblem(error.message, { instance: req.nextUrl.pathname });
  }
}

// PUT: Update banner (SUPERADMIN ONLY)
export async function PUT(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return forbiddenProblem(clearance.error || "Superadmin authorization required.", {
        instance: req.nextUrl.pathname,
      });
    }

    const body = await req.json().catch(() => ({}));
    const { id, ...updates } = body;

    if (!id) {
      return badRequestProblem("Banner ID is required.", {
        instance: req.nextUrl.pathname,
      });
    }

    const updated = await db.banners.update(id, updates);

    // Invalidate banner ISR cache
    safeRevalidate("banner");

    return NextResponse.json({
      success: true,
      message: "Promotional banner updated successfully.",
      banner: updated,
    });
  } catch (error: any) {
    return internalServerErrorProblem(error.message, { instance: req.nextUrl.pathname });
  }
}

// DELETE: Remove banner (SUPERADMIN ONLY)
export async function DELETE(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return forbiddenProblem(clearance.error || "Superadmin authorization required.", {
        instance: req.nextUrl.pathname,
      });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequestProblem("Banner ID is required.", {
        instance: req.nextUrl.pathname,
      });
    }

    const success = await db.banners.delete(id);

    // Invalidate banner ISR cache
    safeRevalidate("banner");

    return NextResponse.json({
      success,
      message: "Promotional banner deleted successfully.",
    });
  } catch (error: any) {
    return internalServerErrorProblem(error.message, { instance: req.nextUrl.pathname });
  }
}
