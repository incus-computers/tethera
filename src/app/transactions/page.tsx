"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Receipt,
  Download,
  Mail,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Package,
  Loader2,
  ShoppingBag,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { formatRupiah } from "@/lib/utils/currency";
import { downloadInvoiceFile, InvoiceDownloadData } from "@/lib/utils/invoiceDownload";

interface TransactionRecord {
  id: string;
  orderNumber: string;
  paymentId?: string;
  paymentMethod?: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  fulfillmentType: "delivery" | "click_and_collect";
  pickupCode?: string;
  shippingAddress?: string;
  items: {
    id: string;
    name: string;
    sku?: string;
    brand?: string;
    price: number;
    quantity: number;
    image?: string;
  }[];
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
}

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, initSession } = useAuthStore();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Email resending state tracker: orderNumber -> boolean
  const [sendingEmailMap, setSendingEmailMap] = useState<Record<string, boolean>>({});
  const [emailSentMap, setEmailSentMap] = useState<Record<string, boolean>>({});

  // Downloading invoice state tracker: orderNumber -> boolean
  const [downloadingMap, setDownloadingMap] = useState<Record<string, boolean>>({});
  const [downloadSuccessMap, setDownloadSuccessMap] = useState<Record<string, boolean>>({});

  // Copy order number feedback
  const [copiedOrder, setCopiedOrder] = useState<string | null>(null);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Load transactions from API and session storage
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setErrorNotice(null);

    const mergedList: TransactionRecord[] = [];

    // 1. Check recent order saved in sessionStorage
    if (typeof window !== "undefined") {
      try {
        const storedOrder = sessionStorage.getItem("tethera_last_order");
        if (storedOrder) {
          const parsed = JSON.parse(storedOrder);
          if (parsed && parsed.orderNumber) {
            mergedList.push({
              id: parsed.orderId || parsed.orderNumber,
              orderNumber: parsed.orderNumber,
              paymentId: parsed.paymentId,
              paymentMethod: parsed.paymentChannel || "Midtrans Instant Pay",
              status: "order_accepted",
              createdAt: parsed.createdAt || new Date().toISOString(),
              customerName: parsed.customer?.name || "Customer",
              customerEmail: parsed.customer?.email || "",
              customerPhone: parsed.customer?.phone || "",
              fulfillmentType: parsed.fulfillmentMethod || "delivery",
              pickupCode: parsed.pickupCode,
              shippingAddress: parsed.shippingAddress
                ? `${parsed.shippingAddress.street}, ${parsed.shippingAddress.city}`
                : undefined,
              items: (parsed.items || []).map((it: any) => ({
                id: it.id,
                name: it.name,
                sku: it.sku,
                brand: it.brand,
                price: it.price,
                quantity: it.quantity,
                image: it.image,
              })),
              subtotal: parsed.subtotal || 0,
              shippingFee: parsed.shippingFee || 0,
              grandTotal: parsed.grandTotal || 0,
            });
          }
        }
      } catch (err) {
        console.warn("Could not read stored order snapshot:", err);
      }
    }

    // 2. If authenticated user exists, query backend orders API
    if (user?.email) {
      try {
        const params = new URLSearchParams();
        if (user.email) params.append("email", user.email);
        if (user.id) params.append("customerId", user.id);

        const res = await fetch(`/api/account/orders?${params.toString()}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.orders)) {
          for (const ord of data.orders) {
            const exists = mergedList.some((m) => m.orderNumber === ord.order_number);
            if (!exists) {
              mergedList.push({
                id: ord.id,
                orderNumber: ord.order_number,
                paymentId: ord.payment_reference || undefined,
                paymentMethod: ord.payment_method || "Online Payment",
                status: ord.status,
                createdAt: ord.created_at,
                customerName: ord.customer_name,
                customerEmail: ord.customer_email,
                customerPhone: ord.customer_phone,
                fulfillmentType: ord.fulfillment_type,
                pickupCode: ord.pickup_code || undefined,
                shippingAddress: ord.shipping_address
                  ? `${ord.shipping_address.street}, ${ord.shipping_address.city}`
                  : undefined,
                items: (ord.items || []).map((item: any) => ({
                  id: item.id,
                  name: item.product?.name || (item.is_custom_build ? "Custom PC Build" : `Hardware Item ${item.id}`),
                  sku: item.product?.sku,
                  brand: item.product?.brand,
                  price: item.unit_price,
                  quantity: item.quantity,
                  image: item.product?.images?.[0],
                })),
                subtotal: ord.subtotal,
                shippingFee: ord.shipping_fee,
                grandTotal: ord.total,
              });
            }
          }
        }
      } catch (apiErr) {
        console.warn("Could not fetch remote customer orders:", apiErr);
      }
    }

    // Sort descending by creation date
    mergedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setTransactions(mergedList);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleCopyOrder = (orderNum: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(orderNum);
      setCopiedOrder(orderNum);
      setTimeout(() => setCopiedOrder(null), 2000);
    }
  };

  const handleDownloadInvoice = (trx: TransactionRecord) => {
    setDownloadingMap((prev) => ({ ...prev, [trx.orderNumber]: true }));
    try {
      const invoiceData: InvoiceDownloadData = {
        orderNumber: trx.orderNumber,
        paymentId: trx.paymentId,
        paymentChannel: trx.paymentMethod,
        createdAt: trx.createdAt,
        customer: {
          name: trx.customerName,
          email: trx.customerEmail,
          phone: trx.customerPhone || "",
        },
        fulfillmentMethod: trx.fulfillmentType,
        items: trx.items.map((it) => ({
          id: it.id,
          name: it.name,
          sku: it.sku,
          brand: it.brand,
          price: it.price,
          quantity: it.quantity,
        })),
        subtotal: trx.subtotal,
        shippingFee: trx.shippingFee,
        grandTotal: trx.grandTotal,
      };

      downloadInvoiceFile(invoiceData);
      setDownloadSuccessMap((prev) => ({ ...prev, [trx.orderNumber]: true }));
      setTimeout(() => {
        setDownloadSuccessMap((prev) => ({ ...prev, [trx.orderNumber]: false }));
      }, 3000);
    } catch (err) {
      console.error("Failed to generate invoice file:", err);
    } finally {
      setDownloadingMap((prev) => ({ ...prev, [trx.orderNumber]: false }));
    }
  };

  const handleSendEmail = async (trx: TransactionRecord) => {
    if (!trx.customerEmail) {
      alert("No customer email is associated with this transaction record.");
      return;
    }

    setSendingEmailMap((prev) => ({ ...prev, [trx.orderNumber]: true }));
    try {
      const res = await fetch("/api/orders/invoice/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: trx.orderNumber,
          email: trx.customerEmail,
          customerName: trx.customerName,
          paymentId: trx.paymentId,
          paymentMethod: trx.paymentMethod,
          fulfillmentType: trx.fulfillmentType,
          pickupCode: trx.pickupCode,
          shippingAddress: trx.shippingAddress,
          subtotal: trx.subtotal,
          shippingFee: trx.shippingFee,
          grandTotal: trx.grandTotal,
          items: trx.items,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSentMap((prev) => ({ ...prev, [trx.orderNumber]: true }));
        setTimeout(() => {
          setEmailSentMap((prev) => ({ ...prev, [trx.orderNumber]: false }));
        }, 4000);
      } else {
        alert(data.error || "Failed to dispatch invoice email.");
      }
    } catch (err: any) {
      alert(err?.message || "Communication failure sending invoice.");
    } finally {
      setSendingEmailMap((prev) => ({ ...prev, [trx.orderNumber]: false }));
    }
  };

  // Filter transactions
  const filtered = transactions.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.orderNumber.toLowerCase().includes(q) ||
      (t.paymentId && t.paymentId.toLowerCase().includes(q)) ||
      t.customerName.toLowerCase().includes(q) ||
      t.customerEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/account" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
            Account
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100 font-bold">Transactions</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-center shadow-xs">
                <Receipt className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                Transaction Records
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Review settled payments, download official tax invoices, and track your hardware orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTransactions}
              disabled={isLoading}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-2 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/components"
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 min-h-[44px] transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Shop Hardware</span>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        {transactions.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order Number, Payment Reference, or Customer..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && transactions.length === 0 && (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <Loader2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Loading verified transaction records...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && transactions.length === 0 && (
          <div className="p-10 text-center space-y-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800">
            <div className="w-14 h-14 bg-slate-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-zinc-500">
              <Receipt className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No Transactions Found
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                You have not completed any purchases in this session. Once an order is paid and verified, its invoice and status will be displayed here.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/components"
                className="w-full sm:w-auto px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs min-h-[44px] flex items-center justify-center gap-2"
              >
                <span>Browse Components</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/builder"
                className="w-full sm:w-auto px-6 py-3 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center"
              >
                <span>Launch PC Builder</span>
              </Link>
            </div>
          </div>
        )}

        {/* Filtered Empty Results */}
        {!isLoading && transactions.length > 0 && filtered.length === 0 && (
          <div className="p-8 text-center space-y-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
            <p className="text-xs text-slate-600 dark:text-zinc-300">
              No transactions match &quot;{searchQuery}&quot;. Clear search to view all records.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold underline min-h-[44px] inline-flex items-center"
            >
              Clear Search Filter
            </button>
          </div>
        )}

        {/* Transactions List */}
        <div className="space-y-4">
          {filtered.map((trx) => {
            const dateStr = new Date(trx.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const isDownloading = downloadingMap[trx.orderNumber] || false;
            const isDownloadSuccess = downloadSuccessMap[trx.orderNumber] || false;
            const isSendingEmail = sendingEmailMap[trx.orderNumber] || false;
            const isEmailSent = emailSentMap[trx.orderNumber] || false;

            return (
              <div
                key={trx.orderNumber}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 space-y-5 shadow-xs transition-colors"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100">
                        {trx.orderNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyOrder(trx.orderNumber)}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        title="Copy order number"
                      >
                        {copiedOrder === trx.orderNumber ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>Date: {dateStr}</span>
                      <span>•</span>
                      <span>Customer: {trx.customerName}</span>
                      {trx.customerEmail && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 dark:text-zinc-300">{trx.customerEmail}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Settlement Verified</span>
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Payment Details */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                      Payment Channel
                    </span>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {trx.paymentMethod || "Midtrans Instant Pay"}
                    </div>
                    {trx.paymentId && (
                      <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 truncate">
                        ID: {trx.paymentId}
                      </div>
                    )}
                  </div>

                  {/* Fulfillment Details */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                      Fulfillment Method
                    </span>
                    {trx.fulfillmentType === "click_and_collect" ? (
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                        <Store className="w-3.5 h-3.5 shrink-0" />
                        <span>In-Store Collection (Mangga Dua)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        <Truck className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span>Courier Delivery Dispatch</span>
                      </div>
                    )}
                    {trx.pickupCode && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                        Pickup PIN: {trx.pickupCode}
                      </div>
                    )}
                  </div>

                  {/* Amount Breakdown */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                      Transaction Total
                    </span>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(trx.grandTotal)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Subtotal: {formatRupiah(trx.subtotal)} | Ship: {formatRupiah(trx.shippingFee)}
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                {trx.items && trx.items.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                      Purchased Products ({trx.items.length})
                    </span>
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-zinc-800/30">
                      {trx.items.map((it, idx) => (
                        <div key={`${trx.orderNumber}-it-${idx}`} className="p-3 flex items-center justify-between text-xs gap-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                              {it.name}
                            </span>
                            {it.sku && (
                              <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                                SKU: {it.sku}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-slate-600 dark:text-zinc-300 font-medium">
                              {it.quantity} × {formatRupiah(it.price)}
                            </div>
                            <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                              {formatRupiah(it.quantity * it.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Choice A: Download Tax Invoice */}
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(trx)}
                      disabled={isDownloading}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60"
                    >
                      {isDownloadSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Invoice Downloaded</span>
                        </>
                      ) : isDownloading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Preparing...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Invoice</span>
                        </>
                      )}
                    </button>

                    {/* Choice B: Send to Registered Email */}
                    <button
                      type="button"
                      onClick={() => handleSendEmail(trx)}
                      disabled={isSendingEmail}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                    >
                      {isEmailSent ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">Invoice Dispatched!</span>
                        </>
                      ) : isSendingEmail ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending Email...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                          <span>Send to Email</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Link to Account Dashboard / Live Tracking */}
                  <Link
                    href={`/account?tab=current_orders`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <span>View in Account</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading Transactions...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
