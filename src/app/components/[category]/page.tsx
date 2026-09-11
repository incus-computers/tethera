"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MOCK_COMPONENTS,
  CATEGORY_SLUG_MAP,
  ComponentItem,
} from "../../../lib/data/mockHardware";
import { useCartStore } from "../../../lib/store/useCartStore";
import { formatRupiah } from "../../../lib/utils/currency";
import { Plus, ChevronRight, Zap, ArrowLeft, SlidersHorizontal } from "lucide-react";

export default function CategoryProductsPage() {
  const params = useParams();
  const categorySlug = (params?.category as string)?.toLowerCase();

  const categoryMeta = CATEGORY_SLUG_MAP[categorySlug];
  const { addStandardItem } = useCartStore();

  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedSocket, setSelectedSocket] = useState("All");

  if (!categoryMeta) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-zinc-900">Category Not Found</h1>
        <p className="text-sm text-slate-500 mt-2">
          The hardware category you requested does not exist.
        </p>
        <Link
          href="/components"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>View All PC Components</span>
        </Link>
      </div>
    );
  }

  // Filter items for this category
  const categoryItems = MOCK_COMPONENTS.filter(
    (item) => item.category.toLowerCase() === categoryMeta.name.toLowerCase() || item.slot === categoryMeta.slot
  );

  const brands = ["All", ...Array.from(new Set(categoryItems.map((item) => item.brand)))];
  const sockets = [
    "All",
    ...Array.from(new Set(categoryItems.map((item) => item.specs.socket).filter(Boolean))),
  ];

  let filtered = categoryItems.filter((item) => {
    const matchesBrand = selectedBrand === "All" || item.brand === selectedBrand;
    const matchesSocket =
      selectedSocket === "All" || !item.specs.socket || item.specs.socket === selectedSocket;
    return matchesBrand && matchesSocket;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="pb-6 border-b border-slate-200">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-2">
          <Link href="/" className="hover:text-zinc-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/components" className="hover:text-zinc-900 transition-colors">
            Components
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-900 font-bold">{categoryMeta.name}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
              {categoryMeta.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              {categoryMeta.description}
            </p>
          </div>

          <Link
            href="/builder"
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto shrink-0 uppercase tracking-tight"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Custom PC Builder</span>
          </Link>
        </div>
      </div>

      {/* Sub-Filters (Brand, Socket) */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
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

          {sockets.length > 2 && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Socket:</span>
              <select
                value={selectedSocket}
                onChange={(e) => setSelectedSocket(e.target.value)}
                className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-800 focus:outline-none"
              >
                {sockets.map((s: any) => (
                  <option key={s} value={s}>
                    {s === "All" ? "All Sockets" : `Socket ${s}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-emerald-700 font-semibold text-xs">
          Showing {filtered.length} products • Ready for Click & Collect
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {filtered.map((item, idx) => (
          <div
            key={`${item.id}-${selectedBrand}-${selectedSocket}`}
            style={{ animationDelay: `${idx * 45}ms` }}
            className="rounded-2xl bg-white border border-slate-200 overflow-hidden p-4 flex flex-col justify-between tethera-card-hover group animate-pop-in"
          >
            <div>
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

              {item.specs.socket && (
                <div className="mt-1.5 inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Socket {item.specs.socket}
                </div>
              )}

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
