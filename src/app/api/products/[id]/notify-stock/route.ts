import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  badRequestProblem,
  notFoundProblem,
  internalServerErrorProblem,
} from "@/lib/api/problemDetails";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const instance = req.nextUrl?.pathname || `/api/products/${id}/notify-stock`;

    const product = await db.products.findById(id);
    if (!product) {
      return notFoundProblem(`Product with ID '${id}' not found`, {
        instance,
      });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return badRequestProblem("Malformed JSON payload in request body", {
        instance,
      });
    }

    const { email, phone, variantId } = body || {};

    const emailStr = typeof email === "string" ? email.trim() : "";
    const phoneStr = typeof phone === "string" ? phone.trim() : "";

    if (!emailStr && !phoneStr) {
      return badRequestProblem("At least an email address or phone number must be provided.", {
        instance,
        invalid_params: [
          { name: "email", reason: "Must provide a valid email or phone number." },
        ],
      });
    }

    if (emailStr) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        return badRequestProblem("Invalid email address format provided.", {
          instance,
          invalid_params: [
            { name: "email", reason: "Must be a valid email address format." },
          ],
        });
      }
    }

    const notification = await db.stockNotifications.requestNotification({
      productId: id,
      variantId: variantId ? String(variantId) : undefined,
      email: emailStr || undefined,
      phone: phoneStr || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: "You will be notified when this item is back in stock.",
        notification,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API NOTIFY STOCK ERROR]:", error);
    return internalServerErrorProblem(
      error.message || "Failed to process stock notification request",
      { instance: req.nextUrl?.pathname || `/api/products/${params?.id}/notify-stock` }
    );
  }
}
