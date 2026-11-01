"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Truck,
  AlertCircle,
  RefreshCw,
  Compass,
} from "lucide-react";
import { ShippingRateOption, ShippableItem } from "../../lib/shipping/types";
import { useLocationStore } from "../../lib/store/useLocationStore";
import { formatRupiah } from "../../lib/utils/currency";

export type DeliveryCategoryKey = "regular" | "nextday" | "instant" | "cargo";

interface CategoryMeta {
  key: DeliveryCategoryKey;
  title: string;
}

const CATEGORY_DEFINITIONS: Record<DeliveryCategoryKey, CategoryMeta> = {
  regular: {
    key: "regular",
    title: "Regular Delivery",
  },
  nextday: {
    key: "nextday",
    title: "Next Day (Express)",
  },
  instant: {
    key: "instant",
    title: "Instant Courier",
  },
  cargo: {
    key: "cargo",
    title: "Cargo & Trucking",
  },
};

function getRateCategory(rate: ShippingRateOption): DeliveryCategoryKey {
  const code = (rate.serviceCode || "").toLowerCase();
  const courier = (rate.courierId || "").toLowerCase();
  const name = (rate.serviceName || "").toLowerCase();

  if (code.includes("cargo") || code.includes("truck") || name.includes("cargo") || name.includes("trucking")) {
    return "cargo";
  }
  if (
    courier === "gojek" ||
    courier === "grab" ||
    code.includes("instant") ||
    code.includes("sameday") ||
    name.includes("instant") ||
    name.includes("same day") ||
    name.includes("sameday")
  ) {
    return "instant";
  }
  if (
    code.includes("yes") ||
    code.includes("best") ||
    code.includes("nextday") ||
    code.includes("next-day") ||
    name.includes("yes") ||
    name.includes("best") ||
    name.includes("next day")
  ) {
    return "nextday";
  }
  return "regular";
}

