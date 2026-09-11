"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  MessageSquare,
  Gift,
  Flame,
} from "lucide-react";

/**
 * Promotional Banner Definition
 * -------------------------------------------------------------
 * Supports two presentation formats:
 *  1. "content": Programmatic rich layout with badges, perks, buttons, and custom gradients.
 *  2. "image": Graphic picture banner supplied by brand partners or distributors (e.g. ASUS, MSI, NVIDIA).
 *     - Set `hideOverlay: true` to display pure edge-to-edge supplier artwork with no text overlays.
 *     - Omit `hideOverlay` to automatically overlay stylish responsive title, perks, and CTA button.
 */
export interface PromoSlide {
  id: string;
  type?: "content" | "image";
  title: string;
  ctaLink: string;

  /** Picture Banner Assets (For supplier/partner image banners) */
  imageUrl?: string;
  hideOverlay?: boolean; // Set true for raw partner promotional artwork where text is already baked into image

  /** Badges & Tagging */
  badge?: string;
  badgeType?: "hot" | "flagship" | "event" | "bundle" | "partner";
  tagColor?: string;

  /** Typography & Copy */
  highlight?: string;
  description?: string;
  perk?: string;

  /** Action Buttons */
  ctaText?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;

  /** Styling (for content cards) */
  bgGradient?: string;
}

/**
 * =========================================================================
 * BANNER CAMPAIGNS & SUPPLIER PROMOTIONS DATA
 * =========================================================================
 * TO ADD A NEW SUPPLIER/PARTNER PICTURE BANNER:
 * Simply add an object with `type: "image"`, for example:
 *
 * {
 *   id: "supplier-asus-banner",
 *   type: "image",
 *   imageUrl: "https://.../banner.jpg", // or local image e.g. "/banners/promo.png"
 *   title: "ASUS ROG Swift Campaign",
 *   ctaLink: "/components/gpu",
 *   ctaText: "Shop Promotion",
 *   badge: "Official Partner",
 *   description: "Special distributor pricing available this week.",
 *   // hideOverlay: true // (optional) if the picture already has text baked into it
 * }
 */
const PROMO_SLIDES: PromoSlide[] = [
  {
    id: "promo-white-festival",
    type: "content",
    badge: "Limited Time Event",
    badgeType: "event",
    title: "Tethera White Edition Build Festival",
    highlight: "Free 72-Hour Rig Stress Test & Cable Combs",
    description:
      "Design an all-white custom rig in our Configurator Studio this month. All white builds receive complimentary 72-hour burn-in calibration, custom white braided cables, and Windows 11 Pro setup.",
    ctaText: "Configure White Rig",
    ctaLink: "/builder",
    secondaryCtaText: "Browse Pre-Builts",
    secondaryCtaLink: "/prebuilts",
    perk: "Hemat hingga Rp 3.500.000 untuk sasis putih & komponen premium",
    bgGradient: "from-slate-50 via-white to-slate-100",
    tagColor: "bg-zinc-900 text-white",
  },
  {
    id: "promo-asus-rog-partner",
    type: "image",
    badge: "Official Brand Partner",
    badgeType: "partner",
    title: "ASUS ROG GeForce RTX 4080 SUPER Matrix",
    highlight: "Direct Factory Sealed Inventory • In Stock",
    description:
      "Flagship allocation from ASUS Indonesia. Integrated liquid cooling loop with 360mm radiator ready for 60-minute pickup or express dispatch.",
    ctaText: "Explore ROG Hardware",
    ctaLink: "/components/gpu",
    imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1400&auto=format&fit=crop&q=80",
    perk: "Full 3-Year Official Manufacturer Replacement Warranty",
    tagColor: "bg-red-600 text-white",
  },
  {
    id: "promo-rtx-drop",
    type: "content",
    badge: "Flagship In Stock",
    badgeType: "hot",
    title: "RTX 4070 Ti SUPER & 4080 SUPER Drop",
    highlight: "Ready for Pickup at Mangga Dua in 60 Minutes",
    description:
      "Direct factory-sealed stock from ASUS ROG, MSI, and Gigabyte. Reserve online with instant post-payment stock lock, or have your custom GPU setup assembled same-day.",
    ctaText: "Shop Graphics Cards",
    ctaLink: "/components/gpu",
    secondaryCtaText: "View Stock",
    secondaryCtaLink: "/components",
    perk: "Zero price gouging • Full 3-Year Official replacement warranty",
    bgGradient: "from-emerald-50/40 via-white to-slate-50",
    tagColor: "bg-emerald-600 text-white",
  },
  {
    id: "promo-corsair-partner",
    type: "image",
    badge: "Supplier Spotlight",
    badgeType: "partner",
    title: "Corsair Dominator Titanium & iCUE LINK Ecosystem",
    highlight: "Smart Cable Architecture & High Frequency DDR5",
    description:
      "Eliminate cable clutter with magnetic daisy-chaining. Precision-tuned DDR5-6000MHz memory profiles certified for Tethera gaming rigs.",
    ctaText: "View Memory & Cooling",
    ctaLink: "/components/ram",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1400&auto=format&fit=crop&q=80",
    perk: "Genuine Corsair Direct Factory Warranty",
    tagColor: "bg-amber-500 text-zinc-950",
  },
  {
    id: "promo-ryzen-bundle",
    type: "content",
    badge: "Bundle & Save",
    badgeType: "bundle",
    title: "AMD Ryzen 7800X3D + X670E / B650",
    highlight: "Diskon Langsung Rp 1.500.000 In-Cart",
    description:
      "Experience the pinnacle of gaming frame rates. Pair the Ryzen 7 7800X3D with any qualifying Socket AM5 motherboard and receive an instant Rp 1.500.000 price deduction at checkout.",
    ctaText: "View Processor Deals",
    ctaLink: "/components/cpu",
    secondaryCtaText: "Matching Motherboards",
    secondaryCtaLink: "/components/motherboards",
    perk: "Eligible for in-store pickup & express shipping",
    bgGradient: "from-amber-50/40 via-white to-slate-50",
    tagColor: "bg-amber-600 text-white",
  },
  {
    id: "promo-click-collect",
    type: "content",
    badge: "Omnichannel Service",
    badgeType: "flagship",
    title: "60-Minute In-Store Click & Collect",
    highlight: "Order Online • Collect in Mangga Dua Mall",
    description:
      "Need parts right away? Order before 4:00 PM for 60-minute pickup from our Mangga Dua Mall Store (Lt. 3 No. 36). Secure 4-digit pickup PIN sent straight to your WhatsApp and Email upon payment.",
    ctaText: "Browse All Inventory",
    ctaLink: "/components",
    secondaryCtaText: "Store Details",
    secondaryCtaLink: "#",
    perk: "Free in-store counter pickup • Dedicated collection bay",
    bgGradient: "from-sky-50/40 via-white to-slate-50",
    tagColor: "bg-sky-700 text-white",
  },
];

