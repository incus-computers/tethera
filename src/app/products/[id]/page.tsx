"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  getProductOrPrebuiltById,
  getProductOverviewData,
  MOCK_COMPONENTS,
  ComponentItem,
  PREBUILT_SYSTEMS,
} from "../../../lib/data/mockHardware";
import { useCartStore } from "../../../lib/store/useCartStore";
import { useLocationStore } from "../../../lib/store/useLocationStore";
import { formatRupiah } from "../../../lib/utils/currency";
import { useBuilderStore, BuilderSlotKey } from "../../../lib/store/useBuilderStore";
import { WhatsAppInquiryButton } from "../../../components/whatsapp/WhatsAppInquiryButton";
import { DeliveryEstimatorWidget } from "../../../components/shipping/DeliveryEstimatorWidget";
import { RichTextRenderer } from "../../../components/ui/RichTextRenderer";
import {
  ShieldCheck,
  Store,
  Truck,
  ArrowLeft,
  CheckCircle,
  Plus,
  Minus,
  ShoppingCart,
  Layers,
  ChevronRight,
  Info,
  FileText,
  Tag,
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const mockProduct = getProductOrPrebuiltById(id);
  const [liveProduct, setLiveProduct] = useState<any | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { addStandardItem, addCustomPC, setFulfillmentMethod, fulfillmentMethod, openCart } = useCartStore();
  const { selectedRate } = useLocationStore();
  const { selectSlotItem } = useBuilderStore();

  useEffect(() => {
    let isSubscribed = true;
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed && data.success && data.product) {
          setLiveProduct(data.product);
        }
      })
      .catch(() => {});
    return () => {
      isSubscribed = false;
    };
  }, [id]);

  const product = liveProduct || mockProduct;

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Product Not Found</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
          The hardware component or system you requested is unavailable or has been archived.
        </p>
        <Link
          href="/components"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 min-h-[44px] bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse All Components</span>
        </Link>
      </div>
    );
  }

  const isComponent = "slot" in product || "pc_builder_slot" in product;
  const componentItem = isComponent ? (product as ComponentItem) : null;
  const overviewData = getProductOverviewData(product);

  // Pricing & Slashed-off Discount Calculation
  const retailPrice = Number(product.retail_price || product.price || 0);
  const salePrice =
    product.sale_price !== null && product.sale_price !== undefined
      ? Number(product.sale_price)
      : product.salePrice !== null && product.salePrice !== undefined
      ? Number(product.salePrice)
      : null;
  const hasDiscount = salePrice !== null && salePrice > 0 && salePrice < retailPrice;
  const activePrice = hasDiscount ? salePrice! : retailPrice;
  const discountPercent = hasDiscount ? Math.round(((retailPrice - activePrice) / retailPrice) * 100) : 0;
  const savingsAmount = hasDiscount ? retailPrice - activePrice : 0;

  // Gallery Pictures reflecting exact order
  const galleryImages: string[] =
    product.images && Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.image];

  // Quantity Stepper Helpers
  const handleDecreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseQuantity = () => {
    const maxStock = product.stockCount || 99;
    setQuantity((prev) => Math.min(maxStock, prev + 1));
  };

  // Handle Add to Cart with selected quantity
  const handleAddToCart = () => {
    if (componentItem) {
      addStandardItem(
        {
          ...componentItem,
          price: activePrice,
        },
        quantity
      );
      openCart();
    } else {
      // Prebuilt system
      const pb = product as (typeof PREBUILT_SYSTEMS)[0];
      for (let i = 0; i < quantity; i++) {
        addCustomPC({
          id: `pb-${pb.id}-${Date.now()}-${i}`,
          name: pb.name,
          parts: {
            cpu: { name: pb.cpu } as any,
            gpu: { name: pb.gpu } as any,
            ram: { name: pb.ram } as any,
            storage_primary: { name: pb.storage } as any,
            cooler: { name: pb.cooling } as any,
            case: { name: pb.chassis } as any,
            psu: { name: pb.psu } as any,
            os: { name: pb.os } as any,
          },
          serviceTier: {
            name: "Standard 24h Burn-In Verification",
            price: 0,
            leadTime: "Ready in 60 Mins",
          },
          totalPrice: activePrice,
          wattage: 750,
          isPrebuilt: true,
          image: galleryImages[0] || pb.image,
        });
      }
      openCart();
    }
  };

  // Handle Configure in Builder
  const handleConfigureInBuilder = () => {
    if (componentItem && componentItem.slot) {
      selectSlotItem(componentItem.slot as BuilderSlotKey, {
        ...componentItem,
        price: activePrice,
      });
      router.push("/builder");
    } else {
      router.push("/builder");
    }
  };

  // Key Specifications for Middle Column
  const keySpecs = useMemo(() => {
    if (!isComponent || !componentItem?.specs) return [];
    const entries = Object.entries(componentItem.specs).filter(
      ([key, val]) => val !== undefined && val !== null && val !== ""
    );
    return entries.slice(0, 6).map(([key, val]) => {
      const formattedKey = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      const isWatt = key.toLowerCase().includes("watt");
      return {
        label: formattedKey,
        value: `${val}${isWatt ? " Watts" : ""}`,
      };
    });
  }, [isComponent, componentItem]);

  // Prebuilt Key Specifications for Middle Column
  const prebuiltSpecs = useMemo(() => {
    if (isComponent) return [];
    const pb = product as (typeof PREBUILT_SYSTEMS)[0];
    const list: { label: string; value: string }[] = [];
    if (pb.cpu) list.push({ label: "Processor", value: pb.cpu });
    if (pb.gpu) list.push({ label: "Graphics", value: pb.gpu });
    if (pb.ram) list.push({ label: "Memory", value: pb.ram });
    if (pb.storage) list.push({ label: "Storage", value: pb.storage });
    if (pb.cooling) list.push({ label: "Cooling", value: pb.cooling });
    if (pb.psu) list.push({ label: "Power Supply", value: pb.psu });
    return list.slice(0, 6);
  }, [isComponent, product]);

  // Related matching hardware
  const relatedComponents = MOCK_COMPONENTS.filter(
    (item) => item.id !== product.id && (isComponent ? item.category !== product.category : true)
  ).slice(0, 4);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 space-y-12">
      {/* ========================================================================= */}
      {/* BREADCRUMB TRAIL */}
      {/* ========================================================================= */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
        <Link href="/components" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
          Components
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
        <span className="text-slate-600 dark:text-zinc-400">{product.category}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
        <span className="text-zinc-900 dark:text-zinc-100 font-bold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* ========================================================================= */}
      {/* 3-COLUMN DESKTOP LAYOUT (IMAGE | BRIEF SPECS | STICKY ACTION BOX) */}
      {/* With Detailed Overview & Technical Specs at bottom half */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
        {/* ======================================================================= */}
        {/* COLUMN 1 (LEFT): PRODUCT VISUALS GALLERY */}
        {/* ======================================================================= */}
        <div className="md:col-span-1 lg:col-span-4 lg:col-start-1 lg:row-start-1 space-y-4 min-w-0">
          <div className="relative rounded-2xl bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 p-6 flex items-center justify-center min-h-[340px] sm:min-h-[400px] shadow-xs overflow-hidden item-frame">
            <img
              src={galleryImages[selectedImage] || galleryImages[0] || product.image}
              alt={product.name}
              className="max-h-[320px] w-auto max-w-full object-contain transition-transform duration-300 hover:scale-105"
            />

            <div className="absolute top-3 left-3 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-900 dark:bg-zinc-800 text-white px-2 py-0.5 rounded border border-transparent dark:border-zinc-700">
                {product.brand}
              </span>
              <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100/90 dark:bg-zinc-800/90 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                SKU: {product.sku}
              </span>
            </div>

            {hasDiscount && (
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>-{discountPercent}% OFF</span>
                </span>
              </div>
            )}

            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-full font-bold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>In Stock ({product.stockCount} Available)</span>
              </span>
            </div>
          </div>

          {/* Multiple Pictures Gallery Strip */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
              {galleryImages.map((imgUrl: string, idx: number) => {
                const isSelected = selectedImage === idx;
                return (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-slate-50 dark:bg-zinc-800/80 p-1 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white ${
                      isSelected
                        ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/10 dark:ring-white/20 scale-102"
                        : "border-slate-200 dark:border-zinc-700/80 opacity-70 hover:opacity-100 hover:border-slate-400"
                    }`}
                    aria-label={`View photo ${idx + 1}`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain" />
                    {idx === 0 && (
                      <span className="absolute bottom-0.5 left-0.5 right-0.5 bg-zinc-900/80 text-[7px] font-bold text-white uppercase text-center rounded">
                        Cover
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================================= */}
        {/* COLUMN 2 (MIDDLE): PRODUCT TITLE, BRIEF DESCRIPTION & KEY HIGHLIGHTS */}
        {/* ======================================================================= */}
        <div className="md:col-span-1 lg:col-span-4 lg:col-start-5 lg:row-start-1 space-y-5 min-w-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-widest">
              <span>{product.brand}</span>
              <span>•</span>
              <span>{product.category}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-1 leading-snug">
              {product.name}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 dark:text-zinc-500 font-mono">
              <span>Manufacturer Part Number: {product.sku}</span>
            </div>
          </div>

          {/* Quick Brief Summary */}
          <div className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
            <p>{overviewData.summary}</p>
          </div>

          {/* Key Hardware Specs Highlights (Components) */}
          {keySpecs.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Key Hardware Highlights
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {keySpecs.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80"
                  >
                    <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500 block truncate">
                      {item.label}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate block mt-0.5">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Configuration Highlights (Prebuilts) */}
          {!isComponent && prebuiltSpecs.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Core System Configuration
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {prebuiltSpecs.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80"
                  >
                    <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500 block truncate">
                      {item.label}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate block mt-0.5">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Navigation Jump Links */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center gap-3 text-xs">
            <a
              href="#specifications"
              className="inline-flex items-center gap-1 font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline underline-offset-4 decoration-slate-300 dark:decoration-zinc-700 hover:decoration-zinc-900 transition-colors"
            >
              <span>Full Specifications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <a
              href="#overview"
              className="inline-flex items-center gap-1 font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline underline-offset-4 decoration-slate-300 dark:decoration-zinc-700 hover:decoration-zinc-900 transition-colors"
            >
              <span>Detailed Overview</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Authenticity Footnote */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Official Indonesian Distributor Stock with 2-Year Warranty</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* COLUMN 3 (RIGHT): DEDICATED STICKY ACTION BOX */}
        {/* Contains Price, Stock, Quantity, Delivery options, Add to Cart */}
        {/* Scrolls down seamlessly alongside middle & bottom content */}
        {/* ======================================================================= */}
        <div className="md:col-span-2 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:row-span-2 min-w-0 self-stretch h-full">
          <div className="lg:sticky lg:top-36 space-y-4 z-30">
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-5">
              {/* Price Header */}
              <div className="space-y-1.5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Retail Price
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/80">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>2-Year Warranty</span>
                  </span>
                </div>

                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {formatRupiah(activePrice)}
                  </div>
                  {hasDiscount && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-400 dark:text-zinc-500 line-through">
                        {formatRupiah(retailPrice)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-black bg-rose-600 text-white">
                        -{discountPercent}% OFF
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
                  <span>Tax included • Official Invoice</span>
                  {hasDiscount && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Save {formatRupiah(savingsAmount)}
                    </span>
                  )}
                </div>
              </div>

              {/* Live Store Inventory & Availability */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>In Stock ({product.stockCount} Available)</span>
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Ready to Dispatch
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Flagship Store: Mangga Dua Mall Lt. 3 No. 36 (Open til 6:00 PM)
                </p>
              </div>

              {/* Quantity Stepper */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Quantity
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-800/60 p-1">
                  <button
                    type="button"
                    onClick={handleDecreaseQuantity}
                    disabled={quantity <= 1}
                    className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-base cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center font-black text-sm text-zinc-900 dark:text-zinc-100 font-mono">
                    {quantity}
                  </div>
                  <button
                    type="button"
                    onClick={handleIncreaseQuantity}
                    disabled={quantity >= (product.stockCount || 99)}
                    className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-base cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Fulfillment Method Selection */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Delivery &amp; Fulfillment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod("click_and_collect")}
                    className={`p-2.5 min-h-[44px] rounded-xl border text-left text-xs transition-all flex flex-col justify-center gap-0.5 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white ${
                      fulfillmentMethod === "click_and_collect"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-xs"
                        : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Store className="w-3.5 h-3.5" />
                      <span>Click &amp; Collect</span>
                    </div>
                    <span className="text-[10px] opacity-80">FREE • Ready in 60 Mins</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod("delivery")}
                    className={`p-2.5 min-h-[44px] rounded-xl border text-left text-xs transition-all flex flex-col justify-center gap-0.5 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white ${
                      fulfillmentMethod === "delivery"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-xs"
                        : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Courier Delivery</span>
                    </div>
                    <span className="text-[10px] opacity-80 truncate">
                      {selectedRate ? selectedRate.courierName : "Instant / Regular"}
                    </span>
                  </button>
                </div>

                {/* Courier Rate Estimator Expandable */}
                {fulfillmentMethod === "delivery" && (
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <DeliveryEstimatorWidget
                      item={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        weightGrams: isComponent ? 1500 : 18000,
                        category: product.category,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full min-h-[44px] py-3.5 px-5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Shopping Cart</span>
                </button>

                {isComponent && (
                  <button
                    type="button"
                    onClick={handleConfigureInBuilder}
                    className="w-full min-h-[44px] py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs sm:text-sm font-bold transition-all border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-zinc-500"
                  >
                    <Layers className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <span>Use in PC Builder</span>
                  </button>
                )}

                <WhatsAppInquiryButton
                  mode="product"
                  product={{
                    productName: product.name,
                    sku: product.sku,
                    price: formatRupiah(activePrice),
                    productUrl: typeof window !== "undefined" ? window.location.href : "https://tethera.com",
                  }}
                  className="w-full min-h-[44px] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Trust Reassurance Checklist */}
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>100% Genuine Authorized Indonesian Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>7-Day Immediate Store Replacement</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Insured shipping with fragile protection</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* BOTTOM HALF: DETAILED OVERVIEW & TECHNICAL SPECIFICATIONS */}
        {/* Spans across Columns 1 & 2 (8 cols on lg) alongside sticky action box */}
        {/* ======================================================================= */}
        <div className="md:col-span-2 lg:col-span-8 lg:col-start-1 lg:row-start-2 space-y-10 min-w-0 pt-8 border-t border-slate-200 dark:border-zinc-800">
          {/* PRODUCT OVERVIEW & ARCHITECTURE */}
          <section id="overview" className="scroll-mt-32 space-y-6">
            <div>
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                Architecture &amp; Design
              </span>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Detailed Overview &amp; Highlights
              </h2>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Product Description</span>
                </div>

                {product.description ? (
                  <div className="py-1">
                    <RichTextRenderer content={product.description} />
                  </div>
                ) : (
                  <>
                    <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed">
                      {overviewData.summary}
                    </p>
                    {overviewData.paragraphs.map((para, i) => (
                      <p key={i} className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                        {para}
                      </p>
                    ))}
                  </>
                )}

                {overviewData.highlights.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-3">
                      Architectural &amp; Engineering Highlights
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {overviewData.highlights.map((highlight, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-zinc-200 bg-slate-50/80 dark:bg-zinc-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-700/80"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="font-medium">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hardware Guarantee Card */}
              <div className="p-5 bg-zinc-900 rounded-2xl text-white shadow-md space-y-4 border border-zinc-800">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Hardware Quality Guarantee</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All components and systems sold through Tethera are backed by serialized distributor verification, ensuring 100% genuine hardware with complete factory warranties.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-zinc-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Authorized Distributor Indonesian Stock</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>7-Day Store Immediate Replacement Policy</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Verified Compatible with Tethera PC Builder</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Available for 60-Minute Click &amp; Collect</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TECHNICAL SPECIFICATIONS & COMPATIBILITY GUIDE */}
          <section id="specifications" className="scroll-mt-32 space-y-6 pt-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Hardware Architecture
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mt-0.5">
                Technical Specifications
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs divide-y divide-slate-100 dark:divide-zinc-800">
              <div className="grid grid-cols-3 py-3 px-4 text-xs">
                <span className="font-semibold text-slate-500 dark:text-zinc-400">Manufacturer</span>
                <span className="col-span-2 font-bold text-zinc-900 dark:text-zinc-100">{product.brand}</span>
              </div>
              <div className="grid grid-cols-3 py-3 px-4 text-xs bg-slate-50/50 dark:bg-zinc-800/40">
                <span className="font-semibold text-slate-500 dark:text-zinc-400">Product SKU</span>
                <span className="col-span-2 font-mono text-zinc-900 dark:text-zinc-100">{product.sku}</span>
              </div>
              <div className="grid grid-cols-3 py-3 px-4 text-xs">
                <span className="font-semibold text-slate-500 dark:text-zinc-400">Hardware Category</span>
                <span className="col-span-2 font-medium text-zinc-800 dark:text-zinc-200">{product.category}</span>
              </div>

              {isComponent &&
                Object.entries(componentItem!.specs).map(([key, val], idx) => {
                  if (!val) return null;
                  const formattedKey = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase());

                  return (
                    <div
                      key={key}
                      className={`grid grid-cols-3 py-3 px-4 text-xs ${idx % 2 === 0 ? "bg-slate-50/50 dark:bg-zinc-800/40" : ""}`}
                    >
                      <span className="font-semibold text-slate-500 dark:text-zinc-400">{formattedKey}</span>
                      <span className="col-span-2 font-bold text-zinc-900 dark:text-zinc-100">
                        {val.toString()} {key.toLowerCase().includes("watt") ? "Watts" : ""}
                      </span>
                    </div>
                  );
                })}

              {!isComponent &&
                "specs" in product &&
                Object.entries((product as any).specs).map(([k, v], idx) => (
                  <div
                    key={k}
                    className={`grid grid-cols-3 py-3 px-4 text-xs ${idx % 2 === 0 ? "bg-slate-50/50 dark:bg-zinc-800/40" : ""}`}
                  >
                    <span className="font-semibold text-slate-500 dark:text-zinc-400">{k}</span>
                    <span className="col-span-2 font-bold text-zinc-900 dark:text-zinc-100">{v as string}</span>
                  </div>
                ))}

              <div className="grid grid-cols-3 py-3 px-4 text-xs">
                <span className="font-semibold text-slate-500 dark:text-zinc-400">Warranty Term</span>
                <span className="col-span-2 font-medium text-emerald-800 dark:text-emerald-400">
                  24 Months Return-To-Base Precision Care
                </span>
              </div>
              <div className="grid grid-cols-3 py-3 px-4 text-xs bg-slate-50/50 dark:bg-zinc-800/40">
                <span className="font-semibold text-slate-500 dark:text-zinc-400">Warehouse Location</span>
                <span className="col-span-2 text-slate-600 dark:text-zinc-300 font-medium">
                  Flagship Store Aisle 3 / Holding Bin B-12
                </span>
              </div>
            </div>

            {/* Fitment Notes Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                <Info className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span>Compatibility &amp; Fitment Notes</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                All components sold by Tethera are factory-sealed brand new stock. If you are ordering for self-assembly, verify motherboards, cooling clearance, and power supply rating prior to assembly.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs text-slate-600 dark:text-zinc-300 space-y-1">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">Need Verification?</div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Our technicians can verify your parts list on WhatsApp prior to ordering.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RELATED / SUGGESTED PAIRINGS (FULL WIDTH) */}
      {/* ========================================================================= */}
      <div className="pt-8 border-t border-slate-200 dark:border-zinc-800 space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Suggested Pairings
          </span>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mt-0.5">
            Matching Hardware &amp; Components
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {relatedComponents.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.id}`}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden p-4 flex flex-col justify-between tethera-card-hover group"
            >
              <div>
                <div className="relative h-36 bg-slate-50 dark:bg-zinc-800/80 rounded-xl overflow-hidden mb-3 border border-slate-100 dark:border-zinc-700/60 flex items-center justify-center p-2 item-frame">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-contain p-2 group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute top-2 left-2 z-10 text-[9px] font-bold uppercase tracking-wider bg-white/90 dark:bg-zinc-800 px-2 py-0.5 rounded shadow-2xs text-slate-700 dark:text-zinc-200 border border-transparent dark:border-zinc-700">
                    {item.brand}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">SKU: {item.sku}</div>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 mt-0.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                  {item.name}
                </h4>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-base font-black text-zinc-900 dark:text-zinc-100">{formatRupiah(item.price)}</div>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white flex items-center gap-1 transition-colors">
                  <span>View Specs</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
