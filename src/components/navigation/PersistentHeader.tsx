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
  Store,
  Menu,
  X,
  LogOut,
  Bell,
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

function MonitorTowerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Desktop Monitor Screen */}
      <rect width="12" height="9" x="1" y="4" rx="1.5" />
      {/* Stand Neck and Base */}
      <path d="M7 13v4" />
      <path d="M4 17h6" />
      {/* PC Tower Chassis */}
      <rect width="7" height="15" x="16" y="4" rx="1.5" />
      {/* Power Button & Vents */}
      <path d="M19.5 7h.01" />
      <path d="M18 10h3" />
      <path d="M18 13h3" />
    </svg>
  );
}

export function PersistentHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const categoriesTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const categoriesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = React.useRef(0);

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

  const handleCategoriesMouseMove = () => {
    if (categoriesTimeoutRef.current) {
      clearTimeout(categoriesTimeoutRef.current);
      categoriesTimeoutRef.current = null;
    }
    if (!isAllCategoriesOpen) {
      setIsAllCategoriesOpen(true);
    }
  };

  const handleCategoriesMouseLeave = () => {
    if (categoriesTimeoutRef.current) {
      clearTimeout(categoriesTimeoutRef.current);
      categoriesTimeoutRef.current = null;
    }
    categoriesTimeoutRef.current = setTimeout(() => {
      setIsAllCategoriesOpen(false);
    }, 160);
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
          const currentY = Math.max(0, window.scrollY);
          const diff = currentY - lastScrollYRef.current;

          // Near top: always keep the category bar visible
          if (currentY <= 20) {
            setIsScrolled(false);
          } else if (diff > 8 && currentY > 60) {
            // Scrolling down past header: hide category bar
            if (categoriesTimeoutRef.current) {
              clearTimeout(categoriesTimeoutRef.current);
              categoriesTimeoutRef.current = null;
            }
            setIsAllCategoriesOpen(false);
            setIsScrolled(true);
          } else if (diff < -8) {
            // Scrolling up anywhere on page: bring category bar back
            setIsScrolled(false);
          }

          lastScrollYRef.current = currentY;
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
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-zinc-950 shadow-sm dark:shadow-zinc-950/40">
      {/* ========================================================================= */}
      {/* TIER 1: Announcement Banner (Top-of-page announcement strip, persists) */}
      {/* ========================================================================= */}
      <div className="bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800/80 w-full max-w-full overflow-hidden px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-2 text-xs">
        <div className="w-full max-w-[1920px] mx-auto flex justify-between items-center gap-2 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <span className="text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">Open 9:00 AM to 6:00 PM WIB</span>
          </div>

          <a
            href="https://wa.me/6281234567890?text=Hi%20Tethera%20team,%20I'd%20like%20to%20inquire%20about%20a%20product."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>WhatsApp: +62 812-3456-7890</span>
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 2: Main Search & Action Bar (Fixed comfortable height, does not shrink) */}
      {/* ========================================================================= */}
      <div className="relative z-20 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800/80 px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 w-full max-w-full py-2.5 sm:py-3 shadow-xs">
        <div className="w-full max-w-[1920px] mx-auto flex items-center gap-3 sm:gap-4 md:gap-5 relative">
          {/* Mobile Hamburger Menu Toggle (Visible on <lg screens) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors shrink-0 flex items-center justify-center p-2 min-w-[44px] min-h-[44px]"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
          </button>

          {/* Brand Logo: Tethera */}
          <Link href="/" className="flex items-center shrink-0 group py-0.5">
            <Image
              src="/tethera-long.png"
              alt="Tethera"
              width={240}
              height={63}
              className="h-9 sm:h-11 md:h-12 lg:h-[54px] w-auto object-contain transition-opacity group-hover:opacity-80 tethera-logo dark:brightness-0 dark:invert"
              priority
            />
          </Link>

          {/* Predictive Autocomplete Search Bar & Dropdown */}
          <div className="flex-1 min-w-0 max-w-xl lg:max-w-2xl xl:max-w-3xl">
            <PredictiveSearchDropdown />
          </div>

          {/* Quick Actions Bar (Custom PC Builder, Shopping Cart, Location, Notifications, Delivery Location, Theme Toggle, Profile) */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto">
            {/* Custom PC Builder Button (Borderless with Monitor & Tower logo) */}
            <Link
              href="/builder"
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-transparent border-0 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group tactile-btn"
              aria-label="Custom PC Builder"
              title="Custom PC Builder - Configurator"
            >
              <MonitorTowerIcon className="w-5 h-5 transition-transform group-hover:scale-105 shrink-0" />
              <span className="hidden sm:inline font-bold text-xs whitespace-nowrap">PC Builder</span>
            </Link>

            {/* 1. Shopping Cart */}
            <button
              type="button"
              onClick={openCart}
              className="relative flex items-center justify-center bg-transparent border-0 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group p-2 min-h-[44px] min-w-[44px] rounded-xl"
              aria-label={`Shopping cart with ${isMounted ? itemCount : 0} items`}
              title={`Shopping Cart (${isMounted ? itemCount : 0} items)`}
            >
              <ShoppingCart className="w-5 h-5 transition-transform group-hover:scale-105" />
              {isMounted && itemCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full bg-emerald-600 text-white font-black text-[9px] flex items-center justify-center px-1 shadow-xs pointer-events-none">
                  {itemCount}
                </span>
              )}
            </button>

            {/* 2. Location (Flagship Experience Store) */}
            <button
              type="button"
              onClick={() => setIsStoreModalOpen(true)}
              className="flex items-center justify-center bg-transparent border-0 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group p-2 min-h-[44px] min-w-[44px] rounded-xl"
              aria-label="Flagship Store Location"
              title="Flagship Store Location (Mangga Dua Mall Lt. 3)"
            >
              <MapPin className="w-5 h-5 transition-transform group-hover:scale-105" />
            </button>

            {/* 3. Notifications */}
            <button
              type="button"
              className="relative flex items-center justify-center bg-transparent border-0 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group p-2 min-h-[44px] min-w-[44px] rounded-xl"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5 transition-transform group-hover:scale-105" />
            </button>

            {/* 4. Delivery Location */}
            <button
              type="button"
              onClick={openLocationModal}
              className="flex items-center justify-center bg-transparent border-0 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group p-2 min-h-[44px] min-w-[44px] rounded-xl"
              aria-label="Delivery Location"
              title={`Delivery to: ${isMounted && userLocation ? (userLocation.subdistrict || userLocation.city || userLocation.address.split(",")[0]) : "Set Delivery Location"}`}
            >
              <Truck className="w-5 h-5 transition-transform group-hover:scale-105" />
            </button>

            {/* 5. Dark/Light Mode Toggle */}
            <ThemeToggle variant="header" isCompact={false} />

            {/* 6. Profile */}
            <Link
              href={isMounted && isAuthenticated ? "/account" : "/auth"}
              className="flex items-center justify-center bg-transparent border-0 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group p-2 min-h-[44px] min-w-[44px] rounded-xl"
              aria-label={isMounted && isAuthenticated ? "User Profile" : "Sign In to Tethera"}
              title={isMounted && isAuthenticated ? `My Profile (${user?.fullName || "Account"})` : "Sign In"}
            >
              <User className="w-5 h-5 transition-transform group-hover:scale-105" />
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 3: Category Mega-Nav (Tucks behind Tier 2 on scroll) */}
      {/* ========================================================================= */}
      <div
        className={`relative w-full transition-all duration-300 ease-in-out ${
          isAllCategoriesOpen ? "z-30" : "z-10"
        } ${
          isScrolled
            ? "-translate-y-full max-h-0 opacity-0 overflow-hidden pointer-events-none"
            : "translate-y-0 max-h-24 opacity-100 overflow-visible pointer-events-auto"
        }`}
      >
        <div className="bg-slate-50/95 dark:bg-zinc-950/95 border-b border-slate-200 dark:border-zinc-800/80 px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 w-full transition-colors">
        {/* Mobile Category Quick Strip (<sm viewports) */}
        <div className="sm:hidden flex items-center gap-1.5 py-1 overflow-x-auto scrollbar-none w-full max-w-full">
          <Link
            href="/builder"
            className="flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-800 text-white font-bold px-3 py-1 rounded-lg text-xs shrink-0 shadow-xs border border-transparent dark:border-zinc-700 tactile-btn active:scale-95 min-h-[34px]"
          >
            <Cpu className="w-3.5 h-3.5 text-zinc-300 dark:text-emerald-400" />
            <span>PC Builder</span>
          </Link>
          <Link
            href="/prebuilts"
            className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-3 py-1 rounded-lg text-xs shrink-0 border border-transparent tactile-btn active:scale-95 min-h-[34px]"
          >
            <span>Pre-Builts</span>
          </Link>
          <Link
            href="/components/cpu"
            className="flex items-center px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors min-h-[34px]"
          >
            CPUs
          </Link>
          <Link
            href="/components/gpu"
            className="flex items-center px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors min-h-[34px]"
          >
            GPUs
          </Link>
          <Link
            href="/components/motherboards"
            className="flex items-center px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors min-h-[34px]"
          >
            Motherboards
          </Link>
          <Link
            href="/components/cooling"
            className="flex items-center px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors min-h-[34px]"
          >
            Cooling
          </Link>
          <Link
            href="/components/cases"
            className="flex items-center px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors min-h-[34px]"
          >
            Cases
          </Link>
          <Link
            href="/components/ram"
            className="flex items-center px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors min-h-[34px]"
          >
            RAM
          </Link>
          <Link
            href="/components/storage"
            className="flex items-center px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors min-h-[34px]"
          >
            SSDs
          </Link>
          <Link
            href="/components/power-supplies"
            className="flex items-center px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors min-h-[34px]"
          >
            PSUs
          </Link>
        </div>

        {/* Desktop Category Bar (>=sm viewports) */}
        <div className="hidden sm:flex w-full max-w-[1920px] mx-auto items-center justify-between font-semibold text-zinc-700 dark:text-zinc-300 text-sm transition-colors py-0.5">
          <div className="flex items-center min-w-0">
            {/* All Categories Dropdown (To the left of CPU category, borderless hamburger style) */}
            <div
              ref={categoriesContainerRef}
              className="relative shrink-0 mr-1.5 sm:mr-2"
              onMouseEnter={handleCategoriesMouseEnter}
              onMouseMove={handleCategoriesMouseMove}
              onMouseLeave={handleCategoriesMouseLeave}
            >
              <button
                type="button"
                onClick={() => {
                  if (categoriesTimeoutRef.current) {
                    clearTimeout(categoriesTimeoutRef.current);
                    categoriesTimeoutRef.current = null;
                  }
                  setIsAllCategoriesOpen((prev) => !prev);
                }}
                onMouseEnter={handleCategoriesMouseEnter}
                className={`flex items-center gap-1.5 px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-sm font-bold transition-colors tactile-btn active:scale-95 ${
                  isAllCategoriesOpen
                    ? "text-zinc-950 dark:text-white bg-slate-200/80 dark:bg-zinc-800/80"
                    : "text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800/60"
                }`}
                aria-label="Toggle All Categories menu"
                aria-expanded={isAllCategoriesOpen}
              >
                <Menu className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
                <span>All Categories</span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-500 transition-transform duration-200 shrink-0 ${
                    isAllCategoriesOpen ? "rotate-180 text-zinc-900 dark:text-zinc-100" : ""
                  }`}
                />
              </button>

              {/* The Hover Dropdown Menu with Seamless Hover Bridge & Snappy Fade Transitions */}
              <div
                className={`absolute top-full left-0 pt-1.5 w-[calc(100vw-2rem)] sm:w-[280px] max-w-[300px] z-50 before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 transition-all duration-150 ease-out ${
                  isAllCategoriesOpen
                    ? "opacity-100 translate-y-0 pointer-events-auto visible"
                    : "opacity-0 -translate-y-1 pointer-events-none invisible"
                }`}
                onMouseEnter={handleCategoriesMouseEnter}
              >
                <div className="w-full bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800 p-1.5 text-zinc-900 dark:text-zinc-100 transition-colors">
                  {/* Category List (Clean text rows without icons, comfortable spacing and size) */}
                  <div className="flex flex-col gap-0.5">
                    {/* Processors */}
                    <Link
                      href="/components/cpu"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors tactile-item"
                    >
                      Processors (CPUs)
                    </Link>

                    {/* Graphics Cards */}
                    <Link
                      href="/components/gpu"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors tactile-item"
                    >
                      Graphics Cards (GPUs)
                    </Link>

                    {/* Motherboards */}
                    <Link
                      href="/components/motherboards"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors tactile-item"
                    >
                      Motherboards
                    </Link>

                    {/* Cooling */}
                    <Link
                      href="/components/cooling"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors tactile-item"
                    >
                      Cooling Solutions
                    </Link>

                    {/* Cases */}
                    <Link
                      href="/components/cases"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors tactile-item"
                    >
                      PC Cases &amp; Chassis
                    </Link>

                    {/* Memory */}
                    <Link
                      href="/components/ram"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors tactile-item"
                    >
                      Memory (RAM)
                    </Link>

                    {/* Storage */}
                    <Link
                      href="/components/storage"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors tactile-item"
                    >
                      Storage (SSDs)
                    </Link>

                    {/* Power Supplies */}
                    <Link
                      href="/components/power-supplies"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors tactile-item"
                    >
                      Power Supplies (PSUs)
                    </Link>

                    {/* Prebuilts */}
                    <Link
                      href="/prebuilts"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-sm font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors tactile-item"
                    >
                      Pre-Built Systems
                    </Link>

                    {/* PC Builder */}
                    <Link
                      href="/builder"
                      onClick={() => setIsAllCategoriesOpen(false)}
                      className="flex items-center px-3 py-2 min-h-[40px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors tactile-item"
                    >
                      Custom PC Configurator
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Quick Links to Major Categories */}
            <nav className="flex items-center overflow-x-auto scrollbar-none gap-1 sm:gap-1.5 py-0.5 text-sm">
              <Link
                href="/components/cpu"
                className="flex items-center px-2.5 sm:px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                CPUs
              </Link>
              <Link
                href="/components/gpu"
                className="flex items-center px-2.5 sm:px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                GPUs
              </Link>
              <Link
                href="/components/motherboards"
                className="flex items-center px-2.5 sm:px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Motherboards
              </Link>
              <Link
                href="/components/cooling"
                className="flex items-center px-2.5 sm:px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Cooling
              </Link>
              <Link
                href="/components/cases"
                className="flex items-center px-2.5 sm:px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Cases
              </Link>
              <Link
                href="/components/ram"
                className="flex items-center px-2.5 sm:px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Memory (RAM)
              </Link>
              <Link
                href="/components/storage"
                className="flex items-center px-2.5 sm:px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Storage (SSDs)
              </Link>
              <Link
                href="/components/power-supplies"
                className="flex items-center px-2.5 sm:px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Power Supplies
              </Link>
              <Link
                href="/prebuilts"
                className="flex items-center gap-1.5 px-3 py-1 min-h-[38px] sm:min-h-[40px] rounded-lg text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-sm font-bold transition-colors whitespace-nowrap border border-transparent"
              >
                <span>Pre-Built Systems</span>
              </Link>
            </nav>
          </div>
        </div>
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
