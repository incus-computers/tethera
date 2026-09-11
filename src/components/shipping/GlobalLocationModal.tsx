"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useLocationStore } from "../../lib/store/useLocationStore";
import { POPULAR_LOCATIONS, FLAGSHIP_ORIGIN, calculateHaversineDistanceKm } from "../../lib/shipping/distance";
import { DeliveryLocation } from "../../lib/shipping/types";

export function GlobalLocationModal() {
  const {
    isLocationModalOpen,
    closeLocationModal,
    userLocation,
    setLocation,
    recentLocations,
  } = useLocationStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  if (!isLocationModalOpen) return null;

  const filteredPresets = POPULAR_LOCATIONS.filter(
    (loc) =>
      loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.subdistrict && loc.subdistrict.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (loc.city && loc.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectLocation = (loc: DeliveryLocation) => {
    setLocation(loc);
    closeLocationModal();
  };

  const handleCustomAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const customLoc: DeliveryLocation = {
      address: searchQuery.trim(),
      city: "Greater Jakarta",
    };
    setLocation(customLoc);
    closeLocationModal();
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distanceKm = calculateHaversineDistanceKm(
          FLAGSHIP_ORIGIN.latitude!,
          FLAGSHIP_ORIGIN.longitude!,
          latitude,
          longitude
        );

        const gpsLoc: DeliveryLocation = {
          address: `Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          city: "Jakarta Area",
          latitude,
          longitude,
          distanceKm,
        };

        setLocation(gpsLoc);
        setIsLocating(false);
        closeLocationModal();
      },
      (error) => {
        setIsLocating(false);
        setGeoError("Unable to access current GPS position. Please pick an area below.");
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-modal-pop">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-900 text-white">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900">Set Delivery Location</h3>
              <p className="text-[11px] text-slate-500">
                Calculates live on-demand rates for Gojek and Grab
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Address Search Form */}
          <form onSubmit={handleCustomAddressSubmit} className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter street, apartment, or district (e.g. SCBD, PIK, BSD)..."
                className="w-full pl-10 pr-24 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs tactile-btn active:scale-95"
              >
                Apply
              </button>
            </div>
          </form>

          {/* Quick GPS Location Action */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full p-3 rounded-xl border border-dashed border-slate-300 hover:border-zinc-900 hover:bg-slate-50 text-xs font-bold text-zinc-800 transition-all flex items-center justify-center gap-2 group tactile-btn active:scale-98"
          >
            <Navigation className={`w-4 h-4 text-emerald-600 ${isLocating ? "animate-spin" : "group-hover:translate-x-0.5 transition-transform"}`} />
            <span>{isLocating ? "Pinpointing GPS position..." : "Use My Current GPS Location"}</span>
          </button>

          {geoError && (
            <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              {geoError}
            </div>
          )}

          {/* Popular Greater Jakarta Delivery Hubs */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              Popular Greater Jakarta Delivery Zones
            </span>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {filteredPresets.map((loc) => {
                const isSelected = userLocation?.address === loc.address;
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
                    onClick={() => handleSelectLocation(loc)}
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
                          <span>{loc.city}</span>
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

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gojek & Grab Instant Coverage up to 40km</span>
          </div>
          <span>Origin: Mangga Dua Mall Lt. 3 No. 36</span>
        </div>
      </div>
    </div>
  );
}
