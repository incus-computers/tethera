"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Zap,
  Store,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Cpu,
  Monitor,
  CheckCircle,
  Clock,
  MessageSquare,
  Plus,
} from "lucide-react";
import { MOCK_COMPONENTS, ComponentItem } from "../lib/data/mockHardware";
import { useCartStore } from "../lib/store/useCartStore";
import { formatRupiah } from "../lib/utils/currency";
import { WhatsAppInquiryButton } from "../components/whatsapp/WhatsAppInquiryButton";
import { SponsorMarquee } from "../components/marketing/SponsorMarquee";
import { PromotionalBanners } from "../components/marketing/PromotionalBanners";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All");
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
  ];

  const filteredComponents = MOCK_COMPONENTS.filter(
    (item) => activeCategory === "All" || item.category === activeCategory
  );

  const prebuilts = [
    {
      id: "pb-1",
      name: "Tethera Apex Ryzen 7 RTX 4080S",
      sku: "TET-APEX-7800X3D",
      cpu: "AMD Ryzen 7 7800X3D",
      gpu: "GeForce RTX 4080 SUPER 16GB",
      ram: "32GB DDR5-6000",
      storage: "2TB NVMe PCIe 4.0",
      cooling: "360mm ARGB Liquid AIO",
      price: 2699,
      image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80",
      status: "In Stock at Flagship (Ready for Pickup in 60m)",
    },
    {
      id: "pb-2",
      name: "Tethera Kinetic Core i7 RTX 4070Ti",
      sku: "TET-KIN-14700K",
      cpu: "Intel Core i7-14700K",
      gpu: "GeForce RTX 4070 Ti SUPER 16GB",
      ram: "32GB DDR5-6000",
      storage: "1TB NVMe PCIe 4.0",
      cooling: "Noctua Dual Tower Air",
      price: 2199,
      image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=80",
      status: "In Stock at Flagship (Ready for Pickup in 60m)",
    },
    {
      id: "pb-3",
      name: "Tethera Minimalist White Workstation",
      sku: "TET-MIN-7950X",
      cpu: "AMD Ryzen 9 7950X 16-Core",
      gpu: "GeForce RTX 4080 SUPER 16GB",
      ram: "64GB DDR5-6000",
      storage: "4TB NVMe RAID",
      cooling: "Fractal North Chalk White",
      price: 3199,
      image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600&auto=format&fit=crop&q=80",
      status: "Built-to-Order (24h Express Assembly)",
    },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* ========================================================================= */}
      {/* 1. MOVING SPONSOR BANNER (Infinite Logos Marquee) */}
      {/* ========================================================================= */}
      <SponsorMarquee />

      {/* ========================================================================= */}
      {/* 2. PROMOTIONAL BANNERS (Active Campaigns & Promotions) */}
      {/* ========================================================================= */}
      <PromotionalBanners />

      {/* ========================================================================= */}
      {/* HERO SECTION: Tethera Precision Light Gray / White Concept */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-b from-white to-slate-100/60 border-y border-slate-200 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-900 text-white shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Configurator Studio 2.0</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Click & Collect: Ready in 60m</span>
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 leading-[1.1]">
                Precision Custom PCs. <br />
                <span className="text-slate-500 font-normal">Architected for Enthusiasts.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                Design your dream computer with real-time socket matching, dynamic TDP calculation, and component clearance validation. Pick up at our Flagship Store or have it dispatched in wooden transit armor.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/builder"
                  className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center gap-2 uppercase tracking-wide group"
                >
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Launch Custom PC Builder</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <a
                  href="https://wa.me/6281234567890?text=Hi%20Tethera%20technician,%20I'd%20like%20guidance%20on%20building%20a%20custom%20PC."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 bg-white hover:bg-slate-50 text-zinc-800 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Chat with Technician</span>
                </a>
              </div>

              {/* Guarantees Ribbon */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>2-Yr Return-to-Base Warranty</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>24h Prime95 Burn-In Test</span>
                </div>
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Flagship Counter Pickup</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Showcase */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-white p-3 shadow-xl border border-slate-200 overflow-hidden group">
                <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=900&auto=format&fit=crop&q=80"
                    alt="Tethera Precision Custom Rig"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />
                  
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded">
                        Flagship Hub
                      </span>
                      <span className="text-xs text-slate-200 font-medium">Click & Collect Ready</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">Tethera Custom Architecture</h3>
                    <p className="text-xs text-slate-300">Individually stress-tested workstations & enthusiast gaming rigs</p>
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
      <section id="prebuilt" className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-slate-200 gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Turnkey Gaming Workstations
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              Pre-Configured Performance Rigs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assembled, stress-tested, and ready for same-day Click & Collect pickup.
            </p>
          </div>
          <Link
            href="/builder"
            className="text-xs font-bold text-zinc-900 hover:text-zinc-700 flex items-center gap-1"
          >
            <span>Or Build from Scratch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {prebuilts.map((pb, idx) => (
            <div
              key={pb.id}
              style={{ animationDelay: `${idx * 70}ms` }}
              className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs tethera-card-hover flex flex-col group animate-pop-in"
            >
              <Link href={`/products/${pb.id}`} className="relative h-48 bg-slate-100 overflow-hidden block">
                <img
                  src={pb.image}
                  alt={pb.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-zinc-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  24h Stress Tested
                </span>
              </Link>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[11px] font-mono text-slate-400">{pb.sku}</span>
                  <Link href={`/products/${pb.id}`} className="block mt-0.5">
                    <h3 className="text-base font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                      {pb.name}
                    </h3>
                  </Link>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-400">CPU:</span>
                      <strong className="text-zinc-800">{pb.cpu}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">GPU:</span>
                      <strong className="text-zinc-800">{pb.gpu}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">RAM:</span>
                      <strong className="text-zinc-800">{pb.ram}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Storage:</span>
                      <strong className="text-zinc-800">{pb.storage}</strong>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{pb.status}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-black text-zinc-900">{formatRupiah(pb.price)}</span>
                    <span className="text-[10px] text-slate-400 block -mt-1">incl. tax</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <WhatsAppInquiryButton
                      mode="product"
                      product={{
                        productName: pb.name,
                        sku: pb.sku,
                        price: formatRupiah(pb.price),
                        productUrl: typeof window !== "undefined" ? window.location.href : "https://tethera.com",
                      }}
                    />
                    <Link
                      href={`/products/${pb.id}`}
                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      View Specs
                    </Link>
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
      <section id="components" className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-4 border-b border-slate-200 gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Flagship Inventory
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              PC Hardware & Component Catalog
            </h2>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap tactile-btn active:scale-95 ${
                  activeCategory === cat
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredComponents.map((item, idx) => (
            <div
              key={`${activeCategory}-${item.id}`}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="rounded-2xl bg-white border border-slate-200 overflow-hidden p-4 flex flex-col justify-between tethera-card-hover group animate-pop-in"
            >
              <div>
                <Link
                  href={`/products/${item.id}`}
                  className="relative h-40 bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center p-2 block"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-white/90 px-2 py-0.5 rounded shadow-2xs text-slate-700">
                    {item.brand}
                  </span>
                </Link>

                <div className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</div>
                <Link href={`/products/${item.id}`} className="block mt-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900 line-clamp-2 leading-snug group-hover:text-zinc-700 transition-colors">
                    {item.name}
                  </h4>
                </Link>

                <div className="mt-2 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Flagship Stock: {item.stockCount} Available</span>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-base font-black text-zinc-900">{formatRupiah(item.price)}</div>
                  <div className="text-[10px] text-slate-400">incl. tax</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/products/${item.id}`}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-zinc-800 text-xs font-bold rounded-lg transition-colors tactile-btn active:scale-95"
                  >
                    Specs
                  </Link>
                  <button
                    onClick={() => addStandardItem(item)}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs tactile-btn active:scale-90"
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

        {/* View All Components CTA */}
        <div className="text-center pt-4">
          <Link
            href="/components"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-zinc-900 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <span>View All Components & Hardware</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
