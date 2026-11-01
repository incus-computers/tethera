"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function PrebuiltSystemsChoicePage() {
  const [hoveredChoice, setHoveredChoice] = useState<"gaming" | "workstation" | null>(null);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-10 space-y-8 sm:space-y-12">
      {/* Top Header and Breadcrumbs */}
      <div className="space-y-3">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium"
        >
          <Link
            href="/"
            className="hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Home
          </Link>
          <span className="text-slate-400 dark:text-zinc-600" aria-hidden="true">
            /
          </span>
          <span className="text-zinc-900 dark:text-zinc-200 font-bold">
            Prebuilt Systems
          </span>
        </nav>

        <div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
            Incus Prebuilt Platforms
          </h1>
          <p className="text-xs sm:text-base text-slate-600 dark:text-zinc-400 max-w-2xl mt-1.5 leading-relaxed font-normal">
            Choose your computing platform. Engineered, assembled, and benchmarked
            by hardware specialists in Jakarta. Select Gaming PCs for maximum frame rates or
            Workstations for precision multi-threaded compute.
          </p>
        </div>
      </div>

      {/* A or B Choice Grid: Gaming PCs vs Workstations */}
      <section
        aria-label="Platform Choice: Gaming PCs or Workstations"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch"
      >
        {/* Choice A: Gaming PCs */}
        <Link
          href="/prebuilts"
          onMouseEnter={() => setHoveredChoice("gaming")}
          onMouseLeave={() => setHoveredChoice(null)}
          className={`group relative flex flex-col justify-between bg-[#12141A] text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 overflow-hidden border transition-all duration-300 min-h-[460px] sm:min-h-[500px] focus:outline-none focus:ring-2 focus:ring-[#37baf2] select-none ${
            hoveredChoice === "gaming"
              ? "brightness-110 contrast-105 scale-[1.01] border-[#37baf2] shadow-2xl shadow-[#37baf2]/20 ring-1 ring-[#37baf2]/50 opacity-100 z-10"
              : hoveredChoice === "workstation"
              ? "brightness-50 contrast-90 scale-[0.99] opacity-40 border-white/5"
              : "brightness-100 opacity-95 border-white/10 hover:border-white/20"
          }`}
        >
          {/* Ambient Lighting Glow Behind Visuals */}
          <div
            className={`absolute -right-10 -bottom-10 w-96 h-96 bg-gradient-to-br from-[#37baf2]/25 via-[#52E394]/15 to-[#37baf2]/10 blur-3xl rounded-full pointer-events-none transition-opacity duration-300 ${
              hoveredChoice === "gaming" ? "opacity-100" : "opacity-40"
            }`}
            aria-hidden="true"
          />

          {/* Top Section: Breadcrumb & Headline */}
          <div className="relative z-10 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#8B949E] font-medium">
              <span>Desktop computers</span>
              <span className="text-[#555D68]" aria-hidden="true">
                /
              </span>
              <span className="text-[#37baf2] font-semibold">Gaming</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight group-hover:text-[#37baf2] transition-colors">
                Gaming PCs
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-lg font-normal leading-relaxed">
                Your next great game starts here. Explore Incus ready-to-go gaming PCs
                or build a system around the way you play.
              </p>
            </div>
          </div>

          {/* Middle/Bottom Visual: Dual Gaming Rig Showcase */}
          <div className="relative z-10 my-6 flex items-center justify-center">
            <div className="relative flex items-center justify-center -space-x-8 sm:-space-x-12">
              <div className="relative w-40 sm:w-52 aspect-[4/5] z-10 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80"
                  alt="Incus White Edition Gaming PC"
                  fill
                  className="object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.8)]"
                  priority
                />
              </div>
              <div className="relative w-40 sm:w-52 aspect-[4/5] z-0 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80"
                  alt="Incus Apex RGB Gaming PC"
                  fill
                  className="object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.8)]"
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs text-zinc-400">
              <span className="text-white font-bold">Ready to ship</span> or same-day Click &amp; Collect
            </div>

            <span className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#37baf2] text-[#0A0B0E] text-xs sm:text-sm font-bold inline-flex items-center gap-2 group-hover:bg-[#52c6f5] transition-all shadow-md">
              <span>Explore Gaming PCs</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </Link>

        {/* Choice B: Workstations */}
        <Link
          href="/prebuilts/workstations"
          onMouseEnter={() => setHoveredChoice("workstation")}
          onMouseLeave={() => setHoveredChoice(null)}
          className={`group relative flex flex-col justify-between bg-[#12141A] text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 overflow-hidden border transition-all duration-300 min-h-[460px] sm:min-h-[500px] focus:outline-none focus:ring-2 focus:ring-[#37baf2] select-none ${
            hoveredChoice === "workstation"
              ? "brightness-110 contrast-105 scale-[1.01] border-[#37baf2] shadow-2xl shadow-[#37baf2]/20 ring-1 ring-[#37baf2]/50 opacity-100 z-10"
              : hoveredChoice === "gaming"
              ? "brightness-50 contrast-90 scale-[0.99] opacity-40 border-white/5"
              : "brightness-100 opacity-95 border-white/10 hover:border-white/20"
          }`}
        >
          {/* Ambient Lighting Glow Behind Visuals */}
          <div
            className={`absolute -right-10 -bottom-10 w-96 h-96 bg-gradient-to-br from-[#37baf2]/20 via-indigo-600/15 to-[#52E394]/10 blur-3xl rounded-full pointer-events-none transition-opacity duration-300 ${
              hoveredChoice === "workstation" ? "opacity-100" : "opacity-40"
            }`}
            aria-hidden="true"
          />

          {/* Top Section: Breadcrumb & Headline */}
          <div className="relative z-10 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#8B949E] font-medium">
              <span>Desktop computers</span>
              <span className="text-[#555D68]" aria-hidden="true">
                /
              </span>
              <span className="text-[#37baf2] font-semibold">Workstations</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight group-hover:text-[#37baf2] transition-colors">
                Workstations
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-lg font-normal leading-relaxed">
                High-compute precision systems engineered for 3D rendering, machine learning,
                CAD modeling, and demanding multi-threaded creator workflows.
              </p>
            </div>
          </div>

          {/* Middle/Bottom Visual: Workstation Rig Showcase */}
          <div className="relative z-10 my-6 flex items-center justify-center">
            <div className="relative flex items-center justify-center -space-x-8 sm:-space-x-12">
              <div className="relative w-40 sm:w-52 aspect-[4/5] z-10 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&auto=format&fit=crop&q=80"
                  alt="Incus Titan Threadripper Studio Workstation"
                  fill
                  className="object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.8)]"
                  priority
                />
              </div>
              <div className="relative w-40 sm:w-52 aspect-[4/5] z-0 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&auto=format&fit=crop&q=80"
                  alt="Incus Precision CAD Core i9 Workstation"
                  fill
                  className="object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.8)]"
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs text-zinc-400">
              <span className="text-white font-bold">Precision certified</span> with 3-year warranty
            </div>

            <span className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#37baf2] text-[#0A0B0E] text-xs sm:text-sm font-bold inline-flex items-center gap-2 group-hover:bg-[#52c6f5] transition-all shadow-md">
              <span>Explore Workstations</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </Link>
      </section>
    </div>
  );
}
