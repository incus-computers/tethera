"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Trash2, ShoppingBag, CheckCircle, ShieldCheck, QrCode, ArrowRight, Store, Truck, MapPin, User } from "lucide-react";
import { useCartStore } from "../../lib/store/useCartStore";
import { useLocationStore } from "../../lib/store/useLocationStore";
import { useAuthStore } from "../../lib/store/useAuthStore";
import { formatRupiah } from "../../lib/utils/currency";

export function CartDrawer() {
  const { user, isAuthenticated } = useAuthStore();
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
  const { userLocation, selectedRate, openLocationModal } = useLocationStore();

  const handleProceedToCheckout = () => {
    closeCart();
    router.push("/checkout");
  };

  if (!isMounted || !isCartOpen) return null;

  const subtotal = getSubtotal();
  // Dynamic shipping fee in IDR based on user-selected Gojek/Grab courier rate
  const shippingFee = fulfillmentMethod === "delivery" ? (selectedRate ? selectedRate.price : 35000) : 0;
  const total = subtotal + shippingFee;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-zinc-900 shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Your Shopping Cart</h2>
              <span className="text-xs bg-slate-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold px-2 py-0.5 rounded-full">
                {items.length + customPCs.length}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg text-slate-400 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 && customPCs.length === 0 ? (
              /* Empty Cart */
              <div className="text-center py-16 text-slate-400 dark:text-zinc-500">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Your cart is currently empty</p>
                <p className="text-xs text-slate-400 dark:text-zinc-400 mt-1">Explore our PC parts or configure a custom gaming rig.</p>
              </div>
            ) : (
              /* Items List */
              <>
                {/* Omnichannel Fulfillment Switcher */}
                <div className="p-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2.5">
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                    <span>Fulfillment Method:</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">● Live Inventory</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFulfillmentMethod("click_and_collect")}
                      className={`p-2.5 rounded-lg text-left border text-xs font-semibold transition-all flex flex-col gap-1 ${
                        fulfillmentMethod === "click_and_collect"
                          ? "bg-white dark:bg-zinc-800 border-zinc-900 dark:border-zinc-400 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-900 dark:ring-zinc-400"
                          : "bg-slate-100 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Click & Collect</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">Pickup in 60m (Free)</span>
                    </button>

                    <button
                      onClick={() => setFulfillmentMethod("delivery")}
                      className={`p-2.5 rounded-lg text-left border text-xs font-semibold transition-all flex flex-col gap-1 ${
                        fulfillmentMethod === "delivery"
                          ? "bg-white dark:bg-zinc-800 border-zinc-900 dark:border-zinc-400 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-900 dark:ring-zinc-400"
                          : "bg-slate-100 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <Truck className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200" />
                        <span>Courier Delivery</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                        {selectedRate ? `${formatRupiah(selectedRate.price)} (${selectedRate.courierName})` : "Biteship Multi-Courier"}
                      </span>
                    </button>
                  </div>

                  {/* Delivery Location & Courier Details Banner */}
                  {fulfillmentMethod === "delivery" && (
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 font-bold text-zinc-800 dark:text-zinc-200 text-[11px] truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">
                            {selectedRate
                              ? `${selectedRate.courierName} ${selectedRate.serviceName}`
                              : "Biteship Partner Courier"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          To: <strong>{userLocation ? (userLocation.subdistrict || userLocation.city || userLocation.address.split(",")[0]) : "Jakarta Area (Not set)"}</strong>
                          {selectedRate && ` • ${selectedRate.etd}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openLocationModal}
                        className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline shrink-0 px-1 py-0.5"
                      >
                        {userLocation ? "Change" : "Set Location"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Custom PC Systems & Prebuilts in Cart */}
                {customPCs.map((pc) => (
                  <div
                    key={pc.id}
                    className="p-4 rounded-xl border border-zinc-900/20 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-800/80 space-y-3 relative"
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
                        <div className="min-w-0">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            pc.isPrebuilt ? "bg-emerald-700 dark:bg-emerald-600 text-white" : "bg-zinc-900 dark:bg-zinc-800 text-white dark:text-white border border-transparent dark:border-zinc-700"
                          }`}>
                            {pc.isPrebuilt ? "Turnkey Pre-Built" : "Custom PC System"}
                          </span>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-1.5 truncate">{pc.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-zinc-400">
                            {pc.serviceTier.name} ({pc.serviceTier.leadTime})
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeCustomPC(pc.id)}
                        className="text-slate-400 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 p-1 shrink-0"
                        aria-label="Remove PC"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-zinc-400">CPU:</span>
                        <strong className="truncate max-w-[180px] text-zinc-800 dark:text-zinc-200">{pc.parts.cpu?.name || "Configured"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-zinc-400">GPU:</span>
                        <strong className="truncate max-w-[180px] text-zinc-800 dark:text-zinc-200">{pc.parts.gpu?.name || "Integrated"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-zinc-400">Memory:</span>
                        <strong className="truncate max-w-[180px] text-zinc-800 dark:text-zinc-200">{pc.parts.ram?.name || "Configured"}</strong>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-zinc-700">
                      <span className="text-xs text-slate-500 dark:text-zinc-400">Estimated Draw: ~{pc.wattage}W</span>
                      <span className="text-base font-black text-zinc-900 dark:text-zinc-100">{formatRupiah(pc.totalPrice)}</span>
                    </div>
                  </div>
                ))}

                {/* Standard Items */}
                {items.map((cartItem) => (
                  <div
                    key={cartItem.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/90 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="relative w-12 h-12 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden p-1 shrink-0 item-frame">
                      <Image
                        src={cartItem.item.image}
                        alt={cartItem.item.name}
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{cartItem.item.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        {/* Quantity Stepper */}
                        <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors font-bold text-xs"
                            title="Decrease quantity"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black text-zinc-900 dark:text-zinc-100 select-none">
                            {cartItem.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors font-bold text-xs"
                            title="Increase quantity"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-400">
                          {formatRupiah(cartItem.item.price)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                      <div className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                        {formatRupiah(cartItem.item.price * cartItem.quantity)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(cartItem.id)}
                        className="text-slate-400 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 text-xs p-1 rounded transition-colors"
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {(items.length > 0 || customPCs.length > 0) && (
            <div className="p-6 bg-slate-50 dark:bg-zinc-950/90 border-t border-slate-200 dark:border-zinc-800 space-y-4">
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Fulfillment (
                    {fulfillmentMethod === "click_and_collect"
                      ? "Click & Collect"
                      : selectedRate
                      ? `${selectedRate.courierName} ${selectedRate.serviceName}`
                      : "Delivery"}
                    )
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {shippingFee === 0 ? "FREE" : formatRupiah(shippingFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-zinc-900 dark:text-white pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <span>Total Due</span>
                  <span className="text-lg">{formatRupiah(total)}</span>
                </div>
              </div>

              {/* Customer Account & Delivery Recipient Info */}
              {isAuthenticated && user ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-bold truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Checkout as: {user.fullName}</span>
                    </div>
                    <div className="text-[10px] text-emerald-800 dark:text-emerald-300 truncate mt-0.5">
                      {user.phone} • {user.address.subdistrict}, {user.address.city}
                    </div>
                  </div>
                  <Link
                    href="/account"
                    onClick={closeCart}
                    className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 underline shrink-0 ml-2"
                  >
                    Edit
                  </Link>
                </div>
              ) : (
                <Link
                  href="/auth"
                  onClick={closeCart}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-between transition-colors group"
                >
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      Sign In or Register Profile
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Save shipping address & claim 10% welcome voucher
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors" />
                </Link>
              )}

              <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Stock reserved atomically upon payment success.</span>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
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
