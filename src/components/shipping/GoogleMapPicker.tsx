"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Search,
  CheckCircle2,
  Truck,
  Loader2,
  LocateFixed,
  Store,
  Compass,
} from "lucide-react";
import { FLAGSHIP_ORIGIN, calculateHaversineDistanceKm } from "../../lib/shipping/distance";
import { DeliveryLocation } from "../../lib/shipping/types";

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
  lat?: number;
  lng?: number;
  subdistrict?: string;
  city?: string;
  postalCode?: string;
  areaId?: string;
}

export function GoogleMapPicker({
  initialLocation,
  onLocationSelect,
  onCancel,
}: GoogleMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Current selected pin position
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
  // 1. REVERSE GEOCODE COORDINATES
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
    } catch (err) {
      console.warn("Reverse geocode request error:", err);
      setCurrentAddress(`Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setIsGeocoding(false);
    }
  };

  // =========================================================================
  // 2. INITIALIZE INTERACTIVE MAP (Google Roadmap Tiles via Leaflet)
  // =========================================================================
  useEffect(() => {
    let isMounted = true;

    // Dynamically import Leaflet on client
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous instance if any
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Initialize map centered at pinPosition
      const map = L.map(mapContainerRef.current, {
        center: [pinPosition.lat, pinPosition.lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      // Add Google Roadmap Tiles (with OpenStreetMap fallback)
      const googleTileLayer = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          maxZoom: 20,
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }
      );

      // In case Google tiles are blocked by adblockers, fallback to OpenStreetMap
      googleTileLayer.on("tileerror", () => {
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);
      });

      googleTileLayer.addTo(map);

      // Custom sleek Red Google Maps style pin icon
      const customPinIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: grab;">
            <div style="background-color: #EF4444; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); border: 2.5px solid white;">
              <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%; transform: rotate(45deg);"></div>
            </div>
            <div style="width: 14px; height: 4px; background-color: rgba(0,0,0,0.25); border-radius: 50%; margin-top: 2px; filter: blur(1px);"></div>
          </div>
        `,
        iconSize: [34, 40],
        iconAnchor: [17, 40],
      });

      // Draggable marker on map
      const marker = L.marker([pinPosition.lat, pinPosition.lng], {
        icon: customPinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      // Listener: Drag Marker moves pin & triggers reverse geocode
      marker.on("dragend", () => {
        const latLng = marker.getLatLng();
        setPinPosition({ lat: latLng.lat, lng: latLng.lng });
        handleReverseGeocode(latLng.lat, latLng.lng);
      });

      // Listener: Click on Map moves marker & triggers reverse geocode
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        setPinPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        handleReverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      leafletMapRef.current = map;
      leafletMarkerRef.current = marker;
      setIsMapLoaded(true);

      // Invalidate size once container settles
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 250);
    });

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update map and marker when coordinates change programmatically
  const updateMapMarker = useCallback((lat: number, lng: number) => {
    setPinPosition({ lat, lng });
    if (leafletMapRef.current && leafletMarkerRef.current) {
      leafletMarkerRef.current.setLatLng([lat, lng]);
      leafletMapRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
    }
  }, []);

  // =========================================================================
  // 3. AUTOCOMPLETE SEARCH
  // =========================================================================
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/shipping/google/autocomplete?input=${encodeURIComponent(searchQuery.trim())}`
        );
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
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // =========================================================================
  // 4. SELECTING AN AUTOCOMPLETE PREDICTION
  // =========================================================================
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setSearchQuery(prediction.main_text);
    setPredictions([]);

    // If prediction already has coordinates (from Photon / OSM / Biteship)
    if (prediction.lat !== undefined && prediction.lng !== undefined) {
      updateMapMarker(prediction.lat, prediction.lng);
      handleReverseGeocode(prediction.lat, prediction.lng);
      return;
    }

    // Geocode place_id via API
    setIsGeocoding(true);
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
        }
      }
    } catch (err) {
      console.error("Failed to geocode prediction:", err);
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
      },
      (error) => {
        setIsLocating(false);
        alert("Unable to access device GPS position. Please click or drag the pin on the map.");
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
  };

  // =========================================================================
  // 7. CONFIRM LOCATION
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
      {/* SEARCH BAR WITH LIVE AUTOCOMPLETE */}
      <div className="relative space-y-1.5">
        <label className="block text-xs font-bold text-zinc-800">
          Search Location or Sub-district:
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type landmark, mall, street, or kecamatan (e.g. SCBD, Grand Indonesia, Senayan, Kelapa Gading)..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all shadow-2xs"
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

      {/* INTERACTIVE REAL MAP CANVAS */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-200 shadow-inner h-[320px] sm:h-[360px]">
        {/* Leaflet Google Roadmap Canvas */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Map Action Buttons */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="p-2.5 rounded-xl bg-white/95 hover:bg-white text-zinc-800 shadow-md border border-slate-200/80 transition flex items-center gap-1.5 text-xs font-bold tactile-btn active:scale-95"
            title="Locate my device position"
          >
            <LocateFixed className={`w-4 h-4 text-emerald-600 ${isLocating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isLocating ? "Locating..." : "My GPS"}</span>
          </button>

          <button
            type="button"
            onClick={handleCenterOnFlagshipStore}
            className="p-2.5 rounded-xl bg-white/95 hover:bg-white text-zinc-800 shadow-md border border-slate-200/80 transition flex items-center gap-1.5 text-xs font-bold tactile-btn active:scale-95"
            title="Center on Mangga Dua Mall Flagship Hub"
          >
            <Store className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Flagship Hub</span>
          </button>
        </div>

        {/* Map Drag / Click Guidance Banner */}
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
          <div className="p-2 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200/80 shadow-md text-[11px] text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Click map or drag red pin to set exact doorstep location</span>
            </div>
            <span className="font-mono text-zinc-900 font-bold text-[10px] shrink-0 ml-2">
              {pinPosition.lat.toFixed(4)}, {pinPosition.lng.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Geocoding Loading Indicator */}
        {isGeocoding && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-2xs flex items-center justify-center z-30">
            <div className="px-4 py-2 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-zinc-800">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Pinpoint geocoding address...</span>
            </div>
          </div>
        )}
      </div>

      {/* SELECTED LOCATION DETAILS CARD */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-zinc-900 text-white shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-zinc-900 truncate">
                  {currentAddress}
                </span>
                {currentAreaId && (
                  <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                    Biteship Connected
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
                    <span>Kodepos {currentPostalCode}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-black text-emerald-600">
              {distanceKm.toFixed(1)} km
            </div>
            <span className="text-[10px] text-slate-400 block">from Mangga Dua Hub</span>
          </div>
        </div>

        {/* Courier Support Indicator */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Multi-courier rates: <strong>JNE, J&T, SiCepat, AnterAja, Gojek, Grab</strong></span>
          </div>
        </div>
      </div>

      {/* MODAL ACTIONS */}
      <div className="flex items-center justify-end gap-2.5 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold text-xs transition"
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
          <span>Confirm Delivery Location</span>
        </button>
      </div>
    </div>
  );
}
