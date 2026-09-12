import { ShippingEstimateRequest, ShippingRateOption, CourierId } from "./types";
import { biteship } from "./biteship";

/**
 * =========================================================================
 * BITESHIP MULTI-COURIER SHIPPING ENGINE
 * =========================================================================
 * Aggregates live and sub-district mapped rates through Biteship API across:
 * - JNE (REG, YES)
 * - J&T (EZ)
 * - SiCepat (REG, BEST)
 * - AnterAja (REG)
 * - Gojek (GoSend Instant Motor, GoSend Instant Car)
 * - Grab (GrabExpress Instant Motor)
 */

export async function getAggregatedShippingRates(
  request: ShippingEstimateRequest,
  filterCourierId?: CourierId
): Promise<ShippingRateOption[]> {
  try {
    const couriersFilter = filterCourierId && filterCourierId !== "biteship"
      ? [filterCourierId]
      : ["jne", "jnt", "sicepat", "anteraja", "gojek", "grab"];

    const rates = await biteship.getRates({
      destination: request.destination,
      items: request.items,
      totalWeightGrams: request.totalWeightGrams,
      couriersFilter,
    });

    // Sort: available options first, then sorted by price ascending
    return rates.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return a.price - b.price;
    });
  } catch (err) {
    console.error("Failed to fetch shipping rates from Biteship:", err);
    return [];
  }
}

