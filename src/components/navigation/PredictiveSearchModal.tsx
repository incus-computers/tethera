"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, Cpu, HardDrive, Zap, Check, ArrowRight } from "lucide-react";
import { MOCK_COMPONENTS, ComponentItem } from "../../lib/data/mockHardware";
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
  const { addStandardItem } = useCartStore();

  const categories = ["All", "Processors", "Motherboards", "Graphics Cards", "Cooling", "Chassis", "Storage"];

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

  const filtered = MOCK_COMPONENTS.filter((item) => {
    const matchesQuery =
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.sku.toLowerCase().includes(query.toLowerCase()) ||
      item.brand.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

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
            placeholder="Search parts, exact SKU, brand (e.g. 7800X3D, RTX 4080, ASUS, Corsair)..."
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
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Cpu className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No components match your search</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for &quot;AMD&quot;, &quot;RTX&quot;, &quot;Lian Li&quot; or &quot;DDR5&quot;</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="py-3 px-3 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-4 group transition-colors"
              >
                <Link
                  href={`/products/${item.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 min-w-0 flex-1 group/item"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
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
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        In Stock Flagship ({item.stockCount} units)
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-3 shrink-0">
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
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                  >
                    <span>Add</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 flex justify-between items-center px-4">
          <span>Showing {filtered.length} matching items</span>
          <span className="text-emerald-700 font-medium">⚡ Click & Collect: Ready today</span>
        </div>
      </div>
    </div>
  );
}
