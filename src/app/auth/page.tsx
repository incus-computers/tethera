"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  Tag,
  Building,
  Check,
  Compass,
  Laptop,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { CustomerSegment, HardwarePreference, NewsletterFrequency } from "@/lib/types/customer";

export default function AuthPage() {
  const router = useRouter();
  const { user, isAuthenticated, login, register, isLoading, error, clearError, initSession } =
    useAuthStore();

  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up Form State (Complete E-Commerce & CRM Fields)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Address
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [city, setCity] = useState("Jakarta Pusat");
  const [province, setProvince] = useState("DKI Jakarta");
  const [postalCode, setPostalCode] = useState("");
  const [addressLabel, setAddressLabel] = useState<"Home" | "Office" | "Workshop" | "Other">("Home");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // CRM & Marketing
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [customerSegment, setCustomerSegment] = useState<CustomerSegment>("gamer");
  const [hardwarePreference, setHardwarePreference] = useState<HardwarePreference>("intel_nvidia");
  const [newsletterFrequency, setNewsletterFrequency] = useState<NewsletterFrequency>("weekly");
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);

  // Active step for multi-step signup UX
  const [signUpStep, setSignUpStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/account");
    }
  }, [isAuthenticated, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const res = await login(signInEmail, signInPassword);
    if (res.success) {
      router.push("/account");
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (password && confirmPassword && password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const res = await register({
      email,
      password,
      fullName,
      phone,
      street,
      unit,
      subdistrict,
      city,
      province,
      postalCode,
      addressLabel,
      deliveryNotes,
      marketingOptIn,
      customerSegment,
      hardwarePreference,
      newsletterFrequency,
      whatsappUpdates,
    });

    if (res.success) {
      setSuccessMessage(res.message || "Account created successfully! Welcome email dispatched.");
      setTimeout(() => {
        router.push("/account");
      }, 1500);
    }
  };

  // Demo autofill for rapid testing
  const autofillDemoGamer = () => {
    setFullName("Reza Pratama");
    setEmail(`reza.gamer${Math.floor(100 + Math.random() * 900)}@techmail.com`);
    setPassword("Tethera2026!");
    setConfirmPassword("Tethera2026!");
    setPhone("+62 812-9988-7766");
    setStreet("Jl. Senopati Raya No. 42");
    setUnit("Tower B, Suite 15A");
    setSubdistrict("Kebayoran Baru");
    setCity("Jakarta Selatan");
    setProvince("DKI Jakarta");
    setPostalCode("12190");
    setAddressLabel("Home");
    setDeliveryNotes("Leave with lobby receptionist if not answering intercom");
    setMarketingOptIn(true);
    setCustomerSegment("gamer");
    setHardwarePreference("intel_nvidia");
    setNewsletterFrequency("weekly");
    setWhatsappUpdates(true);
  };

  const autofillDemoBuilder = () => {
    setFullName("Hendro Kusumo");
    setEmail(`hendro.rigs${Math.floor(100 + Math.random() * 900)}@overclock.id`);
    setPassword("Tethera2026!");
    setConfirmPassword("Tethera2026!");
    setPhone("+62 878-5544-3322");
    setStreet("Jl. Mangga Dua Raya No. 10");
    setUnit("Ruko Blok D-4");
    setSubdistrict("Sawah Besar");
    setCity("Jakarta Pusat");
    setProvince("DKI Jakarta");
    setPostalCode("10730");
    setAddressLabel("Workshop");
    setDeliveryNotes("Loading dock in rear alley, gate code 4090");
    setMarketingOptIn(true);
    setCustomerSegment("pc_builder");
    setHardwarePreference("amd");
    setNewsletterFrequency("drops_only");
    setWhatsappUpdates(true);
  };

  // Password strength helper
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const pwdScore = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div className="text-left">
              <span className="text-xl font-black tracking-tight text-white block leading-none">
                TETHERA
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                PC Studio & E-Commerce
              </span>
            </div>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {mode === "signup" ? "Create Your Tethera Member Profile" : "Welcome Back to Tethera"}
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-2">
            {mode === "signup"
              ? "Register your shipping address for instant courier checkout and unlock tailored CRM hardware drops."
              : "Sign in to access your saved PC builds, orders, and VIP member benefits."}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex p-1 bg-slate-900/90 border border-slate-800 rounded-xl mt-6">
            <button
              onClick={() => {
                setMode("signup");
                clearError();
              }}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === "signup"
                  ? "bg-emerald-500 text-zinc-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign Up (Complete Profile)
            </button>
            <button
              onClick={() => {
                setMode("signin");
                clearError();
              }}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === "signin"
                  ? "bg-emerald-500 text-zinc-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold">Authentication Notice</p>
              <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start gap-3 animate-in fade-in">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <p className="font-semibold">Welcome to Tethera!</p>
              <p className="text-xs text-emerald-300 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SIGN IN VIEW */}
        {/* ========================================================================= */}
        {mode === "signin" && (
          <div className="max-w-md mx-auto bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => alert("To reset password in demo, use demo quick accounts or re-register.")}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-400">Remember on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Logins for Fast Testing */}
            <div className="mt-6 pt-6 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3 text-center">
                One-Click Demo Customers
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSignInEmail("alex.gamer@example.com");
                    setSignInPassword("Password123!");
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left text-xs transition-colors group"
                >
                  <div className="font-bold text-white group-hover:text-emerald-400">
                    Alex Rivera
                  </div>
                  <div className="text-[10px] text-slate-400">Gamer • VIP Lead</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSignInEmail("budi.builder@techcorp.id");
                    setSignInPassword("Password123!");
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left text-xs transition-colors group"
                >
                  <div className="font-bold text-white group-hover:text-emerald-400">
                    Budi Santoso
                  </div>
                  <div className="text-[10px] text-slate-400">PC Builder • Workshop</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SIGN UP VIEW (Comprehensive CRM & E-Commerce Delivery Profile) */}
        {/* ========================================================================= */}
        {mode === "signup" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Progress & Benefits */}
            <div className="lg:col-span-4 space-y-4">
              {/* Step Navigator */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Registration Progress
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSignUpStep(1)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs transition-all ${
                      signUpStep === 1
                        ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold"
                        : "text-slate-400 hover:bg-slate-800/50"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        signUpStep === 1
                          ? "bg-emerald-500 text-zinc-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      1
                    </div>
                    <div>
                      <div className="text-white font-semibold">Account & Contact</div>
                      <div className="text-[11px] text-slate-400">Name, Email, Phone, Security</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignUpStep(2)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs transition-all ${
                      signUpStep === 2
                        ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold"
                        : "text-slate-400 hover:bg-slate-800/50"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        signUpStep === 2
                          ? "bg-emerald-500 text-zinc-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      2
                    </div>
                    <div>
                      <div className="text-white font-semibold">Shipping Address</div>
                      <div className="text-[11px] text-slate-400">Instant Courier & Delivery Handover</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignUpStep(3)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs transition-all ${
                      signUpStep === 3
                        ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold"
                        : "text-slate-400 hover:bg-slate-800/50"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        signUpStep === 3
                          ? "bg-emerald-500 text-zinc-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      3
                    </div>
                    <div>
                      <div className="text-white font-semibold">CRM & Hardware Profile</div>
                      <div className="text-[11px] text-slate-400">Voucher & Tailored Deal Alerts</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Instant Autofill Box */}
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Quick Test Registration</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fill all required e-commerce and CRM data with one click to test the full flow:
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={autofillDemoGamer}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold text-left transition-colors flex items-center justify-between"
                  >
                    <span>Autofill: Gamer Persona</span>
                    <span className="text-[10px] text-emerald-400">Reza • Jakarta</span>
                  </button>
                  <button
                    type="button"
                    onClick={autofillDemoBuilder}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold text-left transition-colors flex items-center justify-between"
                  >
                    <span>Autofill: PC Builder Persona</span>
                    <span className="text-[10px] text-amber-400">Hendro • Workshop</span>
                  </button>
                </div>
              </div>

              {/* Benefits Card */}
              <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-900/40 rounded-2xl p-5 space-y-3 text-xs">
                <div className="font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Member Privileges</span>
                </div>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Instant 10% voucher code emailed upon signup</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>60-Minute Click & Collect with secure 4-digit PIN</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Instant Gojek/Grab courier rate calculation for your address</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Custom PC Builder 24h stress test tracking</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column: Multi-Step Registration Form */}
            <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
              <form onSubmit={handleSignUpSubmit}>
                {/* ------------------------------------------------------------- */}
                {/* STEP 1: IDENTITY, CONTACT & SECURITY */}
                {/* ------------------------------------------------------------- */}
                {signUpStep === 1 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="border-b border-slate-800 pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-400" />
                        <span>Step 1: Contact & Security Credentials</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Your account identity and secure credentials.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Full Name <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Reza Pratama"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      {/* Email Address */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Email Address (CRM & Invoices) <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="reza@example.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Phone Number with WhatsApp Note */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Phone Number (For Courier Delivery & Verification PIN) <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+62 812-3456-7890"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Used for instant Gojek/Grab courier handover calls and Click & Collect SMS/WhatsApp codes.
                      </span>
                    </div>

                    {/* Password & Confirm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Password <span className="text-emerald-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 8 chars, 1 number"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Confirm Password <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Password strength meter */}
                    {password && (
                      <div className="space-y-1">
                        <div className="flex gap-1.5 h-1.5 w-full">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`h-full flex-1 rounded-full transition-colors ${
                                pwdScore >= step
                                  ? pwdScore >= 3
                                    ? "bg-emerald-500"
                                    : "bg-amber-500"
                                  : "bg-slate-800"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>Password Strength</span>
                          <span className={pwdScore >= 3 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                            {pwdScore >= 4 ? "Strong" : pwdScore >= 2 ? "Moderate" : "Weak"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!fullName || !email || !phone) {
                            alert("Please fill in your name, email, and phone before proceeding.");
                            return;
                          }
                          setSignUpStep(2);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-98"
                      >
                        <span>Next: Shipping Address</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* STEP 2: E-COMMERCE SHIPPING ADDRESS */}
                {/* ------------------------------------------------------------- */}
                {signUpStep === 2 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="border-b border-slate-800 pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span>Step 2: E-Commerce Delivery Address</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Essential for instant Gojek/Grab courier estimates, shipping labels, and billing.
                      </p>
                    </div>

                    {/* Address Label Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Address Nickname
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(["Home", "Office", "Workshop", "Other"] as const).map((label) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setAddressLabel(label)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              addressLabel === label
                                ? "bg-emerald-500 text-zinc-950"
                                : "bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Street Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Street Address (Building, Street, RT/RW) <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Jl. Senopati Raya No. 42"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Unit / Floor / Apt (Optional) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Unit, Floor, Apartment, or Suite (Optional)
                      </label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="e.g. Tower B, Suite 15A"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* District (Kecamatan), City, Province, Postal Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Subdistrict / District (Kecamatan) <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={subdistrict}
                          onChange={(e) => setSubdistrict(e.target.value)}
                          placeholder="e.g. Kebayoran Baru, Sawah Besar"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          City / Regency (Kota) <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Jakarta Selatan"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Province / State <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          placeholder="e.g. DKI Jakarta"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Postal Code (Kode Pos) <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="e.g. 12190"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Delivery Instructions */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Courier Delivery Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="e.g. Leave with building receptionist / security gate"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-4">
                      <button
                        type="button"
                        onClick={() => setSignUpStep(1)}
                        className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                      >
                        ← Back to Step 1
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!street || !city || !subdistrict || !postalCode) {
                            alert("Please fill in your street, subdistrict, city, and postal code.");
                            return;
                          }
                          setSignUpStep(3);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-98"
                      >
                        <span>Next: CRM & Hardware Profile</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* STEP 3: CRM MARKETING & HARDWARE PREFERENCES */}
                {/* ------------------------------------------------------------- */}
                {signUpStep === 3 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="border-b border-slate-800 pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-400" />
                        <span>Step 3: CRM Marketing & Hardware Profile</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Allows our CRM engine to send you tailored hardware clearance drops, custom build updates, and your 10% welcome voucher.
                      </p>
                    </div>

                    {/* Primary Interest Segment */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        What best describes your hardware computing focus?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          {
                            key: "gamer",
                            title: "🎮 Gaming & Esports",
                            desc: "High FPS, RTX 40-Series GPUs, OLED Displays",
                          },
                          {
                            key: "pc_builder",
                            title: "🛠️ Custom PC Enthusiast",
                            desc: "Watercooling, custom loops, ITX & Overclocking",
                          },
                          {
                            key: "creator",
                            title: "🎨 3D & Content Creation",
                            desc: "Blender, Premiere, DaVinci, Multi-core rendering",
                          },
                          {
                            key: "enterprise",
                            title: "💼 Workstation & AI",
                            desc: "Deep Learning, CAD, ECC memory, Multi-GPU",
                          },
                        ].map((seg) => (
                          <button
                            key={seg.key}
                            type="button"
                            onClick={() => setCustomerSegment(seg.key as CustomerSegment)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              customerSegment === seg.key
                                ? "bg-emerald-500/10 border-emerald-500 text-white shadow-sm"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <div className="font-bold text-xs text-white">{seg.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{seg.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hardware Ecosystem Preference */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Preferred Hardware Ecosystem
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: "intel_nvidia", label: "Intel + NVIDIA" },
                          { key: "amd", label: "AMD Ryzen + Radeon" },
                          { key: "all", label: "Open / Neutral" },
                        ].map((hw) => (
                          <button
                            key={hw.key}
                            type="button"
                            onClick={() => setHardwarePreference(hw.key as HardwarePreference)}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                              hardwarePreference === hw.key
                                ? "bg-emerald-500 text-zinc-950 font-bold border-emerald-500"
                                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            {hw.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Marketing Opt-In Checkbox (CRM Core) */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={marketingOptIn}
                          onChange={(e) => setMarketingOptIn(e.target.checked)}
                          className="mt-0.5 rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4 shrink-0"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">
                            Receive Tethera Hardware Drops & Exclusive CRM Deals (Recommended)
                          </span>
                          <span className="text-[11px] text-slate-400 leading-normal block mt-0.5">
                            Get early access to GPU restocks, custom PC flash bundles, and a 10% welcome promo code directly in your inbox.
                          </span>
                        </div>
                      </label>

                      {marketingOptIn && (
                        <div className="pl-7 pt-2 border-t border-slate-900 flex items-center gap-4 text-xs text-slate-400">
                          <span>Email Frequency:</span>
                          {(["weekly", "drops_only", "monthly"] as const).map((freq) => (
                            <label key={freq} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="freq"
                                checked={newsletterFrequency === freq}
                                onChange={() => setNewsletterFrequency(freq)}
                                className="text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-800"
                              />
                              <span className="capitalize">{freq.replace("_", " ")}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Notification Opt-In */}
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappUpdates}
                        onChange={(e) => setWhatsappUpdates(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4 shrink-0"
                      />
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          Send WhatsApp Courier Live Tracking & Pickup PIN
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Receive automated WhatsApp notifications when your order is dispatched or ready at Mangga Dua Mall.
                        </span>
                      </div>
                    </label>

                    {/* Submit Registration Button */}
                    <div className="flex justify-between items-center pt-4">
                      <button
                        type="button"
                        onClick={() => setSignUpStep(2)}
                        className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                      >
                        ← Back to Step 2
                      </button>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-98 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Complete Registration & Claim Voucher</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
