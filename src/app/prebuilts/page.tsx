"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PREBUILT_SYSTEMS, PrebuiltSystem } from "../../lib/data/mockHardware";
import {
  ChevronDown,
  ArrowRight,
  Search,
  X,
  Check,
  SlidersHorizontal,
  Columns4,
  Columns3,
  Columns2,
  List,
  RotateCcw,
} from "lucide-react";
import { Pagination } from "../../components/ui/Pagination";
import { PrebuiltSystemCard } from "../../components/products/PrebuiltSystemCard";

type PrimaryCategory = "all" | "ready-to-go" | "built-to-order";
type TierFilter = "all" | "entry" | "premium" | "ultra";
type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";
type ViewMode = "grid-4" | "grid-3" | "grid-2" | "list";

export default function PrebuiltsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [primaryCategory, setPrimaryCategory] = useState<PrimaryCategory>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [viewMode, setViewMode] = useState<ViewMode>("grid-4");

  // Dropdown filter states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [filterAvailability, setFilterAvailability] = useState<string>("all");
  const [filterCpu, setFilterCpu] = useState<string>("all");
  const [filterGpu, setFilterGpu] = useState<string>("all");
  const [filterCase, setFilterCase] = useState<string>("all");
  const [filterMemory, setFilterMemory] = useState<string>("all");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered & Sorted Prebuilt Systems
  const filteredPrebuilts = useMemo(() => {
    return PREBUILT_SYSTEMS.filter((rig) => {
      // Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = rig.name.toLowerCase().includes(query);
        const matchesCpu = rig.cpu.toLowerCase().includes(query);
        const matchesGpu = rig.gpu.toLowerCase().includes(query);
        const matchesCase = rig.chassis.toLowerCase().includes(query);
        const matchesRam = rig.ram.toLowerCase().includes(query);
        const matchesStorage = rig.storage.toLowerCase().includes(query);
        if (
          !matchesName &&
          !matchesCpu &&
          !matchesGpu &&
          !matchesCase &&
          !matchesRam &&
          !matchesStorage
        ) {
          return false;
        }
      }

      // Primary Category
      if (primaryCategory === "ready-to-go") {
        if (!rig.inStock) return false;
      }

      // Tier filter based on price
      const price = (rig as any).sale_price || rig.price;
      if (tierFilter === "entry") {
        if (price > 26000000) return false;
      } else if (tierFilter === "premium") {
        if (price <= 26000000 || price > 40000000) return false;
      } else if (tierFilter === "ultra") {
        if (price <= 40000000) return false;
      }

      // Availability dropdown
      if (filterAvailability === "in-stock" && !rig.inStock) {
        return false;
      }

      // CPU dropdown
      if (filterCpu !== "all") {
        if (!rig.cpu.toLowerCase().includes(filterCpu.toLowerCase())) {
          return false;
        }
      }

      // GPU dropdown
      if (filterGpu !== "all") {
        if (!rig.gpu.toLowerCase().includes(filterGpu.toLowerCase())) {
          return false;
        }
      }

      // Case dropdown
      if (filterCase !== "all") {
        if (!rig.chassis.toLowerCase().includes(filterCase.toLowerCase())) {
          return false;
        }
      }

      // Memory dropdown
      if (filterMemory !== "all") {
        if (!rig.ram.toLowerCase().includes(filterMemory.toLowerCase())) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const priceA = (a as any).sale_price || a.price;
      const priceB = (b as any).sale_price || b.price;

      if (sortBy === "price-asc") {
        return priceA - priceB;
      }
      if (sortBy === "price-desc") {
        return priceB - priceA;
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      return 0; // featured / default order
    });
  }, [
    searchQuery,
    primaryCategory,
    tierFilter,
    filterAvailability,
    filterCpu,
    filterGpu,
    filterCase,
    filterMemory,
    sortBy,
  ]);

  const totalPrebuilts = filteredPrebuilts.length;
  const paginatedPrebuilts = filteredPrebuilts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetAllFilters = () => {
    setSearchQuery("");
    setPrimaryCategory("all");
    setTierFilter("all");
    setFilterAvailability("all");
    setFilterCpu("all");
    setFilterGpu("all");
    setFilterCase("all");
    setFilterMemory("all");
    setSortBy("featured");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    primaryCategory !== "all" ||
    tierFilter !== "all" ||
    filterAvailability !== "all" ||
    filterCpu !== "all" ||
    filterGpu !== "all" ||
    filterCase !== "all" ||
    filterMemory !== "all" ||
    sortBy !== "featured";

  const activeFilterCount =
    (primaryCategory !== "all" ? 1 : 0) +
    (tierFilter !== "all" ? 1 : 0) +
    (filterAvailability !== "all" ? 1 : 0) +
    (filterCpu !== "all" ? 1 : 0) +
    (filterGpu !== "all" ? 1 : 0) +
    (filterCase !== "all" ? 1 : 0) +
    (filterMemory !== "all" ? 1 : 0) +
    (Boolean(searchQuery.trim()) ? 1 : 0);

  // Dynamic Grid classes based on viewMode
  const gridClasses = useMemo(() => {
    switch (viewMode) {
      case "grid-3":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8";
      case "grid-2":
        return "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8";
      case "list":
        return "grid grid-cols-1 gap-4 sm:gap-6";
      case "grid-4":
      default:
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8";
    }
  }, [viewMode]);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8 space-y-8">
      {/* Hero Header Banner */}
      <section
        aria-label="Gaming PCs Showcase"
        className="w-full bg-[#12141A] text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 relative overflow-hidden border border-white/10 shadow-2xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Column: Breadcrumb, Title, Subtitle */}
          <div className="lg:col-span-7 space-y-4">
            {/* Breadcrumb Navigation */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs sm:text-sm text-[#8B949E] font-medium"
            >
              <Link
                href="/"
                className="hover:text-white transition-colors focus:outline-none focus:underline"
              >
                Desktop computers
              </Link>
              <span className="text-[#555D68]" aria-hidden="true">
                /
              </span>
              <span className="text-zinc-200 font-semibold">Gaming</span>
            </nav>

            {/* Main Header Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Gaming PCs
            </h1>

            {/* Description Subtitle */}
            <p className="text-xs sm:text-sm md:text-base text-zinc-300 max-w-xl font-normal leading-relaxed">
              Your next great game starts here. Explore Incus ready-to-go gaming PCs
              or build a system around the way you play.
            </p>
          </div>

          {/* Right Column: Dual PC Showcase Visual */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end relative">
            {/* Ambient Lighting Glow Behind Towers (Understated, non-neon luxury) */}
            <div
              className="absolute -inset-4 bg-gradient-to-r from-[#37baf2]/10 via-[#52E394]/10 to-[#37baf2]/10 blur-3xl rounded-full opacity-60 pointer-events-none"
              aria-hidden="true"
            />

            {/* Dual Towers Presentation */}
            <div className="relative flex items-center justify-center -space-x-8 sm:-space-x-12">
              {/* White Rig (Foreground Left) */}
              <div className="relative w-44 sm:w-56 lg:w-64 aspect-[4/5] z-10 transition-transform duration-300 hover:scale-[1.03]">
                <Image
                  src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80"
                  alt="Incus White Edition Gaming PC"
                  fill
                  className="object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
                  priority
                />
              </div>

              {/* Black RGB Rig (Background Right) */}
              <div className="relative w-44 sm:w-56 lg:w-64 aspect-[4/5] z-0 transition-transform duration-300 hover:scale-[1.03]">
                <Image
                  src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80"
                  alt="Incus Apex RGB Gaming PC"
                  fill
                  className="object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Filter Pills Section */}
      <div className="space-y-4 pt-2">
        {/* Row 1: Primary Category Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-[#8B949E] w-36 shrink-0">
            Gaming PCs
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setPrimaryCategory("all");
                setTierFilter("all");
                setCurrentPage(1);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all shadow-xs ${
                primaryCategory === "all"
                  ? "bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E]"
                  : "bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] border border-slate-300 dark:border-white/10 hover:border-[#37baf2]/60 hover:text-[#37baf2]"
              }`}
            >
              <span>All gaming PCs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setPrimaryCategory("ready-to-go");
                setCurrentPage(1);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all shadow-xs ${
                primaryCategory === "ready-to-go"
                  ? "bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] font-bold"
                  : "bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] border border-slate-300 dark:border-white/10 hover:border-[#37baf2]/60 hover:text-[#37baf2]"
              }`}
            >
              <span>Ready to go</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setPrimaryCategory("built-to-order");
                setCurrentPage(1);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all shadow-xs ${
                primaryCategory === "built-to-order"
                  ? "bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] font-bold"
                  : "bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] border border-slate-300 dark:border-white/10 hover:border-[#37baf2]/60 hover:text-[#37baf2]"
              }`}
            >
              <span>Built to order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <Link
              href="/builder"
              className="min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] border border-slate-300 dark:border-white/10 hover:border-[#37baf2]/60 hover:text-[#37baf2] shadow-xs"
            >
              <span>Total custom</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Row 2: Sub-tier Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-[#8B949E] w-36 shrink-0">
            Prebuilt, ready to go
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setTierFilter(tierFilter === "entry" ? "all" : "entry");
                setCurrentPage(1);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all ${
                tierFilter === "entry"
                  ? "bg-[#37baf2]/15 text-[#37baf2] border border-[#37baf2] font-bold"
                  : "border border-slate-300 dark:border-white/15 text-zinc-700 dark:text-[#8B949E] hover:border-[#37baf2]/60 hover:text-[#37baf2]"
              }`}
            >
              <span>Just want to play</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setTierFilter(tierFilter === "premium" ? "all" : "premium");
                setCurrentPage(1);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all ${
                tierFilter === "premium"
                  ? "bg-[#37baf2]/15 text-[#37baf2] border border-[#37baf2] font-bold"
                  : "border border-slate-300 dark:border-white/15 text-zinc-700 dark:text-[#8B949E] hover:border-[#37baf2]/60 hover:text-[#37baf2]"
              }`}
            >
              <span>Premium</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setTierFilter(tierFilter === "ultra" ? "all" : "ultra");
                setCurrentPage(1);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all ${
                tierFilter === "ultra"
                  ? "bg-[#37baf2]/15 text-[#37baf2] border border-[#37baf2] font-bold"
                  : "border border-slate-300 dark:border-white/15 text-zinc-700 dark:text-[#8B949E] hover:border-[#37baf2]/60 hover:text-[#37baf2]"
              }`}
            >
              <span>Ultra</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Section Header */}
      <div className="pt-4 border-t border-slate-200 dark:border-white/10">
        <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Ready-to-go gaming PCs
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8B949E] mt-1">
          Prebuilt Incus gaming PCs. Compare specifications, prices and store availability.
        </p>
      </div>

      {/* Filter and Control Toolbar */}
      <div
        ref={dropdownRef}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2"
      >
        {/* Left Side: Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "category" ? null : "category")
              }
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors border ${
                primaryCategory !== "all"
                  ? "border-[#37baf2] text-[#37baf2] dark:text-[#37baf2] bg-[#37baf2]/10"
                  : "border-slate-300 dark:border-white/10 bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] hover:border-slate-400 dark:hover:border-white/20"
              }`}
            >
              <span>Category</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {activeDropdown === "category" && (
              <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[200px] bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 space-y-1">
                {[
                  { id: "all", label: "All Categories" },
                  { id: "ready-to-go", label: "Ready to Go Desktops" },
                  { id: "built-to-order", label: "Built to Order Workstations" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPrimaryCategory(item.id as PrimaryCategory);
                      setActiveDropdown(null);
                      setCurrentPage(1);
                    }}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#1A1D24] text-zinc-900 dark:text-white"
                  >
                    <span>{item.label}</span>
                    {primaryCategory === item.id && (
                      <Check className="w-3.5 h-3.5 text-[#37baf2]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Availability Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "availability" ? null : "availability")
              }
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors border ${
                filterAvailability !== "all"
                  ? "border-[#37baf2] text-[#37baf2] dark:text-[#37baf2] bg-[#37baf2]/10"
                  : "border-slate-300 dark:border-white/10 bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] hover:border-slate-400 dark:hover:border-white/20"
              }`}
            >
              <span>Availability</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {activeDropdown === "availability" && (
              <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[200px] bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 space-y-1">
                {[
                  { id: "all", label: "All Availability" },
                  { id: "in-stock", label: "In Stock at Flagship" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFilterAvailability(item.id);
                      setActiveDropdown(null);
                      setCurrentPage(1);
                    }}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#1A1D24] text-zinc-900 dark:text-white"
                  >
                    <span>{item.label}</span>
                    {filterAvailability === item.id && (
                      <Check className="w-3.5 h-3.5 text-[#37baf2]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Case Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "case" ? null : "case")
              }
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors border ${
                filterCase !== "all"
                  ? "border-[#37baf2] text-[#37baf2] dark:text-[#37baf2] bg-[#37baf2]/10"
                  : "border-slate-300 dark:border-white/10 bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] hover:border-slate-400 dark:hover:border-white/20"
              }`}
            >
              <span>Case</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {activeDropdown === "case" && (
              <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[220px] bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 space-y-1">
                {[
                  { id: "all", label: "All Chassis" },
                  { id: "Lian Li", label: "Lian Li Cases" },
                  { id: "Fractal", label: "Fractal Design Cases" },
                  { id: "NZXT", label: "NZXT Cases" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFilterCase(item.id);
                      setActiveDropdown(null);
                      setCurrentPage(1);
                    }}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#1A1D24] text-zinc-900 dark:text-white"
                  >
                    <span>{item.label}</span>
                    {filterCase === item.id && (
                      <Check className="w-3.5 h-3.5 text-[#37baf2]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CPU Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "cpu" ? null : "cpu")
              }
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors border ${
                filterCpu !== "all"
                  ? "border-[#37baf2] text-[#37baf2] dark:text-[#37baf2] bg-[#37baf2]/10"
                  : "border-slate-300 dark:border-white/10 bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] hover:border-slate-400 dark:hover:border-white/20"
              }`}
            >
              <span>CPU</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {activeDropdown === "cpu" && (
              <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[220px] bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 space-y-1">
                {[
                  { id: "all", label: "All Processors" },
                  { id: "Ryzen 7", label: "AMD Ryzen 7" },
                  { id: "Ryzen 9", label: "AMD Ryzen 9" },
                  { id: "Core i7", label: "Intel Core i7" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFilterCpu(item.id);
                      setActiveDropdown(null);
                      setCurrentPage(1);
                    }}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#1A1D24] text-zinc-900 dark:text-white"
                  >
                    <span>{item.label}</span>
                    {filterCpu === item.id && (
                      <Check className="w-3.5 h-3.5 text-[#37baf2]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Graphics Card Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "gpu" ? null : "gpu")
              }
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors border ${
                filterGpu !== "all"
                  ? "border-[#37baf2] text-[#37baf2] dark:text-[#37baf2] bg-[#37baf2]/10"
                  : "border-slate-300 dark:border-white/10 bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] hover:border-slate-400 dark:hover:border-white/20"
              }`}
            >
              <span>Graphics Card</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {activeDropdown === "gpu" && (
              <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[220px] bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 space-y-1">
                {[
                  { id: "all", label: "All Graphics Cards" },
                  { id: "4070", label: "GeForce RTX 4070 Series" },
                  { id: "4080", label: "GeForce RTX 4080 Series" },
                  { id: "4060", label: "GeForce RTX 4060 Series" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFilterGpu(item.id);
                      setActiveDropdown(null);
                      setCurrentPage(1);
                    }}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#1A1D24] text-zinc-900 dark:text-white"
                  >
                    <span>{item.label}</span>
                    {filterGpu === item.id && (
                      <Check className="w-3.5 h-3.5 text-[#37baf2]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Memory Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "memory" ? null : "memory")
              }
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors border ${
                filterMemory !== "all"
                  ? "border-[#37baf2] text-[#37baf2] dark:text-[#37baf2] bg-[#37baf2]/10"
                  : "border-slate-300 dark:border-white/10 bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] hover:border-slate-400 dark:hover:border-white/20"
              }`}
            >
              <span>Memory</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {activeDropdown === "memory" && (
              <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[200px] bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 space-y-1">
                {[
                  { id: "all", label: "All Memory" },
                  { id: "32GB", label: "32GB High Speed" },
                  { id: "64GB", label: "64GB High Speed" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFilterMemory(item.id);
                      setActiveDropdown(null);
                      setCurrentPage(1);
                    }}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#1A1D24] text-zinc-900 dark:text-white"
                  >
                    <span>{item.label}</span>
                    {filterMemory === item.id && (
                      <Check className="w-3.5 h-3.5 text-[#37baf2]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More filters Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "more" ? null : "more")
              }
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors border ${
                activeFilterCount > 0
                  ? "border-[#37baf2] text-[#37baf2] dark:text-[#37baf2] bg-[#37baf2]/10"
                  : "border-slate-300 dark:border-white/10 bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] hover:border-slate-400 dark:hover:border-white/20"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>More filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#37baf2] text-[#0A0B0E] text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {activeDropdown === "more" && (
              <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[240px] bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    Active Filters ({activeFilterCount})
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="text-[11px] text-[#37baf2] hover:underline font-semibold"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#8B949E] space-y-1">
                  <p>Category: {primaryCategory}</p>
                  <p>Tier: {tierFilter}</p>
                  <p>CPU: {filterCpu}</p>
                  <p>GPU: {filterGpu}</p>
                  <p>Case: {filterCase}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Search, Sort, View Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search within results */}
          <div className="relative min-w-[200px] sm:min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search within results"
              className="w-full min-h-[44px] pl-9 pr-8 py-2 text-xs bg-white dark:bg-[#12141A] border border-slate-300 dark:border-white/10 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-[#8B949E] focus:outline-none focus:ring-1 focus:ring-[#37baf2] focus:border-[#37baf2] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "sort" ? null : "sort")
              }
              className="min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 border border-slate-300 dark:border-white/10 bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] hover:border-slate-400 dark:hover:border-white/20 transition-colors"
            >
              <span className="text-zinc-400 font-normal">Sort:</span>
              <span className="font-bold">
                {sortBy === "price-asc"
                  ? "Price (Low to High)"
                  : sortBy === "price-desc"
                  ? "Price (High to Low)"
                  : sortBy === "name-asc"
                  ? "Name (A to Z)"
                  : "Price"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {activeDropdown === "sort" && (
              <div className="absolute top-full right-0 mt-1.5 z-30 min-w-[200px] bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 space-y-1">
                {[
                  { id: "featured", label: "Featured" },
                  { id: "price-asc", label: "Price: Low to High" },
                  { id: "price-desc", label: "Price: High to Low" },
                  { id: "name-asc", label: "System Name: A to Z" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSortBy(item.id as SortOption);
                      setActiveDropdown(null);
                    }}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#1A1D24] text-zinc-900 dark:text-white"
                  >
                    <span>{item.label}</span>
                    {sortBy === item.id && (
                      <Check className="w-3.5 h-3.5 text-[#37baf2]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Toggle Button Cluster */}
          <div
            role="group"
            aria-label="View layout options"
            className="flex items-center border border-slate-300 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-[#12141A] p-0.5"
          >
            <button
              type="button"
              onClick={() => setViewMode("grid-2")}
              title="2-column view"
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded transition-colors ${
                viewMode === "grid-2"
                  ? "bg-[#37baf2] text-[#0A0B0E]"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Columns2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setViewMode("grid-3")}
              title="3-column view"
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded transition-colors ${
                viewMode === "grid-3"
                  ? "bg-[#37baf2] text-[#0A0B0E]"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Columns3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setViewMode("grid-4")}
              title="4-column view"
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded transition-colors ${
                viewMode === "grid-4"
                  ? "bg-[#37baf2] text-[#0A0B0E]"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Columns4 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List view"
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded transition-colors ${
                viewMode === "list"
                  ? "bg-[#37baf2] text-[#0A0B0E]"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-500 dark:text-[#8B949E] font-medium">
            Active filters:
          </span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-[#1A1D24] text-zinc-900 dark:text-zinc-200 border border-slate-300 dark:border-white/10">
              Query: "{searchQuery}"
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="hover:text-[#37baf2] ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {primaryCategory !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-[#1A1D24] text-zinc-900 dark:text-zinc-200 border border-slate-300 dark:border-white/10">
              Category: {primaryCategory}
              <button
                type="button"
                onClick={() => setPrimaryCategory("all")}
                className="hover:text-[#37baf2] ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {tierFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-[#1A1D24] text-zinc-900 dark:text-zinc-200 border border-slate-300 dark:border-white/10">
              Tier: {tierFilter}
              <button
                type="button"
                onClick={() => setTierFilter("all")}
                className="hover:text-[#37baf2] ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterAvailability !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-[#1A1D24] text-zinc-900 dark:text-zinc-200 border border-slate-300 dark:border-white/10">
              In Stock Only
              <button
                type="button"
                onClick={() => setFilterAvailability("all")}
                className="hover:text-[#37baf2] ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterCpu !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-[#1A1D24] text-zinc-900 dark:text-zinc-200 border border-slate-300 dark:border-white/10">
              CPU: {filterCpu}
              <button
                type="button"
                onClick={() => setFilterCpu("all")}
                className="hover:text-[#37baf2] ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterGpu !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-[#1A1D24] text-zinc-900 dark:text-zinc-200 border border-slate-300 dark:border-white/10">
              GPU: {filterGpu}
              <button
                type="button"
                onClick={() => setFilterGpu("all")}
                className="hover:text-[#37baf2] ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterCase !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-[#1A1D24] text-zinc-900 dark:text-zinc-200 border border-slate-300 dark:border-white/10">
              Case: {filterCase}
              <button
                type="button"
                onClick={() => setFilterCase("all")}
                className="hover:text-[#37baf2] ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterMemory !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-[#1A1D24] text-zinc-900 dark:text-zinc-200 border border-slate-300 dark:border-white/10">
              RAM: {filterMemory}
              <button
                type="button"
                onClick={() => setFilterMemory("all")}
                className="hover:text-[#37baf2] ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1 text-[#37baf2] font-semibold hover:underline ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        </div>
      )}

      {/* Grid of Prebuilt Rigs */}
      <div className="space-y-8" id="prebuilts-list">
        {totalPrebuilts > 0 ? (
          <div className={gridClasses}>
            {paginatedPrebuilts.map((pb) => (
              <PrebuiltSystemCard key={pb.id} rig={pb} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#12141A] rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              No gaming PCs match your criteria
            </h3>
            <p className="text-sm text-slate-500 dark:text-[#8B949E] max-w-md mx-auto">
              Try adjusting your search terms or clearing some active filters to view available performance systems.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[44px] px-4 py-2 bg-[#52E394] hover:brightness-105 text-[#0A0B0E] rounded-md text-xs font-semibold transition-all shadow-xs"
              >
                Reset All Filters
              </button>
              <Link
                href="/builder"
                className="min-h-[44px] px-4 py-2 border border-slate-300 dark:border-white/15 hover:border-[#37baf2] hover:text-[#37baf2] rounded-md text-xs font-medium text-zinc-900 dark:text-white transition-all flex items-center gap-2"
              >
                <span>Customize in PC Builder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Prebuilts Pagination with 10, 20, 50 settings */}
        {totalPrebuilts > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalPrebuilts}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            scrollToId="prebuilts-list"
            itemLabel="systems"
          />
        )}
      </div>
    </div>
  );
}
