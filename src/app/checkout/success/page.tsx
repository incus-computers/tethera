"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  ShieldCheck,
  Printer,
  ArrowRight,
  Store,
  Truck,
  Copy,
  Check,
  ShoppingBag,
  ExternalLink,
  Package,
  Calendar,
  CreditCard,
  Building,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/currency";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderNumber = searchParams?.get("orderNumber") || "TET-2026-991204";
  const paymentId = searchParams?.get("paymentId") || "MID-20260913-TRX748291";

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Success Banner Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-75">
            <CheckCircle className="w-9 h-9 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Midtrans Payment Settlement Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight mt-2">
              Order Confirmed & Stock Reserved!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Thank you for shopping at Tethera. Your transaction has been approved by Midtrans and our warehouse team is preparing your hardware.
            </p>
          </div>

          {/* Key Identifiers: Payment ID & Order Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left">
            {/* Payment Reference ID */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Midtrans Payment ID
                </span>
                <span className="font-mono font-black text-sm text-white tracking-wide">
                  {paymentId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(paymentId, "paymentId")}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="Copy Payment ID"
              >
                {copiedField === "paymentId" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>

            {/* Order Reference Number */}
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Order Reference Number
                </span>
                <span className="font-mono font-black text-sm text-zinc-900 tracking-wide">
                  {orderNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(orderNumber, "orderNumber")}
                className="p-2 rounded-lg bg-white hover:bg-slate-200 text-zinc-700 transition-colors border border-slate-200"
                title="Copy Order Number"
              >
                {copiedField === "orderNumber" ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Fulfillment & Next Steps Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Fulfillment & Delivery Dispatch</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Flagship Experience Store</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Mangga Dua Mall Lt. 3 No. 36, Jl. Mangga Dua Raya, Jakarta Pusat 10730. Open Mon-Sat 09:00 - 18:00 WIB.
              </p>
              <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-200">
                Ready in 60 Minutes
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                <Truck className="w-4 h-4 text-zinc-800" />
                <span>Automated Courier Dispatch</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Our warehouse initiates courier pickup automatically via Biteship API. You will receive live GPS tracking links via WhatsApp.
              </p>
              <div className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded w-fit border border-slate-300">
                Protected with Wooden Packaging & Insurance
              </div>
            </div>
          </div>

          {/* Electronic Notifications Reassurance */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Dual Receipt & Notification Dispatched</span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                An electronic tax invoice, warranty validation code, and order tracking link have been transmitted to your WhatsApp phone number and registered email address.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto py-3 px-6 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-zinc-800 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-zinc-600" />
              <span>Print Tax Invoice</span>
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto py-3.5 px-8 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Back to Store</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading Order Confirmation...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}

