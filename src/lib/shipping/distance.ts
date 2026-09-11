import { DeliveryLocation } from "./types";

/**
 * Tethera Flagship Store Location Coordinates
 * Mangga Dua Mall Lt. 3 No. 36, Sawah Besar, Jakarta Pusat
 */
export const FLAGSHIP_ORIGIN: DeliveryLocation = {
  address: "Mangga Dua Mall Lt. 3 No. 36, Jl. Mangga Dua Raya",
  subdistrict: "Mangga Dua Selatan",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postalCode: "10730",
  latitude: -6.1364,
  longitude: 106.8258,
};

/**
 * Popular / Preset Greater Jakarta Destinations with real coordinates
 */
export const POPULAR_LOCATIONS: DeliveryLocation[] = [
  {
    address: "Sudirman Central Business District (SCBD)",
    subdistrict: "Senayan",
    city: "Jakarta Selatan",
    postalCode: "12190",
    latitude: -6.2272,
    longitude: 106.8086,
  },
  {
    address: "Pantai Indah Kapuk (PIK 1 & 2)",
    subdistrict: "Kapuk Muara",
    city: "Jakarta Utara",
    postalCode: "14460",
    latitude: -6.1102,
    longitude: 106.7454,
  },
  {
    address: "Kelapa Gading Mall & Boulevard",
    subdistrict: "Kelapa Gading Timur",
    city: "Jakarta Utara",
    postalCode: "14240",
    latitude: -6.1583,
    longitude: 106.9084,
  },
  {
    address: "Puri Indah & Kedoya",
    subdistrict: "Kembangan Selatan",
    city: "Jakarta Barat",
    postalCode: "11610",
    latitude: -6.1873,
    longitude: 106.7357,
  },
  {
    address: "BSD City / Gading Serpong",
    subdistrict: "Pagedangan",
    city: "Tangerang Selatan",
    postalCode: "15339",
    latitude: -6.3016,
    longitude: 106.6534,
  },
  {
    address: "Menteng & Kuningan Area",
    subdistrict: "Karet Kuningan",
    city: "Jakarta Selatan",
    postalCode: "12940",
    latitude: -6.2185,
    longitude: 106.8298,
  },
  {
    address: "Bintaro Jaya Sektor 7",
    subdistrict: "Pondok Aren",
    city: "Tangerang Selatan",
    postalCode: "15224",
    latitude: -6.2821,
    longitude: 106.7196,
  },
  {
    address: "Kemang & Cilandak",
    subdistrict: "Bangka",
    city: "Jakarta Selatan",
    postalCode: "12730",
    latitude: -6.2738,
    longitude: 106.8155,
  },
];

/**
 * Haversine formula to compute geodesic distance between coordinates (in km)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;

  // Road factor adjustment for realistic road driving distance in Greater Jakarta traffic
  const roadFactor = 1.34;
  return Math.round(straightLineKm * roadFactor * 10) / 10;
}

/**
 * Resolves or approximates distance from Flagship Store
 */
export function resolveDistanceKm(destination: DeliveryLocation): number {
  if (destination.latitude && destination.longitude) {
    return calculateHaversineDistanceKm(
      FLAGSHIP_ORIGIN.latitude!,
      FLAGSHIP_ORIGIN.longitude!,
      destination.latitude,
      destination.longitude
    );
  }

  // If coordinates are not provided, check keyword matching against known presets
  const query = destination.address.toLowerCase();
  for (const preset of POPULAR_LOCATIONS) {
    if (
      query.includes(preset.address.toLowerCase()) ||
      query.includes(preset.city?.toLowerCase() || "") ||
      query.includes(preset.subdistrict?.toLowerCase() || "")
    ) {
      return calculateHaversineDistanceKm(
        FLAGSHIP_ORIGIN.latitude!,
        FLAGSHIP_ORIGIN.longitude!,
        preset.latitude!,
        preset.longitude!
      );
    }
  }

  // Fallback default distance based on simple heuristic or 12km (Central Jakarta average)
  return 12.5;
}
