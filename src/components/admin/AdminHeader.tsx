"use client";

import React from "react";
import {
  Menu,
  RefreshCw,
  Search,
  Bell,
  Plus,
  ShieldCheck,
  ChevronRight,
  Database,
  Calendar,
} from "lucide-react";
import { AdminTab } from "./AdminSidebar";

interface AdminHeaderProps {
  activeTab: AdminTab;
  onRefresh: () => void;
  loadingData: boolean;
  onOpenMobileMenu: () => void;
  onQuickAction?: () => void;
  quickActionLabel?: string;
  user: any;
  isSuperAdmin: boolean;
}

const TAB_TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: {
    title: "Store Overview",
    subtitle: "Real-time revenue, orders velocity, and hardware metrics",
  },
  orders: {
    title: "Order Fulfillment",
    subtitle: "Manage transactions, dispatch couriers, and track delivery status",
  },
  products: {
    title: "Hardware Catalog",
    subtitle: "Inventory controls, pricing tiers, specifications, and variations",
  },
  promotions: {
    title: "Promotions & Layout",
    subtitle: "Dynamic hero banners, homepage modules, and discount campaigns",
  },
  crm: {
    title: "Customer Directory",
    subtitle: "Customer purchasing profiles, lifetime value, and communication logs",
  },
  analytics: {
    title: "Sales Analytics",
    subtitle: "Product margins, revenue breakdowns, and performance reporting",
  },
};

export function AdminHeader({
  activeTab,
  onRefresh,
  loadingData,
  onOpenMobileMenu,
  onQuickAction,
  quickActionLabel,
  user,
  isSuperAdmin,
}: AdminHeaderProps) {
  const currentTabInfo = TAB_TITLES[activeTab] || TAB_TITLES.overview;

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#12141A]/85 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="hover:text-slate-300 transition-colors">Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="text-white font-bold truncate">
              {currentTabInfo.title}
            </span>
          </div>
          <div className="hidden sm:block text-[11px] text-slate-400 truncate">
            {currentTabInfo.subtitle}
          </div>
        </nav>
      </div>

      {/* Right: Actions, Database Status, Refresh & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Database Live Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-slate-300">Live Database</span>
        </div>

        {/* Refresh Data Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loadingData}
          title="Refresh Dashboard Data"
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center gap-2 transition-all min-h-[44px] disabled:opacity-50"
          aria-label="Refresh Data"
        >
          <RefreshCw
            className={`w-4 h-4 text-[#37baf2] ${loadingData ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Optional Quick Action Button */}
        {onQuickAction && quickActionLabel && (
          <button
            type="button"
            onClick={onQuickAction}
            className="min-h-[44px] px-3 sm:px-4 py-1.5 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#37baf2]/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="whitespace-nowrap">{quickActionLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}
export default AdminHeader;
