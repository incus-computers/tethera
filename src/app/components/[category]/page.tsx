"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MOCK_COMPONENTS,
  CATEGORY_SLUG_MAP,
  ComponentItem,
  getExpandedCatalogItems,
} from "../../../lib/data/mockHardware";
import { useCartStore } from "../../../lib/store/useCartStore";
import { formatRupiah } from "../../../lib/utils/currency";
import {
  Plus,
  ChevronRight,
  ArrowLeft,
  SlidersHorizontal,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  Check,
  RotateCcw,
} from "lucide-react";
import { ProductItemTileImage } from "../../../components/products/ProductItemTileImage";

const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "stock", label: "Stock Level" },
] as const;

type SortOptionId = (typeof SORT_OPTIONS)[number]["id"];

const CPU_SOCKETS = [
  { value: "All", label: "All Sockets" },
  { value: "AM4", label: "AMD AM4" },
  { value: "AM5", label: "AMD AM5" },
  { value: "LGA1700", label: "Intel LGA1700" },
  { value: "LGA1851", label: "Intel LGA1851" },
];

const GPU_MANUFACTURERS = [
  { value: "All", label: "All GPU Chips" },
  { value: "NVIDIA", label: "NVIDIA GeForce" },
  { value: "AMD", label: "AMD Radeon" },
];

const COOLING_TYPES = [
  { value: "All", label: "All Cooling Types" },
  { value: "Water Cooling", label: "Water Cooling" },
  { value: "Air Cooling", label: "Air Cooling" },
  { value: "Cooling Fans", label: "Cooling Fans" },
];

const CASE_SIZES = [
  { value: "All", label: "All Sizes" },
  { value: "mini ITX", label: "mini ITX" },
  { value: "mATX", label: "mATX" },
  { value: "ATX", label: "ATX" },
];

const MEMORY_TYPES = [
  { value: "All", label: "All Memory Types" },
  { value: "Desktop Memory", label: "Desktop Memory" },
  { value: "Laptop Memory", label: "Laptop Memory" },
];

const DDR_GENERATIONS = [
  { value: "All", label: "All DDR" },
  { value: "DDR4", label: "DDR4" },
  { value: "DDR5", label: "DDR5" },
];

const MEMORY_CAPACITIES = [
  { value: "All", label: "All Capacities" },
  { value: "16GB", label: "16GB" },
  { value: "32GB", label: "32GB" },
  { value: "64GB", label: "64GB" },
];

const STORAGE_TYPES = [
  { value: "All", label: "All Types" },
  { value: "SSD", label: "SSD" },
  { value: "HDD", label: "HDD" },
];

const STORAGE_CAPACITIES = [
  { value: "All", label: "All Capacities" },
  { value: "500GB", label: "500GB" },
  { value: "1TB", label: "1TB" },
  { value: "2TB", label: "2TB" },
  { value: "4TB", label: "4TB" },
  { value: "8TB", label: "8TB" },
];

const PSU_EFFICIENCY_RATINGS = [
  { value: "All", label: "All 80+ Ratings" },
  { value: "Bronze", label: "80+ Bronze" },
  { value: "Gold", label: "80+ Gold" },
  { value: "Platinum", label: "80+ Platinum" },
];

const PSU_WATTAGES = [
  { value: "All", label: "All Wattages" },
  { value: "650", label: "650W" },
  { value: "750", label: "750W" },
  { value: "850", label: "850W" },
  { value: "1000", label: "1000W" },
  { value: "1200", label: "1200W" },
];

