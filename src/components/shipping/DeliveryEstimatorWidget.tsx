"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  MapPin,
  Truck,
  Zap,
  Clock,
  CheckCircle2,
  ChevronDown,
  Navigation,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Compass,
} from "lucide-react";
import { ShippingRateOption, ShippableItem } from "../../lib/shipping/types";
import { useLocationStore } from "../../lib/store/useLocationStore";
import { POPULAR_LOCATIONS, FLAGSHIP_ORIGIN } from "../../lib/shipping/distance";

interface DeliveryEstimatorWidgetProps {
  item?: ShippableItem;
  className?: string;
  compact?: boolean;
}

export function DeliveryEstimatorWidget({
  item,
  className = "",
  compact = false,
}: DeliveryEstimatorWidgetProps) {
  const {
    userLocation,
    selectedRate,
    setSelectedRate,
    openLocationModal,
  } = useLocationStore();

  const [rates, setRates] = useState<ShippingRateOption[]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourierFilter, setSelectedCourierFilter] = useState<
    "all" | "instant" | "regular" | "jne" | "jnt" | "sicepat" | "anteraja" | "gojek" | "grab"
  >("all");

  // Fetch estimated courier rates from API
  const fetchRates = async () => {
    if (!userLocation) return;
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        destination: userLocation,
        items: item ? [item] : undefined,
        totalWeightGrams: item ? item.weightGrams : 2000,
        totalPrice: item ? item.price : 100,
      };

      const res = await fetch("/api/shipping/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Unable to retrieve shipping quotes from courier service.");
      }

      const data = await res.json();
      if (data.success) {
        setRates(data.rates || []);
        setDistanceKm(data.distanceKm || 0);

        // Auto-select fastest/cheapest rate if none selected
        if (!selectedRate && data.rates.length > 0) {
          const firstAvailable = data.rates.find((r: ShippingRateOption) => r.isAvailable);
          if (firstAvailable) {
            setSelectedRate(firstAvailable);
          }
        }
      } else {
        setError(data.message || "Failed to calculate courier rates.");
      }
    } catch (err: any) {
      console.error("Delivery estimation error:", err);
      setError(err.message || "Network error while estimating delivery fee.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [userLocation?.address, userLocation?.latitude, userLocation?.areaId, item?.id]);

  const filteredRates = rates.filter((r) => {
    if (selectedCourierFilter === "all") return true;
    if (selectedCourierFilter === "instant") return r.courierId === "gojek" || r.courierId === "grab";
    if (selectedCourierFilter === "regular") {
      return ["jne", "jnt", "sicepat", "anteraja"].includes(r.courierId);
    }
    return r.courierId === selectedCourierFilter;
  });

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-4 ${className}`}
    >
      {/* Header: Destination & Distance indicator */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                Biteship Multi-Courier Dispatch
              </span>
              {userLocation?.subdistrict && (
                <span className="text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded">
                  Kecamatan Mapped
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
              <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">
                {userLocation ? (
                  userLocation.subdistrict
                    ? `${userLocation.subdistrict}, ${userLocation.city || userLocation.district || ""}`
                    : userLocation.address
                ) : (
                  "Set delivery location"
                )}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openLocationModal}
          className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold transition-all shrink-0 tactile-btn active:scale-95 shadow-2xs flex items-center gap-1.5"
          title="Open Google Maps point picker or search autocomplete"
        >
          <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Pick on Map</span>
        </button>
      </div>

      {/* Origin Notice & Distance Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          <span>Hub Origin: <strong>Mangga Dua Mall Lt. 3 No. 36</strong></span>
        </div>
        <div className="flex items-center gap-2">
          {userLocation?.postalCode && (
            <span className="font-mono text-[10px] bg-slate-200/70 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-1.5 py-0.5 rounded">
              ZIP {userLocation.postalCode}
            </span>
          )}
          {distanceKm > 0 && (
            <span className="font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700 shadow-2xs">
              {distanceKm} km
            </span>
          )}
        </div>
      </div>

      {/* Courier Brand Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
          Courier Partners
        </span>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCourierFilter("all")}
            className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all ${
              selectedCourierFilter === "all"
                ? "bg-zinc-900 dark:bg-zinc-800 text-white dark:text-white border border-transparent dark:border-zinc-700 shadow-2xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
            }`}
          >
            All ({rates.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourierFilter("instant")}
            className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all flex items-center gap-1 ${
              selectedCourierFilter === "instant"
                ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-2xs"
                : "bg-slate-100 dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Instant</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourierFilter("regular")}
            className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all flex items-center gap-1 ${
              selectedCourierFilter === "regular"
                ? "bg-blue-600 dark:bg-blue-500 text-white shadow-2xs"
                : "bg-slate-100 dark:bg-zinc-800 text-blue-800 dark:text-blue-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
            }`}
          >
            <Truck className="w-3 h-3" />
            <span>JNE / J&T / SiCepat / AnterAja</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-2 py-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 animate-pulse flex items-center justify-between"
            >
              <div className="space-y-2 flex-1">
                <div className="h-3.5 bg-slate-200 dark:bg-zinc-700 rounded w-1/3" />
                <div className="h-2.5 bg-slate-200 dark:bg-zinc-700 rounded w-1/2" />
              </div>
              <div className="h-4 bg-slate-200 dark:bg-zinc-700 rounded w-12" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error Display */
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchRates}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-800 dark:text-red-300"
            title="Retry calculation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400 dark:text-zinc-500">
          No couriers available for this location. Please try selecting a nearby district.
        </div>
      ) : (
        /* Rates Options List */
        <div className="space-y-2.5">
          {filteredRates.map((rate, idx) => {
            const isSelected =
              selectedRate?.courierId === rate.courierId &&
              selectedRate?.serviceCode === rate.serviceCode;

            return (
              <div
                key={`${rate.courierId}-${rate.serviceCode}`}
                onClick={() => rate.isAvailable && setSelectedRate(rate)}
                className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  !rate.isAvailable
                    ? "bg-slate-50/60 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                    : isSelected
                    ? "bg-slate-50 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-400 ring-1 ring-zinc-900 dark:ring-zinc-400 shadow-xs cursor-pointer"
                    : "bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-2xs cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Courier Brand Emblem */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-2xs ${
                      rate.courierId === "jne"
                        ? "bg-[#003399]"
                        : rate.courierId === "jnt"
                        ? "bg-[#ED1C24]"
                        : rate.courierId === "sicepat"
                        ? "bg-[#D31515]"
                        : rate.courierId === "anteraja"
                        ? "bg-[#E91E63]"
                        : rate.courierId === "gojek"
                        ? "bg-[#00AA13]"
                        : rate.courierId === "grab"
                        ? "bg-[#00B14F]"
                        : "bg-zinc-800"
                    }`}
                  >
                    {rate.courierId === "jne"
                      ? "JNE"
                      : rate.courierId === "jnt"
                      ? "J&T"
                      : rate.courierId === "sicepat"
                      ? "SCP"
                      : rate.courierId === "anteraja"
                      ? "ANR"
                      : rate.courierId === "gojek"
                      ? "GJ"
                      : rate.courierId === "grab"
                      ? "GB"
                      : "EXP"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                        {rate.serviceName}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          rate.courierBadge.includes("Recommended")
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-extrabold"
                            : rate.brandBg
                        }`}
                      >
                        {rate.courierBadge}
                      </span>
                      {rate.vehicleType === "car" && (
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded">
                          Car Transport
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                        <Clock className="w-3 h-3" />
                        <span>ETA: {rate.etd}</span>
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[240px] sm:max-w-xs">
                        {rate.serviceDescription}
                      </span>
                    </div>

                    {!rate.isAvailable && rate.ineligibilityReason && (
                      <div className="text-[10px] font-medium text-red-600 dark:text-red-400 mt-1">
                        ⚠️ {rate.ineligibilityReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & Selection Indicator */}
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-700">
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                      {rate.priceFormatted}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">incl. toll & fuel</span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-emerald-600 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-500 text-white"
                        : "border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security & Transit Armor Guarantee */}
      <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Fragile electronic components sealed with tamper-proof security tape.</span>
      </div>
    </div>
  );
}
