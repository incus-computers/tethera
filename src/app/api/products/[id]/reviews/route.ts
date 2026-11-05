import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product identifier is required." },
        { status: 400 }
      );
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
    console.error("[API PRODUCT REVIEWS GET ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch product reviews." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product identifier is required." },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: "Customer email is required for purchase verification." },
        { status: 400 }
      );
    }

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be an integer between 1 and 5." },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Review title is required." },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Review content is required." },
        { status: 400 }
      );
    }

    // Verify buyer eligibility
    const check = await db.reviews.canUserReview(productId, customerEmail, userId);
    if (!check.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: check.reason || "Only verified buyers with a delivered order can leave a review.",
        },
        { status: 403 }
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

    return NextResponse.json(
      {
        success: true,
        review,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API PRODUCT REVIEWS POST ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit review." },
      { status: 500 }
    );
  }
}
