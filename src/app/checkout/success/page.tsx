"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Package,
  Calendar,
  CreditCard,
  FileText,
  MapPin,
  User,
  Phone,
  Mail,
  Cpu,
  Monitor,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/currency";

interface OrderSnapshot {
  orderNumber: string;
  paymentId: string;
  orderId?: string;
  paymentChannel?: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
  fulfillmentMethod?: "delivery" | "click_and_collect";
  shippingAddress?: {
    street: string;
    unit?: string;
    subdistrict: string;
    city: string;
    province: string;
    postalCode: string;
    deliveryNotes?: string;
  };
  courier?: {
    courierName: string;
    serviceName: string;
    price: number;
    etd: string;
  } | null;
  items?: {
    id: string;
    name: string;
    sku: string;
    brand: string;
    price: number;
    quantity: number;
    image?: string;
  }[];
  customPCs?: {
    id: string;
    name: string;
    totalPrice: number;
    serviceTier?: {
      name: string;
      price: number;
      leadTime: string;
    };
    parts?: any;
    isPrebuilt?: boolean;
    image?: string;
  }[];
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
  createdAt: string;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryOrderNumber = searchParams?.get("orderNumber") || "TET-2026-991204";
  const queryPaymentId = searchParams?.get("paymentId") || "MID-20260913-TRX748291";

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("tethera_last_order");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (!queryOrderNumber || parsed.orderNumber === queryOrderNumber)) {
            setOrder(parsed);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not read order from session storage:", err);
      }

      // Default fallback snapshot if visited directly via URL
      setOrder({
        orderNumber: queryOrderNumber,
        paymentId: queryPaymentId,
        paymentChannel: "qris",
        customer: {
          name: "Verified Customer",
          email: "customer@example.com",
          phone: "+62 812-3456-7890",
        },
        fulfillmentMethod: "click_and_collect",
        subtotal: 43199000,
        shippingFee: 0,
        grandTotal: 43199000,
        createdAt: new Date().toISOString(),
        customPCs: [
          {
            id: "pb-titan-ultra",
            name: "Tethera Titan Ultra",
            totalPrice: 43199000,
            isPrebuilt: true,
            serviceTier: {
              name: "Standard 24h Burn-In Verification",
              price: 0,
              leadTime: "Ready in 60 Mins",
            },
            parts: {
              cpu: { name: "AMD Ryzen 7 7800X3D" },
              gpu: { name: "NVIDIA GeForce RTX 4080 SUPER 16GB" },
              ram: { name: "Corsair Vengeance 32GB (2x16GB) DDR5-6000" },
              storage_primary: { name: "Samsung 990 PRO 2TB PCIe 4.0 NVMe SSD" },
              cooler: { name: "NZXT Kraken Elite 360 RGB Liquid Cooler" },
              case: { name: "Lian Li O11 Dynamic EVO RGB Black" },
              psu: { name: "Seasonic FOCUS GX-850 ATX 3.0 850W Gold" },
              os: { name: "Windows 11 Pro 64-bit USB Genuine" },
            },
          },
        ],
      });
    }
  }, [queryOrderNumber, queryPaymentId]);

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

  const currentOrder = order || {
    orderNumber: queryOrderNumber,
    paymentId: queryPaymentId,
    paymentChannel: "qris",
    customer: {
      name: "Valued Customer",
      email: "billing@tethera.com",
      phone: "+62 812-3456-7890",
    },
    fulfillmentMethod: "click_and_collect",
    subtotal: 0,
    shippingFee: 0,
    grandTotal: 0,
    createdAt: new Date().toISOString(),
  };

  const orderDate = new Date(currentOrder.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate DPP (Dasar Pengenaan Pajak) and PPN (11% included)
  const dpp = Math.round(currentOrder.grandTotal / 1.11);
  const ppn = currentOrder.grandTotal - dpp;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-8 sm:py-12 px-3 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* SUCCESS NOTIFICATION CARD (On-Screen Summary) */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 text-center shadow-xs space-y-4 no-print transition-colors">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-75">
            <CheckCircle className="w-9 h-9 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Midtrans Payment Settlement Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mt-2">
              Order Confirmed &amp; Stock Reserved!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
              Thank you for shopping at Tethera. Your transaction has been approved by Midtrans and our warehouse team is preparing your hardware.
            </p>
          </div>

          {/* Key Identifiers: Payment ID & Order Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            {/* Payment Reference ID */}
            <div className="p-4 rounded-2xl bg-slate-900 dark:bg-zinc-800/90 border border-transparent dark:border-zinc-700/80 text-white flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Midtrans Payment ID
                </span>
                <span className="font-mono font-black text-sm text-white tracking-wide">
                  {currentOrder.paymentId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(currentOrder.paymentId, "paymentId")}
                className="p-2 rounded-lg bg-slate-800 dark:bg-zinc-700 hover:bg-slate-700 dark:hover:bg-zinc-600 text-white transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                title="Copy Payment ID"
              >
                {copiedField === "paymentId" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                )}
              </button>
            </div>

            {/* Order Reference Number */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider block">
                  Order Reference Number
                </span>
                <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100 tracking-wide">
                  {currentOrder.orderNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(currentOrder.orderNumber, "orderNumber")}
                className="p-2 rounded-lg bg-white dark:bg-zinc-700/90 hover:bg-slate-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-600 min-w-[40px] min-h-[40px] flex items-center justify-center"
                title="Copy Order Number"
              >
                {copiedField === "orderNumber" ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OFFICIAL ITEMIZED TAX INVOICE (Print-Optimized) */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-6 print-only-invoice transition-colors">
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b border-slate-200 dark:border-zinc-800 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                <span className="text-base font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                  Official Tax Invoice / Faktur Pajak
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                PT Tethera Komputasi Presisi • NPWP: 01.345.678.9-021.000
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat 10730
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-md text-[11px] font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>PAID IN FULL</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-zinc-300 font-mono">Invoice: {currentOrder.orderNumber}</div>
              <div className="text-[11px] text-slate-400 dark:text-zinc-500">Date: {orderDate}</div>
            </div>
          </div>

          {/* Customer & Fulfillment Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-200 dark:border-zinc-800 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                Billed To
              </span>
              <div className="font-bold text-zinc-900 dark:text-zinc-100">{currentOrder.customer?.name || "Customer"}</div>
              <div className="text-slate-600 dark:text-zinc-300">{currentOrder.customer?.email}</div>
              <div className="text-slate-600 dark:text-zinc-300 font-mono">{currentOrder.customer?.phone}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                Fulfillment Mode
              </span>
              {currentOrder.fulfillmentMethod === "click_and_collect" ? (
                <div>
                  <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>In-Store Click &amp; Collect</span>
                  </div>
                  <div className="text-slate-600 dark:text-zinc-300 text-[11px] mt-0.5">
                    Flagship Store Mangga Dua Mall Lt. 3 No. 36
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                    Ready in 60 Minutes • Mon-Sat 09:00 - 18:00 WIB
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                    <span>Courier Delivery Dispatch</span>
                  </div>
                  <div className="text-slate-600 dark:text-zinc-300 text-[11px] mt-0.5">
                    {currentOrder.shippingAddress?.street}, {currentOrder.shippingAddress?.subdistrict},{" "}
                    {currentOrder.shippingAddress?.city} {currentOrder.shippingAddress?.postalCode}
                  </div>
                  {currentOrder.courier && (
                    <div className="text-slate-500 dark:text-zinc-400 font-semibold text-[11px]">
                      Courier: {currentOrder.courier.courierName} {currentOrder.courier.serviceName}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Purchased Hardware &amp; Services
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2 pr-3">Item Description</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 pl-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {/* Standard Components */}
                  {currentOrder.items?.map((it, idx) => (
                    <tr key={`item-${it.id}-${idx}`} className="group">
                      <td className="py-3 pr-3">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{it.name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                          SKU: {it.sku} • Brand: {it.brand}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-zinc-700 dark:text-zinc-300 font-semibold">
                        {it.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-zinc-400">
                        {formatRupiah(it.price)}
                      </td>
                      <td className="py-3 pl-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        {formatRupiah(it.price * it.quantity)}
                      </td>
                    </tr>
                  ))}

                  {/* Custom PCs / Prebuilt Systems */}
                  {currentOrder.customPCs?.map((pc, idx) => (
                    <tr key={`pc-${pc.id}-${idx}`} className="bg-slate-50/50 dark:bg-zinc-800/30">
                      <td className="py-3 pr-3">
                        <div className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{pc.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                            {pc.isPrebuilt ? "Turnkey Pre-Built" : "Custom Built"}
                          </span>
                        </div>
                        {pc.parts && (
                          <div className="mt-1 space-y-0.5 text-[11px] text-slate-500 dark:text-zinc-400 pl-5">
                            {pc.parts.cpu && <div>• CPU: {pc.parts.cpu.name}</div>}
                            {pc.parts.gpu && <div>• GPU: {pc.parts.gpu.name}</div>}
                            {pc.parts.ram && <div>• RAM: {pc.parts.ram.name}</div>}
                            {pc.parts.storage_primary && <div>• SSD: {pc.parts.storage_primary.name}</div>}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 pl-5">
                          Service: {pc.serviceTier?.name || "24h Prime95 Benchmarked"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-zinc-700 dark:text-zinc-300 font-semibold">1</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-zinc-400">
                        {formatRupiah(pc.totalPrice)}
                      </td>
                      <td className="py-3 pl-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        {formatRupiah(pc.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Totals & Tax Breakdown */}
          <div className="pt-4 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Gross Subtotal:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatRupiah(currentOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Fulfillment / Shipping:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {currentOrder.shippingFee > 0 ? formatRupiah(currentOrder.shippingFee) : "Free (Click & Collect)"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 dark:text-zinc-500 text-[11px] pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <span>Dasar Pengenaan Pajak (DPP):</span>
                  <span>{formatRupiah(dpp)}</span>
                </div>
                <div className="flex justify-between text-slate-400 dark:text-zinc-500 text-[11px]">
                  <span>PPN 11% (Included):</span>
                  <span>{formatRupiah(ppn)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-zinc-900 dark:text-zinc-100 pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">{formatRupiah(currentOrder.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Footnote */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 dark:text-zinc-500 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Official digital invoice issued pursuant to Indonesian tax regulations.</span>
            <span>Thank you for choosing Tethera Systems.</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FULFILLMENT & NEXT STEPS CARD */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-6 no-print transition-colors">
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 pb-3 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Fulfillment &amp; Delivery Dispatch</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Flagship Experience Store</span>
              </div>
              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                Mangga Dua Mall Lt. 3 No. 36, Jl. Mangga Dua Raya, Jakarta Pusat 10730. Open Mon-Sat 09:00 to 18:00 WIB.
              </p>
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded w-fit border border-emerald-200 dark:border-emerald-800/80">
                Ready in 60 Minutes
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                <Truck className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                <span>Automated Courier Dispatch</span>
              </div>
              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                Our warehouse initiates courier pickup automatically via Biteship API. You will receive live GPS tracking links via WhatsApp.
              </p>
              <div className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded w-fit border border-slate-300 dark:border-zinc-700">
                Protected with Wooden Packaging &amp; Insurance
              </div>
            </div>
          </div>

          {/* Electronic Notifications Reassurance */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Dual Receipt &amp; Notification Dispatched</span>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                An electronic tax invoice, warranty validation code, and order tracking link have been transmitted to your WhatsApp phone number and registered email address.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto py-3 px-6 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              <span>Print Tax Invoice</span>
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto py-3.5 px-8 bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 min-h-[44px]"
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
