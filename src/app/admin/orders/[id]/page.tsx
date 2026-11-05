"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  RotateCcw,
  Printer,
  ShieldCheck,
  Send,
  ArrowRight,
  Check,
  CreditCard,
  MessageSquare,
  Lock,
  ChevronRight,
  Save,
  AlertTriangle,
} from "lucide-react";
import { useAdminStore } from "@/lib/store/useAdminStore";
import { formatRupiah } from "@/lib/utils/currency";
import {
  WORKFLOW_STAGES,
  getWorkflowStageIndex,
  getNextWorkflowStep,
} from "@/lib/utils/orderWorkflow";
import { getStatusBadge } from "@/components/admin/FluxOverviewTab";

export default function ExclusiveOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = String(params?.id || "");

  const {
    user,
    token,
    isAuthenticated,
    login,
    initSession,
  } = useAdminStore();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Editable fields
  const [internalNotes, setInternalNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [waybillInput, setWaybillInput] = useState("");
  const [courierProviderInput, setCourierProviderInput] = useState("jne");
  const [isSavingLogistics, setIsSavingLogistics] = useState(false);

  // Cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Out of stock in warehouse");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Login form if unauthenticated
  const [loginId, setLoginId] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`Copied ${fieldName} to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Fetch Order Details
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin/orders/${orderId}`, { headers });
      const data = await res.json();

      if (res.ok && data.success && data.order) {
        setOrder(data.order);
        setInternalNotes(data.order.notes || "");
        setWaybillInput(data.order.waybill_id || data.order.tracking_number || "");
        if (data.order.courier_provider) {
          setCourierProviderInput(data.order.courier_provider);
        }
      } else {
        // Try fallback to list endpoint with query parameter
        const fallbackRes = await fetch(`/api/admin/orders?id=${orderId}`, { headers });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok && fallbackData.success && fallbackData.order) {
          setOrder(fallbackData.order);
          setInternalNotes(fallbackData.order.notes || "");
          setWaybillInput(
            fallbackData.order.waybill_id || fallbackData.order.tracking_number || ""
          );
          if (fallbackData.order.courier_provider) {
            setCourierProviderInput(fallbackData.order.courier_provider);
          }
        } else {
          setError(data.error || fallbackData.error || "Order not found");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load order data");
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Handle stage transition
  const handleUpdateStatus = async (nextStatus: string) => {
    if (!orderId) return;
    setIsUpdatingStatus(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ nextStatus }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOrder((prev: any) => ({ ...prev, status: nextStatus }));
        showToast(data.message || `Order transitioned to ${nextStatus}`);
      } else {
        alert(data.error || "Failed to update order status");
      }
    } catch (err: any) {
      alert(err.message || "Error updating status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Save Internal Notes
  const handleSaveNotes = async () => {
    if (!orderId) return;
    setIsSavingNotes(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ notes: internalNotes }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast("Internal notes updated successfully.");
      } else {
        alert(data.error || "Failed to save notes");
      }
    } catch (err: any) {
      alert(err.message || "Error saving notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Handle Save Logistics & Waybill
  const handleSaveLogistics = async () => {
    if (!orderId) return;
    setIsSavingLogistics(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          courier_provider: courierProviderInput,
          waybill_id: waybillInput.trim(),
          tracking_number: waybillInput.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOrder((prev: any) => ({
          ...prev,
          courier_provider: courierProviderInput,
          waybill_id: waybillInput.trim(),
          tracking_number: waybillInput.trim(),
        }));
        showToast("Logistics tracking details updated.");
      } else {
        alert(data.error || "Failed to update tracking info");
      }
    } catch (err: any) {
      alert(err.message || "Error updating tracking");
    } finally {
      setIsSavingLogistics(false);
    }
  };

  // Handle Confirm Order Cancellation / Rejection
  const handleConfirmCancel = async () => {
    if (!orderId) return;
    setIsCancelling(true);
    try {
      const finalReason =
        cancelReason === "Other" && customCancelReason.trim()
          ? customCancelReason.trim()
          : cancelReason;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          nextStatus: "cancelled",
          notes: `Cancellation reason: ${finalReason}`,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOrder((prev: any) => ({
          ...prev,
          status: "cancelled",
          notes: `Cancellation reason: ${finalReason}`,
        }));
        setShowCancelModal(false);
        showToast("Order cancelled and inventory released.");
      } else {
        alert(data.error || "Failed to cancel order");
      }
    } catch (err: any) {
      alert(err.message || "Error cancelling order");
    } finally {
      setIsCancelling(false);
    }
  };

  // Quick Dispatch Simulation
  const handleGenerateWaybill = () => {
    const randomWaybill = `TTH-${courierProviderInput.toUpperCase()}-${Math.floor(
      100000000 + Math.random() * 900000000
    )}`;
    setWaybillInput(randomWaybill);
    showToast("Generated simulated waybill number. Click Save to persist.");
  };

  // Handle Login if unauthenticated
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const res = await login(loginId, loginPass);
    setLoginLoading(false);
    if (res.success) {
      fetchOrder();
    } else {
      setLoginError(res.error || "Authentication failed");
    }
  };

  // Derived properties
  const statusBadge = order ? getStatusBadge(order.status) : null;
  const currentStageIndex = order ? getWorkflowStageIndex(order.status) : 0;
  const nextStep = order ? getNextWorkflowStep(order.status) : null;
  const totalVal = order
    ? Number(order.total ?? order.total_amount ?? order.totalPrice) || 0
    : 0;
  const items = order ? order.items || order.order_items || [] : [];
  const address = order ? order.shipping_address || {} : {};
  const customerName = order
    ? order.customer_name || address.full_name || order.user?.name || "Customer"
    : "Customer";
  const customerPhone = order
    ? order.customer_phone || address.phone || order.user?.phone || ""
    : "";
  const waUrl = customerPhone
    ? `https://wa.me/${customerPhone.replace(/[^0-9]/g, "")}`
    : null;
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

  // Unauthenticated view
  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#37baf2]/10 border border-[#37baf2]/20 flex items-center justify-center mx-auto text-[#37baf2]">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black text-white">Administrator Clearance Required</h1>
            <p className="text-xs text-slate-400">
              Please sign in with administrator credentials to manage Order #{orderId}.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Username or Email
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="admin"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#37baf2]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Passcode
              </label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#37baf2]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full min-h-[44px] rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] font-bold text-xs shadow-md shadow-[#37baf2]/20 transition-all flex items-center justify-center gap-2 flux-interactive-btn"
            >
              {loginLoading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-white/5">
            <Link
              href="/admin"
              className="text-xs text-slate-400 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
            >
              Return to Admin Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#37baf2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-300">
            Loading exclusive order management workspace for #{orderId}...
          </p>
        </div>
      </div>
    );
  }

  // Error / Not found state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Order Not Found</h1>
            <p className="text-xs text-slate-400 mt-1">
              Could not retrieve order details for ID: <span className="text-white font-bold">{orderId}</span>
            </p>
            {error && (
              <p className="text-[11px] text-rose-400 mt-2 bg-rose-500/10 rounded p-2">
                {error}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/admin?tab=orders"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white inline-flex items-center gap-2 flux-interactive-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Orders Tab</span>
            </Link>
            <button
              type="button"
              onClick={fetchOrder}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] font-bold text-xs inline-flex items-center gap-2 flux-interactive-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-100 antialiased pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161B22] border border-[#37baf2]/40 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 flux-animate-fade flux-animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-[#37baf2]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link
              href="/admin?tab=orders"
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 hover:text-white inline-flex items-center gap-2 font-semibold transition-all flux-interactive-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Orders</span>
            </Link>
            <span>/</span>
            <span className="text-slate-300">Order Management</span>
            <span>/</span>
            <span className="text-white font-bold">#{order.order_number || order.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white inline-flex items-center gap-1.5 transition-colors flux-interactive-btn"
              title="Print Order Receipt"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={fetchOrder}
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white inline-flex items-center gap-1.5 transition-colors flux-interactive-btn"
              title="Refresh order state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Refresh</span>
            </button>
            {order.status !== "cancelled" && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors flux-interactive-btn"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Order Hero Card */}
        <div className="bg-gradient-to-r from-[#12141A] to-[#161B22] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4 flux-card-hover flux-animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Order #{order.order_number || order.id}
                </h1>
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(order.id), "Order ID")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                  title="Copy Full ID"
                  aria-label="Copy Full ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {statusBadge && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.classes}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${statusBadge.dotColor}`} />
                    <span>{statusBadge.label}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Created on{" "}
                {new Date(order.created_at || order.createdAt || Date.now()).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-medium">Grand Total</div>
                <div className="text-xl sm:text-2xl font-black text-[#37baf2]">
                  {formatRupiah(totalVal)}
                </div>
              </div>

              {nextStep && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(nextStep.nextStatus)}
                  disabled={isUpdatingStatus}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-[#37baf2]/20 transition-all active:scale-95 flux-interactive-btn"
                >
                  {isUpdatingStatus ? (
                    <span>Transitioning...</span>
                  ) : (
                    <>
                      <span>Advance to: {nextStep.nextActionLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Interactive Fulfillment Workflow Stepper */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-300">
                Fulfillment Workflow Pipeline
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Direct Status Override:</span>
                <select
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2] cursor-pointer"
                >
                  {WORKFLOW_STAGES.map((stg) => (
                    <option key={stg.key} value={stg.key} className="bg-[#12141A] text-white">
                      {stg.label}
                    </option>
                  ))}
                  <option value="cancelled" className="bg-[#12141A] text-white">
                    Cancelled / Refunded
                  </option>
                </select>
              </div>
            </div>

            {/* Stepper Node Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
              {WORKFLOW_STAGES.map((stg, idx) => {
                const isPassed = currentStageIndex > idx && order.status !== "cancelled";
                const isCurrent = currentStageIndex === idx && order.status !== "cancelled";
                const isPending = currentStageIndex < idx || order.status === "cancelled";

                return (
                  <div
                    key={stg.key}
                    onClick={() => handleUpdateStatus(stg.key)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isCurrent
                        ? "bg-[#37baf2]/10 border-[#37baf2] shadow-md shadow-[#37baf2]/10"
                        : isPassed
                        ? "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 text-slate-300"
                        : "bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-400 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500">0{idx + 1}</span>
                      {isPassed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-[#37baf2] animate-ping" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </div>
                    <div
                      className={`font-bold truncate text-[11px] ${
                        isCurrent ? "text-white" : isPassed ? "text-emerald-300" : "text-slate-400"
                      }`}
                    >
                      {stg.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols on lg): Items, Financials & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ordered Items Breakdown */}
            <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4 flux-card-hover">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#37baf2]" />
                  <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                    Ordered Hardware Components ({items.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Total items: {items.reduce((sum: number, it: any) => sum + (it.quantity || it.qty || 1), 0)}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No line items attached to this order record.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
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
                    const itemBrand = item.brand || item.product?.brand || "";
                    const itemSku = item.sku || item.product?.sku || "";

                    return (
                      <div
                        key={idx}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden shrink-0 flex items-center justify-center">
                            {itemImg ? (
                              <Image
                                src={itemImg}
                                alt={itemName}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-bold text-white text-sm truncate">{itemName}</div>
                            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                              {itemBrand && <span className="text-[#37baf2] font-semibold">{itemBrand}</span>}
                              {itemSku && <span>SKU: {itemSku}</span>}
                              <span>•</span>
                              <span>Unit: {formatRupiah(itemPrice)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                          <div className="text-slate-400 text-xs">
                            Qty: <span className="text-white font-bold">{itemQty}</span>
                          </div>
                          <div className="text-right font-black text-white text-sm">
                            {formatRupiah(itemPrice * itemQty)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Financial Summary & Breakdown */}
            <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4 flux-card-hover">
              <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                  Financial Breakdown &amp; Transaction Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cost lines */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Component Subtotal</span>
                    <span>{formatRupiah(Number(order.subtotal) || totalVal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Shipping &amp; Logistics Fee</span>
                    <span>{formatRupiah(Number(order.shipping_fee) || 0)}</span>
                  </div>
                  {Number(order.assembly_fee) > 0 && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Custom PC Assembly Fee</span>
                      <span>{formatRupiah(Number(order.assembly_fee))}</span>
                    </div>
                  )}
                  {Number(order.discount_amount) > 0 && (
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>Promotional Discount</span>
                      <span>-{formatRupiah(Number(order.discount_amount))}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-base font-black text-white">
                    <span>Total Settled Amount</span>
                    <span className="text-[#37baf2]">{formatRupiah(totalVal)}</span>
                  </div>
                </div>

                {/* Gateway Details */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Payment Gateway Info
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Payment Channel:</span>
                    <span className="font-bold text-white">{order.payment_method || "Midtrans Online"}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Gateway Reference:</span>
                    <span className="font-semibold text-slate-200">
                      {order.payment_reference || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Fulfillment Type:</span>
                    <span className="font-semibold text-white uppercase">
                      {order.fulfillment_type || "Delivery"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Payment Settlement:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Settled / Paid
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col on lg): Customer, Logistics, Internal Notes */}
          <div className="space-y-6">
            {/* Customer Profile Card */}
            <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4 flux-card-hover">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <User className="w-4 h-4 text-[#37baf2]" />
                <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                  Customer Profile
                </h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{customerName}</div>
                  <div className="text-slate-400 text-[11px]">
                    Customer ID: {order.customer_id || "Guest"}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <a
                      href={`mailto:${order.customer_email || order.user?.email || ""}`}
                      className="hover:text-[#37baf2] truncate transition-colors"
                    >
                      {order.customer_email || order.user?.email || "No email on record"}
                    </a>
                  </div>

                  {customerPhone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <a
                        href={`tel:${customerPhone}`}
                        className="hover:text-[#37baf2] transition-colors"
                      >
                        {customerPhone}
                      </a>
                    </div>
                  )}
                </div>

                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors flux-interactive-btn"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message Customer on WhatsApp</span>
                  </a>
                )}

                {/* Delivery Address */}
                <div className="pt-3 border-t border-white/5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Shipping Address</span>
                  </div>
                  <div className="text-slate-300 text-[11px] leading-relaxed bg-white/[0.02] rounded-xl p-3 border border-white/5">
                    {fullAddressString || "No delivery address registered."}
                  </div>
                  {address.deliveryNotes && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[11px]">
                      <span className="font-bold">Instructions: </span>
                      {address.deliveryNotes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Courier & Waybill Management Card */}
            <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4 flux-card-hover">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                    Logistics &amp; Tracking
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400">
                  {order.courier_service_code || "Courier"}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Courier Provider
                  </label>
                  <select
                    value={courierProviderInput}
                    onChange={(e) => setCourierProviderInput(e.target.value)}
                    className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2]"
                  >
                    <option value="jne" className="bg-[#12141A] text-white">JNE Express</option>
                    <option value="jnt" className="bg-[#12141A] text-white">J&amp;T Express</option>
                    <option value="sicepat" className="bg-[#12141A] text-white">SiCepat Express</option>
                    <option value="anteraja" className="bg-[#12141A] text-white">AnterAja</option>
                    <option value="gojek" className="bg-[#12141A] text-white">GoSend Instant</option>
                    <option value="grab" className="bg-[#12141A] text-white">GrabExpress Instant</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Tracking / Waybill ID
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateWaybill}
                      className="text-[10px] text-[#37baf2] hover:underline"
                    >
                      Generate Mock Waybill
                    </button>
                  </div>
                  <input
                    type="text"
                    value={waybillInput}
                    onChange={(e) => setWaybillInput(e.target.value)}
                    placeholder="Enter tracking number..."
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#37baf2]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveLogistics}
                  disabled={isSavingLogistics}
                  className="w-full min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors flux-interactive-btn"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingLogistics ? "Updating..." : "Save Logistics & Tracking"}</span>
                </button>
              </div>
            </div>

            {/* Internal Admin Notes Card */}
            <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 shadow-xl space-y-3 flux-card-hover">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                  Internal Warehouse Notes
                </h2>
                <span className="text-[10px] text-slate-400">Admin only</span>
              </div>

              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                placeholder="Log internal assembly notes, inspection checklist, or customer special requests..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#37baf2] resize-none"
              />

              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="w-full min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors flux-interactive-btn"
              >
                <Save className="w-3.5 h-3.5 text-[#37baf2]" />
                <span>{isSavingNotes ? "Saving Notes..." : "Save Internal Notes"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm flux-animate-fade">
          <div className="bg-[#12141A] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl flux-animate-scale-up">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cancel Order #{order.order_number || order.id}?</h3>
                <p className="text-xs text-slate-400">
                  This action marks the order as cancelled and releases any reserved warehouse inventory.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Cancellation Reason
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                >
                  <option value="Out of stock in warehouse" className="bg-[#12141A] text-white">
                    Out of stock in warehouse
                  </option>
                  <option value="Customer requested cancellation" className="bg-[#12141A] text-white">
                    Customer requested cancellation
                  </option>
                  <option value="Payment verification failed" className="bg-[#12141A] text-white">
                    Payment verification failed
                  </option>
                  <option value="Delivery address unreachable" className="bg-[#12141A] text-white">
                    Delivery address unreachable
                  </option>
                  <option value="Other" className="bg-[#12141A] text-white">
                    Other (Specify below)
                  </option>
                </select>
              </div>

              {cancelReason === "Other" && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Specific Reason
                  </label>
                  <input
                    type="text"
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs flux-interactive-btn"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-rose-500/20 flux-interactive-btn"
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
