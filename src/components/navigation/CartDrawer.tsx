"use client";
import { useTranslation } from "@/components/storefront/StorefrontProvider";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  Trash2,
  ShoppingCart,
  ShieldCheck,
  ArrowRight,
  Minus,
  Plus,
} from "lucide-react";
import { useCartStore, CartStandardItem, CartCustomPC } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";
import { MOCK_COMPONENTS, PREBUILT_SYSTEMS } from "../../lib/data/mockHardware";
import { cartPartSummary } from "../../lib/builder/cartParts";
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
  const {t}=useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    items,
    customPCs,
    isCartOpen,
    closeCart,
    removeItem,
    updateQuantity,
    removeCustomPC,
  } = useCartStore();

  useEffect(() => {
    if (!isCartOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isCartOpen]);

  const router = useRouter();
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("Shopping Cart")}
      aria-hidden={!isCartOpen}
      className={`fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden transition-all duration-300 ${
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

      <div className="absolute inset-y-0 right-0 w-full max-w-md h-full flex pointer-events-none">
        <div
          className={`w-full h-full min-h-0 bg-white dark:bg-zinc-900 shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col pointer-events-auto transform transition-transform duration-300 ease-out ${
            isCartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="px-6 py-5 shrink-0 bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{t("Your Shopping Cart")}</h2>
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
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6">
            {items.length === 0 && customPCs.length === 0 ? (
              /* Empty Cart */
              <div className="text-center py-16 text-slate-400 dark:text-zinc-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{t("Your cart is currently empty")}</p>
                <p className="text-xs text-slate-400 dark:text-zinc-400 mt-1">{t("Explore our PC parts or configure a custom gaming rig.")}</p>
              </div>
            ) : (
              /* Items List */
              <>
                {/* Custom PC Systems & Prebuilts in Cart */}
                {customPCs.map((pc) => {
                  const pcPricing = getCustomPCPricing(pc);
                  const { rows, customized } = cartPartSummary(pc);
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

                      {!pc.isPrebuilt && (
                        <p className="pt-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {t(customized ? "Customized parts" : "Selected parts")}
                        </p>
                      )}
                      {rows.length > 0 ? (
                        <dl className="pt-1 text-xs leading-relaxed">
                          {rows.map(({ slot, label, name }) => (
                            <div key={slot} className="grid grid-cols-[6.5rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)]">
                              <dt className="py-1 pr-2 text-slate-500 dark:text-zinc-400">{t(label)}</dt>
                              <dd className="min-w-0 break-words py-1 pl-3 text-left font-semibold text-zinc-800 dark:text-zinc-200">{t(name)}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : customized && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400">{t("No component changes")}</p>
                      )}

                      <div className="flex justify-end pt-2">
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
                                {t("Save")}{formatRupiah(pcPricing.savings)}
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
                              {t("Variation:")}{cartItem.item.variationName}
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
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-zinc-950/90 border-t border-slate-200 dark:border-zinc-800 space-y-4 shrink-0 max-h-[75dvh] overflow-y-auto overscroll-contain scrollbar-thin">
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("Subtotal")}</span>
                  <div className="text-right tabular-nums">
                    {totalSavings > 0 && (
                      <span className="block text-xs text-slate-400 line-through dark:text-zinc-500">
                        {formatRupiah(originalSubtotal)}
                      </span>
                    )}
                    <span className="block text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>
                </div>

                {totalSavings > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>{t("Discount Savings")}</span>
                    <span>-{formatRupiah(totalSavings)}</span>
                  </div>
                )}

                <p>{t("Delivery is calculated at checkout.")}</p>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{t("Stock reserved atomically upon payment success.")}</span>
              </div>

              <button
                onClick={() => { closeCart(); router.push("/checkout"); }}
                className="w-full min-h-[44px] py-3.5 bg-[#52E394] hover:brightness-105 active:brightness-95 text-[#0A0B0E] font-semibold rounded-md text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
              >
                <span>{t("Continue to checkout")}</span>
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
