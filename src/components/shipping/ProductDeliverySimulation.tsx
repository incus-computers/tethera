"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { ChevronDown, Store, Truck, Zap } from "lucide-react";
import { CourierLogo, isExpressRate } from "./CourierLogo";
import type { ShippingRateOption } from "../../lib/shipping/types";
import { formatRupiah } from "../../lib/utils/currency";

type Estimate = {
  simulated: boolean;
  rates: Pick<ShippingRateOption, "courierId" | "courierName" | "serviceCode" | "serviceName" | "price" | "etd">[];
};

export function ProductDeliverySimulation({ productId, variantId, quantity, disabled }: {
  productId: string;
  variantId?: string;
  quantity: number;
  disabled?: boolean;
}) {
  const id = useId();
  const [postalCode, setPostalCode] = useState("");
  const [selectedFulfillment, setSelectedFulfillment] = useState<"click_and_collect" | "standard" | "express">("click_and_collect");
  const [expandedTier, setExpandedTier] = useState<"standard" | "express" | null>(null);
  const [selectedRateKey, setSelectedRateKey] = useState<string | null>(null);
  const [submittedPostcode, setSubmittedPostcode] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; estimate?: Estimate; error?: string } | null>(null);
  const payload = submittedPostcode && !disabled
    ? JSON.stringify({ productId, variantId, quantity, postalCode: submittedPostcode })
    : null;
  const requestKey = payload ? `${attempt}:${payload}` : null;
  const current = result?.key === requestKey ? result : null;
  const pending = Boolean(requestKey && !current);

  const rates = current?.estimate?.rates ?? [];
  const standardList = rates.filter(rate => !isExpressRate(rate));
  const expressList = rates.filter(isExpressRate);

  function rateSummary(list: Estimate["rates"]) {
    const selected = list.find(rate => `${rate.courierId}-${rate.serviceCode}` === selectedRateKey);
    if (selected) return formatRupiah(selected.price);
    if (pending) return "Updating…";
    if (current?.error || disabled) return "Unavailable";
    if (!current?.estimate) return "Enter postcode";
    if (!list.length) return "Unavailable";
    return list[0].price === list[list.length - 1].price
      ? formatRupiah(list[0].price)
      : `From ${formatRupiah(list[0].price)}`;
  }

  function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || disabled) return;
    setSubmittedPostcode(postalCode);
    setAttempt(previous => previous + 1);
  }

  useEffect(() => {
    if (!payload || !requestKey) return;
    const controller = new AbortController();

    const estimate = async () => {
      try {
        const response = await fetch("/api/shipping/product-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Delivery estimates are temporarily unavailable.");
        if (!controller.signal.aborted) setResult({ key: requestKey, estimate: data });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error && error.name === "Error"
          ? error.message
          : "Delivery estimates are temporarily unavailable. Try again.";
        setResult({ key: requestKey, error: message });
      }
    };

    const debounce = window.setTimeout(estimate, 200);
    return () => {
      window.clearTimeout(debounce);
      controller.abort();
    };
  }, [payload, requestKey]);

  return (
    <section aria-labelledby={`${id}-heading`} className="grid gap-4">
      <h2 id={`${id}-heading`} className="text-sm font-semibold leading-5">Delivery Simulation</h2>
      <div className="grid gap-2">
        <form onSubmit={simulate} className="flex items-end gap-2">
          <label htmlFor={id} className="grid min-w-0 flex-1 gap-2 text-xs font-medium leading-4 text-zinc-700 dark:text-zinc-300">
            <span>Postcode</span>
            <input id={id} value={postalCode} onChange={event => {
              setPostalCode(event.target.value);
              setSubmittedPostcode("");
              setSelectedRateKey(null);
            }}
              inputMode="numeric" autoComplete="postal-code" required pattern="[0-9]{5}" maxLength={5} placeholder="e.g. 10730"
              className="block min-h-[44px] w-full rounded-md border border-slate-300 bg-transparent px-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-white" />
          </label>
          <button type="submit" disabled={pending || disabled} className="min-h-[44px] shrink-0 rounded-md border border-slate-300 px-3 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            {pending ? "Estimating…" : "Estimate delivery"}
          </button>
        </form>
        {disabled && <p className="text-xs text-slate-600 dark:text-zinc-400">Choose an available item to estimate delivery.</p>}
        {current?.error && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{current.error}</p>}
        {current?.estimate && rates.length === 0 && (
          <p role="status" className="text-xs text-slate-600 dark:text-zinc-400">No delivery rates were found for this postcode.</p>
        )}
      </div>
      <div className="grid gap-2">
        <h3 id={`${id}-types`} className="text-xs font-medium leading-4 text-zinc-700 dark:text-zinc-300">Delivery Type</h3>
        <div role="radiogroup" aria-labelledby={`${id}-types`} className="space-y-3">
          {[
            {
              id: "click_and_collect" as const,
              title: "Click and Collect",
              subtitle: "Incus Store, Mangga Dua Mall",
              priceInfo: "Free",
              icon: Store,
            },
            {
              id: "standard" as const,
              title: "Standard Delivery",
              subtitle: "Regular courier",
              priceInfo: rateSummary(standardList),
              icon: Truck,
            },
            {
              id: "express" as const,
              title: "Express Delivery",
              subtitle: "Instant and next-day couriers",
              priceInfo: rateSummary(expressList),
              icon: Zap,
            },
          ].map((option) => {
            const isSelected = selectedFulfillment === option.id;
            const isExpanded = expandedTier === option.id;
            const IconComponent = option.icon;

            return (
              <div key={option.id} className="space-y-2">
                {/* Option Radio Card */}
                <label
                  htmlFor={`${id}-${option.id}`}
                  className={`group relative flex items-start justify-between gap-3 p-3.5 rounded-xl border min-h-[44px] cursor-pointer transition-all duration-150 ease-out select-none active:scale-[0.99] ${
                    isSelected
                      ? "bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900/90 dark:ring-zinc-100/90 shadow-2xs"
                      : "bg-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                  } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-900 dark:has-[:focus-visible]:ring-zinc-100 has-[:focus-visible]:ring-offset-2 dark:has-[:focus-visible]:ring-offset-zinc-900`}
                >
                  <input
                    type="radio"
                    id={`${id}-${option.id}`}
                    name={`${id}-delivery-tier`}
                    value={option.id}
                    checked={isSelected}
                    onChange={() => {
                      setSelectedFulfillment(option.id);
                      setExpandedTier(option.id === "click_and_collect" ? null : option.id);
                    }}
                    onClick={() => {
                      if (isSelected && option.id !== "click_and_collect") {
                        setExpandedTier(isExpanded ? null : option.id);
                      }
                    }}
                    className="sr-only"
                  />

                  <div className="flex items-start gap-3 min-w-0">
                    {/* Semantic Radio Check Indicator */}
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150 ${
                        isSelected
                          ? "border-zinc-900 dark:border-zinc-100 bg-transparent"
                          : "border-zinc-300 dark:border-zinc-600 bg-transparent group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
                      }`}
                      aria-hidden="true"
                    >
                      <div
                        className={`w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 transform transition-transform duration-150 ease-out ${
                          isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <IconComponent className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 tracking-tight">
                          {option.title}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-normal mt-0.5">
                        {option.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right pt-0.5 flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {option.priceInfo}
                    </span>
                    {option.id !== "click_and_collect" && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ease-out ${
                          isExpanded ? "rotate-180 text-zinc-700 dark:text-zinc-200" : ""
                        }`}
                      />
                    )}
                  </div>
                </label>

                {option.id !== "click_and_collect" && (
                  <div inert={!isExpanded} aria-hidden={!isExpanded} className={`delivery-options-accordion ${isExpanded ? "open" : ""}`}>
                    <div>
                      <div className="delivery-options-content ml-4 sm:ml-5 pl-3 sm:pl-3.5 border-l border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5 pt-1.5 pb-0.5">
                        {(option.id === "standard" ? standardList : expressList).map((rate) => {
                          const rateKey = `${rate.courierId}-${rate.serviceCode}`;
                          const isRateSelected = selectedRateKey === rateKey;

                          return (
                            <button
                              key={`${rate.courierId}-${rate.serviceCode}`}
                              type="button"
                              onClick={() => {
                                setSelectedRateKey(rateKey);
                                document.getElementById(`${id}-${option.id}`)?.focus({ preventScroll: true });
                                setExpandedTier(null);
                              }}
                              aria-pressed={isRateSelected}
                              className={`w-full min-h-[44px] p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                                isRateSelected
                                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50/70 dark:bg-zinc-800/40 ring-1 ring-zinc-900/90 dark:ring-zinc-100/90 shadow-2xs"
                                  : "border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 hover:border-zinc-300 dark:hover:border-zinc-700"
                              } focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <CourierLogo courierId={rate.courierId} />
                                <div className="min-w-0">
                                  <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 block truncate">
                                    {rate.serviceName}
                                  </span>
                                  <span className="text-[11px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 block truncate">
                                    {rate.etd && `ETD: ${rate.etd}`}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                  {formatRupiah(rate.price)}
                                </span>
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150 ${
                                    isRateSelected
                                      ? "border-zinc-900 dark:border-zinc-100 bg-transparent"
                                      : "border-zinc-300 dark:border-zinc-600 bg-transparent"
                                  }`}
                                  aria-hidden="true"
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 transform transition-transform duration-150 ease-out ${
                                      isRateSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                                    }`}
                                  />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
