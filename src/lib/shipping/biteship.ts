import { shippingRequest, ShippingError, shippingConfig } from "./gateway";
import { isDemoMode } from "@/lib/runtime/environment";
/**
 * ==============================================================================
 * BITESHIP LOGISTICS API CLIENT & MULTI-COURIER ENGINE
 * ==============================================================================
 * Integrates Biteship REST API for Indonesian omnichannel logistics:
 * 1. Sub-district mapping & autocomplete (Maps API)
 * 2. Real-time rates for JNE, J&T, SiCepat, AnterAja, Gojek, Grab
 * 3. Waybill (AWB) generation & automatic warehouse/shop pickup scheduling
 * 4. Tracking & Webhook parsing
 * ==============================================================================
 */

import { DeliveryLocation, ShippableItem, ShippingRateOption, BiteshipArea } from "./types";
import { formatRupiah } from "../utils/currency";

const BITESHIP_BASE_URL = process.env.BITESHIP_BASE_URL || "https://api.biteship.com/v1";
const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || "";

/**
 * Tethera Store & Warehouse Location (Mangga Dua Flagship Hub)
 * All courier pickups are scheduled from this physical address.
 */
export const TETHERA_WAREHOUSE_ORIGIN = {
  name: "Tethera Flagship Hub (Shop Warehouse)",
  contactName: "Tethera Dispatch Team",
  contactPhone: "+6281288990011",
  contactEmail: "dispatch@tethera.id",
  address: "Mangga Dua Mall Lt. 3 No. 36, Jl. Mangga Dua Raya, Sawah Besar",
  subdistrict: "Mangga Dua Selatan",
  district: "Sawah Besar",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postalCode: 10730,
  areaId: "IDNP6IDNC147IDND839IDZ10730",
  latitude: -6.1364,
  longitude: 106.8258,
};

/**
 * Common Indonesian Sub-district Seed Database (Fallback / Offline Cache)
 * Provides instant autocomplete results and real Biteship Area IDs.
 */
