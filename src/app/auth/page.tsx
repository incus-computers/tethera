"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Building,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { CustomerAddress } from "@/lib/types/customer";

type AuthMode = "signup" | "signin";
type SignupStep = "credentials" | "otp" | "details";

const DISCOVERY_OPTIONS = [
  { id: "youtube", label: "YouTube (reviews and build guides)" },
  { id: "google", label: "Google search" },
  { id: "social", label: "Social media (Instagram, TikTok, X)" },
  { id: "friend", label: "Friend or colleague recommendation" },
  { id: "community", label: "Tech community (Reddit, Discord, forums)" },
  { id: "event", label: "Showroom or tech event" },
  { id: "other", label: "Other" },
];

const ADDRESS_LABELS: CustomerAddress["label"][] = [
  "Home",
  "Office",
  "Workshop",
  "Other",
];

export default function AuthPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    login,
    register,
    isLoading,
    error: storeError,
    clearError,
    initSession,
  } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>("signup");
  const [step, setStep] = useState<SignupStep>("credentials");
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals for legal agreements
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Phase 1: Credentials
  const [initialIdentifier, setInitialIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [channel, setChannel] = useState<"email" | "phone">("email");

  // Phase 2: OTP Verification
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [maskedDestination, setMaskedDestination] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Phase 3: Personal, Delivery, Discovery, and Consents
  const [fullName, setFullName] = useState("");
  const [secondaryIdentifier, setSecondaryIdentifier] = useState("");
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressLabel, setAddressLabel] = useState<CustomerAddress["label"]>("Home");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const [leadSource, setLeadSource] = useState("youtube");
  const [otherSourceText, setOtherSourceText] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Sign In Tab Form State
  const [signInIdentifier, setSignInIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/account");
    }
  }, [isAuthenticated, router]);

  // Handle countdown for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const activeError = localError || storeError;

  const resetLocalState = () => {
    setLocalError(null);
    clearError();
    setSuccessMessage(null);
  };

  // Phase 1: Submit Credentials -> Send OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetLocalState();

    const trimmed = initialIdentifier.trim();
    if (!trimmed) {
      setLocalError("Please enter your email address or phone number.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters long.");
      return;
    }

    const isEmail = trimmed.includes("@");
    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        setLocalError("Please enter a valid email address.");
        return;
      }
    } else {
      const cleanDigits = trimmed.replace(/[^0-9]/g, "");
      if (cleanDigits.length < 8) {
        setLocalError("Please enter a valid phone number with at least 8 digits.");
        return;
      }
    }

    const detectedChannel = isEmail ? "email" : "phone";
    setChannel(detectedChannel);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setLocalError(data.error || "Failed to dispatch verification code.");
        setIsSubmitting(false);
        return;
      }

      setMaskedDestination(data.destination || trimmed);
      setDemoCode(data.demoCode || null);
      setResendCooldown(30);
      setStep("otp");
      setIsSubmitting(false);

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch {
      setLocalError("Network error sending verification code. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Phase 2: Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    resetLocalState();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: initialIdentifier.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setDemoCode(data.demoCode || null);
        setResendCooldown(30);
        setSuccessMessage(`New code sent to ${data.destination || "your contact"}.`);
      } else {
        setLocalError(data.error || "Could not resend code.");
      }
    } catch {
      setLocalError("Network error resending code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 2: Handle OTP input
  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    if (!cleaned && val !== "") return;

    const nextOtp = [...otpCode];
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        nextOtp[i] = chars[i] || "";
      }
      setOtpCode(nextOtp);
      const targetIndex = Math.min(chars.length, 5);
      otpInputRefs.current[targetIndex]?.focus();
      return;
    }

    nextOtp[index] = cleaned;
    setOtpCode(nextOtp);

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Phase 2: Verify OTP -> Go to details
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetLocalState();

    const fullCode = otpCode.join("");
    if (fullCode.length !== 6) {
      setLocalError("Please enter all 6 digits of your verification code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: initialIdentifier.trim(),
          code: fullCode,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setLocalError(data.error || "Invalid verification code.");
        setIsSubmitting(false);
        return;
      }

      setStep("details");
      setIsSubmitting(false);
    } catch {
      setLocalError("Verification request failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Phase 3: Submit Personal, Address, Discovery, and Consents
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetLocalState();

    if (!fullName.trim()) {
      setLocalError("Please enter your full name.");
      return;
    }

    if (channel === "email") {
      const phoneDigits = secondaryIdentifier.replace(/[^0-9]/g, "");
      if (phoneDigits.length < 8) {
        setLocalError("Please enter a valid mobile number for delivery notifications.");
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(secondaryIdentifier.trim())) {
        setLocalError("Please enter a valid email address for purchase receipts.");
        return;
      }
    }

    if (!street.trim()) {
      setLocalError("Street address is required for deliveries.");
      return;
    }
    if (!city.trim()) {
      setLocalError("City is required.");
      return;
    }
    if (!postalCode.trim() || postalCode.trim().length < 4) {
      setLocalError("A valid postal code is required.");
      return;
    }

    if (!termsAccepted) {
      setLocalError("You must agree to the Terms & Conditions and Privacy Policy to complete registration.");
      return;
    }

    const finalEmail =
      channel === "email" ? initialIdentifier.trim().toLowerCase() : secondaryIdentifier.trim().toLowerCase();
    const finalPhone =
      channel === "phone" ? initialIdentifier.trim() : secondaryIdentifier.trim();

    const resolvedLeadSource =
      leadSource === "other" && otherSourceText.trim()
        ? `other: ${otherSourceText.trim()}`
        : leadSource;

    setIsSubmitting(true);

    const res = await register({
      email: finalEmail,
      phone: finalPhone,
      password,
      fullName: fullName.trim(),
      street: street.trim(),
      unit: unit.trim() || undefined,
      subdistrict: subdistrict.trim() || undefined,
      city: city.trim(),
      province: province.trim() || "DKI Jakarta",
      postalCode: postalCode.trim(),
      country: "Indonesia",
      addressLabel,
      deliveryNotes: deliveryNotes.trim() || undefined,
      marketingOptIn,
      leadSource: resolvedLeadSource,
      termsAccepted: true,
    });

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage("Account created successfully. Redirecting to your dashboard...");
      setTimeout(() => {
        router.push("/account");
      }, 1000);
    } else {
      setLocalError(res.error || "Failed to create account. Please review details.");
    }
  };

  // Sign In handler for existing users
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetLocalState();

    const identifier = signInIdentifier.trim();
    if (!identifier) {
      setLocalError("Please enter your email or phone number.");
      return;
    }
    if (!signInPassword) {
      setLocalError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    const res = await login(identifier, signInPassword);
    setIsSubmitting(false);

    if (res.success) {
      router.push("/account");
    }
  };

  // Sample testing accounts
  const fillDemoAccount = (demoId: string, demoPass: string) => {
    resetLocalState();
    setSignInIdentifier(demoId);
    setSignInPassword(demoPass);
    setMode("signin");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Brand Header */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block text-xl font-bold tracking-tight text-white hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
          >
            TETHERA
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {mode === "signup" ? "Create your customer account" : "Sign in to your account"}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            {mode === "signup"
              ? "Access custom rig builds, real-time order tracking, and delivery preferences."
              : "Access your saved builds, order history, and account settings."}
          </p>
        </div>

        {/* Mode Selector */}
        <div className="mt-6 flex border-b border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              resetLocalState();
            }}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              mode === "signup"
                ? "border-emerald-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              resetLocalState();
            }}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              mode === "signin"
                ? "border-emerald-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign in
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm">
          {/* Error Alert */}
          {activeError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{activeError}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div
              role="status"
              className="mb-5 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-sm flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SIGN UP FLOW */}
          {mode === "signup" && (
            <div>
              {/* STEP: CREDENTIALS (Email or Phone + Password) */}
              {step === "credentials" && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="signup-identifier"
                      className="block text-xs font-medium text-zinc-300 mb-1.5"
                    >
                      Email address or phone number
                    </label>
                    <div className="relative">
                      <div className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                        {initialIdentifier.includes("@") ? (
                          <Mail className="w-4 h-4" />
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                      </div>
                      <input
                        id="signup-identifier"
                        type="text"
                        required
                        value={initialIdentifier}
                        onChange={(e) => setInitialIdentifier(e.target.value)}
                        placeholder="name@domain.com or 08123456789"
                        autoComplete="username"
                        disabled={isSubmitting}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors disabled:opacity-60"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      We will dispatch a 6-digit verification code to this contact.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-password"
                      className="block text-xs font-medium text-zinc-300 mb-1.5"
                    >
                      Create password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || !initialIdentifier.trim() || password.length < 6}
                      className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        "Sending code..."
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP: OTP VERIFICATION */}
              {step === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
                      <KeyRound className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-base font-semibold text-white">Enter verification code</h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      Dispatched to{" "}
                      <span className="font-mono text-zinc-200">{maskedDestination}</span>
                    </p>
                  </div>

                  {/* Testing helper callout */}
                  {demoCode && (
                    <div className="p-3 bg-zinc-950 border border-dashed border-emerald-500/40 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-400">Dev simulation code:</span>{" "}
                        <span className="font-mono font-bold text-emerald-400 tracking-wider">
                          {demoCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const digits = demoCode.split("");
                          setOtpCode(digits);
                        }}
                        className="text-[11px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium transition-colors"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  {/* 6 Digit Input Grid */}
                  <div className="flex justify-center gap-2 sm:gap-3 py-2">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 sm:w-12 sm:h-13 text-center font-mono text-lg font-bold bg-zinc-950 border border-zinc-800 rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setStep("credentials")}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change contact</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isSubmitting}
                      className="text-emerald-400 hover:text-emerald-300 disabled:text-zinc-600 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || otpCode.some((d) => !d)}
                      className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                    >
                      {isSubmitting ? "Verifying..." : "Verify code"}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP: COMPLETE DETAILS (Personal + Address + Discovery + Agreements on one unified page) */}
              {step === "details" && (
                <form onSubmit={handleDetailsSubmit} className="space-y-6">
                  {/* Section 1: Personal Details */}
                  <div className="space-y-3">
                    <div className="pb-1 border-b border-zinc-800">
                      <h2 className="text-sm font-semibold text-white">Personal Information</h2>
                    </div>

                    <div>
                      <label
                        htmlFor="profile-name"
                        className="block text-xs font-medium text-zinc-300 mb-1"
                      >
                        Full name <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="profile-name"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alex Rivera"
                          autoComplete="name"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="profile-secondary"
                        className="block text-xs font-medium text-zinc-300 mb-1"
                      >
                        {channel === "email" ? "Phone number" : "Email address"}{" "}
                        <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                          {channel === "email" ? (
                            <Phone className="w-4 h-4" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </div>
                        <input
                          id="profile-secondary"
                          type={channel === "email" ? "tel" : "email"}
                          required
                          value={secondaryIdentifier}
                          onChange={(e) => setSecondaryIdentifier(e.target.value)}
                          placeholder={
                            channel === "email" ? "+62 812 3456 7890" : "alex@example.com"
                          }
                          autoComplete={channel === "email" ? "tel" : "email"}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {channel === "email"
                          ? "Required for courier delivery updates."
                          : "Required for purchase receipts and warranty."}
                      </p>
                    </div>
                  </div>

                  {/* Section 2: Delivery Address */}
                  <div className="space-y-3 pt-2">
                    <div className="pb-1 border-b border-zinc-800">
                      <h2 className="text-sm font-semibold text-white">Delivery Address</h2>
                    </div>

                    <div>
                      <label
                        htmlFor="profile-street"
                        className="block text-xs font-medium text-zinc-300 mb-1"
                      >
                        Street address <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="profile-street"
                          type="text"
                          required
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Jl. Sudirman No. 42"
                          autoComplete="street-address"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="profile-unit"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          Unit or Apartment (optional)
                        </label>
                        <div className="relative">
                          <Building className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="profile-unit"
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="Tower B, Suite 12A"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="profile-subdistrict"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          Subdistrict / Kelurahan
                        </label>
                        <input
                          id="profile-subdistrict"
                          type="text"
                          value={subdistrict}
                          onChange={(e) => setSubdistrict(e.target.value)}
                          placeholder="Kebayoran Baru"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor="profile-city"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          City <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          id="profile-city"
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Jakarta Selatan"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-province"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          Province
                        </label>
                        <input
                          id="profile-province"
                          type="text"
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          placeholder="DKI Jakarta"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-postal"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          Postal code <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          id="profile-postal"
                          type="text"
                          required
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="12190"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Address label
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {ADDRESS_LABELS.map((lbl) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setAddressLabel(lbl)}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                              addressLabel === lbl
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Discovery Survey (Statistics) */}
                  <div className="space-y-3 pt-2">
                    <div className="pb-1 border-b border-zinc-800">
                      <h2 className="text-sm font-semibold text-white">
                        How did you get to know us?
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Help us understand where you discovered Tethera.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {DISCOVERY_OPTIONS.map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            leadSource === opt.id
                              ? "bg-emerald-500/10 border-emerald-500/60 text-white"
                              : "bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="discoverySource"
                            value={opt.id}
                            checked={leadSource === opt.id}
                            onChange={() => setLeadSource(opt.id)}
                            className="h-4 w-4 border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-medium">{opt.label}</span>
                        </label>
                      ))}

                      {leadSource === "other" && (
                        <div className="pt-1">
                          <input
                            type="text"
                            value={otherSourceText}
                            onChange={(e) => setOtherSourceText(e.target.value)}
                            placeholder="Please specify where you found us"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 4: Legal Agreements & Consents */}
                  <div className="space-y-3 pt-3 border-t border-zinc-800">
                    {/* Marketing Opt-In (Optional) */}
                    <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={(e) => setMarketingOptIn(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
                      />
                      <span>
                        Send me updates on hardware drops, restock alerts, and custom build showcases. (Optional)
                      </span>
                    </label>

                    {/* Terms & Privacy (Required) */}
                    <div className="flex items-start gap-2.5 text-xs text-zinc-300 select-none">
                      <input
                        id="terms-checkbox"
                        type="checkbox"
                        required
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
                      />
                      <label htmlFor="terms-checkbox" className="cursor-pointer">
                        <span>I agree to the </span>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-emerald-400 hover:text-emerald-300 underline font-medium"
                        >
                          Terms &amp; Conditions
                        </button>
                        <span> and </span>
                        <button
                          type="button"
                          onClick={() => setShowPrivacyModal(true)}
                          className="text-emerald-400 hover:text-emerald-300 underline font-medium"
                        >
                          Privacy Policy
                        </button>
                        <span className="text-emerald-400 font-semibold"> *</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !termsAccepted}
                      className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                    >
                      {isSubmitting ? "Completing registration..." : "Complete registration"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SIGN IN TAB (Existing accounts) */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label
                  htmlFor="signin-identifier"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Email address or phone number
                </label>
                <div className="relative">
                  <div className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                    {signInIdentifier.includes("@") ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                  </div>
                  <input
                    id="signin-identifier"
                    type="text"
                    required
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    placeholder="name@domain.com or 08123456789"
                    autoComplete="username"
                    disabled={isSubmitting || isLoading}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signin-password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signin-password"
                    type={showSignInPassword ? "text" : "password"}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter your account password"
                    autoComplete="current-password"
                    disabled={isSubmitting || isLoading}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-colors disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading || !signInIdentifier.trim() || !signInPassword}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                >
                  {isSubmitting || isLoading ? "Signing in..." : "Sign in"}
                </button>
              </div>

              {/* Demo Sign-in quick access */}
              <div className="pt-5 border-t border-zinc-800">
                <div className="text-[11px] font-medium text-zinc-400 mb-2">
                  Sample customer accounts for testing:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount("alex.gamer@example.com", "Password123!")}
                    className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  >
                    <div className="font-medium text-zinc-200">Alex Rivera</div>
                    <div className="text-[10px] text-zinc-500">Email sign-in</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount("+6281298765432", "Password123!")}
                    className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  >
                    <div className="font-medium text-zinc-200">Budi Santoso</div>
                    <div className="text-[10px] text-zinc-500">Phone sign-in</div>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Back to store navigation */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
          >
            Return to store catalog
          </Link>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Terms &amp; Conditions</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p className="font-medium text-zinc-100">1. Order Placement and Rig Assembly</p>
              <p>
                All custom PC assemblies undergo 24-hour thermal stress testing and component validation prior to courier dispatch. Estimated delivery dates depend on destination and selected courier tier.
              </p>
              <p className="font-medium text-zinc-100">2. Three-Year Hardware Warranty</p>
              <p>
                Custom workstation rigs and gaming systems include standard parts replacement and on-site diagnosis according to manufacturer warranties. Accidental liquid damage and unauthorized overclocking modifications are excluded.
              </p>
              <p className="font-medium text-zinc-100">3. Cancellation and Returns</p>
              <p>
                Custom component orders can be modified within 6 hours of initial order placement before assembly queue begins. Defective components will be exchanged immediately upon verification.
              </p>
            </div>
            <div className="p-3 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-semibold text-xs hover:bg-emerald-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Privacy Policy</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p className="font-medium text-zinc-100">1. Personal Information Collection</p>
              <p>
                We collect your contact information (email address and phone number) and delivery address solely to process purchases, fulfill deliveries, and coordinate technical warranty assistance.
              </p>
              <p className="font-medium text-zinc-100">2. Data Security &amp; Encryption</p>
              <p>
                Your account credentials and shipping coordinates are protected using industry-standard encryption protocols. We do not sell or lease your personal information to third-party marketing brokers.
              </p>
              <p className="font-medium text-zinc-100">3. Marketing Communication Rights</p>
              <p>
                You may opt out of promotional newsletters and restock alerts at any time through your account preferences dashboard or by clicking the unsubscribe link in our email communications.
              </p>
            </div>
            <div className="p-3 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-semibold text-xs hover:bg-emerald-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
