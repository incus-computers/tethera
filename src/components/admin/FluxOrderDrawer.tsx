"use client";

import React from "react";
import Image from "next/image";
import {
  X,
  Package,
  Truck,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send,
  ArrowRight,
  Check,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/currency";
import {
  WORKFLOW_STAGES,
  getWorkflowStageIndex,
  getNextWorkflowStep,
} from "@/lib/utils/orderWorkflow";
import { getStatusBadge } from "./FluxOverviewTab";

interface FluxOrderDrawerProps {
  order: any | null;
  onClose: () => void;
  onOpenDispatchModal: (order: any) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onSimulateWebhook?: (orderId: string, status: string) => void;
}

export function FluxOrderDrawer({
  order,
  onClose,
  onOpenDispatchModal,
  onUpdateStatus,
}: FluxOrderDrawerProps) {
  if (!order) return null;

  const totalAmount = Number(order.total ?? order.total_amount ?? order.totalPrice) || 0;
  const items = order.items || order.order_items || [];
  const status = (order.status || "pending").toLowerCase();
  const address = order.shipping_address || {};
  const customerName =
    order.customer_name || address.full_name || order.user?.name || "Customer";
  const badgeInfo = getStatusBadge(order.status);
  const currentStageIndex = getWorkflowStageIndex(order.status);
  const nextStep = getNextWorkflowStep(order.status);

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

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
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                #{String(order.id).slice(-10)}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${badgeInfo.classes}`}
              >
                {badgeInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Placed on{" "}
              {new Date(order.created_at || order.createdAt || Date.now()).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Close Order Details Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {/* Fulfillment Workflow Stepper */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#37baf2]" />
                <span>Fulfillment Stage</span>
              </span>
              {nextStep && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, nextStep.nextStatus)}
                  className="text-xs font-bold text-[#37baf2] hover:text-white inline-flex items-center gap-1 transition-colors min-h-[44px] px-2.5 rounded-lg hover:bg-white/5"
                >
                  <span>Advance: {nextStep.nextActionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Stepper Track */}
            <div className="pt-1">
              <div className="grid grid-cols-7 gap-1">
                {WORKFLOW_STAGES.map((stage, idx) => {
                  const isCompleted = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => onUpdateStatus(order.id, stage.key)}
                      className="flex flex-col items-center group/step focus:outline-none min-h-[44px] py-1 rounded-lg hover:bg-white/[0.03] transition-colors"
                      title={`Change stage to ${stage.label}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border ${
                          isCurrent
                            ? "bg-[#37baf2] text-[#0A0B0E] border-[#37baf2] shadow-md shadow-[#37baf2]/30 scale-105"
                            : isCompleted
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "bg-white/5 text-slate-400 border-white/10 group-hover/step:border-white/30"
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[9px] font-semibold mt-1.5 text-center leading-tight line-clamp-2 px-0.5 ${
                          isCurrent
                            ? "text-[#37baf2] font-bold"
                            : isCompleted
                            ? "text-slate-300"
                            : "text-slate-400"
                        }`}
                      >
                        {stage.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Customer & Delivery Destination Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#37baf2]" />
                <span>Customer Profile</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {order.customer_email || order.user?.email || "No email"}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-white text-sm">{customerName}</div>
              <div className="text-slate-300 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{order.customer_phone || address.phone || "No phone provided"}</span>
              </div>
              <div className="text-slate-300 flex items-start gap-2 pt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {address.address_line1 || address.street || "Jakarta, Indonesia"}
                  {address.city ? `, ${address.city}` : ""}
                  {address.postal_code ? ` ${address.postal_code}` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Courier & Tracking Details */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Logistics &amp; Courier</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {order.courier_service_code || "Standard Courier"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <div className="text-slate-400 text-[11px]">Provider</div>
                <div className="font-bold text-white uppercase mt-0.5">
                  {order.courier_provider || "Instant / JNE / Sicepat"}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[11px]">Tracking Number</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-white font-semibold">
                    {order.waybill_id || order.tracking_number || "Not assigned"}
                  </span>
                  {(order.waybill_id || order.tracking_number) && (
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(order.waybill_id || order.tracking_number)
                      }
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Copy Waybill"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items List */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ordered Hardware Items ({items.length})
            </div>

            <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
              {items.map((item: any, idx: number) => {
                const itemName =
                  item.name ||
                  item.product_name ||
                  item.product?.name ||
                  item.products?.name ||
                  "Hardware Component";
                const itemQty = item.quantity || item.qty || 1;
                const itemPrice = Number(item.price) || Number(item.unit_price) || 0;

                const itemImg =
                  item.image ||
                  (Array.isArray(item.images) && item.images[0]) ||
                  item.image_url ||
                  (Array.isArray(item.product?.images) && item.product.images[0]) ||
                  "";

                return (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
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
                        <div className="font-semibold text-white truncate">{itemName}</div>
                        <div className="text-[11px] text-slate-400">
                          Qty: {itemQty} × {formatRupiah(itemPrice)}
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
          </div>

          {/* Financial Summary */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Subtotal</span>
              <span>{formatRupiah(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Shipping Fee</span>
              <span>Rp 0 (Calculated)</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-bold text-white">
              <span>Total Paid</span>
              <span className="text-[#37baf2]">{formatRupiah(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#0E1015] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <select
              value={status}
              onChange={(e) => onUpdateStatus(order.id, e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2] min-h-[44px] cursor-pointer"
            >
              <option value="order_received" className="bg-[#12141A] text-white">
                Order Received
              </option>
              <option value="order_accepted" className="bg-[#12141A] text-white">
                Order Accepted
              </option>
              <option value="finding_stock" className="bg-[#12141A] text-white">
                Finding Stock
              </option>
              <option value="ready_for_dispatch" className="bg-[#12141A] text-white">
                Ready for Dispatch
              </option>
              <option value="finding_courier" className="bg-[#12141A] text-white">
                Finding Courier
              </option>
              <option value="dispatched" className="bg-[#12141A] text-white">
                Dispatched
              </option>
              <option value="finished" className="bg-[#12141A] text-white">
                Finished
              </option>
              <option value="ready_for_pickup" className="bg-[#12141A] text-white">
                Ready for Pickup
              </option>
              <option value="cancelled" className="bg-[#12141A] text-white">
                Cancelled / Rejected
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {nextStep && (
              <button
                type="button"
                onClick={() => onUpdateStatus(order.id, nextStep.nextStatus)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#37baf2]/20 transition-all active:scale-95"
              >
                <span>{nextStep.nextActionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenDispatchModal(order);
                onClose();
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold inline-flex items-center gap-2 border border-white/10 transition-all active:scale-95"
            >
              <Truck className="w-4 h-4 text-[#37baf2]" />
              <span>Dispatch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default FluxOrderDrawer;
