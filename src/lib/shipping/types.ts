/**
 * Pluggable Courier & Delivery Shipping Engine
 * -------------------------------------------------------------
 * Designed for on-demand instant couriers (Gojek, Grab) with
 * modular provider architecture allowing easy addition of standard
 * or express couriers (JNE, SiCepat, Lalamove, DHL, FedEx) in the future.
 */

export type CourierId = "gojek" | "grab" | "jne" | "sicepat" | "lalamove" | "custom" | string;

export type ServiceType = "instant" | "sameday" | "nextday" | "regular" | "cargo";

export type VehicleType = "bike" | "car" | "van" | "truck";

export interface DeliveryLocation {
  address: string;
  subdistrict?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  notes?: string;
}

export interface ShippableItem {
  id: string;
  name: string;
  category?: string;
  weightGrams: number;
  dimensionsCm?: {
    length: number;
    width: number;
    height: number;
  };
  price: number;
  quantity?: number;
}

export interface ShippingEstimateRequest {
  origin: DeliveryLocation;
  destination: DeliveryLocation;
  items: ShippableItem[];
  totalWeightGrams: number;
}

export interface ShippingRateOption {
  courierId: CourierId;
  courierName: string;
  courierBadge: string;
  brandColor: string;
  brandBg: string;
  serviceCode: string;
  serviceName: string;
  serviceDescription: string;
  vehicleType: VehicleType;
  etd: string;
  distanceKm: number;
  price: number; // in USD
  priceFormatted: string;
  isAvailable: boolean;
  ineligibilityReason?: string;
}

export interface ShippingEstimateResponse {
  success: boolean;
  origin: DeliveryLocation;
  destination: DeliveryLocation;
  distanceKm: number;
  rates: ShippingRateOption[];
  cheapestRate?: ShippingRateOption;
  fastestRate?: ShippingRateOption;
  timestamp: string;
  message?: string;
}

/**
 * Courier Provider Interface
 * -------------------------------------------------------------
 * Every delivery service (Gojek, Grab, etc.) must implement this interface.
 * To add a new courier in the future, simply implement `CourierProvider`
 * and register it in `registry.ts`.
 */
export interface CourierProvider {
  id: CourierId;
  name: string;
  description: string;
  brandColor: string;
  brandBg: string;
  supportedServices: ServiceType[];
  estimateRates: (request: ShippingEstimateRequest) => Promise<ShippingRateOption[]>;
}
