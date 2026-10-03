"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MOCK_COMPONENTS, CATEGORY_SLUG_MAP } from "../../lib/data/mockHardware";
import { useCartStore } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";
import { WhatsAppInquiryButton } from "../../components/whatsapp/WhatsAppInquiryButton";
import {
  Plus,
  ArrowRight,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Cpu,
  Search,
  X,
  RotateCcw,
} from "lucide-react";
import { Pagination } from "../../components/ui/Pagination";

export default function ComponentsCatalogPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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
    "Mice",
    "Keyboards",
    "Headphones",
    "Mousepads",
    "Other Peripherals",
  ];

  const brands = ["All", ...Array.from(new Set(MOCK_COMPONENTS.map((item) => item.brand)))];

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: "featured" | "price-asc" | "price-desc") => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  // Filtering
  const q = searchQuery.toLowerCase().trim();
  let filtered = MOCK_COMPONENTS.filter((item) => {
    const matchesCat = activeCategory === "All" || item.category === activeCategory;
    const matchesBrand = selectedBrand === "All" || item.brand === selectedBrand;
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchesCat && matchesBrand && matchesSearch;
  });

  // Sorting
  if (sortBy === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  const totalFiltered = filtered.length;
  const paginatedItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-slate-200 dark:border-zinc-800 gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-400 font-medium mb-1.5">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
            <span className="text-zinc-900 dark:text-zinc-100 font-bold">PC Components</span>
          </nav>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
            PC Components &amp; Hardware Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">
            Factory-sealed enthusiast components with real-time stock at our Flagship Store. Eligible for 60-minute Click &amp; Collect.
          </p>
        </div>

        <Link
          href="/builder"
          className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto shrink-0 uppercase tracking-tight min-h-[44px]"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Launch PC Builder</span>
        </Link>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="space-y-3">
        {/* In-Page Instant Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search catalog by component model, brand, or SKU..."
            className="w-full pl-10 pr-10 py-2.5 min-h-[44px] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-600 focus:border-zinc-900 dark:focus:border-zinc-500 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap tactile-btn min-h-[36px] ${
                activeCategory === cat
                  ? "bg-zinc-900 dark:bg-zinc-800 text-white dark:text-white border border-transparent dark:border-zinc-700 shadow-xs"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Filter Bar */}
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
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

          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-500 dark:text-zinc-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e: any) => handleSortChange(e.target.value)}
              className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none min-h-[36px]"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>

            <span className="text-slate-400 dark:text-zinc-600">|</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{totalFiltered} products available</span>
          </div>
        </div>
      </div>

      {/* Products Grid or Empty Search State */}
      {totalFiltered === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400 dark:text-zinc-400">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No components found</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              No products match your current search and filter criteria. Try adjusting your query or resetting filters.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              handleSearchChange("");
              handleCategoryChange("All");
              handleBrandChange("All");
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-all shadow-xs tactile-btn min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6" id="catalog-results">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {paginatedItems.map((item) => (
              <div
                key={`${activeCategory}-${item.id}-${selectedBrand}-${sortBy}`}
                className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden p-4 flex flex-col justify-between tethera-card-hover group transition-colors"
              >
                <div>
                  {/* Product Image Link */}
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
                      onClick={() => addStandardItem(item.sale_price ? { ...item, price: item.sale_price } : item)}
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

          {/* Catalog Pagination with 10, 20, 50 settings */}
          <Pagination
            currentPage={currentPage}
            totalItems={totalFiltered}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            scrollToId="catalog-results"
            itemLabel="components"
          />
        </div>
      )}
    </div>
  );
}
