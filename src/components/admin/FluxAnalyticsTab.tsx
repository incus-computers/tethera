"use client";

import React from "react";
import Image from "next/image";
import {
  TrendingUp,
  RotateCcw,
  Package,
  DollarSign,
  ShoppingBag,
  Sparkles,
  Calendar,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  SlidersHorizontal,
  BarChart3,
  Download,
} from "lucide-react";
import { Product } from "../../lib/db/types";

interface DailyBreakdownItem {
  dateStr: string;
  label: string;
  revenue: number;
  profit: number;
  orders: number;
  units: number;
}

interface AnalyticsData {
  weeklyGrossProfit: number;
  weeklyMarginPct: number;
  profitGrowthPct: number;
  weeklySales: number;
  weeklyOrdersCount: number;
  weeklyAov: number;
  weeklyUnits: number;
  lifetimeGrossProfit: number;
  lifetimeSales: number;
  lifetimeOrdersCount: number;
  dailyBreakdown: DailyBreakdownItem[];
  enrichedProducts: any[];
}

interface FluxAnalyticsTabProps {
  products: Product[];
  analyticsData: AnalyticsData;
  sortedAndFilteredProducts: any[];
  colWidths: Record<string, number>;
  handleColResizeStart: (colKey: string, e: React.MouseEvent) => void;
  resetColWidths: () => void;
  analyticsSearch: string;
  setAnalyticsSearch: (val: string) => void;
  analyticsCategoryFilter: string;
  setAnalyticsCategoryFilter: (val: string) => void;
  analyticsSortBy: string;
  setAnalyticsSortBy: (val: string) => void;
  analyticsSortOrder: "asc" | "desc";
  setAnalyticsSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  setSelectedItemAnalytics: (item: any) => void;
  formatRupiah: (val: number) => string;
  categories: { slug: string; name: string }[];
}

