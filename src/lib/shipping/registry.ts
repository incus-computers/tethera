import { CourierProvider, ShippingEstimateRequest, ShippingRateOption, CourierId } from "./types";
import { gojekCourierProvider } from "./couriers/gojek";
import { grabCourierProvider } from "./couriers/grab";

/**
 * =========================================================================
 * MULTI-COURIER REGISTRY
 * =========================================================================
 * HOW TO ADD MORE COURIERS IN THE FUTURE:
 * -------------------------------------------------------------------------
 * 1. Create a new courier provider file in `src/lib/shipping/couriers/`
 *    (e.g., `jne.ts`, `sicepat.ts`, `lalamove.ts`, or `dhl.ts`).
 * 2. Implement the `CourierProvider` interface.
 * 3. Import and add it to the `COURIER_REGISTRY` array below.
 * That's it! All product pages, location modals, and cart drawer will
 * automatically pull quotes and render the new courier options.
 */
export const COURIER_REGISTRY: CourierProvider[] = [
  gojekCourierProvider,
  grabCourierProvider,
  // Future additions:
  // jneCourierProvider,
  // sicepatCourierProvider,
  // lalamoveCourierProvider,
];

/**
 * Fetches all available shipping estimates across all registered couriers
 */
export async function getAggregatedShippingRates(
  request: ShippingEstimateRequest,
  filterCourierId?: CourierId
): Promise<ShippingRateOption[]> {
  const activeProviders = filterCourierId
    ? COURIER_REGISTRY.filter((p) => p.id === filterCourierId)
    : COURIER_REGISTRY;

  // Run all courier quote requests concurrently in parallel
  const ratePromises = activeProviders.map(async (provider) => {
    try {
      return await provider.estimateRates(request);
    } catch (err) {
      console.error(`Failed to fetch rates from ${provider.name}:`, err);
      return [];
    }
  });

  const results = await Promise.all(ratePromises);
  const flattened = results.flat();

  // Sort: available options first, then sorted by price ascending
  return flattened.sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    return a.price - b.price;
  });
}