export function PromotionalBanners() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length);
  };

  // Auto-advance timer: cycles continuously without pausing on hover
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 6500);
    return () => clearInterval(timer);
  }, [currentSlide]);

  // Touch handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    setTouchStartX(null);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 pt-6 pb-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ========================================================================= */}
        {/* MAIN PROMOTIONAL SLIDER (8 Cols on Desktop) */}
        {/* ========================================================================= */}
        <div
          className="lg:col-span-8 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden bg-slate-900 flex flex-col justify-between min-h-[340px] sm:min-h-[360px]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Horizontal Sliding Track */}
          <div
            className="flex transition-transform duration-500 ease-out h-full min-h-[340px] sm:min-h-[360px]"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {PROMO_SLIDES.map((slide) => (
              <div
                key={slide.id}
                className="min-w-full w-full shrink-0 h-full flex flex-col justify-between"
              >
                {slide.type === "image" ? (
                  /* ------------------------------------------------------------- */
                  /* SUPPLIER & PARTNER PICTURE BANNER */
                  /* ------------------------------------------------------------- */
                  <div className="relative w-full h-full min-h-[340px] sm:min-h-[360px] overflow-hidden group">
                    <Link
                      href={slide.ctaLink}
                      className="relative w-full h-full min-h-[340px] sm:min-h-[360px] flex flex-col justify-between p-6 sm:p-8 block"
                    >
                      {/* Supplier Image Asset */}
                      {slide.imageUrl && (
                        <img
                          src={slide.imageUrl}
                          alt={slide.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      )}

                      {/* Optional Overlay (hidden if hideOverlay is specified) */}
                      {!slide.hideOverlay && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-zinc-950/20" />

                          {/* Top Row: Partner Badge */}
                          <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {slide.badge && (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                    slide.tagColor || "bg-white text-zinc-900"
                                  } shadow-sm`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                  <span>{slide.badge}</span>
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-white/90 bg-zinc-900/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full hidden sm:inline-block">
                                Partner Showcase
                              </span>
                            </div>
                          </div>

                          {/* Bottom Content Area */}
                          <div className="relative z-10 space-y-2 max-w-xl pb-1 pr-32 sm:pr-36">
                            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                              {slide.title}
                            </h2>
                            {slide.highlight && (
                              <div className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>{slide.highlight}</span>
                              </div>
                            )}
                            {slide.description && (
                              <p className="text-xs sm:text-sm text-slate-200 mt-1 line-clamp-2 leading-relaxed">
                                {slide.description}
                              </p>
                            )}
                            {slide.perk && (
                              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/80 backdrop-blur-xs border border-white/20 rounded-lg text-xs font-semibold text-slate-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{slide.perk}</span>
                              </div>
                            )}
                            {slide.ctaText && (
                              <div className="pt-2">
                                <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-zinc-900 rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md group-hover:translate-x-0.5">
                                  <span>{slide.ctaText}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </Link>
                  </div>
                ) : (
                  /* ------------------------------------------------------------- */
                  /* PROGRAMMATIC RICH CONTENT BANNER */
                  /* ------------------------------------------------------------- */
                  <div
                    className={`w-full h-full min-h-[340px] sm:min-h-[360px] p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-br ${
                      slide.bgGradient || "from-slate-50 via-white to-slate-100"
                    } relative overflow-hidden`}
                  >
                    {/* Decorative watermark */}
                    <div className="absolute right-4 -bottom-8 pointer-events-none opacity-[0.04] select-none">
                      <span className="text-9xl font-black text-zinc-900 tracking-tighter">
                        TETHERA
                      </span>
                    </div>

                    <div>
                      {/* Top Badge Row */}
                      <div className="flex items-center justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                              slide.tagColor || "bg-zinc-900 text-white"
                            } shadow-2xs`}
                          >
                            {slide.badgeType === "hot" && <Flame className="w-3.5 h-3.5" />}
                            {slide.badgeType === "event" && <Sparkles className="w-3.5 h-3.5" />}
                            {slide.badgeType === "bundle" && <Gift className="w-3.5 h-3.5" />}
                            {slide.badgeType === "flagship" && <Clock className="w-3.5 h-3.5" />}
                            {slide.badgeType === "partner" && (
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>{slide.badge}</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline-block">
                            Active Promotion
                          </span>
                        </div>
                      </div>

                      {/* Banner Main Title & Highlight */}
                      <h2 className="text-xl sm:text-3xl font-black text-zinc-900 tracking-tight leading-tight">
                        {slide.title}
                      </h2>
                      {slide.highlight && (
                        <div className="text-xs sm:text-sm font-bold text-zinc-700 mt-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{slide.highlight}</span>
                        </div>
                      )}

                      {/* Banner Description */}
                      {slide.description && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-2.5 max-w-2xl leading-relaxed">
                          {slide.description}
                        </p>
                      )}

                      {/* Benefit perk pill */}
                      {slide.perk && (
                        <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 bg-white/90 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{slide.perk}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-6 mt-4 border-t border-slate-200/60 flex items-center justify-between gap-3 pr-32 sm:pr-36">
                      <div className="flex items-center gap-3">
                        <Link
                          href={slide.ctaLink}
                          className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-xs flex items-center gap-2 uppercase tracking-wide group"
                        >
                          <span>{slide.ctaText || "Explore Details"}</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>

                        {slide.secondaryCtaText && slide.secondaryCtaLink && (
                          <Link
                            href={slide.secondaryCtaLink}
                            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-zinc-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs hidden sm:inline-flex"
                          >
                            {slide.secondaryCtaText}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Fixed Floating Navigation Controls (Persistent across all slides) */}
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-200/90 shadow-md">
            <button
              onClick={prevSlide}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-zinc-700 transition-colors"
              aria-label="Previous promotion"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Indicator Dots */}
            <div className="flex items-center gap-1.5 px-1">
              {PROMO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx ? "w-6 bg-zinc-900" : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-zinc-700 transition-colors"
              aria-label="Next promotion"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECONDARY SIDE PROMO TILES (4 Cols on Desktop) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4 justify-between">
          {/* Tile 1: 60-Minute Click & Collect Guarantee */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Ready in 60 Mins
                </span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                Flagship In-Store Pick-Up
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Order before 4 PM for 60-minute pickup at our Mangga Dua Mall Store (Lt. 3 No. 36). 4-digit pickup code sent via WhatsApp and Email.
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Express Counter Open</span>
              </span>
              <Link
                href="/components"
                className="text-xs font-bold text-zinc-900 group-hover:text-emerald-700 flex items-center gap-1 transition-colors"
              >
                <span>Stock</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Tile 2: WhatsApp Build Tech Support */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  Direct Tech Line
                </span>
                <MessageSquare className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                Instant WhatsApp Consultation
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Have questions about socket compatibility or GPU clearances? Chat live with certified Tethera PC architects.
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">+62 812-3456-7890</span>
              <a
                href="https://wa.me/6281234567890?text=Hi%20Tethera%20team,%20I'd%20like%20to%20consult%20about%20a%20PC%20build."
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
              >
                <span>Chat Now</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
