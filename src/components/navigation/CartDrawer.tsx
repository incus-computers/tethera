"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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

  const { userLocation, selectedRate, openLocationModal } = useLocationStore();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderNumber: string;
    pickupCode: string;
    method: "click_and_collect" | "delivery";
    total: number;
  } | null>(null);

  if (!isMounted || !isCartOpen) return null;

  const subtotal = getSubtotal();
  // Dynamic shipping fee in IDR based on user-selected Gojek/Grab courier rate
  const shippingFee = fulfillmentMethod === "delivery" ? (selectedRate ? selectedRate.price : 35000) : 0;
  const total = subtotal + shippingFee;

  const handleSimulatePayment = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      const orderNum = `TET-${Math.floor(100000 + Math.random() * 900000)}`;
      const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
      setCompletedOrder({
        orderNumber: orderNum,
        pickupCode: pin,
        method: fulfillmentMethod,
        total,
      });
      clearCart();
      setIsCheckingOut(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-zinc-900" />
              <h2 className="text-base font-bold text-zinc-900">Your Shopping Cart</h2>
              <span className="text-xs bg-slate-200 text-zinc-700 font-semibold px-2 py-0.5 rounded-full">
                {items.length + customPCs.length}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg text-slate-400 hover:text-zinc-800 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {completedOrder ? (
              /* Success Screen */
              <div className="space-y-6 text-center py-6 animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Payment Succeeded
                  </span>
                  <h3 className="text-xl font-black text-zinc-900 mt-2">Order Confirmed!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Order Ref: <strong>#{completedOrder.orderNumber}</strong>
                  </p>
                </div>

                {completedOrder.method === "click_and_collect" ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Click & Collect PIN</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        Ready at Counter
                      </span>
                    </div>
                    <div className="text-center py-3 bg-zinc-900 text-white rounded-xl">
                      <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                        Verification PIN
                      </div>
                      <div className="text-4xl font-black tracking-widest mt-1">
                        {completedOrder.pickupCode}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>📍 <strong>Tethera Store - Mangga Dua Mall</strong></p>
                      <p>🏢 Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat</p>
                      <p>🕒 Mon-Sat 9:00 AM – 6:00 PM</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>This PIN & collection barcode have been sent to your WhatsApp and Email.</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Courier Dispatch</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                        {selectedRate ? `${selectedRate.courierName}` : "Biteship Logistics"}
                      </span>
                    </div>
                    <div className="text-center py-3 bg-zinc-900 text-white rounded-xl">
                      <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                        Biteship Waybill / Resi (AWB)
                      </div>
                      <div className="text-xl font-mono font-black tracking-wider mt-1 text-cyan-300">
                        {selectedRate
                          ? `${selectedRate.courierId.toUpperCase()}-${completedOrder.orderNumber.replace("TET-", "")}BIT`
                          : `BIT-${completedOrder.orderNumber.replace("TET-", "")}`}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>📍 <strong>Origin:</strong> Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat</p>
                      {userLocation && (
                        <p>🎯 <strong>Destination:</strong> {userLocation.subdistrict ? `${userLocation.subdistrict}, ${userLocation.city || ""}` : userLocation.address}</p>
                      )}
                      <p>⏱️ <strong>ETA:</strong> {selectedRate?.etd ? `${selectedRate.etd}` : "1-2 business days"}</p>
                      <p>📦 <strong>Courier Service:</strong> {selectedRate ? `${selectedRate.serviceName} (${selectedRate.courierName})` : "Biteship Partner Courier"}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Official Waybill tracking resi has been sent to your WhatsApp and Email.</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setCompletedOrder(null)}
                  className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  Continue Shopping
                </button>
              </div>
            ) : items.length === 0 && customPCs.length === 0 ? (
              /* Empty Cart */
              <div className="text-center py-16 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-zinc-700">Your cart is currently empty</p>
                <p className="text-xs text-slate-400 mt-1">Explore our PC parts or configure a custom gaming rig.</p>
              </div>
            ) : (
              /* Items List */
              <>
                {/* Omnichannel Fulfillment Switcher */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                    <span>Fulfillment Method:</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">● Live Inventory</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFulfillmentMethod("click_and_collect")}
                      className={`p-2.5 rounded-lg text-left border text-xs font-semibold transition-all flex flex-col gap-1 ${
                        fulfillmentMethod === "click_and_collect"
                          ? "bg-white border-zinc-900 text-zinc-900 shadow-sm ring-1 ring-zinc-900"
                          : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Click & Collect</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Pickup in 60m (Free)</span>
                    </button>

                    <button
                      onClick={() => setFulfillmentMethod("delivery")}
                      className={`p-2.5 rounded-lg text-left border text-xs font-semibold transition-all flex flex-col gap-1 ${
                        fulfillmentMethod === "delivery"
                          ? "bg-white border-zinc-900 text-zinc-900 shadow-sm ring-1 ring-zinc-900"
                          : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <Truck className="w-3.5 h-3.5 text-zinc-800" />
                        <span>Courier Delivery</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {selectedRate ? `${formatRupiah(selectedRate.price)} (${selectedRate.courierName})` : "Biteship Multi-Courier"}
                      </span>
                    </button>
                  </div>

                  {/* Delivery Location & Courier Details Banner */}
                  {fulfillmentMethod === "delivery" && (
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 font-bold text-zinc-800 text-[11px] truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">
                            {selectedRate
                              ? `${selectedRate.courierName} ${selectedRate.serviceName}`
                              : "Biteship Partner Courier"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          To: <strong>{userLocation ? (userLocation.subdistrict || userLocation.city || userLocation.address.split(",")[0]) : "Jakarta Area (Not set)"}</strong>
                          {selectedRate && ` • ${selectedRate.etd}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openLocationModal}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline shrink-0 px-1 py-0.5"
                      >
                        {userLocation ? "Change" : "Set Location"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Custom PC Systems in Cart */}
                {customPCs.map((pc) => (
                  <div
                    key={pc.id}
                    className="p-4 rounded-xl border border-zinc-900/20 bg-slate-50/70 space-y-3 relative"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white px-2 py-0.5 rounded">
                          Custom PC System
                        </span>
                        <h4 className="text-sm font-bold text-zinc-900 mt-1.5">{pc.name}</h4>
                        <p className="text-xs text-slate-500">
                          {pc.serviceTier.name} ({pc.serviceTier.leadTime})
                        </p>
                      </div>
                      <button
                        onClick={() => removeCustomPC(pc.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        aria-label="Remove PC"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex justify-between">
                        <span>CPU:</span>
                        <strong className="truncate max-w-[180px]">{pc.parts.cpu?.name || "None"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>GPU:</span>
                        <strong className="truncate max-w-[180px]">{pc.parts.gpu?.name || "Integrated"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory:</span>
                        <strong className="truncate max-w-[180px]">{pc.parts.ram?.name || "None"}</strong>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="text-xs text-slate-500">Estimated Draw: ~{pc.wattage}W</span>
                      <span className="text-base font-black text-zinc-900">{formatRupiah(pc.totalPrice)}</span>
                    </div>
                  </div>
                ))}

                {/* Standard Items */}
                {items.map((cartItem) => (
                  <div
                    key={cartItem.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center p-1 shrink-0">
                      <img src={cartItem.item.image} alt={cartItem.item.name} className="w-full h-full object-cover rounded" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">{cartItem.item.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        {/* Quantity Stepper */}
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-zinc-900 hover:bg-slate-200 transition-colors font-bold text-xs"
                            title="Decrease quantity"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black text-zinc-900 select-none">
                            {cartItem.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-zinc-900 hover:bg-slate-200 transition-colors font-bold text-xs"
                            title="Increase quantity"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatRupiah(cartItem.item.price)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                      <div className="text-xs font-black text-zinc-900">
                        {formatRupiah(cartItem.item.price * cartItem.quantity)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(cartItem.id)}
                        className="text-slate-400 hover:text-red-500 text-xs p-1 rounded transition-colors"
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
          {!completedOrder && (items.length > 0 || customPCs.length > 0) && (
            <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900">{formatRupiah(subtotal)}</span>
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
                  <span className="font-semibold text-zinc-900">
                    {shippingFee === 0 ? "FREE" : formatRupiah(shippingFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-zinc-900 pt-2 border-t border-slate-200">
                  <span>Total Due</span>
                  <span className="text-lg">{formatRupiah(total)}</span>
                </div>
              </div>

              {/* Customer Account & Delivery Recipient Info */}
              {isAuthenticated && user ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-bold truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Checkout as: {user.fullName}</span>
                    </div>
                    <div className="text-[10px] text-emerald-800 truncate mt-0.5">
                      {user.phone} • {user.address.subdistrict}, {user.address.city}
                    </div>
                  </div>
                  <Link
                    href="/account"
                    onClick={closeCart}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline shrink-0 ml-2"
                  >
                    Edit
                  </Link>
                </div>
              ) : (
                <Link
                  href="/auth"
                  onClick={closeCart}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-zinc-800 flex items-center justify-between transition-colors group"
                >
                  <div>
                    <span className="font-bold text-zinc-900 block group-hover:text-emerald-700 transition-colors">
                      Sign In or Register Profile
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Save shipping address & claim 10% welcome voucher
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-700 transition-colors" />
                </Link>
              )}

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Stock reserved atomically upon payment success.</span>
              </div>

              <button
                onClick={handleSimulatePayment}
                disabled={isCheckingOut}
                className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCheckingOut ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing Payment & Reserving Stock...
                  </span>
                ) : (
                  <>
                    <span>Confirm & Pay {formatRupiah(total)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
