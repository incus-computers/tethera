import { NextRequest, NextResponse } from "next/server";
import { biteship, SEED_AREAS } from "@/lib/shipping/biteship";
import { BiteshipArea } from "@/lib/shipping/types";

export const dynamic = "force-dynamic";

const GOOGLE_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const input = (searchParams.get("input") || searchParams.get("query") || "").trim();

    if (!input || input.length < 2) {
      return NextResponse.json({ success: true, predictions: [] });
    }

    const predictions: Array<{
      place_id: string;
      description: string;
      main_text: string;
      secondary_text: string;
      types?: string[];
      source: string;
      lat?: number;
      lng?: number;
      subdistrict?: string;
      city?: string;
      postalCode?: string;
      areaId?: string;
    }> = [];

    // 1. If Google Maps API key is configured, query Google Places Autocomplete
    if (GOOGLE_API_KEY && GOOGLE_API_KEY !== "your_google_maps_api_key_here") {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&components=country:id&language=id&key=${encodeURIComponent(GOOGLE_API_KEY)}`;

        const res = await fetch(googleUrl, { next: { revalidate: 60 } });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "OK" && Array.isArray(data.predictions) && data.predictions.length > 0) {
            data.predictions.forEach((p: any) => {
              predictions.push({
                place_id: p.place_id,
                description: p.description,
                main_text: p.structured_formatting?.main_text || p.description,
                secondary_text: p.structured_formatting?.secondary_text || "",
                types: p.types || [],
                source: "google",
              });
            });

            return NextResponse.json({
              success: true,
              source: "google",
              predictions,
            });
          }
        }
      } catch (googleErr) {
        console.warn("[GOOGLE PLACES AUTOCOMPLETE ERROR] Falling back to live geocoders:", googleErr);
      }
    }

    // 2. OpenStreetMap / Photon Indonesian Places Search (High-speed, live geocoding for streets, landmarks, malls)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        input
      )}&lat=-6.2088&lon=106.8456&limit=6`;
      const photonRes = await fetch(photonUrl, {
        headers: { "User-Agent": "Tethera-Ecommerce/1.0" },
        next: { revalidate: 120 },
      });

      if (photonRes.ok) {
        const photonData = await photonRes.json();
        if (Array.isArray(photonData.features)) {
          photonData.features.forEach((feat: any, idx: number) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [];
            const lng = coords[0];
            const lat = coords[1];

            const name = props.name || props.street || input;
            const sub = props.district || props.suburb || props.locality || "";
            const city = props.city || props.county || "Jakarta";
            const state = props.state || "DKI Jakarta";
            const postcode = props.postcode ? ` • ${props.postcode}` : "";

            const secondary = [props.street, sub, city, state].filter(Boolean).join(", ") + postcode;

            predictions.push({
              place_id: `osm_${lat}_${lng}_${idx}`,
              description: `${name}, ${secondary}`,
              main_text: name,
              secondary_text: secondary,
              source: "osm",
              lat,
              lng,
              subdistrict: sub || undefined,
              city,
              postalCode: props.postcode || undefined,
            });
          });
        }
      }
    } catch (osmErr) {
      console.warn("Photon geocoder search error:", osmErr);
    }

    // 3. Query Biteship Maps API for subdistricts
    try {
      const biteshipAreas = await biteship.searchAreas(input);
      biteshipAreas.slice(0, 5).forEach((a) => {
        // Avoid duplicate descriptions
        if (!predictions.some((p) => p.main_text.toLowerCase().includes(a.administrative_division_level_3_name.toLowerCase()))) {
          predictions.push({
            place_id: `biteship_${a.id}`,
            description: `${a.administrative_division_level_3_name}, ${a.administrative_division_level_2_name}, ${a.administrative_division_level_1_name} ${a.postal_code}`,
            main_text: `${a.administrative_division_level_3_name}, ${a.administrative_division_level_2_name}`,
            secondary_text: `${a.administrative_division_level_1_name} • Kodepos ${a.postal_code}`,
            source: "biteship",
            areaId: a.id,
            subdistrict: a.administrative_division_level_3_name,
            city: a.administrative_division_level_2_name,
            postalCode: String(a.postal_code),
          });
        }
      });
    } catch (bErr) {
      console.warn("Biteship areas query error:", bErr);
    }

    // 4. Also check local seed database
    const lowerInput = input.toLowerCase();
    const fallbackMatches = SEED_AREAS.filter(
      (a: BiteshipArea) =>
        a.name.toLowerCase().includes(lowerInput) ||
        a.administrative_division_level_3_name.toLowerCase().includes(lowerInput) ||
        a.administrative_division_level_2_name.toLowerCase().includes(lowerInput) ||
        String(a.postal_code).includes(lowerInput)
    );

    fallbackMatches.forEach((a) => {
      if (!predictions.some((p) => p.place_id === `biteship_${a.id}`)) {
        predictions.push({
          place_id: `biteship_${a.id}`,
          description: `${a.administrative_division_level_3_name}, ${a.administrative_division_level_2_name}, ${a.administrative_division_level_1_name} ${a.postal_code}`,
          main_text: `${a.administrative_division_level_3_name}, ${a.administrative_division_level_2_name}`,
          secondary_text: `${a.administrative_division_level_1_name} • Kodepos ${a.postal_code}`,
          source: "seed",
          areaId: a.id,
          subdistrict: a.administrative_division_level_3_name,
          city: a.administrative_division_level_2_name,
          postalCode: String(a.postal_code),
        });
      }
    });

    return NextResponse.json({
      success: true,
      source: predictions.some((p) => p.source === "google") ? "google" : "hybrid",
      predictions: predictions.slice(0, 10),
    });
  } catch (err: any) {
    console.error("Autocomplete API handler error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process autocomplete" },
      { status: 500 }
    );
  }
}
