import { NextRequest, NextResponse } from "next/server";
import { FLAGSHIP_ORIGIN, calculateHaversineDistanceKm, POPULAR_LOCATIONS } from "@/lib/shipping/distance";
import { biteship, SEEDED_INDONESIA_AREAS } from "@/lib/shipping/biteship";
import { DeliveryLocation, BiteshipArea } from "@/lib/shipping/types";

export const dynamic = "force-dynamic";

const GOOGLE_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const placeId = searchParams.get("place_id");

    let latitude = latParam ? parseFloat(latParam) : undefined;
    let longitude = lngParam ? parseFloat(lngParam) : undefined;
    let formattedAddress = "";
    let subdistrict = "";
    let district = "";
    let city = "Jakarta";
    let province = "DKI Jakarta";
    let postalCode = "";

    // Case 1: Biteship synthetic fallback place_id
    if (placeId && placeId.startsWith("biteship_")) {
      const areaId = placeId.replace("biteship_", "");
      const match = SEEDED_INDONESIA_AREAS.find((a: BiteshipArea) => a.id === areaId);
      if (match) {
        // Approximate coordinates from popular locations or default
        const preset = POPULAR_LOCATIONS.find((l) => l.areaId === areaId);
        latitude = preset?.latitude || -6.2088;
        longitude = preset?.longitude || 106.8456;
        const dist = calculateHaversineDistanceKm(
          FLAGSHIP_ORIGIN.latitude!,
          FLAGSHIP_ORIGIN.longitude!,
          latitude,
          longitude
        );

        const loc: DeliveryLocation = {
          address: `${match.administrative_division_level_3_name}, ${match.administrative_division_level_2_name}`,
          areaId: match.id,
          subdistrict: match.administrative_division_level_3_name,
          district: match.administrative_division_level_3_name,
          city: match.administrative_division_level_2_name,
          province: match.administrative_division_level_1_name,
          postalCode: String(match.postal_code),
          latitude,
          longitude,
          distanceKm: dist,
        };

        return NextResponse.json({ success: true, location: loc });
      }
    }

    // Case 2: Google Maps API integration (Place Details or Reverse Geocode)
    const hasGoogleKey = GOOGLE_API_KEY && GOOGLE_API_KEY !== "your_google_maps_api_key_here";

    if (hasGoogleKey) {
      try {
        let apiUrl = "";
        if (placeId) {
          apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
            placeId
          )}&language=id&key=${encodeURIComponent(GOOGLE_API_KEY)}`;
        } else if (latitude !== undefined && longitude !== undefined) {
          apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=id&key=${encodeURIComponent(
            GOOGLE_API_KEY
          )}`;
        }

        if (apiUrl) {
          const res = await fetch(apiUrl);
          if (res.ok) {
            const data = await res.json();
            const result = placeId ? data.result : data.results?.[0];

            if (result) {
              formattedAddress = result.formatted_address || result.name || "";
              if (result.geometry?.location) {
                latitude = result.geometry.location.lat;
                longitude = result.geometry.location.lng;
              }

              const components = result.address_components || [];
              for (const comp of components) {
                const types: string[] = comp.types || [];
                if (
                  types.includes("administrative_area_level_3") ||
                  types.includes("sublocality_level_1") ||
                  types.includes("sublocality")
                ) {
                  subdistrict = comp.long_name;
                  district = comp.long_name;
                } else if (types.includes("administrative_area_level_2")) {
                  city = comp.long_name;
                } else if (types.includes("administrative_area_level_1")) {
                  province = comp.long_name;
                } else if (types.includes("postal_code")) {
                  postalCode = comp.long_name;
                }
              }
            }
          }
        }
      } catch (gErr) {
        console.warn("[GOOGLE GEOCODE ERROR]:", gErr);
      }
    }

    // Fallback if reverse geocode yielded no details
    if (!formattedAddress) {
      if (latitude !== undefined && longitude !== undefined) {
        formattedAddress = `Location Point (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        subdistrict = "Jakarta";
      } else {
        formattedAddress = "Jakarta, Indonesia";
      }
    }

    // Clean subdistrict / city Indonesian prefixes
    const cleanSubdistrict = subdistrict
      .replace(/^Kecamatan\s+/i, "")
      .replace(/^Kec\.\s+/i, "")
      .replace(/^Kelurahan\s+/i, "")
      .replace(/^Kel\.\s+/i, "");

    const cleanCity = city
      .replace(/^Kota Administrasi\s+/i, "")
      .replace(/^Kota\s+/i, "")
      .replace(/^Kabupaten\s+/i, "");

    // Resolve Biteship Area ID for courier rating compatibility
    let matchedArea: BiteshipArea | null = null;
    const query = cleanSubdistrict || postalCode || cleanCity;
    if (query) {
      const areas = await biteship.searchAreas(query);
      if (areas.length > 0) {
        matchedArea = postalCode ? areas.find((a) => String(a.postal_code) === postalCode) || areas[0] : areas[0];
      }
    }

    const dist =
      latitude !== undefined && longitude !== undefined
        ? calculateHaversineDistanceKm(
            FLAGSHIP_ORIGIN.latitude!,
            FLAGSHIP_ORIGIN.longitude!,
            latitude,
            longitude
          )
        : 12;

    const finalLocation: DeliveryLocation = {
      address: formattedAddress,
      areaId: matchedArea ? matchedArea.id : undefined,
      subdistrict: cleanSubdistrict || (matchedArea ? matchedArea.administrative_division_level_3_name : undefined),
      district: district || cleanSubdistrict,
      city: cleanCity || (matchedArea ? matchedArea.administrative_division_level_2_name : "Jakarta"),
      province: province || (matchedArea ? matchedArea.administrative_division_level_1_name : "DKI Jakarta"),
      postalCode: postalCode || (matchedArea ? String(matchedArea.postal_code) : undefined),
      latitude,
      longitude,
      distanceKm: dist,
    };

    return NextResponse.json({
      success: true,
      location: finalLocation,
    });
  } catch (err: any) {
    console.error("Geocoding API handler error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to geocode location" },
      { status: 500 }
    );
  }
}
