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
  Store,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { FlagshipStoreModal } from "./FlagshipStoreModal";
import { PredictiveSearchDropdown } from "./PredictiveSearchDropdown";
import { CartDrawer } from "./CartDrawer";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalLocationModal } from "../shipping/GlobalLocationModal";
import { useCartStore } from "../../lib/store/useCartStore";
import { useLocationStore } from "../../lib/store/useLocationStore";
import { formatRupiah } from "../../lib/utils/currency";
import { useAuthStore } from "../../lib/store/useAuthStore";

export function PersistentHeader() {
  const [isSticky, setIsSticky] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const categoriesTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const categoriesContainerRef = React.useRef<HTMLDivElement | null>(null);

  const { userLocation, openLocationModal, selectedRate, initLocation } = useLocationStore();
  const { user, isAuthenticated, initSession, logout } = useAuthStore();
  const { openCart, getTotalItemsCount, getSubtotal, initCart } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initSession();
    initLocation();
    initCart();
  }, [initSession, initLocation, initCart]);

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

  const itemCount = getTotalItemsCount();
  const subtotal = getSubtotal();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          setIsSticky((prev) => {
            if (!prev && y > 70) return true;
            if (prev && y < 20) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsAllCategoriesOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-zinc-950 shadow-sm dark:shadow-zinc-950/40 transition-all duration-200">
      {/* ========================================================================= */}
      {/* TIER 1: Announcement Banner (Top-of-page announcement strip, persists on scroll) */}
      {/* ========================================================================= */}
      <div
        className={`bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800/80 w-full max-w-full overflow-hidden px-3 sm:px-4 transition-all duration-200 ${
          isSticky ? "py-1 text-[11px]" : "py-2 text-xs"
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span className="hidden xs:inline">Flagship Store:</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">Open 9:00 AM to 6:00 PM WIB</span>
            </div>
            <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium text-[11px] sm:text-xs">
              <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>In-Store Click &amp; Collect: Orders Ready in 60 Mins</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-slate-500 dark:text-zinc-400 text-[11px] sm:text-xs">
            <a
              href="https://wa.me/6281234567890?text=Hi%20Tethera%20team,%20I'd%20like%20to%20inquire%20about%20a%20product."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden md:inline">WhatsApp Tech Line:</span>
              <span>+62 812-3456-7890</span>
            </a>
            <span className="hidden md:inline text-slate-400 dark:text-zinc-500 font-medium whitespace-nowrap">
              Mangga Dua Mall Lt. 3 No. 36
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 2: Main Search & Action Bar (Reverts to full size, shrinks on scroll) */}
      {/* ========================================================================= */}
        <div
          className={`bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800/80 px-3 sm:px-4 w-full max-w-full transition-all duration-200 ${
            isSticky ? "py-1.5 sm:py-2" : "py-2.5 sm:py-3"
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 md:gap-8 relative">
            {/* Mobile Hamburger Menu Toggle (Visible on <lg screens) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors shrink-0 flex items-center justify-center ${
                isSticky ? "p-1.5 min-w-[36px] min-h-[36px]" : "p-2 min-w-[44px] min-h-[44px]"
              }`}
              aria-label="Open mobile navigation menu"
            >
              <Menu className={`${isSticky ? "w-4 h-4" : "w-5 h-5"} text-zinc-800 dark:text-zinc-200`} />
            </button>

            {/* Brand Logo: Tethera (Fixed crisp size, does not shrink on scroll) */}
            <Link href="/" className="flex items-center shrink-0 group py-0.5">
              <Image
                src="/tethera-long.png"
                alt="Tethera"
                width={180}
                height={47}
                className="h-7 sm:h-9 md:h-10 w-auto object-contain transition-opacity group-hover:opacity-80 tethera-logo dark:brightness-0 dark:invert"
                priority
              />
            </Link>

          {/* Predictive Autocomplete Search Bar & Dropdown */}
          <div className="flex-1 min-w-0 max-w-2xl mx-1 sm:mx-0">
            <PredictiveSearchDropdown isCompact={isSticky} />
          </div>

          {/* Quick Actions (Location, Account, Theme Toggle, Cart) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Delivery Location Trigger */}
            <button
              onClick={openLocationModal}
              className={`hidden lg:flex items-center text-left bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all text-xs group ${
                isSticky ? "gap-1.5 px-2 py-1 rounded-lg" : "gap-2 px-3 py-2 rounded-xl"
              }`}
              title="Set your delivery destination using Google Maps or point picker"
            >
              <Truck className={`${isSticky ? "w-3.5 h-3.5" : "w-4 h-4"} text-emerald-600 group-hover:scale-110 transition-transform shrink-0`} />
              <div className={isSticky ? "max-w-[105px]" : "max-w-[120px]"}>
                <span className={`${isSticky ? "text-[9px]" : "text-[10px]"} text-slate-400 block font-medium leading-none mb-0.5`}>Deliver to</span>
                <span className={`font-bold ${isSticky ? "text-[11px]" : "text-xs"} text-zinc-800 dark:text-zinc-200 truncate block leading-none`}>
                  {isMounted && userLocation ? (userLocation.subdistrict || userLocation.city || userLocation.address.split(",")[0]) : "Set Location"}
                </span>
              </div>
            </button>

            <button
              onClick={() => setIsStoreModalOpen(true)}
              className={`hidden xl:flex items-center text-left bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all text-xs ${
                isSticky ? "gap-1.5 px-2 py-1 rounded-lg" : "gap-2 px-3 py-2 rounded-xl"
              }`}
            >
              <MapPin className={`${isSticky ? "w-3.5 h-3.5" : "w-4 h-4"} text-zinc-600 dark:text-zinc-300 shrink-0`} />
              <div>
                <span className={`${isSticky ? "text-[9px]" : "text-[10px]"} text-slate-400 block font-medium leading-none mb-0.5`}>Pickup Store</span>
                <span className={`font-bold ${isSticky ? "text-[11px]" : "text-xs"} text-zinc-800 dark:text-zinc-200 leading-none block`}>Mangga Dua Lt. 3</span>
              </div>
            </button>

            <Link
              href={isMounted && isAuthenticated ? "/account" : "/auth"}
              className={`hidden sm:flex items-center text-left hover:bg-slate-100 dark:hover:bg-zinc-900 border border-transparent hover:border-slate-200 dark:hover:border-zinc-800 transition-all text-xs group ${
                isSticky ? "gap-1.5 px-2 py-1 rounded-lg" : "gap-2 px-3 py-2 rounded-xl"
              }`}
            >
              <div className={`p-1 rounded-md transition-colors ${isMounted && isAuthenticated ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"}`}>
                <User className={isSticky ? "w-3.5 h-3.5" : "w-4 h-4"} />
              </div>
              <div>
                <span className={`${isSticky ? "text-[9px]" : "text-[10px]"} text-slate-400 block font-medium leading-none mb-0.5`}>
                  {isMounted && isAuthenticated ? "My Profile" : "Welcome"}
                </span>
                <span className={`font-bold ${isSticky ? "text-[11px]" : "text-xs"} text-zinc-800 dark:text-zinc-200 leading-none block group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors`}>
                  {isMounted && isAuthenticated ? (user?.fullName ? user.fullName.split(" ")[0] : "Account") : "Sign In"}
                </span>
              </div>
            </Link>

            {/* Dark Mode Toggle */}
            <ThemeToggle variant="header" isCompact={isSticky} />

            {/* Cart Trigger */}
            <button
              onClick={openCart}
              className={`relative flex items-center transition-all shadow-xs active:scale-98 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-zinc-100 border border-transparent dark:border-zinc-700 ${
                isSticky ? "gap-1.5 px-2.5 py-1.5 rounded-lg" : "gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl"
              }`}
            >
              <ShoppingCart className={isSticky ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <div className="text-left hidden sm:block">
                <span className={`${isSticky ? "text-[8px]" : "text-[9px]"} text-slate-400 dark:text-zinc-400 uppercase tracking-wider block font-bold leading-none`}>
                  Cart ({isMounted ? itemCount : 0})
                </span>
                <span className={`${isSticky ? "text-[11px]" : "text-xs"} font-black leading-tight block`}>{isMounted ? formatRupiah(subtotal) : formatRupiah(0)}</span>
              </div>
              {isMounted && itemCount > 0 && (
                <span className="sm:hidden absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-zinc-900 font-black text-[9px] flex items-center justify-center border border-white dark:border-zinc-900">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 3: Category Mega-Nav & Custom PC Builder CTA (Slim, persistent) */}
      {/* ========================================================================= */}
      <div className="bg-slate-50/95 dark:bg-zinc-950/95 border-b border-slate-200 dark:border-zinc-800/80 px-3 sm:px-4 relative w-full transition-colors">
        {/* Mobile Category Quick Strip (<sm viewports) */}
        <div className="sm:hidden flex items-center gap-1 py-1 overflow-x-auto scrollbar-none w-full max-w-full">
          <Link
            href="/builder"
            className="flex items-center gap-1 bg-zinc-900 dark:bg-zinc-800 text-white font-bold px-2 py-0.5 rounded-md text-[10px] shrink-0 shadow-xs border border-transparent dark:border-zinc-700 tactile-btn active:scale-95"
          >
            <Cpu className="w-3 h-3 text-zinc-300 dark:text-emerald-400" />
            <span>PC Builder</span>
          </Link>
          <Link
            href="/prebuilts"
            className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md text-[10px] shrink-0 border border-emerald-200 dark:border-emerald-800 tactile-btn active:scale-95"
          >
            <span>Pre-Builts</span>
          </Link>
          <Link
            href="/components/cpu"
            className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            CPUs
          </Link>
          <Link
            href="/components/gpu"
            className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            GPUs
          </Link>
          <Link
            href="/components/motherboards"
            className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Motherboards
          </Link>
          <Link
            href="/components/cooling"
            className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Cooling
          </Link>
          <Link
            href="/components/cases"
            className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Cases
          </Link>
          <Link
            href="/components/ram"
            className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            RAM
          </Link>
          <Link
            href="/components/storage"
            className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            SSDs
          </Link>
          <Link
            href="/components/power-supplies"
            className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            PSUs
          </Link>
        </div>

        {/* Desktop Category Bar (>=sm viewports) */}
        <div className={`hidden sm:flex max-w-7xl mx-auto items-center justify-between font-semibold text-zinc-700 dark:text-zinc-300 transition-all ${
          isSticky ? "text-[11px]" : "text-xs"
        }`}>
          {/* Left Navigation: All Categories Hover Dropdown + Direct Category Links */}
          <div className={`flex items-center transition-all ${
            isSticky ? "gap-1.5 sm:gap-2 py-1" : "gap-2 sm:gap-3 py-2"
          }`}>
            {/* 1. Very Top-Left Option: All Categories Hover Dropdown */}
            <div
              ref={categoriesContainerRef}
              className="relative"
              onMouseEnter={handleCategoriesMouseEnter}
              onMouseLeave={handleCategoriesMouseLeave}
            >
              <button
                onClick={() => setIsAllCategoriesOpen((prev) => !prev)}
                className={`flex items-center font-bold transition-all shadow-2xs border border-transparent dark:border-zinc-700 tactile-btn active:scale-95 ${
                  isSticky ? "gap-1 px-2.5 py-1 rounded-md text-[11px]" : "gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                } ${
                  isAllCategoriesOpen
                    ? "bg-zinc-900 dark:bg-zinc-800 text-white ring-2 ring-zinc-900/20 dark:ring-zinc-700"
                    : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white"
                }`}
              >
                <LayoutGrid className={isSticky ? "w-3 h-3 text-zinc-300" : "w-3.5 h-3.5 text-zinc-300"} />
                <span>All Categories</span>
                <ChevronDown
                  className={`${isSticky ? "w-3 h-3" : "w-3.5 h-3.5"} text-zinc-400 transition-transform duration-200 ${
                    isAllCategoriesOpen ? "rotate-180 text-white" : ""
                  }`}
                />
              </button>

              {/* The Hover Dropdown Menu with Seamless Invisible Hover Bridge */}
              {isAllCategoriesOpen && (
                <div
                  className="absolute top-full left-0 pt-2 w-[calc(100vw-2rem)] sm:w-[660px] max-w-[660px] z-50 before:content-[''] before:absolute before:-top-4 before:left-0 before:right-0 before:h-4"
                  onMouseEnter={handleCategoriesMouseEnter}
                  onMouseLeave={handleCategoriesMouseLeave}
                >
                  <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-5 text-zinc-900 dark:text-zinc-100 animate-dropdown-pop transition-colors">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 block">
                        Hardware Catalog
                      </span>
                      <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                        Explore All Product Categories
                      </h4>
                    </div>
                    <Link
                      href="/components"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors tactile-btn active:scale-95"
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
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all group tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-700 group-hover:text-white dark:group-hover:text-white border border-slate-200/50 dark:border-zinc-700/60 transition-colors shrink-0">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 flex items-center gap-1">
                          <span>Processors (CPUs)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          AMD Ryzen 7000/9000 & Intel Core 14th Gen
                        </p>
                      </div>
                    </Link>

                    {/* Graphics Cards */}
                    <Link
                      href="/components/gpu"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all group tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-700 group-hover:text-white dark:group-hover:text-white border border-slate-200/50 dark:border-zinc-700/60 transition-colors shrink-0">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 flex items-center gap-1">
                          <span>Graphics Cards (GPUs)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          NVIDIA RTX 40-Series & AMD Radeon
                        </p>
                      </div>
                    </Link>

                    {/* Motherboards */}
                    <Link
                      href="/components/motherboards"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all group tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-700 group-hover:text-white dark:group-hover:text-white border border-slate-200/50 dark:border-zinc-700/60 transition-colors shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 flex items-center gap-1">
                          <span>Motherboards</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          Socket AM5 & LGA1700 DDR5 Boards
                        </p>
                      </div>
                    </Link>

                    {/* Cooling */}
                    <Link
                      href="/components/cooling"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all group tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-700 group-hover:text-white dark:group-hover:text-white border border-slate-200/50 dark:border-zinc-700/60 transition-colors shrink-0">
                        <Wind className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 flex items-center gap-1">
                          <span>Cooling Solutions</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          Liquid AIO 360mm & Dual-Tower Air Coolers
                        </p>
                      </div>
                    </Link>

                    {/* Cases */}
                    <Link
                      href="/components/cases"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all group tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-700 group-hover:text-white dark:group-hover:text-white border border-slate-200/50 dark:border-zinc-700/60 transition-colors shrink-0">
                        <Box className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 flex items-center gap-1">
                          <span>PC Cases & Chassis</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          Panoramic Glass & High-Airflow Designs
                        </p>
                      </div>
                    </Link>

                    {/* Memory */}
                    <Link
                      href="/components/ram"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all group tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-700 group-hover:text-white dark:group-hover:text-white border border-slate-200/50 dark:border-zinc-700/60 transition-colors shrink-0">
                        <CircuitBoard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 flex items-center gap-1">
                          <span>Memory (RAM)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          High-Speed DDR5 & DDR4 Performance Kits
                        </p>
                      </div>
                    </Link>

                    {/* Storage */}
                    <Link
                      href="/components/storage"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all group tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-700 group-hover:text-white dark:group-hover:text-white border border-slate-200/50 dark:border-zinc-700/60 transition-colors shrink-0">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 flex items-center gap-1">
                          <span>Storage (SSDs)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          PCIe 4.0 & 5.0 High-Speed NVMe M.2
                        </p>
                      </div>
                    </Link>

                    {/* Power Supplies */}
                    <Link
                      href="/components/power-supplies"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all group tactile-item"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-700 group-hover:text-white dark:group-hover:text-white border border-slate-200/50 dark:border-zinc-700/60 transition-colors shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 flex items-center gap-1">
                          <span>Power Supplies (PSUs)</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          ATX 3.0 & 80+ Gold / Platinum Modular
                        </p>
                      </div>
                    </Link>
                  </div>

                  {/* Bottom Featured Row: Prebuilts & PC Builder */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                      href="/prebuilts"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/80 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors tactile-item"
                    >
                      <Monitor className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          Pre-Built Systems
                        </div>
                        <div className="text-[10px] text-emerald-800 dark:text-emerald-400">
                          24h Stress-Tested • Ready for 60m Pickup
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/builder"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/80 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-colors tactile-item"
                    >
                      <Cpu className="w-4 h-4 text-zinc-800 dark:text-zinc-200 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white">
                          Custom PC Configurator
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Real-time Socket & Clearance Matching
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Footnote */}
                  <div className="mt-3 pt-2 text-center text-[10px] text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-800">
                    📍 Mangga Dua Mall Store: In-Stock Click & Collect ready in 60 minutes
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Direct Quick Links to Major Categories */}
            <nav className={`flex items-center overflow-x-auto scrollbar-none transition-all ${
              isSticky ? "gap-1 sm:gap-1.5 text-[11px]" : "gap-1 sm:gap-2 text-xs"
            }`}>
              <Link
                href="/components/cpu"
                className={`${isSticky ? "px-2 py-0.5 rounded-md" : "px-2.5 py-1 rounded-md"} text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap`}
              >
                CPUs
              </Link>
              <Link
                href="/components/gpu"
                className={`${isSticky ? "px-2 py-0.5 rounded-md" : "px-2.5 py-1 rounded-md"} text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap`}
              >
                GPUs
              </Link>
              <Link
                href="/components/motherboards"
                className={`${isSticky ? "px-2 py-0.5 rounded-md" : "px-2.5 py-1 rounded-md"} text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap hidden sm:inline-block`}
              >
                Motherboards
              </Link>
              <Link
                href="/components/cooling"
                className={`${isSticky ? "px-2 py-0.5 rounded-md" : "px-2.5 py-1 rounded-md"} text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap hidden md:inline-block`}
              >
                Cooling
              </Link>
              <Link
                href="/components/cases"
                className={`${isSticky ? "px-2 py-0.5 rounded-md" : "px-2.5 py-1 rounded-md"} text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap hidden lg:inline-block`}
              >
                Cases
              </Link>
              <Link
                href="/components/ram"
                className={`${isSticky ? "px-2 py-0.5 rounded-md" : "px-2.5 py-1 rounded-md"} text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap hidden xl:inline-block`}
              >
                Memory
              </Link>
              <Link
                href="/prebuilts"
                className={`${isSticky ? "px-2 py-0.5 rounded-md" : "px-2.5 py-1 rounded-md"} text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap font-bold flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800`}
              >
                <span>Pre-Built Systems</span>
              </Link>
            </nav>
          </div>

          {/* PC Builder CTA */}
          <Link
            href="/builder"
            className={`flex items-center bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 font-bold transition-all shadow-xs shrink-0 uppercase tracking-tight ml-2 ${
              isSticky ? "gap-1 px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] my-0.5" : "gap-1.5 px-4 py-2 rounded-lg text-xs my-1"
            }`}
          >
            <Cpu className={`${isSticky ? "w-3 h-3" : "w-3.5 h-3.5"} text-zinc-300 dark:text-emerald-400`} />
            <span className={isSticky ? "text-[10px] sm:text-[11px]" : "text-xs"}>Custom PC Builder</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE NAVIGATION DRAWER (Slide-Over from Left) */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-hidden lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-[68vw] max-w-[280px] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col justify-between overflow-y-auto border-r border-transparent dark:border-zinc-800 transition-colors"
            >
              <div>
                {/* Drawer Top Header */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between transition-colors">
                  <Link
                    href="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center"
                  >
                    <Image
                      src="/tethera-long.png"
                      alt="Tethera"
                      width={140}
                      height={36}
                      className="h-8 w-auto object-contain tethera-logo dark:brightness-0 dark:invert"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Account / Sign In Status Card */}
                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50">
                  {isMounted && isAuthenticated && user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                          {user.fullName ? user.fullName[0].toUpperCase() : "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                            Logged In
                          </span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate block">
                            {user.fullName || "Customer"}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-zinc-400 truncate block">
                            {user.email}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href="/account"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex-1 min-h-[44px] flex items-center justify-center py-2 px-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-lg text-xs font-bold text-center transition-colors tactile-btn"
                        >
                          My Account
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="min-h-[44px] py-2 px-3.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors tactile-btn"
                          title="Sign Out"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Out</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-200/80 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 item-frame">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                            Welcome to Tethera
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block truncate">
                            Sign in for order tracking
                          </span>
                        </div>
                      </div>
                      <Link
                        href="/auth"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="min-h-[44px] flex items-center justify-center py-2 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-all shadow-xs tactile-btn shrink-0"
                      >
                        Sign In
                      </Link>
                    </div>
                  )}
                </div>

                {/* Theme Mode Appearance Toggle */}
                <div className="p-4 border-b border-slate-100 dark:border-zinc-800">
                  <ThemeToggle variant="mobile" />
                </div>

                {/* Delivery & Pickup Selector Buttons */}
                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                    Fulfillment &amp; Location
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openLocationModal();
                    }}
                    className="w-full min-h-[44px] flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium block">Deliver to</span>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate block">
                          {isMounted && userLocation ? (userLocation.subdistrict || userLocation.city || userLocation.address.split(",")[0]) : "Set Location"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsStoreModalOpen(true);
                    }}
                    className="w-full min-h-[44px] flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Store className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium block">Click &amp; Collect Counter</span>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate block">Mangga Dua Mall Lt. 3 No. 36</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </div>

                {/* Primary Tools (Custom PC Configurator & Prebuilts) */}
                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                    Studio Tools &amp; Rigs
                  </span>

                  <Link
                    href="/builder"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white transition-all shadow-sm group border border-transparent dark:border-zinc-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-xs font-black">Custom PC Builder</div>
                        <div className="text-[10px] text-slate-300 dark:text-zinc-400">Socket &amp; Clearance Engine</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    href="/prebuilts"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="text-xs font-black">Pre-Built Performance PCs</div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">24h Prime95 Benchmarked</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                {/* Hardware Categories List */}
                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Hardware Categories
                    </span>
                    <Link
                      href="/components"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Master Catalog
                    </Link>
                  </div>

                  <Link
                    href="/components/cpu"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700/60 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors item-frame">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <span className="text-zinc-900 dark:text-white">Processors (CPUs)</span>
                  </Link>
                  <Link
                    href="/components/gpu"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700/60 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors item-frame">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <span className="text-zinc-900 dark:text-white">Graphics Cards (GPUs)</span>
                  </Link>
                  <Link
                    href="/components/motherboards"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700/60 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors item-frame">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-zinc-900 dark:text-white">Motherboards</span>
                  </Link>
                  <Link
                    href="/components/cooling"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700/60 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors item-frame">
                      <Wind className="w-4 h-4" />
                    </div>
                    <span className="text-zinc-900 dark:text-white">Cooling Solutions</span>
                  </Link>
                  <Link
                    href="/components/cases"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700/60 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors item-frame">
                      <Box className="w-4 h-4" />
                    </div>
                    <span className="text-zinc-900 dark:text-white">PC Cases &amp; Chassis</span>
                  </Link>
                  <Link
                    href="/components/ram"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700/60 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors item-frame">
                      <CircuitBoard className="w-4 h-4" />
                    </div>
                    <span className="text-zinc-900 dark:text-white">Memory (RAM)</span>
                  </Link>
                  <Link
                    href="/components/storage"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700/60 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors item-frame">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <span className="text-zinc-900 dark:text-white">Storage (SSDs)</span>
                  </Link>
                  <Link
                    href="/components/power-supplies"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700/60 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors item-frame">
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-zinc-900 dark:text-white">Power Supplies (PSUs)</span>
                  </Link>
                </div>
              </div>

              {/* Drawer Bottom Support Contact */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 space-y-2.5">
                <a
                  href="https://wa.me/6281234567890?text=Hi%20Tethera%20team,%20I'd%20like%20to%20inquire%20about%20a%20product."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Tech Consultation</span>
                </a>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 text-center">
                  Direct Line: (021) 612-8836 • Mon-Sat 09:00 to 18:00 WIB
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Slide-Over Drawers */}
      <FlagshipStoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
      />
      <CartDrawer />
      <GlobalLocationModal />
    </header>
  );
}
