"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  MOCK_COMPONENTS,
  CATEGORY_SLUG_MAP,
  ComponentItem,
  getExpandedCatalogItems,
} from "../../../lib/data/mockHardware";
import { useCartStore } from "../../../lib/store/useCartStore";
import { formatRupiah } from "../../../lib/utils/currency";
import { Plus, ChevronRight, ArrowLeft, SlidersHorizontal, Cpu } from "lucide-react";
import { Pagination } from "../../../components/ui/Pagination";
import { ProductItemTileImage } from "../../../components/products/ProductItemTileImage";

export default function CategoryProductsPage() {
  const params = useParams();
  const categorySlug = (params?.category as string)?.toLowerCase();

  const categoryMeta = CATEGORY_SLUG_MAP[categorySlug];
  const { addStandardItem, openCart } = useCartStore();

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

  // Filter items for this category and expand any variations into individual tiles
  const rawCategoryItems = MOCK_COMPONENTS.filter(
    (item) => item.category.toLowerCase() === categoryMeta.name.toLowerCase() || item.slot === categoryMeta.slot
  );
  const categoryItems = React.useMemo(
    () => getExpandedCatalogItems(rawCategoryItems),
    [categoryMeta.name, categoryMeta.slot]
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
      <div className="pb-6 border-b border-slate-300 dark:border-white/40">
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
          {paginatedItems.map((item) => {
            const itemHref =
              item.parentProductId && item.variationId
                ? `/products/${item.parentProductId}?variation=${item.variationId}`
                : `/products/${item.id}`;

            return (
              <div
                key={`${item.id}-${selectedBrand}-${selectedSocket}`}
                className="flex flex-col justify-between group transition-colors"
              >
                <div>
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-1.5 flex items-center justify-center block bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <Link href={itemHref} className="absolute inset-0 block">
                      <ProductItemTileImage
                        item={item}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    </Link>

                    {item.stockCount <= 0 && (
                      <div className="absolute top-2 left-2 z-10 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-normal tracking-wide bg-slate-900/90 text-slate-100 border border-slate-700/80 shadow-xs uppercase">
                          Out of Stock
                        </span>
                      </div>
                    )}

                    {/* Floating Green + Circle / Add to Cart on Bottom Right of Picture */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addStandardItem(
                          item.sale_price && item.sale_price < item.price
                            ? { ...item, price: item.sale_price, originalPrice: item.price }
                            : item
                        );
                        openCart();
                      }}
                      disabled={item.stockCount <= 0}
                      className="group/cart absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-10 min-h-[44px] min-w-[44px] flex items-center justify-end p-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      title="Add to Cart"
                      aria-label={`Add ${item.name} to Cart`}
                    >
                      <div className="h-9 min-w-9 sm:h-10 sm:min-w-10 px-2 sm:px-2.5 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-out group-hover/cart:px-3 sm:group-hover/cart:px-3.5">
                        <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 transition-transform duration-300 group-hover/cart:rotate-90" />
                        <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap text-xs font-bold transition-all duration-300 ease-out group-hover/cart:max-w-[85px] group-hover/cart:opacity-100 group-hover/cart:ml-1.5">
                          Add to Cart
                        </span>
                      </div>
                    </button>
                  </div>

                  <Link href={itemHref} className="block">
                    <h3 className="text-sm sm:text-base font-normal text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                      {item.name}
                    </h3>
                  </Link>
                </div>

                <div className="mt-1 flex flex-col gap-1">
                  {/* Price Row */}
                  <div className="flex items-baseline justify-between gap-2">
                    {/* Left Column: Current Price & Discount Badge */}
                    <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
                      <span className="text-sm sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                        {formatRupiah(item.sale_price && item.sale_price < item.price ? item.sale_price : item.price)}
                      </span>
                      {item.sale_price && item.sale_price < item.price && (
                        <span className="text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded border border-rose-200 dark:border-rose-900/60 leading-tight shrink-0">
                          -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                        </span>
                      )}
                    </div>

                    {/* Right Column: Original Price (if discounted) */}
                    {item.sale_price && item.sale_price < item.price && (
                      <div className="flex flex-col items-end text-right shrink-0">
                        <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 line-through leading-none">
                          {formatRupiah(item.price)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
