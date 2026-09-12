"use client";

import React from "react";
import { X, MapPin, Truck } from "lucide-react";
import { useLocationStore } from "../../lib/store/useLocationStore";
import { DeliveryLocation } from "../../lib/shipping/types";
import { GoogleMapPicker } from "./GoogleMapPicker";

export function GlobalLocationModal() {
  const {
    isLocationModalOpen,
    closeLocationModal,
    userLocation,
    setLocation,
  } = useLocationStore();

  if (!isLocationModalOpen) return null;

  const handleLocationSelect = (loc: DeliveryLocation) => {
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
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Type address to autocomplete or click and drag the pin on the map
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

        {/* Modal Body - Pure Map & Autocomplete */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <GoogleMapPicker
            initialLocation={userLocation}
            onLocationSelect={handleLocationSelect}
            onCancel={closeLocationModal}
          />
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Multi-courier via Biteship: JNE, J&T, SiCepat, AnterAja, Gojek, Grab</span>
          </div>
          <span>Origin Hub: Mangga Dua Mall Lt. 3 No. 36</span>
        </div>
      </div>
    </div>
  );
}
