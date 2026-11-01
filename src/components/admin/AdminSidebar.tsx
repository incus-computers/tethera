"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Sparkles,
  Users,
  TrendingUp,
  Store,
  Cpu,
  LogOut,
  ChevronRight,
  ShieldCheck,
  X,
  ExternalLink,
} from "lucide-react";

export type AdminTab = "overview" | "orders" | "products" | "promotions" | "crm" | "analytics";

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  pendingOrdersCount: number;
  lowStockCount: number;
  user: any;
  isSuperAdmin: boolean;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  superAdminOnly?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function AdminSidebar({
  activeTab,
  setActiveTab,
  pendingOrdersCount,
  lowStockCount,
  user,
  isSuperAdmin,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
}: AdminSidebarProps) {
  const navItems: NavGroup[] = [
    {
      group: "Main",
      items: [
        {
          id: "overview" as AdminTab,
          label: "Overview",
          icon: LayoutDashboard,
          badge: "Live",
          badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        },
      ],
    },
    {
      group: "Store Management",
      items: [
        {
          id: "orders" as AdminTab,
          label: "Orders",
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? String(pendingOrdersCount) : undefined,
          badgeColor: "bg-[#37baf2]/20 text-[#37baf2] border-[#37baf2]/40",
        },
        {
          id: "products" as AdminTab,
          label: "Products & Stock",
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
          badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        },
        {
          id: "promotions" as AdminTab,
          label: "Promotions & Layout",
          icon: Sparkles,
          superAdminOnly: true,
        },
      ],
    },
    {
      group: "Customer & Growth",
      items: [
        {
          id: "crm" as AdminTab,
          label: "Customer Directory",
          icon: Users,
        },
        {
          id: "analytics" as AdminTab,
          label: "Sales Analytics",
          icon: TrendingUp,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#12141A] text-slate-100 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#37baf2] to-[#126891] p-0.5 flex items-center justify-center shadow-lg shadow-[#37baf2]/20">
            <div className="w-full h-full bg-[#0A0B0E] rounded-[10px] flex items-center justify-center">
              <span className="text-[#37baf2] font-black text-base tracking-tighter">IC</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white group-hover:text-[#37baf2] transition-colors">
                Incus
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-[#37baf2]/20 text-[#37baf2] border border-[#37baf2]/30">
                Flux
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Control Center</p>
          </div>
        </Link>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close sidebar menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        {navItems.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.superAdminOnly || isSuperAdmin
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1.5">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {group.group}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileOpen(false);
                      }}
                      className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 group text-left ${
                        isActive
                          ? "bg-[#37baf2] text-[#0A0B0E] shadow-md shadow-[#37baf2]/25 font-bold"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                            isActive ? "text-[#0A0B0E]" : "text-slate-400 group-hover:text-[#37baf2]"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isActive
                              ? "bg-[#0A0B0E]/20 text-[#0A0B0E] border-transparent"
                              : item.badgeColor || "bg-white/10 text-slate-300 border-white/10"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Shortcuts Section */}
        <div className="space-y-1.5 pt-2 border-t border-white/5">
          <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Storefront Shortcuts
          </div>
          <div className="space-y-1">
            <Link
              href="/"
              target="_blank"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Store className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                <span>Customer Storefront</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/builder"
              target="_blank"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-slate-400 group-hover:text-[#37baf2] transition-colors" />
                <span>Custom PC Builder</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer User Profile & Logout */}
      <div className="p-3 border-t border-white/10 bg-[#0E1015]">
        <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#37baf2]/30 to-[#52E394]/20 border border-[#37baf2]/40 flex items-center justify-center font-bold text-xs text-[#37baf2] shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate leading-tight">
                {user?.name || "Administrator"}
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                {isSuperAdmin && <ShieldCheck className="w-3 h-3 text-[#37baf2] shrink-0" />}
                <span>{isSuperAdmin ? "Super Admin" : "Staff"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Log Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 h-screen sticky top-0 border-r border-white/10 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl border-r border-white/10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
export default AdminSidebar;
