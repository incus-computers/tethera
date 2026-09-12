"use client";

import React, { useState, useEffect } from "react";
import {
  X,
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
  Compass,
} from "lucide-react";
import { useLocationStore } from "../../lib/store/useLocationStore";
import { POPULAR_LOCATIONS, FLAGSHIP_ORIGIN, calculateHaversineDistanceKm } from "../../lib/shipping/distance";
import { DeliveryLocation, BiteshipArea } from "../../lib/shipping/types";
import { GoogleMapPicker } from "./GoogleMapPicker";

export function GlobalLocationModal() {
  const {
    isLocationModalOpen,
    closeLocationModal,
    userLocation,
    setLocation,
  } = useLocationStore();

  const [activeTab, setActiveTab] = useState<"google_map" | "popular_hubs">("google_map");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingAreas, setIsSearchingAreas] = useState(false);
  const [biteshipAreas, setBiteshipAreas] = useState<BiteshipArea[]>([]);

  // Debounced sub-district mapping search through Biteship Maps API (for Hubs tab)
  useEffect(() => {
    if (activeTab !== "popular_hubs" || !searchQuery || searchQuery.trim().length < 2) {
      setBiteshipAreas([]);
      setIsSearchingAreas(false);
      return;
    }

    setIsSearchingAreas(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shipping/areas?query=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.areas)) {
            setBiteshipAreas(data.areas);
          }
        }
      } catch (err) {
        console.warn("Sub-district search error:", err);
      } finally {
        setIsSearchingAreas(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  if (!isLocationModalOpen) return null;

  const filteredPresets = POPULAR_LOCATIONS.filter(
    (loc) =>
      loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.subdistrict && loc.subdistrict.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (loc.city && loc.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectArea = (area: BiteshipArea) => {
    const newLocation: DeliveryLocation = {
      address: area.name,
      areaId: area.id,
      subdistrict: area.administrative_division_level_3_name,
      district: area.administrative_division_level_3_name,
      city: area.administrative_division_level_2_name,
      province: area.administrative_division_level_1_name,
      postalCode: String(area.postal_code),
      distanceKm: 12.5,
    };
    setLocation(newLocation);
    closeLocationModal();
  };

  const handleSelectPresetLocation = (loc: DeliveryLocation) => {
    setLocation(loc);
    closeLocationModal();
  };

  const handleGoogleMapLocationSelect = (loc: DeliveryLocation) => {
    setLocation(loc);
    closeLocationModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-modal-pop">
        {/* Modal Header */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-white shadow-xs">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-zinc-900">
                  Select Delivery Location
                </h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  Google Maps
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Biteship Rates
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Google Places Autocomplete, point-on-map picking & sub-district courier routing
              </p>
            </div>
          </div>
          <button
            onClick={closeLocationModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-zinc-800 hover:bg-slate-200 transition-colors tactile-btn active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="px-5 sm:px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("google_map")}
            className={`pb-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "google_map"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Compass className="w-4 h-4 text-blue-600" />
            <span>Google Maps & Pinpoint Picker</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("popular_hubs")}
            className={`pb-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "popular_hubs"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Building2 className="w-4 h-4 text-zinc-700" />
            <span>Popular Hubs & Presets</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {activeTab === "google_map" ? (
            /* TAB 1: GOOGLE MAPS & PINPOINT PICKER */
            <GoogleMapPicker
              initialLocation={userLocation}
              onLocationSelect={handleGoogleMapLocationSelect}
              onCancel={closeLocationModal}
            />
          ) : (
            /* TAB 2: POPULAR HUBS & SUB-DISTRICT LOOKUP */
            <div className="space-y-5">
              {/* Sub-district Search Form */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                  <span>Search Greater Jakarta Sub-district (Kecamatan / Kelurahan)</span>
                  {isSearchingAreas && (
                    <span className="text-[11px] text-blue-600 flex items-center gap-1 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> Querying catalog...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type sub-district (e.g. Pesanggrahan, Kelapa Gading, Senayan)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Biteship Sub-district Autocomplete Results */}
              {biteshipAreas.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Sub-District Catalog Matches
                    </span>
                    <span className="text-slate-400 font-normal">{biteshipAreas.length} found</span>
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 border border-blue-100 bg-blue-50/40 p-2 rounded-xl">
                    {biteshipAreas.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => handleSelectArea(area)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/60 text-left transition-all flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-900 truncate">
                            {area.administrative_division_level_3_name}, {area.administrative_division_level_2_name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {area.administrative_division_level_1_name} • Kodepos: <strong>{area.postal_code}</strong>
                          </div>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.5 rounded shrink-0">
                          {area.id.slice(0, 10)}...
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Greater Jakarta Delivery Hubs */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Popular Delivery Hubs (Greater Jakarta)
                </span>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {filteredPresets.map((loc) => {
                    const isSelected =
                      userLocation?.areaId === loc.areaId ||
                      userLocation?.address === loc.address ||
                      (userLocation?.subdistrict && userLocation?.subdistrict === loc.subdistrict);

                    const dist = calculateHaversineDistanceKm(
                      FLAGSHIP_ORIGIN.latitude!,
                      FLAGSHIP_ORIGIN.longitude!,
                      loc.latitude!,
                      loc.longitude!
                    );

                    return (
                      <button
                        key={loc.address}
                        type="button"
                        onClick={() => handleSelectPresetLocation(loc)}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 tactile-item ${
                          isSelected
                            ? "bg-slate-50 border-zinc-900 ring-1 ring-zinc-900 shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-100 text-zinc-700 shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-900 truncate">
                              {loc.address}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>Kec. {loc.subdistrict || loc.city}</span>
                              <span>•</span>
                              <span className="font-semibold text-emerald-600">{dist} km</span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Multi-courier via Biteship: JNE, J&T, SiCepat, AnterAja, Gojek, Grab</span>
          </div>
          <span>Dispatch Hub: Mangga Dua Mall Lt. 3 No. 36</span>
        </div>
      </div>
    </div>
  );
}
