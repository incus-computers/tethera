"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Mail,
  Phone,
  LogOut,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Store,
  X,
  FileText,
  Sliders,
  Check,
  Building,
  Home,
  Briefcase,
  Wrench,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useLocationStore } from "@/lib/store/useLocationStore";
import { formatRupiah } from "@/lib/utils/currency";
import { CustomerSegment } from "@/lib/types/customer";

interface OrderItemEnriched {
  id: string;
  order_id: string;
  product_id?: string | null;
  custom_build_id?: string | null;
  quantity: number;
  unit_price: number;
  is_custom_build: boolean;
  product?: {
    id: string;
    name: string;
    sku: string;
    brand: string;
    images?: string[];
    retail_price: number;
    pc_builder_slot?: string | null;
  } | null;
  customBuild?: {
    id: string;
    build_name?: string;
    platform?: string;
    total_price?: number;
    share_slug?: string;
    configuration?: Record<string, string>;
  } | null;
}

interface EnrichedOrder {
  id: string;
  order_number: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfillment_type: "delivery" | "click_and_collect";
  pickup_store_id?: string | null;
  pickup_code?: string | null;
  shipping_address?: {
    street?: string;
    unit?: string;
    subdistrict?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    deliveryNotes?: string;
  } | null;
  courier_info?: {
    provider?: string;
    service_name?: string;
    service_code?: string;
    tracking_id?: string;
    status?: string;
    estimated_arrival?: string;
    driver_name?: string;
    driver_phone?: string;
    vehicle_plate?: string;
  } | null;
  subtotal: number;
  shipping_fee: number;
  assembly_fee: number;
  total: number;
  status: string;
  payment_method?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  created_at: string;
  paid_at?: string | null;
  items: OrderItemEnriched[];
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, updateProfile, initSession } = useAuthStore();
  const { setLocation } = useLocationStore();

  const [activeTab, setActiveTab] = useState<"current_orders" | "order_history" | "personal_data" | "address" | "preferences">("current_orders");

  // Orders State
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<EnrichedOrder | null>(null);

  // Personal Info Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [personalSaveNotice, setPersonalSaveNotice] = useState<string | null>(null);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Address Form State
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressLabel, setAddressLabel] = useState<"Home" | "Office" | "Workshop" | "Other">("Home");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [addressSaveNotice, setAddressSaveNotice] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Notification Preferences State
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [prefSaveNotice, setPrefSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    initSession();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["current_orders", "order_history", "personal_data", "address", "preferences"].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [initSession]);

  // Sync user profile state
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setPhone(user.phone || "");
      setStreet(user.address?.street || "");
      setUnit(user.address?.unit || "");
      setSubdistrict(user.address?.subdistrict || "");
      setCity(user.address?.city || "");
      setProvince(user.address?.province || "");
      setPostalCode(user.address?.postalCode || "");
      setAddressLabel((user.address?.label as any) || "Home");
      setDeliveryNotes(user.address?.deliveryNotes || "");
      setMarketingOptIn(user.marketing?.marketingOptIn ?? true);
    }
  }, [user]);

  // Fetch orders for customer
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setIsLoadingOrders(true);
    setOrdersError(null);

    try {
      const params = new URLSearchParams();
      if (user.email) params.append("email", user.email);
      if (user.id) params.append("customerId", user.id);

      const res = await fetch(`/api/account/orders?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrdersError(data.error || "Could not load orders.");
      }
    } catch (err: any) {
      setOrdersError(err.message || "Network error loading orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  // Separate active vs past orders
  const isPastStatus = (st: string) =>
    ["delivery_arrived", "collected", "cancelled", "refunded"].includes(st);

  const currentOrders = orders.filter((o) => !isPastStatus(o.status));
  const pastOrders = orders.filter((o) => isPastStatus(o.status));

  // Save Personal Info
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingPersonal(true);
    setPersonalSaveNotice(null);

    const res = await updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
    });

    setIsSavingPersonal(false);
    if (res.success) {
      setPersonalSaveNotice("Personal information updated successfully.");
      setTimeout(() => setPersonalSaveNotice(null), 3000);
    } else {
      setPersonalSaveNotice(res.error || "Failed to update profile.");
    }
  };

  // Save Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingAddress(true);
    setAddressSaveNotice(null);

    const newAddress = {
      ...user.address,
      street: street.trim(),
      unit: unit.trim(),
      subdistrict: subdistrict.trim(),
      city: city.trim(),
      province: province.trim(),
      postalCode: postalCode.trim(),
      label: addressLabel,
      deliveryNotes: deliveryNotes.trim(),
    };

    const res = await updateProfile({
      phone: phone.trim(),
      address: newAddress,
    });

    setIsSavingAddress(false);
    if (res.success) {
      // Sync with location store for instant courier estimation
      setLocation({
        address: `${street}, ${subdistrict}`,
        city: city || "Jakarta Pusat",
        subdistrict: subdistrict || "Sawah Besar",
        postalCode: postalCode || "10730",
        latitude: -6.1352,
        longitude: 106.8294,
      });

      setAddressSaveNotice("Shipping address saved and synced for courier deliveries.");
      setTimeout(() => setAddressSaveNotice(null), 3500);
    } else {
      setAddressSaveNotice(res.error || "Failed to save address.");
    }
  };

  // Save Notification Preferences
  const handleSavePreferences = async (newOptIn: boolean) => {
    if (!user) return;
    setMarketingOptIn(newOptIn);
    setPrefSaveNotice(null);

    const res = await updateProfile({
      marketing: {
        ...user.marketing,
        marketingOptIn: newOptIn,
      },
    });

    if (res.success) {
      setPrefSaveNotice("Notification preferences updated.");
      setTimeout(() => setPrefSaveNotice(null), 2500);
    }
  };

  // Sync to courier selector
  const handlePushAddressToCourier = () => {
    if (!user?.address?.street) {
      alert("Please enter and save your street address first.");
      return;
    }
    setLocation({
      address: `${user.address.street}, ${user.address.subdistrict}`,
      city: user.address.city,
      subdistrict: user.address.subdistrict,
      postalCode: user.address.postalCode,
      latitude: -6.1352,
      longitude: 106.8294,
    });
    alert("Saved address loaded into courier delivery selector.");
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Status human label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "order_received":
      case "pending_payment":
        return { label: "Order Placed", color: "text-amber-400 bg-amber-950/40 border-amber-800/60" };
      case "payment_received":
      case "order_accepted":
        return { label: "Payment Confirmed", color: "text-blue-400 bg-blue-950/40 border-blue-800/60" };
      case "finding_stock":
        return { label: "Allocating Stock", color: "text-blue-400 bg-blue-950/40 border-blue-800/60" };
      case "assembly_in_progress":
        return { label: "Rig Assembly in Progress", color: "text-purple-400 bg-purple-950/40 border-purple-800/60" };
      case "testing_bench":
        return { label: "BIOS & 24h Stress Testing", color: "text-purple-400 bg-purple-950/40 border-purple-800/60" };
      case "ready_for_pickup":
        return { label: "Ready for Store Pickup", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60" };
      case "finding_courier":
        return { label: "Dispatching Courier", color: "text-cyan-400 bg-cyan-950/40 border-cyan-800/60" };
      case "on_delivery":
      case "shipped":
        return { label: "Out for Delivery", color: "text-cyan-400 bg-cyan-950/40 border-cyan-800/60" };
      case "delivery_arrived":
      case "collected":
        return { label: "Completed", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60" };
      case "cancelled":
        return { label: "Cancelled", color: "text-red-400 bg-red-950/40 border-red-800/60" };
      case "refunded":
        return { label: "Refunded", color: "text-zinc-400 bg-zinc-900 border-zinc-800" };
      default:
        return { label: status.replace(/_/g, " "), color: "text-zinc-300 bg-zinc-900 border-zinc-800" };
    }
  };

  // Step tracker calculation (0 to 4)
  const getOrderStep = (status: string, fulfillmentType: "delivery" | "click_and_collect") => {
    if (["order_received", "pending_payment"].includes(status)) return 0;
    if (["payment_received", "order_accepted", "finding_stock"].includes(status)) return 1;
    if (["assembly_in_progress", "testing_bench"].includes(status)) return 2;
    if (["finding_courier", "on_delivery", "shipped", "ready_for_pickup"].includes(status)) return 3;
    if (["delivery_arrived", "collected"].includes(status)) return 4;
    return 1;
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-zinc-900/70 border border-zinc-800 rounded-xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-300 mb-4">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-white">Sign in to Tethera</h2>
          <p className="text-sm text-zinc-400 mt-2 mb-6">
            Sign in to track your current orders, review order history, and update your personal details.
          </p>

          <div className="space-y-3">
            <Link
              href="/auth"
              className="block w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Sign in or create account
            </Link>
            <Link
              href="/"
              className="block w-full py-2 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              Return to store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="w-full max-w-[1920px] mx-auto space-y-6">
        {/* Profile Header Summary */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 text-white font-bold text-lg flex items-center justify-center">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">{user.fullName}</h1>
              <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  {user.email}
                </span>
                {user.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      {user.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                logout();
                router.push("/auth");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("current_orders")}
            className="p-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Active Orders</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {currentOrders.length}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {currentOrders.length > 0 ? "Tracking live in progress" : "No orders pending"}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("order_history")}
            className="p-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Past Orders</span>
              <FileText className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {pastOrders.length}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Completed and fulfilled
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("address")}
            className="p-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Delivery Address</span>
              <MapPin className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-1 truncate">
              {user.address?.street ? `${user.address.street}` : "No address saved"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
              {user.address?.city ? `${user.address.city}, ${user.address.postalCode}` : "Add an address for fast checkout"}
            </div>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-zinc-800 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setActiveTab("current_orders")}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              activeTab === "current_orders"
                ? "bg-zinc-800 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span>Current orders</span>
            {currentOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-zinc-950 font-bold">
                {currentOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("order_history")}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              activeTab === "order_history"
                ? "bg-zinc-800 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Order history</span>
          </button>

          <button
            onClick={() => setActiveTab("personal_data")}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              activeTab === "personal_data"
                ? "bg-zinc-800 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span>Personal details</span>
          </button>

          <button
            onClick={() => setActiveTab("address")}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              activeTab === "address"
                ? "bg-zinc-800 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            <span>Shipping address</span>
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              activeTab === "preferences"
                ? "bg-zinc-800 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span>Preferences</span>
          </button>

          <button
            type="button"
            onClick={fetchOrders}
            title="Refresh Orders"
            className="ml-auto p-2 text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: CURRENT ORDERS (LIVE TRACKING) */}
        {/* ========================================================================= */}
        {activeTab === "current_orders" && (
          <div className="space-y-4">
            {isLoadingOrders && orders.length === 0 && (
              <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-xl">
                <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Loading your current orders...</p>
              </div>
            )}

            {ordersError && (
              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{ordersError}</span>
              </div>
            )}

            {!isLoadingOrders && currentOrders.length === 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-10 text-center">
                <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white">No active orders</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  You do not have any orders in transit or awaiting pickup right now.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <Link
                    href="/components"
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors"
                  >
                    Browse components
                  </Link>
                  <Link
                    href="/builder"
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors"
                  >
                    PC configurator
                  </Link>
                </div>
              </div>
            )}

            {currentOrders.map((order) => {
              const statusInfo = getStatusLabel(order.status);
              const currentStep = getOrderStep(order.status, order.fulfillment_type);
              const isDelivery = order.fulfillment_type === "delivery";

              const steps = isDelivery
                ? ["Placed", "Confirmed", "Assembling / Prep", "On delivery", "Delivered"]
                : ["Placed", "Confirmed", "Assembling / Prep", "Ready for pickup", "Collected"];

              return (
                <div
                  key={order.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 hover:border-zinc-700 transition-colors"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-tight">
                          {order.order_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Placed on {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-white">
                        {formatRupiah(order.total)}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {isDelivery ? "Courier delivery" : "Store Click & Collect"}
                      </div>
                    </div>
                  </div>

                  {/* Visual Stepper Tracker */}
                  <div className="pt-1 pb-2">
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {steps.map((stepName, idx) => {
                        const isDone = idx < currentStep;
                        const isCurrent = idx === currentStep;
                        return (
                          <div key={stepName} className="space-y-1.5">
                            <div className="flex items-center">
                              <div
                                className={`w-full h-1 rounded-full ${
                                  idx === 0
                                    ? "bg-transparent"
                                    : idx <= currentStep
                                    ? "bg-emerald-500"
                                    : "bg-zinc-800"
                                }`}
                              />
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                  isDone
                                    ? "bg-emerald-500 text-zinc-950"
                                    : isCurrent
                                    ? "bg-emerald-400 text-zinc-950 ring-4 ring-emerald-500/20"
                                    : "bg-zinc-800 text-zinc-500"
                                }`}
                              >
                                {isDone ? "✓" : idx + 1}
                              </div>
                              <div
                                className={`w-full h-1 rounded-full ${
                                  idx === steps.length - 1
                                    ? "bg-transparent"
                                    : idx < currentStep
                                    ? "bg-emerald-500"
                                    : "bg-zinc-800"
                                }`}
                              />
                            </div>
                            <p
                              className={`text-[11px] leading-tight ${
                                isCurrent
                                  ? "text-white font-semibold"
                                  : isDone
                                  ? "text-zinc-300"
                                  : "text-zinc-600"
                              }`}
                            >
                              {stepName}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fulfillment Specific Card: Courier or Pickup PIN */}
                  {isDelivery ? (
                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <Truck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-zinc-200">
                            {order.courier_info?.service_name || "Express Courier"}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {order.courier_info?.tracking_id ? (
                              <span>Tracking ID: <span className="font-mono text-zinc-300">{order.courier_info.tracking_id}</span></span>
                            ) : (
                              <span>Driver dispatching from fulfillment hub</span>
                            )}
                          </div>
                          {order.shipping_address?.street && (
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              Destination: {order.shipping_address.street}, {order.shipping_address.subdistrict}
                            </div>
                          )}
                        </div>
                      </div>

                      {order.courier_info?.estimated_arrival && (
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Estimated</span>
                          <span className="text-xs font-semibold text-emerald-400">{order.courier_info.estimated_arrival}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <Store className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-zinc-200">
                            Flagship Experience Center
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            Ready in 60 minutes for collected pickup
                          </div>
                        </div>
                      </div>

                      {order.pickup_code && (
                        <div className="text-right bg-zinc-900 border border-zinc-700/80 px-3 py-1.5 rounded-lg">
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Pickup PIN</span>
                          <span className="text-sm font-mono font-bold text-emerald-400 tracking-wider">
                            {order.pickup_code}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items Preview */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-medium text-zinc-400">
                      Items in this order ({order.items.length}):
                    </div>
                    <div className="space-y-1.5">
                      {order.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/40 last:border-none"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="text-zinc-500 font-mono text-[11px]">
                              {item.quantity}x
                            </span>
                            <span className="text-zinc-200 truncate">
                              {item.is_custom_build
                                ? (item.customBuild?.build_name || "Custom Rig Configuration")
                                : (item.product?.name || "Hardware Component")}
                            </span>
                          </div>
                          <span className="text-zinc-400 whitespace-nowrap">
                            {formatRupiah(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-[11px] text-zinc-500 pt-0.5">
                          + {order.items.length - 3} more item(s)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View order details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ORDER HISTORY (COMPLETED & PREVIOUS) */}
        {/* ========================================================================= */}
        {activeTab === "order_history" && (
          <div className="space-y-4">
            {pastOrders.length === 0 ? (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-10 text-center">
                <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white">No previous orders</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Once your current orders are fulfilled or completed, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastOrders.map((order) => {
                  const statusInfo = getStatusLabel(order.status);
                  return (
                    <div
                      key={order.id}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 hover:border-zinc-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {order.order_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {formatDate(order.created_at)} • {order.items.length} item(s) • {order.fulfillment_type === "delivery" ? "Courier" : "Store Pickup"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">
                            {formatRupiah(order.total)}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {order.payment_method || "Paid"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PERSONAL DETAILS */}
        {/* ========================================================================= */}
        {activeTab === "personal_data" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Personal Information</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Update your contact details for order notifications and receipts.
              </p>
            </div>

            {personalSaveNotice && (
              <div
                role="status"
                className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{personalSaveNotice}</span>
              </div>
            )}

            <form onSubmit={handleSavePersonal} className="space-y-4 max-w-lg">
              <div>
                <label htmlFor="account-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="account-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="account-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="account-email"
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-400 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Email address serves as your sign-in identifier and cannot be edited directly.
                </p>
              </div>

              <div>
                <label htmlFor="account-phone" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="account-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62 812-3456-7890"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Used by couriers for live delivery coordination.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingPersonal}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-semibold text-xs transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {isSavingPersonal ? "Saving..." : "Save personal details"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SHIPPING ADDRESS BOOK */}
        {/* ========================================================================= */}
        {activeTab === "address" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Default Shipping Address</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Saved address for instant courier checkout (JNE, SiCepat, Gojek, Grab).
                </p>
              </div>

              <button
                type="button"
                onClick={handlePushAddressToCourier}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Load into delivery selector</span>
              </button>
            </div>

            {addressSaveNotice && (
              <div
                role="status"
                className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{addressSaveNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Address label
                </label>
                <div className="flex gap-2">
                  {(["Home", "Office", "Workshop", "Other"] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressLabel(lbl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                        addressLabel === lbl
                          ? "bg-zinc-800 border-zinc-600 text-white font-semibold"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="address-street" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Street address
                </label>
                <input
                  id="address-street"
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Jl. Mangga Dua Raya No. 42"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="address-unit" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Unit / Suite / Floor (Optional)
                  </label>
                  <input
                    id="address-unit"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Floor 2, Apt 12B"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="address-subdistrict" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Subdistrict (Kecamatan / Kelurahan)
                  </label>
                  <input
                    id="address-subdistrict"
                    type="text"
                    required
                    value={subdistrict}
                    onChange={(e) => setSubdistrict(e.target.value)}
                    placeholder="Sawah Besar"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="address-city" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    City
                  </label>
                  <input
                    id="address-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jakarta Pusat"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="address-province" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Province
                  </label>
                  <input
                    id="address-province"
                    type="text"
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="DKI Jakarta"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="address-postal" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Postal code
                  </label>
                  <input
                    id="address-postal"
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="10730"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address-notes" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Courier delivery notes (Optional)
                </label>
                <textarea
                  id="address-notes"
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Ring lobby intercom, leave with reception if away"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-semibold text-xs transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {isSavingAddress ? "Saving address..." : "Save address"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PREFERENCES */}
        {/* ========================================================================= */}
        {activeTab === "preferences" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Email & Notification Preferences</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Choose the hardware announcements, restock alerts, and rig guides you wish to receive.
              </p>
            </div>

            {prefSaveNotice && (
              <div
                role="status"
                className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{prefSaveNotice}</span>
              </div>
            )}

            <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Hardware Release & Drop Alerts</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Receive email notifications about factory-sealed GPU drops and limited component batches.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSavePreferences(!marketingOptIn)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    marketingOptIn ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      marketingOptIn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ORDER DETAILS MODAL */}
        {/* ========================================================================= */}
        {selectedOrder && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-xl text-zinc-100">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedOrder.order_number}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Placed on {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Fulfillment Banner */}
              <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Status</span>
                  <span className="font-semibold text-white">
                    {getStatusLabel(selectedOrder.status).label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Fulfillment</span>
                  <span className="font-semibold text-white">
                    {selectedOrder.fulfillment_type === "delivery" ? "Courier Delivery" : "Store Click & Collect"}
                  </span>
                </div>
              </div>

              {/* Pickup Code or Courier Waybill */}
              {selectedOrder.pickup_code && (
                <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-400 font-semibold block">Store Pickup PIN</span>
                    <span className="text-[11px] text-zinc-400">Present at Mangga Dua Flagship Counter 1</span>
                  </div>
                  <span className="text-base font-mono font-bold text-emerald-400">
                    {selectedOrder.pickup_code}
                  </span>
                </div>
              )}

              {selectedOrder.courier_info && (
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                  <div className="font-medium text-zinc-200">
                    {selectedOrder.courier_info.service_name || "Courier Service"}
                  </div>
                  {selectedOrder.courier_info.tracking_id && (
                    <div className="text-zinc-400 text-[11px]">
                      Tracking ID: <span className="font-mono text-zinc-200">{selectedOrder.courier_info.tracking_id}</span>
                    </div>
                  )}
                  {selectedOrder.shipping_address?.street && (
                    <div className="text-zinc-400 text-[11px]">
                      Destination: {selectedOrder.shipping_address.street}, {selectedOrder.shipping_address.subdistrict}, {selectedOrder.shipping_address.city}
                    </div>
                  )}
                </div>
              )}

              {/* Itemized List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-300 block">Items Purchased</span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-500">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-white line-clamp-1">
                            {item.is_custom_build
                              ? (item.customBuild?.build_name || "Custom Gaming Rig")
                              : (item.product?.name || "Hardware Component")}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            Quantity: {item.quantity} × {formatRupiah(item.unit_price)}
                          </div>
                        </div>
                      </div>
                      <span className="font-semibold text-zinc-200 whitespace-nowrap">
                        {formatRupiah(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-zinc-800 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatRupiah(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.shipping_fee > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Shipping Fee</span>
                    <span>{formatRupiah(selectedOrder.shipping_fee)}</span>
                  </div>
                )}
                {selectedOrder.assembly_fee > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Assembly & Stress Testing Fee</span>
                    <span>{formatRupiah(selectedOrder.assembly_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-800">
                  <span>Total</span>
                  <span className="text-emerald-400">{formatRupiah(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
