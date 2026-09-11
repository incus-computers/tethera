import { NextRequest, NextResponse } from "next/server";
import { getAggregatedShippingRates } from "@/lib/shipping/registry";
import { FLAGSHIP_ORIGIN, resolveDistanceKm } from "@/lib/shipping/distance";
import { ShippingEstimateRequest, ShippingEstimateResponse, DeliveryLocation, ShippableItem } from "@/lib/shipping/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const destination: DeliveryLocation = body.destination || {
      address: body.address || "Jakarta",
      latitude: body.latitude,
      longitude: body.longitude,
    };

    if (!destination.address && (!destination.latitude || !destination.longitude)) {
      return NextResponse.json(
        { success: false, message: "A valid destination address or coordinates are required." },
        { status: 400 }
      );
    }

    const items: ShippableItem[] = body.items || [
      {
        id: "default-item",
        name: "PC Component",
        weightGrams: body.totalWeightGrams || 1500,
        price: body.totalPrice || 100,
      },
    ];

    const totalWeightGrams =
      body.totalWeightGrams ||
      items.reduce((sum, item) => sum + (item.weightGrams || 1000) * (item.quantity || 1), 0);

    const distanceKm = resolveDistanceKm(destination);

    const estimateRequest: ShippingEstimateRequest = {
      origin: FLAGSHIP_ORIGIN,
      destination: {
        ...destination,
        distanceKm,
      },
      items,
      totalWeightGrams,
    };

    const rates = await getAggregatedShippingRates(estimateRequest, body.filterCourierId);

    const availableRates = rates.filter((r) => r.isAvailable);
    const cheapestRate = availableRates.length > 0 ? availableRates[0] : undefined;
    const fastestRate = availableRates.find((r) => r.serviceCode.includes("instant")) || availableRates[0];

    const responsePayload: ShippingEstimateResponse = {
      success: true,
      origin: FLAGSHIP_ORIGIN,
      destination: {
        ...destination,
        distanceKm,
      },
      distanceKm,
      rates,
      cheapestRate,
      fastestRate,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Shipping estimate API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to calculate courier rates." },
      { status: 500 }
    );
  }
}
