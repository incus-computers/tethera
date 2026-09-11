"use client";

import React, { useState } from "react";
import {
  Cpu,
  Layers,
  HardDrive,
  Monitor,
  Fan,
  Box,
  Zap,
  Disc,
  Wrench,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Share2,
  ShoppingCart,
  MessageSquare,
  ShieldCheck,
  Plus,
  Store,
} from "lucide-react";
import { useBuilderStore, BuilderSlotKey } from "../../lib/store/useBuilderStore";
import { SERVICE_TIERS } from "../../lib/data/mockHardware";
import { ComponentSelectModal } from "./ComponentSelectModal";
import { useCartStore } from "../../lib/store/useCartStore";
import { WhatsAppInquiryButton } from "../whatsapp/WhatsAppInquiryButton";
import { formatRupiah } from "../../lib/utils/currency";

export function PCBuilderView() {
  const [activeSlot, setActiveSlot] = useState<BuilderSlotKey | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const {
    slots,
    removeSlotItem,
    selectedService,
    setServiceTier,
    resetBuild,
    getWattage,
    getTotalPrice,
    getCompatibility,
    getBuildShareUrl,
  } = useBuilderStore();

  const { addCustomPC } = useCartStore();

  const { estimated, recommendedPsu } = getWattage();
  const totalPrice = getTotalPrice();
  const compatibility = getCompatibility();

  const slotDefinitions: {
    key: BuilderSlotKey;
    name: string;
    description: string;
    icon: React.ReactNode;
    required: boolean;
  }[] = [
    {
      key: "cpu",
      name: "Processor (CPU)",
      description: "AMD Ryzen AM5 or Intel Core Ultra",
      icon: <Cpu className="w-5 h-5" />,
      required: true,
    },
    {
      key: "motherboard",
      name: "Motherboard",
      description: "Socket & chipset matching your chosen CPU",
      icon: <Layers className="w-5 h-5" />,
      required: true,
    },
    {
      key: "ram",
      name: "Memory (RAM)",
      description: "DDR5 high-speed dual channel kits",
      icon: <HardDrive className="w-5 h-5" />,
      required: true,
    },
    {
      key: "gpu",
      name: "Graphics Card (GPU)",
      description: "NVIDIA GeForce RTX 40-Series or AMD Radeon",
      icon: <Monitor className="w-5 h-5" />,
      required: false,
    },
    {
      key: "cooler",
      name: "CPU Cooling",
      description: "AIO liquid cooling or high-efficiency air tower",
      icon: <Fan className="w-5 h-5" />,
      required: true,
    },
    {
      key: "storage_primary",
      name: "Primary Storage (M.2 NVMe SSD)",
      description: "PCIe 4.0 / 5.0 high-speed NVMe boot drive",
      icon: <HardDrive className="w-5 h-5" />,
      required: true,
    },
    {
      key: "case",
      name: "PC Chassis / Case",
      description: "Chassis form factor with optimized thermal airflow",
      icon: <Box className="w-5 h-5" />,
      required: true,
    },
    {
      key: "psu",
      name: "Power Supply (PSU)",
      description: "80+ Gold ATX 3.0 certified modular power",
      icon: <Zap className="w-5 h-5" />,
      required: true,
    },
    {
      key: "os",
      name: "Operating System",
      description: "Genuine Windows 11 USB flash drive & license",
      icon: <Disc className="w-5 h-5" />,
      required: false,
    },
  ];

  const handleShare = () => {
    const url = getBuildShareUrl();
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleAddToCart = () => {
    const partsMap: any = {};
    Object.entries(slots).forEach(([k, item]) => {
      if (item) partsMap[k] = item;
    });

    addCustomPC({
      id: `custom-pc-${Date.now()}`,
      name: slots.cpu ? `${slots.cpu.brand} Custom Gaming Rig` : "Custom Configured System",
      parts: partsMap,
      serviceTier: {
        name: selectedService.name,
        price: selectedService.price,
        leadTime: selectedService.leadTime,
      },
      totalPrice,
      wattage: estimated,
    });
  };

  const filledCount = Object.values(slots).filter((v) => v !== null).length;
  const wattagePct = Math.min(100, Math.round((estimated / (slots.psu?.specs.wattage || 850)) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 bg-slate-200/80 px-2.5 py-0.5 rounded">
              Tethera Precision Studio
            </span>
            <span className="text-xs text-slate-400 font-medium">Auto-Compatibility Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Custom PC Builder & Configurator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Configure your custom desktop system with real-time socket matching, clearance validation, and in-store Click & Collect fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-zinc-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs tactile-btn active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedUrl ? "Link Copied!" : "Share Build"}</span>
          </button>
          <button
            onClick={resetBuild}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-red-600 text-xs font-bold transition-all flex items-center gap-1.5 tactile-btn active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Slots (Left 65%) + Control Hub (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Slots Accordion / Rack */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-3">
          {slotDefinitions.map((def, idx) => {
            const currentItem = slots[def.key];

            return (
              <div
                key={def.key}
                style={{ animationDelay: `${idx * 45}ms` }}
                className={`rounded-2xl border transition-all duration-200 animate-pop-in ${
                  currentItem
                    ? "bg-white border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md hover:scale-[1.008]"
                    : "bg-slate-50/70 border-dashed border-slate-300 hover:bg-white hover:border-zinc-400 hover:shadow-sm"
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Slot Identifier & Content */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        currentItem
                          ? "bg-zinc-900 text-white shadow-xs"
                          : "bg-white text-slate-400 border border-slate-200"
                      }`}
                    >
                      {def.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Step {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-zinc-900">
                          {def.name}
                        </span>
                        {def.required && !currentItem && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                            Required
                          </span>
                        )}
                      </div>

                      {currentItem ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-semibold text-zinc-800 truncate">
                            {currentItem.name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({currentItem.sku})
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {def.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Price */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0">
                    {currentItem ? (
                      <>
                        <div className="text-left sm:text-right">
                          <div className="text-sm sm:text-base font-black text-zinc-900">
                            {formatRupiah(currentItem.price)}
                          </div>
                          <div className="text-[10px] text-emerald-600 font-medium">
                            Flagship In Stock
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setActiveSlot(def.key)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold text-xs transition-colors tactile-btn active:scale-95"
                          >
                            Change
                          </button>
                          <button
                            onClick={() => removeSlotItem(def.key)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors tactile-btn active:scale-90"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => setActiveSlot(def.key)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-zinc-900 text-zinc-800 hover:text-white border border-slate-300 hover:border-zinc-900 font-bold text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5 tactile-btn active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select {def.name.split(" ")[0]}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Assembly & Testing Tier Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-zinc-800">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Assembly, Tuning & Stress-Testing Service</h3>
                <p className="text-xs text-slate-500">Every system built by Tethera undergoes thorough quality assurance</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SERVICE_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setServiceTier(tier)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 tactile-btn active:scale-98 ${
                    selectedService.id === tier.id
                      ? "bg-slate-50 border-zinc-900 ring-1 ring-zinc-900 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-zinc-900">{tier.name}</span>
                      <span className="text-xs font-black text-zinc-900">
                        {tier.price === 0 ? "FREE" : formatRupiah(tier.price)}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1.5 inline-block">
                      {tier.leadTime}
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-500 space-y-1">
                    {tier.features.slice(0, 2).map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <span className="text-emerald-500">✓</span> {feat}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Live Technical Station & Summary (Sticky) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 sticky top-28 space-y-4">
          {/* Main Price & Action Card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-6 space-y-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                Estimated System Total
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
                  {formatRupiah(totalPrice)}
                </span>
                <span className="text-xs text-slate-400 font-semibold">incl. tax</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {filledCount} of 9 components configured
              </p>
            </div>

            {/* Live Wattage Meter */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Estimated Power Draw</span>
                </div>
                <span className="font-mono font-bold text-zinc-900">
                  {estimated}W <span className="text-slate-400">/ {slots.psu?.specs.wattage || 850}W PSU</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    wattagePct > 85 ? "bg-red-500" : wattagePct > 65 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${wattagePct}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Recommended PSU: <strong>{recommendedPsu}W+</strong></span>
                <span>Load: <strong>{wattagePct}%</strong></span>
              </div>
            </div>

            {/* Compatibility Alert Box */}
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                compatibility.isCompatible
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : "bg-red-50/70 border-red-200 text-red-900"
              }`}
            >
              {compatibility.isCompatible ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Hardware Compatibility: 100% Verified</strong>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      No socket, dimension, or power conflicts detected.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-bold">Compatibility Attention Required:</strong>
                    {compatibility.issues.map((iss, i) => (
                      <p key={i} className="text-[11px] text-red-700">{iss}</p>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Omnichannel Click & Collect Guarantee */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <Store className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-zinc-900">Click & Collect Eligible</div>
                <div className="text-slate-500 text-[11px]">
                  Pick up at Flagship Experience Store after {selectedService.leadTime}.
                </div>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={!compatibility.isCompatible}
                className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn active:scale-98"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add Assembled PC to Cart</span>
              </button>

              {/* WhatsApp Consultation Button */}
              <WhatsAppInquiryButton
                mode="builder"
                build={{
                  buildSlug: "custom",
                  buildUrl: typeof window !== "undefined" ? window.location.href : "https://tethera.com/builder",
                  estimatedWattage: estimated,
                  totalPrice: formatRupiah(totalPrice),
                }}
              />
            </div>

            <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Includes Tethera 2-Year Precision Hardware Warranty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Component Picker Modal */}
      <ComponentSelectModal
        slot={activeSlot}
        onClose={() => setActiveSlot(null)}
      />
    </div>
  );
}
