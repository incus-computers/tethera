import { NextRequest, NextResponse } from "next/server";
import { SEEDED_INDONESIA_AREAS } from "@/lib/shipping/biteship";
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

    // 1. If Google Maps API key is configured, call Google Places Autocomplete API
    if (GOOGLE_API_KEY && GOOGLE_API_KEY !== "your_google_maps_api_key_here") {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&components=country:id&language=id&key=${encodeURIComponent(GOOGLE_API_KEY)}`;

        const res = await fetch(googleUrl, { next: { revalidate: 60 } });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "OK" || data.status === "ZERO_RESULTS") {
            const predictions = (data.predictions || []).map((p: any) => ({
              place_id: p.place_id,
              description: p.description,
              main_text: p.structured_formatting?.main_text || p.description,
              secondary_text: p.structured_formatting?.secondary_text || "",
              types: p.types || [],
              source: "google",
            }));

            return NextResponse.json({
              success: true,
              source: "google",
              predictions,
            });
          }
        }
      } catch (googleErr) {
        console.warn("[GOOGLE PLACES AUTOCOMPLETE ERROR] Falling back to local catalog:", googleErr);
      }
    }

    // 2. Fallback catalog matching for Greater Jakarta & Indonesian subdistricts (offline / no API key)
    const lowerInput = input.toLowerCase();
    const fallbackMatches = SEEDED_INDONESIA_AREAS.filter(
      (a: BiteshipArea) =>
        a.name.toLowerCase().includes(lowerInput) ||
        a.administrative_division_level_3_name.toLowerCase().includes(lowerInput) ||
        a.administrative_division_level_2_name.toLowerCase().includes(lowerInput) ||
        String(a.postal_code).includes(lowerInput)
    ).slice(0, 8);

    const predictions = fallbackMatches.map((a: BiteshipArea) => ({
      place_id: `biteship_${a.id}`,
      description: `${a.administrative_division_level_3_name}, ${a.administrative_division_level_2_name}, ${a.administrative_division_level_1_name} ${a.postal_code}`,
      main_text: `${a.administrative_division_level_3_name}, ${a.administrative_division_level_2_name}`,
      secondary_text: `${a.administrative_division_level_1_name} • ZIP ${a.postal_code}`,
      types: ["sublocality", "political"],
      source: "fallback",
      areaId: a.id,
      subdistrict: a.administrative_division_level_3_name,
      city: a.administrative_division_level_2_name,
      province: a.administrative_division_level_1_name,
      postalCode: String(a.postal_code),
    }));

    return NextResponse.json({
      success: true,
      source: "fallback",
      isLiveGoogleConfigured: !!(GOOGLE_API_KEY && GOOGLE_API_KEY !== "your_google_maps_api_key_here"),
      predictions,
    });
  } catch (err: any) {
    console.error("Autocomplete API handler error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process autocomplete" },
      { status: 500 }
    );
  }
}