export default function CategoryProductsPage() {
  const params = useParams();
  const categorySlug = (params?.category as string)?.toLowerCase();

  const categoryMeta = CATEGORY_SLUG_MAP[categorySlug];
  const { addStandardItem, openCart } = useCartStore();

  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedSocket, setSelectedSocket] = useState("All");
  const [selectedGpuManufacturer, setSelectedGpuManufacturer] = useState("All");
  const [selectedCoolingType, setSelectedCoolingType] = useState("All");
  const [selectedCaseSize, setSelectedCaseSize] = useState("All");
  const [selectedMemoryType, setSelectedMemoryType] = useState("All");
  const [selectedDdrGen, setSelectedDdrGen] = useState("All");
  const [selectedMemoryCapacity, setSelectedMemoryCapacity] = useState("All");
  const [selectedStorageType, setSelectedStorageType] = useState("All");
  const [selectedStorageCapacity, setSelectedStorageCapacity] = useState("All");
  const [selectedPsuRating, setSelectedPsuRating] = useState("All");
  const [selectedPsuWattage, setSelectedPsuWattage] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOptionId>("featured");

  const INITIAL_BATCH = 24;
  const BATCH_INCREMENT = 12;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isCpuCategory = categorySlug === "cpu" || categoryMeta?.slot === "cpu";
  const isGpuCategory = categorySlug === "gpu" || categoryMeta?.slot === "gpu";
  const isCoolingCategory = categorySlug === "cooling" || categoryMeta?.slot === "cooler";
  const isCaseCategory = categorySlug === "cases" || categoryMeta?.slot === "case";
  const isMemoryCategory = categorySlug === "ram" || categoryMeta?.slot === "ram";
  const isStorageCategory = categorySlug === "storage" || categoryMeta?.slot === "storage_primary";
  const isPsuCategory = categorySlug === "power-supplies" || categoryMeta?.slot === "psu";

  const handleResetFilters = () => {
    setSelectedBrand("All");
    setSelectedSocket("All");
    setSelectedGpuManufacturer("All");
    setSelectedCoolingType("All");
    setSelectedCaseSize("All");
    setSelectedMemoryType("All");
    setSelectedDdrGen("All");
    setSelectedMemoryCapacity("All");
    setSelectedStorageType("All");
    setSelectedStorageCapacity("All");
    setSelectedPsuRating("All");
    setSelectedPsuWattage("All");
    setSearchQuery("");
    setVisibleCount(INITIAL_BATCH);
  };

  // Reset filters when changing category route
  useEffect(() => {
    handleResetFilters();
  }, [categorySlug]);

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setVisibleCount(INITIAL_BATCH);
  };

  const handleSocketChange = (socket: string) => {
    setSelectedSocket(socket);
    setVisibleCount(INITIAL_BATCH);
  };

  if (!categoryMeta) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Category Not Found</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
          The hardware category you requested does not exist.
        </p>
        <Link
          href="/components"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>View All PC Components</span>
        </Link>
      </div>
    );
  }

  // Filter items for this category and expand any variations into individual tiles
  const rawCategoryItems = MOCK_COMPONENTS.filter(
    (item) => item.category.toLowerCase() === categoryMeta.name.toLowerCase() || item.slot === categoryMeta.slot
  );
  const categoryItems = useMemo(
    () => getExpandedCatalogItems(rawCategoryItems),
    [rawCategoryItems]
  );

  const brands = useMemo(() => {
    let items = categoryItems;
    if (isGpuCategory && selectedGpuManufacturer !== "All") {
      items = items.filter((item) => getGpuChip(item).toUpperCase() === selectedGpuManufacturer.toUpperCase());
    }
    const detected = Array.from(new Set(items.map((item) => item.brand))).filter(Boolean);
    detected.sort((a, b) => a.localeCompare(b));
    return ["All", ...detected];
  }, [categoryItems, isGpuCategory, selectedGpuManufacturer]);

  const availableSockets = useMemo(() => {
    if (isCpuCategory) {
      return CPU_SOCKETS;
    }
    const detected = Array.from(
      new Set(categoryItems.map((item) => item.specs?.socket).filter(Boolean))
    );
    return [
      { value: "All", label: "All Sockets" },
      ...detected.map((s) => ({ value: s as string, label: `Socket ${s}` })),
    ];
  }, [isCpuCategory, categoryItems]);

  function getGpuChip(item: ComponentItem): string {
    if (item.specs?.gpuManufacturer) return item.specs.gpuManufacturer;
    const name = item.name.toLowerCase();
    if (name.includes("geforce") || name.includes("rtx") || name.includes("gtx") || name.includes("nvidia")) {
      return "NVIDIA";
    }
    if (name.includes("radeon") || name.includes("rx ") || name.includes("amd")) {
      return "AMD";
    }
    return "Other";
  }

  function matchesCaseSize(itemFormFactor: string | undefined, selectedSize: string): boolean {
    if (!itemFormFactor) return false;
    const ff = itemFormFactor.toLowerCase().replace(/[^a-z0-9]/g, "");
    const target = selectedSize.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (target === "miniitx" || target === "itx") {
      return ff.includes("miniitx") || ff === "itx" || ff.includes("sff");
    }
    if (target === "matx" || target === "microatx") {
      return ff === "matx" || ff.includes("microatx");
    }
    if (target === "atx") {
      return ff === "atx" || ff.includes("eatx");
    }
    return ff.includes(target);
  }

  const filtered = useMemo(() => {
    const result = categoryItems.filter((item) => {
      // 1. Brand match
      if (selectedBrand !== "All" && item.brand !== selectedBrand) {
        return false;
      }

      // 2. Socket match (for CPU & Motherboards)
      if (selectedSocket !== "All") {
        const itemSocket = item.specs?.socket;
        if (!itemSocket || itemSocket.toUpperCase() !== selectedSocket.toUpperCase()) {
          return false;
        }
      }

      // 3. GPU Manufacturer match (for GPU)
      if (isGpuCategory && selectedGpuManufacturer !== "All") {
        const chip = getGpuChip(item);
        if (chip.toUpperCase() !== selectedGpuManufacturer.toUpperCase()) {
          return false;
        }
      }

      // 4. Cooling Type match (Water Cooling, Air Cooling, Cooling Fans)
      if (isCoolingCategory && selectedCoolingType !== "All") {
        let coolingType = item.specs?.coolingType;
        if (!coolingType) {
          const name = item.name.toLowerCase();
          if (name.includes("liquid") || name.includes("aio") || name.includes("water")) {
            coolingType = "Water Cooling";
          } else if (name.includes("fan") || name.includes("fans")) {
            coolingType = "Cooling Fans";
          } else if (name.includes("air") || name.includes("tower")) {
            coolingType = "Air Cooling";
          }
        }
        if (coolingType?.toLowerCase() !== selectedCoolingType.toLowerCase()) {
          return false;
        }
      }

      // 5. Case Size match (mini ITX, mATX, ATX)
      if (isCaseCategory && selectedCaseSize !== "All") {
        if (!matchesCaseSize(item.specs?.formFactor, selectedCaseSize)) {
          return false;
        }
      }

      // 6. Memory filters (Type, DDR, Capacity)
      if (isMemoryCategory) {
        if (selectedMemoryType !== "All") {
          const memType =
            item.specs?.memoryType ||
            (item.name.toLowerCase().includes("laptop") || item.name.toLowerCase().includes("sodimm")
              ? "Laptop Memory"
              : "Desktop Memory");
          if (memType.toLowerCase() !== selectedMemoryType.toLowerCase()) {
            return false;
          }
        }

        if (selectedDdrGen !== "All") {
          const ramType =
            item.specs?.ramType ||
            (item.name.toUpperCase().includes("DDR4")
              ? "DDR4"
              : item.name.toUpperCase().includes("DDR5")
              ? "DDR5"
              : undefined);
          if (ramType !== selectedDdrGen) {
            return false;
          }
        }

        if (selectedMemoryCapacity !== "All") {
          const cap = item.specs?.capacity || item.selectedAttributes?.Capacity || "";
          const matchesCap =
            cap.toLowerCase().includes(selectedMemoryCapacity.toLowerCase()) ||
            item.name.toLowerCase().includes(selectedMemoryCapacity.toLowerCase());
          if (!matchesCap) {
            return false;
          }
        }
      }

      // 7. Storage filters (Type, Capacity)
      if (isStorageCategory) {
        if (selectedStorageType !== "All") {
          let type = item.specs?.storageType;
          if (!type) {
            const name = item.name.toLowerCase();
            if (name.includes("ssd") || name.includes("nvme") || name.includes("solid state")) {
              type = "SSD";
            } else if (name.includes("hdd") || name.includes("hard drive")) {
              type = "HDD";
            }
          }
          if (type?.toLowerCase() !== selectedStorageType.toLowerCase()) {
            return false;
          }
        }

        if (selectedStorageCapacity !== "All") {
          const cap = item.specs?.capacity || "";
          const matchesCap =
            cap.toLowerCase().includes(selectedStorageCapacity.toLowerCase()) ||
            item.name.toLowerCase().includes(selectedStorageCapacity.toLowerCase());
          if (!matchesCap) {
            return false;
          }
        }
      }

      // 8. Power Supplies filters (80+ Rating, Wattage)
      if (isPsuCategory) {
        if (selectedPsuRating !== "All") {
          let rating = item.specs?.efficiencyRating;
          if (!rating) {
            const name = item.name.toLowerCase();
            if (name.includes("bronze")) rating = "Bronze";
            else if (name.includes("gold")) rating = "Gold";
            else if (name.includes("platinum")) rating = "Platinum";
          }
          if (rating?.toLowerCase() !== selectedPsuRating.toLowerCase()) {
            return false;
          }
        }

        if (selectedPsuWattage !== "All") {
          const targetW = parseInt(selectedPsuWattage, 10);
          const itemW = item.specs?.wattage;
          const matchesW = itemW === targetW || item.name.includes(`${targetW}W`);
          if (!matchesW) {
            return false;
          }
        }
      }

      // 9. Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesBrand = item.brand.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesSpecs = JSON.stringify(item.specs || {}).toLowerCase().includes(q);
        if (!matchesName && !matchesBrand && !matchesSku && !matchesSpecs) {
          return false;
        }
      }

      return true;
    });

    // 10. Sort
    if (sortBy === "price-asc") {
      result.sort((a, b) => {
        const priceA = a.sale_price ?? a.price;
        const priceB = b.sale_price ?? b.price;
        return priceA - priceB;
      });
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => {
        const priceA = a.sale_price ?? a.price;
        const priceB = b.sale_price ?? b.price;
        return priceB - priceA;
      });
    } else if (sortBy === "stock") {
      result.sort((a, b) => b.stockCount - a.stockCount);
    }

    return result;
  }, [
    categoryItems,
    selectedBrand,
    selectedSocket,
    selectedGpuManufacturer,
    selectedCoolingType,
    selectedCaseSize,
    selectedMemoryType,
    selectedDdrGen,
    selectedMemoryCapacity,
    selectedStorageType,
    selectedStorageCapacity,
    selectedPsuRating,
    selectedPsuWattage,
    searchQuery,
    sortBy,
    isGpuCategory,
    isCoolingCategory,
    isCaseCategory,
    isMemoryCategory,
    isStorageCategory,
    isPsuCategory,
  ]);

  const totalFiltered = filtered.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, filtered.length));
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length]);

  const visibleItems = filtered.slice(0, visibleCount);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="pb-6 border-b border-slate-300 dark:border-white/40">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-400 font-medium mb-2">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/components" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
            Components
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-900 dark:text-zinc-100 font-bold">{categoryMeta.name}</span>
        </nav>

        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
            {categoryMeta.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">
            {categoryMeta.description}
          </p>
        </div>
      </div>

      {/* Sub-Filters & Controls (Left: Filter selectors; Right: Search & Sort) */}
      <div className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
        {/* Left Side: Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* GPU Manufacturer Filter (for GPU category) */}
          {isGpuCategory && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>GPU Chip:</span>
              </span>
              <select
                value={selectedGpuManufacturer}
                onChange={(e) => {
                  setSelectedGpuManufacturer(e.target.value);
                  setVisibleCount(INITIAL_BATCH);
                }}
                className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                aria-label="Filter by GPU Manufacturer"
              >
                {GPU_MANUFACTURERS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cooling Type Filter (for Cooling category) */}
          {isCoolingCategory && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Cooling Type:</span>
              </span>
              <select
                value={selectedCoolingType}
                onChange={(e) => {
                  setSelectedCoolingType(e.target.value);
                  setVisibleCount(INITIAL_BATCH);
                }}
                className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                aria-label="Filter by Cooling Type"
              >
                {COOLING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Case Size Filter (for Cases category) */}
          {isCaseCategory && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Size:</span>
              </span>
              <select
                value={selectedCaseSize}
                onChange={(e) => {
                  setSelectedCaseSize(e.target.value);
                  setVisibleCount(INITIAL_BATCH);
                }}
                className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                aria-label="Filter by Case Size"
              >
                {CASE_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Memory Filters (for Memory category) */}
          {isMemoryCategory && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Type:</span>
                </span>
                <select
                  value={selectedMemoryType}
                  onChange={(e) => {
                    setSelectedMemoryType(e.target.value);
                    setVisibleCount(INITIAL_BATCH);
                  }}
                  className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                  aria-label="Filter by Memory Type"
                >
                  {MEMORY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap">DDR:</span>
                <select
                  value={selectedDdrGen}
                  onChange={(e) => {
                    setSelectedDdrGen(e.target.value);
                    setVisibleCount(INITIAL_BATCH);
                  }}
                  className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                  aria-label="Filter by DDR Generation"
                >
                  {DDR_GENERATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap">Capacity:</span>
                <select
                  value={selectedMemoryCapacity}
                  onChange={(e) => {
                    setSelectedMemoryCapacity(e.target.value);
                    setVisibleCount(INITIAL_BATCH);
                  }}
                  className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                  aria-label="Filter by Memory Capacity"
                >
                  {MEMORY_CAPACITIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Storage Filters (for Storage category) */}
          {isStorageCategory && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Type:</span>
                </span>
                <select
                  value={selectedStorageType}
                  onChange={(e) => {
                    setSelectedStorageType(e.target.value);
                    setVisibleCount(INITIAL_BATCH);
                  }}
                  className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                  aria-label="Filter by Storage Type"
                >
                  {STORAGE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap">Capacity:</span>
                <select
                  value={selectedStorageCapacity}
                  onChange={(e) => {
                    setSelectedStorageCapacity(e.target.value);
                    setVisibleCount(INITIAL_BATCH);
                  }}
                  className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                  aria-label="Filter by Storage Capacity"
                >
                  {STORAGE_CAPACITIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Power Supplies Filters (for Power Supplies category) */}
          {isPsuCategory && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>80+ Rating:</span>
                </span>
                <select
                  value={selectedPsuRating}
                  onChange={(e) => {
                    setSelectedPsuRating(e.target.value);
                    setVisibleCount(INITIAL_BATCH);
                  }}
                  className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                  aria-label="Filter by 80+ Rating"
                >
                  {PSU_EFFICIENCY_RATINGS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap">Wattage:</span>
                <select
                  value={selectedPsuWattage}
                  onChange={(e) => {
                    setSelectedPsuWattage(e.target.value);
                    setVisibleCount(INITIAL_BATCH);
                  }}
                  className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                  aria-label="Filter by Wattage"
                >
                  {PSU_WATTAGES.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Brand Filter */}
          <div className="flex items-center gap-2">
            {!isGpuCategory && !isCoolingCategory && !isCaseCategory && !isMemoryCategory && !isStorageCategory && !isPsuCategory && (
              <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Brand:</span>
              </span>
            )}
            {(isGpuCategory || isCoolingCategory || isCaseCategory || isMemoryCategory || isStorageCategory || isPsuCategory) && (
              <span className="font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                Brand:
              </span>
            )}
            <select
              value={selectedBrand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
              aria-label="Filter by Brand"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "All Brands" : b}
                </option>
              ))}
            </select>
          </div>

          {/* Socket Filter (for CPU or Motherboards) */}
          {(isCpuCategory || (availableSockets.length > 1 && categoryMeta.slot === "motherboard")) && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap">Socket:</span>
              <select
                value={selectedSocket}
                onChange={(e) => handleSocketChange(e.target.value)}
                className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
                aria-label="Filter by Socket"
              >
                {availableSockets.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Side: Search & Sort in place of the old Showing x products label */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          {/* Search within category input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(INITIAL_BATCH);
              }}
              placeholder={`Search ${categoryMeta.name.toLowerCase()}...`}
              className="w-44 sm:w-60 pl-8 pr-7 py-2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] transition-colors"
              aria-label={`Search within ${categoryMeta.name}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setVisibleCount(INITIAL_BATCH);
                }}
                className="absolute right-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector matching the style of the filters on the left */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOptionId);
                setVisibleCount(INITIAL_BATCH);
              }}
              className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Product Cards Grid & Empty State */}
      <div className="space-y-6" id="category-results">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 space-y-3">
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              No products found
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
              We could not find any products matching your current filters and search criteria.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="min-h-[44px] px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-5">
            {visibleItems.map((item) => {
              const itemHref =
                item.parentProductId && item.variationId
                  ? `/products/${item.parentProductId}?variation=${item.variationId}`
                  : `/products/${item.id}`;

              return (
                <div
                  key={`${item.id}-${item.variationId || "base"}`}
                  className="flex flex-col justify-between group transition-colors"
                >
                  <div>
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-1.5 flex items-center justify-center block bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                      <Link href={itemHref} className="absolute inset-0 block">
                        <ProductItemTileImage
                          item={item}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </Link>

                      {/* Top Left Badges: Red Discount Percentage & Out of Stock */}
                      <div className="absolute top-2 left-2 z-10 pointer-events-none flex flex-col gap-1 items-start">
                        {item.sale_price && item.sale_price < item.price && (
                          <span className="px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-xs sm:text-sm font-black tracking-tight leading-none bg-red-600 text-white shadow-md">
                            -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                          </span>
                        )}
                        {item.stockCount <= 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-normal tracking-wide bg-slate-900/90 text-slate-100 border border-slate-700/80 shadow-xs uppercase">
                            Out of Stock
                          </span>
                        )}
                      </div>

                      {/* Floating Accent Green + Circle / Add to Cart on Bottom Right of Picture */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addStandardItem(
                            item.sale_price && item.sale_price < item.price
                              ? { ...item, price: item.sale_price, originalPrice: item.price }
                              : item
                          );
                          openCart();
                        }}
                        disabled={item.stockCount <= 0}
                        className="group/cart absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-10 min-h-[44px] min-w-[44px] flex items-center justify-end p-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#37baf2]"
                        title="Add to Cart"
                        aria-label={`Add ${item.name} to Cart`}
                      >
                        <div className="h-9 min-w-9 sm:h-10 sm:min-w-10 px-2 sm:px-2.5 flex items-center justify-center rounded-full bg-[#52E394] hover:brightness-105 active:brightness-95 text-[#0A0B0E] shadow-md hover:shadow-lg transition-all duration-300 ease-out group-hover/cart:px-3 sm:group-hover/cart:px-3.5">
                          <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 transition-transform duration-300 group-hover/cart:rotate-90 text-[#0A0B0E]" />
                          <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap text-xs font-bold transition-all duration-300 ease-out group-hover/cart:max-w-[85px] group-hover/cart:opacity-100 group-hover/cart:ml-1.5 text-[#0A0B0E]">
                            Add to Cart
                          </span>
                        </div>
                      </button>
                    </div>

                    <Link href={itemHref} className="block">
                      <h3 className="text-sm sm:text-base font-normal text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                  </div>

                  <div className="mt-1 flex flex-col gap-1">
                    {/* Price Row */}
                    <div className="flex items-baseline justify-between gap-2">
                      {/* Left Column: Current Price & Discount Badge */}
                      <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
                        <span className="text-sm sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                          {formatRupiah(item.sale_price && item.sale_price < item.price ? item.sale_price : item.price)}
                        </span>
                        {item.sale_price && item.sale_price < item.price && (
                          <span className="text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded border border-rose-200 dark:border-rose-900/60 leading-tight shrink-0">
                            -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Right Column: Original Price (if discounted) */}
                      {item.sale_price && item.sale_price < item.price && (
                        <div className="flex flex-col items-end text-right shrink-0">
                          <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 line-through leading-none">
                            {formatRupiah(item.price)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Infinite Scroll Sentinel / Loading Indicator */}
        {visibleCount < totalFiltered && (
          <div ref={sentinelRef} className="py-8 flex justify-center items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-[#37baf2] animate-pulse" />
              <span>Loading more products...</span>
            </div>
          </div>
        )}

        {visibleCount >= totalFiltered && totalFiltered > 0 && (
          <div className="py-6 text-center text-xs font-medium text-slate-400 dark:text-zinc-500">
            Showing all {totalFiltered} products
          </div>
        )}
      </div>
    </div>
  );
}
