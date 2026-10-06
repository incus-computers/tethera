"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Award, Sparkles } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  tier: string;
  badge: string;
  categoryLink: string;
  accentColor: string;
  logoSvg: React.ReactNode;
}

const SPONSORS: Sponsor[] = [
  {
    id: "nvidia",
    name: "NVIDIA GeForce",
    tier: "Official Partner",
    badge: "RTX 40-Series",
    categoryLink: "/components/gpu",
    accentColor: "#76B900",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 120 28" fill="currentColor">
        <path d="M12.5 4.2C7 4.2 2.5 8.7 2.5 14.2c0 5.5 4.5 10 10 10 4.2 0 7.8-2.6 9.3-6.4h-3.4c-1.2 2.1-3.4 3.6-5.9 3.6-3.9 0-7-3.1-7-7s3.1-7 7-7c2.5 0 4.7 1.4 5.9 3.6h3.4C20.3 6.8 16.7 4.2 12.5 4.2z" />
        <text x="32" y="19" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="15" letterSpacing="0.5">
          NVIDIA
        </text>
      </svg>
    ),
  },
  {
    id: "amd",
    name: "AMD",
    tier: "Strategic Partner",
    badge: "Ryzen 9000 & 7000",
    categoryLink: "/components/cpu",
    accentColor: "#ED1C24",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 100 28" fill="currentColor">
        <polygon points="4,4 18,4 18,18 25,18 25,25 4,25" />
        <polygon points="20,11 27,4 27,11" />
        <text x="35" y="19" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="16" letterSpacing="1">
          AMD
        </text>
      </svg>
    ),
  },
  {
    id: "intel",
    name: "Intel",
    tier: "Authorized Provider",
    badge: "Core 14th Gen",
    categoryLink: "/components/cpu",
    accentColor: "#0071C5",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 100 28" fill="currentColor">
        <text x="5" y="19" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="17" letterSpacing="1">
          intel
        </text>
        <circle cx="58" cy="7" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "asus-rog",
    name: "ASUS ROG",
    tier: "Premium Sponsor",
    badge: "Motherboards & GPUs",
    categoryLink: "/components/motherboards",
    accentColor: "#FF0033",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 130 28" fill="currentColor">
        <path d="M4 14 L12 6 L20 14 L16 14 L12 10 L8 14 Z" />
        <text x="26" y="19" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="14" letterSpacing="0.8">
          REPUBLIC OF GAMERS
        </text>
      </svg>
    ),
  },
  {
    id: "corsair",
    name: "Corsair",
    tier: "Official Partner",
    badge: "DDR5 & PSUs",
    categoryLink: "/components/ram",
    accentColor: "#F59E0B",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 120 28" fill="currentColor">
        <path d="M5 22 C9 14 16 8 22 5 C19 12 14 18 5 22 Z" />
        <text x="28" y="19" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="14" letterSpacing="1.2">
          CORSAIR
        </text>
      </svg>
    ),
  },
  {
    id: "lian-li",
    name: "Lian Li",
    tier: "Chassis Partner",
    badge: "O11 Dynamic & Lancool",
    categoryLink: "/components/cases",
    accentColor: "#0EA5E9",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 110 28" fill="currentColor">
        <rect x="4" y="6" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <text x="24" y="19" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="14" letterSpacing="1">
          LIAN LI
        </text>
      </svg>
    ),
  },
  {
    id: "msi",
    name: "MSI Gaming",
    tier: "Authorized Partner",
    badge: "Gaming Hardware",
    categoryLink: "/components/motherboards",
    accentColor: "#DC2626",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 95 28" fill="currentColor">
        <path d="M4 18 L10 6 L16 18 L22 6 L28 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <text x="36" y="19" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="15" letterSpacing="1.5">
          MSI
        </text>
      </svg>
    ),
  },
  {
    id: "fractal",
    name: "Fractal Design",
    tier: "Acoustics Partner",
    badge: "North & Torrent",
    categoryLink: "/components/cases",
    accentColor: "#71717A",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 130 28" fill="currentColor">
        <path d="M6 6 H20 V10 H10 V14 H18 V18 H10 V22 H6 Z" />
        <text x="26" y="19" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="13" letterSpacing="1">
          FRACTAL
        </text>
      </svg>
    ),
  },
  {
    id: "seasonic",
    name: "Seasonic",
    tier: "Power Sponsor",
    badge: "Focus & Vertex ATX 3.0",
    categoryLink: "/components/power-supplies",
    accentColor: "#10B981",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 120 28" fill="currentColor">
        <circle cx="12" cy="14" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <text x="25" y="19" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="14" letterSpacing="0.8">
          SEASONIC
        </text>
      </svg>
    ),
  },
  {
    id: "samsung",
    name: "Samsung",
    tier: "Memory & Storage",
    badge: "990 PRO NVMe",
    categoryLink: "/components/storage",
    accentColor: "#2563EB",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 120 28" fill="currentColor">
        <text x="5" y="19" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="15" letterSpacing="2">
          SAMSUNG
        </text>
      </svg>
    ),
  },
  {
    id: "nzxt",
    name: "NZXT",
    tier: "Design Partner",
    badge: "Kraken Liquid & H-Series",
    categoryLink: "/components/cooling",
    accentColor: "#8B5CF6",
    logoSvg: (
      <svg className="h-6 w-auto" viewBox="0 0 90 28" fill="currentColor">
        <text x="4" y="19" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="16" letterSpacing="2.5">
          NZXT
        </text>
      </svg>
    ),
  },
];