function CourierBrandLogo({ courierId }: { courierId: string }) {
  const id = (courierId || "").toLowerCase();

  switch (id) {
    case "jne":
      return (
        <div
          className="w-9 h-9 rounded-xl bg-[#003399] flex items-center justify-center text-white shrink-0 shadow-2xs select-none"
          title="JNE Express"
        >
          <span className="italic font-black text-xs tracking-tight">JNE</span>
        </div>
      );

    case "jnt":
      return (
        <div
          className="w-9 h-9 rounded-xl bg-[#ED1C24] flex items-center justify-center text-white shrink-0 shadow-2xs select-none"
          title="J&T Express"
        >
          <span className="italic font-black text-xs tracking-tight">J&amp;T</span>
        </div>
      );

    case "sicepat":
      return (
        <div
          className="w-9 h-9 rounded-xl bg-[#D31515] flex items-center justify-center text-white shrink-0 shadow-2xs select-none"
          title="SiCepat Ekspres"
        >
          <span className="font-black text-[9px] tracking-tight uppercase">SICEPAT</span>
        </div>
      );

    case "anteraja":
      return (
        <div
          className="w-9 h-9 rounded-xl bg-[#E91E63] flex flex-col items-center justify-center text-white shrink-0 shadow-2xs select-none leading-none gap-0.5"
          title="AnterAja"
        >
          <span className="font-black text-[9px] lowercase tracking-tight">anter</span>
          <span className="font-black text-[9px] lowercase tracking-tight">aja</span>
        </div>
      );

    case "gojek":
      return (
        <div
          className="w-9 h-9 rounded-xl bg-[#00AA13] flex items-center justify-center text-white shrink-0 shadow-2xs select-none"
          title="Gojek (GoSend)"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="12" cy="12" r="2.8" fill="currentColor" />
          </svg>
        </div>
      );

    case "grab":
      return (
        <div
          className="w-9 h-9 rounded-xl bg-[#00B14F] flex items-center justify-center text-white shrink-0 shadow-2xs select-none"
          title="Grab (GrabExpress)"
        >
          <span className="font-black text-xs tracking-tight">Grab</span>
        </div>
      );

    default:
      return (
        <div
          className="w-9 h-9 rounded-xl bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center text-white font-black text-[11px] shrink-0 shadow-2xs select-none"
          title="Courier Service"
        >
          EXP
        </div>
      );
  }
}

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
  const [expandedCategory, setExpandedCategory] = useState<DeliveryCategoryKey | null>(null);

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
        const fetchedRates: ShippingRateOption[] = data.rates || [];
        setRates(fetchedRates);
        setDistanceKm(data.distanceKm || 0);

        // Auto-select fastest/cheapest rate if none selected
        if (!selectedRate && fetchedRates.length > 0) {
          const firstAvailable = fetchedRates.find((r: ShippingRateOption) => r.isAvailable);
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

  // Group rates by categorized service tier
  const groupedCategories = useMemo(() => {
    if (!rates || rates.length === 0) return [];

    const map: Record<DeliveryCategoryKey, ShippingRateOption[]> = {
      regular: [],
      nextday: [],
      instant: [],
      cargo: [],
    };

    rates.forEach((rate) => {
      const cat = getRateCategory(rate);
      map[cat].push(rate);
    });

    const displayOrder: DeliveryCategoryKey[] = ["regular", "nextday", "instant", "cargo"];

    return displayOrder
      .filter((key) => map[key].length > 0)
      .map((key) => {
        const categoryRates = map[key];
        const availableRates = categoryRates.filter((r) => r.isAvailable);
        const ratesToUse = availableRates.length > 0 ? availableRates : categoryRates;

        const prices = ratesToUse.map((r) => r.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const priceRangeFormatted =
          minPrice === maxPrice
            ? formatRupiah(minPrice)
            : `${formatRupiah(minPrice)} - ${formatRupiah(maxPrice)}`;

        const selectedRateInGroup = categoryRates.find(
          (r) =>
            selectedRate &&
            selectedRate.courierId === r.courierId &&
            selectedRate.serviceCode === r.serviceCode
        );

        return {
          key,
          meta: CATEGORY_DEFINITIONS[key],
          rates: categoryRates,
          minPrice,
          maxPrice,
          priceRangeFormatted,
          hasSelectedRate: Boolean(selectedRateInGroup),
          selectedRateInGroup,
        };
      });
  }, [rates, selectedRate]);

  // Synchronize expanded accordion category with current selection or first group
  useEffect(() => {
    if (selectedRate && rates.length > 0) {
      const cat = getRateCategory(selectedRate);
      setExpandedCategory((prev) => prev || cat);
    } else if (!expandedCategory && groupedCategories.length > 0) {
      setExpandedCategory(groupedCategories[0].key);
    }
  }, [selectedRate, rates.length, groupedCategories]);

  const toggleCategory = (key: DeliveryCategoryKey) => {
    setExpandedCategory((prev) => (prev === key ? null : key));
  };

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
          className="min-h-[44px] px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all shrink-0 tactile-btn active:scale-95 shadow-2xs flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-blue-500"
          title="Open Google Maps point picker or search autocomplete"
        >
          <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-2.5 py-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 animate-pulse flex items-center justify-between"
            >
              <div className="h-3.5 bg-slate-200 dark:bg-zinc-700 rounded w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-zinc-700 rounded w-20" />
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
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-800 dark:text-red-300"
            title="Retry calculation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      ) : groupedCategories.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400 dark:text-zinc-500">
          No couriers available for this location. Please try selecting a nearby district.
        </div>
      ) : (
        /* Categorized Delivery Tiers List */
        <div className="space-y-2">
          {groupedCategories.map((group) => {
            const isExpanded = expandedCategory === group.key;

            return (
              <div
                key={group.key}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  group.hasSelectedRate
                    ? "border-emerald-500 dark:border-emerald-600/80 bg-white dark:bg-zinc-900 shadow-2xs"
                    : isExpanded
                    ? "border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs"
                    : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-slate-50 dark:hover:bg-zinc-800/70"
                }`}
              >
                {/* Category Header Row (Expand / Collapse Button) */}
                <button
                  type="button"
                  onClick={() => toggleCategory(group.key)}
                  aria-expanded={isExpanded}
                  className="w-full min-h-[48px] p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {group.meta.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 text-right">
                    <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 leading-tight">
                      {group.priceRangeFormatted}
                    </span>

                    <span
                      className={`min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center ${
                        group.hasSelectedRate
                          ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-2xs"
                          : isExpanded
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                          : "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700"
                      }`}
                    >
                      {group.hasSelectedRate ? "Selected" : "Select"}
                    </span>
                  </div>
                </button>

                {/* Expanded Courier Options List */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-zinc-800 p-2 sm:p-2.5 bg-slate-50/50 dark:bg-zinc-900/60 space-y-1.5">
                    {group.rates.map((rate) => {
                      const isSelected =
                        selectedRate?.courierId === rate.courierId &&
                        selectedRate?.serviceCode === rate.serviceCode;

                      return (
                        <div
                          key={`${rate.courierId}-${rate.serviceCode}`}
                          onClick={() => rate.isAvailable && setSelectedRate(rate)}
                          className={`p-3 rounded-lg border text-left transition-all relative flex items-center justify-between gap-3 ${
                            !rate.isAvailable
                              ? "bg-slate-100/60 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "bg-white dark:bg-zinc-800 border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs cursor-pointer"
                              : "bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700/80 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-2xs cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CourierBrandLogo courierId={rate.courierId} />
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                                {rate.serviceName}
                              </span>
                              {!rate.isAvailable && rate.ineligibilityReason && (
                                <div className="text-[10px] font-medium text-red-600 dark:text-red-400 mt-0.5">
                                  ⚠️ {rate.ineligibilityReason}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Price & Selection Indicator */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100">
                              {rate.priceFormatted}
                            </span>

                            {/* Circle selector: highlighted on select, no tick or inner circle logo */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 transition-all shrink-0 ${
                                isSelected
                                  ? "border-emerald-600 dark:border-emerald-500 bg-emerald-600 dark:bg-emerald-500 ring-2 ring-emerald-500/20"
                                  : "border-slate-300 dark:border-zinc-600 bg-transparent"
                              }`}
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
