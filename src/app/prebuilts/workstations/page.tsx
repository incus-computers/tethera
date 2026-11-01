"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PREBUILT_SYSTEMS, PrebuiltSystem } from "../../../lib/data/mockHardware";
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
import { PrebuiltSystemCard } from "../../../components/products/PrebuiltSystemCard";

type PrimaryCategory = "all" | "ready-to-go" | "built-to-order";
type TierFilter = "all" | "studio" | "creator" | "titan";
type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";
type ViewMode = "grid-4" | "grid-3" | "grid-2" | "list";

export default function WorkstationsPage() {
  const INITIAL_BATCH = 12;
  const BATCH_INCREMENT = 6;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  // Filtered & Sorted Workstation Systems
  const filteredWorkstations = useMemo(() => {
    return PREBUILT_SYSTEMS.filter((rig) => {
      // Must be workstation system
      const isWorkstation =
        rig.systemType === "workstation" ||
        rig.name.toLowerCase().includes("workstation") ||
        rig.name.toLowerCase().includes("creator") ||
        rig.name.toLowerCase().includes("titan") ||
        rig.name.toLowerCase().includes("cad");
      if (!isWorkstation) return false;

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

      // Tier filter based on workstation tier
      if (tierFilter === "studio") {
        if (!rig.name.toLowerCase().includes("cad") && !rig.name.toLowerCase().includes("studio")) {
          return false;
        }
      } else if (tierFilter === "creator") {
        if (!rig.name.toLowerCase().includes("creator")) {
          return false;
        }
      } else if (tierFilter === "titan") {
        if (!rig.name.toLowerCase().includes("titan") && !rig.name.toLowerCase().includes("vanguard")) {
          return false;
        }
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
      return 0;
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

  const totalWorkstations = filteredWorkstations.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, filteredWorkstations.length));
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredWorkstations.length]);

  const visibleWorkstations = filteredWorkstations.slice(0, visibleCount);

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
    setVisibleCount(INITIAL_BATCH);
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
        aria-label="Workstations Showcase"
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
              <Link
                href="/prebuilt-systems"
                className="hover:text-white transition-colors focus:outline-none focus:underline"
              >
                Prebuilt Systems
              </Link>
              <span className="text-[#555D68]" aria-hidden="true">
                /
              </span>
              <span className="text-zinc-200 font-semibold">Workstations</span>
            </nav>

            {/* Main Header Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Workstations
            </h1>

            {/* Description Subtitle */}
            <p className="text-sm sm:text-base text-zinc-300 max-w-xl font-normal leading-relaxed">
              High-compute precision systems engineered for 3D rendering, machine learning,
              CAD modeling, and demanding multi-threaded creator workflows.
            </p>
          </div>

          {/* Right Column: Dual Workstation Showcase Visual */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end relative">
            {/* Ambient Lighting Glow Behind Towers */}
            <div
              className="absolute -inset-4 bg-gradient-to-r from-[#37baf2]/10 via-indigo-500/10 to-[#52E394]/10 blur-3xl rounded-full opacity-60 pointer-events-none"
              aria-hidden="true"
            />

            {/* Dual Towers Presentation */}
            <div className="relative flex items-center justify-center -space-x-8 sm:-space-x-12">
              <div className="relative w-44 sm:w-56 lg:w-64 aspect-[4/5] z-10 transition-transform duration-300 hover:scale-[1.03]">
                <Image
                  src="https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&auto=format&fit=crop&q=80"
                  alt="Incus Titan Threadripper Studio Workstation"
                  fill
                  className="object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
                  priority
                />
              </div>

              <div className="relative w-44 sm:w-56 lg:w-64 aspect-[4/5] z-0 transition-transform duration-300 hover:scale-[1.03]">
                <Image
                  src="https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&auto=format&fit=crop&q=80"
                  alt="Incus Precision CAD Core i9 Workstation"
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
            Workstations
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setPrimaryCategory("all");
                setTierFilter("all");
                setVisibleCount(INITIAL_BATCH);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all shadow-xs ${
                primaryCategory === "all"
                  ? "bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E]"
                  : "bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] border border-slate-300 dark:border-white/10 hover:border-[#37baf2]/60 hover:text-[#37baf2]"
              }`}
            >
              <span>All workstations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setPrimaryCategory("ready-to-go");
                setVisibleCount(INITIAL_BATCH);
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
                setVisibleCount(INITIAL_BATCH);
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
              className="min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all shadow-xs bg-white dark:bg-[#12141A] text-zinc-700 dark:text-[#8B949E] border border-slate-300 dark:border-white/10 hover:border-[#37baf2]/60 hover:text-[#37baf2]"
            >
              <span>Custom workstation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Row 2: Secondary Category / Tier Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-[#8B949E] w-36 shrink-0">
            Workstation tiers
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setTierFilter("all");
                setVisibleCount(INITIAL_BATCH);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all ${
                tierFilter === "all"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold"
                  : "bg-slate-100 dark:bg-zinc-900 text-zinc-600 dark:text-[#8B949E] hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>All workstations</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTierFilter("studio");
                setVisibleCount(INITIAL_BATCH);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all ${
                tierFilter === "studio"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold"
                  : "bg-slate-100 dark:bg-zinc-900 text-zinc-600 dark:text-[#8B949E] hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>Studio CAD</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTierFilter("creator");
                setVisibleCount(INITIAL_BATCH);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all ${
                tierFilter === "creator"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold"
                  : "bg-slate-100 dark:bg-zinc-900 text-zinc-600 dark:text-[#8B949E] hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>Creator Pro</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTierFilter("titan");
                setVisibleCount(INITIAL_BATCH);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all ${
                tierFilter === "titan"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold"
                  : "bg-slate-100 dark:bg-zinc-900 text-zinc-600 dark:text-[#8B949E] hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>Titan Threadripper</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Section Header */}
      <div className="pt-4 border-t border-slate-200 dark:border-white/10">
        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
          Ready-to-go workstations
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8B949E] mt-1 font-normal">
          Prebuilt Incus workstations. Compare enterprise specifications, GPU compute power and store availability.
        </p>
      </div>

      {/* Filter and View Toolbar */}
      <div
        ref={dropdownRef}
        className="bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl p-3 sm:p-4 shadow-sm relative z-20"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "category" ? null : "category")
                }
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 border transition-colors ${
                  primaryCategory !== "all"
                    ? "bg-[#37baf2]/10 border-[#37baf2] text-[#37baf2]"
                    : "bg-slate-50 dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-slate-400"
                }`}
              >
                <span>Category</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {activeDropdown === "category" && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 z-30 space-y-1">
                  {[
                    { id: "all", label: "All Categories" },
                    { id: "ready-to-go", label: "Ready to Go" },
                    { id: "built-to-order", label: "Built to Order" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPrimaryCategory(item.id as PrimaryCategory);
                        setActiveDropdown(null);
                        setVisibleCount(INITIAL_BATCH);
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

            {/* Availability Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(
                    activeDropdown === "availability" ? null : "availability"
                  )
                }
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 border transition-colors ${
                  filterAvailability !== "all"
                    ? "bg-[#37baf2]/10 border-[#37baf2] text-[#37baf2]"
                    : "bg-slate-50 dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-slate-400"
                }`}
              >
                <span>Availability</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {activeDropdown === "availability" && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 z-30 space-y-1">
                  {[
                    { id: "all", label: "All Stock Statuses" },
                    { id: "in-stock", label: "Ready for Pickup Today" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilterAvailability(item.id);
                        setActiveDropdown(null);
                        setVisibleCount(INITIAL_BATCH);
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

            {/* Case Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "case" ? null : "case")
                }
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 border transition-colors ${
                  filterCase !== "all"
                    ? "bg-[#37baf2]/10 border-[#37baf2] text-[#37baf2]"
                    : "bg-slate-50 dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-slate-400"
                }`}
              >
                <span>Case</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {activeDropdown === "case" && (
                <div className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 z-30 space-y-1">
                  {[
                    { id: "all", label: "All Cases" },
                    { id: "fractal", label: "Fractal Design" },
                    { id: "lian li", label: "Lian Li Chassis" },
                    { id: "corsair", label: "Corsair Chassis" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilterCase(item.id);
                        setActiveDropdown(null);
                        setVisibleCount(INITIAL_BATCH);
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

            {/* CPU Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "cpu" ? null : "cpu")
                }
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 border transition-colors ${
                  filterCpu !== "all"
                    ? "bg-[#37baf2]/10 border-[#37baf2] text-[#37baf2]"
                    : "bg-slate-50 dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-slate-400"
                }`}
              >
                <span>CPU</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {activeDropdown === "cpu" && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 z-30 space-y-1">
                  {[
                    { id: "all", label: "All Processors" },
                    { id: "threadripper", label: "AMD Threadripper Pro" },
                    { id: "core i9", label: "Intel Core i9" },
                    { id: "ryzen 9", label: "AMD Ryzen 9" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilterCpu(item.id);
                        setActiveDropdown(null);
                        setVisibleCount(INITIAL_BATCH);
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

            {/* Graphics Card Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "gpu" ? null : "gpu")
                }
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 border transition-colors ${
                  filterGpu !== "all"
                    ? "bg-[#37baf2]/10 border-[#37baf2] text-[#37baf2]"
                    : "bg-slate-50 dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-slate-400"
                }`}
              >
                <span>Graphics Card</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {activeDropdown === "gpu" && (
                <div className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 z-30 space-y-1">
                  {[
                    { id: "all", label: "All GPUs" },
                    { id: "rtx 4090", label: "Dual RTX 4090 / 4090" },
                    { id: "rtx 4080", label: "RTX 4080 Super" },
                    { id: "rtx 4070", label: "RTX 4070 Ti" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilterGpu(item.id);
                        setActiveDropdown(null);
                        setVisibleCount(INITIAL_BATCH);
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

            {/* Memory Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "memory" ? null : "memory")
                }
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 border transition-colors ${
                  filterMemory !== "all"
                    ? "bg-[#37baf2]/10 border-[#37baf2] text-[#37baf2]"
                    : "bg-slate-50 dark:bg-[#1A1D24] border-slate-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-slate-400"
                }`}
              >
                <span>Memory</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {activeDropdown === "memory" && (
                <div className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 z-30 space-y-1">
                  {[
                    { id: "all", label: "All Memory Sizes" },
                    { id: "64gb", label: "64 GB DDR5" },
                    { id: "128gb", label: "128 GB DDR5 ECC" },
                    { id: "256gb", label: "256 GB DDR5 ECC" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilterMemory(item.id);
                        setActiveDropdown(null);
                        setVisibleCount(INITIAL_BATCH);
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

            {/* More filters trigger */}
            <button
              type="button"
              onClick={() => {
                setActiveDropdown(null);
              }}
              className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A1D24] text-zinc-700 dark:text-zinc-300 hover:border-slate-400 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span>More filters</span>
            </button>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}
          </div>

          {/* Right: Search, Grid View Switcher, and Sort */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(INITIAL_BATCH);
                }}
                placeholder="Search within results"
                className="w-full min-h-[44px] pl-9 pr-8 py-2 text-xs bg-white dark:bg-[#12141A] border border-slate-300 dark:border-white/10 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-[#8B949E] focus:outline-none focus:ring-1 focus:ring-[#37baf2] focus:border-[#37baf2] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Grid Switchers */}
            <div
              role="radiogroup"
              aria-label="View layout options"
              className="hidden sm:flex items-center bg-slate-100 dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-lg p-0.5"
            >
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === "grid-4"}
                onClick={() => setViewMode("grid-4")}
                aria-label="4 columns grid"
                className={`min-h-[40px] px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === "grid-4"
                    ? "bg-white dark:bg-[#12141A] text-zinc-900 dark:text-white shadow-xs font-bold"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                <Columns4 className="w-4 h-4" />
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === "grid-3"}
                onClick={() => setViewMode("grid-3")}
                aria-label="3 columns grid"
                className={`min-h-[40px] px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === "grid-3"
                    ? "bg-white dark:bg-[#12141A] text-zinc-900 dark:text-white shadow-xs font-bold"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                <Columns3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === "grid-2"}
                onClick={() => setViewMode("grid-2")}
                aria-label="2 columns grid"
                className={`min-h-[40px] px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === "grid-2"
                    ? "bg-white dark:bg-[#12141A] text-zinc-900 dark:text-white shadow-xs font-bold"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                <Columns2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === "list"}
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`min-h-[40px] px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-[#12141A] text-zinc-900 dark:text-white shadow-xs font-bold"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-[#8B949E] whitespace-nowrap">
                Sort:
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Sort workstations"
                  className="min-h-[44px] bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#37baf2] cursor-pointer"
                >
                  <option value="featured">Featured First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workstations Grid Listing */}
      <div className="space-y-8" id="workstations-list">
        {totalWorkstations > 0 ? (
          <div className={gridClasses}>
            {visibleWorkstations.map((pb) => (
              <PrebuiltSystemCard key={pb.id} rig={pb} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-4 bg-white dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-2xl">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No workstation systems found matching your criteria.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#37baf2] text-[#0A0B0E] text-xs font-bold hover:bg-[#52c6f5] transition-all shadow-sm inline-flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear all filters</span>
            </button>
          </div>
        )}

        {/* Infinite Scroll Sentinel / Loading Indicator */}
        {visibleCount < totalWorkstations && (
          <div ref={sentinelRef} className="py-8 flex justify-center items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-[#37baf2] animate-pulse" />
              <span>Loading more workstations...</span>
            </div>
          </div>
        )}

        {visibleCount >= totalWorkstations && totalWorkstations > 0 && (
          <div className="py-6 text-center text-xs font-medium text-slate-400 dark:text-zinc-500">
            Showing all {totalWorkstations} workstations
          </div>
        )}
      </div>
    </div>
  );
}
