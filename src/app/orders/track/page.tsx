"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface OrderTrackingData {
  orderNumber: string;
  status: string;
  fulfillmentType: "delivery" | "click_and_collect";
  createdAt: string;
  paidAt?: string | null;
  pickupCode?: string | null;
  pickupStore?: {
    name: string;
    address: string;
    hours: string;
    phone: string;
  } | null;
  shippingAddress?: {
    city: string;
    province: string;
    subdistrict: string;
    postalCode: string;
  } | null;
  courierInfo?: {
    provider: string;
    courierCompany?: string;
    serviceName: string;
    waybillId?: string;
    trackingId?: string;
    trackingUrl?: string;
    status: string;
    driverName?: string;
    vehiclePlate?: string;
    estimatedArrival?: string;
    statusHistory: Array<{
      status: string;
      note?: string;
      updated_at: string;
    }>;
  } | null;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isCustomBuild: boolean;
  }>;
  subtotal: number;
  shippingFee: number;
  total: number;
  trackingToken: string;
}

const ORDER_STAGES = [
  { key: "received", label: "Order Received", desc: "Placed & awaiting verification" },
  { key: "confirmed", label: "Payment Confirmed", desc: "Funds verified & stock reserved" },
  { key: "processing", label: "In Fulfillment", desc: "Hardware picking & bench testing" },
  { key: "dispatched", label: "En Route / Ready", desc: "Handed to courier or ready at store" },
  { key: "delivered", label: "Completed", desc: "Delivered to address or collected" },
];

function getStageIndex(status: string, fulfillmentType: string): number {
  switch (status) {
    case "order_received":
    case "pending_payment":
      return 0;
    case "order_accepted":
    case "payment_received":
      return 1;
    case "finding_stock":
    case "assembly_in_progress":
    case "testing_bench":
    case "ready_for_dispatch":
      return 2;
    case "finding_courier":
    case "dispatched":
    case "on_delivery":
    case "ready_for_pickup":
      return 3;
    case "delivered":
    case "collected":
    case "finished":
      return 4;
    default:
      return 1;
  }
}

function OrderTrackerContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [orderData, setOrderData] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Auto-fetch if token query param exists in URL
  useEffect(() => {
    if (tokenFromUrl) {
      fetchOrderByToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  async function fetchOrderByToken(token: string) {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/orders/track?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Order lookup failed.");
      }
      setOrderData(data.order);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load order. Check your link or enter details manually.");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumberInput.trim() || !emailInput.trim()) {
      setErrorMessage("Please enter both Order Number and Customer Email.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumberInput.trim(),
          email: emailInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No order found matching these credentials.");
      }
      setOrderData(data.order);
    } catch (err: any) {
      setErrorMessage(err.message || "Order verification failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyShareLink() {
    if (!orderData?.trackingToken) return;
    const shareUrl = `${window.location.origin}/orders/track?token=${orderData.trackingToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleCopyPin() {
    if (!orderData?.pickupCode) return;
    navigator.clipboard.writeText(orderData.pickupCode);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  }

  const currentStageIndex = orderData
    ? getStageIndex(orderData.status, orderData.fulfillmentType)
    : 0;

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Customer Self-Service Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Live Order & Delivery Tracking
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors min-h-[44px] px-3 py-2 rounded-lg border border-white/10 hover:border-white/20"
          >
            <span>Back to Storefront</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Search / Lookup Form */}
        {!orderData && (
          <div className="bg-[#0D111A] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-2">
              Track Your Purchase as a Guest
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Enter your Tethera Order Number (e.g. TET-20261105-1234) and the email address used during checkout to inspect real-time courier dispatch or collection pickup codes.
            </p>

            <form onSubmit={handleManualSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                    Order Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TET-20261105-XXXX"
                    value={orderNumberInput}
                    onChange={(e) => setOrderNumberInput(e.target.value)}
                    className="w-full bg-[#141A26] border border-white/15 focus:border-sky-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="customer@domain.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-[#141A26] border border-white/15 focus:border-sky-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm transition-all min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Record...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Find Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Order Details View */}
        {orderData && (
          <div className="space-y-6">
            {/* Top Bar Summary */}
            <div className="bg-[#0D111A] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Order Ref
                  </span>
                  <span className="text-xl font-mono font-bold text-white">
                    {orderData.orderNumber}
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 uppercase tracking-wide">
                    {orderData.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Placed on {new Date(orderData.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors min-h-[44px]"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Direct Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setOrderData(null);
                    setOrderNumberInput("");
                    setEmailInput("");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors min-h-[44px]"
                >
                  <span>Track Another</span>
                </button>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="bg-[#0D111A] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">
                Fulfillment Trajectory
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
                {ORDER_STAGES.map((stage, idx) => {
                  const isCompleted = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div
                      key={stage.key}
                      className={`relative flex sm:flex-col items-start gap-3 sm:gap-2 p-3 sm:p-0 rounded-xl ${
                        isCurrent
                          ? "bg-sky-500/5 sm:bg-transparent border border-sky-500/20 sm:border-0"
                          : ""
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                          isCompleted
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            : isCurrent
                            ? "bg-sky-500 text-slate-950 border-sky-400 font-bold animate-pulse"
                            : "bg-white/5 border-white/10 text-slate-500"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span className="text-xs">{idx + 1}</span>
                        )}
                      </div>

                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            isCurrent
                              ? "text-sky-400"
                              : isCompleted
                              ? "text-white"
                              : "text-slate-400"
                          }`}
                        >
                          {stage.label}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                          {stage.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Specialized Fulfillment Cards */}
            {orderData.fulfillmentType === "click_and_collect" ? (
              /* Click & Collect Card */
              <div className="bg-[#0D111A] border border-amber-500/30 rounded-2xl p-6 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Store className="w-4 h-4" />
                  <span>In-Store Click & Collect Pickup Bay</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">
                      Secret 4-Digit Collection PIN
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-white bg-black/40 px-4 py-2 rounded-xl border border-white/15">
                        {orderData.pickupCode || "PENDING"}
                      </div>
                      {orderData.pickupCode && (
                        <button
                          onClick={handleCopyPin}
                          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-colors min-h-[44px]"
                          title="Copy PIN"
                        >
                          {copiedPin ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Present this 4-digit code and a valid identity document at the collection counter.
                    </p>
                  </div>

                  {orderData.pickupStore && (
                    <div className="text-xs text-slate-300 space-y-1 bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="font-semibold text-white flex items-center gap-1.5 mb-1 text-sm">
                        <MapPin className="w-4 h-4 text-amber-400" />
                        <span>{orderData.pickupStore.name}</span>
                      </div>
                      <div>{orderData.pickupStore.address}</div>
                      <div>Trading Hours: {orderData.pickupStore.hours}</div>
                      <div>Phone: {orderData.pickupStore.phone}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Courier Delivery Card */
              <div className="bg-[#0D111A] border border-sky-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Truck className="w-4 h-4" />
                  <span>Courier Delivery Tracking</span>
                </div>

                {orderData.courierInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-2 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-400">Carrier Service: </span>
                        <span className="text-white font-semibold">
                          {orderData.courierInfo.serviceName}
                        </span>
                      </div>
                      {orderData.courierInfo.waybillId && (
                        <div>
                          <span className="text-slate-400">Air Waybill (AWB): </span>
                          <span className="font-mono text-white font-semibold">
                            {orderData.courierInfo.waybillId}
                          </span>
                        </div>
                      )}
                      {orderData.courierInfo.driverName && (
                        <div>
                          <span className="text-slate-400">Driver / Plate: </span>
                          <span className="text-white font-semibold">
                            {orderData.courierInfo.driverName}{" "}
                            {orderData.courierInfo.vehiclePlate
                              ? `(${orderData.courierInfo.vehiclePlate})`
                              : ""}
                          </span>
                        </div>
                      )}
                      {orderData.courierInfo.estimatedArrival && (
                        <div>
                          <span className="text-slate-400">ETA: </span>
                          <span className="text-emerald-400 font-semibold">
                            {orderData.courierInfo.estimatedArrival}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      {orderData.courierInfo.trackingUrl && (
                        <a
                          href={orderData.courierInfo.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
                        >
                          <span>Open Live Carrier Map</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-3">
                    Logistics allocation is being prepared by our Mangga Dua fulfillment center. Courier dispatch details and live tracking links will be populated shortly.
                  </div>
                )}
              </div>
            )}

            {/* Line Items & Total */}
            <div className="bg-[#0D111A] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Order Items Summary
              </h3>

              <div className="divide-y divide-white/5">
                {orderData.items.map((item, i) => (
                  <div
                    key={i}
                    className="py-3 flex items-center justify-between gap-4 text-xs sm:text-sm"
                  >
                    <div>
                      <div className="font-semibold text-white">{item.name}</div>
                      {item.sku && (
                        <div className="text-[11px] font-mono text-slate-500">
                          SKU: {item.sku}
                        </div>
                      )}
                      <div className="text-slate-400">
                        Qty: {item.quantity} x Rp {item.unitPrice.toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-white text-right">
                      Rp {item.totalPrice.toLocaleString("id-ID")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">
                    Rp {orderData.subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Shipping & Delivery Fee</span>
                  <span className="font-mono text-white">
                    {orderData.shippingFee === 0
                      ? "FREE"
                      : `Rp ${orderData.shippingFee.toLocaleString("id-ID")}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
                  <span>Grand Total</span>
                  <span className="font-mono text-sky-400">
                    Rp {orderData.total.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderTrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090E] flex items-center justify-center text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading tracking system...</span>
          </div>
        </div>
      }
    >
      <OrderTrackerContent />
    </Suspense>
  );
}
