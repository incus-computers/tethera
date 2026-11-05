import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  badRequestProblem,
  unprocessableEntityProblem,
  internalServerErrorProblem,
} from "@/lib/api/problemDetails";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const instance = req.nextUrl?.pathname || "/api/promotions/validate";
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return badRequestProblem("Malformed JSON payload in request body", { instance });
    }

    const { code, subtotal, shippingFee, items, customerEmail, customerId } = body || {};

    if (!code || typeof code !== "string" || !code.trim()) {
      return badRequestProblem("Promotion code is required", {
        instance,
        invalid_params: [
          { name: "code", reason: "Must provide a non-empty promotion code string." },
        ],
      });
    }

    const result = await db.promotions.validatePromotion(code.trim(), {
      subtotal: Math.max(0, Number(subtotal || 0)),
      shippingFee: Math.max(0, Number(shippingFee || 0)),
      items: Array.isArray(items) ? items : undefined,
      customerEmail: typeof customerEmail === "string" ? customerEmail.trim() : undefined,
      customerId: typeof customerId === "string" ? customerId.trim() : undefined,
    });

    if (!result.valid) {
      return unprocessableEntityProblem(result.message || "Promotion code could not be applied.", {
        instance,
        extensions: {
          code: code.trim().toUpperCase(),
          valid: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      code: result.code,
      discountAmount: result.discountAmount,
      discountType: result.discountType,
      message: result.message,
      promotion: result.promotion
        ? {
            id: result.promotion.id,
            code: result.promotion.code,
            title: result.promotion.title,
            discount_type: result.promotion.discount_type,
            discount_value: result.promotion.discount_value,
          }
        : undefined,
    });
  } catch (error: any) {
    console.error("[PROMOTIONS VALIDATE API ERROR]:", error);
    return internalServerErrorProblem(
      error.message || "Failed to validate promotion code",
      { instance: req.nextUrl?.pathname || "/api/promotions/validate" }
    );
  }
}
