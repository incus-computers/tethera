"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  MOCK_COMPONENTS,
  CATEGORY_SLUG_MAP,
  ComponentItem,
} from "../../../lib/data/mockHardware";
import { useCartStore } from "../../../lib/store/useCartStore";
import { formatRupiah } from "../../../lib/utils/currency";
import { Plus, ChevronRight, ArrowLeft, SlidersHorizontal, Cpu } from "lucide-react";
import { Pagination } from "../../../components/ui/Pagination";

export default function CategoryProductsPage() {
  const params = useParams();
  const categorySlug = (params?.category as string)?.toLowerCase();

  const categoryMeta = CATEGORY_SLUG_MAP[categorySlug];
  const { addStandardItem } = useCartStore();

  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedSocket, setSelectedSocket] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setCurrentPage(1);
  };

  const handleSocketChange = (socket: string) => {
    setSelectedSocket(socket);
    setCurrentPage(1);
  };

  if (!categoryMeta) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Category Not Found</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
          The hardware category you requested does not exist.
        </p>
        <Link
          href="/components"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-colors"
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

  const totalFiltered = filtered.length;
  const paginatedItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-400 font-medium mb-2">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/components" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
            Components
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-900 dark:text-zinc-100 font-bold">{categoryMeta.name}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
              {categoryMeta.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">
              {categoryMeta.description}
            </p>
          </div>

          <Link
            href="/builder"
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto shrink-0 uppercase tracking-tight"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Custom PC Builder</span>
          </Link>
        </div>
      </div>

      {/* Sub-Filters (Brand, Socket) */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Brand:</span>
            </span>
            <select
              value={selectedBrand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none min-h-[36px]"
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
              <span className="font-bold text-slate-500 dark:text-zinc-400">Socket:</span>
              <select
                value={selectedSocket}
                onChange={(e) => handleSocketChange(e.target.value)}
                className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none min-h-[36px]"
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

        <div className="text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
          Showing {totalFiltered} products • Ready for Click &amp; Collect
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="space-y-6" id="category-results">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {paginatedItems.map((item) => (
            <div
              key={`${item.id}-${selectedBrand}-${selectedSocket}`}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden p-4 flex flex-col justify-between tethera-card-hover group"
            >
              <div>
                <Link
                  href={`/products/${item.id}`}
                  className="relative h-44 bg-slate-50 dark:bg-zinc-800/80 rounded-xl overflow-hidden mb-3 border border-slate-100 dark:border-zinc-700/60 flex items-center justify-center p-3 block item-frame"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                  />
                  <span className="absolute top-2 left-2 z-10 text-[9px] font-bold uppercase tracking-wider bg-white/90 dark:bg-zinc-800 px-2 py-0.5 rounded shadow-2xs text-slate-700 dark:text-zinc-200 border border-transparent dark:border-zinc-700">
                    {item.brand}
                  </span>
                </Link>

                <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">SKU: {item.sku}</div>
                <Link href={`/products/${item.id}`} className="block mt-0.5">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                    {item.name}
                  </h3>
                </Link>

                {item.specs.socket && (
                  <div className="mt-1.5 inline-block text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    Socket {item.specs.socket}
                  </div>
                )}

                <div className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  <span>Flagship In Stock ({item.stockCount} available)</span>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  {item.sale_price && item.sale_price < item.price ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-zinc-900 dark:text-zinc-100">
                          {formatRupiah(item.sale_price)}
                        </span>
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/60">
                          -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 line-through">
                        {formatRupiah(item.price)}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-base font-black text-zinc-900 dark:text-zinc-100">{formatRupiah(item.price)}</div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500">incl. tax</div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/products/${item.id}`}
                    className="px-2.5 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors tactile-btn active:scale-95"
                  >
                    Specs
                  </Link>

                  <button
                    onClick={() => addStandardItem(item)}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-lg text-xs font-bold transition-colors shadow-2xs tactile-btn active:scale-90"
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

        {/* Category Page Pagination with 10, 20, 50 settings */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalFiltered}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          scrollToId="category-results"
          itemLabel="products"
        />
      </div>
    </div>
  );
}
