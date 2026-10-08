"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { MOCK_COMPONENTS, PREBUILT_SYSTEMS, ComponentItem } from "../lib/data/mockHardware";
import { useCartStore } from "../lib/store/useCartStore";
import { formatRupiah } from "../lib/utils/currency";
import { WhatsAppInquiryButton } from "../components/whatsapp/WhatsAppInquiryButton";
import { SponsorMarquee } from "../components/marketing/SponsorMarquee";
import { PromotionalBanners } from "../components/marketing/PromotionalBanners";
import { Pagination } from "../components/ui/Pagination";

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
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [columns, setColumns] = useState<number>(4);
  const [rowsPerPage, setRowsPerPage] = useState<number>(4);
  const { addStandardItem, addCustomPC, openCart } = useCartStore();

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

  const categories = [
    "All",
    "Processors",
    "Graphics Cards",
    "Motherboards",
    "Cooling",
    "Chassis",
    "Memory",
    "Storage",
  ];

  const filteredComponents = MOCK_COMPONENTS.filter(
    (item) => activeCategory === "All" || item.category === activeCategory
  );

  const totalComponents = filteredComponents.length;
  const totalPages = Math.max(1, Math.ceil(totalComponents / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedComponents = filteredComponents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newCount: number) => {
    const calculatedRows = Math.max(1, Math.round(newCount / columns));
    setRowsPerPage(calculatedRows);
    setCurrentPage(1);
  };

  const prebuilts = PREBUILT_SYSTEMS.slice(0, 3);

  const handleAddPrebuiltToCart = (pb: (typeof PREBUILT_SYSTEMS)[0]) => {
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
      totalPrice: pb.price,
      wattage: 750,
      isPrebuilt: true,
      image: pb.image,
    });
    openCart();
  };

  return (
    <div className="space-y-12 pb-12 w-full max-w-full overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1 & 2. BANNERS: Brand Partners Marquee & Promotional Campaigns */}
      {/* ========================================================================= */}
      <div className="pt-4 sm:pt-6 space-y-5">
        <SponsorMarquee />
        <PromotionalBanners />
      </div>

      {/* ========================================================================= */}
      {/* HERO SECTION: Tethera Precision Light / Dark Zinc Concept */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-b from-white to-slate-100/60 dark:from-zinc-950 dark:to-zinc-900/60 border-y border-slate-200 dark:border-zinc-800 py-12 sm:py-16 transition-colors">
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                <span>Jakarta Flagship Store</span>
                <span>•</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Same-Day Click &amp; Collect</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.1]">
                Custom Desktop PCs. <br />
                <span className="text-slate-500 dark:text-zinc-400 font-normal">Built &amp; Benchmarked in Jakarta.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 max-w-xl leading-relaxed">
                Configure high-performance desktop computers with real-time socket matching, dynamic TDP calculation, and component clearance validation. Pick up at our Mangga Dua Flagship Store or have your build shipped in reinforced wooden crates with internal foam cushioning.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/builder"
                  className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 uppercase tracking-wide"
                >
                  <Cpu className="w-4 h-4" />
                  <span>Open PC Builder</span>
                </Link>

                <a
                  href="https://wa.me/6281234567890?text=Hi%20Tethera%20technician,%20I'd%20like%20guidance%20on%20building%20a%20custom%20PC."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Chat with Technician</span>
                </a>
              </div>

              {/* Guarantees Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>2-Yr Return-to-Base Warranty</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>24h Prime95 Burn-In Test</span>
                </div>
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Flagship Counter Pickup</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Showcase */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-white dark:bg-zinc-900 p-3 shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden group">
                <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 item-frame">
                  <Image
                    src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=900&auto=format&fit=crop&q=80"
                    alt="Tethera Precision Custom Rig"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded">
                        Flagship Hub
                      </span>
                      <span className="text-xs text-slate-200 font-medium">Click &amp; Collect Ready</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">Tethera Custom Architecture</h3>
                    <p className="text-xs text-slate-300">Individually stress-tested workstations &amp; enthusiast gaming rigs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PRE-BUILT SYSTEMS SHOWCASE (Click & Collect Ready) */}
      {/* ========================================================================= */}
      <section id="prebuilt" className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-slate-200 dark:border-zinc-800 gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
              Turnkey Gaming Workstations
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              Pre-Configured Performance Rigs
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Assembled, stress-tested, and ready for same-day Click &amp; Collect pickup.
            </p>
          </div>
          <Link
            href="/builder"
            className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-4"
          >
            Build Custom Spec
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {prebuilts.map((pb) => (
            <div
              key={pb.id}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs tethera-card-hover flex flex-col group transition-colors"
            >
              <Link href={`/products/${pb.id}`} className="relative h-32 xs:h-40 sm:h-48 bg-slate-100 dark:bg-zinc-800 overflow-hidden block item-frame">
                <Image
                  src={pb.image}
                  alt={pb.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-200 border border-transparent dark:border-zinc-700 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-wider z-10">
                  Stress Tested
                </span>
              </Link>

              <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-4">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 dark:text-zinc-500 truncate block">{pb.sku}</span>
                  <Link href={`/products/${pb.id}`} className="block mt-0.5">
                    <h3 className="text-xs xs:text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors line-clamp-2">
                      {pb.name}
                    </h3>
                  </Link>

                  <div className="mt-2 sm:mt-3 space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-950 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-500">CPU:</span>
                      <strong className="text-zinc-800 dark:text-zinc-200 truncate ml-1">{pb.cpu}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-500">GPU:</span>
                      <strong className="text-zinc-800 dark:text-zinc-200 truncate ml-1">{pb.gpu}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-500">RAM:</span>
                      <strong className="text-zinc-800 dark:text-zinc-200 truncate ml-1">{pb.ram}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-500">Storage:</span>
                      <strong className="text-zinc-800 dark:text-zinc-200 truncate ml-1">{pb.storage}</strong>
                    </div>
                  </div>

                  <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1 sm:gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                    <span className="truncate">{pb.status}</span>
                  </div>
                </div>

                <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                  <div>
                    <span className="text-sm sm:text-xl font-black text-zinc-900 dark:text-zinc-100">{formatRupiah(pb.price)}</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500 block -mt-0.5">incl. tax</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleAddPrebuiltToCart(pb)}
                      className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-lg text-[10px] sm:text-xs font-bold transition-colors flex items-center gap-1 tactile-btn active:scale-95 shadow-2xs"
                      title="Add to Cart"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                    <Link
                      href={`/products/${pb.id}`}
                      className="px-2 py-1.5 sm:px-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-[10px] sm:text-xs font-bold transition-colors tactile-btn active:scale-95"
                    >
                      Specs
                    </Link>
                    <WhatsAppInquiryButton
                      mode="product"
                      product={{
                        productName: pb.name,
                        sku: pb.sku,
                        price: formatRupiah(pb.price),
                        productUrl: typeof window !== "undefined" ? window.location.href : "https://tethera.com",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PC HARDWARE & COMPONENTS CATALOG */}
      {/* ========================================================================= */}
      <section id="components" className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-4 border-b border-slate-200 dark:border-zinc-800 gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
              Flagship Inventory
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              PC Hardware &amp; Component Catalog
            </h2>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
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
        </div>

        {/* Product Cards Grid */}
        {paginatedComponents.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
              No components available in this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-5">
            {paginatedComponents.map((item) => (
              <div
                key={`${activeCategory}-${item.id}`}
                className="rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden p-2.5 sm:p-4 flex flex-col justify-between tethera-card-hover group transition-colors"
              >
                <div>
                  <Link
                    href={`/products/${item.id}`}
                    className="relative h-28 xs:h-36 sm:h-40 bg-slate-50 dark:bg-zinc-800/80 rounded-lg sm:rounded-xl overflow-hidden mb-2 sm:mb-3 border border-slate-100 dark:border-zinc-700/60 flex items-center justify-center p-2 block item-frame"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-contain p-1.5 sm:p-2 group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-white/90 dark:bg-zinc-800 px-1.5 sm:px-2 py-0.5 rounded shadow-2xs text-slate-700 dark:text-zinc-200 border border-transparent dark:border-zinc-700">
                      {item.brand}
                    </span>
                  </Link>

                  <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 dark:text-zinc-500 truncate">SKU: {item.sku}</div>
                  <Link href={`/products/${item.id}`} className="block mt-0.5">
                    <h4 className="text-[11px] xs:text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                      {item.name}
                    </h4>
                  </Link>

                  <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1 sm:gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                    <span className="truncate">Stock: {item.stockCount}</span>
                  </div>
                </div>

                <div className="pt-2.5 sm:pt-4 mt-2 sm:mt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 sm:gap-2">
                  <div>
                    {item.sale_price && item.sale_price < item.price ? (
                      <div>
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                          <span className="text-xs xs:text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100">
                            {formatRupiah(item.sale_price)}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 sm:px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/60">
                            -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-500 line-through">
                          {formatRupiah(item.price)}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs xs:text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100">{formatRupiah(item.price)}</div>
                        <div className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500">incl. tax</div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 justify-end">
                    <Link
                      href={`/products/${item.id}`}
                      className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] sm:text-xs font-bold rounded-lg transition-colors tactile-btn"
                    >
                      Specs
                    </Link>
                    <button
                      onClick={() => addStandardItem(item.sale_price ? { ...item, price: item.sale_price } : item)}
                      className="p-1.5 sm:p-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-lg text-xs font-bold transition-colors shadow-2xs tactile-btn min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Add to Cart"
                      aria-label="Add to Cart"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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

        {/* View All Components CTA */}
        <div className="text-center pt-2">
          <Link
            href="/components"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[44px]"
          >
            <span>View All Components &amp; Hardware</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
