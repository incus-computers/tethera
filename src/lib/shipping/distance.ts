import { DeliveryLocation } from "./types";

/**
 * Tethera Flagship Store Location Coordinates
 * Mangga Dua Mall Lt. 3 No. 36, Sawah Besar, Jakarta Pusat
 */
export const FLAGSHIP_ORIGIN: DeliveryLocation = {
  address: "Mangga Dua Mall Lt. 3 No. 36, Jl. Mangga Dua Raya",
  areaId: "IDNP6IDNC147IDND839IDZ10730",
  subdistrict: "Mangga Dua Selatan",
  district: "Sawah Besar",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postalCode: "10730",
  latitude: -6.1364,
  longitude: 106.8258,
};

/**
 * Popular / Preset Greater Jakarta Destinations with real coordinates and Biteship area IDs
 */
export const POPULAR_LOCATIONS: DeliveryLocation[] = [
  {
    address: "Sudirman Central Business District (SCBD)",
    areaId: "IDNP6IDNC148IDND841IDZ12190",
    subdistrict: "Senayan",
    district: "Kebayoran Baru",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postalCode: "12190",
    latitude: -6.2272,
    longitude: 106.8086,
  },
  {
    address: "Pantai Indah Kapuk (PIK 1 & 2)",
    areaId: "IDNP6IDNC149IDND848IDZ14460",
    subdistrict: "Kapuk Muara",
    district: "Penjaringan",
    city: "Jakarta Utara",
    province: "DKI Jakarta",
    postalCode: "14460",
    latitude: -6.1102,
    longitude: 106.7454,
  },
  {
    address: "Kelapa Gading Mall & Boulevard",
    areaId: "IDNP6IDNC149IDND847IDZ14240",
    subdistrict: "Kelapa Gading Barat",
    district: "Kelapa Gading",
    city: "Jakarta Utara",
    province: "DKI Jakarta",
    postalCode: "14240",
    latitude: -6.1583,
    longitude: 106.9084,
  },
  {
    address: "Puri Indah & Kedoya",
    areaId: "IDNP6IDNC146IDND833IDZ11610",
    subdistrict: "Kembangan Selatan",
    district: "Kembangan",
    city: "Jakarta Barat",
    province: "DKI Jakarta",
    postalCode: "11610",
    latitude: -6.1873,
    longitude: 106.7357,
  },
  {
    address: "BSD City / Gading Serpong",
    areaId: "IDNP3IDNC68IDND455IDZ15339",
    subdistrict: "Pagedangan",
    district: "Pagedangan",
    city: "Tangerang",
    province: "Banten",
    postalCode: "15339",
    latitude: -6.3016,
    longitude: 106.6534,
  },
  {
    address: "Menteng & Kuningan Area",
    areaId: "IDNP6IDNC147IDND836IDZ10220",
    subdistrict: "Karet Kuningan",
    district: "Setiabudi",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postalCode: "12940",
    latitude: -6.2185,
    longitude: 106.8298,
  },
  {
    address: "Bintaro Jaya Sektor 7",
    areaId: "IDNP3IDNC69IDND460IDZ15224",
    subdistrict: "Pondok Aren",
    district: "Pondok Aren",
    city: "Tangerang Selatan",
    province: "Banten",
    postalCode: "15224",
    latitude: -6.2821,
    longitude: 106.7196,
  },
  {
    address: "Kemang & Cilandak",
    areaId: "IDNP6IDNC148IDND842IDZ12730",
    subdistrict: "Bangka",
    district: "Mampang Prapatan",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
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
