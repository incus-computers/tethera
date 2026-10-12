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
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 space-y-8">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-5">
          {paginatedItems.map((item) => (
            <div
              key={`${item.id}-${selectedBrand}-${selectedSocket}`}
              className="flex flex-col justify-between group transition-colors"
            >
              <div>
                <Link
                  href={`/products/${item.id}`}
                  className="relative w-full aspect-square rounded-lg overflow-hidden mb-1.5 flex items-center justify-center block"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </Link>

                <Link href={`/products/${item.id}`} className="block">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                    {item.name}
                  </h3>
                </Link>
              </div>

              <div className="mt-1 flex items-start justify-between gap-2">
                {/* Left Column: Price & Tax Note / Original Price */}
                <div className="flex flex-col min-w-0">
                  {item.sale_price && item.sale_price < item.price ? (
                    <>
                      <div className="flex items-baseline gap-1 sm:gap-1.5">
                        <span className="text-sm sm:text-lg font-black text-zinc-900 dark:text-zinc-100 leading-tight">
                          {formatRupiah(item.sale_price)}
                        </span>
                        <span className="text-[10px] sm:text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded border border-rose-200 dark:border-rose-900/60 leading-tight">
                          -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                        </span>
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 line-through leading-none mt-0.5">
                        {formatRupiah(item.price)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm sm:text-lg font-black text-zinc-900 dark:text-zinc-100 leading-tight">
                        {formatRupiah(item.price)}
                      </span>
                      <span className="text-[11px] sm:text-xs text-slate-400 dark:text-zinc-500 leading-none mt-0.5">
                        incl. tax
                      </span>
                    </>
                  )}
                </div>

                {/* Right Column: Stock & Add to Cart */}
                <div className="flex flex-col items-end shrink-0">
                  <div className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1 leading-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                    <span>Stock: {item.stockCount}</span>
                  </div>

                  <button
                    onClick={() => addStandardItem(item.sale_price ? { ...item, price: item.sale_price } : item)}
                    className="min-h-[44px] -my-2.5 inline-flex items-center text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors uppercase tracking-wider leading-none"
                    title="Add to Cart"
                    aria-label="Add to Cart"
                  >
                    <span>Add to Cart</span>
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
