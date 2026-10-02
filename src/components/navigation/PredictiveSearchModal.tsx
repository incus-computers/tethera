"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Cpu, HardDrive, Zap, Check, ArrowRight, Monitor, Plus } from "lucide-react";
import { MOCK_COMPONENTS, PREBUILT_SYSTEMS, ComponentItem } from "../../lib/data/mockHardware";
import { useCartStore } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";

interface PredictiveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PredictiveSearchModal({ isOpen, onClose }: PredictiveSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const inputRef = useRef<HTMLInputElement>(null);
  const { addStandardItem, addCustomPC, openCart } = useCartStore();

  const categories = ["All", "Pre-Built Systems", "Processors", "Graphics Cards", "Motherboards", "Cooling", "Chassis", "Storage"];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  const filteredComponents = MOCK_COMPONENTS.filter((item) => {
    if (selectedCategory === "Pre-Built Systems") return false;
    const matchesQuery =
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.sku.toLowerCase().includes(normalizedQuery) ||
      item.brand.toLowerCase().includes(normalizedQuery);
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const filteredPrebuilts = PREBUILT_SYSTEMS.filter((pb) => {
    if (selectedCategory !== "All" && selectedCategory !== "Pre-Built Systems") return false;
    const matchesQuery =
      !normalizedQuery ||
      pb.name.toLowerCase().includes(normalizedQuery) ||
      pb.sku.toLowerCase().includes(normalizedQuery) ||
      pb.cpu.toLowerCase().includes(normalizedQuery) ||
      pb.gpu.toLowerCase().includes(normalizedQuery);
    return matchesQuery;
  });

  const totalResults = filteredPrebuilts.length + filteredComponents.length;

  const handleAddPrebuilt = (pb: (typeof PREBUILT_SYSTEMS)[0]) => {
    addCustomPC({
      id: `pb-${pb.id}-${Date.now()}`,
      name: pb.name,
      parts: {
        cpu: { name: pb.cpu } as any,
        gpu: { name: pb.gpu } as any,
        ram: { name: pb.ram } as any,
        storage_primary: { name: pb.storage } as any,
        cooler: { name: pb.cooling } as any,
        case: { name: pb.chassis } as any,
        psu: { name: pb.psu } as any,
        os: { name: pb.os } as any,
      },
      serviceTier: {
        name: "Standard 24h Burn-In Verification",
        price: 0,
        leadTime: "Ready in 60 Mins",
      },
      totalPrice: pb.price,
      wattage: 750,
      isPrebuilt: true,
      image: pb.image,
    });
    onClose();
    openCart();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search parts, exact SKU, brand (e.g. 7800X3D, RTX 4080, Apex, Corsair)..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-zinc-900 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-zinc-700 hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300">
            ESC
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
          {totalResults === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Cpu className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No components or systems match your search</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for &quot;AMD&quot;, &quot;RTX&quot;, &quot;Apex&quot;, &quot;Lian Li&quot; or &quot;DDR5&quot;</p>
            </div>
          ) : (
            <>
              {/* Prebuilt Rigs Results */}
              {filteredPrebuilts.map((pb) => (
                <div
                  key={pb.id}
                  className="py-3 px-3 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-4 group transition-colors"
                >
                  <Link
                    href={`/products/${pb.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group/item"
                  >
                    <div className="relative w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                      <Image
                        src={pb.image}
                        alt={pb.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          Pre-Built System
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 truncate">
                          {pb.sku}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 truncate mt-0.5 group-hover/item:text-zinc-600 transition-colors">
                        {pb.name}
                      </h4>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {pb.cpu} • {pb.gpu}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-black text-zinc-900">
                        {formatRupiah(pb.price)}
                      </div>
                      <div className="text-[10px] text-slate-400">Ready in 60m</div>
                    </div>
                    <button
                      onClick={() => handleAddPrebuilt(pb)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1 tactile-btn active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Standard Components Results */}
              {filteredComponents.map((item) => (
                <div
                  key={item.id}
                  className="py-3 px-3 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-4 group transition-colors"
                >
                  <Link
                    href={`/products/${item.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group/item"
                  >
                    <div className="relative w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.brand}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 truncate">
                          SKU: {item.sku}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 truncate mt-0.5 group-hover/item:text-zinc-600 transition-colors">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          In Stock Flagship ({item.stockCount} units)
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-black text-zinc-900">
                        {formatRupiah(item.price)}
                      </div>
                      <div className="text-[10px] text-slate-400">incl. tax</div>
                    </div>
                    <button
                      onClick={() => {
                        addStandardItem(item);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1 tactile-btn active:scale-95"
                    >
                      <span>Add</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 flex justify-between items-center px-4">
          <span>Showing {totalResults} matching items</span>
          <span className="text-emerald-700 font-medium">⚡ Click & Collect: Ready today</span>
        </div>
      </div>
    </div>
  );
}
