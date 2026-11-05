"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MOCK_COMPONENTS,
  CATEGORY_SLUG_MAP,
  getExpandedCatalogItems,
} from "../../lib/data/mockHardware";
import { useCartStore } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";
import {
  Plus,
  ChevronRight,
  SlidersHorizontal,
  Cpu,
  Search,
  X,
  RotateCcw,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { ProductItemTileImage } from "../../components/products/ProductItemTileImage";

export const dynamic = "force-dynamic";

const CATEGORIES = [
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

function normalizeCategory(param: string | null): string {
  if (!param || param.toLowerCase() === "all") return "All";
  const lower = param.toLowerCase().trim();
  if (lower === "cpu" || lower === "processors" || lower === "processor") return "Processors";
  if (lower === "gpu" || lower === "graphics-cards" || lower === "graphics cards") return "Graphics Cards";
  if (lower === "motherboards" || lower === "motherboard") return "Motherboards";
  if (lower === "cooling" || lower === "cooler") return "Cooling";
  if (lower === "chassis" || lower === "cases" || lower === "case") return "Chassis";
  if (lower === "memory" || lower === "ram") return "Memory";
  if (lower === "storage" || lower === "ssd") return "Storage";
  if (lower === "psu" || lower === "power-supplies" || lower === "power supplies") return "Power Supplies";
  if (lower === "mice" || lower === "mouse") return "Mice";
  if (lower === "keyboards" || lower === "keyboard") return "Keyboards";
  if (lower === "headphones" || lower === "headphone" || lower === "headset") return "Headphones";
  if (lower === "mousepads" || lower === "mousepad") return "Mousepads";
  if (lower === "other peripherals" || lower === "peripherals") return "Other Peripherals";

  const found = CATEGORIES.find((c) => c.toLowerCase() === lower);
  return found || param;
}

interface ParsedUrlParams {
  category: string;
  brand: string;
  search: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: "featured" | "price-asc" | "price-desc" | "newest";
}

function UrlSyncWatcher({ onSync }: { onSync: (params: ParsedUrlParams) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    onSync({
      category: normalizeCategory(searchParams.get("category")),
      brand: searchParams.get("brand") || "All",
      search: searchParams.get("search") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      inStock: searchParams.get("inStock") === "true" || searchParams.get("inStock") === "1",
      sort: ((searchParams.get("sort") as any) || "featured"),
    });
  }, [searchParams, onSync]);

  return null;
}

export default function ComponentsCatalogPage() {
  const router = useRouter();
  const pathname = typeof usePathname === "function" ? usePathname() : "/components";

  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "newest">("featured");

  const INITIAL_BATCH = 24;
  const BATCH_INCREMENT = 12;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { addStandardItem, openCart } = useCartStore();

  const allComponents = useMemo(() => getExpandedCatalogItems(MOCK_COMPONENTS), []);

  const brands = useMemo(
    () => ["All", ...Array.from(new Set(allComponents.map((item) => item.brand))).sort()],
    [allComponents]
  );

  // Dynamic price bounds across catalog
  const catalogPriceBounds = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (const item of allComponents) {
      const price = item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
      if (price < min) min = price;
      if (price > max) max = price;
    }
    return {
      min: min === Number.POSITIVE_INFINITY ? 0 : min,
      max,
    };
  }, [allComponents]);

  const handleUrlSync = useCallback((params: ParsedUrlParams) => {
    setActiveCategory(params.category);
    setSelectedBrand(params.brand);
    setSearchQuery(params.search);
    setMinPriceInput(params.minPrice);
    setMaxPriceInput(params.maxPrice);
    setInStockOnly(params.inStock);
    setSortBy(params.sort);
  }, []);

  // Synchronize URL parameters when filters change
  const updateUrlParams = (updates: {
    category?: string;
    brand?: string;
    search?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: boolean;
    sort?: string;
  }) => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();

    const category = updates.category !== undefined ? updates.category : activeCategory;
    const brand = updates.brand !== undefined ? updates.brand : selectedBrand;
    const search = updates.search !== undefined ? updates.search : searchQuery;
    const minPrice = updates.minPrice !== undefined ? updates.minPrice : minPriceInput;
    const maxPrice = updates.maxPrice !== undefined ? updates.maxPrice : maxPriceInput;
    const inStock = updates.inStock !== undefined ? updates.inStock : inStockOnly;
    const sort = updates.sort !== undefined ? updates.sort : sortBy;

    if (category && category !== "All") {
      params.set("category", category.toLowerCase().replace(/\s+/g, "-"));
    }
    if (brand && brand !== "All") {
      params.set("brand", brand);
    }
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (minPrice && !Number.isNaN(Number(minPrice)) && Number(minPrice) > 0) {
      params.set("minPrice", minPrice);
    }
    if (maxPrice && !Number.isNaN(Number(maxPrice)) && Number(maxPrice) > 0) {
      params.set("maxPrice", maxPrice);
    }
    if (inStock) {
      params.set("inStock", "true");
    }
    if (sort && sort !== "featured") {
      params.set("sort", sort);
    }

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(targetUrl, { scroll: false });
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setVisibleCount(INITIAL_BATCH);
    updateUrlParams({ category: cat });
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setVisibleCount(INITIAL_BATCH);
    updateUrlParams({ brand });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setVisibleCount(INITIAL_BATCH);
    updateUrlParams({ search: query });
  };

  const handleMinPriceChange = (val: string) => {
    setMinPriceInput(val);
    setVisibleCount(INITIAL_BATCH);
    updateUrlParams({ minPrice: val });
  };

  const handleMaxPriceChange = (val: string) => {
    setMaxPriceInput(val);
    setVisibleCount(INITIAL_BATCH);
    updateUrlParams({ maxPrice: val });
  };

  const handleInStockToggle = () => {
    const nextVal = !inStockOnly;
    setInStockOnly(nextVal);
    setVisibleCount(INITIAL_BATCH);
    updateUrlParams({ inStock: nextVal });
  };

  const handleSortChange = (sort: "featured" | "price-asc" | "price-desc" | "newest") => {
    setSortBy(sort);
    setVisibleCount(INITIAL_BATCH);
    updateUrlParams({ sort });
  };

  const resetAllFilters = () => {
    setActiveCategory("All");
    setSelectedBrand("All");
    setSearchQuery("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setInStockOnly(false);
    setSortBy("featured");
    setVisibleCount(INITIAL_BATCH);
    if (typeof window !== "undefined") {
      router.replace(pathname, { scroll: false });
    }
  };

  // Multi-criteria filtering
  const q = searchQuery.toLowerCase().trim();
  const minPriceNum = minPriceInput ? Number(minPriceInput) : null;
  const maxPriceNum = maxPriceInput ? Number(maxPriceInput) : null;

  const filtered = useMemo(() => {
    return allComponents.filter((item) => {
      // Category match
      const matchesCat = activeCategory === "All" || item.category === activeCategory;
      if (!matchesCat) return false;

      // Brand match
      const matchesBrand = selectedBrand === "All" || item.brand === selectedBrand;
      if (!matchesBrand) return false;

      // In stock match
      if (inStockOnly && item.stockCount <= 0) return false;

      // Price bounds
      const effectivePrice = item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
      if (minPriceNum !== null && !Number.isNaN(minPriceNum) && effectivePrice < minPriceNum) {
        return false;
      }
      if (maxPriceNum !== null && !Number.isNaN(maxPriceNum) && effectivePrice > maxPriceNum) {
        return false;
      }

      // Search keyword match
      if (q) {
        const matchesSearch =
          item.name.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [allComponents, activeCategory, selectedBrand, inStockOnly, minPriceNum, maxPriceNum, q]);

  // Deterministic sorting
  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortBy === "price-asc") {
      copy.sort((a, b) => {
        const pA = a.sale_price && a.sale_price < a.price ? a.sale_price : a.price;
        const pB = b.sale_price && b.sale_price < b.price ? b.sale_price : b.price;
        return pA - pB;
      });
    } else if (sortBy === "price-desc") {
      copy.sort((a, b) => {
        const pA = a.sale_price && a.sale_price < a.price ? a.sale_price : a.price;
        const pB = b.sale_price && b.sale_price < b.price ? b.sale_price : b.price;
        return pB - pA;
      });
    } else if (sortBy === "newest") {
      copy.sort((a, b) => (b.id || "").localeCompare(a.id || ""));
    }
    return copy;
  }, [filtered, sortBy]);

  const totalFiltered = sorted.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, sorted.length));
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sorted.length]);

  const visibleItems = sorted.slice(0, visibleCount);

  // Active filter indicators
  const hasActiveFilters =
    activeCategory !== "All" ||
    selectedBrand !== "All" ||
    searchQuery.trim().length > 0 ||
    Boolean(minPriceInput) ||
    Boolean(maxPriceInput) ||
    inStockOnly;

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 space-y-8">
      <Suspense fallback={null}>
        <UrlSyncWatcher onSync={handleUrlSync} />
      </Suspense>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-slate-300 dark:border-white/40 gap-4">
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
            className="w-full pl-10 pr-10 py-2.5 min-h-[44px] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-600 focus:border-zinc-900 dark:focus:border-zinc-500 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`px-3.5 py-2 rounded-lg font-bold transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center ${
                activeCategory === cat
                  ? "bg-zinc-900 dark:bg-zinc-800 text-white dark:text-white border border-transparent dark:border-zinc-700 shadow-xs"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Filter & Price Range Bar */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Brand Filter */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Brand:</span>
              </span>
              <select
                value={selectedBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap">Price (Rp):</span>
              <input
                type="number"
                value={minPriceInput}
                onChange={(e) => handleMinPriceChange(e.target.value)}
                placeholder={formatRupiah(catalogPriceBounds.min).replace("Rp", "").trim()}
                aria-label="Minimum price in Rupiah"
                className="w-24 sm:w-28 min-h-[44px] px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-[#37baf2]"
              />
              <span className="text-zinc-400 font-bold">to</span>
              <input
                type="number"
                value={maxPriceInput}
                onChange={(e) => handleMaxPriceChange(e.target.value)}
                placeholder={formatRupiah(catalogPriceBounds.max).replace("Rp", "").trim()}
                aria-label="Maximum price in Rupiah"
                className="w-24 sm:w-28 min-h-[44px] px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-[#37baf2]"
              />
            </div>

            {/* In-Stock Only Toggle */}
            <button
              type="button"
              onClick={handleInStockToggle}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg font-semibold text-xs border transition-colors flex items-center gap-2 ${
                inStockOnly
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  inStockOnly
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-zinc-400 dark:border-zinc-500"
                }`}
              >
                {inStockOnly && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span>In Stock Only</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort:</span>
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => handleSortChange(e.target.value)}
                className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
              >
                <option value="featured">Featured First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
            </div>

            <span className="text-slate-400 dark:text-zinc-600">|</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">
              {totalFiltered} products available
            </span>
          </div>
        </div>

        {/* Active Filter Badges with 1-Click Removal */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium mr-1">Active Filters:</span>

            {activeCategory !== "All" && (
              <button
                type="button"
                onClick={() => handleCategoryChange("All")}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <span>Category: {activeCategory}</span>
                <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100" />
              </button>
            )}

            {selectedBrand !== "All" && (
              <button
                type="button"
                onClick={() => handleBrandChange("All")}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <span>Brand: {selectedBrand}</span>
                <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100" />
              </button>
            )}

            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <span>Search: &quot;{searchQuery}&quot;</span>
                <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100" />
              </button>
            )}

            {Boolean(minPriceInput || maxPriceInput) && (
              <button
                type="button"
                onClick={() => {
                  setMinPriceInput("");
                  setMaxPriceInput("");
                  updateUrlParams({ minPrice: "", maxPrice: "" });
                }}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <span>
                  Price: {minPriceInput ? formatRupiah(Number(minPriceInput)) : "Rp 0"} to{" "}
                  {maxPriceInput ? formatRupiah(Number(maxPriceInput)) : "Any"}
                </span>
                <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100" />
              </button>
            )}

            {inStockOnly && (
              <button
                type="button"
                onClick={handleInStockToggle}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <span>In Stock Only</span>
                <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100" />
              </button>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}
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
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-all shadow-xs tactile-btn min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6" id="catalog-results">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-5">
            {visibleItems.map((item) => {
              const itemHref =
                item.parentProductId && item.variationId
                  ? `/products/${item.parentProductId}?variation=${item.variationId}`
                  : `/products/${item.id}`;

              return (
                <div
                  key={`${activeCategory}-${item.id}-${selectedBrand}-${sortBy}`}
                  className="flex flex-col justify-between group transition-colors"
                >
                  <div>
                    {/* Product Image Link & Floating Green + Button */}
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-1.5 flex items-center justify-center block bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                      <Link href={itemHref} className="absolute inset-0 block">
                        <ProductItemTileImage
                          item={item}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </Link>

                      {/* Top Left Badges: Red Discount Percentage & Out of Stock */}
                      <div className="absolute top-2 left-2 z-10 pointer-events-none flex flex-col gap-1 items-start">
                        {item.sale_price && item.sale_price < item.price && (
                          <span className="px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-xs sm:text-sm font-black tracking-tight leading-none bg-red-600 text-white shadow-md">
                            -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                          </span>
                        )}
                        {item.stockCount <= 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-normal tracking-wide bg-slate-900/90 text-slate-100 border border-slate-700/80 shadow-xs uppercase">
                            Out of Stock
                          </span>
                        )}
                      </div>

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
                        className="group/cart absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-10 min-h-[44px] min-w-[44px] flex items-center justify-end p-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400"
                        title="Add to Cart"
                        aria-label={`Add ${item.name} to Cart`}
                      >
                        <div className="h-9 min-w-9 sm:h-10 sm:min-w-10 px-2 sm:px-2.5 flex items-center justify-center rounded-full bg-[#52E394] hover:brightness-105 active:brightness-95 text-[#0A0B0E] shadow-md hover:shadow-lg transition-all duration-300 ease-out group-hover/cart:px-3 sm:group-hover/cart:px-3.5">
                          <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 transition-transform duration-300 group-hover/cart:rotate-90 text-[#0A0B0E]" />
                          <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap text-xs font-bold transition-all duration-300 ease-out group-hover/cart:max-w-[85px] group-hover/cart:opacity-100 group-hover/cart:ml-1.5 text-[#0A0B0E]">
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
                      <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
                        <span className="text-sm sm:lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                          {formatRupiah(item.sale_price && item.sale_price < item.price ? item.sale_price : item.price)}
                        </span>
                        {item.sale_price && item.sale_price < item.price && (
                          <span className="text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 sm:px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 leading-tight shrink-0">
                            -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                          </span>
                        )}
                      </div>

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

          {/* Infinite Scroll Sentinel / Loading Indicator */}
          {visibleCount < totalFiltered && (
            <div ref={sentinelRef} className="py-8 flex justify-center items-center">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                <div className="w-2 h-2 rounded-full bg-[#37baf2] animate-pulse" />
                <span>Loading more components...</span>
              </div>
            </div>
          )}

          {visibleCount >= totalFiltered && totalFiltered > 0 && (
            <div className="py-6 text-center text-xs font-medium text-slate-400 dark:text-zinc-500">
              Showing all {totalFiltered} components
            </div>
          )}
        </div>
      )}
    </div>
  );
}