export function FluxAnalyticsTab({
  products,
  analyticsData,
  sortedAndFilteredProducts,
  colWidths,
  handleColResizeStart,
  resetColWidths,
  analyticsSearch,
  setAnalyticsSearch,
  analyticsCategoryFilter,
  setAnalyticsCategoryFilter,
  analyticsSortBy,
  setAnalyticsSortBy,
  analyticsSortOrder,
  setAnalyticsSortOrder,
  setSelectedItemAnalytics,
  formatRupiah,
  categories,
}: FluxAnalyticsTabProps) {
  // Export CSV handler
  const handleExportCsv = () => {
    const headers = [
      "Product Name",
      "SKU",
      "Category",
      "Retail Price",
      "Cost Price",
      "7D Units",
      "Lifetime Units",
      "7D Revenue",
      "7D Profit",
      "Margin %",
      "Stock on Hand",
    ];

    const rows = sortedAndFilteredProducts.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku,
      p.category_slug,
      p.retail_price,
      p.cost_price,
      p.weeklyUnits || 0,
      p.lifetimeUnits || 0,
      p.weeklyRevenue || 0,
      p.weeklyGrossProfit || 0,
      p.marginPct || 0,
      p.stock_on_hand || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `incus-sales-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 flux-animate-fade flux-animate-slide-up">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5 flux-animate-slide-up flux-delay-1">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#37baf2]/10 border border-[#37baf2]/20 flex items-center justify-center text-[#37baf2]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Sales & Profit Analytics
                <span className="text-[11px] font-semibold text-[#52E394] bg-[#52E394]/10 border border-[#52E394]/20 px-2 py-0.5 rounded-full">
                  Live Telemetry
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Storewide sales velocity, unit economics, gross margins, and resizable data grid.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#12141A] hover:bg-[#1A1D24] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition flex items-center gap-2 flux-interactive-btn"
          >
            <Download className="w-4 h-4 text-[#37baf2]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={resetColWidths}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#12141A] hover:bg-[#1A1D24] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition flex items-center gap-2 flux-interactive-btn"
            title="Reset table column widths to default layout"
          >
            <RotateCcw className="w-4 h-4 text-[#37baf2]" />
            <span>Reset Columns</span>
          </button>

          <div className="min-h-[44px] px-4 py-2 rounded-xl bg-[#12141A] border border-white/10 text-xs text-slate-400 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#37baf2]" />
            <span>
              <strong className="text-white font-medium">{products.length}</strong> items tracked
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Weekly Gross Profit */}
        <div className="bg-[#12141A] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-[#52E394]/30 transition-all flux-card-hover flux-animate-slide-up flux-delay-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Weekly Gross Profit (7D)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#52E394]/10 border border-[#52E394]/20 flex items-center justify-center text-[#52E394]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#52E394] tracking-tight">
            {formatRupiah(analyticsData.weeklyGrossProfit)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-white/5">
            <span className="text-slate-400">
              Margin: <strong className="text-[#52E394] font-semibold">{analyticsData.weeklyMarginPct}%</strong>
            </span>
            {analyticsData.profitGrowthPct !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  analyticsData.profitGrowthPct >= 0 ? "text-[#52E394]" : "text-rose-400"
                }`}
              >
                {analyticsData.profitGrowthPct >= 0 ? "+" : ""}
                {analyticsData.profitGrowthPct}% vs prior 7D
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Sales in a Week (Revenue) */}
        <div className="bg-[#12141A] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-[#37baf2]/30 transition-all flux-card-hover flux-animate-slide-up flux-delay-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sales in a Week (7D)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#37baf2]/10 border border-[#37baf2]/20 flex items-center justify-center text-[#37baf2]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#37baf2] tracking-tight">
            {formatRupiah(analyticsData.weeklySales)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-white/5">
            <span className="text-slate-400">
              Orders: <strong className="text-white font-medium">{analyticsData.weeklyOrdersCount}</strong>
            </span>
            <span className="text-slate-400">
              AOV: <strong className="text-cyan-300">{formatRupiah(analyticsData.weeklyAov)}</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Weekly Units Sold */}
        <div className="bg-[#12141A] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/30 transition-all flux-card-hover flux-animate-slide-up flux-delay-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Weekly Volume Sold
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300 tracking-tight">
            {analyticsData.weeklyUnits.toLocaleString()}{" "}
            <span className="text-sm font-normal text-slate-400">units</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-white/5">
            <span className="text-slate-400">Daily Velocity:</span>
            <span className="text-purple-300 font-medium">
              {(analyticsData.weeklyUnits / 7).toFixed(1)} units / day
            </span>
          </div>
        </div>

        {/* Card 4: Store Lifetime Totals */}
        <div className="bg-[#12141A] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-all flux-card-hover flux-animate-slide-up flux-delay-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Store Lifetime Profit
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-300 tracking-tight">
            {formatRupiah(analyticsData.lifetimeGrossProfit)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-white/5">
            <span className="text-slate-400">
              Revenue: <strong className="text-slate-300">{formatRupiah(analyticsData.lifetimeSales)}</strong>
            </span>
            <span className="text-slate-400">
              <strong className="text-white font-medium">{analyticsData.lifetimeOrdersCount}</strong> orders
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Daily Breakdown Bar & Flow */}
      <div className="bg-[#12141A] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#37baf2]" />
              <span>7-Day Daily Revenue & Gross Profit Breakdown</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Day-by-day sales pacing and profit margins over the trailing 7 days.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#37baf2]" />
              <span>Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#52E394]" />
              <span>Gross Profit</span>
            </div>
          </div>
        </div>

        {(() => {
          const maxDayRev = Math.max(...analyticsData.dailyBreakdown.map((d) => d.revenue), 1);
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {analyticsData.dailyBreakdown.map((day) => {
                const revPct = Math.round((day.revenue / maxDayRev) * 100);
                const profitPct = Math.round((day.profit / maxDayRev) * 100);

                return (
                  <div
                    key={day.dateStr}
                    className="bg-[#0A0B0E]/60 border border-white/5 rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-300">{day.label}</div>
                      <div className="text-[10px] text-slate-500">{day.dateStr}</div>
                    </div>

                    <div className="my-3 space-y-1.5">
                      {/* Revenue Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] text-[#37baf2] mb-0.5">
                          <span>Rev</span>
                          <span>{formatRupiah(day.revenue)}</span>
                        </div>
                        <div className="w-full bg-[#1A1D24] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#37baf2] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(revPct, day.revenue > 0 ? 6 : 0)}%` }}
                          />
                        </div>
                      </div>

                      {/* Profit Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] text-[#52E394] mb-0.5">
                          <span>Profit</span>
                          <span>{formatRupiah(day.profit)}</span>
                        </div>
                        <div className="w-full bg-[#1A1D24] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#52E394] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(profitPct, day.profit > 0 ? 6 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span>{day.orders} order(s)</span>
                      <span>{day.units} unit(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Draggable Table Toolbar & Filter Controls */}
      <div className="bg-[#12141A] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product title, brand, or SKU code..."
              value={analyticsSearch}
              onChange={(e) => setAnalyticsSearch(e.target.value)}
              className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#37baf2] transition"
            />
            {analyticsSearch && (
              <button
                type="button"
                onClick={() => setAnalyticsSearch("")}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <select
              value={analyticsCategoryFilter}
              onChange={(e) => setAnalyticsCategoryFilter(e.target.value)}
              className="min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#37baf2] transition"
            >
              <option value="all">All Categories ({products.length})</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sort Selection */}
            <select
              value={analyticsSortBy}
              onChange={(e) => setAnalyticsSortBy(e.target.value)}
              className="min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#37baf2] transition"
            >
              <option value="weeklyGrossProfit">Sort by 7D Gross Profit</option>
              <option value="weeklyRevenue">Sort by 7D Revenue</option>
              <option value="weeklyUnits">Sort by 7D Units Sold</option>
              <option value="lifetimeGrossProfit">Sort by Lifetime Profit</option>
              <option value="lifetimeRevenue">Sort by Lifetime Revenue</option>
              <option value="lifetimeUnits">Sort by Lifetime Units</option>
              <option value="retail_price">Sort by Retail Price</option>
              <option value="marginPct">Sort by Gross Margin %</option>
              <option value="stock_on_hand">Sort by Stock On Hand</option>
              <option value="name">Sort by Product Name</option>
            </select>

            <button
              type="button"
              onClick={() => setAnalyticsSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#0A0B0E] hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white transition"
              title={`Sort Direction: ${analyticsSortOrder === "asc" ? "Ascending" : "Descending"}`}
            >
              {analyticsSortOrder === "asc" ? (
                <ArrowUp className="w-4 h-4 text-[#37baf2]" />
              ) : (
                <ArrowDown className="w-4 h-4 text-[#37baf2]" />
              )}
            </button>
          </div>
        </div>

        {/* Helper Bar */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#37baf2]" />
            <span>
              Showing <strong className="text-white">{sortedAndFilteredProducts.length}</strong> of{" "}
              <strong className="text-white">{products.length}</strong> items
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#37baf2]" />
            <span>
              <strong className="text-slate-300">Draggable columns active:</strong> Drag the border handle between columns to resize.
            </span>
          </div>
        </div>

        {/* Resizable Table */}
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table
            style={{
              width: `${Object.values(colWidths).reduce((acc, w) => acc + w, 0)}px`,
              minWidth: "100%",
            }}
            className="table-fixed border-collapse divide-y divide-white/5 text-left text-xs"
          >
            <thead className="bg-[#0A0B0E] text-slate-300 font-semibold tracking-wider text-[11px] uppercase sticky top-0 z-10 select-none">
              <tr>
                {/* 1. Product Name */}
                <th
                  style={{ width: `${colWidths.product}px`, minWidth: `${colWidths.product}px` }}
                  className="py-3.5 px-4 relative group"
                >
                  <div
                    onClick={() => {
                      setAnalyticsSortBy("name");
                      setAnalyticsSortOrder((prev) => (analyticsSortBy === "name" && prev === "asc" ? "desc" : "asc"));
                    }}
                    className="flex items-center justify-between cursor-pointer hover:text-white"
                  >
                    <span>Product Elements</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-[#37baf2]" />
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("product", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 2. SKU */}
                <th
                  style={{ width: `${colWidths.sku}px`, minWidth: `${colWidths.sku}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span>SKU</span>
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("sku", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 3. Category */}
                <th
                  style={{ width: `${colWidths.category}px`, minWidth: `${colWidths.category}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span>Category</span>
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("category", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 4. Retail Price */}
                <th
                  style={{ width: `${colWidths.price}px`, minWidth: `${colWidths.price}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div
                    onClick={() => {
                      setAnalyticsSortBy("retail_price");
                      setAnalyticsSortOrder((prev) => (analyticsSortBy === "retail_price" && prev === "desc" ? "asc" : "desc"));
                    }}
                    className="flex items-center justify-between cursor-pointer hover:text-white"
                  >
                    <span>Retail Price</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-[#37baf2]" />
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("price", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 5. Unit Cost (COGS) */}
                <th
                  style={{ width: `${colWidths.cost}px`, minWidth: `${colWidths.cost}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span>Est. Cost (COGS)</span>
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("cost", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 6. Units Sold (7D) */}
                <th
                  style={{ width: `${colWidths.unitsWeek}px`, minWidth: `${colWidths.unitsWeek}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div
                    onClick={() => {
                      setAnalyticsSortBy("weeklyUnits");
                      setAnalyticsSortOrder((prev) => (analyticsSortBy === "weeklyUnits" && prev === "desc" ? "asc" : "desc"));
                    }}
                    className="flex items-center justify-between cursor-pointer hover:text-white"
                  >
                    <span>7D Units</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-[#37baf2]" />
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("unitsWeek", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 7. Lifetime Units */}
                <th
                  style={{ width: `${colWidths.unitsLifetime}px`, minWidth: `${colWidths.unitsLifetime}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div
                    onClick={() => {
                      setAnalyticsSortBy("lifetimeUnits");
                      setAnalyticsSortOrder((prev) => (analyticsSortBy === "lifetimeUnits" && prev === "desc" ? "asc" : "desc"));
                    }}
                    className="flex items-center justify-between cursor-pointer hover:text-white"
                  >
                    <span>Total Units</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-[#37baf2]" />
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("unitsLifetime", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 8. 7D Revenue */}
                <th
                  style={{ width: `${colWidths.revWeek}px`, minWidth: `${colWidths.revWeek}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div
                    onClick={() => {
                      setAnalyticsSortBy("weeklyRevenue");
                      setAnalyticsSortOrder((prev) => (analyticsSortBy === "weeklyRevenue" && prev === "desc" ? "asc" : "desc"));
                    }}
                    className="flex items-center justify-between cursor-pointer hover:text-white"
                  >
                    <span>7D Revenue</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-[#37baf2]" />
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("revWeek", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 9. 7D Gross Profit */}
                <th
                  style={{ width: `${colWidths.profitWeek}px`, minWidth: `${colWidths.profitWeek}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div
                    onClick={() => {
                      setAnalyticsSortBy("weeklyGrossProfit");
                      setAnalyticsSortOrder((prev) => (analyticsSortBy === "weeklyGrossProfit" && prev === "desc" ? "asc" : "desc"));
                    }}
                    className="flex items-center justify-between cursor-pointer hover:text-white"
                  >
                    <span>7D Profit</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-[#37baf2]" />
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("profitWeek", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 10. Margin % */}
                <th
                  style={{ width: `${colWidths.margin}px`, minWidth: `${colWidths.margin}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div
                    onClick={() => {
                      setAnalyticsSortBy("marginPct");
                      setAnalyticsSortOrder((prev) => (analyticsSortBy === "marginPct" && prev === "desc" ? "asc" : "desc"));
                    }}
                    className="flex items-center justify-between cursor-pointer hover:text-white"
                  >
                    <span>Margin %</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-[#37baf2]" />
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("margin", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 11. Stock on Hand */}
                <th
                  style={{ width: `${colWidths.stock}px`, minWidth: `${colWidths.stock}px` }}
                  className="py-3.5 px-3 relative group"
                >
                  <div
                    onClick={() => {
                      setAnalyticsSortBy("stock_on_hand");
                      setAnalyticsSortOrder((prev) => (analyticsSortBy === "stock_on_hand" && prev === "desc" ? "asc" : "desc"));
                    }}
                    className="flex items-center justify-between cursor-pointer hover:text-white"
                  >
                    <span>Stock</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-[#37baf2]" />
                  </div>
                  <div
                    onMouseDown={(e) => handleColResizeStart("stock", e)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-[#37baf2]/20 active:bg-[#37baf2]/40 z-20 group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-white/20 group-hover:bg-[#37baf2] group-active:bg-[#37baf2] transition-colors rounded-full" />
                  </div>
                </th>

                {/* 12. Actions */}
                <th
                  style={{ width: `${colWidths.actions}px`, minWidth: `${colWidths.actions}px` }}
                  className="py-3.5 px-4 text-right"
                >
                  <span>Dashboard</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {sortedAndFilteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <div className="font-medium text-slate-300">No products found</div>
                    <div className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or category filter.</div>
                  </td>
                </tr>
              ) : (
                sortedAndFilteredProducts.map((p) => {
                  const hasImage = p.images && p.images.length > 0;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      onClick={() => setSelectedItemAnalytics(p)}
                    >
                      {/* Product Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#0A0B0E] border border-white/10 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                            {hasImage ? (
                              <Image
                                src={p.images[0]}
                                alt={p.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-[#37baf2] uppercase tracking-wider truncate">
                              {p.brand}
                            </div>
                            <div className="text-xs font-medium text-white truncate max-w-[200px]" title={p.name}>
                              {p.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-3">
                        <span className="text-xs text-[#37baf2] truncate block">
                          {p.sku}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-300 uppercase truncate block">
                          {p.category_slug}
                        </span>
                      </td>

                      {/* Retail Price */}
                      <td className="py-3 px-3 text-xs text-white font-medium">
                        {formatRupiah(p.retail_price)}
                      </td>

                      {/* Cost (COGS) */}
                      <td className="py-3 px-3 text-xs text-slate-400">
                        {formatRupiah(p.cost_price)}
                      </td>

                      {/* 7D Units */}
                      <td className="py-3 px-3 text-xs">
                        <span
                          className={`font-semibold ${
                            p.weeklyUnits > 0 ? "text-cyan-300" : "text-slate-500"
                          }`}
                        >
                          {p.weeklyUnits}
                        </span>
                      </td>

                      {/* Total Units */}
                      <td className="py-3 px-3 text-xs text-slate-300">
                        {p.lifetimeUnits}
                      </td>

                      {/* 7D Revenue */}
                      <td className="py-3 px-3 text-xs text-[#37baf2] font-medium">
                        {formatRupiah(p.weeklyRevenue)}
                      </td>

                      {/* 7D Gross Profit */}
                      <td className="py-3 px-3 text-xs text-[#52E394] font-bold">
                        {formatRupiah(p.weeklyGrossProfit)}
                      </td>

                      {/* Margin % */}
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs font-bold ${
                            p.marginPct >= 20
                              ? "text-[#52E394]"
                              : p.marginPct >= 12
                              ? "text-[#37baf2]"
                              : "text-amber-400"
                          }`}
                        >
                          {p.marginPct}%
                        </span>
                      </td>

                      {/* Stock & Velocity */}
                      <td className="py-3 px-3">
                        <div className="text-xs text-white">
                          {p.stock_on_hand}{" "}
                          <span className="text-[10px] text-slate-400">left</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.daysOfSupply === 999 ? "Ample supply" : `${p.daysOfSupply}d supply`}
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedItemAnalytics(p)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0A0B0E] hover:bg-white/10 text-[#37baf2] border border-white/10 text-xs font-medium inline-flex items-center gap-1.5 transition ml-auto"
                          title="Open full item sales dashboard"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Dashboard</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
