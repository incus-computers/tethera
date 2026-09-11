import { CourierProvider, ShippingEstimateRequest, ShippingRateOption } from "../types";
import { resolveDistanceKm } from "../distance";
import { formatRupiah } from "../../utils/currency";

/**
 * Gojek Courier Provider (GoSend)
 * -------------------------------------------------------------
 * Rates in Indonesian Rupiah (IDR) dispatched from Mangga Dua Mall.
 */
export const gojekCourierProvider: CourierProvider = {
  id: "gojek",
  name: "Gojek (GoSend)",
  description: "Indonesia's leading on-demand express courier network with real-time GPS tracking.",
  brandColor: "#00AA13",
  brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
  supportedServices: ["instant", "sameday"],

  async estimateRates(request: ShippingEstimateRequest): Promise<ShippingRateOption[]> {
    const distanceKm = resolveDistanceKm(request.destination);
    const weightKg = Math.max(0.5, request.totalWeightGrams / 1000);
    const rates: ShippingRateOption[] = [];

    // Max GoSend on-demand radius is typically 40km from store
    const isWithinRadius = distanceKm <= 40;

    // 1. GoSend Instant (Motorcycle - fast for parts, GPUs, CPUs, peripherals)
    const instantBikeAvailable = isWithinRadius && weightKg <= 20;
    // Base rate: Rp 20.000 base for first 3km + Rp 2.500 per additional km + weight modifier
    const instantBikeRaw = 20000 + Math.max(0, distanceKm - 3) * 2500 + (weightKg > 5 ? (weightKg - 5) * 1000 : 0);
    const instantBikePrice = Math.round(instantBikeRaw / 1000) * 1000;

    rates.push({
      courierId: "gojek",
      courierName: "Gojek",
      courierBadge: "Official Partner",
      brandColor: "#00AA13",
      brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      serviceCode: "gosend-instant",
      serviceName: "GoSend Instant",
      serviceDescription: "Direct courier dispatch to your doorstep. Live GPS tracking on WhatsApp.",
      vehicleType: "bike",
      etd: "1 - 2 Hours",
      distanceKm,
      price: instantBikePrice,
      priceFormatted: formatRupiah(instantBikePrice),
      isAvailable: instantBikeAvailable,
      ineligibilityReason: !isWithinRadius
        ? "Distance exceeds 40km GoSend radius"
        : weightKg > 20
        ? "Weight exceeds 20kg motorcycle limit (Use GoSend Car)"
        : undefined,
    });

    // 2. GoSend Instant Car (For full prebuilt PC rigs, large panoramic glass chassis, multi-item orders)
    const isHeavyOrBulky = weightKg > 15 || request.items.some((i) => i.category === "Chassis" || i.category === "Prebuilt");
    const instantCarAvailable = isWithinRadius && weightKg <= 100;
    // Car base: Rp 60.000 base for first 5km + Rp 5.000 per additional km + weight modifier
    const instantCarRaw = 60000 + Math.max(0, distanceKm - 5) * 5000 + weightKg * 1000;
    const instantCarPrice = Math.round(instantCarRaw / 1000) * 1000;

    rates.push({
      courierId: "gojek",
      courierName: "Gojek",
      courierBadge: isHeavyOrBulky ? "Recommended for PC Builds" : "Spacious Transport",
      brandColor: "#00AA13",
      brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      serviceCode: "gosend-car",
      serviceName: "GoSend Instant Car",
      serviceDescription: "Reinforced climate-controlled car transport. Safe for delicate tempered glass rigs.",
      vehicleType: "car",
      etd: "1 - 2 Hours",
      distanceKm,
      price: instantCarPrice,
      priceFormatted: formatRupiah(instantCarPrice),
      isAvailable: instantCarAvailable,
      ineligibilityReason: !isWithinRadius ? "Distance exceeds 40km GoSend radius" : undefined,
    });

    // 3. GoSend SameDay (Economical for lightweight items up to 5kg)
    const sameDayAvailable = isWithinRadius && weightKg <= 5 && distanceKm <= 35;
    const sameDayPrice = distanceKm <= 15 ? 19000 : 29000;

    rates.push({
      courierId: "gojek",
      courierName: "Gojek",
      courierBadge: "Economical",
      brandColor: "#00AA13",
      brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      serviceCode: "gosend-sameday",
      serviceName: "GoSend SameDay",
      serviceDescription: "Delivered within 6-8 hours on the same business day for orders placed before 3:00 PM.",
      vehicleType: "bike",
      etd: "6 - 8 Hours",
      distanceKm,
      price: sameDayPrice,
      priceFormatted: formatRupiah(sameDayPrice),
      isAvailable: sameDayAvailable,
      ineligibilityReason: !isWithinRadius
        ? "Exceeds 35km SameDay service area"
        : weightKg > 5
        ? "SameDay restricted to parcels under 5kg"
        : undefined,
    });

    return rates;
  },
};
