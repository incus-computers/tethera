"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Crown,
  Lock,
  LogOut,
  Package,
  Truck,
  Layers,
  Tag,
  Users,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  X,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Zap,
  Check,
  ArrowRight,
} from "lucide-react";
import { useAdminStore } from "@/lib/store/useAdminStore";
import { formatRupiah } from "@/lib/utils/currency";
import { Product, Order, Promotion, DynamicBannerSlide, CustomerProfileRow } from "@/lib/db/types";

export default function AdminPortalPage() {
  const { user, token, isAuthenticated, isSuperAdmin, isLoading, error, login, logout, initSession } =
    useAdminStore();

  // Navigation State
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "promotions" | "crm">("orders");

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Data Collections State
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [banners, setBanners] = useState<DynamicBannerSlide[]>([]);
  const [customers, setCustomers] = useState<CustomerProfileRow[]>([]);
  const [crmStats, setCrmStats] = useState<any>(null);

  const [loadingData, setLoadingData] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modals State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [dispatchModalOrder, setDispatchModalOrder] = useState<any | null>(null);
  const [selectedCourierProvider, setSelectedCourierProvider] = useState<"gojek" | "grab">("gojek");
  const [newPromoModalOpen, setNewPromoModalOpen] = useState(false);
  const [newBannerModalOpen, setNewBannerModalOpen] = useState(false);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [newImageUrlInput, setNewImageUrlInput] = useState("");

  // Initialize Session
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Fetch Data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllDashboardData();
    }
  }, [isAuthenticated, isSuperAdmin]);

  const loadAllDashboardData = async () => {
    setLoadingData(true);
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Load Orders
      const resOrders = await fetch("/api/admin/orders", { headers });
      if (resOrders.ok) {
        const d = await resOrders.json();
        if (d.success) setOrders(d.orders || []);
      }

      // 2. Load Products
      const resProducts = await fetch("/api/admin/products", { headers });
      if (resProducts.ok) {
        const d = await resProducts.json();
        if (d.success) setProducts(d.products || []);
      }

      // 3. Load Promotions & Banners
      const resPromos = await fetch("/api/admin/promotions", { headers });
      if (resPromos.ok) {
        const d = await resPromos.json();
        if (d.success) setPromotions(d.promotions || []);
      }

      const resBanners = await fetch("/api/admin/banners", { headers });
      if (resBanners.ok) {
        const d = await resBanners.json();
        if (d.success) setBanners(d.banners || []);
      }

      // 4. Load Customers (Superadmin only)
      if (isSuperAdmin) {
        const resCustomers = await fetch("/api/admin/customers", { headers });
        if (resCustomers.ok) {
          const d = await resCustomers.json();
          if (d.success) {
            setCustomers(d.customers || []);
            setCrmStats(d.stats);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4500);
  };

  // --------------------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // --------------------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError(null);
    const result = await login(loginIdentifier, loginPassword);
    if (!result.success) {
      setLoginError(result.error || "Authentication failed.");
    }
    setLoginSubmitting(false);
  };

  const quickDemoLogin = async (type: "superadmin" | "admin") => {
    if (type === "superadmin") {
      setLoginIdentifier("superadmin@tethera.com");
      setLoginPassword("SuperAdmin2026!");
      setLoginSubmitting(true);
      await login("superadmin@tethera.com", "SuperAdmin2026!");
      setLoginSubmitting(false);
    } else {
      setLoginIdentifier("admin@tethera.com");
      setLoginPassword("AdminPass2026!");
      setLoginSubmitting(true);
      await login("admin@tethera.com", "AdminPass2026!");
      setLoginSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // ORDER STAGES MANAGEMENT
  // --------------------------------------------------------------------------
  const advanceOrderStage = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId, nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      } else {
        alert(data.error || "Failed to update order stage");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const dispatchCourier = async () => {
    if (!dispatchModalOrder) return;
    try {
      const res = await fetch("/api/admin/courier/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId: dispatchModalOrder.id,
          courierProvider: selectedCourierProvider,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setOrders((prev) =>
          prev.map((o) => (o.id === dispatchModalOrder.id ? data.order : o))
        );
        setDispatchModalOrder(null);
      } else {
        alert(data.error || "Failed to dispatch courier");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const simulateDeliveryArrival = async (orderId: string) => {
    try {
      const res = await fetch("/api/admin/courier/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId,
          action: "simulate_arrival",
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? data.order : o))
        );
      } else {
        alert(data.error || "Failed to simulate delivery arrival");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --------------------------------------------------------------------------
  // PRODUCT MANIPULATION (EDIT / IMAGES / DELETE / CREATE)
  // --------------------------------------------------------------------------
  const handleSaveProductEdit = async () => {
    if (!editingProduct) return;
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editingProduct),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Product changes and images saved successfully.");
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? data.product : p))
        );
        setEditingProduct(null);
      } else {
        alert(data.error || "Failed to save product");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to permanently delete '${productName}'? (Superadmin action)`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/products?id=${productId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      } else {
        alert(data.error || "Failed to delete product");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: formData.get("name") as string,
      brand: formData.get("brand") as string,
      sku: formData.get("sku") as string,
      category_slug: formData.get("category_slug") as string,
      retail_price: Number(formData.get("retail_price")),
      initial_stock: Number(formData.get("initial_stock")),
      description: formData.get("description") as string,
      images: [formData.get("image_url") as string || "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop&q=60"],
      pc_builder_slot: (formData.get("pc_builder_slot") as string) || null,
      specs: {
        socket: (formData.get("spec_socket") as string) || undefined,
        tdpWatts: Number(formData.get("spec_tdp")) || undefined,
      },
    };

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setProducts((prev) => [data.product, ...prev]);
        setNewProductModalOpen(false);
      } else {
        alert(data.error || "Failed to create product");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --------------------------------------------------------------------------
  // PROMOTIONS & BANNERS HANDLERS (SUPERADMIN)
  // --------------------------------------------------------------------------
  const handleTogglePromo = async (promo: Promotion) => {
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: promo.id, is_active: !promo.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Promo '${promo.code}' status toggled.`);
        setPromotions((prev) =>
          prev.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p))
        );
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotion?")) return;
    try {
      const res = await fetch(`/api/admin/promotions?id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setPromotions((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      code: (formData.get("code") as string).toUpperCase(),
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      discount_type: formData.get("discount_type") as string,
      discount_value: Number(formData.get("discount_value")),
      min_spend: Number(formData.get("min_spend")) || undefined,
      usage_limit: Number(formData.get("usage_limit")) || undefined,
    };

    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setPromotions((prev) => [data.promotion, ...prev]);
        setNewPromoModalOpen(false);
      } else {
        alert(data.error || "Failed to create promotion");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ==========================================================================
  // RENDER: LOGIN GATEWAY (IF UNAUTHENTICATED)
  // ==========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-3.5 shadow-xl shadow-cyan-500/20 mb-4 border border-cyan-400/30">
              <ShieldCheck className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Tethera Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Restricted Portal: Administrative & Superadmin Clearance Required
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
            {loginError && (
              <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Clearance Identifier / Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="admin@tethera.com or superadmin"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Clearance Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loginSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>Authenticate Clearance</span>
              </button>
            </form>

            {/* Quick Demo Fill Buttons for Testing */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-xs text-slate-400 text-center font-medium mb-3">
                Quick-Access Demo Clearance:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => quickDemoLogin("admin")}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-300 flex items-center justify-center gap-1.5 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Store Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickDemoLogin("superadmin")}
                  className="px-3 py-2 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800 text-xs text-purple-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                  <span>Superadmin</span>
                </button>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 text-center">
                Admin: Edit products, manage stock & pictures, advance order stages.
                <br />
                Superadmin: Full access + add/delete products, promotions, banners & CRM.
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1"
            >
              <span>Return to Public Tethera Storefront</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: AUTHENTICATED COMMAND CENTER
  // ==========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Alert */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-cyan-500/50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <span className="text-sm font-medium">{actionNotice}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              T
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base">Tethera</span>
              <span className="ml-1.5 text-xs text-cyan-400 font-mono tracking-wider">COMMAND CENTER</span>
            </div>
          </Link>

          {/* Role Clearance Badge */}
          <div className="hidden sm:flex items-center gap-1.5 ml-3">
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950 border border-purple-700 text-purple-300">
                <Crown className="w-3.5 h-3.5 text-purple-400" />
                <span>SUPERADMIN • Level 2 (Full Access)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950 border border-cyan-700 text-cyan-300">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>STORE ADMIN • Level 1</span>
              </span>
            )}
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={loadAllDashboardData}
            disabled={loadingData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <div className="text-right hidden md:block">
            <div className="text-xs font-medium text-white">{user?.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{user?.email}</div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container & Navigation Tabs */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "orders"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Orders & Fulfillment Pipeline</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-xs ${activeTab === "orders" ? "bg-slate-950 text-cyan-300" : "bg-slate-800 text-slate-400"}`}>
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "products"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Catalog & Images</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-xs ${activeTab === "products" ? "bg-slate-950 text-cyan-300" : "bg-slate-800 text-slate-400"}`}>
              {products.length}
            </span>
          </button>

          {/* Superadmin-Only Tabs */}
          <button
            onClick={() => {
              if (!isSuperAdmin) {
                alert("Superadmin clearance required to access Promotions & Banners.");
                return;
              }
              setActiveTab("promotions");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "promotions"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 font-semibold"
                : isSuperAdmin
                ? "bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-900/50"
                : "bg-slate-900/40 text-slate-600 border border-slate-800/40 cursor-not-allowed"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Promotions & Banners</span>
            {!isSuperAdmin && <Lock className="w-3 h-3 ml-1 text-slate-600" />}
          </button>

          <button
            onClick={() => {
              if (!isSuperAdmin) {
                alert("Superadmin clearance required to access Customer CRM Suite.");
                return;
              }
              setActiveTab("crm");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "crm"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 font-semibold"
                : isSuperAdmin
                ? "bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-900/50"
                : "bg-slate-900/40 text-slate-600 border border-slate-800/40 cursor-not-allowed"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer CRM Suite</span>
            {!isSuperAdmin && <Lock className="w-3 h-3 ml-1 text-slate-600" />}
          </button>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: ORDERS & FULFILLMENT PIPELINE */}
        {/* ==================================================================== */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 font-medium px-2">Filter Stage:</span>
                {[
                  { id: "all", label: "All Orders" },
                  { id: "order_received", label: "1. Order Received" },
                  { id: "order_accepted", label: "2. Order Accepted" },
                  { id: "finding_stock", label: "3. Finding Stock" },
                  { id: "finding_courier", label: "4. Finding Courier" },
                  { id: "on_delivery", label: "5. On Delivery (Gojek/Grab)" },
                  { id: "delivery_arrived", label: "6. Delivery Arrived" },
                  { id: "ready_for_pickup", label: "Click & Collect" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setOrderStatusFilter(st.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      orderStatusFilter === st.id
                        ? "bg-cyan-500 text-slate-950 font-semibold"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Showing {orders.filter((o) => orderStatusFilter === "all" || o.status === orderStatusFilter).length} orders
              </div>
            </div>

            {/* Orders List Cards */}
            <div className="space-y-4">
              {orders
                .filter((o) => orderStatusFilter === "all" || o.status === orderStatusFilter)
                .map((order) => {
                  const isCnC = order.fulfillment_type === "click_and_collect";
                  const isDelivered = order.status === "delivery_arrived" || order.status === "collected";
                  const isOnDelivery = order.status === "on_delivery";

                  return (
                    <div
                      key={order.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-4"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-base font-bold text-white">
                              #{order.order_number}
                            </span>
                            {isCnC ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 border border-amber-700 text-amber-300">
                                Click & Collect (Flagship Counter)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 border border-emerald-700 text-emerald-300">
                                Doorstep Delivery
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              {new Date(order.created_at).toLocaleString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-500" />
                              <strong className="text-slate-200">{order.customer_name}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              {order.customer_phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-500" />
                              {order.customer_email}
                            </span>
                          </div>
                        </div>

                        {/* Order Total */}
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Total Order Amount</div>
                          <div className="text-lg font-bold text-cyan-400">
                            {formatRupiah(order.total)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {order.payment_method} • {order.payment_reference || "PAID"}
                          </div>
                        </div>
                      </div>

                      {/* STAGES PROGRESS STEPPER */}
                      <div className="pt-3 pb-1 border-t border-slate-800/80">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Fulfillment Pipeline Stage:
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                          {[
                            { key: "order_received", num: 1, label: "Order Received" },
                            { key: "order_accepted", num: 2, label: "Order Accepted" },
                            { key: "finding_stock", num: 3, label: "Finding Stock" },
                            { key: "finding_courier", num: 4, label: "Finding Courier" },
                            { key: "on_delivery", num: 5, label: "On Delivery" },
                            { key: "delivery_arrived", num: 6, label: "Arrived" },
                          ].map((step, idx) => {
                            const stagesList = [
                              "order_received",
                              "order_accepted",
                              "finding_stock",
                              "finding_courier",
                              "on_delivery",
                              "delivery_arrived",
                            ];
                            const currentIdx = stagesList.indexOf(order.status);
                            const stepIdx = stagesList.indexOf(step.key);
                            const isPassed = currentIdx >= stepIdx && currentIdx !== -1;
                            const isCurrent = order.status === step.key;

                            return (
                              <div
                                key={step.key}
                                className={`p-2 rounded-xl border text-xs flex flex-col items-center justify-center gap-1 transition ${
                                  isCurrent
                                    ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-md shadow-cyan-500/10"
                                    : isPassed
                                    ? "bg-slate-800/60 border-slate-700 text-slate-300"
                                    : "bg-slate-950/40 border-slate-800/40 text-slate-600"
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  {isPassed ? (
                                    <Check className="w-3 h-3 text-cyan-400" />
                                  ) : (
                                    <span className="w-3 h-3 rounded-full border border-slate-600 flex items-center justify-center text-[9px]">
                                      {step.num}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-medium">{step.label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Courier Live Telemetry Banner if On Delivery or Arrived */}
                      {order.courier_info && (
                        <div
                          className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                            order.courier_info.provider === "gojek"
                              ? "bg-emerald-950/30 border-emerald-800/60"
                              : "bg-emerald-950/30 border-green-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white ${
                                order.courier_info.provider === "gojek" ? "bg-[#00AA13]" : "bg-[#00B14F]"
                              }`}
                            >
                              {order.courier_info.provider === "gojek" ? "Gojek" : "Grab"}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white flex items-center gap-2">
                                <span>{order.courier_info.service_name}</span>
                                <span className="text-emerald-400 text-[11px] font-mono font-normal">
                                  Waybill: {order.courier_info.tracking_id}
                                </span>
                              </div>
                              <div className="text-xs text-slate-300 mt-0.5">
                                Driver: <strong>{order.courier_info.driver_name}</strong> • Phone: {order.courier_info.driver_phone} • Plate: <strong>{order.courier_info.vehicle_plate}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Simulate Arrival button if On Delivery */}
                          {isOnDelivery && (
                            <button
                              onClick={() => simulateDeliveryArrival(order.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Simulate Delivery Arrival (Webhook Ping)</span>
                            </button>
                          )}

                          {isDelivered && (
                            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Delivered & Handed to Customer</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Items Preview & Address */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 pt-2 border-t border-slate-800">
                        <div>
                          <div className="font-semibold text-slate-400 mb-1">Ordered Items ({order.items?.length || 0}):</div>
                          <ul className="space-y-1">
                            {order.items?.map((it: any) => (
                              <li key={it.id} className="flex justify-between items-center text-slate-300">
                                <span>
                                  {it.quantity}x {it.product?.name || "Hardware Component"}
                                </span>
                                <span className="font-mono text-slate-400">
                                  {formatRupiah(it.unit_price * it.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="font-semibold text-slate-400 mb-1">Fulfillment Destination:</div>
                          {isCnC ? (
                            <div className="text-slate-300 flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                              <span>
                                Mangga Dua Mall Flagship Retail Hub • Pickup PIN:{" "}
                                <strong className="text-amber-300 font-mono">{order.pickup_code || "N/A"}</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="text-slate-300 flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                              <span>
                                {order.shipping_address?.street}, {order.shipping_address?.subdistrict},{" "}
                                {order.shipping_address?.city} {order.shipping_address?.postalCode}
                              </span>
                            </div>
                          )}
                          {order.notes && (
                            <div className="mt-1 text-[11px] text-slate-400 italic">Note: {order.notes}</div>
                          )}
                        </div>
                      </div>

                      {/* STAGE ACTION CONTROLS */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                        <div className="text-xs text-slate-400">
                          Current Status: <strong className="text-cyan-300 uppercase font-mono">{order.status.replace(/_/g, " ")}</strong>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* 1. Received -> Accepted */}
                          {order.status === "order_received" && (
                            <button
                              onClick={() => advanceOrderStage(order.id, "order_accepted")}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept Order</span>
                            </button>
                          )}

                          {/* 2. Accepted -> Finding Stock */}
                          {order.status === "order_accepted" && (
                            <button
                              onClick={() => advanceOrderStage(order.id, "finding_stock")}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center gap-1.5"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Find & Pick Stock in Warehouse</span>
                            </button>
                          )}

                          {/* 3. Finding Stock -> Finding Courier */}
                          {order.status === "finding_stock" && (
                            <button
                              onClick={() => advanceOrderStage(order.id, "finding_courier")}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition flex items-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Stock Ready • Request Courier</span>
                            </button>
                          )}

                          {/* 4. Finding Courier -> Dispatch On Delivery */}
                          {order.status === "finding_courier" && (
                            <button
                              onClick={() => setDispatchModalOrder(order)}
                              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-semibold text-xs shadow-md transition flex items-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Dispatch Courier (Gojek / Grab)</span>
                            </button>
                          )}

                          {/* Click & Collect specific transitions */}
                          {isCnC && order.status === "order_accepted" && (
                            <button
                              onClick={() => advanceOrderStage(order.id, "ready_for_pickup")}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition"
                            >
                              Mark Ready for Counter Pickup
                            </button>
                          )}
                          {isCnC && order.status === "ready_for_pickup" && (
                            <button
                              onClick={() => advanceOrderStage(order.id, "collected")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
                            >
                              Complete Counter Handover
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: PRODUCT CATALOG & IMAGE MANAGEMENT */}
        {/* ==================================================================== */}
        {activeTab === "products" && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by hardware name, brand, or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Categories</option>
                  <option value="cpu">Processors (CPUs)</option>
                  <option value="gpu">Graphics Cards (GPUs)</option>
                  <option value="motherboards">Motherboards</option>
                  <option value="cooling">Cooling</option>
                  <option value="ram">Memory</option>
                  <option value="storage">Storage</option>
                  <option value="cases">Chassis</option>
                  <option value="power-supplies">Power Supplies</option>
                </select>
              </div>

              {/* SUPERADMIN: ADD NEW PRODUCT BUTTON */}
              {isSuperAdmin ? (
                <button
                  onClick={() => setNewProductModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-600/20 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Hardware Product</span>
                </button>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Note: Adding or deleting products requires Superadmin clearance.
                </div>
              )}
            </div>

            {/* Products Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Hardware Product</th>
                      <th className="py-3.5 px-4">SKU / Brand</th>
                      <th className="py-3.5 px-4">Retail Price</th>
                      <th className="py-3.5 px-4">Stock On Hand</th>
                      <th className="py-3.5 px-4">Available</th>
                      <th className="py-3.5 px-4">Pictures</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {products
                      .filter((p) => {
                        const matchesSearch =
                          !productSearch ||
                          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.sku.toLowerCase().includes(productSearch.toLowerCase());
                        const matchesCat =
                          productCategoryFilter === "all" ||
                          p.category_slug === productCategoryFilter ||
                          p.pc_builder_slot === productCategoryFilter;
                        return matchesSearch && matchesCat;
                      })
                      .map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 relative">
                                {prod.images?.[0] ? (
                                  <img
                                    src={prod.images[0]}
                                    alt={prod.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-6 h-6 text-slate-600 m-auto" />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-white max-w-xs truncate">{prod.name}</div>
                                <div className="text-[11px] text-slate-400 capitalize">{prod.category_slug || "hardware"}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono text-cyan-400">{prod.sku}</div>
                            <div className="text-[11px] text-slate-400">{prod.brand}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            {formatRupiah(prod.retail_price)}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono font-semibold text-slate-200">
                              {prod.stock_on_hand}
                            </span>
                            <span className="text-[10px] text-slate-500 block">units in store</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                prod.stock_available > 3
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : prod.stock_available > 0
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : "bg-red-950 text-red-300 border border-red-800"
                              }`}
                            >
                              {prod.stock_available} available
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-400 text-xs">
                              {prod.images?.length || 0} image(s)
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Edit button: Admin & Superadmin */}
                              <button
                                onClick={() => setEditingProduct({ ...prod })}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 transition flex items-center gap-1"
                                title="Edit elements & pictures"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {/* Delete button: Superadmin only */}
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                  className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800 transition"
                                  title="Delete Product (Superadmin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: PROMOTIONS & BANNERS (SUPERADMIN ONLY) */}
        {/* ==================================================================== */}
        {activeTab === "promotions" && isSuperAdmin && (
          <div className="space-y-8">
            {/* 1. Promotional Discount Codes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Tag className="w-5 h-5 text-purple-400" />
                    <span>Active Promotional Discount Codes</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Create and manage discount vouchers applicable across Checkout and Custom Rig configurations.
                  </p>
                </div>

                <button
                  onClick={() => setNewPromoModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Promo Code</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className={`bg-slate-900 border rounded-2xl p-4 space-y-3 transition ${
                      promo.is_active ? "border-purple-800/80 shadow-lg shadow-purple-950/30" : "border-slate-800 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-base font-bold tracking-wider text-purple-300 bg-purple-950/80 border border-purple-800 px-2 py-0.5 rounded">
                          {promo.code}
                        </span>
                        <div className="font-semibold text-white text-sm mt-1.5">{promo.title}</div>
                      </div>
                      <button
                        onClick={() => handleTogglePromo(promo)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          promo.is_active ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {promo.is_active ? "ACTIVE" : "PAUSED"}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300">{promo.description}</p>

                    <div className="text-xs text-slate-400 border-t border-slate-800 pt-2 flex justify-between items-center">
                      <div>
                        Discount:{" "}
                        <strong className="text-white font-mono">
                          {promo.discount_type === "percentage"
                            ? `${promo.discount_value}% OFF`
                            : formatRupiah(promo.discount_value)}
                        </strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {promo.usage_count} uses {promo.usage_limit ? `/ ${promo.usage_limit}` : ""}
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleDeletePromo(promo.id)}
                        className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Promotional Banners Manager */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span>Dynamic Homepage Hero Banners</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live rotating banner slides displayed on the Tethera storefront homepage.
                  </p>
                </div>

                <button
                  onClick={() => setNewBannerModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Banner Slide</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {banners.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {slide.image_url ? (
                        <div className="h-32 w-full bg-slate-950 relative overflow-hidden">
                          <img
                            src={slide.image_url}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">
                            Slide #{idx + 1} • Picture Banner
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-3 flex flex-col justify-center">
                          <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold">
                            {slide.badge || "Hero Campaign"}
                          </span>
                          <span className="text-sm font-bold text-white line-clamp-1">{slide.title}</span>
                          <span className="text-xs text-slate-300 line-clamp-2 mt-1">{slide.highlight}</span>
                        </div>
                      )}

                      <div className="p-4 space-y-2">
                        <div className="font-semibold text-white text-sm">{slide.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-2">{slide.description}</div>
                        <div className="text-[11px] text-cyan-400 font-mono">CTA: {slide.cta_link}</div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-slate-800 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Order: {slide.display_order}</span>
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this banner slide?")) return;
                          await fetch(`/api/admin/banners?id=${slide.id}`, {
                            method: "DELETE",
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                          });
                          setBanners((prev) => prev.filter((b) => b.id !== slide.id));
                          showToast("Banner deleted.");
                        }}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: CUSTOMER CRM SUITE (SUPERADMIN ONLY) */}
        {/* ==================================================================== */}
        {activeTab === "crm" && isSuperAdmin && (
          <div className="space-y-6">
            {/* High-level CRM Stats */}
            {crmStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">Total Registered Leads</div>
                  <div className="text-2xl font-bold text-white mt-1">{crmStats.totalLeads}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">Marketing Opt-In Rate</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{crmStats.optInRate}%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">VIP High-Spend Clients</div>
                  <div className="text-2xl font-bold text-purple-400 mt-1">{crmStats.vipCount}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">Cumulative GMV Spent</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                    {formatRupiah(crmStats.totalRevenueGenerated)}
                  </div>
                </div>
              </div>
            )}

            {/* Customers Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Customer Database & Marketing Profiles</h3>
                  <p className="text-xs text-slate-400">Omnichannel customer spend, preferences, and verified contact numbers.</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{customers.length} records</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Client Name & Email</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Segment</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Total Orders</th>
                      <th className="py-3 px-4">Total Spent</th>
                      <th className="py-3 px-4">Opt-In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{c.full_name}</div>
                          <div className="text-[11px] text-slate-400">{c.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{c.phone}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-200 uppercase">
                            {c.customer_segment}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.crm_status === "vip"
                                ? "bg-purple-950 text-purple-300 border border-purple-800"
                                : c.crm_status === "active_customer"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {c.crm_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{c.total_orders}</td>
                        <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                          {formatRupiah(c.total_spent)}
                        </td>
                        <td className="py-3 px-4">
                          {c.marketing_opt_in ? (
                            <span className="text-emerald-400 font-semibold">Yes (WhatsApp + Email)</span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================== */}
      {/* MODAL 1: EDIT PRODUCT ELEMENTS & PICTURE GALLERY (ADMIN & SUPERADMIN)   */}
      {/* ====================================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Edit Product Elements</h3>
                <p className="text-xs text-slate-400">Modify name, price, stock, specs, and picture gallery.</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Name & Brand */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Brand</label>
                  <input
                    type="text"
                    value={editingProduct.brand}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Price & Stock On Hand */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Retail Price (IDR)</label>
                  <input
                    type="number"
                    value={editingProduct.retail_price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, retail_price: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Store Stock on Hand (Inventory)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.stock_on_hand}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock_on_hand: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Product Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* PICTURE GALLERY: INSERT & DELETE PICTURES */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Product Pictures Gallery ({editingProduct.images?.length || 0})</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Admins can insert or delete pictures</span>
                </div>

                {/* Thumbnails Strip with Delete button */}
                <div className="flex items-center gap-3 flex-wrap">
                  {editingProduct.images?.map((imgUrl: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden group"
                    >
                      <img src={imgUrl} alt="Product" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = editingProduct.images.filter((_: any, i: number) => i !== idx);
                          setEditingProduct({ ...editingProduct, images: filtered });
                        }}
                        className="absolute inset-0 bg-red-950/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        title="Delete this picture"
                      >
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Insert Picture URL */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="url"
                    placeholder="Paste image URL (e.g. https://images.unsplash.com/... or /products/gpu.png)"
                    value={newImageUrlInput}
                    onChange={(e) => setNewImageUrlInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newImageUrlInput.trim()) return;
                      const currentImages = editingProduct.images || [];
                      setEditingProduct({
                        ...editingProduct,
                        images: [...currentImages, newImageUrlInput.trim()],
                      });
                      setNewImageUrlInput("");
                    }}
                    className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition"
                  >
                    Insert Picture
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProductEdit}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20"
              >
                Save All Elements
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 2: DISPATCH ON-DEMAND COURIER (GOJEK / GRAB)                     */}
      {/* ====================================================================== */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Gojek & Grab Courier Dispatch</h3>
              </div>
              <button
                onClick={() => setDispatchModalOrder(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Order <strong>#{dispatchModalOrder.order_number}</strong> for <strong>{dispatchModalOrder.customer_name}</strong> is packed and ready at Mangga Dua Flagship Hub. Select on-demand courier partner to trigger driver assignment.
            </p>

            {/* Courier Selection */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCourierProvider("gojek")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition ${
                  selectedCourierProvider === "gojek"
                    ? "bg-emerald-950/60 border-[#00AA13] shadow-md shadow-emerald-900/20"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#00AA13] text-white flex items-center justify-center font-bold text-xs mb-2">
                  G
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Gojek (GoSend)</div>
                  <div className="text-[11px] text-slate-400">GoSend Instant Bike/Car</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCourierProvider("grab")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition ${
                  selectedCourierProvider === "grab"
                    ? "bg-emerald-950/60 border-[#00B14F] shadow-md shadow-emerald-900/20"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#00B14F] text-white flex items-center justify-center font-bold text-xs mb-2">
                  Gr
                </div>
                <div>
                  <div className="font-bold text-white text-xs">GrabExpress</div>
                  <div className="text-[11px] text-slate-400">GrabExpress Instant</div>
                </div>
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Delivery Address:</div>
              <div className="font-medium text-white">
                {dispatchModalOrder.shipping_address?.street}, {dispatchModalOrder.shipping_address?.subdistrict},{" "}
                {dispatchModalOrder.shipping_address?.city}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={dispatchCourier}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-600/20"
              >
                Dispatch via {selectedCourierProvider === "gojek" ? "GoSend" : "GrabExpress"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 3: ADD NEW PRODUCT (SUPERADMIN ONLY)                            */}
      {/* ====================================================================== */}
      {newProductModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Add New Hardware Item (Superadmin)</h3>
              </div>
              <button
                onClick={() => setNewProductModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Product Name</label>
                  <input
                    name="name"
                    required
                    placeholder="e.g. AMD Ryzen 9 9950X"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Brand</label>
                  <input
                    name="brand"
                    required
                    placeholder="e.g. AMD / ASUS / Corsair"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">SKU</label>
                  <input
                    name="sku"
                    required
                    placeholder="e.g. AMD-100-9950X"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    name="category_slug"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="cpu">Processors (cpu)</option>
                    <option value="gpu">Graphics Cards (gpu)</option>
                    <option value="motherboards">Motherboards</option>
                    <option value="cooling">Cooling</option>
                    <option value="ram">Memory</option>
                    <option value="storage">Storage</option>
                    <option value="cases">Chassis</option>
                    <option value="power-supplies">Power Supplies</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Retail Price (IDR)</label>
                  <input
                    name="retail_price"
                    type="number"
                    required
                    placeholder="e.g. 10999000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Initial Stock on Hand</label>
                  <input
                    name="initial_stock"
                    type="number"
                    defaultValue={10}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Primary Picture URL</label>
                <input
                  name="image_url"
                  placeholder="https://images.unsplash.com/... or /tethera.png"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Product Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="High-performance processor designed for enthusiast computing..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Create Product in Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 4: CREATE PROMOTION CODE (SUPERADMIN ONLY)                       */}
      {/* ====================================================================== */}
      {newPromoModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Create Promotional Voucher</h3>
              <button onClick={() => setNewPromoModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Promo Code</label>
                <input
                  name="code"
                  required
                  placeholder="e.g. FLASHDEAL20"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Campaign Title</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. 20% Off RTX 4070 Ti Drop"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Discount Type</label>
                  <select
                    name="discount_type"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (IDR)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Discount Value</label>
                  <input
                    name="discount_value"
                    type="number"
                    required
                    placeholder="e.g. 15 or 500000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewPromoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Activate Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
