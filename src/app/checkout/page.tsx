"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  User,
  ShieldCheck,
  CheckCircle,
  Truck,
  Store,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  Phone,
  CreditCard,
  QrCode,
  Building2,
  Wallet,
  Store as StoreIcon,
  Clock,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { useLocationStore } from "@/lib/store/useLocationStore";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { formatRupiah } from "@/lib/utils/currency";
import {
  MIDTRANS_PAYMENT_METHODS,
  MidtransPaymentChannel,
  generateMidtransPaymentDetails,
  MidtransGeneratedPayment,
} from "@/lib/payment/midtrans";

type CheckoutStep = "account" | "information" | "payment";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, login, register, isLoading: isAuthLoading } = useAuthStore();
  const {
    items,
    customPCs,
    getSubtotal,
    fulfillmentMethod,
    setFulfillmentMethod,
    clearCart,
  } = useCartStore();
  const { userLocation, selectedRate } = useLocationStore();

  const [step, setStep] = useState<CheckoutStep>("account");
  const [isGuest, setIsGuest] = useState(false);

  // Account Step Tabs: "signin" | "register" | "guest"
  const [authTab, setAuthTab] = useState<"signin" | "register" | "guest">("signin");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);

  // Register Form State
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regStreet, setRegStreet] = useState("");
  const [regSubdistrict, setRegSubdistrict] = useState("");
  const [regCity, setRegCity] = useState("Jakarta Pusat");
  const [regPostalCode, setRegPostalCode] = useState("");
  const [regError, setRegError] = useState<string | null>(null);

  // Information Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Address State
  const [streetAddress, setStreetAddress] = useState("");
  const [unitApt, setUnitApt] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [city, setCity] = useState("Jakarta Pusat");
  const [province, setProvince] = useState("DKI Jakarta");
  const [postalCode, setPostalCode] = useState("10730");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Midtrans Payment State
  const [selectedChannel, setSelectedChannel] = useState<MidtransPaymentChannel>("qris");
  const [activeInstructionTab, setActiveInstructionTab] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activePaymentDetails, setActivePaymentDetails] = useState<MidtransGeneratedPayment | null>(null);

  // Card Inputs (if credit card selected)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Populate from authenticated user on mount or change
  useEffect(() => {
    if (isAuthenticated && user) {
      setCustomerName(user.fullName || "");
      setCustomerEmail(user.email || "");
      setCustomerPhone(user.phone || "");

      if (user.address) {
        setStreetAddress(user.address.street || "");
        setUnitApt(user.address.unit || "");
        setSubdistrict(user.address.subdistrict || "");
        setCity(user.address.city || "Jakarta Pusat");
        setProvince(user.address.province || "DKI Jakarta");
        setPostalCode(user.address.postalCode || "10730");
        setDeliveryNotes(user.address.deliveryNotes || "");
      }
    } else if (userLocation) {
      // Use location store defaults if present
      if (userLocation.subdistrict) setSubdistrict(userLocation.subdistrict);
      if (userLocation.city) setCity(userLocation.city);
      if (userLocation.address) setStreetAddress(userLocation.address.split(",")[0]);
      if (userLocation.postalCode) setPostalCode(userLocation.postalCode);
    }
  }, [isAuthenticated, user, userLocation]);

  // Order Calculations
  const subtotal = getSubtotal();
  const shippingFee =
    fulfillmentMethod === "delivery"
      ? selectedRate
        ? selectedRate.price
        : 35000
      : 0;
  const grandTotal = subtotal + shippingFee;

  // Handle Login inside Checkout
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    if (!signInEmail || !signInPassword) {
      setSignInError("Please enter both email and password.");
      return;
    }

    const res = await login(signInEmail, signInPassword);
    if (res.success) {
      setIsGuest(false);
      setStep("information");
    } else {
      setSignInError(res.error || "Invalid credentials. Please try again.");
    }
  };

  // Handle Register inside Checkout
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (!regFullName || !regEmail || !regPassword || !regPhone) {
      setRegError("Please fill in all required registration fields.");
      return;
    }

    const res = await register({
      email: regEmail,
      password: regPassword,
      fullName: regFullName,
      phone: regPhone,
      street: regStreet || "Jl. Sudirman No. 1",
      subdistrict: regSubdistrict || "Tanah Abang",
      city: regCity || "Jakarta Pusat",
      province: "DKI Jakarta",
      postalCode: regPostalCode || "10250",
      marketingOptIn: true,
    });

    if (res.success) {
      setIsGuest(false);
      setCustomerName(regFullName);
      setCustomerEmail(regEmail);
      setCustomerPhone(regPhone);
      setStreetAddress(regStreet);
      setSubdistrict(regSubdistrict);
      setCity(regCity);
      setPostalCode(regPostalCode);
      setStep("information");
    } else {
      setRegError(res.error || "Registration could not be completed.");
    }
  };

  // Continue as Guest Handler
  const handleContinueAsGuest = () => {
    setIsGuest(true);
    setStep("information");
  };

  // Advance from Information to Payment Step
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError("Full customer name is required.");
      return;
    }
    if (!customerPhone.trim()) {
      setFormError("Valid Indonesian phone number is required.");
      return;
    }
    if (!customerEmail.trim()) {
      setFormError("Valid email address is required for official tax invoice and receipt.");
      return;
    }

    if (fulfillmentMethod === "delivery") {
      if (!streetAddress.trim()) {
        setFormError("Street address is required for courier dispatch.");
        return;
      }
      if (!subdistrict.trim()) {
        setFormError("Sub-district (Kecamatan) is required for accurate courier routing.");
        return;
      }
    }

    // Generate Midtrans preview details
    const tempOrderNum = `TET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const details = generateMidtransPaymentDetails(tempOrderNum, selectedChannel, grandTotal);
    setActivePaymentDetails(details);

    setStep("payment");
  };

  // Select Midtrans channel
  const handleSelectChannel = (channel: MidtransPaymentChannel) => {
    setSelectedChannel(channel);
    setActiveInstructionTab(0);
    const tempOrderNum = activePaymentDetails?.orderNumber || `TET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const details = generateMidtransPaymentDetails(tempOrderNum, channel, grandTotal);
    setActivePaymentDetails(details);
  };

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Final Midtrans Payment Execution
  const handleExecuteMidtransPayment = async () => {
    setIsProcessingPayment(true);
    try {
      // 1. Create order in database
      const createOrderRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            isGuest,
            customerId: isAuthenticated && user ? user.id : null,
          },
          shippingAddress: {
            street: streetAddress,
            unit: unitApt,
            subdistrict,
            city,
            province,
            postalCode,
            deliveryNotes,
          },
          fulfillmentType: fulfillmentMethod,
          items,
          customPCs,
          selectedRate,
          subtotal,
          shippingFee,
          total: grandTotal,
          notes: deliveryNotes,
        }),
      });

      const orderData = await createOrderRes.json();
      if (!createOrderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create order record.");
      }

      // 2. Charge via Midtrans Payment Gateway
      const chargeRes = await fetch("/api/checkout/midtrans/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          paymentChannel: selectedChannel,
          amount: grandTotal,
        }),
      });

      const chargeData = await chargeRes.json();
      if (!chargeRes.ok || !chargeData.success) {
        throw new Error(chargeData.error || "Midtrans payment verification failed.");
      }

      // 3. Clear cart and redirect to Order Success Page
      clearCart();
      router.push(
        `/checkout/success?orderNumber=${encodeURIComponent(chargeData.orderNumber)}&paymentId=${encodeURIComponent(chargeData.paymentId)}`
      );
    } catch (err: any) {
      alert(`Payment Processing Alert: ${err.message || "Something went wrong"}`);
      setIsProcessingPayment(false);
    }
  };

  // If cart is empty, show empty state
  if (items.length === 0 && customPCs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900">Your Shopping Cart is Empty</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          You have no items pending checkout. Add hardware components or configure a custom PC to proceed.
        </p>
        <Link
          href="/components"
          className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Components</span>
        </Link>
      </div>
    );
  }

  const currentMethod =
    MIDTRANS_PAYMENT_METHODS.find((m) => m.id === selectedChannel) ||
    MIDTRANS_PAYMENT_METHODS[0];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Checkout Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
              <Link href="/" className="hover:text-zinc-900">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Checkout</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-2.5">
              <span>Secure Checkout</span>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-Bit SSL Encrypted</span>
              </span>
            </h1>
          </div>

          {/* Step Progress Pills */}
          <div className="flex items-center gap-2">
            {/* Step 1: Account */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                step === "account"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white text-zinc-600 border border-slate-200"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Account</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            {/* Step 2: Information */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                step === "information"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white text-zinc-600 border border-slate-200"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Delivery & Address</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            {/* Step 3: Midtrans Payment */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                step === "payment"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white text-zinc-600 border border-slate-200"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Midtrans Payment</span>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Main Form Steps (Left) + Order Summary (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: ACTIVE STEP CONTENT */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* ----------------------------------------------------------------------- */}
            {/* STEP 1: ACCOUNT IDENTIFICATION (SIGN IN / REGISTER / GUEST) */}
            {/* ----------------------------------------------------------------------- */}
            {step === "account" && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
                {isAuthenticated && user ? (
                  /* Authenticated User Card */
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-black">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-zinc-900 truncate">
                            {user.fullName}
                          </span>
                          <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                            Logged In Profile
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {user.email} • {user.phone}
                        </p>
                      </div>
                    </div>

                    {user.address && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                          Saved Default Shipping Destination
                        </span>
                        <div className="font-bold text-zinc-900">
                          {user.address.street}, {user.address.unit ? `Unit ${user.address.unit}, ` : ""}
                          {user.address.subdistrict}, {user.address.city}, {user.address.province} {user.address.postalCode}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsGuest(false);
                          setStep("information");
                        }}
                        className="flex-1 py-3.5 px-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <span>Use This Account & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleContinueAsGuest}
                        className="py-3.5 px-6 bg-white hover:bg-slate-50 text-zinc-700 font-bold rounded-xl text-xs border border-slate-200 transition-colors"
                      >
                        Checkout as Guest Instead
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Unauthenticated: Choose Sign In, Register, or Guest */
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                        How would you like to check out?
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Log into your existing account, create a new profile for instant address sync & vouchers, or continue immediately as a guest.
                      </p>
                    </div>

                    {/* Mode Navigation Tabs */}
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setAuthTab("signin")}
                        className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                          authTab === "signin"
                            ? "bg-white text-zinc-900 shadow-xs"
                            : "text-slate-600 hover:text-zinc-900"
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthTab("register")}
                        className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                          authTab === "register"
                            ? "bg-white text-zinc-900 shadow-xs"
                            : "text-slate-600 hover:text-zinc-900"
                        }`}
                      >
                        Create Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthTab("guest")}
                        className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                          authTab === "guest"
                            ? "bg-white text-zinc-900 shadow-xs"
                            : "text-slate-600 hover:text-zinc-900"
                        }`}
                      >
                        Guest Checkout
                      </button>
                    </div>

                    {/* TAB 1: SIGN IN */}
                    {authTab === "signin" && (
                      <form onSubmit={handleSignIn} className="space-y-4 pt-2 animate-in fade-in">
                        {signInError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{signInError}</span>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">Email Address</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              required
                              value={signInEmail}
                              onChange={(e) => setSignInEmail(e.target.value)}
                              placeholder="you@domain.com"
                              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">Password</label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="password"
                              required
                              value={signInPassword}
                              onChange={(e) => setSignInPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isAuthLoading}
                          className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isAuthLoading ? (
                            <span>Logging In & Loading Location...</span>
                          ) : (
                            <>
                              <span>Sign In & Proceed</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>
                    )}

                    {/* TAB 2: REGISTER */}
                    {authTab === "register" && (
                      <form onSubmit={handleRegister} className="space-y-4 pt-2 animate-in fade-in">
                        {regError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{regError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-zinc-800 mb-1">Full Name *</label>
                            <input
                              type="text"
                              required
                              value={regFullName}
                              onChange={(e) => setRegFullName(e.target.value)}
                              placeholder="Budi Santoso"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-800 mb-1">Phone Number (WhatsApp) *</label>
                            <input
                              type="tel"
                              required
                              value={regPhone}
                              onChange={(e) => setRegPhone(e.target.value)}
                              placeholder="081234567890"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-zinc-800 mb-1">Email Address *</label>
                            <input
                              type="email"
                              required
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              placeholder="budi@gmail.com"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-800 mb-1">Create Password *</label>
                            <input
                              type="password"
                              required
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">Street Address</label>
                          <input
                            type="text"
                            value={regStreet}
                            onChange={(e) => setRegStreet(e.target.value)}
                            placeholder="Jl. Sudirman No. 45, RT 01/RW 02"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-zinc-800 mb-1">Sub-district (Kecamatan)</label>
                            <input
                              type="text"
                              value={regSubdistrict}
                              onChange={(e) => setRegSubdistrict(e.target.value)}
                              placeholder="Tanah Abang"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-800 mb-1">Postal Code</label>
                            <input
                              type="text"
                              value={regPostalCode}
                              onChange={(e) => setRegPostalCode(e.target.value)}
                              placeholder="10250"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isAuthLoading}
                          className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isAuthLoading ? (
                            <span>Creating Profile...</span>
                          ) : (
                            <>
                              <span>Register Account & Continue</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>
                    )}

                    {/* TAB 3: GUEST CHECKOUT */}
                    {authTab === "guest" && (
                      <div className="space-y-4 pt-2 animate-in fade-in">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 font-bold text-xs text-zinc-900">
                            <User className="w-4 h-4 text-emerald-600" />
                            <span>Fast Guest Checkout</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            No account creation required. Simply fill in your contact information and physical shipping address on the next step to receive your shipment.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleContinueAsGuest}
                          className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          <span>Continue as Guest Customer</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ----------------------------------------------------------------------- */}
            {/* STEP 2: CUSTOMER INFORMATION & ADDRESS */}
            {/* ----------------------------------------------------------------------- */}
            {step === "information" && (
              <form onSubmit={handleProceedToPayment} className="space-y-6 animate-in fade-in">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Card 1: Contact Details */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-base font-black text-zinc-900">Customer Contact Details</h2>
                    </div>
                    {isGuest ? (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        Guest Checkout
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Verified Member
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">Recipient Name *</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">WhatsApp Phone *</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">Email (For Invoice) *</label>
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Fulfillment Choice & Address */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-base font-black text-zinc-900">Fulfillment & Shipping Method</h2>
                    </div>
                  </div>

                  {/* Fulfillment Toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod("click_and_collect")}
                      className={`p-4 rounded-2xl border text-left text-xs transition-all flex flex-col gap-1.5 ${
                        fulfillmentMethod === "click_and_collect"
                          ? "bg-white border-zinc-900 ring-2 ring-zinc-900 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-zinc-900">
                        <Store className="w-4 h-4 text-emerald-600" />
                        <span>Click & Collect (FREE)</span>
                      </div>
                      <span className="text-[11px] text-slate-500 leading-snug">
                        Ready in <strong>60 Mins</strong> at Flagship Experience Store (Mangga Dua Mall Lt. 3 No. 36).
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod("delivery")}
                      className={`p-4 rounded-2xl border text-left text-xs transition-all flex flex-col gap-1.5 ${
                        fulfillmentMethod === "delivery"
                          ? "bg-white border-zinc-900 ring-2 ring-zinc-900 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-zinc-900">
                        <Truck className="w-4 h-4 text-zinc-800" />
                        <span>Courier Delivery</span>
                      </div>
                      <span className="text-[11px] text-slate-500 leading-snug">
                        Multi-courier transit via <strong>Biteship</strong> (Gojek, Grab, JNE, SiCepat, AnterAja).
                      </span>
                    </button>
                  </div>

                  {/* If Click & Collect */}
                  {fulfillmentMethod === "click_and_collect" && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-emerald-950">
                        <Zap className="w-4 h-4 text-emerald-600" />
                        <span>In-Store Counter Pickup Procedure</span>
                      </div>
                      <p className="text-emerald-800 leading-relaxed text-[11px]">
                        Upon payment completion, you will receive a unique 4-digit verification PIN and QR code via WhatsApp & Email. Present this PIN at Counter 1 of our Mangga Dua Flagship store for instant handoff.
                      </p>
                    </div>
                  )}

                  {/* If Courier Delivery: Address Inputs */}
                  {fulfillmentMethod === "delivery" && (
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-zinc-800 mb-1">
                          Street Address & Building / Unit *
                        </label>
                        <input
                          type="text"
                          required
                          value={streetAddress}
                          onChange={(e) => setStreetAddress(e.target.value)}
                          placeholder="Jl. Senopati No. 88, Gedung Cyber Lt. 4"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">
                            Sub-district (Kecamatan) *
                          </label>
                          <input
                            type="text"
                            required
                            value={subdistrict}
                            onChange={(e) => setSubdistrict(e.target.value)}
                            placeholder="Kebayoran Baru"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">City *</label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Jakarta Selatan"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">Postal Code</label>
                          <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="12190"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-800 mb-1">
                          Delivery Instructions / Landmarks (Optional)
                        </label>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="e.g. Leave with lobby security, fragile hardware"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                        />
                      </div>

                      {/* Selected Courier Summary */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="font-bold text-zinc-900">
                            {selectedRate
                              ? `${selectedRate.courierName} ${selectedRate.serviceName}`
                              : "Biteship Multi-Courier (Gojek / Grab / JNE)"}
                          </span>
                          <span className="text-slate-500">
                            {selectedRate ? `• ${selectedRate.etd}` : "• Same-day or Next-day"}
                          </span>
                        </div>
                        <span className="font-bold text-zinc-900">
                          {formatRupiah(shippingFee)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("account")}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-zinc-900 transition-colors py-3 px-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Account</span>
                  </button>

                  <button
                    type="submit"
                    className="py-3.5 px-8 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center gap-2"
                  >
                    <span>Continue to Midtrans Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* ----------------------------------------------------------------------- */}
            {/* STEP 3: MIDTRANS PAYMENT GATEWAY */}
            {/* ----------------------------------------------------------------------- */}
            {step === "payment" && (
              <div className="space-y-6 animate-in fade-in">
                {/* Midtrans Branded Header */}
                <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg space-y-4 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-black uppercase tracking-wider mb-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Official Midtrans Payment Gateway</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                        Select Payment Channel
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Licensed and regulated by Bank Indonesia. All transactions are settled in realtime.
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                        Grand Total Due
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {formatRupiah(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* All Midtrans Payment Channels Grid */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Available Midtrans Channels ({MIDTRANS_PAYMENT_METHODS.length} Options)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {MIDTRANS_PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => handleSelectChannel(method.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${
                          selectedChannel === method.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20"
                            : "bg-slate-50/80 hover:bg-slate-100 text-zinc-900 border-slate-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs truncate">
                              {method.name}
                            </span>
                            {method.badge && (
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  selectedChannel === method.id
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {method.badge}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[11px] truncate mt-0.5 ${
                              selectedChannel === method.id
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            {method.description}
                          </p>
                        </div>

                        <div className="shrink-0 mt-0.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              selectedChannel === method.id
                                ? "border-emerald-400 bg-emerald-400 text-zinc-900"
                                : "border-slate-300"
                            }`}
                          >
                            {selectedChannel === method.id && (
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Payment Channel Interactive Details */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">
                        Selected Method
                      </span>
                      <h3 className="text-lg font-black text-zinc-900 mt-0.5">
                        {currentMethod.name}
                      </h3>
                    </div>

                    <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                      {currentMethod.categoryName}
                    </span>
                  </div>

                  {/* CHANNEL 1: QRIS */}
                  {currentMethod.category === "qris" && (
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-center">
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
                        <div className="text-[10px] font-black text-zinc-900 uppercase tracking-wider mb-2">
                          QRIS STANDAR PEMBAYARAN NASIONAL
                        </div>
                        {/* Dynamic Stylized QR Representation */}
                        <div className="w-48 h-48 bg-zinc-900 rounded-xl p-3 flex items-center justify-center text-white relative">
                          <div className="w-full h-full bg-white rounded-lg p-2 flex flex-col items-center justify-center relative overflow-hidden">
                            <QrCode className="w-36 h-36 text-zinc-950" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="px-2 py-1 bg-zinc-900 text-emerald-400 text-[9px] font-black rounded border border-emerald-400 shadow-sm">
                                TETHERA
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-2">
                          NMID: ID1020023912853 • A01
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 max-w-sm space-y-1">
                        <p className="font-bold text-zinc-900">Scan with any supported e-wallet or banking app</p>
                        <p className="text-[11px] text-slate-500">
                          BCA Mobile, Livin' Mandiri, GoPay, OVO, DANA, ShopeePay, LinkAja, and all QRIS-enabled apps.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CHANNEL 2: VIRTUAL ACCOUNT */}
                  {currentMethod.category === "va" && (
                    <div className="space-y-4">
                      <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {currentMethod.id === "mandiri_bill" ? "Company Code & Bill Key" : "Virtual Account Number"}
                          </span>
                          <div className="text-2xl font-mono font-black text-emerald-400 tracking-wider mt-0.5">
                            {currentMethod.id === "mandiri_bill"
                              ? `${activePaymentDetails?.billerCode || "70012"} / ${activePaymentDetails?.billKey || "8912849102"}`
                              : activePaymentDetails?.vaNumber || "700128910284910"}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Merchant: <strong>Tethera Hardware (Midtrans)</strong>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              currentMethod.id === "mandiri_bill"
                                ? activePaymentDetails?.billKey || ""
                                : activePaymentDetails?.vaNumber || "",
                              "va"
                            )
                          }
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                        >
                          {copiedField === "va" ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Number</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Bank Step-by-Step Payment Instructions */}
                      {currentMethod.instructions.length > 0 && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                            Payment Instructions: {currentMethod.instructions[0].title}
                          </h4>
                          <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5">
                            {currentMethod.instructions[0].steps.map((stepText, i) => (
                              <li key={i} className="leading-relaxed">
                                {stepText}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CHANNEL 3: CREDIT / DEBIT CARD */}
                  {currentMethod.category === "card" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">
                            Card Number (Visa / Mastercard / JCB / Amex)
                          </label>
                          <div className="relative">
                            <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              maxLength={19}
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              placeholder="4000 1234 5678 9010"
                              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-zinc-800 mb-1">
                              Expiry Date (MM/YY)
                            </label>
                            <input
                              type="text"
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              placeholder="12/28"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-800 mb-1">
                              CVV / CVC (3-4 digits)
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                              placeholder="•••"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Protected by Midtrans 3D-Secure 2.0 with Bank One-Time OTP Verification.</span>
                      </div>
                    </div>
                  )}

                  {/* CHANNEL 4: E-WALLET / CONVENIENCE STORE / PAYLATER */}
                  {(currentMethod.category === "ewallet" ||
                    currentMethod.category === "store" ||
                    currentMethod.category === "paylater") && (
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      {currentMethod.category === "store" && (
                        <div className="p-4 bg-zinc-900 text-white rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              Payment Code
                            </span>
                            <div className="text-xl font-mono font-black text-emerald-400">
                              {activePaymentDetails?.paymentCode || "IND982149182"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(activePaymentDetails?.paymentCode || "", "code")
                            }
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                          >
                            {copiedField === "code" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      )}

                      <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        {currentMethod.instructions[0]?.title || "Payment Procedure"}
                      </h4>
                      <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5">
                        {currentMethod.instructions[0]?.steps.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Confirm & Process Payment Action Button */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setStep("information")}
                      className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-zinc-900 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Delivery Info</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteMidtransPayment}
                      disabled={isProcessingPayment}
                      className="w-full sm:w-auto py-4 px-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-lg hover:shadow-emerald-600/30 flex items-center justify-center gap-2.5 disabled:opacity-50"
                    >
                      {isProcessingPayment ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying Midtrans Settlement & Reserving Stock...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5" />
                          <span>Pay {formatRupiah(grandTotal)} via Midtrans</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: ITEMIZED ORDER SUMMARY */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5 sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-zinc-900" />
                  <h3 className="text-sm font-bold text-zinc-900">Order Summary</h3>
                </div>
                <span className="text-xs bg-slate-100 text-zinc-700 font-bold px-2 py-0.5 rounded-full">
                  {items.length + customPCs.length} items
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {/* Custom PCs */}
                {customPCs.map((pc) => (
                  <div
                    key={pc.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-zinc-900 truncate max-w-[180px]">
                        {pc.name}
                      </span>
                      <span className="font-black text-zinc-900">
                        {formatRupiah(pc.totalPrice)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {pc.serviceTier.name} (~{pc.wattage}W)
                    </p>
                  </div>
                ))}

                {/* Standard Items */}
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 text-xs py-1"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 p-1 shrink-0">
                      <img
                        src={it.item.image}
                        alt={it.item.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-zinc-900 truncate block">
                        {it.item.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Qty: {it.quantity} × {formatRupiah(it.item.price)}
                      </span>
                    </div>
                    <span className="font-bold text-zinc-900 shrink-0">
                      {formatRupiah(it.item.price * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-zinc-900">{formatRupiah(subtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>
                    Fulfillment (
                    {fulfillmentMethod === "click_and_collect"
                      ? "Click & Collect"
                      : selectedRate
                      ? selectedRate.courierName
                      : "Delivery"}
                    )
                  </span>
                  <span className="font-bold text-zinc-900">
                    {shippingFee === 0 ? "FREE" : formatRupiah(shippingFee)}
                  </span>
                </div>

                <div className="flex justify-between text-base font-black text-zinc-900 pt-3 border-t border-slate-200">
                  <span>Total Amount</span>
                  <span className="text-xl text-emerald-700">{formatRupiah(grandTotal)}</span>
                </div>
              </div>

              {/* Reassurance Footer */}
              <div className="pt-2 text-[11px] text-slate-500 space-y-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% Genuine Distributor Hardware Guaranteed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Bank Indonesia Licensed Midtrans Gateway</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

