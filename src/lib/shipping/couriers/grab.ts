import { CourierProvider, ShippingEstimateRequest, ShippingRateOption } from "../types";
import { resolveDistanceKm } from "../distance";
import { formatRupiah } from "../../utils/currency";

/**
 * Grab Courier Provider (GrabExpress)
 * -------------------------------------------------------------
 * Rates in Indonesian Rupiah (IDR) dispatched from Mangga Dua Mall.
 */
export const grabCourierProvider: CourierProvider = {
  id: "grab",
  name: "Grab (GrabExpress)",
  description: "Seamless on-demand motorcycle and car delivery with real-time driver tracking and insured cargo.",
  brandColor: "#00B14F",
  brandBg: "bg-green-50 text-green-800 border-green-200",
  supportedServices: ["instant", "sameday"],

  async estimateRates(request: ShippingEstimateRequest): Promise<ShippingRateOption[]> {
    const distanceKm = resolveDistanceKm(request.destination);
    const weightKg = Math.max(0.5, request.totalWeightGrams / 1000);
    const rates: ShippingRateOption[] = [];

    const isWithinRadius = distanceKm <= 40;

    // 1. GrabExpress Instant (Bike)
    const instantBikeAvailable = isWithinRadius && weightKg <= 15;
    // Grab base rate: Rp 20.000 base for first 3km + Rp 2.600 per km + weight modifier
    const instantBikeRaw = 20000 + Math.max(0, distanceKm - 3) * 2600 + (weightKg > 5 ? (weightKg - 5) * 1000 : 0);
    const instantBikePrice = Math.round(instantBikeRaw / 1000) * 1000;

    rates.push({
      courierId: "grab",
      courierName: "Grab",
      courierBadge: "Express Partner",
      brandColor: "#00B14F",
      brandBg: "bg-green-50 text-green-800 border-green-200",
      serviceCode: "grabexpress-instant",
      serviceName: "GrabExpress Instant",
      serviceDescription: "Priority driver dispatch. Arrives at destination in 60-90 minutes.",
      vehicleType: "bike",
      etd: "1 - 2 Hours",
      distanceKm,
      price: instantBikePrice,
      priceFormatted: formatRupiah(instantBikePrice),
      isAvailable: instantBikeAvailable,
      ineligibilityReason: !isWithinRadius
        ? "Destination exceeds 40km GrabExpress radius"
        : weightKg > 15
        ? "Exceeds 15kg bike limit (Choose GrabExpress Car)"
        : undefined,
    });

    // 2. GrabExpress Car (Large volume / fragile PC systems)
    const instantCarAvailable = isWithinRadius && weightKg <= 150;
    // Car base: Rp 65.000 base for first 5km + Rp 5.200 per km + weight modifier
    const instantCarRaw = 65000 + Math.max(0, distanceKm - 5) * 5200 + weightKg * 1000;
    const instantCarPrice = Math.round(instantCarRaw / 1000) * 1000;

    rates.push({
      courierId: "grab",
      courierName: "Grab",
      courierBadge: "Safe Cargo",
      brandColor: "#00B14F",
      brandBg: "bg-green-50 text-green-800 border-green-200",
      serviceCode: "grabexpress-car",
      serviceName: "GrabExpress Car (XL)",
      serviceDescription: "Spacious four-wheel transport. Padded seating and trunk protection for custom rigs.",
      vehicleType: "car",
      etd: "1 - 2 Hours",
      distanceKm,
      price: instantCarPrice,
      priceFormatted: formatRupiah(instantCarPrice),
      isAvailable: instantCarAvailable,
      ineligibilityReason: !isWithinRadius ? "Destination exceeds 40km GrabExpress radius" : undefined,
    });

    // 3. GrabExpress SameDay
    const sameDayAvailable = isWithinRadius && weightKg <= 7 && distanceKm <= 30;
    const sameDayPrice = distanceKm <= 15 ? 20000 : 30000;

    rates.push({
      courierId: "grab",
      courierName: "Grab",
      courierBadge: "Budget Saver",
      brandColor: "#00B14F",
      brandBg: "bg-green-50 text-green-800 border-green-200",
      serviceCode: "grabexpress-sameday",
      serviceName: "GrabExpress SameDay",
      serviceDescription: "Guaranteed same-day delivery for non-urgent components up to 7kg.",
      vehicleType: "bike",
      etd: "5 - 7 Hours",
      distanceKm,
      price: sameDayPrice,
      priceFormatted: formatRupiah(sameDayPrice),
      isAvailable: sameDayAvailable,
      ineligibilityReason: !isWithinRadius
        ? "Exceeds 30km SameDay coverage"
        : weightKg > 7
        ? "SameDay restricted to parcels under 7kg"
        : undefined,
    });

    return rates;
  },
};
