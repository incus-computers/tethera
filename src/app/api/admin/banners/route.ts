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

    const banners = await db.banners.findMany(undefined, {
      orderBy: "display_order",
      orderDirection: "asc",
    });

    return NextResponse.json({ success: true, count: banners.length, banners });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new promotional banner (SUPERADMIN ONLY)
export async function POST(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const body = await req.json();
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
      return NextResponse.json(
        { success: false, error: "Banner title and CTA link are required." },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      message: "New promotional banner added by Superadmin.",
      banner: newBanner,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update banner (SUPERADMIN ONLY)
export async function PUT(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Banner ID is required." }, { status: 400 });
    }

    const updated = await db.banners.update(id, updates);
    return NextResponse.json({
      success: true,
      message: "Promotional banner updated successfully.",
      banner: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove banner (SUPERADMIN ONLY)
export async function DELETE(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "superadmin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Banner ID is required." }, { status: 400 });
    }

    const success = await db.banners.delete(id);
    return NextResponse.json({
      success,
      message: "Promotional banner deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
