"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Search,
  ShoppingCart,
  User,
  Zap,
  Clock,
  Phone,
  MessageSquare,
  ChevronDown,
  Sparkles,
  LayoutGrid,
  Cpu,
  Monitor,
  Layers,
  Wind,
  Box,
  CircuitBoard,
  HardDrive,
  ArrowRight,
  ChevronRight,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { FlagshipStoreModal } from "./FlagshipStoreModal";
import { PredictiveSearchModal } from "./PredictiveSearchModal";
import { CartDrawer } from "./CartDrawer";
import { GlobalLocationModal } from "../shipping/GlobalLocationModal";
import { useCartStore } from "../../lib/store/useCartStore";
import { useLocationStore } from "../../lib/store/useLocationStore";
import { formatRupiah } from "../../lib/utils/currency";
import { useAuthStore } from "../../lib/store/useAuthStore";

export function PersistentHeader() {
  const [isSticky, setIsSticky] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const categoriesTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const categoriesContainerRef = React.useRef<HTMLDivElement | null>(null);

  const { userLocation, openLocationModal, selectedRate, initLocation } = useLocationStore();
  const { user, isAuthenticated, initSession } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initSession();
    initLocation();
  }, [initSession, initLocation]);

  const handleCategoriesMouseEnter = () => {
    if (categoriesTimeoutRef.current) {
      clearTimeout(categoriesTimeoutRef.current);
      categoriesTimeoutRef.current = null;
    }
    setIsAllCategoriesOpen(true);
  };

  const handleCategoriesMouseLeave = () => {
    if (categoriesTimeoutRef.current) {
      clearTimeout(categoriesTimeoutRef.current);
    }
    categoriesTimeoutRef.current = setTimeout(() => {
      setIsAllCategoriesOpen(false);
    }, 280);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoriesContainerRef.current &&
        !categoriesContainerRef.current.contains(e.target as Node)
      ) {
        setIsAllCategoriesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (categoriesTimeoutRef.current) {
        clearTimeout(categoriesTimeoutRef.current);
      }
    };
  }, []);

  const { openCart, getTotalItemsCount, getSubtotal } = useCartStore();
  const itemCount = getTotalItemsCount();
  const subtotal = getSubtotal();

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm transition-all duration-200">
      {/* ========================================================================= */}
      {/* TIER 1: Announcement Banner (Clean, light gray, non-interactive) */}
      {/* ========================================================================= */}
      <div className="bg-slate-100 text-slate-600 text-xs py-2 px-4 border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Flagship Experience Store:</span>
              <span className="text-zinc-900 font-bold">Open Today 9:00 AM – 6:00 PM</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5 text-emerald-700 font-medium">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>In-Store Click & Collect: Orders Ready in 60 Mins</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <a
              href="https://wa.me/6281234567890?text=Hi%20Tethera%20team,%20I'd%20like%20to%20inquire%20about%20a%20product."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-emerald-600 transition-colors font-medium"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">WhatsApp Tech Line:</span>
              <span>+62 812-3456-7890</span>
            </a>
            <span className="hidden md:inline text-slate-500 font-medium">
              Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <Link
              href="/admin"
              className="flex items-center gap-1 text-slate-600 hover:text-cyan-700 font-semibold transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 2: Main Search & Action Bar */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
          {/* Brand Logo: Tethera */}
          <Link href="/" className="flex items-center shrink-0 group py-0.5">
            <Image
              src="/tethera-long.png"
              alt="Tethera"
              width={180}
              height={47}
              className="h-8 sm:h-10 md:h-11 w-auto object-contain transition-opacity group-hover:opacity-80"
              priority
            />
          </Link>

          {/* Predictive Search Bar Trigger */}
          <div className="flex-1 max-w-2xl">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100/90 hover:bg-slate-100 text-slate-400 rounded-xl border border-slate-200 hover:border-slate-300 transition-all text-xs sm:text-sm text-left shadow-inner"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">Search components, exact SKUs, pre-builts...</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <kbd className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-white rounded border border-slate-200 shadow-2xs">
                  ⌘K
                </kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white rounded border border-slate-200 shadow-2xs">
                  /
                </kbd>
              </div>
            </button>
          </div>

          {/* Quick Actions (Location, Account, Cart) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Delivery Location Trigger */}
            <button
              onClick={openLocationModal}
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-xs group"
              title="Set your delivery destination using Google Maps or point picker"
            >
              <Truck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <div className="max-w-[120px]">
                <span className="text-[10px] text-slate-400 block font-medium leading-none mb-0.5">Deliver to</span>
                <span className="font-bold text-zinc-800 truncate block leading-none">
                  {isMounted && userLocation ? (userLocation.subdistrict || userLocation.city || userLocation.address.split(",")[0]) : "Set Location"}
                </span>
              </div>
            </button>

            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-xs"
            >
              <MapPin className="w-4 h-4 text-zinc-600" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium leading-none mb-0.5">Pickup Store</span>
                <span className="font-bold text-zinc-800 leading-none block">Mangga Dua Lt. 3</span>
              </div>
            </button>

            <Link
              href={isMounted && isAuthenticated ? "/account" : "/auth"}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-xs group"
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isMounted && isAuthenticated ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-zinc-700"}`}>
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium leading-none mb-0.5">
                  {isMounted && isAuthenticated ? "My Profile" : "Welcome"}
                </span>
                <span className="font-bold text-zinc-800 leading-none block group-hover:text-emerald-700 transition-colors">
                  {isMounted && isAuthenticated ? (user?.fullName ? user.fullName.split(" ")[0] : "Account") : "Sign In / Register"}
                </span>
              </div>
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition-all shadow-sm active:scale-98"
            >
              <ShoppingCart className="w-4 h-4" />
              <div className="text-left hidden sm:block">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">
                  Cart ({itemCount})
                </span>
                <span className="text-xs font-black">{formatRupiah(subtotal)}</span>
              </div>
              {itemCount > 0 && (
                <span className="sm:hidden absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-zinc-900 font-black text-[10px] flex items-center justify-center border-2 border-white">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 3: Category Mega-Nav & Custom PC Builder CTA */}
      {/* ========================================================================= */}
      <div className="bg-slate-50/95 border-b border-slate-200 px-4 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-semibold text-zinc-700">
          {/* Left Navigation: All Categories Hover Dropdown + Direct Category Links */}
          <div className="flex items-center gap-2 sm:gap-3 py-2">
            {/* 1. Very Top-Left Option: All Categories Hover Dropdown */}
            <div
              ref={categoriesContainerRef}
              className="relative"
              onMouseEnter={handleCategoriesMouseEnter}
              onMouseLeave={handleCategoriesMouseLeave}
            >
              <button
                onClick={() => setIsAllCategoriesOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all shadow-xs tactile-btn active:scale-95 ${
                  isAllCategoriesOpen
                    ? "bg-zinc-900 text-white ring-2 ring-zinc-900/20"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-zinc-300" />
                <span>All Categories</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                    isAllCategoriesOpen ? "rotate-180 text-white" : ""
                  }`}
                />
              </button>

              {/* The Hover Dropdown Menu with Seamless Invisible Hover Bridge */}
              {isAllCategoriesOpen && (
                <div
                  className="absolute top-full left-0 pt-2 w-[330px] sm:w-[660px] z-50 before:content-[''] before:absolute before:-top-4 before:left-0 before:right-0 before:h-4"
                  onMouseEnter={handleCategoriesMouseEnter}
                  onMouseLeave={handleCategoriesMouseLeave}
                >
                  <div className="w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 text-zinc-900 animate-dropdown-pop">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                        Hardware Catalog
                      </span>
                      <h4 className="text-sm font-black text-zinc-900">
                        Explore All Product Categories
                      </h4>
                    </div>
                    <Link
                      href="/components"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors tactile-btn active:scale-95"
                    >
                      <span>Master Catalog</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Category Grid (2 columns on sm+) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Processors */}
                    <Link
                      href="/components/cpu"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "20ms" }}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group animate-pop-in tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors shrink-0">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-1">
                          <span>Processors (CPUs)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          AMD Ryzen 7000/9000 & Intel Core 14th Gen
                        </p>
                      </div>
                    </Link>

                    {/* Graphics Cards */}
                    <Link
                      href="/components/gpu"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "40ms" }}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group animate-pop-in tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors shrink-0">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-1">
                          <span>Graphics Cards (GPUs)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          NVIDIA RTX 40-Series & AMD Radeon
                        </p>
                      </div>
                    </Link>

                    {/* Motherboards */}
                    <Link
                      href="/components/motherboards"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "60ms" }}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group animate-pop-in tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-1">
                          <span>Motherboards</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          Socket AM5 & LGA1700 DDR5 Boards
                        </p>
                      </div>
                    </Link>

                    {/* Cooling */}
                    <Link
                      href="/components/cooling"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "80ms" }}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group animate-pop-in tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors shrink-0">
                        <Wind className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-1">
                          <span>Cooling Solutions</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          Liquid AIO 360mm & Dual-Tower Air Coolers
                        </p>
                      </div>
                    </Link>

                    {/* Cases */}
                    <Link
                      href="/components/cases"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "100ms" }}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group animate-pop-in tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors shrink-0">
                        <Box className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-1">
                          <span>PC Cases & Chassis</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          Panoramic Glass & High-Airflow Designs
                        </p>
                      </div>
                    </Link>

                    {/* Memory */}
                    <Link
                      href="/components/ram"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "120ms" }}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group animate-pop-in tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors shrink-0">
                        <CircuitBoard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-1">
                          <span>Memory (RAM)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          High-Speed DDR5 & DDR4 Performance Kits
                        </p>
                      </div>
                    </Link>

                    {/* Storage */}
                    <Link
                      href="/components/storage"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "140ms" }}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group animate-pop-in tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors shrink-0">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-1">
                          <span>Storage (SSDs)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          PCIe 4.0 & 5.0 High-Speed NVMe M.2
                        </p>
                      </div>
                    </Link>

                    {/* Power Supplies */}
                    <Link
                      href="/components/power-supplies"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "160ms" }}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group animate-pop-in tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-1">
                          <span>Power Supplies (PSUs)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          ATX 3.0 & 80+ Gold / Platinum Modular
                        </p>
                      </div>
                    </Link>
                  </div>

                  {/* Bottom Featured Row: Prebuilts & PC Builder */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                      href="/prebuilts"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "180ms" }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 hover:bg-emerald-100/50 transition-colors animate-pop-in tactile-item"
                    >
                      <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950">
                          Pre-Built Systems
                        </div>
                        <div className="text-[10px] text-emerald-800">
                          24h Stress-Tested • Ready for 60m Pickup
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/builder"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      style={{ animationDelay: "200ms" }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors animate-pop-in tactile-item"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-zinc-900">
                          Custom PC Studio 2.0
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Real-time Socket & Clearance Matching
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Footnote */}
                  <div className="mt-3 pt-2 text-center text-[10px] text-slate-400 border-t border-slate-100">
                    📍 Mangga Dua Mall Store: In-Stock Click & Collect ready in 60 minutes
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Direct Quick Links to Major Categories */}
            <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none text-xs">
              <Link
                href="/components/cpu"
                className="px-2.5 py-1 rounded-md hover:bg-slate-200/70 hover:text-zinc-900 transition-colors whitespace-nowrap"
              >
                CPUs
              </Link>
              <Link
                href="/components/gpu"
                className="px-2.5 py-1 rounded-md hover:bg-slate-200/70 hover:text-zinc-900 transition-colors whitespace-nowrap"
              >
                GPUs
              </Link>
              <Link
                href="/components/motherboards"
                className="px-2.5 py-1 rounded-md hover:bg-slate-200/70 hover:text-zinc-900 transition-colors whitespace-nowrap hidden sm:inline-block"
              >
                Motherboards
              </Link>
              <Link
                href="/components/cooling"
                className="px-2.5 py-1 rounded-md hover:bg-slate-200/70 hover:text-zinc-900 transition-colors whitespace-nowrap hidden md:inline-block"
              >
                Cooling
              </Link>
              <Link
                href="/components/cases"
                className="px-2.5 py-1 rounded-md hover:bg-slate-200/70 hover:text-zinc-900 transition-colors whitespace-nowrap hidden lg:inline-block"
              >
                Cases
              </Link>
              <Link
                href="/components/ram"
                className="px-2.5 py-1 rounded-md hover:bg-slate-200/70 hover:text-zinc-900 transition-colors whitespace-nowrap hidden xl:inline-block"
              >
                Memory
              </Link>
              <Link
                href="/prebuilts"
                className="px-2.5 py-1 rounded-md text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 transition-colors whitespace-nowrap font-bold flex items-center gap-1 border border-emerald-200/60"
              >
                <Zap className="w-3 h-3 text-emerald-600" />
                <span>Pre-Built Systems</span>
              </Link>
            </nav>
          </div>

          {/* PC Builder CTA */}
          <Link
            href="/builder"
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold px-4 py-2 rounded-lg transition-all shadow-sm shrink-0 uppercase tracking-tight my-1 ml-2"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs">Custom PC Builder</span>
          </Link>
        </div>
      </div>

      {/* Modals & Slide-Over Drawers */}
      <FlagshipStoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
      />
      <PredictiveSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <CartDrawer />
      <GlobalLocationModal />
    </header>
  );
}
