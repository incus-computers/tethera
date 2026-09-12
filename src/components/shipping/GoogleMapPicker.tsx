"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Search,
  Navigation,
  Check,
  Building2,
  Clock,
  CheckCircle2,
  Truck,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  LocateFixed,
  Compass,
  Store,
  ExternalLink,
} from "lucide-react";
import {
  loadGoogleMaps,
  isGoogleMapsLoaded,
  getGoogleMapsApiKey,
  parseGoogleAddressComponents,
  matchBiteshipArea,
} from "../../lib/maps/googleMapsLoader";
import { FLAGSHIP_ORIGIN, calculateHaversineDistanceKm } from "../../lib/shipping/distance";
import { DeliveryLocation, BiteshipArea } from "../../lib/shipping/types";

interface GoogleMapPickerProps {
  initialLocation?: DeliveryLocation | null;
  onLocationSelect: (location: DeliveryLocation) => void;
  onCancel?: () => void;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  source?: string;
  areaId?: string;
}

export function GoogleMapPicker({
  initialLocation,
  onLocationSelect,
  onCancel,
}: GoogleMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerInstanceRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  // Active view mode: "search" | "map"
  const [viewMode, setViewMode] = useState<"search" | "map">("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [googleMapsStatus, setGoogleMapsStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Current selected pin position and resolved location
  const [pinPosition, setPinPosition] = useState<{ lat: number; lng: number }>({
    lat: initialLocation?.latitude || -6.2272,
    lng: initialLocation?.longitude || 106.8086,
  });

  const [currentAddress, setCurrentAddress] = useState<string>(
    initialLocation?.address || "Sudirman Central Business District (SCBD)"
  );
  const [currentSubdistrict, setCurrentSubdistrict] = useState<string>(
    initialLocation?.subdistrict || "Senayan"
  );
  const [currentCity, setCurrentCity] = useState<string>(
    initialLocation?.city || "Jakarta Selatan"
  );
  const [currentPostalCode, setCurrentPostalCode] = useState<string>(
    initialLocation?.postalCode || "12190"
  );
  const [currentAreaId, setCurrentAreaId] = useState<string | undefined>(
    initialLocation?.areaId
  );
  const [distanceKm, setDistanceKm] = useState<number>(
    initialLocation?.distanceKm || 12.4
  );

  // =========================================================================
  // 1. INITIALIZE GOOGLE MAPS JAVASCRIPT API
  // =========================================================================
  useEffect(() => {
    let isMounted = true;
    const apiKey = getGoogleMapsApiKey();

    if (!apiKey || apiKey.includes("your_google_maps_api_key")) {
      setGoogleMapsStatus("fallback");
      setStatusMessage("Google Maps API key not configured. Fallback interactive coordinate picker enabled.");
      return;
    }

    setGoogleMapsStatus("loading");

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted) return;
        setGoogleMapsStatus("ready");

        geocoderRef.current = new maps.Geocoder();
        if (maps.places) {
          autocompleteServiceRef.current = new maps.places.AutocompleteService();
        }

        // Initialize Map instance once DOM container is available
        if (mapContainerRef.current && !mapInstanceRef.current) {
          const map = new maps.Map(mapContainerRef.current, {
            center: pinPosition,
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          });

          const marker = new maps.Marker({
            position: pinPosition,
            map,
            draggable: true,
            animation: maps.Animation.DROP,
            title: "Drag to set delivery location",
          });

          // Listener: Click on Map moves pin
          map.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            marker.setPosition(e.latLng);
            setPinPosition({ lat: newLat, lng: newLng });
            handleReverseGeocode(newLat, newLng);
          });

          // Listener: Drag Marker moves pin
          marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            setPinPosition({ lat: newLat, lng: newLng });
            handleReverseGeocode(newLat, newLng);
          });

          mapInstanceRef.current = map;
          markerInstanceRef.current = marker;
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Could not load Google Maps JS API:", err);
        setGoogleMapsStatus("fallback");
        setStatusMessage("Could not connect to Google Maps JS API. Using interactive coordinate engine.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Re-center map if pinPosition changes from search or external action
  const updateMapMarker = useCallback((lat: number, lng: number) => {
    setPinPosition({ lat, lng });
    if (mapInstanceRef.current && markerInstanceRef.current && window.google?.maps) {
      const latLng = new window.google.maps.LatLng(lat, lng);
      markerInstanceRef.current.setPosition(latLng);
      mapInstanceRef.current.panTo(latLng);
    }
  }, []);

  // =========================================================================
  // 2. REVERSE GEOCODING (Coordinates -> Address & Subdistrict)
  // =========================================================================
  const handleReverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);

    const dist = calculateHaversineDistanceKm(
      FLAGSHIP_ORIGIN.latitude!,
      FLAGSHIP_ORIGIN.longitude!,
      lat,
      lng
    );
    setDistanceKm(dist);

    // Try Google Maps Geocoder if loaded
    if (geocoderRef.current && window.google?.maps) {
      try {
        const response = await geocoderRef.current.geocode({
          location: { lat, lng },
        });

        if (response.results && response.results.length > 0) {
          const firstResult = response.results[0];
          const components = parseGoogleAddressComponents(firstResult.address_components);

          const formatted = firstResult.formatted_address;
          setCurrentAddress(formatted);
          setCurrentSubdistrict(components.subdistrict || components.district || "Jakarta");
          setCurrentCity(components.city || "Jakarta");
          setCurrentPostalCode(components.postalCode);

          // Resolve Biteship Area ID
          const area = await matchBiteshipArea(
            components.subdistrict,
            components.postalCode,
            components.city
          );
          if (area) {
            setCurrentAreaId(area.id);
          }

          setIsGeocoding(false);
          return;
        }
      } catch (geocodeErr) {
        console.warn("Client Google geocode error, attempting server fallback:", geocodeErr);
      }
    }

    // Server-side Geocode route fallback
    try {
      const res = await fetch(`/api/shipping/google/geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.location) {
          setCurrentAddress(data.location.address);
          setCurrentSubdistrict(data.location.subdistrict || "Jakarta");
          setCurrentCity(data.location.city || "Jakarta");
          setCurrentPostalCode(data.location.postalCode || "");
          setCurrentAreaId(data.location.areaId);
          setDistanceKm(data.location.distanceKm || dist);
        }
      }
    } catch (apiErr) {
      console.warn("Server geocode fallback error:", apiErr);
      setCurrentAddress(`Location Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setIsGeocoding(false);
    }
  };

  // =========================================================================
  // 3. GOOGLE PLACES AUTOCOMPLETE SEARCH
  // =========================================================================
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      // 1. Try native Google Places Autocomplete Service if available in browser
      if (autocompleteServiceRef.current && window.google?.maps?.places) {
        try {
          autocompleteServiceRef.current.getPlacePredictions(
            {
              input: searchQuery.trim(),
              componentRestrictions: { country: "id" },
            },
            (results, status) => {
              if (
                status === window.google.maps.places.PlacesServiceStatus.OK &&
                results &&
                results.length > 0
              ) {
                const mapped: PlacePrediction[] = results.map((r) => ({
                  place_id: r.place_id,
                  description: r.description,
                  main_text: r.structured_formatting?.main_text || r.description,
                  secondary_text: r.structured_formatting?.secondary_text || "",
                  source: "google_js",
                }));
                setPredictions(mapped);
                setIsSearching(false);
                return;
              }
              // Fallback to server endpoint if no predictions
              fetchServerPredictions(searchQuery.trim());
            }
          );
          return;
        } catch (jsErr) {
          console.warn("Google JS autocomplete service failed, using API endpoint:", jsErr);
        }
      }

      // 2. Fetch from Next.js server proxy endpoint
      await fetchServerPredictions(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchServerPredictions = async (query: string) => {
    try {
      const res = await fetch(`/api/shipping/google/autocomplete?input=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.predictions)) {
          setPredictions(data.predictions);
        }
      }
    } catch (err) {
      console.warn("Error fetching autocomplete predictions:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // =========================================================================
  // 4. SELECTING A PLACE PREDICTION
  // =========================================================================
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setIsGeocoding(true);
    setSearchQuery(prediction.main_text);
    setPredictions([]);

    try {
      const res = await fetch(
        `/api/shipping/google/geocode?place_id=${encodeURIComponent(prediction.place_id)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.location) {
          const loc: DeliveryLocation = data.location;
          setCurrentAddress(loc.address);
          setCurrentSubdistrict(loc.subdistrict || "Jakarta");
          setCurrentCity(loc.city || "Jakarta");
          setCurrentPostalCode(loc.postalCode || "");
          setCurrentAreaId(loc.areaId);
          setDistanceKm(loc.distanceKm || 12);

          if (loc.latitude && loc.longitude) {
            updateMapMarker(loc.latitude, loc.longitude);
          }
          // Switch to map view to show pin context
          setViewMode("map");
        }
      }
    } catch (err) {
      console.error("Failed to retrieve place coordinates:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // =========================================================================
  // 5. USE CURRENT DEVICE GPS LOCATION
  // =========================================================================
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateMapMarker(latitude, longitude);
        handleReverseGeocode(latitude, longitude);
        setIsLocating(false);
        setViewMode("map");
      },
      (error) => {
        setIsLocating(false);
        alert("Unable to access current GPS position. Please click on the map to pick your location.");
      },
      { timeout: 8000 }
    );
  };

  // =========================================================================
  // 6. CENTER ON TETHERA FLAGSHIP HUB
  // =========================================================================
  const handleCenterOnFlagshipStore = () => {
    updateMapMarker(FLAGSHIP_ORIGIN.latitude!, FLAGSHIP_ORIGIN.longitude!);
    handleReverseGeocode(FLAGSHIP_ORIGIN.latitude!, FLAGSHIP_ORIGIN.longitude!);
    setViewMode("map");
  };

  // =========================================================================
  // 7. INTERACTIVE CANVAS CLICK (Fallback Mode)
  // =========================================================================
  const handleFallbackMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 to 1
    const y = (e.clientY - rect.top) / rect.height; // 0 to 1

    // Interpolate across Greater Jakarta bounds
    // North: -6.08, South: -6.38, West: 106.68, East: 106.98
    const lat = -6.08 - y * (6.38 - 6.08);
    const lng = 106.68 + x * (106.98 - 106.68);

    updateMapMarker(lat, lng);
    handleReverseGeocode(lat, lng);
  };

  // =========================================================================
  // 8. CONFIRM FINAL LOCATION
  // =========================================================================
  const handleConfirmLocation = () => {
    const finalLocation: DeliveryLocation = {
      address: currentAddress,
      areaId: currentAreaId,
      subdistrict: currentSubdistrict,
      district: currentSubdistrict,
      city: currentCity,
      postalCode: currentPostalCode,
      latitude: pinPosition.lat,
      longitude: pinPosition.lng,
      distanceKm,
    };

    onLocationSelect(finalLocation);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Mode Switcher & GPS Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === "map"
                ? "bg-white text-zinc-900 shadow-2xs"
                : "text-slate-600 hover:text-zinc-900"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>Pick on Map</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("search")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === "search"
                ? "bg-white text-zinc-900 shadow-2xs"
                : "text-slate-600 hover:text-zinc-900"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>Search Places</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
            title="Pinpoint your current device position"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`} />
            <span>{isLocating ? "Locating..." : "My GPS"}</span>
          </button>

          <button
            type="button"
            onClick={handleCenterOnFlagshipStore}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-700 text-[11px] font-bold transition flex items-center gap-1"
            title="Reset location to Tethera Flagship Store at Mangga Dua Mall"
          >
            <Store className="w-3.5 h-3.5 text-zinc-600" />
            <span>Flagship Hub</span>
          </button>
        </div>
      </div>

      {/* SEARCH & AUTOCOMPLETE BAR */}
      <div className="relative space-y-1.5">
        <label className="block text-xs font-bold text-zinc-800">
          Google Maps Places Autocomplete:
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (predictions.length > 0) setViewMode("search");
            }}
            placeholder="Type address, landmark, building, or kecamatan (e.g. SCBD, Grand Indonesia, Senayan)..."
            className="w-full pl-10 pr-24 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all shadow-2xs"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            </div>
          )}
        </div>

        {/* Live Predictions Dropdown */}
        {predictions.length > 0 && (
          <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                onClick={() => handleSelectPrediction(p)}
                className="w-full p-2.5 rounded-lg hover:bg-blue-50 text-left transition flex items-start gap-2.5 group"
              >
                <div className="p-1.5 rounded-lg bg-blue-50 group-hover:bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-zinc-900 truncate">
                    {p.main_text}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {p.secondary_text || p.description}
                  </div>
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                  Select
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* INTERACTIVE MAP CANVAS CONTAINER */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner h-[280px] sm:h-[320px]">
        {/* Real Google Maps Container */}
        <div
          ref={mapContainerRef}
          className={`w-full h-full ${googleMapsStatus === "ready" ? "block" : "hidden"}`}
        />

        {/* Fallback Interactive Coordinate Canvas if Google Maps API key is pending */}
        {googleMapsStatus !== "ready" && (
          <div
            onClick={handleFallbackMapClick}
            className="w-full h-full relative cursor-crosshair bg-gradient-to-br from-slate-100 via-blue-50/50 to-slate-200 select-none overflow-hidden"
          >
            {/* Map Grid Patterns */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:28px_28px] opacity-70" />

            {/* Jakarta Outline / Hub Anchors */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-900/10 border border-blue-900/20 px-2 py-0.5 rounded text-[10px] text-blue-900 font-semibold pointer-events-none">
              <Store className="w-3 h-3 text-blue-700" />
              <span>Mangga Dua Flagship Hub</span>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-40">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                Greater Jakarta Region
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Click anywhere to drop delivery pin</div>
            </div>

            {/* Dynamic Dropped Pin */}
            <div
              className="absolute -translate-x-1/2 -translate-y-full transition-all duration-150 flex flex-col items-center pointer-events-none"
              style={{
                // Map approximate Jakarta bounds to canvas %
                top: `${Math.min(
                  90,
                  Math.max(10, ((-pinPosition.lat - 6.08) / (6.38 - 6.08)) * 100)
                )}%`,
                left: `${Math.min(
                  90,
                  Math.max(10, ((pinPosition.lng - 106.68) / (106.98 - 106.68)) * 100)
                )}%`,
              }}
            >
              <div className="px-2 py-0.5 bg-zinc-900 text-white rounded text-[10px] font-bold shadow-md whitespace-nowrap mb-1 flex items-center gap-1">
                <span>{currentSubdistrict || "Selected Point"}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                <MapPin className="w-4 h-4 fill-current" />
              </div>
              <div className="w-2.5 h-1 bg-black/30 rounded-full blur-[1px]" />
            </div>

            {/* Notification Badge */}
            <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/80 text-[10px] text-slate-600 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-1.5 truncate">
                <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Click map surface to pin exact delivery coordinates</span>
              </div>
              <span className="font-mono text-zinc-900 font-bold shrink-0">
                {pinPosition.lat.toFixed(4)}, {pinPosition.lng.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isGeocoding && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-2xs flex items-center justify-center z-20">
            <div className="px-4 py-2 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-zinc-800">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Reverse-geocoding coordinates...</span>
            </div>
          </div>
        )}
      </div>

      {/* SELECTED LOCATION DETAILS CARD */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-zinc-900 text-white shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-zinc-900 truncate">
                  {currentAddress}
                </span>
                {currentAreaId && (
                  <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                    Biteship Linked
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>Kecamatan: <strong>{currentSubdistrict}</strong></span>
                <span>•</span>
                <span>{currentCity}</span>
                {currentPostalCode && (
                  <>
                    <span>•</span>
                    <span>ZIP {currentPostalCode}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-black text-emerald-600">
              {distanceKm.toFixed(1)} km
            </div>
            <span className="text-[10px] text-slate-400 block">from Flagship Hub</span>
          </div>
        </div>

        {/* Distance & Courier Readiness Bar */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready for <strong>JNE, J&T, SiCepat, AnterAja, Gojek & Grab</strong> rates</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Lat: {pinPosition.lat.toFixed(4)}, Lng: {pinPosition.lng.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold text-xs transition"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={isGeocoding}
          onClick={handleConfirmLocation}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Confirm This Delivery Point</span>
        </button>
      </div>
    </div>
  );
}
