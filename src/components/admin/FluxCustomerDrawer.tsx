"use client";

import React from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  MapPin,
  Clock,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/currency";
import { CustomerProfileRow } from "@/lib/db/types";

interface FluxCustomerDrawerProps {
  customer: CustomerProfileRow | null;
  orders: any[];
  onClose: () => void;
  onInspectOrder: (order: any) => void;
}

export function FluxCustomerDrawer({
  customer,
  orders,
  onClose,
  onInspectOrder,
}: FluxCustomerDrawerProps) {
  if (!customer) return null;

  const customerOrders = orders.filter((o) => {
    const oEmail = (o.customer_email || o.user?.email || "").toLowerCase();
    const cEmail = (customer.email || "").toLowerCase();
    const oId = o.user_id || o.userId;
    const cId = customer.id;
    return (oEmail && oEmail === cEmail) || (oId && oId === cId);
  });

  const totalSpent = Number(customer.total_spent) || customerOrders.reduce((sum, o) => {
    return sum + (Number(o.total_amount) || Number(o.totalPrice) || 0);
  }, 0);

  const orderCount = Number((customer as any).order_count) || customer.total_orders || customerOrders.length;

  const getTierBadge = (spend: number) => {
    if (spend >= 50000000) {
      return {
        label: "VIP Enthusiast",
        classes: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      };
    }
    if (spend >= 20000000) {
      return {
        label: "Core Builder",
        classes: "bg-[#37baf2]/15 text-[#37baf2] border-[#37baf2]/30",
      };
    }
    return {
      label: "Standard Customer",
      classes: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    };
  };

  const tier = getTierBadge(totalSpent);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-xl h-full bg-[#12141A] border-l border-white/10 shadow-2xl flex flex-col z-10 text-slate-100 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0E1015]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#37baf2]/30 to-[#52E394]/20 border border-[#37baf2]/40 flex items-center justify-center font-bold text-sm text-[#37baf2] shrink-0">
              {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : "C"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white truncate">
                  {customer.full_name || "Customer Profile"}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.classes}`}
                >
                  {tier.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{customer.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Close Customer Profile Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Lifetime Value
              </div>
              <div className="text-lg font-black text-[#37baf2] mt-1">
                {formatRupiah(totalSpent)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Orders
              </div>
              <div className="text-lg font-black text-white mt-1">
                {orderCount} Completed
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 text-xs">
            <div className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
              Direct Contact Information
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{customer.email}</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{customer.phone || "No phone number registered"}</span>
              </div>

              {customer.phone && (
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[44px] px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Customer</span>
                  </a>

                  <a
                    href={`mailto:${customer.email}`}
                    className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Purchase History */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Order History ({customerOrders.length})</span>
            </div>

            {customerOrders.length === 0 ? (
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                No orders recorded for this customer yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {customerOrders.map((ord) => {
                  const ordTotal =
                    Number(ord.total_amount) || Number(ord.totalPrice) || 0;
                  return (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white">
                          #{String(ord.id).slice(-8)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(ord.created_at || ord.createdAt || Date.now()).toLocaleDateString()}
                          {" • "}
                          <span className="uppercase text-slate-300 font-semibold">
                            {ord.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">
                          {formatRupiah(ordTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onInspectOrder(ord);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="View Order"
                          aria-label={`View Order ${ord.id}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default FluxCustomerDrawer;
