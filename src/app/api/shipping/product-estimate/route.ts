import { NextRequest, NextResponse } from "next/server";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { integer, MAX_QUANTITY, priceBasket } from "@/lib/checkout/catalog";
import { CheckoutError } from "@/lib/checkout/errors";
import { withApiProtection } from "@/lib/operations/apiProtection";
import { isDemoMode } from "@/lib/runtime/environment";
import { biteship } from "@/lib/shipping/biteship";
import { ShippingError } from "@/lib/shipping/gateway";
import { declaredValue } from "@/lib/shipping/packages";

export const POST = withApiProtection(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { productId, variantId = null, postalCode } = body ?? {};
    if (typeof postalCode !== "string" || !/^\d{5}$/.test(postalCode)) {
      throw new CheckoutError("Enter a five-digit Indonesian postal code.");
    }
    if (typeof productId !== "string" || !productId.trim() || productId.length > 100 ||
      (variantId !== null && (typeof variantId !== "string" || !variantId.trim() || variantId.length > 100))) {
      throw new CheckoutError("Select a product and any required options.");
    }

    const quantity = integer(body.quantity, "quantity", 1, MAX_QUANTITY);
    const { packages } = await priceBasket({
      items: [{ productId, variantId, quantity }],
      builds: [],
      address: { postalCode },
    });
    const rates = await biteship.getRates({
      destination: { address: postalCode, postalCode },
      items: packages,
      insuranceValue: declaredValue(packages),
      requireLive: true,
    });

    return NextResponse.json({
      simulated: isDemoMode(),
      rates: rates.filter(rate => rate.isAvailable).sort((a, b) => a.price - b.price).map(rate => ({
        courierId: rate.courierId,
        courierName: rate.courierName,
        serviceCode: rate.serviceCode,
        serviceName: rate.serviceName,
        etd: rate.etd,
        price: rate.price,
      })),
    });
  } catch (error) {
    const failure = databaseFailureResponse(error);
    if (failure) return failure;
    if (error instanceof CheckoutError || error instanceof ShippingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid estimate request." }, { status: 400 });
    throw error;
  }
});
