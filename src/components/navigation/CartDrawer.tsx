"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  Trash2,
  ShoppingCart,
  CheckCircle,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Store,
  Truck,
  MapPin,
  User,
  Zap,
  ChevronDown,
  RefreshCw,
  Minus,
  Plus,
} from "lucide-react";
import { useCartStore, CartStandardItem, CartCustomPC } from "../../lib/store/useCartStore";
import { useLocationStore } from "../../lib/store/useLocationStore";
import { formatRupiah } from "../../lib/utils/currency";
import { ShippingRateOption } from "../../lib/shipping/types";
import { MOCK_COMPONENTS, PREBUILT_SYSTEMS } from "../../lib/data/mockHardware";
import {
  CourierLogo,
  isExpressRate,
  DEFAULT_STANDARD_PROVIDERS,
  DEFAULT_EXPRESS_PROVIDERS,
} from "../shipping/CourierLogo";

export function getItemPricing(cartItem: CartStandardItem) {
  const item = cartItem.item;
  const mock = MOCK_COMPONENTS.find((m) => m.id === item.id);

  // Active unit price paid by the user
  const activePrice = item.price;

  // Detect original regular price
  let originalPrice = cartItem.originalPrice || item.originalPrice;
  if (!originalPrice) {
    if (item.retail_price && item.retail_price > activePrice) {
      originalPrice = item.retail_price;
    } else if (item.sale_price && item.sale_price === activePrice && mock && mock.price > activePrice) {
      originalPrice = mock.price;
    } else if (item.salePrice && item.salePrice === activePrice && mock && mock.price > activePrice) {
      originalPrice = mock.price;
    } else if (mock && mock.sale_price && mock.sale_price === activePrice && mock.price > activePrice) {
      originalPrice = mock.price;
    } else if (mock && mock.price > activePrice) {
      originalPrice = mock.price;
    }
  }

  const hasDiscount = Boolean(originalPrice && originalPrice > activePrice);
  const effectiveOriginalPrice = hasDiscount && originalPrice ? originalPrice : activePrice;
  const unitSavings = hasDiscount ? effectiveOriginalPrice - activePrice : 0;
  const totalOriginalPrice = effectiveOriginalPrice * cartItem.quantity;
  const totalActivePrice = activePrice * cartItem.quantity;
  const totalSavings = unitSavings * cartItem.quantity;
  const discountPercent =
    hasDiscount && effectiveOriginalPrice > 0
      ? Math.round(((effectiveOriginalPrice - activePrice) / effectiveOriginalPrice) * 100)
      : 0;

  return {
    hasDiscount,
    activePrice,
    originalPrice: effectiveOriginalPrice,
    unitSavings,
    totalActivePrice,
    totalOriginalPrice,
    totalSavings,
    discountPercent,
  };
}

export function getCustomPCPricing(pc: CartCustomPC) {
  let originalPrice = pc.originalPrice;
  if (!originalPrice && pc.isPrebuilt) {
    const pb = PREBUILT_SYSTEMS.find((p) => pc.id.includes(p.id) || pc.name === p.name);
    if (pb && pb.sale_price && pb.price > pb.sale_price && pc.totalPrice === pb.sale_price) {
      originalPrice = pb.price;
    }
  }

  const hasDiscount = Boolean(originalPrice && originalPrice > pc.totalPrice);
  const effectiveOriginalPrice = hasDiscount && originalPrice ? originalPrice : pc.totalPrice;
  const savings = hasDiscount ? effectiveOriginalPrice - pc.totalPrice : 0;

  return {
    hasDiscount,
    activePrice: pc.totalPrice,
    originalPrice: effectiveOriginalPrice,
    savings,
  };
}

