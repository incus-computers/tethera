"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Store,
  ShieldCheck,
  Cpu,
  Monitor,
  CheckCircle,
  Clock,
  MessageSquare,
  Plus,
  ArrowUpDown,
  ChevronDown,
  Check,
  ArrowRight,
} from "lucide-react";

const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "stock", label: "Stock Level" },
] as const;

type SortOptionId = (typeof SORT_OPTIONS)[number]["id"];
import { MOCK_COMPONENTS, PREBUILT_SYSTEMS, ComponentItem, getExpandedCatalogItems } from "../lib/data/mockHardware";
import { useCartStore } from "../lib/store/useCartStore";
import { formatRupiah } from "../lib/utils/currency";
import { WhatsAppInquiryButton } from "../components/whatsapp/WhatsAppInquiryButton";
import { SponsorMarquee } from "../components/marketing/SponsorMarquee";
import { PromotionalBanners } from "../components/marketing/PromotionalBanners";
import { Pagination } from "../components/ui/Pagination";
import { ProductItemTileImage } from "../components/products/ProductItemTileImage";
import { PrebuiltSystemCard } from "../components/products/PrebuiltSystemCard";
import {
  DEFAULT_HOMEPAGE_MODULES,
  DEFAULT_CUSTOM_PC_HERO,
  DEFAULT_FEATURED_PREBUILT_IDS,
  HomepageModuleItem,
  CustomPcHeroConfig,
  resolveActivePrebuilts,
} from "../lib/data/homepageConfig";

/**
 * Detect active grid columns matching Tailwind responsive breakpoints:
 * grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6
 */
