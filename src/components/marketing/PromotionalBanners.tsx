"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Clock,
  Gift,
  Flame,
  Sparkles,
} from "lucide-react";

import {
  PromoSlide,
  CANONICAL_PROMO_SLIDES,
  mapBannerToPromoSlide,
  areSlidesEqual,
} from "@/lib/data/promotionalBannersData";

export type { PromoSlide };

export function PromotionalBanners() {
  const [slides, setSlides] = useState<PromoSlide[]>(CANONICAL_PROMO_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    // 1. Check cached banners in localStorage for instant zero-flicker rehydration
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tethera_promotional_banners");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSlides((prev) => (areSlidesEqual(prev, parsed) ? prev : parsed));
          }
        }
      } catch (err) {
        console.error("Failed to read cached promotional banners:", err);
      }
    }

    // 2. Fetch fresh dynamic banners from API
    fetch("/api/admin/banners")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.banners) && data.banners.length > 0) {
          const mapped: PromoSlide[] = data.banners.map(mapBannerToPromoSlide);
          setSlides((prev) => {
            if (areSlidesEqual(prev, mapped)) {
              return prev; // Identical: keep reference, zero re-render, zero flicker
            }
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("tethera_promotional_banners", JSON.stringify(mapped));
              } catch {
                // Ignore localStorage errors
              }
            }
            return mapped;
          });
        }
      })
      .catch((err) => console.log("Using fallback promotional banners:", err));
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Auto-advance timer: cycles continuously without pausing on hover
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 6500);
    return () => clearInterval(timer);
  }, [currentSlide, slides.length]);

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

  const isImageSlide = slides[currentSlide]?.type === "image";

  return (
    <section className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 pb-2 overflow-x-hidden">
      {/* ========================================================================= */}
      {/* MAIN PROMOTIONAL SLIDER (Full Width) */}
      {/* ========================================================================= */}
      <div
        className="w-full rounded-3xl border border-slate-300 dark:border-white/40 shadow-xs relative overflow-hidden bg-slate-900 flex flex-col justify-between min-h-[680px] sm:min-h-[720px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Horizontal Sliding Track */}
        <div
          className="flex transition-transform duration-500 ease-out h-full min-h-[680px] sm:min-h-[720px]"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="min-w-full w-full shrink-0 h-full flex flex-col justify-between"
            >
              {slide.type === "image" ? (
                /* ------------------------------------------------------------- */
                /* SUPPLIER & PARTNER PICTURE BANNER */
                /* ------------------------------------------------------------- */
                <div className="relative w-full h-full min-h-[680px] sm:min-h-[720px] overflow-hidden group">
                  <Link
                    href={slide.ctaLink}
                    className="relative w-full h-full min-h-[680px] sm:min-h-[720px] flex flex-col justify-between p-6 sm:p-8 md:p-10 block"
                  >
                    {/* Supplier Image Asset */}
                    {slide.imageUrl && (
                      <Image
                        src={slide.imageUrl}
                        alt={slide.title}
                        fill
                        sizes="(max-width: 1920px) 100vw, 1920px"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
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
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                  slide.tagColor || "bg-white text-zinc-900"
                                } shadow-sm`}
                              >
                                <span>{slide.badge}</span>
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-white/90 bg-zinc-900/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full hidden sm:inline-block">
                              Partner Showcase
                            </span>
                          </div>
                        </div>

                        {/* Bottom Content Area */}
                        <div className="relative z-10 space-y-3 max-w-3xl pb-2 pr-24 sm:pr-36">
                          <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                            {slide.title}
                          </h2>
                          {slide.highlight && (
                            <div className="text-xs sm:text-base font-bold text-[#37baf2] flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#37baf2]" />
                              <span>{slide.highlight}</span>
                            </div>
                          )}
                          {slide.description && (
                            <p className="text-xs sm:text-base md:text-lg text-slate-200 mt-2 line-clamp-3 leading-relaxed">
                              {slide.description}
                            </p>
                          )}
                          {slide.perk && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900/80 backdrop-blur-xs border border-white/20 rounded-lg text-xs sm:text-sm font-semibold text-slate-200">
                              <ShieldCheck className="w-4 h-4 text-[#37baf2] shrink-0" />
                              <span>{slide.perk}</span>
                            </div>
                          )}
                          {slide.ctaText && (
                            <div className="pt-3">
                              <span className="min-h-[44px] inline-flex items-center gap-2 text-sm sm:text-base font-extrabold text-white group-hover:text-[#37baf2] transition-colors uppercase tracking-wide">
                                <span>{slide.ctaText}</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                  className={`w-full h-full min-h-[680px] sm:min-h-[720px] p-6 sm:p-8 md:p-10 flex flex-col justify-between bg-gradient-to-br ${
                    slide.bgGradient || "from-slate-50 via-white to-slate-100"
                  } dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 relative overflow-hidden transition-colors`}
                >
                  {/* Decorative watermark */}
                  <div className="absolute right-4 -bottom-8 pointer-events-none opacity-[0.04] dark:opacity-[0.03] select-none">
                    <span className="text-9xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter">
                      INCUS
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
                          {slide.badgeType === "bundle" && <Gift className="w-3.5 h-3.5" />}
                          {slide.badgeType === "flagship" && <Clock className="w-3.5 h-3.5" />}
                          {slide.badgeType === "event" && (
                            <Sparkles className="w-3.5 h-3.5 text-[#37baf2]" />
                          )}
                          <span>{slide.badge}</span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hidden sm:inline-block">
                          Active Promotion
                        </span>
                      </div>
                    </div>

                    {/* Banner Main Title & Highlight */}
                    <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
                      {slide.title}
                    </h2>
                    {slide.highlight && (
                      <div className="text-xs sm:text-base font-bold text-zinc-700 dark:text-zinc-300 mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#37baf2]" />
                        <span>{slide.highlight}</span>
                      </div>
                    )}

                    {/* Banner Description */}
                    {slide.description && (
                      <p className="text-xs sm:text-base md:text-lg text-slate-600 dark:text-zinc-400 mt-4 max-w-3xl leading-relaxed">
                        {slide.description}
                      </p>
                    )}

                    {/* Benefit perk pill */}
                    {slide.perk && (
                      <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-200 shadow-2xs">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-[#37baf2]" />
                        <span>{slide.perk}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Row */}
                  <div className="pt-6 mt-6 flex items-center justify-between gap-3 pr-24 sm:pr-36">
                    <div className="flex items-center gap-4">
                      <Link
                        href={slide.ctaLink}
                        className="min-h-[44px] inline-flex items-center gap-2 text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white transition-colors uppercase tracking-wide group hover:text-[#37baf2] dark:hover:text-[#37baf2]"
                      >
                        <span>{slide.ctaText || "Explore Details"}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform group-hover:text-[#37baf2]" />
                      </Link>

                      {slide.secondaryCtaText && slide.secondaryCtaLink && (
                        <Link
                          href={slide.secondaryCtaLink}
                          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-4 hover:underline hidden sm:inline-flex"
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
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex items-center gap-1">
          <button
            onClick={prevSlide}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#37baf2] ${
              isImageSlide
                ? "text-white/80 hover:text-white"
                : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
            }`}
            aria-label="Previous promotion"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Indicator Dots */}
          <div className="flex items-center gap-1.5 px-1">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className="min-h-[44px] min-w-[20px] flex items-center justify-center focus-visible:outline-hidden"
              >
                <span
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx
                      ? "w-6 bg-[#37baf2]"
                      : isImageSlide
                      ? "w-2 bg-white/40 hover:bg-white/70"
                      : "w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-500"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            onClick={nextSlide}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#37baf2] ${
              isImageSlide
                ? "text-white/80 hover:text-white"
                : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
            }`}
            aria-label="Next promotion"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
