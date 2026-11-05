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
  ChevronDown,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/currency";
import {
  getNextWorkflowStep,
  canDispatchOrder,
  isOrderDispatched,
} from "@/lib/utils/orderWorkflow";
import { getStatusBadge } from "./FluxOverviewTab";

interface FluxOrdersTabProps {
  orders: any[];
  onInspectOrder: (order: any) => void;
  onOpenDispatchModal: (order: any) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onOpenRejectModal: (order: any) => void;
  onSimulateCourierFailure?: (orderId: string) => void;
  initialExpandedOrderId?: string;
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
  onSimulateCourierFailure,
  initialExpandedOrderId,
}: FluxOrdersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "total-desc" | "total-asc">("date-desc");
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>(() => {
    return initialExpandedOrderId ? { [initialExpandedOrderId]: true } : {};
  });

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

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
    <div className="space-y-6 flux-animate-fade flux-animate-slide-up">
      {/* Top Header & Search Filter Bar */}
      <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4 flux-card-hover flux-animate-slide-up flux-delay-1">
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
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all flux-interactive-btn ${
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
      <div className="bg-[#12141A] rounded-2xl border border-white/10 overflow-hidden shadow-xl flux-card-hover flux-animate-slide-up flux-delay-2">
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
                className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white inline-flex items-center gap-2 flux-interactive-btn"
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
                  <th className="py-3.5 px-3 w-10 text-center"></th>
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
                  const isExpanded = !!expandedOrderIds[order.id];
                  const badge = getStatusBadge(order.status);
                  const nextStep = getNextWorkflowStep(order.status);
                  const canDispatch = canDispatchOrder(order.status);
                  const isDispatched = isOrderDispatched(order.status);
                  const totalVal = Number(order.total ?? order.total_amount ?? order.totalPrice) || 0;
                  const address = order.shipping_address || {};
                  const customerName =
                    order.customer_name || address.full_name || order.user?.name || "Customer";
                  const phone = order.customer_phone || address.phone || order.user?.phone || "";
                  const waUrl = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}` : null;
                  const dateStr = new Date(
                    order.created_at || order.createdAt || Date.now()
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const items = order.items || order.order_items || [];
                  const fullAddressString = [
                    address.street,
                    address.unit,
                    address.subdistrict,
                    address.city,
                    address.province,
                    address.postalCode || address.postal_code,
                    address.country || "Indonesia",
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        onClick={() => toggleExpandOrder(order.id)}
                        className={`hover:bg-white/[0.03] transition-colors group flux-table-row cursor-pointer ${
                          isExpanded ? "bg-white/[0.02]" : ""
                        }`}
                      >
                        {/* Expand / Collapse Chevron Button */}
                        <td className="py-4 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandOrder(order.id);
                            }}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 inline-flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
                            title={isExpanded ? "Collapse details" : "Expand details"}
                            aria-label={
                              isExpanded
                                ? `Collapse details for order ${order.id}`
                                : `Expand details for order ${order.id}`
                            }
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-[#37baf2]" : ""
                              }`}
                            />
                          </button>
                        </td>

                        {/* Order ID & Date */}
                        <td className="py-4 px-4 font-medium text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-bold inline-flex items-center gap-1.5 py-1 min-h-[44px]">
                              #{String(order.order_number || order.id).slice(-10)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(String(order.id));
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                              title="Copy ID"
                              aria-label="Copy Order ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {dateStr}
                          </div>
                        </td>

                        {/* Customer Details */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-white">{customerName}</div>
                          <div className="text-[11px] text-slate-400">
                            {order.customer_email || order.user?.email || "No email"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {address.city ? `${address.city}, ` : ""}Indonesia
                          </div>
                        </td>

                        {/* Status */}
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

                        {/* Courier */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white uppercase text-[11px]">
                            {order.courier_provider || "Instant / Standard"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {order.waybill_id || order.tracking_number || "No tracking yet"}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-4 text-right font-black text-white text-sm">
                          {formatRupiah(totalVal)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {nextStep && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canDispatch) {
                                    onOpenDispatchModal(order);
                                  } else {
                                    onUpdateStatus(order.id, nextStep.nextStatus);
                                  }
                                }}
                                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#37baf2]/10 hover:bg-[#37baf2] text-[#37baf2] hover:text-[#0A0B0E] border border-[#37baf2]/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 group/btn shrink-0 flux-interactive-btn"
                                title={canDispatch ? "Find Courier & Dispatch" : `Advance to ${nextStep.nextStatus}`}
                              >
                                <span>{canDispatch ? "Find Courier" : nextStep.nextActionLabel}</span>
                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspectOrder(order);
                              }}
                              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors border border-white/5 flux-interactive-btn"
                              title="Inspect Order Details"
                              aria-label={`Inspect Order ${order.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Only show Find Courier/Dispatch if canDispatch is true */}
                            {canDispatch && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDispatchModal(order);
                                }}
                                className="p-2 rounded-xl text-[#37baf2] bg-[#37baf2]/10 hover:bg-[#37baf2] hover:text-[#0A0B0E] min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors border border-[#37baf2]/30 flux-interactive-btn"
                                title="Find Courier & Dispatch"
                                aria-label={`Find Courier for ${order.id}`}
                              >
                                <Truck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Inline Expanded Detail Pane */}
                      {isExpanded && (
                        <tr className="bg-[#0B0D12] border-b border-white/10">
                          <td colSpan={7} className="p-0">
                            <div className="p-4 sm:p-6 space-y-6 flux-animate-fade flux-animate-slide-up">
                              {/* Top Bar */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wider text-[#37baf2]">
                                    Order Details: #{order.order_number || order.id}
                                  </span>
                                  <span className="text-slate-500">|</span>
                                  <span className="text-xs text-slate-400">
                                    Placed on{" "}
                                    {new Date(
                                      order.created_at || order.createdAt || Date.now()
                                    ).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>

                                <div>
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${badge.classes}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                                    <span>{badge.label}</span>
                                  </span>
                                </div>
                              </div>

                              {/* 3-Card Summary Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Card 1: Customer Profile */}
                                <div className="bg-[#12141A] rounded-xl p-4 border border-white/5 space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    <User className="w-3.5 h-3.5 text-[#37baf2]" />
                                    <span>Customer Profile</span>
                                  </div>
                                  <div className="space-y-1.5 text-xs">
                                    <div className="font-bold text-white text-sm">{customerName}</div>
                                    <div className="flex items-center gap-1.5 text-slate-300">
                                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      <a
                                        href={`mailto:${order.customer_email || order.user?.email || ""}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="hover:text-[#37baf2] truncate transition-colors"
                                      >
                                        {order.customer_email || order.user?.email || "No email"}
                                      </a>
                                    </div>
                                    {phone && (
                                      <div className="flex items-center gap-1.5 text-slate-300">
                                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <a
                                          href={`tel:${phone}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="hover:text-[#37baf2] transition-colors"
                                        >
                                          {phone}
                                        </a>
                                        {waUrl && (
                                          <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="ml-auto text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors inline-flex items-center gap-1"
                                          >
                                            <MessageSquare className="w-2.5 h-2.5" />
                                            <span>WhatsApp</span>
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400">
                                      <div className="flex items-start gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">
                                          {fullAddressString || "No delivery address on record"}
                                        </span>
                                      </div>
                                      {address.deliveryNotes && (
                                        <div className="mt-1.5 text-[10px] text-amber-300/80 bg-amber-500/10 rounded px-2 py-1 border border-amber-500/20">
                                          Note: {address.deliveryNotes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Card 2: Courier & Logistics */}
                                <div className="bg-[#12141A] rounded-xl p-4 border border-white/5 space-y-3">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Courier &amp; Logistics</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      {order.courier_service_code ||
                                        order.courier_info?.service_name ||
                                        "Standard Courier"}
                                    </span>
                                  </div>
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <span className="text-slate-400 text-[11px]">Provider:</span>
                                      <div className="font-bold text-white uppercase mt-0.5">
                                        {order.courier_provider ||
                                          order.courier_info?.provider ||
                                          "Instant / Standard Courier"}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 text-[11px]">
                                        Tracking / Waybill ID:
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="font-semibold text-white">
                                          {order.waybill_id ||
                                            order.tracking_number ||
                                            order.courier_info?.tracking_number ||
                                            "Not assigned"}
                                        </span>
                                        {(order.waybill_id ||
                                          order.tracking_number ||
                                          order.courier_info?.tracking_number) && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              copyToClipboard(
                                                order.waybill_id ||
                                                  order.tracking_number ||
                                                  order.courier_info?.tracking_number
                                              );
                                            }}
                                            className="p-1 rounded text-slate-400 hover:text-white"
                                            title="Copy tracking number"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {canDispatch ? (
                                      <div className="pt-2 border-t border-white/5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenDispatchModal(order);
                                          }}
                                          className="w-full min-h-[44px] px-3 py-1.5 rounded-lg bg-[#37baf2]/10 hover:bg-[#37baf2] text-[#37baf2] hover:text-[#0A0B0E] border border-[#37baf2]/30 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all flux-interactive-btn"
                                        >
                                          <Truck className="w-3.5 h-3.5" />
                                          <span>Find Courier &amp; Dispatch</span>
                                        </button>
                                      </div>
                                    ) : isDispatched ? (
                                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-2.5 py-1.5 font-semibold">
                                          <span className="flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                            <span>Courier Dispatched</span>
                                          </span>
                                          <span className="text-[10px] text-emerald-300">
                                            Waybill Active
                                          </span>
                                        </div>
                                        {onSimulateCourierFailure && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSimulateCourierFailure(order.id);
                                            }}
                                            className="text-[10px] text-slate-400 hover:text-rose-400 underline transition-colors w-full text-right py-0.5"
                                            title="Simulate courier pickup failure or driver rejection"
                                          >
                                            Simulate courier rejection / failure
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="pt-2 border-t border-white/5">
                                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] bg-white/[0.02] rounded-lg px-2.5 py-1.5 border border-white/5">
                                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                          <span>Dispatch available when Ready for Dispatch</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Card 3: Financial Summary & Payment */}
                                <div className="bg-[#12141A] rounded-xl p-4 border border-white/5 space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Payment &amp; Totals</span>
                                  </div>
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between text-slate-300">
                                      <span>Payment Method</span>
                                      <span className="font-semibold text-white">
                                        {order.payment_method || "Midtrans Online"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-300">
                                      <span>Reference</span>
                                      <span className="text-slate-400 text-[11px]">
                                        {order.payment_reference || "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-300">
                                      <span>Subtotal</span>
                                      <span>{formatRupiah(Number(order.subtotal) || totalVal)}</span>
                                    </div>
                                    {order.shipping_fee !== undefined && (
                                      <div className="flex items-center justify-between text-slate-300">
                                        <span>Shipping Fee</span>
                                        <span>{formatRupiah(Number(order.shipping_fee) || 0)}</span>
                                      </div>
                                    )}
                                    {Number(order.assembly_fee) > 0 && (
                                      <div className="flex items-center justify-between text-slate-300">
                                        <span>Assembly Fee</span>
                                        <span>{formatRupiah(Number(order.assembly_fee))}</span>
                                      </div>
                                    )}
                                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-bold text-white">
                                      <span>Total Paid</span>
                                      <span className="text-[#37baf2]">{formatRupiah(totalVal)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Ordered Items Breakdown */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                                  <Package className="w-3.5 h-3.5 text-[#37baf2]" />
                                  <span>Ordered Items ({items.length})</span>
                                </div>

                                {items.length === 0 ? (
                                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-xs text-slate-400 text-center">
                                    No line items recorded for this order.
                                  </div>
                                ) : (
                                  <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                                    {items.map((item: any, idx: number) => {
                                      const itemName =
                                        item.name ||
                                        item.product_name ||
                                        item.product?.name ||
                                        item.products?.name ||
                                        "Hardware Component";
                                      const itemQty = item.quantity || item.qty || 1;
                                      const itemPrice =
                                        Number(item.price) || Number(item.unit_price) || 0;
                                      const itemImg =
                                        item.image ||
                                        (Array.isArray(item.images) && item.images[0]) ||
                                        item.image_url ||
                                        (Array.isArray(item.product?.images) &&
                                          item.product.images[0]) ||
                                        "";
                                      const itemSku =
                                        item.sku || item.product?.sku || item.brand || "";

                                      return (
                                        <div
                                          key={idx}
                                          className="p-3.5 flex items-center justify-between gap-3 text-xs"
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 relative overflow-hidden shrink-0 flex items-center justify-center">
                                              {itemImg ? (
                                                <Image
                                                  src={itemImg}
                                                  alt={itemName}
                                                  fill
                                                  className="object-cover"
                                                  sizes="40px"
                                                />
                                              ) : (
                                                <Package className="w-5 h-5 text-slate-500" />
                                              )}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="font-semibold text-white truncate">
                                                {itemName}
                                              </div>
                                              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                                <span>
                                                  Qty: {itemQty} × {formatRupiah(itemPrice)}
                                                </span>
                                                {itemSku && (
                                                  <>
                                                    <span className="text-slate-600">•</span>
                                                    <span>{itemSku}</span>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="text-right font-bold text-white shrink-0">
                                            {formatRupiah(itemPrice * itemQty)}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Bottom Action Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                  {nextStep && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canDispatch) {
                                          onOpenDispatchModal(order);
                                        } else {
                                          onUpdateStatus(order.id, nextStep.nextStatus);
                                        }
                                      }}
                                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#37baf2]/10 hover:bg-[#37baf2] text-[#37baf2] hover:text-[#0A0B0E] border border-[#37baf2]/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 group/btn flux-interactive-btn"
                                    >
                                      <span>
                                        {canDispatch
                                          ? "Find Courier & Dispatch"
                                          : `Advance Workflow: ${nextStep.nextActionLabel}`}
                                      </span>
                                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                                    </button>
                                  )}
                                  {canDispatch && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenDispatchModal(order);
                                      }}
                                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] border border-[#37baf2]/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 flux-interactive-btn"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                      <span>Find Courier</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onInspectOrder(order);
                                    }}
                                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/5 text-xs font-bold inline-flex items-center gap-1.5 transition-colors flux-interactive-btn"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Inspect in Drawer</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
