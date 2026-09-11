"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MOCK_COMPONENTS, CATEGORY_SLUG_MAP } from "../../lib/data/mockHardware";
import { useCartStore } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";
import { WhatsAppInquiryButton } from "../../components/whatsapp/WhatsAppInquiryButton";
import { Plus, ArrowRight, ChevronRight, Filter, Zap, SlidersHorizontal } from "lucide-react";

export default function ComponentsCatalogPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");

  const { addStandardItem } = useCartStore();

  const categories = [
    "All",
    "Processors",
    "Graphics Cards",
    "Motherboards",
    "Cooling",
    "Chassis",
    "Memory",
    "Storage",
    "Power Supplies",
  ];

  const brands = ["All", ...Array.from(new Set(MOCK_COMPONENTS.map((item) => item.brand)))];

  // Filtering
  let filtered = MOCK_COMPONENTS.filter((item) => {
    const matchesCat = activeCategory === "All" || item.category === activeCategory;
    const matchesBrand = selectedBrand === "All" || item.brand === selectedBrand;
    return matchesCat && matchesBrand;
  });

  // Sorting
  if (sortBy === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1.5">
            <Link href="/" className="hover:text-zinc-900 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-zinc-900 font-bold">PC Components</span>
          </nav>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
            PC Components & Hardware Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Factory-sealed enthusiast components with real-time stock at our Flagship Store. Eligible for 60-minute Click & Collect.
          </p>
        </div>

        <Link
          href="/builder"
          className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto shrink-0 uppercase tracking-tight"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Launch PC Builder</span>
        </Link>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap tactile-btn active:scale-95 ${
                activeCategory === cat
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Filter Bar */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Brand:</span>
            </span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-800 focus:outline-none"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-800 focus:outline-none"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>

            <span className="text-slate-400">|</span>
            <span className="text-emerald-700 font-semibold">{filtered.length} products available</span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {filtered.map((item, idx) => (
          <div
            key={`${activeCategory}-${item.id}-${selectedBrand}-${sortBy}`}
            style={{ animationDelay: `${idx * 40}ms` }}
            className="rounded-2xl bg-white border border-slate-200 overflow-hidden p-4 flex flex-col justify-between tethera-card-hover group animate-pop-in"
          >
            <div>
              {/* Product Image Link */}
              <Link
                href={`/products/${item.id}`}
                className="relative h-44 bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center p-3 block"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
                />
                <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-white/90 px-2 py-0.5 rounded shadow-2xs text-slate-700">
                  {item.brand}
                </span>
              </Link>

              <div className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</div>
              <Link href={`/products/${item.id}`} className="block mt-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 line-clamp-2 leading-snug group-hover:text-zinc-700 transition-colors">
                  {item.name}
                </h3>
              </Link>

              <div className="mt-2 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Flagship In Stock ({item.stockCount} available)</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-base font-black text-zinc-900">{formatRupiah(item.price)}</div>
                <div className="text-[10px] text-slate-400">incl. tax</div>
              </div>

              <div className="flex items-center gap-1.5">
                <Link
                  href={`/products/${item.id}`}
                  className="px-2.5 py-1.5 text-xs font-bold text-zinc-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors tactile-btn active:scale-95"
                >
                  Specs
                </Link>

                <button
                  onClick={() => addStandardItem(item)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs tactile-btn active:scale-90"
                  title="Add to Cart"
                  aria-label="Add to Cart"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