export const SEED_AREAS: BiteshipArea[] = [
  {
    id: "IDNP6IDNC147IDND839IDZ10730",
    name: "Mangga Dua Selatan, Sawah Besar, Jakarta Pusat, DKI Jakarta. 10730",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "DKI Jakarta",
    administrative_division_level_2_name: "Jakarta Pusat",
    administrative_division_level_3_name: "Sawah Besar",
    postal_code: 10730,
  },
  {
    id: "IDNP6IDNC148IDND843IDZ12250",
    name: "Pesanggrahan, Jakarta Selatan, DKI Jakarta. 12250",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "DKI Jakarta",
    administrative_division_level_2_name: "Jakarta Selatan",
    administrative_division_level_3_name: "Pesanggrahan",
    postal_code: 12250,
  },
  {
    id: "IDNP6IDNC148IDND841IDZ12190",
    name: "Senayan, Kebayoran Baru, Jakarta Selatan, DKI Jakarta. 12190",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "DKI Jakarta",
    administrative_division_level_2_name: "Jakarta Selatan",
    administrative_division_level_3_name: "Kebayoran Baru",
    postal_code: 12190,
  },
  {
    id: "IDNP6IDNC147IDND836IDZ10220",
    name: "Karet Tengsin, Tanah Abang, Jakarta Pusat, DKI Jakarta. 10220",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "DKI Jakarta",
    administrative_division_level_2_name: "Jakarta Pusat",
    administrative_division_level_3_name: "Tanah Abang",
    postal_code: 10220,
  },
  {
    id: "IDNP6IDNC149IDND847IDZ14240",
    name: "Kelapa Gading Barat, Kelapa Gading, Jakarta Utara, DKI Jakarta. 14240",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "DKI Jakarta",
    administrative_division_level_2_name: "Jakarta Utara",
    administrative_division_level_3_name: "Kelapa Gading",
    postal_code: 14240,
  },
  {
    id: "IDNP6IDNC149IDND848IDZ14460",
    name: "Kapuk Muara, Penjaringan, Jakarta Utara, DKI Jakarta. 14460",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "DKI Jakarta",
    administrative_division_level_2_name: "Jakarta Utara",
    administrative_division_level_3_name: "Penjaringan",
    postal_code: 14460,
  },
  {
    id: "IDNP6IDNC146IDND833IDZ11610",
    name: "Kembangan Selatan, Kembangan, Jakarta Barat, DKI Jakarta. 11610",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "DKI Jakarta",
    administrative_division_level_2_name: "Jakarta Barat",
    administrative_division_level_3_name: "Kembangan",
    postal_code: 11610,
  },
  {
    id: "IDNP6IDNC148IDND842IDZ12730",
    name: "Bangka, Mampang Prapatan, Jakarta Selatan, DKI Jakarta. 12730",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "DKI Jakarta",
    administrative_division_level_2_name: "Jakarta Selatan",
    administrative_division_level_3_name: "Mampang Prapatan",
    postal_code: 12730,
  },
  {
    id: "IDNP3IDNC68IDND455IDZ15339",
    name: "Pagedangan, Tangerang, Banten. 15339",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "Banten",
    administrative_division_level_2_name: "Tangerang",
    administrative_division_level_3_name: "Pagedangan",
    postal_code: 15339,
  },
  {
    id: "IDNP3IDNC69IDND460IDZ15224",
    name: "Pondok Aren, Tangerang Selatan, Banten. 15224",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "Banten",
    administrative_division_level_2_name: "Tangerang Selatan",
    administrative_division_level_3_name: "Pondok Aren",
    postal_code: 15224,
  },
  {
    id: "IDNP5IDNC124IDND690IDZ40115",
    name: "Coblong, Bandung, Jawa Barat. 40115",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "Jawa Barat",
    administrative_division_level_2_name: "Bandung",
    administrative_division_level_3_name: "Coblong",
    postal_code: 40115,
  },
  {
    id: "IDNP7IDNC225IDND1350IDZ60271",
    name: "Genteng, Surabaya, Jawa Timur. 60271",
    country_name: "Indonesia",
    country_code: "ID",
    administrative_division_level_1_name: "Jawa Timur",
    administrative_division_level_2_name: "Surabaya",
    administrative_division_level_3_name: "Genteng",
    postal_code: 60271,
  },
];

/**
 * Courier metadata mapping for styling and branding
 */
export const COURIER_META: Record<
  string,
  {
    name: string;
    brandColor: string;
    brandBg: string;
    badge: string;
    category: "instant" | "express" | "regular" | "cargo";
  }
> = {
  jne: {
    name: "JNE Express",
    brandColor: "#003399",
    brandBg: "bg-blue-50 text-blue-800 border-blue-200",
    badge: "Official Carrier",
    category: "regular",
  },
  jnt: {
    name: "J&T Express",
    brandColor: "#ED1C24",
    brandBg: "bg-red-50 text-red-800 border-red-200",
    badge: "Fast Freight",
    category: "regular",
  },
  sicepat: {
    name: "SiCepat Ekspres",
    brandColor: "#D31515",
    brandBg: "bg-rose-50 text-rose-800 border-rose-200",
    badge: "Reliable E-Commerce",
    category: "regular",
  },
  anteraja: {
    name: "AnterAja",
    brandColor: "#E91E63",
    brandBg: "bg-pink-50 text-pink-800 border-pink-200",
    badge: "Nationwide Hub",
    category: "regular",
  },
  gojek: {
    name: "Gojek (GoSend)",
    brandColor: "#00AA13",
    brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    badge: "Instant Driver",
    category: "instant",
  },
  grab: {
    name: "Grab (GrabExpress)",
    brandColor: "#00B14F",
    brandBg: "bg-green-50 text-green-800 border-green-200",
    badge: "Express Driver",
    category: "instant",
  },
};

