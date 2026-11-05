"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  X,
  Phone,
  Mail,
  ShoppingBag,
  DollarSign,
  MessageSquare,
  Eye,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { CustomerProfileRow } from "@/lib/db/types";
import { formatRupiah } from "@/lib/utils/currency";

interface FluxCrmTabProps {
  customers: CustomerProfileRow[];
  orders: any[];
  onInspectCustomer: (customer: CustomerProfileRow) => void;
}

export function FluxCrmTab({
  customers,
  orders,
  onInspectCustomer,
}: FluxCrmTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "vip" | "core" | "standard">("all");

  // Calculate customer statistics
  const customerStats = useMemo(() => {
    return customers.map((c) => {
      const cOrders = orders.filter((o) => {
        const oEmail = (o.customer_email || o.user?.email || "").toLowerCase();
        const cEmail = (c.email || "").toLowerCase();
        const oId = o.user_id || o.userId;
        const cId = c.id;
        return (oEmail && oEmail === cEmail) || (oId && oId === cId);
      });

      const totalSpent = Number(c.total_spent) || cOrders.reduce((sum, o) => {
        return sum + (Number(o.total_amount) || Number(o.totalPrice) || 0);
      }, 0);

      const orderCount = Number((c as any).order_count) || c.total_orders || cOrders.length;

      let tier: "vip" | "core" | "standard" = "standard";
      if (totalSpent >= 50000000) tier = "vip";
      else if (totalSpent >= 20000000) tier = "core";

      return {
        ...c,
        calculatedSpent: totalSpent,
        calculatedOrderCount: orderCount,
        tier,
      };
    });
  }, [customers, orders]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customerStats.filter((c) => {
      if (tierFilter !== "all" && c.tier !== tierFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const name = (c.full_name || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [customerStats, tierFilter, searchTerm]);

  return (
    <div className="space-y-6 flux-animate-fade flux-animate-slide-up">
      {/* Top Filter Bar */}
      <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4 flux-card-hover flux-animate-slide-up flux-delay-1">
        {/* Tier Segmentation Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
          {[
            { id: "all", label: "All Customers", count: customerStats.length },
            { id: "vip", label: "VIP Enthusiasts (> 50M)", count: customerStats.filter((c) => c.tier === "vip").length },
            { id: "core", label: "Core Builders (> 20M)", count: customerStats.filter((c) => c.tier === "core").length },
            { id: "standard", label: "Standard Customers", count: customerStats.filter((c) => c.tier === "standard").length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTierFilter(tab.id as any)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all flux-interactive-btn ${
                tierFilter === tab.id
                  ? "bg-[#37baf2] text-[#0A0B0E] font-bold shadow-md shadow-[#37baf2]/20"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  tierFilter === tab.id
                    ? "bg-[#0A0B0E]/20 text-[#0A0B0E]"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, email, WhatsApp phone..."
            className="w-full min-h-[44px] pl-10 pr-9 py-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#37baf2] focus:border-[#37baf2] transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-[#12141A] rounded-2xl border border-white/10 p-12 text-center space-y-3 shadow-xl">
          <Users className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">
            No customers found matching the criteria.
          </p>
          {(tierFilter !== "all" || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setTierFilter("all");
                setSearchTerm("");
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white inline-flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const isVip = cust.tier === "vip";
            const isCore = cust.tier === "core";

            return (
              <div
                key={cust.id}
                className="bg-[#12141A] rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col justify-between group hover:border-[#37baf2]/30 transition-colors space-y-4 flux-card-hover flux-animate-slide-up"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#37baf2]/30 to-[#52E394]/20 border border-[#37baf2]/40 flex items-center justify-center font-bold text-sm text-[#37baf2] shrink-0">
                        {cust.full_name ? cust.full_name.charAt(0).toUpperCase() : "C"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">
                          {cust.full_name || "Customer"}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">{cust.email}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                        isVip
                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          : isCore
                          ? "bg-[#37baf2]/15 text-[#37baf2] border-[#37baf2]/30"
                          : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                      }`}
                    >
                      {isVip ? "VIP" : isCore ? "Core" : "Standard"}
                    </span>
                  </div>

                  {/* Spend Stats */}
                  <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                        Lifetime Spend
                      </div>
                      <div className="font-bold text-white text-sm mt-0.5">
                        {formatRupiah(cust.calculatedSpent)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                        Orders
                      </div>
                      <div className="font-bold text-white text-sm mt-0.5">
                        {cust.calculatedOrderCount} Completed
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-400 truncate">
                    {cust.phone || "No WhatsApp"}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {cust.phone && (
                      <a
                        href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors flux-interactive-btn"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onInspectCustomer(cust)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors border border-white/5 flux-interactive-btn"
                      title="Inspect Profile"
                      aria-label={`Inspect ${cust.full_name}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default FluxCrmTab;