export function SponsorMarquee() {
  return (
    <section className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="w-full bg-slate-100/70 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden relative group shadow-2xs transition-colors">
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200/50 dark:border-zinc-800/80">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300">
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="uppercase tracking-wider text-[11px] text-zinc-900 dark:text-zinc-100">
              Official Brand Partners & Hardware Sponsors
            </span>
            <span className="hidden md:inline-block text-slate-400 dark:text-zinc-500 font-normal">
              • 100% Genuine Direct Factory Sealed Inventory
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            <span>Click logo to explore certified hardware</span>
          </div>
        </div>

        {/* Marquee Track Container with CSS mask so logos fade smoothly at the exact border */}
        <div
          className="relative py-3 overflow-hidden w-full"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)",
          }}
        >
          {/* Moving Marquee Track: two identical blocks for seamless 50% loop */}
          <div className="animate-marquee flex items-center w-max hover:[animation-play-state:paused]">
            {/* Primary Track */}
            <div className="flex items-center gap-6 sm:gap-8 pr-6 sm:pr-8 shrink-0">
              {SPONSORS.map((sponsor) => (
                <Link
                  key={`track1-${sponsor.id}`}
                  href={sponsor.categoryLink}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/90 hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 border border-slate-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-all shadow-2xs hover:shadow-sm shrink-0 group/item hover:scale-105 duration-200"
                >
                  {/* Logo / Emblem */}
                  <div className="text-zinc-800 dark:text-zinc-200 group-hover/item:text-zinc-950 dark:group-hover/item:text-white transition-colors">
                    {sponsor.logoSvg}
                  </div>

                  {/* Sponsor info pill */}
                  <div className="border-l border-slate-200 dark:border-zinc-700 pl-3 hidden lg:block text-left">
                    <span className="text-[9px] font-bold uppercase tracking-wider block text-slate-400 dark:text-zinc-500 group-hover/item:text-slate-600 dark:group-hover/item:text-zinc-300">
                      {sponsor.tier}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {sponsor.badge}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Seamless Duplicate Track for continuous infinite scroll */}
            <div className="flex items-center gap-6 sm:gap-8 pr-6 sm:pr-8 shrink-0" aria-hidden="true">
              {SPONSORS.map((sponsor) => (
                <Link
                  key={`track2-${sponsor.id}`}
                  href={sponsor.categoryLink}
                  tabIndex={-1}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/90 hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 border border-slate-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-all shadow-2xs hover:shadow-sm shrink-0 group/item hover:scale-105 duration-200"
                >
                  {/* Logo / Emblem */}
                  <div className="text-zinc-800 dark:text-zinc-200 group-hover/item:text-zinc-950 dark:group-hover/item:text-white transition-colors">
                    {sponsor.logoSvg}
                  </div>

                  {/* Sponsor info pill */}
                  <div className="border-l border-slate-200 dark:border-zinc-700 pl-3 hidden lg:block text-left">
                    <span className="text-[9px] font-bold uppercase tracking-wider block text-slate-400 dark:text-zinc-500 group-hover/item:text-slate-600 dark:group-hover/item:text-zinc-300">
                      {sponsor.tier}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {sponsor.badge}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
