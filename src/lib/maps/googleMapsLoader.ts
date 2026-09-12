/**
 * ==============================================================================
 * GOOGLE MAPS JAVASCRIPT API & PLACES LOADER
 * ==============================================================================
 * Handles asynchronous script loading, API key validation, and singleton
 * promise tracking for Google Maps JS API (with Places and Geometry libraries).
 * ==============================================================================
 */

import { DeliveryLocation, BiteshipArea } from "../shipping/types";
import { FLAGSHIP_ORIGIN, calculateHaversineDistanceKm } from "../shipping/distance";

declare global {
  interface Window {
    __googleMapsInitCallback?: () => void;
  }
}

let loadPromise: Promise<typeof google.maps> | null = null;

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

export function isGoogleMapsLoaded(): boolean {
  return typeof window !== "undefined" && !!window.google && !!window.google.maps;
}

/**
 * Dynamically loads the Google Maps JavaScript API script tag with places & geometry libraries.
 */
export function loadGoogleMaps(apiKeyOverride?: string): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in browser environment."));
  }

  if (isGoogleMapsLoaded()) {
    return Promise.resolve(window.google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  const apiKey = apiKeyOverride || getGoogleMapsApiKey();
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_google_maps_api_key_here") {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured in your environment.")
    );
  }

  loadPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (isGoogleMapsLoaded()) {
          clearInterval(checkInterval);
          resolve(window.google.maps);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (isGoogleMapsLoaded()) {
          resolve(window.google.maps);
        } else {
          loadPromise = null;
          reject(new Error("Timeout waiting for existing Google Maps script to load."));
        }
      }, 8000);
      return;
    }

    const callbackName = `__googleMapsInitCallback_${Date.now()}`;
    (window as any)[callbackName] = () => {
      delete (window as any)[callbackName];
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error("Google Maps object not found after script execution."));
      }
    };

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey.trim()
    )}&libraries=places,geometry&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      delete (window as any)[callbackName];
      loadPromise = null;
      reject(new Error("Failed to load Google Maps JavaScript API script. Check your API key and network."));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Parses Google Geocoder or Places address_components into structured delivery fields.
 */
export function parseGoogleAddressComponents(
  components: google.maps.GeocoderAddressComponent[]
): {
  streetNumber: string;
  route: string;
  subdistrict: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
} {
  let streetNumber = "";
  let route = "";
  let subdistrict = "";
  let district = "";
  let city = "";
  let province = "";
  let postalCode = "";
  let country = "";

  for (const comp of components) {
    const types = comp.types;

    if (types.includes("street_number")) {
      streetNumber = comp.long_name;
    } else if (types.includes("route")) {
      route = comp.long_name;
    } else if (
      types.includes("administrative_area_level_4") ||
      types.includes("sublocality_level_2")
    ) {
      // Kelurahan
      if (!subdistrict) subdistrict = comp.long_name;
    } else if (
      types.includes("administrative_area_level_3") ||
      types.includes("sublocality_level_1") ||
      types.includes("sublocality")
    ) {
      // Kecamatan (Subdistrict)
      subdistrict = comp.long_name;
      district = comp.long_name;
    } else if (types.includes("administrative_area_level_2")) {
      // Kota / Kabupaten (e.g. Jakarta Selatan, Jakarta Pusat, Tangerang)
      city = comp.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      // Provinsi (e.g. DKI Jakarta, Jawa Barat)
      province = comp.long_name;
    } else if (types.includes("postal_code")) {
      postalCode = comp.long_name;
    } else if (types.includes("country")) {
      country = comp.long_name;
    }
  }

  // Clean Indonesian prefixes (e.g. "Kecamatan Pesanggrahan" -> "Pesanggrahan")
  const cleanSubdistrict = subdistrict
    .replace(/^Kecamatan\s+/i, "")
    .replace(/^Kec\.\s+/i, "")
    .replace(/^Kelurahan\s+/i, "")
    .replace(/^Kel\.\s+/i, "");

  const cleanCity = city
    .replace(/^Kota Administrasi\s+/i, "")
    .replace(/^Kota\s+/i, "")
    .replace(/^Kabupaten\s+/i, "")
    .replace(/^Kab\.\s+/i, "");

  return {
    streetNumber,
    route,
    subdistrict: cleanSubdistrict || subdistrict,
    district: district || cleanSubdistrict || subdistrict,
    city: cleanCity || city || "Jakarta",
    province: province || "DKI Jakarta",
    postalCode,
    country: country || "Indonesia",
  };
}

/**
 * Resolves Google Maps location coordinates or subdistrict against Biteship Area IDs.
 */
export async function matchBiteshipArea(
  subdistrict: string,
  postalCode?: string,
  city?: string
): Promise<BiteshipArea | null> {
  const query = (subdistrict || postalCode || city || "").trim();
  if (!query) return null;

  try {
    const res = await fetch(`/api/shipping/areas?query=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.areas) && data.areas.length > 0) {
      // If postal code is present, prefer exact postal code match
      if (postalCode) {
        const postalMatch = data.areas.find(
          (a: BiteshipArea) => String(a.postal_code) === String(postalCode)
        );
        if (postalMatch) return postalMatch;
      }
      return data.areas[0];
    }
  } catch (err) {
    console.warn("Could not match Biteship area for Google Maps location:", err);
  }
  return null;
}
