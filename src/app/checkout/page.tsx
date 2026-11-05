"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
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
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  AlertCircle,
  Zap,
  X,
  RefreshCw,
  Edit2,
} from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { useLocationStore } from "@/lib/store/useLocationStore";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useHeaderStore } from "@/lib/store/useHeaderStore";
import { formatRupiah } from "@/lib/utils/currency";
import {
  MIDTRANS_PAYMENT_METHODS,
  MidtransPaymentChannel,
  generateMidtransPaymentDetails,
  MidtransGeneratedPayment,
} from "@/lib/payment/midtrans";
import {
  CourierLogo,
  isExpressRate,
  DEFAULT_STANDARD_PROVIDERS,
  DEFAULT_EXPRESS_PROVIDERS,
} from "@/components/shipping/CourierLogo";
import { ShippingRateOption } from "@/lib/shipping/types";
import { IncusLogo } from "@/components/navigation/IncusLogo";
import { calculateInclusiveTax, DEFAULT_PPN_RATE } from "@/lib/tax/taxCalculation";

type FulfillmentTier = "click_and_collect" | "standard" | "express";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const { isCategoryBarVisible } = useHeaderStore();
  const {
    items,
    customPCs,
    getSubtotal,
    fulfillmentMethod,
    setFulfillmentMethod,
    clearCart,
  } = useCartStore();
  const { userLocation, selectedRate, setSelectedRate } = useLocationStore();

  // Mobile Order Summary Accordion State
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

  // Contact State
  const [contactEmailOrPhone, setContactEmailOrPhone] = useState("");
  const [newsOptIn, setNewsOptIn] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Delivery & Address State
  const [isEditingSavedAddress, setIsEditingSavedAddress] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [apartmentUnit, setApartmentUnit] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [city, setCity] = useState("Jakarta Pusat");
  const [province, setProvince] = useState("DKI Jakarta");
  const [postalCode, setPostalCode] = useState("10730");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [saveInfoForNextTime, setSaveInfoForNextTime] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Fulfillment & Courier Selection State
  const [selectedFulfillment, setSelectedFulfillment] = useState<FulfillmentTier>(
    fulfillmentMethod === "click_and_collect" ? "click_and_collect" : "standard"
  );

  // Active Selected Courier per Tier
  const [selectedStandardRate, setSelectedStandardRate] = useState<ShippingRateOption>(
    DEFAULT_STANDARD_PROVIDERS[0]
  );
  const [selectedExpressRate, setSelectedExpressRate] = useState<ShippingRateOption>(
    DEFAULT_EXPRESS_PROVIDERS[0]
  );
  // Controls which tier courier choices are open (closes when a choice is picked)
  const [expandedTier, setExpandedTier] = useState<"standard" | "express" | null>(null);

  // Discount Code State
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    description: string;
    discountType?: string;
  } | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Payment State
  const [selectedChannel, setSelectedChannel] = useState<MidtransPaymentChannel>("qris");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Credit Card Form State
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  // Sync user defaults when authenticated or location exists
  useEffect(() => {
    if (isAuthenticated && user) {
      if (!contactEmailOrPhone) {
        setContactEmailOrPhone(user.email || user.phone || "");
      }
      if (!firstName && !lastName && user.fullName) {
        const parts = user.fullName.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
      if (user.phone && !recipientPhone) {
        setRecipientPhone(user.phone);
      }
      if (user.address) {
        if (!streetAddress) setStreetAddress(user.address.street || "");
        if (!apartmentUnit) setApartmentUnit(user.address.unit || "");
        if (!subdistrict) setSubdistrict(user.address.subdistrict || "");
        if (!city) setCity(user.address.city || "Jakarta Pusat");
        if (!province) setProvince(user.address.province || "DKI Jakarta");
        if (!postalCode) setPostalCode(user.address.postalCode || "10730");
      }
    } else if (userLocation) {
      if (userLocation.subdistrict && !subdistrict) setSubdistrict(userLocation.subdistrict);
      if (userLocation.city && !city) setCity(userLocation.city);
      if (userLocation.postalCode && !postalCode) setPostalCode(userLocation.postalCode);
      if (userLocation.address && !streetAddress) setStreetAddress(userLocation.address.split(",")[0]);
    }
  }, [isAuthenticated, user, userLocation]);

  // Sync selectedRate with fulfillment tier
  useEffect(() => {
    if (selectedFulfillment === "click_and_collect") {
      setFulfillmentMethod("click_and_collect");
      setSelectedRate(null);
    } else if (selectedFulfillment === "standard") {
      setFulfillmentMethod("delivery");
      setSelectedRate(selectedStandardRate);
    } else if (selectedFulfillment === "express") {
      setFulfillmentMethod("delivery");
      setSelectedRate(selectedExpressRate);
    }
  }, [selectedFulfillment, selectedStandardRate, selectedExpressRate, setFulfillmentMethod, setSelectedRate]);

  // Order Calculation Values
  const rawSubtotal = getSubtotal();
  const shippingFee =
    selectedFulfillment === "click_and_collect"
      ? 0
      : selectedFulfillment === "standard"
      ? selectedStandardRate.price
      : selectedExpressRate.price;

  const discountAmount = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.discountType === "free_shipping") {
      return Math.min(shippingFee, appliedDiscount.amount || shippingFee);
    }
    return appliedDiscount.amount;
  }, [appliedDiscount, shippingFee]);
  const grandTotal = Math.max(0, rawSubtotal + shippingFee - discountAmount);
  const checkoutTax = useMemo(() => calculateInclusiveTax(rawSubtotal, DEFAULT_PPN_RATE), [rawSubtotal]);

  // Generated Midtrans Payment Details
  const activePaymentDetails: MidtransGeneratedPayment = useMemo(() => {
    const tempOrderNum = `TET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    return generateMidtransPaymentDetails(tempOrderNum, selectedChannel, grandTotal);
  }, [selectedChannel, grandTotal]);

  // Handle Courier Selection within a Tier
  const handleCourierSelect = (tier: "standard" | "express", rate: ShippingRateOption) => {
    if (tier === "standard") {
      setSelectedStandardRate(rate);
    } else {
      setSelectedExpressRate(rate);
    }
    setSelectedRate(rate);
    setSelectedFulfillment(tier);
    setExpandedTier(null);
  };

  // Handle Fulfillment Tier Switch (Click & Collect, Standard, Express)
  const handleFulfillmentTierSelect = (tier: FulfillmentTier) => {
    setSelectedFulfillment(tier);
    if (tier === "click_and_collect") {
      setExpandedTier(null);
    }
  };

  // Handle Discount Code Application via Rules Engine API
  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiscountError(null);
    const code = discountCodeInput.trim().toUpperCase();

    if (!code) {
      setDiscountError("Please enter a discount code.");
      return;
    }

    setIsApplyingDiscount(true);
    try {
      const promoItems = items.map((it) => ({
        id: it.item.id,
        quantity: it.quantity,
        price: it.item.retail_price,
        category: it.item.category_slug,
      }));

      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal: rawSubtotal,
          shippingFee: selectedFulfillment === "click_and_collect" ? 0 : shippingFee,
          items: promoItems,
          customerEmail: contactEmailOrPhone.includes("@") ? contactEmailOrPhone : (user?.email || undefined),
          customerId: user?.id || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setDiscountError(data.detail || data.message || "Invalid or ineligible discount code.");
      } else {
        setAppliedDiscount({
          code: data.code || code,
          amount: Number(data.discountAmount || 0),
          description: data.message || `Discount code ${data.code || code} applied`,
          discountType: data.discountType,
        });
        setDiscountCodeInput("");
      }
    } catch (err: any) {
      setDiscountError(err.message || "Failed to validate promotion code.");
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError(null);
  };

  // Copy Helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handle Inline Modal Sign In
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await login(loginEmail, loginPassword);
    if (res.success) {
      setIsLoginModalOpen(false);
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setLoginError(res.error || "Invalid email or password.");
    }
  };

  // Final Payment Submission & Order Creation
  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    // Validation
    const fullCustomerName = `${firstName} ${lastName}`.trim() || (user ? user.fullName : "");
    if (!fullCustomerName) {
      setPaymentError("Please provide your recipient name under delivery details.");
      window.scrollTo({ top: 200, behavior: "smooth" });
      return;
    }
    if (!contactEmailOrPhone.trim()) {
      setPaymentError("Please provide an email address or mobile phone number.");
      window.scrollTo({ top: 120, behavior: "smooth" });
      return;
    }
    if (selectedFulfillment !== "click_and_collect") {
      if (!streetAddress.trim()) {
        setPaymentError("Please provide a street address for courier dispatch.");
        window.scrollTo({ top: 350, behavior: "smooth" });
        return;
      }
      if (!city.trim() || !subdistrict.trim()) {
        setPaymentError("Please fill in your City and Sub-district (Kecamatan).");
        window.scrollTo({ top: 400, behavior: "smooth" });
        return;
      }
    }

    setIsProcessingPayment(true);

    const activeRate =
      selectedFulfillment === "standard"
        ? selectedStandardRate
        : selectedFulfillment === "express"
        ? selectedExpressRate
        : null;

    try {
      // 1. Create order in database
      const createOrderRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: fullCustomerName,
            email: contactEmailOrPhone.includes("@") ? contactEmailOrPhone : `${recipientPhone || "customer"}@tethera.customer`,
            phone: recipientPhone || (contactEmailOrPhone.includes("@") ? "081288990011" : contactEmailOrPhone),
            isGuest: !isAuthenticated,
            customerId: isAuthenticated && user ? user.id : null,
          },
          shippingAddress: {
            street: streetAddress,
            unit: apartmentUnit,
            subdistrict,
            city,
            province,
            postalCode,
            deliveryNotes,
          },
          fulfillmentType: selectedFulfillment === "click_and_collect" ? "click_and_collect" : "delivery",
          items,
          customPCs,
          selectedRate: activeRate,
          subtotal: rawSubtotal,
          shippingFee,
          discountAmount,
          promoCode: appliedDiscount ? appliedDiscount.code : undefined,
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

      // 3. Save order snapshot in sessionStorage for itemized tax invoice on success page
      if (typeof window !== "undefined") {
        try {
          const snapshot = {
            orderNumber: chargeData.orderNumber,
            paymentId: chargeData.paymentId,
            orderId: orderData.orderId,
            paymentChannel: selectedChannel,
            customer: {
              name: fullCustomerName,
              email: contactEmailOrPhone.includes("@") ? contactEmailOrPhone : "",
              phone: recipientPhone || contactEmailOrPhone,
            },
            fulfillmentMethod: selectedFulfillment === "click_and_collect" ? "click_and_collect" : "delivery",
            shippingAddress: {
              street: streetAddress,
              unit: apartmentUnit,
              subdistrict,
              city,
              province,
              postalCode,
              deliveryNotes,
            },
            courier: activeRate,
            items: items.map((it) => ({
              id: it.item.id,
              name: it.item.name,
              sku: it.item.sku,
              brand: it.item.brand,
              price: it.item.price,
              quantity: it.quantity,
              image: it.item.image,
            })),
            customPCs: customPCs.map((pc) => ({
              id: pc.id,
              name: pc.name,
              totalPrice: pc.totalPrice,
              serviceTier: pc.serviceTier,
              parts: pc.parts,
              isPrebuilt: pc.isPrebuilt,
              image: pc.image,
            })),
            subtotal: rawSubtotal,
            shippingFee,
            discountAmount,
            grandTotal,
            createdAt: new Date().toISOString(),
          };
          sessionStorage.setItem("tethera_last_order", JSON.stringify(snapshot));
        } catch (e) {
          console.warn("Could not save order snapshot:", e);
        }
      }

      // 4. Clear cart and redirect to Order Success confirmation
      clearCart();
      router.push(
        `/checkout/success?orderNumber=${encodeURIComponent(chargeData.orderNumber)}&paymentId=${encodeURIComponent(chargeData.paymentId)}`
      );
    } catch (err: any) {
      setPaymentError(err.message || "Midtrans payment verification failed. Please try another channel or review your details.");
      setIsProcessingPayment(false);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  // If cart is empty, render empty state
  if (items.length === 0 && customPCs.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 py-24 px-4 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-slate-400 dark:text-zinc-500">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Your cart is empty</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm">
          Looks like you haven't added any PC components or custom builds yet.
        </p>
        <Link
          href="/components"
          className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Shopping</span>
        </Link>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ----------------------------------------------------------------------- */}
      {/* MOBILE ORDER SUMMARY ACCORDION BAR (Visible only on < lg screens) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="lg:hidden border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 relative z-20">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white min-h-[44px]"
            aria-expanded={isMobileSummaryOpen}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isMobileSummaryOpen ? "Hide order summary" : "Show order summary"}</span>
            {isMobileSummaryOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          <span className="text-base font-black text-zinc-900 dark:text-white">
            {formatRupiah(grandTotal)}
          </span>
        </div>

        {/* Mobile Dropdown Body */}
        {isMobileSummaryOpen && (
          <div className="px-4 py-5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/95 dark:bg-zinc-900/95 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Items List */}
            <div className="space-y-3.5 divide-y divide-slate-200/60 dark:divide-zinc-800/60">
              {items.map((it) => (
                <div key={it.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="w-14 h-14 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0 flex items-center justify-center p-1 overflow-hidden">
                    <div className="relative w-11 h-11">
                      <Image
                        src={it.item.image}
                        alt={it.item.name}
                        fill
                        sizes="44px"
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs leading-snug line-clamp-2">
                      {it.item.name}
                    </h4>
                    {it.item.variationName && (
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {it.item.variationName}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-center px-2">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {it.quantity}
                    </span>
                  </div>
                  <div className="text-right shrink-0 min-w-[76px]">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                      {formatRupiah(it.item.price * it.quantity)}
                    </span>
                    {it.quantity > 1 && (
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">
                        {formatRupiah(it.item.price)} ea
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {customPCs.map((pc) => (
                <div key={pc.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="w-14 h-14 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0 flex items-center justify-center p-1 overflow-hidden">
                    <div className="relative w-11 h-11">
                      <Image
                        src={pc.image || "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500"}
                        alt={pc.name}
                        fill
                        sizes="44px"
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs leading-snug line-clamp-2">
                      {pc.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {pc.serviceTier?.name || "Custom PC Rig"}
                    </p>
                  </div>
                  <div className="shrink-0 text-center px-2">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                      1
                    </span>
                  </div>
                  <div className="text-right shrink-0 min-w-[76px]">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                      {formatRupiah(pc.totalPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Discount Form */}
            <form onSubmit={handleApplyDiscount} className="space-y-1 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Discount code or gift card"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={isApplyingDiscount}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white text-xs font-bold rounded-lg transition-colors min-h-[44px] cursor-pointer disabled:opacity-50"
                >
                  {isApplyingDiscount ? "..." : "Apply"}
                </button>
              </div>

              {discountError && (
                <p className="text-[11px] text-red-600 dark:text-red-400 pt-1">
                  {discountError}
                </p>
              )}

              {appliedDiscount && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs mt-2">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{appliedDiscount.code}</span>
                    <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400">
                      ({appliedDiscount.description})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveDiscount}
                    className="text-slate-400 hover:text-red-500 p-2 rounded min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                    title="Remove discount"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </form>

            {/* Mobile Breakdown */}
            <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-zinc-800 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatRupiah(rawSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                <span>Shipping</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {shippingFee === 0 ? "FREE" : formatRupiah(shippingFee)}
                </span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount ({appliedDiscount.code})</span>
                  <span className="font-bold">-{formatRupiah(appliedDiscount.amount)}</span>
                </div>
              )}
              <div className="pt-2 pb-1 border-t border-dashed border-slate-200 dark:border-zinc-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400 dark:text-zinc-500">
                  <span>Dasar Pengenaan Pajak (DPP)</span>
                  <span>{formatRupiah(checkoutTax.dpp)}</span>
                </div>
                <div className="flex justify-between text-slate-400 dark:text-zinc-500">
                  <span>PPN 11% (Included)</span>
                  <span>{formatRupiah(checkoutTax.taxAmount)}</span>
                </div>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-white pt-2 border-t border-slate-200 dark:border-zinc-800">
                <span>Total</span>
                <span className="text-xl font-black">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* MAIN TWO-COLUMN SHOPIFY CHECKOUT LAYOUT */}
      {/* ----------------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">
          {/* =================================================================== */}
          {/* LEFT COLUMN: MAIN CHECKOUT FLOW (58% width, lg:col-span-7) */}
          {/* =================================================================== */}
          <div className="lg:col-span-7 px-4 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-12 space-y-8">
            {/* Brand Logo & Header */}
            <div className="flex items-center justify-between">
              <Link href="/" className="inline-block" title="Return to store homepage">
                <IncusLogo className="h-7 w-auto" />
              </Link>
              <Link
                href="/components"
                className="text-xs text-slate-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 font-medium min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to cart</span>
              </Link>
            </div>

            {/* Inline Payment Error Notice */}
            {paymentError && (
              <div
                id="checkout-error-banner"
                className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-300 rounded-xl text-xs flex items-start justify-between gap-3 animate-in fade-in"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-900 dark:text-red-200 block">Please check your details</span>
                    <p className="text-red-800 dark:text-red-300 leading-relaxed mt-0.5">{paymentError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentError(null)}
                  className="text-red-400 hover:text-red-700 dark:hover:text-red-200 p-1 rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleCompleteOrder} className="space-y-8">
              {/* --------------------------------------------------------------- */}
              {/* SECTION 1: CONTACT DETAILS */}
              {/* --------------------------------------------------------------- */}
              <section aria-labelledby="contact-heading" className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 id="contact-heading" className="text-lg font-bold text-zinc-900 dark:text-white">
                    Contact
                  </h2>
                  {!isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => setIsLoginModalOpen(true)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline min-h-[44px] flex items-center cursor-pointer"
                    >
                      Log in for saved addresses
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 dark:text-zinc-400">Logged in as {user?.email}</span>
                      <button
                        type="button"
                        onClick={logout}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold min-h-[44px] flex items-center cursor-pointer"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email-phone" className="sr-only">
                    Email or mobile phone number
                  </label>
                  <input
                    id="contact-email-phone"
                    type="text"
                    required
                    placeholder="Email or mobile phone number"
                    value={contactEmailOrPhone}
                    onChange={(e) => setContactEmailOrPhone(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 min-h-[44px]"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newsOptIn}
                    onChange={(e) => setNewsOptIn(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-900 border-slate-300 dark:border-zinc-700 focus:ring-zinc-900"
                  />
                  <span>Email me with news, hardware drops, and exclusive offers</span>
                </label>
              </section>

              {/* --------------------------------------------------------------- */}
              {/* SECTION 2: DELIVERY ADDRESS */}
              {/* --------------------------------------------------------------- */}
              <section aria-labelledby="delivery-heading" className="space-y-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <h2 id="delivery-heading" className="text-lg font-bold text-zinc-900 dark:text-white">
                  Delivery
                </h2>

                {/* Fulfillment Method Selector: Delivery Courier vs Click and Collect */}
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Delivery Method Choice">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedFulfillment !== "click_and_collect"}
                    onClick={() => {
                      if (selectedFulfillment === "click_and_collect") {
                        handleFulfillmentTierSelect("standard");
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all min-h-[48px] cursor-pointer ${
                      selectedFulfillment !== "click_and_collect"
                        ? "border-zinc-900 dark:border-zinc-100 bg-slate-50/80 dark:bg-zinc-900 ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-2xs"
                        : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Delivery Courier
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Courier</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedFulfillment === "click_and_collect"}
                    onClick={() => handleFulfillmentTierSelect("click_and_collect")}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all min-h-[48px] cursor-pointer ${
                      selectedFulfillment === "click_and_collect"
                        ? "border-zinc-900 dark:border-zinc-100 bg-slate-50/80 dark:bg-zinc-900 ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-2xs"
                        : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Click and Collect
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                  </button>
                </div>

                {/* 1. DELIVERY COURIER FULFILLMENT: Slides down smoothly when Delivery Courier is selected */}
                <div
                  className={`grid transition-all duration-500 ease-in-out ${
                    selectedFulfillment !== "click_and_collect"
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden space-y-6 pt-1">
                    {/* Logged in customer: Show saved address card directly, with edit toggle */}
                    {isAuthenticated && user && !isEditingSavedAddress ? (
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/70 flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              <span>{user.fullName || `${firstName} ${lastName}`}</span>
                              <span className="text-[10px] bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-normal text-zinc-700 dark:text-zinc-300">
                                Saved Destination
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-zinc-300 text-[11px] leading-relaxed">
                              {streetAddress || user.address?.street || "Mangga Dua Mall Lt. 3 No. 36"}
                              {apartmentUnit ? `, Unit ${apartmentUnit}` : ""}
                              {subdistrict ? `, ${subdistrict}` : ""}
                              {city ? `, ${city}` : ""}
                              {province ? `, ${province}` : ""}
                              {postalCode ? ` ${postalCode}` : ""}
                            </p>
                            <p className="text-slate-500 dark:text-zinc-400 text-[11px]">
                              Recipient Phone: {recipientPhone || user.phone || "Not set"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingSavedAddress(true)}
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 min-h-[44px] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Change</span>
                        </button>
                      </div>
                    ) : (
                      /* Guest or Logged in user editing address: Show full input fields */
                      <div className="space-y-3">
                        {isAuthenticated && user && (
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">
                              Edit Delivery Address
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsEditingSavedAddress(false)}
                              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold min-h-[44px] flex items-center cursor-pointer"
                            >
                              Cancel edit
                            </button>
                          </div>
                        )}

                        {/* Country/Region (Indonesia) */}
                        <div>
                          <label htmlFor="country-region" className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                            Country / Region
                          </label>
                          <input
                            id="country-region"
                            type="text"
                            readOnly
                            value="Indonesia"
                            className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-not-allowed min-h-[44px]"
                          />
                        </div>

                        {/* First & Last Name */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="first-name" className="sr-only">First Name</label>
                            <input
                              id="first-name"
                              type="text"
                              required
                              placeholder="First name"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                            />
                          </div>
                          <div>
                            <label htmlFor="last-name" className="sr-only">Last Name</label>
                            <input
                              id="last-name"
                              type="text"
                              required
                              placeholder="Last name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                            />
                          </div>
                        </div>

                        {/* Street Address */}
                        <div>
                          <label htmlFor="street-address" className="sr-only">Address</label>
                          <input
                            id="street-address"
                            type="text"
                            required
                            placeholder="Street address (Jl. Sudirman No. 1)"
                            value={streetAddress}
                            onChange={(e) => setStreetAddress(e.target.value)}
                            className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                          />
                        </div>

                        {/* Apartment, suite, unit */}
                        <div>
                          <label htmlFor="apartment-unit" className="sr-only">Apartment, suite, etc. (optional)</label>
                          <input
                            id="apartment-unit"
                            type="text"
                            placeholder="Apartment, suite, unit, floor (optional)"
                            value={apartmentUnit}
                            onChange={(e) => setApartmentUnit(e.target.value)}
                            className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                          />
                        </div>

                        {/* City, Sub-district (Kecamatan), Postal Code */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label htmlFor="city" className="sr-only">City</label>
                            <input
                              id="city"
                              type="text"
                              required
                              placeholder="City"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                            />
                          </div>
                          <div>
                            <label htmlFor="subdistrict" className="sr-only">Sub-district (Kecamatan)</label>
                            <input
                              id="subdistrict"
                              type="text"
                              required
                              placeholder="Sub-district (Kecamatan)"
                              value={subdistrict}
                              onChange={(e) => setSubdistrict(e.target.value)}
                              className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                            />
                          </div>
                          <div>
                            <label htmlFor="postal-code" className="sr-only">Postal code</label>
                            <input
                              id="postal-code"
                              type="text"
                              placeholder="Postal code"
                              value={postalCode}
                              onChange={(e) => setPostalCode(e.target.value)}
                              className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                            />
                          </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label htmlFor="recipient-phone" className="sr-only">Phone number</label>
                          <input
                            id="recipient-phone"
                            type="tel"
                            required
                            placeholder="Phone number for courier updates"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                          />
                        </div>

                        {/* Save this information checkbox */}
                        <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer select-none pt-1">
                          <input
                            type="checkbox"
                            checked={saveInfoForNextTime}
                            onChange={(e) => setSaveInfoForNextTime(e.target.checked)}
                            className="w-4 h-4 rounded text-zinc-900 border-slate-300 dark:border-zinc-700 focus:ring-zinc-900"
                          />
                          <span>Save this information for next time</span>
                        </label>
                      </div>
                    )}
                    {/* Shipping Method Menu: Nested under Delivery Courier */}
                    <div className="space-y-3 pt-5 border-t border-slate-200 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                          Shipping method
                        </h3>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                          {selectedFulfillment === "express" ? "Express Courier" : "Standard Courier"}
                        </span>
                      </div>

                      <div className="space-y-3" role="radiogroup" aria-label="Courier Shipping Options">
                        {/* ========================================================= */}
                        {/* 1. STANDARD DELIVERY TIER */}
                        {/* ========================================================= */}
                        <div
                          className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                            selectedFulfillment === "standard"
                              ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-sm"
                              : "border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900 shadow-2xs"
                          }`}
                        >
                          {/* Standard Tier Header Card */}
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selectedFulfillment === "standard"}
                            onClick={() => {
                              if (selectedFulfillment !== "standard") {
                                setSelectedFulfillment("standard");
                                setSelectedRate(selectedStandardRate);
                                setExpandedTier("standard");
                              } else {
                                setExpandedTier(expandedTier === "standard" ? null : "standard");
                              }
                            }}
                            className="w-full p-4 flex items-center justify-between gap-3 text-left min-h-[56px] cursor-pointer"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                                  selectedFulfillment === "standard"
                                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent shadow-2xs"
                                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                                }`}
                              >
                                <Truck className="w-4 h-4" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                    Standard Delivery
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                                    1 to 3 Days
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                                  {expandedTier === "standard"
                                    ? "Select courier option below"
                                    : `${selectedStandardRate.courierName} (${selectedStandardRate.serviceName})`}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 text-right flex items-center gap-3">
                              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                {selectedStandardRate.priceFormatted}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    selectedFulfillment === "standard"
                                      ? "border-zinc-900 dark:border-zinc-100"
                                      : "border-slate-300 dark:border-zinc-600"
                                  }`}
                                >
                                  {selectedFulfillment === "standard" && (
                                    <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                                  )}
                                </div>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${
                                    expandedTier === "standard" ? "rotate-180 text-zinc-900 dark:text-zinc-100" : ""
                                  }`}
                                />
                              </div>
                            </div>
                          </button>

                          {/* Standard Couriers List: Flows out below Standard Delivery when expanded */}
                          <div
                            className={`grid transition-all duration-300 ease-in-out ${
                              expandedTier === "standard"
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0 pointer-events-none"
                            }`}
                          >
                            <div className="overflow-hidden border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 px-3 pt-2 pb-2.5">
                              <div className="ml-3 pl-3.5 border-l-2 border-slate-200 dark:border-zinc-700/60 space-y-1">
                                {DEFAULT_STANDARD_PROVIDERS.map((rate) => {
                                  const isSelected =
                                    selectedStandardRate.courierId === rate.courierId &&
                                    selectedStandardRate.serviceCode === rate.serviceCode;

                                  return (
                                    <button
                                      key={`${rate.courierId}-${rate.serviceCode}`}
                                      type="button"
                                      onClick={() => handleCourierSelect("standard", rate)}
                                      className={`w-full min-h-[44px] px-2.5 py-2 rounded-lg text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                                        isSelected
                                          ? "bg-white dark:bg-zinc-800 shadow-2xs text-zinc-950 dark:text-zinc-50 ring-1 ring-zinc-300 dark:ring-zinc-600"
                                          : "hover:bg-white/80 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <CourierLogo courierId={rate.courierId} />
                                        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                            {rate.serviceName}
                                          </span>
                                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 shrink-0">
                                            ({rate.etd})
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                          {rate.priceFormatted}
                                        </span>
                                        <div
                                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                            isSelected
                                              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100"
                                              : "border-slate-300 dark:border-zinc-600"
                                          }`}
                                        >
                                          {isSelected && (
                                            <Check className="w-2.5 h-2.5 text-white dark:text-zinc-950" />
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ========================================================= */}
                        {/* 2. EXPRESS DELIVERY TIER */}
                        {/* ========================================================= */}
                        <div
                          className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                            selectedFulfillment === "express"
                              ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-sm"
                              : "border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900 shadow-2xs"
                          }`}
                        >
                          {/* Express Tier Header Card */}
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selectedFulfillment === "express"}
                            onClick={() => {
                              if (selectedFulfillment !== "express") {
                                setSelectedFulfillment("express");
                                setSelectedRate(selectedExpressRate);
                                setExpandedTier("express");
                              } else {
                                setExpandedTier(expandedTier === "express" ? null : "express");
                              }
                            }}
                            className="w-full p-4 flex items-center justify-between gap-3 text-left min-h-[56px] cursor-pointer"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                                  selectedFulfillment === "express"
                                    ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white border-transparent shadow-2xs"
                                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"
                                }`}
                              >
                                <Zap className="w-4 h-4" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                    Express Delivery
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                    Instant · 1 to 2 Hours
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                                  {expandedTier === "express"
                                    ? "Select an express courier option below"
                                    : `${selectedExpressRate.courierName} (${selectedExpressRate.serviceName})`}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 text-right flex items-center gap-3">
                              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                                {selectedExpressRate.priceFormatted}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    selectedFulfillment === "express"
                                      ? "border-zinc-900 dark:border-zinc-100"
                                      : "border-slate-300 dark:border-zinc-600"
                                  }`}
                                >
                                  {selectedFulfillment === "express" && (
                                    <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                                  )}
                                </div>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${
                                    expandedTier === "express" ? "rotate-180 text-zinc-900 dark:text-zinc-100" : ""
                                  }`}
                                />
                              </div>
                            </div>
                          </button>

                          {/* Express Couriers List: Flows out below Express Delivery when expanded */}
                          <div
                            className={`grid transition-all duration-300 ease-in-out ${
                              expandedTier === "express"
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0 pointer-events-none"
                            }`}
                          >
                            <div className="overflow-hidden border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 px-3 pt-2 pb-2.5">
                              <div className="ml-3 pl-3.5 border-l-2 border-slate-200 dark:border-zinc-700/60 space-y-1">
                                {DEFAULT_EXPRESS_PROVIDERS.map((rate) => {
                                  const isSelected =
                                    selectedExpressRate.courierId === rate.courierId &&
                                    selectedExpressRate.serviceCode === rate.serviceCode;

                                  return (
                                    <button
                                      key={`${rate.courierId}-${rate.serviceCode}`}
                                      type="button"
                                      onClick={() => handleCourierSelect("express", rate)}
                                      className={`w-full min-h-[44px] px-2.5 py-2 rounded-lg text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                                        isSelected
                                          ? "bg-white dark:bg-zinc-800 shadow-2xs text-zinc-950 dark:text-zinc-50 ring-1 ring-zinc-300 dark:ring-zinc-600"
                                          : "hover:bg-white/80 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <CourierLogo courierId={rate.courierId} />
                                        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                            {rate.serviceName}
                                          </span>
                                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 shrink-0">
                                            ({rate.etd})
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                          {rate.priceFormatted}
                                        </span>
                                        <div
                                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                            isSelected
                                              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100"
                                              : "border-slate-300 dark:border-zinc-600"
                                          }`}
                                        >
                                          {isSelected && (
                                            <Check className="w-2.5 h-2.5 text-white dark:text-zinc-950" />
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CLICK AND COLLECT: Slides down smoothly when Click and Collect is selected */}
              <div
                className={`grid transition-all duration-500 ease-in-out ${
                  selectedFulfillment === "click_and_collect"
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0 pointer-events-none"
                }`}
              >
                <div className="overflow-hidden pt-1">
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        Incus Flagship Experience Store
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">Ready in 60 Mins</span>
                    </div>
                    <p className="text-slate-600 dark:text-zinc-300 text-[11px] leading-relaxed">
                      Mangga Dua Mall Lt. 3 No. 36, Jl. Mangga Dua Raya, Sawah Besar, Jakarta Pusat 10730.
                    </p>
                    <p className="text-slate-500 dark:text-zinc-400 text-[11px]">
                      Pickup PIN and QR verification will be sent via WhatsApp and Email upon payment settlement.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* --------------------------------------------------------------- */}
            {/* SECTION 3: PAYMENT (Midtrans Gateway) */}
            {/* --------------------------------------------------------------- */}
            <section aria-labelledby="payment-heading" className="space-y-3.5 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <div>
                  <h2 id="payment-heading" className="text-lg font-bold text-zinc-900 dark:text-white">
                    Payment
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    All transactions are secure and encrypted via licensed Midtrans gateway.
                  </p>
                </div>

                {/* Midtrans Channel Options */}
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden divide-y divide-slate-200 dark:divide-zinc-800">
                  {/* OPTION 1: QRIS */}
                  <div className="bg-white dark:bg-zinc-950">
                    <label
                      onClick={() => setSelectedChannel("qris")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none text-xs ${
                        selectedChannel === "qris" ? "bg-slate-50/90 dark:bg-zinc-900/90" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment-channel-group"
                          checked={selectedChannel === "qris"}
                          onChange={() => setSelectedChannel("qris")}
                          className="w-4 h-4 text-zinc-900 border-slate-300 dark:border-zinc-700 focus:ring-zinc-900 cursor-pointer"
                        />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          QRIS (Instant Pay)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                          GoPay • OVO • BCA • DANA
                        </span>
                      </div>
                    </label>

                    {selectedChannel === "qris" && (
                      <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800 text-xs space-y-3 animate-in fade-in">
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                          <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                            <div className="w-28 h-28 bg-zinc-900 text-white rounded flex flex-col items-center justify-center p-2 text-center">
                              <QrCode className="w-16 h-16 text-white" />
                              <span className="text-[9px] font-mono tracking-widest mt-1">QRIS CODE</span>
                            </div>
                          </div>
                          <div className="space-y-1.5 text-center sm:text-left">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Merchant: INCUS COMPUTERS
                            </span>
                            <div className="text-sm font-bold text-zinc-900 dark:text-white">
                              Scan with any Indonesian Banking or E-Wallet App
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                              Open BCA Mobile, Livin' by Mandiri, GoPay, OVO, ShopeePay, or DANA. Point your camera to complete payment instantly.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OPTION 2: VIRTUAL ACCOUNT */}
                  <div className="bg-white dark:bg-zinc-950">
                    <label
                      onClick={() => setSelectedChannel("bca_va")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none text-xs ${
                        selectedChannel.includes("_va") || selectedChannel === "mandiri_bill"
                          ? "bg-slate-50/90 dark:bg-zinc-900/90"
                          : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment-channel-group"
                          checked={selectedChannel.includes("_va") || selectedChannel === "mandiri_bill"}
                          onChange={() => setSelectedChannel("bca_va")}
                          className="w-4 h-4 text-zinc-900 border-slate-300 dark:border-zinc-700 focus:ring-zinc-900 cursor-pointer"
                        />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          Bank Virtual Account
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                        BCA • Mandiri • BNI • BRI • Permata
                      </span>
                    </label>

                    {(selectedChannel.includes("_va") || selectedChannel === "mandiri_bill") && (
                      <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800 text-xs space-y-3 animate-in fade-in">
                        {/* Bank Selector Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { id: "bca_va", label: "BCA" },
                            { id: "mandiri_bill", label: "Mandiri" },
                            { id: "bni_va", label: "BNI" },
                            { id: "bri_va", label: "BRI" },
                            { id: "permata_va", label: "Permata" },
                          ].map((bank) => (
                            <button
                              key={bank.id}
                              type="button"
                              onClick={() => setSelectedChannel(bank.id as MidtransPaymentChannel)}
                              className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                                selectedChannel === bank.id
                                  ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs"
                                  : "border-slate-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:border-slate-300"
                              }`}
                            >
                              {bank.label}
                            </button>
                          ))}
                        </div>

                        {/* Generated VA Number Display */}
                        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Virtual Account Number
                            </span>
                            <span className="text-base font-mono font-bold text-zinc-900 dark:text-white tracking-wider">
                              {activePaymentDetails.vaNumber || "88081294102941"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(activePaymentDetails.vaNumber || "88081294102941", "va")}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedField === "va" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <span>Copy</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OPTION 3: CREDIT / DEBIT CARD */}
                  <div className="bg-white dark:bg-zinc-950">
                    <label
                      onClick={() => setSelectedChannel("credit_card")}
                      className={`p-4 flex items-center justify-between cursor-pointer select-none text-xs ${
                        selectedChannel === "credit_card" ? "bg-slate-50/90 dark:bg-zinc-900/90" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment-channel-group"
                          checked={selectedChannel === "credit_card"}
                          onChange={() => setSelectedChannel("credit_card")}
                          className="w-4 h-4 text-zinc-900 border-slate-300 dark:border-zinc-700 focus:ring-zinc-900 cursor-pointer"
                        />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          Credit / Debit Card
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                        Visa • Mastercard • JCB • Amex
                      </span>
                    </label>

                    {selectedChannel === "credit_card" && (
                      <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800 text-xs space-y-3 animate-in fade-in">
                        <div>
                          <label htmlFor="card-number" className="sr-only">Card Number</label>
                          <input
                            id="card-number"
                            type="text"
                            placeholder="Card number"
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="card-expiry" className="sr-only">Expiration date (MM / YY)</label>
                            <input
                              id="card-expiry"
                              type="text"
                              placeholder="Expiration date (MM / YY)"
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                            />
                          </div>
                          <div>
                            <label htmlFor="card-cvv" className="sr-only">Security code (CVV)</label>
                            <input
                              id="card-cvv"
                              type="password"
                              placeholder="Security code (CVV)"
                              maxLength={4}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                              className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="card-holder" className="sr-only">Name on card</label>
                          <input
                            id="card-holder"
                            type="text"
                            placeholder="Name on card"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Complete Payment Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="w-full min-h-[48px] py-4 px-6 bg-[#52E394] hover:brightness-105 active:brightness-95 text-[#0A0B0E] font-semibold text-sm sm:text-base rounded-md transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Midtrans Settlement...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 text-[#0A0B0E]" />
                        <span>Pay now - {formatRupiah(grandTotal)}</span>
                      </>
                    )}
                  </button>
                </div>
              </section>
            </form>

            {/* Policies Footer */}
            <footer className="pt-8 border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400 flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/privacy" className="hover:underline min-h-[44px] flex items-center">
                Refund policy
              </Link>
              <Link href="/shipping" className="hover:underline min-h-[44px] flex items-center">
                Shipping policy
              </Link>
              <Link href="/privacy" className="hover:underline min-h-[44px] flex items-center">
                Privacy policy
              </Link>
              <Link href="/terms" className="hover:underline min-h-[44px] flex items-center">
                Terms of service
              </Link>
            </footer>
          </div>

          {/* =================================================================== */}
          {/* RIGHT COLUMN: STICKY ORDER SUMMARY (42% width, lg:col-span-5) */}
          {/* Dynamically adjusts top offset based on PersistentHeader category bar */}
          {/* =================================================================== */}
          <aside
            aria-label="Order summary"
            className="hidden lg:block lg:col-span-5 bg-slate-50/80 dark:bg-zinc-900/40 border-l border-slate-200 dark:border-zinc-800 px-6 sm:px-8 lg:px-10 py-8 lg:py-10"
          >
            <div
              className={`sticky transition-[top,max-height] duration-300 ease-in-out space-y-6 overflow-y-auto overscroll-contain pr-1 scrollbar-thin ${
                isCategoryBarVisible
                  ? "lg:top-[190px] lg:max-h-[calc(100vh-210px)]"
                  : "lg:top-[140px] lg:max-h-[calc(100vh-160px)]"
              }`}
            >
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                <span>Order summary</span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal">
                  {items.length + customPCs.length} {items.length + customPCs.length === 1 ? "item" : "items"}
                </span>
              </h3>

              {/* Items List */}
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                {/* Standard Cart Items */}
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3 text-xs py-1">
                    <div className="w-14 h-14 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0 flex items-center justify-center p-1 overflow-hidden">
                      <div className="relative w-11 h-11">
                        <Image
                          src={it.item.image}
                          alt={it.item.name}
                          fill
                          sizes="44px"
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs leading-snug line-clamp-2">
                        {it.item.name}
                      </h4>
                      {it.item.variationName && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {it.item.variationName}
                        </p>
                      )}
                    </div>

                    {/* Quantity column to the left of the item price */}
                    <div className="shrink-0 text-center px-2.5">
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                        {it.quantity}
                      </span>
                    </div>

                    <div className="text-right shrink-0 min-w-[80px]">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                        {formatRupiah(it.item.price * it.quantity)}
                      </span>
                      {it.quantity > 1 && (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">
                          {formatRupiah(it.item.price)} each
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Custom PC Systems */}
                {customPCs.map((pc) => (
                  <div key={pc.id} className="flex items-center justify-between gap-3 text-xs py-1">
                    <div className="w-14 h-14 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0 flex items-center justify-center p-1 overflow-hidden">
                      <div className="relative w-11 h-11">
                        <Image
                          src={pc.image || "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500"}
                          alt={pc.name}
                          fill
                          sizes="44px"
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs leading-snug line-clamp-2">
                        {pc.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {pc.serviceTier?.name || "Custom Built Rig"} (~{pc.wattage}W)
                      </p>
                    </div>

                    {/* Quantity column to the left of the item price */}
                    <div className="shrink-0 text-center px-2.5">
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                        1
                      </span>
                    </div>

                    <div className="text-right shrink-0 min-w-[80px]">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                        {formatRupiah(pc.totalPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount Code Input */}
              <form onSubmit={handleApplyDiscount} className="space-y-1 pt-2 border-t border-slate-200 dark:border-zinc-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Discount code or gift card"
                    value={discountCodeInput}
                    onChange={(e) => setDiscountCodeInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 min-h-[44px]"
                  />
                  <button
                    type="submit"
                    disabled={isApplyingDiscount}
                    className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white text-xs font-bold rounded-lg transition-colors min-h-[44px] cursor-pointer disabled:opacity-50"
                  >
                    {isApplyingDiscount ? "..." : "Apply"}
                  </button>
                </div>

                {discountError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 pt-1">
                    {discountError}
                  </p>
                )}

                {appliedDiscount && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs mt-2">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{appliedDiscount.code}</span>
                      <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400">
                        ({appliedDiscount.description})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveDiscount}
                      className="text-slate-400 hover:text-red-500 p-2 rounded min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                      title="Remove discount"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </form>

              {/* Price Breakdown */}
              <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-zinc-800 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatRupiah(rawSubtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                  <span>Shipping</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedFulfillment === "click_and_collect"
                      ? "FREE"
                      : shippingFee === 0
                      ? "FREE"
                      : formatRupiah(shippingFee)}
                  </span>
                </div>

                {appliedDiscount && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="font-bold">-{formatRupiah(appliedDiscount.amount)}</span>
                  </div>
                )}

                {/* Indonesian Tax Itemization (PPN 11%) */}
                <div className="pt-2 pb-1 border-t border-dashed border-slate-200 dark:border-zinc-800/80 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-400 dark:text-zinc-500">
                    <span>Dasar Pengenaan Pajak (DPP)</span>
                    <span>{formatRupiah(checkoutTax.dpp)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 dark:text-zinc-500">
                    <span>PPN 11% (Included)</span>
                    <span>{formatRupiah(checkoutTax.taxAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-4 border-t border-slate-200 dark:border-zinc-800">
                  <div>
                    <span className="text-base font-bold text-zinc-900 dark:text-white block">
                      Total
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Including 11% Indonesian PPN
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium mr-1.5">
                      IDR
                    </span>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white">
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reassurance Badges */}
              <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>100% Genuine Distributor Hardware Guaranteed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Bank Indonesia Licensed Midtrans Gateway</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* INLINE LOGIN MODAL (If guest clicks 'Log in') */}
      {/* ----------------------------------------------------------------------- */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">Sign in to your account</h3>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 rounded-lg">
                {loginError}
              </div>
            )}

            <form onSubmit={handleInlineLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors min-h-[44px] cursor-pointer"
              >
                Sign in
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
