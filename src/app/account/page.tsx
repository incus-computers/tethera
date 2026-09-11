"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Tag,
  Zap,
  LogOut,
  CheckCircle,
  Truck,
  Edit3,
  Send,
  Users,
  BarChart3,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  Clock,
  Radio,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useLocationStore } from "@/lib/store/useLocationStore";
import { CustomerProfile, CustomerSegment, CrmCampaignLog } from "@/lib/types/customer";

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, updateProfile, initSession } = useAuthStore();
  const { setLocation } = useLocationStore();

  const [activeTab, setActiveTab] = useState<"overview" | "address" | "crm_preferences" | "crm_admin">(
    "overview"
  );

  // Address edit state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [addressSavedNotice, setAddressSavedNotice] = useState(false);

  // CRM preferences state
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [customerSegment, setCustomerSegment] = useState<CustomerSegment>("gamer");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  // CRM Admin Portal state
  const [crmCustomers, setCrmCustomers] = useState<CustomerProfile[]>([]);
  const [crmStats, setCrmStats] = useState<any>(null);
  const [crmCampaignLogs, setCrmCampaignLogs] = useState<CrmCampaignLog[]>([]);
  const [crmSearch, setCrmSearch] = useState("");
  const [crmSegmentFilter, setCrmSegmentFilter] = useState<string>("all");
  const [crmOptInOnly, setCrmOptInOnly] = useState(false);
  const [isLoadingCrm, setIsLoadingCrm] = useState(false);

  // Campaign Broadcaster State
  const [campaignSubject, setCampaignSubject] = useState(
    "🔥 Weekend VIP Drop: High-Performance RTX 4080 Builds Ready in 60m"
  );
  const [campaignHeadline, setCampaignHeadline] = useState(
    "Exclusive Weekend Hardware Allocation For Registered Members"
  );
  const [campaignPromo, setCampaignPromo] = useState("WEEKEND-POWER15");
  const [campaignSegment, setCampaignSegment] = useState<"all" | CustomerSegment | "opted_in">("opted_in");
  const [campaignBody, setCampaignBody] = useState(
    "We have just allocated a limited batch of custom water-cooled rigs and RTX 40-series cards at our Mangga Dua Mall Flagship Store.\n\nEnjoy an extra 15% off with code WEEKEND-POWER15 on all orders placed this weekend. Click & Collect orders are prepared and 24h stress-tested in 60 minutes."
  );
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return "2026-09-01";
    try {
      const d = new Date(dateStr);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    setIsMounted(true);
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (user) {
      setStreet(user.address?.street || "");
      setUnit(user.address?.unit || "");
      setSubdistrict(user.address?.subdistrict || "");
      setCity(user.address?.city || "");
      setProvince(user.address?.province || "");
      setPostalCode(user.address?.postalCode || "");
      setPhone(user.phone || "");
      setDeliveryNotes(user.address?.deliveryNotes || "");
      setMarketingOptIn(user.marketing?.marketingOptIn ?? true);
      setCustomerSegment(user.marketing?.customerSegment || "gamer");
    }
  }, [user]);

  // Load CRM data for admin panel
  const fetchCrmData = async () => {
    setIsLoadingCrm(true);
    try {
      const params = new URLSearchParams();
      if (crmSearch) params.append("search", crmSearch);
      if (crmSegmentFilter !== "all") params.append("segment", crmSegmentFilter);
      if (crmOptInOnly) params.append("optInOnly", "true");

      const res = await fetch(`/api/crm/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCrmCustomers(data.customers || []);
        setCrmStats(data.stats || null);
        setCrmCampaignLogs(data.campaignLogs || []);
      }
    } catch (err) {
      console.error("Failed to load CRM data:", err);
    } finally {
      setIsLoadingCrm(false);
    }
  };

  useEffect(() => {
    if (activeTab === "crm_admin") {
      fetchCrmData();
    }
  }, [activeTab, crmSegmentFilter, crmOptInOnly]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const res = await updateProfile({
      phone,
      address: {
        ...user.address,
        street,
        unit,
        subdistrict,
        city,
        province,
        postalCode,
        deliveryNotes,
      },
    });

    if (res.success) {
      setIsEditingAddress(false);
      setAddressSavedNotice(true);
      setTimeout(() => setAddressSavedNotice(false), 3000);

      // Also sync immediately into active courier shipping location
      setLocation({
        address: `${street}, ${subdistrict}`,
        city,
        subdistrict,
        postalCode,
        latitude: -6.2088,
        longitude: 106.8456,
      });
    }
  };

  const handleSaveMarketingPreferences = async (optIn: boolean, segment: CustomerSegment) => {
    if (!user) return;
    setMarketingOptIn(optIn);
    setCustomerSegment(segment);

    await updateProfile({
      marketing: {
        ...user.marketing,
        marketingOptIn: optIn,
        customerSegment: segment,
      },
    });
  };

  const handleSendTestMarketingEmail = async () => {
    if (!user) return;
    setIsSendingTestEmail(true);
    setTestEmailStatus(null);
    try {
      const res = await fetch("/api/crm/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName: "Test-Direct-Dispatch",
          subject: `⚡ Test CRM Drop for ${user.fullName}: Custom PC Deals`,
          headline: "Your Tethera CRM Marketing Connection is Active!",
          messageBody:
            "This is a test notification verifying that your email address is registered to receive tailored hardware promotions, custom rig drop alerts, and exclusive checkout vouchers.",
          promoCode: "VIP-CRM-TEST",
          targetSegment: "all",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailStatus(`Email dispatched successfully to ${user.email}! (Delivered/Mock logged)`);
      } else {
        setTestEmailStatus(`Failed to send: ${data.error}`);
      }
    } catch (err: any) {
      setTestEmailStatus(`Error: ${err.message}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleBroadcastCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);
    setBroadcastResult(null);

    try {
      const res = await fetch("/api/crm/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName: `Campaign-${Date.now()}`,
          subject: campaignSubject,
          headline: campaignHeadline,
          messageBody: campaignBody,
          promoCode: campaignPromo,
          targetSegment: campaignSegment,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBroadcastResult(`Pushed campaign out to ${data.sentCount} recipients!`);
        fetchCrmData();
      } else {
        setBroadcastResult(`Broadcast failed: ${data.error}`);
      }
    } catch (err: any) {
      setBroadcastResult(`Network error: ${err.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleSyncToActiveCourier = () => {
    if (user?.address) {
      setLocation({
        address: `${user.address.street}, ${user.address.subdistrict}`,
        city: user.address.city,
        subdistrict: user.address.subdistrict,
        postalCode: user.address.postalCode,
        latitude: -6.2088,
        longitude: 106.8456,
      });
      alert(`Active courier destination updated to: ${user.address.subdistrict}, ${user.address.city}`);
    }
  };

  // Ensure hydration match by rendering identical spinner until mounted
  if (!isMounted) {
    return (
      <div className="min-h-[80vh] bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not signed in, show clean authentication prompt
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[80vh] bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 mb-4">
            <User className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white">Sign In to Tethera</h2>
          <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed">
            Please sign in to manage your e-commerce shipping address, review your orders, and configure your CRM hardware drop subscriptions.
          </p>

          <div className="space-y-3">
            <Link
              href="/auth"
              className="block w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-98"
            >
              Sign In / Create Account
            </Link>
            <Link
              href="/"
              className="block w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
            >
              Return to Hardware Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* CUSTOMER PROFILE HEADER */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 font-black text-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white">{user.fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  {user.crm.status} Member
                </span>
              </div>
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {user.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {user.phone}
                </span>
                <span>•</span>
                <span className="text-slate-500">
                  Joined: {formatJoinedDate(user.crm?.registeredAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSyncToActiveCourier}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              title="Push this address into active courier destination for instant Gojek/Grab quotes"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Use Address for Delivery</span>
            </button>

            <button
              onClick={() => {
                logout();
                router.push("/auth");
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NAVIGATION TABS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "overview"
                ? "bg-emerald-500 text-zinc-950 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Account Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("address")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "address"
                ? "bg-emerald-500 text-zinc-950 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Shipping Address Book</span>
          </button>

          <button
            onClick={() => setActiveTab("crm_preferences")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "crm_preferences"
                ? "bg-emerald-500 text-zinc-950 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>CRM & Email Subscriptions</span>
          </button>

          {/* CRM Business Lead Portal (Store Management feature!) */}
          <button
            onClick={() => setActiveTab("crm_admin")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ml-auto ${
              activeTab === "crm_admin"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 border border-purple-800/40"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Store CRM Lead Portal & Email Broadcaster</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Total Orders
                </div>
                <div className="text-2xl font-black text-white mt-1">
                  {user.crm.totalOrders} Completed
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">
                  Click & Collect / Courier Active
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Saved Delivery Address
                </div>
                <div className="text-sm font-bold text-white mt-1 truncate">
                  {user.address.subdistrict}, {user.address.city}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {user.address.postalCode} • {user.address.label}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  CRM Marketing Status
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      user.marketing.marketingOptIn ? "bg-emerald-500" : "bg-slate-600"
                    }`}
                  />
                  <span className="text-sm font-bold text-white">
                    {user.marketing.marketingOptIn ? "Subscribed to Drops" : "Transactional Only"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 capitalize">
                  Segment: {user.marketing.customerSegment.replace("_", " ")}
                </div>
              </div>
            </div>

            {/* Exclusive Welcome Voucher Banner */}
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500 text-zinc-950 uppercase tracking-wide">
                  Your New Member Promo Code
                </span>
                <h3 className="text-lg font-black text-white">
                  10% Off Your Next Custom PC or Hardware Order
                </h3>
                <p className="text-xs text-slate-400">
                  Use coupon code at checkout or show it to staff at the Mangga Dua Mall Flagship Store.
                </p>
              </div>

              <div className="bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  Coupon Code
                </div>
                <div className="text-lg font-mono font-black text-emerald-400 tracking-wider">
                  WELCOME10-BUILD
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/builder"
                className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Custom PC Studio 2.0</h4>
                    <p className="text-xs text-slate-400">Build rig with automatic socket & clearance checks</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/components"
                className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Hardware Catalog</h4>
                    <p className="text-xs text-slate-400">Browse CPUs, GPUs, motherboards & in-stock parts</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SHIPPING ADDRESS BOOK */}
        {/* ========================================================================= */}
        {activeTab === "address" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Primary E-Commerce Delivery Address</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Used by Gojek, Grab, and courier dispatch for home delivery and billing.
                </p>
              </div>

              {!isEditingAddress && (
                <button
                  onClick={() => setIsEditingAddress(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Address</span>
                </button>
              )}
            </div>

            {addressSavedNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Address updated and synced with active delivery destination!</span>
              </div>
            )}

            {!isEditingAddress ? (
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {user.address.label} Address
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {user.phone}
                  </span>
                </div>

                <div className="text-sm font-semibold text-white">
                  {user.fullName}
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {user.address.street}
                  {user.address.unit ? `, ${user.address.unit}` : ""}
                  <br />
                  {user.address.subdistrict}, {user.address.city}
                  <br />
                  {user.address.province} {user.address.postalCode}
                  <br />
                  {user.address.country}
                </div>

                {user.address.deliveryNotes && (
                  <div className="pt-2 border-t border-slate-900 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Courier Note: </span>
                    {user.address.deliveryNotes}
                  </div>
                )}

                <div className="pt-3 flex gap-2">
                  <button
                    onClick={handleSyncToActiveCourier}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-sm"
                  >
                    Sync to Active Delivery Selector
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveAddress} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Phone Number (Courier Handover)
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Street Address
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Unit / Floor / Apt (Optional)
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Subdistrict / Kecamatan
                    </label>
                    <input
                      type="text"
                      required
                      value={subdistrict}
                      onChange={(e) => setSubdistrict(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Province
                    </label>
                    <input
                      type="text"
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Delivery Instructions / Landmark
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CRM MARKETING PREFERENCES */}
        {/* ========================================================================= */}
        {activeTab === "crm_preferences" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6 animate-in fade-in">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>CRM Marketing & Communication Subscriptions</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage how our CRM engine pushes out hardware drop alerts, newsletter digests, and custom PC discounts.
              </p>
            </div>

            {/* Marketing Toggle */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Hardware Promotional Emails</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Receive VIP flash sales, custom PC matrix releases, and restock notifications.
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleSaveMarketingPreferences(!marketingOptIn, customerSegment)
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    marketingOptIn ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      marketingOptIn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Segment Selector */}
              <div className="pt-4 border-t border-slate-900">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Your Primary Computing Interest:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["gamer", "pc_builder", "creator", "enterprise"] as CustomerSegment[]).map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => handleSaveMarketingPreferences(marketingOptIn, seg)}
                      className={`p-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        customerSegment === seg
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {seg.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Test Email Dispatch Action */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Send className="w-4 h-4 text-purple-400" />
                <span>Test CRM Email Dispatch</span>
              </div>
              <p className="text-xs text-slate-400">
                Test the CRM email delivery pipeline by pushing an instant sample marketing announcement to your email address ({user.email}).
              </p>

              <button
                onClick={handleSendTestMarketingEmail}
                disabled={isSendingTestEmail}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {isSendingTestEmail ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Me A Sample CRM Promo Email</span>
                  </>
                )}
              </button>

              {testEmailStatus && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs">
                  {testEmailStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: STORE CRM LEAD MANAGEMENT & CAMPAIGN BROADCASTER */}
        {/* ========================================================================= */}
        {activeTab === "crm_admin" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Admin Header Notice */}
            <div className="bg-purple-950/40 border border-purple-800/60 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500 text-white uppercase tracking-wide">
                    CRM Master Control
                  </span>
                  <h3 className="text-lg font-black text-white mt-1">
                    Store CRM Customer Intelligence & Campaign Pusher
                  </h3>
                  <p className="text-xs text-purple-200/80 mt-0.5">
                    Collect customer information upon registration, analyze audience segments, and broadcast targeted marketing drops.
                  </p>
                </div>

                <button
                  onClick={fetchCrmData}
                  className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 transition-colors"
                  title="Refresh CRM Data"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingCrm ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Stats Bar */}
              {crmStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  <div className="bg-slate-950/70 border border-purple-900/50 rounded-xl p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Leads</div>
                    <div className="text-xl font-black text-white">{crmStats.totalLeads}</div>
                  </div>

                  <div className="bg-slate-950/70 border border-purple-900/50 rounded-xl p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Opted-In Subscribers</div>
                    <div className="text-xl font-black text-emerald-400">
                      {crmStats.optedInCount} ({crmStats.optInRate}%)
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-purple-900/50 rounded-xl p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Gamer Segment</div>
                    <div className="text-xl font-black text-white">
                      {crmStats.segmentBreakdown?.gamer || 0}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-purple-900/50 rounded-xl p-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400">PC Builders</div>
                    <div className="text-xl font-black text-amber-400">
                      {crmStats.segmentBreakdown?.pc_builder || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Campaign Broadcaster Tool */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
                <div>
                  <h4 className="text-base font-bold text-white">
                    Broadcast Email Campaign to Registered Leads
                  </h4>
                  <p className="text-xs text-slate-400">
                    Push out high-converting marketing drops and voucher codes to opted-in customers.
                  </p>
                </div>
              </div>

              {broadcastResult && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{broadcastResult}</span>
                </div>
              )}

              <form onSubmit={handleBroadcastCampaign} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Subject Line
                    </label>
                    <input
                      type="text"
                      required
                      value={campaignSubject}
                      onChange={(e) => setCampaignSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Target Audience Segment
                    </label>
                    <select
                      value={campaignSegment}
                      onChange={(e) => setCampaignSegment(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="opted_in">All Opted-in Subscribers ({crmStats?.optedInCount || 0})</option>
                      <option value="gamer">Gaming & Esports Leads</option>
                      <option value="pc_builder">Custom PC Enthusiasts</option>
                      <option value="creator">Content Creators</option>
                      <option value="enterprise">Workstation & Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Headline Banner
                    </label>
                    <input
                      type="text"
                      required
                      value={campaignHeadline}
                      onChange={(e) => setCampaignHeadline(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      VIP Promo Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={campaignPromo}
                      onChange={(e) => setCampaignPromo(e.target.value)}
                      placeholder="e.g. FLASH-20"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Message Content
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={campaignBody}
                    onChange={(e) => setCampaignBody(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isBroadcasting}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50"
                  >
                    {isBroadcasting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Push Out Email Campaign Now</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Collected CRM Customers Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white">Registered CRM Leads & Customers</h4>
                  <p className="text-xs text-slate-400">
                    Collected via registration form with address, phone & marketing consent.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchCrmData()}
                    placeholder="Search name, email, city..."
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />

                  <select
                    value={crmSegmentFilter}
                    onChange={(e) => setCrmSegmentFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="all">All Segments</option>
                    <option value="gamer">Gamer</option>
                    <option value="pc_builder">PC Builder</option>
                    <option value="creator">Creator</option>
                    <option value="enterprise">Enterprise</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={crmOptInOnly}
                      onChange={(e) => setCrmOptInOnly(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-600"
                    />
                    <span>Opted-In Only</span>
                  </label>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Delivery Location</th>
                      <th className="py-3 px-4">Segment</th>
                      <th className="py-3 px-4">Email Opt-In</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {crmCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{cust.fullName}</div>
                          <div className="text-[10px] text-slate-500">ID: {cust.id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{cust.email}</div>
                          <div className="text-[10px] text-slate-400">{cust.phone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white">{cust.address.city}</div>
                          <div className="text-[10px] text-slate-400">
                            {cust.address.subdistrict}, {cust.address.postalCode}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {cust.marketing.customerSegment.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {cust.marketing.marketingOptIn ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                              <Check className="w-3 h-3" />
                              <span>Subscribed</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">Unsubscribed</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {cust.crm.status}
                          </span>
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
    </div>
  );
}

function Check(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );
}