export class BiteshipService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = BITESHIP_API_KEY;
    this.baseUrl = BITESHIP_BASE_URL;
  }

  private hasLiveApiKey(): boolean {
    return !isDemoMode() && !!this.apiKey && this.apiKey.length > 10;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: this.apiKey,
      "Content-Type": "application/json",
    };
  }

  /**
   * 1. SUB-DISTRICT SEARCH (Biteship Maps API)
   * GET /v1/maps/areas?countries=ID&input={query}&type=single
   */
  async searchAreas(query: string): Promise<BiteshipArea[]> {
    if (!query || query.trim().length < 2) return [];
    const cleanQuery = query.trim().toLowerCase();

    if(!isDemoMode()) {
      const data=await shippingRequest(`/maps/areas?countries=ID&input=${encodeURIComponent(query.trim())}&type=single`);
      if(!Array.isArray(data.areas))throw new ShippingError("Invalid area response.");
      return data.areas;
    }

    // 2. Fallback to rich seed cache
    const matches = SEED_AREAS.filter((a) => {
      return (
        a.name.toLowerCase().includes(cleanQuery) ||
        a.administrative_division_level_3_name.toLowerCase().includes(cleanQuery) ||
        a.administrative_division_level_2_name.toLowerCase().includes(cleanQuery) ||
        String(a.postal_code).includes(cleanQuery)
      );
    });

    if (matches.length > 0) return matches;

    // 3. Dynamic synthesis if user enters custom subdistrict not in seed list
    return [
      {
        id: `ID-AREA-${cleanQuery.replace(/[^a-z0-9]/g, "").slice(0, 12)}`,
        name: `${query.trim()}, Jakarta Area, DKI Jakarta`,
        country_name: "Indonesia",
        country_code: "ID",
        administrative_division_level_1_name: "DKI Jakarta",
        administrative_division_level_2_name: "Jakarta",
        administrative_division_level_3_name: query.trim(),
        postal_code: 10110,
      },
    ];
  }

  /**
   * 2. REALTIME MULTI-COURIER RATES CALCULATION
   * POST /v1/rates/couriers
   * Queries: jne, jnt, sicepat, anteraja, gojek, grab
   */
  async getRates(params: {
    destination: DeliveryLocation;
    items?: ShippableItem[];
    totalWeightGrams?: number;
    couriersFilter?: string[]; // e.g. ["jne", "jnt", "sicepat", "anteraja", "gojek", "grab"]
    requireLive?: boolean;
    insuranceValue?:number;
    origin?: typeof TETHERA_WAREHOUSE_ORIGIN;
  }): Promise<ShippingRateOption[]> {
    const { destination, items = [], couriersFilter } = params;
    if(!isDemoMode()) {
      shippingConfig();
      if(destination.postalCode && !/^\d{5}$/.test(String(destination.postalCode)))throw new ShippingError("Invalid destination postal code.",400);
      if(!destination.postalCode && !destination.areaId && !(Number.isFinite(destination.latitude)&&Number.isFinite(destination.longitude)))throw new ShippingError("A verified destination is required.",400);
      if(!items.length || items.some(i=>!Number.isInteger(i.weightGrams)||i.weightGrams<=0||!Number.isSafeInteger(i.price)||i.price<0||!Number.isInteger(i.quantity??1)||(i.quantity??1)<=0||!i.dimensionsCm||[i.dimensionsCm.length,i.dimensionsCm.width,i.dimensionsCm.height].some(n=>!Number.isFinite(n)||n<=0)))throw new ShippingError("Complete shipping package information is required.",409);
    }

    const totalWeight =
      params.totalWeightGrams ||
      items.reduce((acc, i) => acc + (i.weightGrams || 1000) * (i.quantity || 1), 0) ||
      2000;

    const requestedCouriers = (
      couriersFilter && couriersFilter.length > 0
        ? couriersFilter
        : ["jne", "jnt", "sicepat", "anteraja", "gojek", "grab"]
    ).join(",");

    const biteshipItems = items.length > 0
      ? items.map((i) => ({
          name: i.name || "Hardware Component",
          description: i.name,
          value: i.price ?? 500000,
          quantity: i.quantity || 1,
          weight: i.weightGrams || 1000,
          length: i.dimensionsCm?.length || 25,
          width: i.dimensionsCm?.width || 20,
          height: i.dimensionsCm?.height || 10,
        }))
      : [
          {
            name: "Tethera Hardware Package",
            description: "High performance PC components",
            value: 1500000,
            quantity: 1,
            weight: totalWeight,
            length: 30,
            width: 25,
            height: 15,
          },
        ];

    // Payload following Biteship Rates API specs
    const shippingOrigin=params.origin??TETHERA_WAREHOUSE_ORIGIN;
    const body: Record<string, any> = {
      ...(isDemoMode()?{origin_area_id:TETHERA_WAREHOUSE_ORIGIN.areaId,origin_latitude:TETHERA_WAREHOUSE_ORIGIN.latitude,origin_longitude:TETHERA_WAREHOUSE_ORIGIN.longitude}:{}),
      origin_postal_code: shippingOrigin.postalCode,
      couriers: requestedCouriers,
      items: biteshipItems,
      ...(params.insuranceValue!==undefined?{courier_insurance:params.insuranceValue}:{}),
    };

    if (destination.areaId) {
      body.destination_area_id = destination.areaId;
    }
    if (destination.postalCode) {
      body.destination_postal_code = Number(destination.postalCode);
    }
    if (destination.latitude && destination.longitude) {
      body.destination_latitude = destination.latitude;
      body.destination_longitude = destination.longitude;
    }

    if(!isDemoMode()) {
      const data=await shippingRequest("/rates/couriers",body);
      if(!Array.isArray(data.pricing) || data.pricing.some((p:any)=>typeof p.price!=="number"||!Number.isSafeInteger(p.price)||p.price<=0||typeof p.courier_code!=="string"||!p.courier_code||typeof p.courier_service_code!=="string"||!p.courier_service_code))throw new ShippingError("Live courier rates are unavailable.");
      return data.pricing.map((p:any)=>{
        const rate=this.mapBiteshipRateToOption(p,destination);
        if(params.insuranceValue!==undefined && params.insuranceValue>0){
          if(p.available_for_insurance!==true || !Number.isSafeInteger(p.insurance_fee) || p.insurance_fee<0)return {...rate,isAvailable:false,ineligibilityReason:"Full goods-value insurance is unavailable."};
          rate.insuranceValue=params.insuranceValue;rate.insuranceFee=p.insurance_fee;
        }
        if(["gojek","grab"].includes(rate.courierId))return {...rate,isAvailable:false,ineligibilityReason:"Verified coordinates are required for instant delivery."};
        if(Array.isArray(p.available_collection_method)&&!p.available_collection_method.includes("pickup"))return {...rate,isAvailable:false,ineligibilityReason:"Warehouse pickup is unavailable for this service."};
        return rate;
      });
    }

    // Explicit demo fixtures only.
    const simulated=this.generateSimulatedRates(destination,Math.max(totalWeight,items.reduce((sum,item)=>sum+Math.ceil((item.dimensionsCm?.length||0)*(item.dimensionsCm?.width||0)*(item.dimensionsCm?.height||0)/6000*1000)*(item.quantity||1),0)),requestedCouriers.split(","));
    return simulated.map(rate=>{const fee=params.insuranceValue?Math.ceil(params.insuranceValue*0.005):0;return {...rate,...(params.insuranceValue!==undefined?{insuranceValue:params.insuranceValue,insuranceFee:fee}:{}),price:rate.price+fee,priceFormatted:formatRupiah(rate.price+fee)};});
  }

  /**
   * 3. WAYBILL GENERATION & AUTOMATIC WAREHOUSE PICKUP SCHEDULING
   * POST /v1/orders
   * Creates the shipment order, generates the AWB/Waybill immediately,
   * and schedules automated pickup directly from the Tethera Mangga Dua Flagship Hub.
   */
  async createOrderAndSchedulePickup(params: {
    orderNumber: string;
    courierCompany: string; // "jne" | "jnt" | "sicepat" | "anteraja" | "gojek" | "grab"
    courierType: string; // "reg" | "yes" | "ez" | "best" | "instant"
    destinationName: string;
    destinationPhone: string;
    destinationEmail?: string;
    destinationAddress: string;
    destinationAreaId?: string;
    destinationPostalCode?: string | number;
    destinationCoordinates?: { latitude: number; longitude: number };
    destinationNote?: string;
    items: ShippableItem[];
    deliveryType?: "now" | "scheduled"; // "now" or "scheduled"
    deliveryDate?: string; // YYYY-MM-DD
    deliveryTime?: string; // HH:mm
    orderNote?: string;
  }): Promise<{
    success: boolean;
    biteshipOrderId: string;
    waybillId: string;
    trackingId: string;
    courierCompany: string;
    courierType: string;
    status: string;
    trackingUrl: string;
    pickupTime: string;
    message: string;
    raw?: any;
  }> {
    const deliveryType = params.deliveryType || "now";
    const todayStr = new Date().toISOString().split("T")[0];
    const deliveryDate = params.deliveryDate || todayStr;
    const deliveryTime = params.deliveryTime || "14:00";

    if(!isDemoMode())throw new ShippingError("Use the durable dispatch operation to create a real shipment.",409);

    // Dummy identifiers for the legacy demo adapter only.
    const company = params.courierCompany.toUpperCase();
    const randNum = Math.floor(10000000 + Math.random() * 90000000);
    const waybillId = `DEMO-${company}-${randNum}`;
    const biteshipOrderId = `demo_${Math.random().toString(36).substring(2, 15)}`;
    const trackingId = `DEMO-TRK-${company}-${Date.now().toString().slice(-6)}`;

    return {
      success: true,
      biteshipOrderId,
      waybillId,
      trackingId,
      courierCompany: params.courierCompany,
      courierType: params.courierType,
      status: deliveryType === "now" ? "allocated" : "scheduled",
      trackingUrl: "",
      pickupTime: deliveryType === "now" ? "Immediate (Within 45 mins)" : `${deliveryDate} ${deliveryTime}`,
      message: `Demo waybill ${waybillId} generated. No real courier pickup was scheduled.`,
      raw: {
        id: biteshipOrderId,
        courier_waybill_id: waybillId,
        courier_tracking_id: trackingId,
        courier_company: params.courierCompany,
        status: deliveryType === "now" ? "allocated" : "scheduled",
      },
    };
  }

  /**
   * Helper: Maps Biteship API pricing response to app's ShippingRateOption
   */
  private mapBiteshipRateToOption(pricing: any, destination: DeliveryLocation): ShippingRateOption {
    const courierCode = (pricing.courier_code || pricing.company || "jne").toLowerCase();
    const meta = COURIER_META[courierCode] || {
      name: pricing.courier_name || courierCode.toUpperCase(),
      brandColor: "#2563eb",
      brandBg: "bg-blue-50 text-blue-800 border-blue-200",
      badge: "Partner",
      category: "regular",
    };

    const isInstant = pricing.service_type === "instant" || courierCode === "gojek" || courierCode === "grab";
    const vehicleType = isInstant
      ? pricing.courier_service_code?.includes("car") ? "car" : "bike"
      : "van";

    return {
      courierId: courierCode,
      courierName: meta.name,
      courierBadge: meta.badge,
      brandColor: meta.brandColor,
      brandBg: meta.brandBg,
      serviceCode: pricing.courier_service_code || "standard",
      serviceName: `${meta.name} ${pricing.courier_service_name || pricing.service_type || ""}`,
      serviceDescription: pricing.description || `${pricing.duration || "1-3 days"} delivery from Mangga Dua Hub`,
      vehicleType,
      etd: pricing.duration || (isInstant ? "1 - 2 Hours" : "1 - 3 Days"),
      distanceKm: destination.distanceKm || 12.5,
      price: pricing.price || 25000,
      priceFormatted: formatRupiah(pricing.price || 25000),
      isAvailable: true,
    };
  }

  /**
   * Helper: Realistic rate generator covering JNE, J&T, SiCepat, AnterAja, Gojek, Grab
   */
  private generateSimulatedRates(
    destination: DeliveryLocation,
    weightGrams: number,
    couriers: string[]
  ): ShippingRateOption[] {
    const weightKg = Math.max(1, Math.ceil(weightGrams / 1000));
    const distanceKm = destination.distanceKm || 14.5;
    const rates: ShippingRateOption[] = [];

    // 1. JNE
    if (couriers.includes("jne") || couriers.includes("all")) {
      rates.push({
        courierId: "jne",
        courierName: "JNE Express",
        courierBadge: "Official Carrier",
        brandColor: "#003399",
        brandBg: "bg-blue-50 text-blue-800 border-blue-200",
        serviceCode: "jne-reg",
        serviceName: "JNE REG (Reguler)",
        serviceDescription: "Standard nationwide courier service with pickup from warehouse.",
        vehicleType: "van",
        etd: "1 - 2 Days",
        distanceKm,
        price: 11000 * weightKg,
        priceFormatted: formatRupiah(11000 * weightKg),
        isAvailable: true,
      });

      rates.push({
        courierId: "jne",
        courierName: "JNE Express",
        courierBadge: "Priority Delivery",
        brandColor: "#003399",
        brandBg: "bg-blue-50 text-blue-800 border-blue-200",
        serviceCode: "jne-yes",
        serviceName: "JNE YES (Yakin Esok Sampai)",
        serviceDescription: "Guaranteed next-day delivery nationwide.",
        vehicleType: "van",
        etd: "Tomorrow by 18:00",
        distanceKm,
        price: 24000 * weightKg,
        priceFormatted: formatRupiah(24000 * weightKg),
        isAvailable: true,
      });
    }

    // 2. J&T Express
    if (couriers.includes("jnt") || couriers.includes("all")) {
      rates.push({
        courierId: "jnt",
        courierName: "J&T Express",
        courierBadge: "Fast Freight",
        brandColor: "#ED1C24",
        brandBg: "bg-red-50 text-red-800 border-red-200",
        serviceCode: "jnt-ez",
        serviceName: "J&T EZ",
        serviceDescription: "Fast 365-day operation with automated shop pickup.",
        vehicleType: "van",
        etd: "1 - 2 Days",
        distanceKm,
        price: 12000 * weightKg,
        priceFormatted: formatRupiah(12000 * weightKg),
        isAvailable: true,
      });
    }

    // 3. SiCepat
    if (couriers.includes("sicepat") || couriers.includes("all")) {
      rates.push({
        courierId: "sicepat",
        courierName: "SiCepat Ekspres",
        courierBadge: "E-Commerce Choice",
        brandColor: "#D31515",
        brandBg: "bg-rose-50 text-rose-800 border-rose-200",
        serviceCode: "sicepat-reg",
        serviceName: "SiCepat REG (Reguler)",
        serviceDescription: "Standard courier service with real-time tracking.",
        vehicleType: "van",
        etd: "1 - 2 Days",
        distanceKm,
        price: 10500 * weightKg,
        priceFormatted: formatRupiah(10500 * weightKg),
        isAvailable: true,
      });

      rates.push({
        courierId: "sicepat",
        courierName: "SiCepat Ekspres",
        courierBadge: "Next Day Express",
        brandColor: "#D31515",
        brandBg: "bg-rose-50 text-rose-800 border-rose-200",
        serviceCode: "sicepat-best",
        serviceName: "SiCepat BEST (Besok Sampai)",
        serviceDescription: "Express delivery arriving tomorrow guaranteed.",
        vehicleType: "van",
        etd: "1 Day (Tomorrow)",
        distanceKm,
        price: 22000 * weightKg,
        priceFormatted: formatRupiah(22000 * weightKg),
        isAvailable: true,
      });
    }

    // 4. AnterAja
    if (couriers.includes("anteraja") || couriers.includes("all")) {
      rates.push({
        courierId: "anteraja",
        courierName: "AnterAja",
        courierBadge: "Tech Courier",
        brandColor: "#E91E63",
        brandBg: "bg-pink-50 text-pink-800 border-pink-200",
        serviceCode: "anteraja-reg",
        serviceName: "AnterAja Reguler",
        serviceDescription: "Reliable barcode scanning & automated courier assignment.",
        vehicleType: "van",
        etd: "1 - 3 Days",
        distanceKm,
        price: 10000 * weightKg,
        priceFormatted: formatRupiah(10000 * weightKg),
        isAvailable: true,
      });
    }

    // 5. Gojek (GoSend Instant) - Radius check <= 40km
    if (couriers.includes("gojek") || couriers.includes("all")) {
      const isWithinInstant = distanceKm <= 40;
      const bikePrice = Math.round((20000 + Math.max(0, distanceKm - 3) * 2500) / 1000) * 1000;
      const carPrice = Math.round((60000 + Math.max(0, distanceKm - 5) * 5000 + weightKg * 1000) / 1000) * 1000;

      rates.push({
        courierId: "gojek",
        courierName: "Gojek (GoSend)",
        courierBadge: "Instant Motorbike",
        brandColor: "#00AA13",
        brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        serviceCode: "gosend-instant",
        serviceName: "GoSend Instant Motor",
        serviceDescription: "Direct courier dispatch to your doorstep within 1-2 hours.",
        vehicleType: "bike",
        etd: "1 - 2 Hours",
        distanceKm,
        price: bikePrice,
        priceFormatted: formatRupiah(bikePrice),
        isAvailable: isWithinInstant && weightKg <= 20,
        ineligibilityReason: !isWithinInstant ? "Exceeds 40km GoSend radius" : undefined,
      });

      rates.push({
        courierId: "gojek",
        courierName: "Gojek (GoSend)",
        courierBadge: "Instant Car",
        brandColor: "#00AA13",
        brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        serviceCode: "gosend-car",
        serviceName: "GoSend Instant Car",
        serviceDescription: "Enclosed vehicle for full custom PC builds & multi-part packages.",
        vehicleType: "car",
        etd: "2 - 3 Hours",
        distanceKm,
        price: carPrice,
        priceFormatted: formatRupiah(carPrice),
        isAvailable: isWithinInstant && weightKg <= 100,
        ineligibilityReason: !isWithinInstant ? "Exceeds 40km GoSend radius" : undefined,
      });
    }

    // 6. Grab (GrabExpress Instant)
    if (couriers.includes("grab") || couriers.includes("all")) {
      const isWithinInstant = distanceKm <= 40;
      const grabBikePrice = Math.round((20000 + Math.max(0, distanceKm - 3) * 2600) / 1000) * 1000;

      rates.push({
        courierId: "grab",
        courierName: "Grab (GrabExpress)",
        courierBadge: "Express Partner",
        brandColor: "#00B14F",
        brandBg: "bg-green-50 text-green-800 border-green-200",
        serviceCode: "grabexpress-instant",
        serviceName: "GrabExpress Instant",
        serviceDescription: "Priority driver allocation with real-time GPS tracking.",
        vehicleType: "bike",
        etd: "1 - 2 Hours",
        distanceKm,
        price: grabBikePrice,
        priceFormatted: formatRupiah(grabBikePrice),
        isAvailable: isWithinInstant && weightKg <= 15,
        ineligibilityReason: !isWithinInstant ? "Exceeds 40km GrabExpress radius" : undefined,
      });
    }

    // Sort by price ascending, keeping available options on top
    return rates.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return a.price - b.price;
    });
  }
}

export const biteship = new BiteshipService();