function getGridColumns(width: number): number {
  if (width >= 1536) return 6; // 2xl
  if (width >= 1280) return 5; // xl
  if (width >= 1024) return 4; // lg
  if (width >= 768) return 3;  // md
  return 2;                    // mobile
}

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [columns, setColumns] = useState<number>(4);
  const [rowsPerPage, setRowsPerPage] = useState<number>(4);
  const { addStandardItem, addCustomPC, openCart } = useCartStore();

  // Sort state for Item Catalog
  const [sortBy, setSortBy] = useState<SortOptionId>("featured");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Homepage Dynamic Module Layout & Custom PC Hero Banner Config
  const [homepageModules, setHomepageModules] = useState<HomepageModuleItem[]>(DEFAULT_HOMEPAGE_MODULES);
  const [customPcHero, setCustomPcHero] = useState<CustomPcHeroConfig>(DEFAULT_CUSTOM_PC_HERO);
  const [featuredPrebuiltIds, setFeaturedPrebuiltIds] = useState<string[]>(DEFAULT_FEATURED_PREBUILT_IDS);

  useEffect(() => {
    // 1. Initial read from localStorage for instant zero-flicker render
    if (typeof window !== "undefined") {
      try {
        const cachedModules = localStorage.getItem("tethera_homepage_modules");
        if (cachedModules) {
          const parsed = JSON.parse(cachedModules);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHomepageModules(parsed);
          }
        }
        const cachedHero = localStorage.getItem("tethera_custom_pc_hero");
        if (cachedHero) {
          setCustomPcHero(JSON.parse(cachedHero));
        }
        const cachedFeatured = localStorage.getItem("tethera_featured_prebuilt_ids");
        if (cachedFeatured) {
          const parsed = JSON.parse(cachedFeatured);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFeaturedPrebuiltIds(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to read cached homepage config:", err);
      }
    }

    // 2. Fetch from API to sync with server
    const fetchLayoutConfig = async () => {
      try {
        const res = await fetch("/api/admin/homepage-modules");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (Array.isArray(data.modules) && data.modules.length > 0) {
              setHomepageModules(data.modules);
              if (typeof window !== "undefined") {
                localStorage.setItem("tethera_homepage_modules", JSON.stringify(data.modules));
              }
            }
            if (data.customPcHero) {
              setCustomPcHero(data.customPcHero);
              if (typeof window !== "undefined") {
                localStorage.setItem("tethera_custom_pc_hero", JSON.stringify(data.customPcHero));
              }
            }
            if (Array.isArray(data.featuredPrebuiltIds) && data.featuredPrebuiltIds.length > 0) {
              setFeaturedPrebuiltIds(data.featuredPrebuiltIds);
              if (typeof window !== "undefined") {
                localStorage.setItem("tethera_featured_prebuilt_ids", JSON.stringify(data.featuredPrebuiltIds));
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch homepage modules:", e);
      }
    };

    fetchLayoutConfig();

    // 3. Listen to update events from admin panel
    const handleUpdated = () => {
      try {
        const cachedFeatured = localStorage.getItem("tethera_featured_prebuilt_ids");
        if (cachedFeatured) {
          const parsed = JSON.parse(cachedFeatured);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFeaturedPrebuiltIds(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to read updated featured prebuilts from storage:", err);
      }
      fetchLayoutConfig();
    };
    window.addEventListener("tethera_homepage_updated", handleUpdated);
    window.addEventListener("storage", handleUpdated);
    return () => {
      window.removeEventListener("tethera_homepage_updated", handleUpdated);
      window.removeEventListener("storage", handleUpdated);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const detected = getGridColumns(window.innerWidth);
      setColumns(detected);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Dynamically calculate items per page based on current columns and rows preference
  const itemsPerPage = columns * rowsPerPage;

  // Row multipliers to offer clean multiples of the dynamic column count
  const rowMultipliers = columns >= 5 ? [3, 4, 6] : [4, 6, 8];
  const paginationOptions = rowMultipliers.map((r) => r * columns);

  // Click-outside and Escape key listener for sort dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSortOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSortOpen(false);
      }
    };

    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortOpen]);

  const sortedComponents = useMemo(() => {
    const result = getExpandedCatalogItems(MOCK_COMPONENTS);
    if (sortBy === "price-asc") {
      result.sort((a, b) => {
        const priceA = a.sale_price ?? a.price;
        const priceB = b.sale_price ?? b.price;
        return priceA - priceB;
      });
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => {
        const priceA = a.sale_price ?? a.price;
        const priceB = b.sale_price ?? b.price;
        return priceB - priceA;
      });
    } else if (sortBy === "stock") {
      result.sort((a, b) => b.stockCount - a.stockCount);
    }
    return result;
  }, [sortBy]);

  const totalComponents = sortedComponents.length;
  const totalPages = Math.max(1, Math.ceil(totalComponents / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedComponents = sortedComponents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSortChange = (sort: SortOptionId) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newCount: number) => {
    const calculatedRows = Math.max(1, Math.round(newCount / columns));
    setRowsPerPage(calculatedRows);
    setCurrentPage(1);
  };

  const activePrebuilts = useMemo(
    () => resolveActivePrebuilts(featuredPrebuiltIds, PREBUILT_SYSTEMS, 4),
    [featuredPrebuiltIds]
  );

  // =========================================================================
  // MODULAR HOMEPAGE SECTION RENDERERS (REORDERABLE VIA ADMIN)
  // =========================================================================

  // 1. Brand Partners Marquee
  const renderBrandMarquee = () => (
    <div key="brand_marquee" className="pt-4 sm:pt-6">
      <SponsorMarquee />
    </div>
  );

  // 2. Promotional Banners (Hero Carousel - Double Height)
  const renderPromotionalBanners = () => (
    <div key="promotional_banners" className="pt-2 sm:pt-4">
      <PromotionalBanners />
    </div>
  );

  // 3. Custom Desktop PCs Showcase Banner (Dynamic Text, Guarantees & Image)
  const renderCustomPcHero = () => (
    <section
      key="custom_pc_hero"
      className="bg-gradient-to-b from-white to-slate-100/60 dark:from-zinc-950 dark:to-zinc-900/60 border-y border-slate-300 dark:border-white/40 py-12 sm:py-16 transition-colors"
    >
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              <span>{customPcHero.topBadge || "Jakarta Flagship Store"}</span>
              <span>•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                {customPcHero.badgeHighlight || "Same-Day Click & Collect"}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.1]">
              {customPcHero.title} <br />
              <span className="text-slate-500 dark:text-zinc-400 font-normal">{customPcHero.subtitle}</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 max-w-xl leading-relaxed">
              {customPcHero.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={customPcHero.primaryCtaLink || "/builder"}
                className="min-h-[44px] px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 uppercase tracking-wide"
              >
                <Cpu className="w-4 h-4" />
                <span>{customPcHero.primaryCtaText || "Open PC Builder"}</span>
              </Link>

              <a
                href={customPcHero.secondaryCtaLink || "https://wa.me/6281234567890?text=Hi%20Tethera%20technician,%20I'd%20like%20guidance%20on%20building%20a%20custom%20PC."}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-5 py-3.5 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{customPcHero.secondaryCtaText || "Chat with Technician"}</span>
              </a>
            </div>

            {/* Guarantees Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-300 dark:border-white/40 text-xs text-slate-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{customPcHero.guarantee1 || "2-Yr Return-to-Base Warranty"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{customPcHero.guarantee2 || "24h Prime95 Burn-In Test"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{customPcHero.guarantee3 || "Flagship Counter Pickup"}</span>
              </div>
            </div>
          </div>

          {/* Hero Right Visual Showcase */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-white dark:bg-zinc-900 p-3 shadow-xl border border-slate-300 dark:border-white/30 overflow-hidden group">
              <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 item-frame">
                {customPcHero.imageUrl ? (
                  <img
                    src={customPcHero.imageUrl}
                    alt={customPcHero.imageTitle || "Tethera Custom Architecture"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <Image
                    src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=900&auto=format&fit=crop&q=80"
                    alt="Tethera Precision Custom Rig"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent pointer-events-none" />

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded">
                      {customPcHero.imageBadge || "Flagship Hub"}
                    </span>
                    <span className="text-xs text-slate-200 font-medium">
                      {customPcHero.imageSubBadge || "Click & Collect Ready"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {customPcHero.imageTitle || "Tethera Custom Architecture"}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {customPcHero.imageDescription || "Individually stress-tested workstations & enthusiast gaming rigs"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // 4. Pre-built Systems Showcase
  const renderPrebuiltSystems = () => (
    <section key="prebuilt_systems" id="prebuilt" className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-slate-300 dark:border-white/40 gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Pre-Configured Performance Rigs
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Assembled, stress-tested, and ready for same-day Click &amp; Collect pickup.
          </p>
        </div>
        <Link
          href="/prebuilts"
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors uppercase tracking-wider group"
        >
          <span>View More</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {activePrebuilts.map((pb, index) => (
          <PrebuiltSystemCard
            key={pb.id}
            rig={pb}
            isDesktopOnly={index >= 2}
          />
        ))}
      </div>

      <div className="mt-8 sm:mt-10 flex justify-center">
        <Link
          href="/prebuilts"
          className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-2 group"
        >
          <span>View More Prebuilts</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </section>
  );

  // 5. Item Catalog
  const renderComponentCatalog = () => (
    <section key="component_catalog" id="components" className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-300 dark:border-white/40 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Item Catalog
          </h2>
        </div>

        {/* Sort Selector (No container, single column) */}
        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => setIsSortOpen((prev) => !prev)}
            aria-expanded={isSortOpen}
            aria-haspopup="true"
            className="min-h-[44px] inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Sort: {SORT_OPTIONS.find((o) => o.id === sortBy)?.label}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                isSortOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Single Column Sort Dropdown */}
          {isSortOpen && (
            <div className="absolute right-0 top-full mt-2 z-40 w-48 sm:w-56 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/30 rounded-2xl shadow-xl p-1.5 flex flex-col space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
              {SORT_OPTIONS.map((option) => {
                const isSelected = sortBy === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      handleSortChange(option.id);
                      setIsSortOpen(false);
                    }}
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? "text-zinc-950 dark:text-white bg-slate-100 dark:bg-zinc-800"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Cards Grid */}
      {paginatedComponents.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-300 dark:border-white/30 p-6">
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
            No items available in the catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-5">
          {paginatedComponents.map((item) => {
            const itemHref =
              item.parentProductId && item.variationId
                ? `/products/${item.parentProductId}?variation=${item.variationId}`
                : `/products/${item.id}`;

            return (
              <div
                key={item.id}
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
                        <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black tracking-wide bg-slate-900/90 text-slate-100 border border-slate-700/80 shadow-xs uppercase">
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
                    <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                      {item.name}
                    </h4>
                  </Link>
                </div>

              <div className="mt-1 flex flex-col gap-1">
                {/* Price & Tax Note / Original Price Row */}
                <div className="flex items-baseline justify-between gap-2">
                  {/* Left Column: Current Price & Discount Badge */}
                  <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
                    <span className="text-sm sm:text-lg font-black text-zinc-900 dark:text-zinc-100 leading-tight">
                      {formatRupiah(item.sale_price && item.sale_price < item.price ? item.sale_price : item.price)}
                    </span>
                    {item.sale_price && item.sale_price < item.price && (
                      <span className="text-[10px] sm:text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded border border-rose-200 dark:border-rose-900/60 leading-tight shrink-0">
                        -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Right Column: Original Price (if discounted) & Tax Note */}
                  <div className="flex flex-col items-end text-right shrink-0">
                    {item.sale_price && item.sale_price < item.price ? (
                      <>
                        <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 line-through leading-none">
                          {formatRupiah(item.price)}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500 leading-none mt-0.5">
                          incl. tax
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] sm:text-xs text-slate-400 dark:text-zinc-500 leading-none">
                        incl. tax
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Catalog Pagination dynamically aligned with column count */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalComponents}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        options={paginationOptions}
        columns={columns}
        scrollToId="components"
        itemLabel="components"
      />

      {/* View All Components CTA (Container invisible) */}
      <div className="text-center pt-2">
        <Link
          href="/components"
          className="min-h-[44px] inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors uppercase tracking-wider group focus-visible:outline-2 focus-visible:outline-emerald-500"
        >
          <span>View All Items &amp; Hardware</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );

  return (
    <div className="space-y-12 pb-12 w-full max-w-full overflow-x-hidden">
      {homepageModules
        .filter((module) => module.enabled)
        .map((module) => {
          switch (module.id) {
            case "brand_marquee":
              return renderBrandMarquee();
            case "promotional_banners":
              return renderPromotionalBanners();
            case "custom_pc_hero":
              return renderCustomPcHero();
            case "prebuilt_systems":
              return renderPrebuiltSystems();
            case "component_catalog":
              return renderComponentCatalog();
            default:
              return null;
          }
        })}
    </div>
  );
}
