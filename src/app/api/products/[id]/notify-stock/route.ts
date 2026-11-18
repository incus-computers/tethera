import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { withAccess } from "@/lib/auth/routeGuard";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  badRequestProblem,
  notFoundProblem,
  internalServerErrorProblem,
} from "@/lib/api/problemDetails";

export const dynamic = "force-dynamic";

async function handlePOST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { email, phone, variantId,verifiedOwnerId } = body || {};
    if(variantId){const {BaseRepository}=await import("@/lib/db");const variant=await new BaseRepository<any>("product_variants").findById(String(variantId));if(!variant||variant.product_id!==id||!variant.is_active)return badRequestProblem("Choose an active variant belonging to this product.",{instance});}


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
      verifiedOwnerId,
      variantId: variantId ? String(variantId) : undefined,
      email: emailStr || undefined,
      phone: phoneStr || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your stock alert is saved for your verified email address.",
        notification,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return internalServerErrorProblem(
      "Failed to process stock notification request",
      { instance: req.nextUrl?.pathname || "/api/products/notify-stock" }
    );
  }
}

export const POST=withApiProtection(withAccess(handlePOST));
