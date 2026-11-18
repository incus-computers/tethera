import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  badRequestProblem,
  forbiddenProblem,
  internalServerErrorProblem,
} from "@/lib/api/problemDetails";
import { safeRevalidate } from "@/lib/cache/revalidate";

export const dynamic = "force-dynamic";

async function handleGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return badRequestProblem("Product identifier is required.", {
        instance: req.nextUrl.pathname,
      });
    }

    let product = await db.products.findById(id);
    if (!product) {
      product = await db.products.findBySlug(id);
    }

    const productId = product ? product.id : id;
    const summary = await db.reviews.getByProductId(productId);

    const checkEmail =
      req.nextUrl.searchParams.get("checkEmail") ||
      req.nextUrl.searchParams.get("customerEmail");
    const userId = req.nextUrl.searchParams.get("userId");

    let eligibility: { allowed: boolean; reason?: string; orderId?: string } | undefined;
    if (checkEmail || userId) {
      eligibility = await db.reviews.canUserReview(productId, checkEmail, userId);
    }

    return NextResponse.json({
      success: true,
      summary,
      eligibility,
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return internalServerErrorProblem("Failed to fetch product reviews.", {
      instance: req.nextUrl.pathname,
    });
  }
}

async function handlePOST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return badRequestProblem("Product identifier is required.", {
        instance: req.nextUrl.pathname,
      });
    }

    let product = await db.products.findById(id);
    if (!product) {
      product = await db.products.findBySlug(id);
    }

    const productId = product ? product.id : id;
    const body = await req.json().catch(() => ({}));

    const {
      rating,
      title,
      content,
      customerName,
      customerEmail,
      userId,
    } = body;

    if (!customerEmail || !customerEmail.trim()) {
      return badRequestProblem("Customer email is required for purchase verification.", {
        instance: req.nextUrl.pathname,
      });
    }

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return badRequestProblem("Rating must be an integer between 1 and 5.", {
        instance: req.nextUrl.pathname,
      });
    }

    if (!title || !title.trim()) {
      return badRequestProblem("Review title is required.", {
        instance: req.nextUrl.pathname,
      });
    }

    if (!content || !content.trim()) {
      return badRequestProblem("Review content is required.", {
        instance: req.nextUrl.pathname,
      });
    }

    // Verify buyer eligibility
    const check = await db.reviews.canUserReview(productId, customerEmail, userId);
    if (!check.allowed) {
      return forbiddenProblem(
        check.reason || "Only verified buyers with a confirmed delivered order can leave a review.",
        { instance: req.nextUrl.pathname }
      );
    }

    const review = await db.reviews.createVerifiedReview({
      productId,
      customerEmail,
      customerName: customerName ? customerName.trim() : "Verified Buyer",
      rating: Number(rating),
      title: title.trim(),
      content: content.trim(),
      userId: userId || null,
    });

    // Invalidate product cache so latest rating and review count propagate to catalog
    safeRevalidate("product", {
      productId,
      productSlug: product?.slug,
      categorySlug: product?.category_slug,
    });

    return NextResponse.json(
      {
        success: true,
        review,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return internalServerErrorProblem("Failed to submit review.", {
      instance: req.nextUrl.pathname,
    });
  }
}

export const GET = withApiProtection(withAccess(handleGET));
export const POST = withApiProtection(withAccess(handlePOST));
