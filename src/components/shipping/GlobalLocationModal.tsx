"use client";

import React from "react";
import { X, MapPin } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-modal-pop">
        {/* Modal Header */}
        <div className="bg-slate-50 dark:bg-zinc-950/80 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white shadow-xs">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white">
                Select Delivery Location
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Search or select your doorstep delivery address
              </p>
            </div>
          </div>
          <button
            onClick={closeLocationModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors tactile-btn active:scale-90"
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
      </div>
    </div>
  );
}