function CartDrawerComponent() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    items,
    customPCs,
    isCartOpen,
    closeCart,
    addItem,
    removeItem,
    updateQuantity,
    removeStandardItem,
    removeCustomPC,
    getSubtotal,
    fulfillmentMethod,
    setFulfillmentMethod,
    clearCart,
  } = useCartStore();

  const router = useRouter();
  const { userLocation, selectedRate, openLocationModal, setSelectedRate } = useLocationStore();

  type FulfillmentOption = "click_and_collect" | "standard" | "express";
  const [selectedFulfillment, setSelectedFulfillment] = useState<FulfillmentOption>(() => {
    if (fulfillmentMethod === "click_and_collect") return "click_and_collect";
    if (selectedRate && isExpressRate(selectedRate)) return "express";
    return "standard";
  });
  const [selectedStandardRate, setSelectedStandardRate] = useState<ShippingRateOption | null>(() => {
    if (selectedRate && !isExpressRate(selectedRate)) return selectedRate;
    return null;
  });
  const [selectedExpressRate, setSelectedExpressRate] = useState<ShippingRateOption | null>(() => {
    if (selectedRate && isExpressRate(selectedRate)) return selectedRate;
    return null;
  });
  const [rates, setRates] = useState<ShippingRateOption[]>([]);
  const [isRatesLoading, setIsRatesLoading] = useState(false);
  const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(false);
  const [expandedCourierTier, setExpandedCourierTier] = useState<"standard" | "express" | null>(null);

  const handleProceedToCheckout = () => {
    closeCart();
    router.push("/checkout");
  };

  // Collapse delivery options whenever cart drawer closes
  useEffect(() => {
    if (!isCartOpen) {
      setIsDeliveryExpanded(false);
      setExpandedCourierTier(null);
    }
  }, [isCartOpen]);

  // Synchronize internal fulfillment state when global store updates
  useEffect(() => {
    if (fulfillmentMethod === "click_and_collect") {
      setSelectedFulfillment("click_and_collect");
    } else if (selectedRate) {
      if (isExpressRate(selectedRate)) {
        setSelectedFulfillment("express");
        setSelectedExpressRate(selectedRate);
      } else {
        setSelectedFulfillment("standard");
        setSelectedStandardRate(selectedRate);
      }
    }
  }, [fulfillmentMethod, selectedRate]);

  // Filtered Courier Provider Lists
  const standardList = useMemo(() => {
    const live = rates.filter((r) => !isExpressRate(r));
    return live.length > 0 ? live : DEFAULT_STANDARD_PROVIDERS;
  }, [rates]);

  const expressList = useMemo(() => {
    const live = rates.filter((r) => isExpressRate(r));
    return live.length > 0 ? live : DEFAULT_EXPRESS_PROVIDERS;
  }, [rates]);

  // Computed Price Ranges for Delivery Fulfillment Options
  const standardPriceRange = useMemo(() => {
    if (standardList.length === 0) return "Rp 10.000 to Rp 12.000";
    const prices = standardList.map((r) => r.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatRupiah(min);
    return `${formatRupiah(min)} - ${formatRupiah(max)}`;
  }, [standardList]);

  const expressPriceRange = useMemo(() => {
    if (expressList.length === 0) return "Rp 20.000 to Rp 24.000";
    const prices = expressList.map((r) => r.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatRupiah(min);
    return `${formatRupiah(min)} - ${formatRupiah(max)}`;
  }, [expressList]);

  const { subtotal, originalSubtotal, totalSavings } = useMemo(() => {
    let actSubtotal = 0;
    let origSubtotal = 0;
    let savings = 0;

    items.forEach((ci) => {
      const pricing = getItemPricing(ci);
      actSubtotal += pricing.totalActivePrice;
      origSubtotal += pricing.totalOriginalPrice;
      savings += pricing.totalSavings;
    });

    customPCs.forEach((pc) => {
      const pricing = getCustomPCPricing(pc);
      actSubtotal += pricing.activePrice;
      origSubtotal += pricing.originalPrice;
      savings += pricing.savings;
    });

    return {
      subtotal: actSubtotal,
      originalSubtotal: origSubtotal,
      totalSavings: savings,
    };
  }, [items, customPCs]);

  // Fetch live rates when destination or cart contents change
  useEffect(() => {
    let isSubscribed = true;
    if (!userLocation || (items.length === 0 && customPCs.length === 0)) return;
    setIsRatesLoading(true);

    const shippableItems = [
      ...items.map((ci) => ({
        id: ci.item.id,
        name: ci.item.name,
        price: ci.item.price,
        weightGrams: 1500,
        quantity: ci.quantity,
      })),
      ...customPCs.map((pc) => ({
        id: pc.id,
        name: pc.name,
        price: pc.totalPrice,
        weightGrams: 18000,
        quantity: 1,
      })),
    ];

    const totalWeight = shippableItems.reduce(
      (sum, item) => sum + (item.weightGrams || 1500) * (item.quantity || 1),
      0
    );

    const payload = {
      destination: userLocation,
      items: shippableItems,
      totalWeightGrams: totalWeight,
      totalPrice: subtotal,
    };

    fetch("/api/shipping/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed && data.success && Array.isArray(data.rates)) {
          setRates(data.rates);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isSubscribed) setIsRatesLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [userLocation?.address, userLocation?.subdistrict, userLocation?.postalCode, items.length, customPCs.length, subtotal]);

  const handleSelectClickAndCollect = () => {
    setSelectedFulfillment("click_and_collect");
    setFulfillmentMethod("click_and_collect");
    setSelectedRate(null);
    setExpandedCourierTier(null);
    setIsDeliveryExpanded(false);
  };

  const handleCourierRateSelect = (tier: "standard" | "express", rate: ShippingRateOption) => {
    if (tier === "standard") {
      setSelectedStandardRate(rate);
    } else {
      setSelectedExpressRate(rate);
    }
    setSelectedRate(rate);
    setSelectedFulfillment(tier);
    setFulfillmentMethod("delivery");
    setExpandedCourierTier(null);
    setIsDeliveryExpanded(false);
  };

  const handleFulfillmentSelect = (option: FulfillmentOption) => {
    setSelectedFulfillment(option);
    if (option === "click_and_collect") {
      setFulfillmentMethod("click_and_collect");
    } else if (option === "standard") {
      setFulfillmentMethod("delivery");
      const chosenRate = selectedStandardRate || standardList[0] || null;
      if (chosenRate) {
        setSelectedStandardRate(chosenRate);
        setSelectedRate(chosenRate);
      }
    } else if (option === "express") {
      setFulfillmentMethod("delivery");
      const chosenRate = selectedExpressRate || expressList[0] || null;
      if (chosenRate) {
        setSelectedExpressRate(chosenRate);
        setSelectedRate(chosenRate);
      }
    }
  };

  // Close on Escape key when the cart is open
  useEffect(() => {
    if (!isCartOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCartOpen, closeCart]);

  if (!isMounted) return null;

  // Dynamic shipping fee in IDR based on user-selected courier rate
  const shippingFee =
    fulfillmentMethod === "click_and_collect"
      ? 0
      : selectedRate
      ? selectedRate.price
      : selectedFulfillment === "standard"
      ? (selectedStandardRate || standardList[0])?.price || 11000
      : (selectedExpressRate || expressList[0])?.price || 20000;
  const total = subtotal + shippingFee;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
      aria-hidden={!isCartOpen}
      className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
        isCartOpen
          ? "visible pointer-events-auto"
          : "invisible pointer-events-none delay-300"
      }`}
    >
      {/* Backdrop: clean subtle darkening without blur */}
      <div
        onClick={closeCart}
        aria-hidden="true"
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ease-out touch-none ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div
          className={`w-screen max-w-md bg-white dark:bg-zinc-900 shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col pointer-events-auto transform transition-transform duration-300 ease-out ${
            isCartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="px-6 py-5 bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Your Shopping Cart</h2>
              <span className="text-xs bg-slate-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold px-2 py-0.5 rounded-full">
                {items.length + customPCs.length}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-2 rounded-lg text-slate-400 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
            {items.length === 0 && customPCs.length === 0 ? (
              /* Empty Cart */
              <div className="text-center py-16 text-slate-400 dark:text-zinc-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Your cart is currently empty</p>
                <p className="text-xs text-slate-400 dark:text-zinc-400 mt-1">Explore our PC parts or configure a custom gaming rig.</p>
              </div>
            ) : (
              /* Items List */
              <>
                {/* Custom PC Systems & Prebuilts in Cart */}
                {customPCs.map((pc) => {
                  const pcPricing = getCustomPCPricing(pc);
                  return (
                    <div
                      key={pc.id}
                      className="py-4 border-b border-slate-200/60 dark:border-zinc-800/60 last:border-b-0 space-y-2.5 bg-transparent relative"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {pc.image && (
                            <div className="relative w-14 h-14 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0 item-frame">
                              <Image
                                src={pc.image}
                                alt={pc.name}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              pc.isPrebuilt ? "bg-emerald-700 dark:bg-emerald-600 text-white" : "bg-zinc-900 dark:bg-zinc-800 text-white dark:text-white border border-transparent dark:border-zinc-700"
                            }`}>
                              {pc.isPrebuilt ? "Turnkey Pre-Built" : "Custom PC System"}
                            </span>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-1.5 whitespace-normal break-words leading-snug">{pc.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                              {pc.serviceTier.name} ({pc.serviceTier.leadTime})
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeCustomPC(pc.id)}
                          className="text-slate-400 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 rounded-lg transition-colors cursor-pointer"
                          aria-label="Remove PC"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-zinc-400 space-y-1 pt-1">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500 dark:text-zinc-500 shrink-0">CPU:</span>
                          <strong className="text-zinc-800 dark:text-zinc-200 text-right whitespace-normal break-words">{pc.parts.cpu?.name || "Configured"}</strong>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500 dark:text-zinc-500 shrink-0">GPU:</span>
                          <strong className="text-zinc-800 dark:text-zinc-200 text-right whitespace-normal break-words">{pc.parts.gpu?.name || "Integrated"}</strong>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500 dark:text-zinc-500 shrink-0">Memory:</span>
                          <strong className="text-zinc-800 dark:text-zinc-200 text-right whitespace-normal break-words">{pc.parts.ram?.name || "Configured"}</strong>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-slate-500 dark:text-zinc-400">Estimated Draw: ~{pc.wattage}W</span>
                        <div className="text-right">
                          {pcPricing.hasDiscount ? (
                            <>
                              <div className="text-xs line-through text-slate-400 dark:text-zinc-500">
                                {formatRupiah(pcPricing.originalPrice)}
                              </div>
                              <div className="text-base font-black text-zinc-900 dark:text-zinc-100">
                                {formatRupiah(pcPricing.activePrice)}
                              </div>
                              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Save {formatRupiah(pcPricing.savings)}
                              </div>
                            </>
                          ) : (
                            <span className="text-base font-black text-zinc-900 dark:text-zinc-100">
                              {formatRupiah(pc.totalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Standard Items */}
                {items.map((cartItem) => {
                  const pricing = getItemPricing(cartItem);
                  return (
                    <div
                      key={cartItem.id}
                      className="py-4 border-b border-slate-200/60 dark:border-zinc-800/60 last:border-b-0 flex items-start gap-3.5 bg-transparent"
                    >
                      <div className="relative w-28 h-28 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 overflow-hidden shrink-0 item-frame">
                        <Image
                          src={cartItem.item.image}
                          alt={cartItem.item.name}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-28">
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-normal break-words leading-snug line-clamp-2">
                            {cartItem.item.name}
                          </h4>

                          {cartItem.item.variationName && (
                            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                              Variation: {cartItem.item.variationName}
                            </div>
                          )}
                        </div>

                        {/* Price per 1 quantity on top of quantity: Slashed price first, then actual price, then -X% red badge */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                          {pricing.hasDiscount ? (
                            <>
                              <span className="text-xs line-through text-slate-400 dark:text-zinc-500">
                                {formatRupiah(pricing.originalPrice)}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {formatRupiah(pricing.activePrice)}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-red-600 text-white shrink-0 leading-tight">
                                -{pricing.discountPercent}%
                              </span>
                            </>
                          ) : (
                            <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {formatRupiah(pricing.activePrice)}
                            </span>
                          )}
                        </div>

                        {/* Quantity Row with Trash Can directly to the right */}
                        <div className="flex items-center gap-2.5">
                          {/* Sleek Pill Quantity Stepper */}
                          <div className="inline-flex items-center rounded-full border border-slate-200/90 dark:border-zinc-700/80 bg-slate-50/90 dark:bg-zinc-800/60 p-0.5 shadow-2xs">
                            <button
                              type="button"
                              disabled={cartItem.quantity <= 1}
                              onClick={() => {
                                if (cartItem.quantity > 1) {
                                  updateQuantity(cartItem.id, cartItem.quantity - 1);
                                }
                              }}
                              className={`relative w-7 h-7 flex items-center justify-center rounded-full transition-all select-none before:absolute before:-inset-2 before:content-[''] ${
                                cartItem.quantity <= 1
                                  ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed opacity-40"
                                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700/80 shadow-2xs active:scale-95 cursor-pointer"
                              }`}
                              title={cartItem.quantity <= 1 ? "Minimum quantity is 1 (use trash icon to delete)" : "Decrease quantity"}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                            <span className="min-w-[26px] px-1 text-center text-xs font-bold text-zinc-900 dark:text-zinc-100 select-none">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={
                                cartItem.quantity >=
                                (cartItem.item.stockCount && cartItem.item.stockCount > 0
                                  ? cartItem.item.stockCount
                                  : 99)
                              }
                              onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                              className={`relative w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-95 select-none before:absolute before:-inset-2 before:content-[''] ${
                                cartItem.quantity >=
                                (cartItem.item.stockCount && cartItem.item.stockCount > 0
                                  ? cartItem.item.stockCount
                                  : 99)
                                ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed opacity-40"
                                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700/80 shadow-2xs cursor-pointer"
                              }`}
                              title="Increase quantity"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>

                          {/* Trash Can directly to the right of the quantity */}
                          <button
                            type="button"
                            onClick={() => removeItem(cartItem.id)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center cursor-pointer shrink-0 relative before:absolute before:-inset-1.5 before:content-['']"
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {(items.length > 0 || customPCs.length > 0) && (
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-zinc-950/90 border-t border-slate-200 dark:border-zinc-800 space-y-4 shrink-0 max-h-[75vh] overflow-y-auto overscroll-contain scrollbar-thin">
              {/* Delivery Option (Integrated without outer container box) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span
                    id="cart-delivery-group-label"
                    className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Delivery Option
                  </span>
                  <button
                    type="button"
                    onClick={openLocationModal}
                    className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 min-h-[44px] px-1"
                    title="Change delivery location"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="max-w-[140px] truncate">
                      {userLocation ? (userLocation.subdistrict || userLocation.city || userLocation.address.split(",")[0]) : "Set Location"}
                    </span>
                  </button>
                </div>

                {/* Collapsible Delivery Option Deck: Chosen card stays mounted, other cards slide down via accordion */}
                <div className="relative group select-none">
                  {/* Stacked card layer 2 (bottom-most deck layer) */}
                  <div
                    className={`absolute inset-x-3.5 -bottom-2 h-full rounded-xl bg-slate-200/80 dark:bg-zinc-800/40 border border-slate-300/70 dark:border-zinc-700/50 shadow-2xs pointer-events-none transition-all duration-300 ease-out ${
                      isDeliveryExpanded
                        ? "opacity-0 -bottom-0.5"
                        : "opacity-100 group-hover:-bottom-2.5 group-hover:inset-x-4"
                    }`}
                    aria-hidden="true"
                  />
                  {/* Stacked card layer 1 (middle deck layer) */}
                  <div
                    className={`absolute inset-x-2 -bottom-1 h-full rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 shadow-2xs pointer-events-none transition-all duration-300 ease-out ${
                      isDeliveryExpanded
                        ? "opacity-0 -bottom-0.5"
                        : "opacity-100 group-hover:-bottom-1.5 group-hover:inset-x-2.5"
                    }`}
                    aria-hidden="true"
                  />

                  {/* Top Active Card (Always mounted as the deck head) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setIsDeliveryExpanded((prev) => {
                        if (prev) setExpandedCourierTier(null);
                        return !prev;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsDeliveryExpanded((prev) => {
                          if (prev) setExpandedCourierTier(null);
                          return !prev;
                        });
                      }
                    }}
                    className={`relative z-10 flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-200 ease-out active:scale-[0.99] min-h-[44px] cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                      isDeliveryExpanded
                        ? "bg-zinc-50/90 dark:bg-zinc-800/60 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900/90 dark:ring-zinc-100/90 shadow-2xs"
                        : "bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm group-hover:-translate-y-0.5"
                    }`}
                    aria-expanded={isDeliveryExpanded}
                    aria-label={`Delivery option: ${
                      selectedFulfillment === "click_and_collect"
                        ? "Click and Collect"
                        : selectedFulfillment === "standard"
                        ? "Standard Delivery"
                        : "Express Delivery"
                    }. ${isDeliveryExpanded ? "Click to collapse options" : "Click to expand other delivery options"}.`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {selectedFulfillment === "click_and_collect" ? (
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                        </div>
                      ) : selectedFulfillment === "standard" ? (
                        selectedStandardRate ? (
                          <CourierLogo courierId={selectedStandardRate.courierId} />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                          </div>
                        )
                      ) : selectedExpressRate ? (
                        <CourierLogo courierId={selectedExpressRate.courierId} />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight truncate block">
                          {selectedFulfillment === "click_and_collect"
                            ? "Click and Collect"
                            : selectedFulfillment === "standard"
                            ? "Standard Delivery"
                            : "Express Delivery"}
                        </span>
                        <p className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {selectedFulfillment === "click_and_collect"
                            ? "Mangga Dua Mall Store (Ready in 60 mins)"
                            : selectedFulfillment === "standard"
                            ? selectedStandardRate
                              ? `${selectedStandardRate.courierName} ${selectedStandardRate.serviceName} (${selectedStandardRate.etd})`
                              : "Regular courier (2 to 4 business days)"
                            : selectedExpressRate
                            ? `${selectedExpressRate.courierName} ${selectedExpressRate.serviceName} (${selectedExpressRate.etd})`
                            : "Instant & Next-Day (GoSend, Grab, JNE YES)"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                        {selectedFulfillment === "click_and_collect"
                          ? "Free"
                          : selectedFulfillment === "standard"
                          ? selectedStandardRate
                            ? selectedStandardRate.priceFormatted
                            : standardPriceRange
                          : selectedExpressRate
                          ? selectedExpressRate.priceFormatted
                          : expressPriceRange}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ease-out ${
                          isDeliveryExpanded ? "rotate-180 text-zinc-700 dark:text-zinc-200" : "group-hover:translate-y-0.5"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Smooth Accordion: Other options reveal and slide down smoothly from below */}
                  <div className={`delivery-options-accordion ${isDeliveryExpanded ? "open" : ""}`}>
                    <div>
                      <div className="delivery-options-content space-y-2 pt-2 pb-0.5">
                        {/* Change Courier for currently selected tier */}
                        {selectedFulfillment !== "click_and_collect" && (
                          <div className="space-y-1.5 pb-1">
                            <button
                              type="button"
                              onClick={() => setExpandedCourierTier((prev) => (prev === selectedFulfillment ? null : selectedFulfillment))}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[44px]"
                            >
                              <span className="flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                                Change {selectedFulfillment === "standard" ? "standard" : "express"} courier ({selectedRate?.courierName || "Choose"})
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  expandedCourierTier === selectedFulfillment ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            <div className={`delivery-options-accordion ${expandedCourierTier === selectedFulfillment ? "open" : ""}`}>
                              <div>
                                <div className="delivery-options-content ml-4 sm:ml-5 pl-3 sm:pl-3.5 border-l border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5 pt-1.5 pb-1">
                                  {(selectedFulfillment === "standard" ? standardList : expressList).map((rate) => {
                                    const isRateSelected =
                                      selectedRate?.courierId === rate.courierId &&
                                      selectedRate?.serviceCode === rate.serviceCode;

                                    return (
                                      <button
                                        key={`${rate.courierId}-${rate.serviceCode}`}
                                        type="button"
                                        onClick={() => handleCourierRateSelect(selectedFulfillment as "standard" | "express", rate)}
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
                                            <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 block truncate">
                                              ETD: {rate.etd}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                          <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            {rate.priceFormatted}
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
                          </div>
                        )}

                        {/* Other Delivery Options (Filtered to exclude currently selected fulfillment) */}
                        {[
                          {
                            id: "click_and_collect" as const,
                            title: "Click and Collect",
                            subtitle: "Mangga Dua Mall Store (Ready in 60 mins)",
                            priceInfo: "Free",
                            icon: Store,
                          },
                          {
                            id: "standard" as const,
                            title: "Standard Delivery",
                            subtitle: "Regular courier (2 to 4 business days)",
                            priceInfo: selectedStandardRate
                              ? selectedStandardRate.priceFormatted
                              : standardPriceRange,
                            icon: Truck,
                          },
                          {
                            id: "express" as const,
                            title: "Express Delivery",
                            subtitle: "Instant & Next-Day (GoSend, Grab, JNE YES)",
                            priceInfo: selectedExpressRate
                              ? selectedExpressRate.priceFormatted
                              : expressPriceRange,
                            icon: Zap,
                          },
                        ]
                          .filter((option) => option.id !== selectedFulfillment)
                          .map((option) => {
                            const IconComponent = option.icon;
                            const isTierOpen = expandedCourierTier === option.id;

                            return (
                              <div key={option.id} className="space-y-2">
                                {/* Option Card */}
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    if (option.id === "click_and_collect") {
                                      handleSelectClickAndCollect();
                                    } else {
                                      setExpandedCourierTier((prev) => (prev === option.id ? null : option.id));
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      if (option.id === "click_and_collect") {
                                        handleSelectClickAndCollect();
                                      } else {
                                        setExpandedCourierTier((prev) => (prev === option.id ? null : option.id));
                                      }
                                    }
                                  }}
                                  className="group/opt relative flex items-start justify-between gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 min-h-[44px] cursor-pointer transition-all duration-150 ease-out select-none active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                                >
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <div className="mt-0.5">
                                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                                        <IconComponent className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                                      </div>
                                    </div>

                                    <div className="min-w-0">
                                      <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 tracking-tight block">
                                        {option.title}
                                      </span>
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
                                        className={`w-3.5 h-3.5 text-zinc-400 group-hover/opt:text-zinc-600 dark:group-hover/opt:text-zinc-300 transition-transform duration-200 ${
                                          isTierOpen ? "rotate-180" : ""
                                        }`}
                                      />
                                    )}
                                  </div>
                                </div>

                                {/* Slide-Down Content Below Option: Standard Delivery Providers */}
                                {option.id === "standard" && (
                                  <div className={`delivery-options-accordion ${isTierOpen ? "open" : ""}`}>
                                    <div>
                                      <div className="delivery-options-content ml-4 sm:ml-5 pl-3 sm:pl-3.5 border-l border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5 pt-1.5 pb-0.5">
                                        {standardList.map((rate) => {
                                          const isRateSelected =
                                            selectedStandardRate?.courierId === rate.courierId &&
                                            selectedStandardRate?.serviceCode === rate.serviceCode;

                                          return (
                                            <button
                                              key={`${rate.courierId}-${rate.serviceCode}`}
                                              type="button"
                                              onClick={() => handleCourierRateSelect("standard", rate)}
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
                                                  <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 block truncate">
                                                    ETD: {rate.etd}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2.5 shrink-0">
                                                <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                  {rate.priceFormatted}
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

                                {/* Slide-Down Content Below Option: Express Delivery Providers */}
                                {option.id === "express" && (
                                  <div className={`delivery-options-accordion ${isTierOpen ? "open" : ""}`}>
                                    <div>
                                      <div className="delivery-options-content ml-4 sm:ml-5 pl-3 sm:pl-3.5 border-l border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5 pt-1.5 pb-0.5">
                                        {expressList.map((rate) => {
                                          const isRateSelected =
                                            selectedExpressRate?.courierId === rate.courierId &&
                                            selectedExpressRate?.serviceCode === rate.serviceCode;

                                          return (
                                            <button
                                              key={`${rate.courierId}-${rate.serviceCode}`}
                                              type="button"
                                              onClick={() => handleCourierRateSelect("express", rate)}
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
                                                  <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 block truncate">
                                                    ETD: {rate.etd}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2.5 shrink-0">
                                                <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                  {rate.priceFormatted}
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
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400 pt-1">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <div className="text-right">
                    {totalSavings > 0 && (
                      <span className="line-through text-slate-400 dark:text-zinc-500 mr-2">
                        {formatRupiah(originalSubtotal)}
                      </span>
                    )}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>
                </div>

                {totalSavings > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discount Savings</span>
                    <span>-{formatRupiah(totalSavings)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>
                    Delivery (
                    {fulfillmentMethod === "click_and_collect"
                      ? "Click & Collect"
                      : selectedRate
                      ? `${selectedRate.courierName} ${selectedRate.serviceName}`
                      : selectedFulfillment === "express"
                      ? "Express Delivery"
                      : "Standard Delivery"}
                    )
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {shippingFee === 0 ? "FREE" : formatRupiah(shippingFee)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1">
                  <div className="flex justify-between items-baseline text-sm font-black text-zinc-900 dark:text-white">
                    <span>Total Due</span>
                    <span className="text-lg">{formatRupiah(total)}</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="text-right text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      You save {formatRupiah(totalSavings)} on this order
                    </div>
                  )}
                </div>
              </div>


              <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Stock reserved atomically upon payment success.</span>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full min-h-[44px] py-3.5 bg-[#52E394] hover:brightness-105 active:brightness-95 text-[#0A0B0E] font-semibold rounded-md text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
              >
                <span>Confirm & Pay {formatRupiah(total)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const CartDrawer = React.memo(CartDrawerComponent);
