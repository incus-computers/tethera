"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  X,
  Truck,
  Eye,
  Copy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  ArrowUpDown,
  ArrowRight,
  ShoppingBag,
  Package,
  RotateCcw,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/currency";
import { getNextWorkflowStep } from "@/lib/utils/orderWorkflow";
import { getStatusBadge } from "./FluxOverviewTab";

interface FluxOrdersTabProps {
  orders: any[];
  onInspectOrder: (order: any) => void;
  onOpenDispatchModal: (order: any) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onOpenRejectModal: (order: any) => void;
}

const isMatchStatus = (orderStatus: string, filter: string) => {
  const s = (orderStatus || "").toLowerCase().trim();
  if (filter === "all") return true;
  if (filter === "pending") {
    return ["pending", "pending_payment", "order_received"].includes(s);
  }
  if (filter === "processing") {
    return [
      "processing",
      "order_accepted",
      "finding_stock",
      "ready_for_dispatch",
      "finding_courier",
      "payment_received",
      "assembly_in_progress",
      "testing_bench",
      "ready_for_pickup",
    ].includes(s);
  }
  if (filter === "shipped") {
    return ["shipped", "dispatched", "on_delivery"].includes(s);
  }
  if (filter === "delivered") {
    return ["delivered", "finished", "delivery_arrived", "collected"].includes(s);
  }
  if (filter === "cancelled") {
    return ["cancelled", "refunded"].includes(s);
  }
  return s === filter;
};

export function FluxOrdersTab({
  orders,
  onInspectOrder,
  onOpenDispatchModal,
  onUpdateStatus,
  onOpenRejectModal,
}: FluxOrdersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "total-desc" | "total-asc">("date-desc");

  // Status Filter Counts
  const statusCounts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => isMatchStatus(o.status, "pending")).length,
      processing: orders.filter((o) => isMatchStatus(o.status, "processing")).length,
      shipped: orders.filter((o) => isMatchStatus(o.status, "shipped")).length,
      delivered: orders.filter((o) => isMatchStatus(o.status, "delivered")).length,
      cancelled: orders.filter((o) => isMatchStatus(o.status, "cancelled")).length,
    };
  }, [orders]);

  // Filtered and Sorted Orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Status filter
        if (statusFilter !== "all" && !isMatchStatus(o.status, statusFilter)) {
          return false;
        }

        // Search term filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const id = String(o.id || "").toLowerCase();
          const num = String(o.order_number || "").toLowerCase();
          const name = (o.customer_name || o.shipping_address?.full_name || o.user?.name || "").toLowerCase();
          const email = (o.customer_email || o.user?.email || "").toLowerCase();
          const waybill = String(o.waybill_id || o.tracking_number || "").toLowerCase();
          const courier = String(o.courier_provider || "").toLowerCase();

          if (
            !id.includes(q) &&
            !num.includes(q) &&
            !name.includes(q) &&
            !email.includes(q) &&
            !waybill.includes(q) &&
            !courier.includes(q)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
        const totalA = Number(a.total ?? a.total_amount ?? a.totalPrice) || 0;
        const totalB = Number(b.total ?? b.total_amount ?? b.totalPrice) || 0;

        if (sortBy === "date-desc") return timeB - timeA;
        if (sortBy === "date-asc") return timeA - timeB;
        if (sortBy === "total-desc") return totalB - totalA;
        if (sortBy === "total-asc") return totalA - totalB;
        return 0;
      });
  }, [orders, statusFilter, searchTerm, sortBy]);

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Search Filter Bar */}
      <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
          {[
            { id: "all", label: "All Orders", count: statusCounts.all },
            { id: "pending", label: "Pending", count: statusCounts.pending },
            { id: "processing", label: "Processing", count: statusCounts.processing },
            { id: "shipped", label: "In Transit", count: statusCounts.shipped },
            { id: "delivered", label: "Delivered", count: statusCounts.delivered },
            { id: "cancelled", label: "Cancelled", count: statusCounts.cancelled },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all ${
                statusFilter === tab.id
                  ? "bg-[#37baf2] text-[#0A0B0E] font-bold shadow-md shadow-[#37baf2]/20"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === tab.id
                    ? "bg-[#0A0B0E]/20 text-[#0A0B0E]"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Order ID, customer, email, waybill..."
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

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2] cursor-pointer"
            >
              <option value="date-desc" className="bg-[#12141A] text-white">
                Newest Orders First
              </option>
              <option value="date-asc" className="bg-[#12141A] text-white">
                Oldest Orders First
              </option>
              <option value="total-desc" className="bg-[#12141A] text-white">
                Highest Total Amount
              </option>
              <option value="total-asc" className="bg-[#12141A] text-white">
                Lowest Total Amount
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="bg-[#12141A] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingBag className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              No orders found matching the filter criteria.
            </p>
            {(statusFilter !== "all" || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Order ID &amp; Date</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Courier</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const nextStep = getNextWorkflowStep(order.status);
                  const totalVal = Number(order.total ?? order.total_amount ?? order.totalPrice) || 0;
                  const address = order.shipping_address || {};
                  const customerName =
                    order.customer_name || address.full_name || order.user?.name || "Customer";
                  const dateStr = new Date(
                    order.created_at || order.createdAt || Date.now()
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-4 px-4 font-medium text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold">
                            #{String(order.id).slice(-8)}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(String(order.id))}
                            className="p-1 rounded text-slate-500 hover:text-white"
                            title="Copy ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {dateStr}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-white">{customerName}</div>
                        <div className="text-[11px] text-slate-400">
                          {order.customer_email || order.user?.email || "No email"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {address.city ? `${address.city}, ` : ""}Indonesia
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.classes}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}
                          />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-white uppercase text-[11px]">
                          {order.courier_provider || "Instant / Standard"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {order.waybill_id || order.tracking_number || "No tracking yet"}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right font-black text-white text-sm">
                        {formatRupiah(totalVal)}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {nextStep && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(order.id, nextStep.nextStatus)}
                              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#37baf2]/10 hover:bg-[#37baf2] text-[#37baf2] hover:text-[#0A0B0E] border border-[#37baf2]/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 group/btn shrink-0"
                              title={`Advance to ${nextStep.nextStatus}`}
                            >
                              <span>{nextStep.nextActionLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onInspectOrder(order)}
                            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors border border-white/5"
                            title="Inspect Order Details"
                            aria-label={`Inspect Order ${order.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenDispatchModal(order)}
                            className="p-2 rounded-xl text-slate-300 hover:text-[#37baf2] hover:bg-[#37baf2]/10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors border border-white/5"
                            title="Dispatch Courier"
                            aria-label={`Dispatch Courier for ${order.id}`}
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
export default FluxOrdersTab;
