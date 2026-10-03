"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Cpu,
  ArrowRight,
  Plus,
  TrendingUp,
  Sparkles,
  Check,
  PackageCheck,
} from "lucide-react";
import {
  MOCK_COMPONENTS,
  PREBUILT_SYSTEMS,
  ComponentItem,
} from "../../lib/data/mockHardware";
import { useCartStore } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";

const SEARCH_CATEGORIES = [
  "All",
  "Pre-Built Systems",
  "Processors",
  "Graphics Cards",
  "Motherboards",
  "Cooling",
  "Chassis",
  "Storage",
];

const POPULAR_SEARCH_TERMS = [
  "Ryzen 7 7800X3D",
  "RTX 4080 SUPER",
  "DDR5 6000MHz",
  "Samsung 990 PRO",
  "Lian Li O11",
  "Noctua",
];

export function PredictiveSearchDropdown() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [addedItemIds, setAddedItemIds] = useState<{ [id: string]: boolean }>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addStandardItem, addCustomPC, openCart } = useCartStore();

  // Handle outside click / touch
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Handle global shortcuts (⌘K / Ctrl+K and /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const normalizedQuery = query.toLowerCase().trim();

  // Filter components
  const filteredComponents = MOCK_COMPONENTS.filter((item) => {
    if (selectedCategory === "Pre-Built Systems") return false;
    const matchesQuery =
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.sku.toLowerCase().includes(normalizedQuery) ||
      item.brand.toLowerCase().includes(normalizedQuery);
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  // Filter prebuilts
  const filteredPrebuilts = PREBUILT_SYSTEMS.filter((pb) => {
    if (selectedCategory !== "All" && selectedCategory !== "Pre-Built Systems")
      return false;
    const matchesQuery =
      !normalizedQuery ||
      pb.name.toLowerCase().includes(normalizedQuery) ||
      pb.sku.toLowerCase().includes(normalizedQuery) ||
      pb.cpu.toLowerCase().includes(normalizedQuery) ||
      pb.gpu.toLowerCase().includes(normalizedQuery);
    return matchesQuery;
  });

  const totalResults = filteredPrebuilts.length + filteredComponents.length;

  const handleAddPrebuilt = (
    e: React.MouseEvent,
    pb: (typeof PREBUILT_SYSTEMS)[0]
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const activePrice =
      (pb as any).sale_price && (pb as any).sale_price < pb.price
        ? (pb as any).sale_price
        : pb.price;

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
      totalPrice: activePrice,
      wattage: 750,
      isPrebuilt: true,
      image: pb.image,
    });

    setAddedItemIds((prev) => ({ ...prev, [pb.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [pb.id]: false }));
    }, 1500);
    openCart();
  };

  const handleAddComponent = (e: React.MouseEvent, item: ComponentItem) => {
    e.stopPropagation();
    e.preventDefault();
    addStandardItem(item);
    setAddedItemIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [item.id]: false }));
    }, 1500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedQuery) return;
    setIsOpen(false);
    router.push(`/components?search=${encodeURIComponent(normalizedQuery)}`);
  };

  return (
    <div ref={containerRef} className="static sm:relative w-full">
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search components, SKUs, pre-builts..."
          aria-label="Search components and pre-built systems"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full pl-10 pr-20 py-2 sm:py-2.5 bg-slate-100/90 dark:bg-zinc-900/90 hover:bg-slate-100 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 rounded-xl border border-slate-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 shadow-inner"
        />

        {/* Right side controls: Clear button or shortcut pills */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Clear search input"
              title="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 shadow-2xs">
                ⌘K
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 shadow-2xs">
                /
              </kbd>
            </div>
          )}
        </div>
      </form>

      {/* Autocomplete Dropdown Menu (No full-page popup / modal backdrop) */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 sm:left-0 sm:right-0 sm:w-full mt-2 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[520px] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Category Chips Bar */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            {SEARCH_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                    : "bg-white dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Results & Quick Suggestions Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60 p-2 sm:p-3 scrollbar-thin">
            {/* Case 1: Empty Query - Show Trending & Popular Searches */}
            {!normalizedQuery && (
              <div className="space-y-4 py-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider px-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Popular Searches</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {POPULAR_SEARCH_TERMS.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl transition-colors border border-slate-200 dark:border-zinc-700/70 tactile-btn active:scale-95"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider px-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Featured Hardware</span>
                  </div>

                  <div className="space-y-1">
                    {MOCK_COMPONENTS.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-xl flex items-center justify-between gap-3 group transition-colors"
                      >
                        <Link
                          href={`/products/${item.id}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 min-w-0 flex-1"
                        >
                          <div className="relative w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0 item-frame">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="40px"
                              className="object-contain p-1"
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                                {item.sku}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                In Stock
                              </span>
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            {item.sale_price && item.sale_price < item.price ? (
                              <div>
                                <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 block">
                                  {formatRupiah(item.sale_price)}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 line-through block">
                                  {formatRupiah(item.price)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 block">
                                {formatRupiah(item.price)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleAddComponent(e, item)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-colors tactile-btn active:scale-90"
                            title="Add to cart"
                            aria-label={`Add ${item.name} to cart`}
                          >
                            {addedItemIds[item.id] ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Case 2: Query Present - Filtered Results */}
            {normalizedQuery && totalResults === 0 && (
              <div className="py-8 text-center text-slate-400 dark:text-zinc-500 px-4">
                <Cpu className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  No matching parts found for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                  Try searching for brand or chipset (e.g., &ldquo;Ryzen&rdquo;, &ldquo;RTX&rdquo;, &ldquo;Corsair&rdquo;)
                </p>
              </div>
            )}

            {/* Pre-Built Systems Results */}
            {normalizedQuery && filteredPrebuilts.length > 0 && (
              <div className="py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 mb-1.5">
                  Pre-Built Systems ({filteredPrebuilts.length})
                </div>
                {filteredPrebuilts.map((pb) => (
                  <div
                    key={pb.id}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-xl flex items-center justify-between gap-3 group transition-colors"
                  >
                    <Link
                      href={`/products/${pb.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="relative w-11 h-11 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0 item-frame">
                        <Image
                          src={pb.image}
                          alt={pb.name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded">
                            Prebuilt
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate">
                            {pb.sku}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-0.5 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                          {pb.name}
                        </h4>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {pb.cpu} • {pb.gpu}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        {(pb as any).sale_price && (pb as any).sale_price < pb.price ? (
                          <div>
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100">
                                {formatRupiah((pb as any).sale_price)}
                              </span>
                              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.2 rounded">
                                -{Math.round(((pb.price - (pb as any).sale_price) / pb.price) * 100)}%
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 line-through block">
                              {formatRupiah(pb.price)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 block">
                              {formatRupiah(pb.price)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Ready in 60m</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleAddPrebuilt(e, pb)}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all tactile-btn active:scale-95 flex items-center gap-1"
                        title="Add prebuilt to cart"
                      >
                        {addedItemIds[pb.id] ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hardware Components Results */}
            {normalizedQuery && filteredComponents.length > 0 && (
              <div className="py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 mb-1.5">
                  Components ({filteredComponents.length})
                </div>
                {filteredComponents.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60 rounded-xl flex items-center justify-between gap-3 group transition-colors"
                  >
                    <Link
                      href={`/products/${item.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="relative w-11 h-11 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0 item-frame">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="44px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded border border-transparent dark:border-zinc-700">
                            {item.brand}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate">
                            {item.sku}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-0.5 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                          <span>In Stock ({item.stockCount} units)</span>
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        {item.sale_price && item.sale_price < item.price ? (
                          <div>
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100">
                                {formatRupiah(item.sale_price)}
                              </span>
                              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.2 rounded">
                                -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 line-through block">
                              {formatRupiah(item.price)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 block">
                              {formatRupiah(item.price)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">incl. tax</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleAddComponent(e, item)}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all tactile-btn active:scale-95 flex items-center gap-1"
                        title="Add item to cart"
                      >
                        {addedItemIds[item.id] ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 transition-colors">
            <span className="truncate">
              {normalizedQuery
                ? `Showing ${totalResults} matching results`
                : "Type to search parts, SKU, or specs"}
            </span>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={
                  normalizedQuery
                    ? `/components?search=${encodeURIComponent(normalizedQuery)}`
                    : "/components"
                }
                onClick={() => setIsOpen(false)}
                className="font-bold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View all in catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
