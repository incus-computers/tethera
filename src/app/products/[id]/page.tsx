"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getProductOrPrebuiltById,
  MOCK_COMPONENTS,
  ComponentItem,
} from "../../../lib/data/mockHardware";
import { useCartStore } from "../../../lib/store/useCartStore";
import { useLocationStore } from "../../../lib/store/useLocationStore";
import { formatRupiah } from "../../../lib/utils/currency";
import { useBuilderStore, BuilderSlotKey } from "../../../lib/store/useBuilderStore";
import { WhatsAppInquiryButton } from "../../../components/whatsapp/WhatsAppInquiryButton";
import { DeliveryEstimatorWidget } from "../../../components/shipping/DeliveryEstimatorWidget";
import {
  ShieldCheck,
  Zap,
  Store,
  Truck,
  ArrowLeft,
  CheckCircle,
  Plus,
  ShoppingCart,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const product = getProductOrPrebuiltById(id);
  const { addStandardItem, addCustomPC, setFulfillmentMethod, fulfillmentMethod } = useCartStore();
  const { selectedRate } = useLocationStore();
  const { selectSlotItem } = useBuilderStore();

  const [selectedImage, setSelectedImage] = useState(0);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-zinc-900">Product Not Found</h1>
        <p className="text-sm text-slate-500 mt-2">
          The hardware component or system you requested is unavailable or has been archived.
        </p>
        <Link
          href="/components"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse All Components</span>
        </Link>
      </div>
    );
  }

  const isComponent = "slot" in product;
  const componentItem = isComponent ? (product as ComponentItem) : null;

  // Handle Add to Cart
  const handleAddToCart = () => {
    if (componentItem) {
      addStandardItem(componentItem);
    } else {
      // Prebuilt system
      addCustomPC({
        id: `pb-${Date.now()}`,
        name: product.name,
        parts: {},
        serviceTier: {
          name: "Standard 24h Burn-In Verification",
          price: 0,
          leadTime: "Ready in 60 Mins",
        },
        totalPrice: product.price,
        wattage: 650,
      });
    }
  };

  // Handle Configure in Builder
  const handleConfigureInBuilder = () => {
    if (componentItem && componentItem.slot) {
      selectSlotItem(componentItem.slot as BuilderSlotKey, componentItem);
      router.push("/builder");
    } else {
      router.push("/builder");
    }
  };

  // Related matching hardware
  const relatedComponents = MOCK_COMPONENTS.filter(
    (item) => item.id !== product.id && (isComponent ? item.category !== product.category : true)
  ).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* ========================================================================= */}
      {/* BREADCRUMB TRAIL */}
      {/* ========================================================================= */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/" className="hover:text-zinc-900 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <Link href="/components" className="hover:text-zinc-900 transition-colors">
          Components
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-600">{product.category}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-zinc-900 font-bold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* ========================================================================= */}
      {/* TOP SECTION: IMAGE GALLERY (LEFT) + SPECS & OMNICHANNEL CTA (RIGHT) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Product Visuals */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative rounded-3xl bg-white border border-slate-200 p-8 flex items-center justify-center min-h-[380px] sm:min-h-[460px] shadow-xs overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="max-h-[360px] max-w-full object-contain transition-transform duration-300 hover:scale-105"
            />

            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white px-2.5 py-1 rounded-md">
                {product.brand}
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                SKU: {product.sku}
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                In Stock at Flagship Experience Store ({product.stockCount} Available)
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Fulfillment */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>{product.brand}</span>
              <span>•</span>
              <span>{product.category}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight mt-1 leading-tight">
              {product.name}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">Manufacturer Part Number: {product.sku}</p>
          </div>

          {/* Pricing Row */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-baseline justify-between">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-zinc-900">{formatRupiah(product.price)}</div>
              <span className="text-xs text-slate-400 font-semibold">Tax included • Official Invoice Provided</span>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>2-Year Comprehensive Warranty</span>
              </span>
            </div>
          </div>

          {/* Omnichannel Click & Collect Hub Status */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Omnichannel Fulfillment Options</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-600">● Live Store Inventory</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentMethod("click_and_collect")}
                className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${
                  fulfillmentMethod === "click_and_collect"
                    ? "bg-white border-zinc-900 ring-1 ring-zinc-900 shadow-xs"
                    : "bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Click & Collect (FREE)</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Ready in <strong>60 Mins</strong> at Mangga Dua Store
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentMethod("delivery")}
                className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${
                  fulfillmentMethod === "delivery"
                    ? "bg-white border-zinc-900 ring-1 ring-zinc-900 shadow-xs"
                    : "bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                  <Truck className="w-3.5 h-3.5 text-zinc-800" />
                  <span>
                    Instant Courier {selectedRate ? `(${formatRupiah(selectedRate.price)})` : "(Gojek / Grab)"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {selectedRate
                    ? `${selectedRate.courierName} • ${selectedRate.etd}`
                    : "Calculate live rates by distance"}
                </span>
              </button>
            </div>

            {/* Delivery Estimator Widget (Gojek / Grab / Multi-courier) */}
            {fulfillmentMethod === "delivery" && (
              <div className="pt-2">
                <DeliveryEstimatorWidget
                  item={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    weightGrams: isComponent ? 1500 : 18000,
                    category: product.category,
                  }}
                />
              </div>
            )}

            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex items-center justify-between">
              <span>📍 Store: Mangga Dua Mall Lt. 3 No. 36 (Open til 6:00 PM)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                className="py-3.5 px-6 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Shopping Cart</span>
              </button>

              {isComponent && (
                <button
                  onClick={handleConfigureInBuilder}
                  className="py-3.5 px-6 bg-white hover:bg-slate-50 text-zinc-900 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs flex items-center justify-center gap-2"
                >
                  <Layers className="w-4 h-4 text-zinc-700" />
                  <span>Use in PC Builder</span>
                </button>
              )}
            </div>

            {/* Direct WhatsApp Inquiry */}
            <WhatsAppInquiryButton
              mode="product"
              product={{
                productName: product.name,
                sku: product.sku,
                price: formatRupiah(product.price),
                productUrl: typeof window !== "undefined" ? window.location.href : "https://tethera.com",
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs flex items-center justify-center gap-2"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TECHNICAL SPECIFICATIONS & COMPATIBILITY GUIDE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-slate-200">
        <div className="lg:col-span-8 space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hardware Architecture
            </span>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight mt-0.5">
              Technical Specifications
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
            {/* Standard specs from item */}
            <div className="grid grid-cols-3 py-3 px-4 text-xs">
              <span className="font-semibold text-slate-500">Manufacturer</span>
              <span className="col-span-2 font-bold text-zinc-900">{product.brand}</span>
            </div>
            <div className="grid grid-cols-3 py-3 px-4 text-xs bg-slate-50/50">
              <span className="font-semibold text-slate-500">Product SKU</span>
              <span className="col-span-2 font-mono text-zinc-900">{product.sku}</span>
            </div>
            <div className="grid grid-cols-3 py-3 px-4 text-xs">
              <span className="font-semibold text-slate-500">Hardware Category</span>
              <span className="col-span-2 font-medium text-zinc-800">{product.category}</span>
            </div>

            {/* Dynamic Specs based on product.specs */}
            {isComponent &&
              Object.entries(componentItem!.specs).map(([key, val], idx) => {
                if (!val) return null;
                const formattedKey = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase());

                return (
                  <div
                    key={key}
                    className={`grid grid-cols-3 py-3 px-4 text-xs ${idx % 2 === 0 ? "bg-slate-50/50" : ""}`}
                  >
                    <span className="font-semibold text-slate-500">{formattedKey}</span>
                    <span className="col-span-2 font-bold text-zinc-900">
                      {val.toString()} {key.toLowerCase().includes("watt") ? "Watts" : ""}
                    </span>
                  </div>
                );
              })}

            {/* Prebuilt Specs */}
            {!isComponent &&
              "specs" in product &&
              Object.entries((product as any).specs).map(([k, v], idx) => (
                <div
                  key={k}
                  className={`grid grid-cols-3 py-3 px-4 text-xs ${idx % 2 === 0 ? "bg-slate-50/50" : ""}`}
                >
                  <span className="font-semibold text-slate-500">{k}</span>
                  <span className="col-span-2 font-bold text-zinc-900">{v as string}</span>
                </div>
              ))}

            <div className="grid grid-cols-3 py-3 px-4 text-xs">
              <span className="font-semibold text-slate-500">Warranty Term</span>
              <span className="col-span-2 font-medium text-emerald-800">
                24 Months Return-To-Base Precision Care
              </span>
            </div>
            <div className="grid grid-cols-3 py-3 px-4 text-xs bg-slate-50/50">
              <span className="font-semibold text-slate-500">Warehouse Location</span>
              <span className="col-span-2 text-slate-600 font-medium">
                Flagship Store Aisle 3 / Holding Bin B-12
              </span>
            </div>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
              <Info className="w-4 h-4 text-zinc-700" />
              <span>Compatibility & Fitment Notes</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              All components sold by Tethera are factory-sealed brand new stock. If you are ordering for self-assembly, verify motherboards, cooling clearance, and power supply rating prior to assembly.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-zinc-900">Need Verification?</div>
              <p className="text-[11px] text-slate-500">
                Our technicians can verify your parts list on WhatsApp prior to ordering.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RELATED / SUGGESTED PAIRINGS */}
      {/* ========================================================================= */}
      <div className="pt-8 border-t border-slate-200 space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Suggested Pairings
          </span>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight mt-0.5">
            Matching Hardware & Components
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {relatedComponents.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.id}`}
              className="rounded-2xl bg-white border border-slate-200 overflow-hidden p-4 flex flex-col justify-between tethera-card-hover group"
            >
              <div>
                <div className="relative h-36 bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center p-2">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="max-h-full object-contain group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-white/90 px-2 py-0.5 rounded shadow-2xs text-slate-700">
                    {item.brand}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</div>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 line-clamp-2 mt-0.5 group-hover:text-zinc-700 transition-colors">
                  {item.name}
                </h4>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-base font-black text-zinc-900">{formatRupiah(item.price)}</div>
                <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900 flex items-center gap-1">
                  <span>View Specs</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
