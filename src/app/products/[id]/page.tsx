"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import {
  getProductOrPrebuiltById,
  getProductOverviewData,
  getProductGalleryImages,
  formatVariationTitle,
  MOCK_COMPONENTS,
  ComponentItem,
  ProductVariation,
  PREBUILT_SYSTEMS,
} from "../../../lib/data/mockHardware";
import { ProductItemTileImage } from "../../../components/products/ProductItemTileImage";
import { useCartStore } from "../../../lib/store/useCartStore";
import { useLocationStore } from "../../../lib/store/useLocationStore";
import { useHeaderStore } from "../../../lib/store/useHeaderStore";
import { formatRupiah } from "../../../lib/utils/currency";
import { DeliveryEstimatorWidget } from "../../../components/shipping/DeliveryEstimatorWidget";
import { RichTextRenderer } from "../../../components/ui/RichTextRenderer";
import { ShippingRateOption } from "../../../lib/shipping/types";
import {
  ShieldCheck,
  Store,
  Truck,
  ArrowLeft,
  CheckCircle,
  Plus,
  Minus,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info,
  FileText,
  Tag,
  Zap,
  X,
  Maximize2,
} from "lucide-react";

function isExpressRate(rate: ShippingRateOption): boolean {
  const code = (rate.serviceCode || "").toLowerCase();
  const courier = (rate.courierId || "").toLowerCase();
  const name = (rate.serviceName || "").toLowerCase();

  return (
    courier === "gojek" ||
    courier === "grab" ||
    code.includes("instant") ||
    code.includes("sameday") ||
    name.includes("instant") ||
    name.includes("same day") ||
    name.includes("sameday") ||
    code.includes("yes") ||
    code.includes("best") ||
    code.includes("nextday") ||
    code.includes("next-day") ||
    name.includes("yes") ||
    name.includes("best") ||
    name.includes("next day")
  );
}

function CourierLogo({ courierId }: { courierId: string }) {
  const id = (courierId || "").toLowerCase();
  switch (id) {
    case "jne":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#003399] flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[11px] italic tracking-tight">
          JNE
        </div>
      );
    case "jnt":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#ED1C24] flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[11px] italic tracking-tight">
          J&amp;T
        </div>
      );
    case "sicepat":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#D31515] flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[8px] uppercase tracking-tighter">
          SICEPAT
        </div>
      );
    case "anteraja":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#E91E63] flex flex-col items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[8px] leading-tight lowercase">
          <span>anter</span>
          <span>aja</span>
        </div>
      );
    case "gojek":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#00AA13] flex items-center justify-center text-white shrink-0 select-none shadow-2xs" title="Gojek GoSend">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="12" cy="12" r="2.8" fill="currentColor" />
          </svg>
        </div>
      );
    case "grab":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#00B14F] flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[10px] tracking-tight">
          Grab
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-lg bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-bold text-[10px]">
          EXP
        </div>
      );
  }
}

const DEFAULT_STANDARD_PROVIDERS: ShippingRateOption[] = [
  {
    courierId: "jne",
    courierName: "JNE Express",
    courierBadge: "Official Carrier",
    brandColor: "#003399",
    brandBg: "bg-blue-50 text-blue-800 border-blue-200",
    serviceCode: "jne-reg",
    serviceName: "JNE REG (Reguler)",
    serviceDescription: "Standard nationwide courier service with pickup from warehouse.",
    vehicleType: "van",
    etd: "1 to 2 Days",
    distanceKm: 12.5,
    price: 11000,
    priceFormatted: "Rp 11.000",
    isAvailable: true,
  },
  {
    courierId: "jnt",
    courierName: "J&T Express",
    courierBadge: "Fast Freight",
    brandColor: "#ED1C24",
    brandBg: "bg-red-50 text-red-800 border-red-200",
    serviceCode: "jnt-ez",
    serviceName: "J&T EZ",
    serviceDescription: "Fast 365-day operation with automated shop pickup.",
    vehicleType: "van",
    etd: "1 to 2 Days",
    distanceKm: 12.5,
    price: 12000,
    priceFormatted: "Rp 12.000",
    isAvailable: true,
  },
  {
    courierId: "sicepat",
    courierName: "SiCepat Ekspres",
    courierBadge: "E-Commerce Choice",
    brandColor: "#D31515",
    brandBg: "bg-rose-50 text-rose-800 border-rose-200",
    serviceCode: "sicepat-reg",
    serviceName: "SiCepat REG (Reguler)",
    serviceDescription: "Standard courier service with real-time tracking.",
    vehicleType: "van",
    etd: "1 to 2 Days",
    distanceKm: 12.5,
    price: 10500,
    priceFormatted: "Rp 10.500",
    isAvailable: true,
  },
  {
    courierId: "anteraja",
    courierName: "AnterAja",
    courierBadge: "Tech Courier",
    brandColor: "#E91E63",
    brandBg: "bg-pink-50 text-pink-800 border-pink-200",
    serviceCode: "anteraja-reg",
    serviceName: "AnterAja Reguler",
    serviceDescription: "Reliable barcode scanning and automated courier assignment.",
    vehicleType: "van",
    etd: "1 to 3 Days",
    distanceKm: 12.5,
    price: 10000,
    priceFormatted: "Rp 10.000",
    isAvailable: true,
  },
];

const DEFAULT_EXPRESS_PROVIDERS: ShippingRateOption[] = [
  {
    courierId: "gojek",
    courierName: "Gojek (GoSend)",
    courierBadge: "Instant Motorbike",
    brandColor: "#00AA13",
    brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    serviceCode: "gosend-instant",
    serviceName: "GoSend Instant Motor",
    serviceDescription: "Direct courier dispatch to your doorstep within 1-2 hours.",
    vehicleType: "bike",
    etd: "1 to 2 Hours",
    distanceKm: 12.5,
    price: 20000,
    priceFormatted: "Rp 20.000",
    isAvailable: true,
  },
  {
    courierId: "grab",
    courierName: "Grab (GrabExpress)",
    courierBadge: "Express Rider",
    brandColor: "#00B14F",
    brandBg: "bg-green-50 text-green-800 border-green-200",
    serviceCode: "grab-instant",
    serviceName: "GrabExpress Instant",
    serviceDescription: "Fast point-to-point motorcycle courier dispatch.",
    vehicleType: "bike",
    etd: "1 to 2 Hours",
    distanceKm: 12.5,
    price: 22000,
    priceFormatted: "Rp 22.000",
    isAvailable: true,
  },
  {
    courierId: "jne",
    courierName: "JNE Express",
    courierBadge: "Priority Delivery",
    brandColor: "#003399",
    brandBg: "bg-blue-50 text-blue-800 border-blue-200",
    serviceCode: "jne-yes",
    serviceName: "JNE YES (Yakin Esok Sampai)",
    serviceDescription: "Guaranteed next-day delivery nationwide.",
    vehicleType: "van",
    etd: "Tomorrow by 18:00",
    distanceKm: 12.5,
    price: 24000,
    priceFormatted: "Rp 24.000",
    isAvailable: true,
  },
  {
    courierId: "sicepat",
    courierName: "SiCepat Ekspres",
    courierBadge: "Next Day Express",
    brandColor: "#D31515",
    brandBg: "bg-rose-50 text-rose-800 border-rose-200",
    serviceCode: "sicepat-best",
    serviceName: "SiCepat BEST (Besok Sampai)",
    serviceDescription: "Express delivery arriving tomorrow guaranteed.",
    vehicleType: "van",
    etd: "1 Day (Tomorrow)",
    distanceKm: 12.5,
    price: 22000,
    priceFormatted: "Rp 22.000",
    isAvailable: true,
  },
];

function ProductDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const initialVariationId = searchParams?.get("variation") || null;

  const mockProduct = getProductOrPrebuiltById(id);
  const [liveProduct, setLiveProduct] = useState<any | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const { addStandardItem, addCustomPC, setFulfillmentMethod, fulfillmentMethod, openCart } = useCartStore();
  const { selectedRate, userLocation, setSelectedRate } = useLocationStore();
  const { isCategoryBarVisible } = useHeaderStore();

  type FulfillmentOption = "click_and_collect" | "standard" | "express";
  const [selectedFulfillment, setSelectedFulfillment] = useState<FulfillmentOption>("click_and_collect");
  const [selectedStandardRate, setSelectedStandardRate] = useState<ShippingRateOption | null>(null);
  const [selectedExpressRate, setSelectedExpressRate] = useState<ShippingRateOption | null>(null);
  const [rates, setRates] = useState<ShippingRateOption[]>([]);
  const [isRatesLoading, setIsRatesLoading] = useState(false);

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

  const product = useMemo(() => {
    if (!mockProduct) return liveProduct;
    if (!liveProduct) return mockProduct;

    const hasRealLiveDescription =
      liveProduct.description &&
      typeof liveProduct.description === "string" &&
      !liveProduct.description.includes("high performance PC hardware.") &&
      liveProduct.description.trim().length > 0;

    const mockAny = mockProduct as any;
    return {
      ...mockProduct,
      ...liveProduct,
      category: mockProduct.category || liveProduct.category || liveProduct.category_slug,
      slot: mockAny.slot || liveProduct.slot || liveProduct.pc_builder_slot,
      image: liveProduct.images?.[0] || mockProduct.image,
      images:
        liveProduct.images && liveProduct.images.length > 0
          ? liveProduct.images
          : mockProduct.images,
      description: hasRealLiveDescription
        ? liveProduct.description
        : mockProduct.description || null,
      highlights:
        liveProduct.highlights && liveProduct.highlights.length > 0
          ? liveProduct.highlights
          : mockAny.highlights,
      specs: {
        ...(mockProduct.specs || {}),
        ...(liveProduct.specs || {}),
      },
      variations: liveProduct.variations || mockAny.variations || [],
    };
  }, [mockProduct, liveProduct]);

  const variations: ProductVariation[] = useMemo(() => {
    return product?.variations || [];
  }, [product]);
  const hasVariations = variations.length > 0;

  const attributeGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    if (!hasVariations) return groups;
    for (const v of variations) {
      for (const [key, val] of Object.entries(v.attributes || {})) {
        if (!groups[key]) groups[key] = [];
        if (!groups[key].includes(val)) groups[key].push(val);
      }
    }
    return groups;
  }, [variations, hasVariations]);

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasVariations) return;
    let target = variations.find((v) => v.id === initialVariationId);
    if (!target) {
      target = variations.find((v) => v.stockCount > 0) || variations[0];
    }
    if (target) {
      setSelectedAttributes(target.attributes);
    }
  }, [hasVariations, initialVariationId, variations]);

  const activeVariation: ProductVariation | null = useMemo(() => {
    if (!hasVariations) return null;
    const match = variations.find((v) =>
      Object.entries(selectedAttributes).every(([k, val]) => v.attributes[k] === val)
    );
    return match || variations[0] || null;
  }, [hasVariations, variations, selectedAttributes]);

  const handleAttributeSelect = (groupKey: string, val: string) => {
    const nextAttrs = { ...selectedAttributes, [groupKey]: val };
    const exactMatch = variations.find((v) =>
      Object.entries(nextAttrs).every(([k, vVal]) => v.attributes[k] === vVal)
    );
    if (exactMatch) {
      setSelectedAttributes(nextAttrs);
    } else {
      const closest =
        variations.find((v) => v.attributes[groupKey] === val && v.stockCount > 0) ||
        variations.find((v) => v.attributes[groupKey] === val);
      if (closest) {
        setSelectedAttributes(closest.attributes);
      } else {
        setSelectedAttributes(nextAttrs);
      }
    }
  };

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
  const retailPrice = activeVariation
    ? Number(activeVariation.originalPrice || activeVariation.price)
    : Number(product.retail_price || product.price || 0);

  const salePrice = activeVariation
    ? activeVariation.originalPrice && activeVariation.originalPrice > activeVariation.price
      ? activeVariation.price
      : null
    : product.sale_price !== null && product.sale_price !== undefined
    ? Number(product.sale_price)
    : product.salePrice !== null && product.salePrice !== undefined
    ? Number(product.salePrice)
    : null;

  const hasDiscount = salePrice !== null && salePrice > 0 && salePrice < retailPrice;
  const activePrice = hasDiscount ? salePrice! : retailPrice;
  const discountPercent = hasDiscount ? Math.round(((retailPrice - activePrice) / retailPrice) * 100) : 0;

  const currentStock = activeVariation ? activeVariation.stockCount : Number(product.stockCount || 0);
  const isOutOfStock = currentStock <= 0;

  // Filtered Courier Provider Lists
  const standardList = useMemo(() => {
    const live = rates.filter((r) => !isExpressRate(r));
    return live.length > 0 ? live : DEFAULT_STANDARD_PROVIDERS;
  }, [rates]);

  const expressList = useMemo(() => {
    const live = rates.filter((r) => isExpressRate(r));
    return live.length > 0 ? live : DEFAULT_EXPRESS_PROVIDERS;
  }, [rates]);

  // Computed Price Ranges for Delivery Fulfillment Options
  const standardPriceRange = useMemo(() => {
    if (standardList.length === 0) return "Rp 10.000 to Rp 12.000";
    const prices = standardList.map((r) => r.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatRupiah(min);
    return `${formatRupiah(min)} - ${formatRupiah(max)}`;
  }, [standardList]);

  const expressPriceRange = useMemo(() => {
    if (expressList.length === 0) return "Rp 20.000 to Rp 24.000";
    const prices = expressList.map((r) => r.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatRupiah(min);
    return `${formatRupiah(min)} - ${formatRupiah(max)}`;
  }, [expressList]);

  // Fetch live rates when destination or product changes
  useEffect(() => {
    let isSubscribed = true;
    if (!userLocation) return;
    setIsRatesLoading(true);

    const payload = {
      destination: userLocation,
      items: [
        {
          id: product.id,
          name: product.name,
          price: activePrice,
          weightGrams: isComponent ? 1500 : 18000,
          category: product.category,
        },
      ],
      totalWeightGrams: isComponent ? 1500 : 18000,
      totalPrice: activePrice,
    };

    fetch("/api/shipping/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed && data.success && Array.isArray(data.rates)) {
          setRates(data.rates);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isSubscribed) setIsRatesLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [userLocation?.address, userLocation?.subdistrict, userLocation?.postalCode, id, activePrice, isComponent, product]);

  const handleFulfillmentSelect = (option: FulfillmentOption) => {
    setSelectedFulfillment(option);
    if (option === "click_and_collect") {
      setFulfillmentMethod("click_and_collect");
    } else if (option === "standard") {
      setFulfillmentMethod("delivery");
      if (selectedStandardRate) {
        setSelectedRate(selectedStandardRate);
      }
    } else if (option === "express") {
      setFulfillmentMethod("delivery");
      if (selectedExpressRate) {
        setSelectedRate(selectedExpressRate);
      }
    }
  };

  // Ensure every product has a complete 4-image hardware gallery queue (front, overview, connectors/ports, packaging)
  const galleryImages: string[] = useMemo(() => {
    const base = getProductGalleryImages(product);
    if (activeVariation?.image && !base.includes(activeVariation.image)) {
      return [activeVariation.image, ...base];
    }
    return base;
  }, [product, activeVariation?.image]);

  // Synchronize active gallery photo with selected variation image
  useEffect(() => {
    if (!activeVariation?.image || galleryImages.length === 0) return;
    const imgIndex = galleryImages.indexOf(activeVariation.image);
    if (imgIndex >= 0) {
      setSelectedImage(imgIndex);
    }
  }, [activeVariation?.image, galleryImages]);

  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const thumbnailContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll gallery pictures every 10 seconds
  useEffect(() => {
    if (galleryImages.length <= 1) return;

    const timer = setInterval(() => {
      setSelectedImage((prev) => (prev + 1) % galleryImages.length);
    }, 10000);

    return () => clearInterval(timer);
  }, [galleryImages.length, selectedImage]);

  // Keep active thumbnail centered and visible when image changes
  useEffect(() => {
    const activeThumb = thumbnailRefs.current[selectedImage];
    if (activeThumb && thumbnailContainerRef.current) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedImage]);

  // Fullscreen keyboard navigation and body scroll lock
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      } else if (e.key === "ArrowLeft") {
        setSelectedImage((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      } else if (e.key === "ArrowRight") {
        setSelectedImage((prev) => (prev + 1) % galleryImages.length);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, galleryImages.length]);

  // Quantity Stepper Helpers
  const handleDecreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseQuantity = () => {
    const maxStock = currentStock > 0 ? currentStock : 1;
    setQuantity((prev) => Math.min(maxStock, prev + 1));
  };

  // Handle Add to Cart with selected quantity
  const handleAddToCart = () => {
    if (isOutOfStock) return;

    if (selectedFulfillment === "standard" && !selectedStandardRate) {
      setSelectedRate(standardList[0]);
    } else if (selectedFulfillment === "express" && !selectedExpressRate) {
      setSelectedRate(expressList[0]);
    }

    if (componentItem) {
      addStandardItem(
        {
          ...componentItem,
          id: activeVariation ? `${componentItem.id}-var-${activeVariation.id}` : componentItem.id,
          sku: activeVariation?.sku || componentItem.sku,
          name: activeVariation ? formatVariationTitle(product.name, activeVariation) : componentItem.name,
          image: activeVariation?.image || componentItem.image,
          price: activePrice,
          originalPrice: hasDiscount ? retailPrice : undefined,
          stockCount: currentStock,
          variationId: activeVariation?.id,
          variationName: activeVariation?.name,
          selectedAttributes: activeVariation?.attributes,
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
          originalPrice: hasDiscount ? retailPrice : undefined,
          wattage: 750,
          isPrebuilt: true,
          image: galleryImages[0] || pb.image,
        });
      }
      openCart();
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
          <div
            onClick={() => setIsFullscreen(true)}
            className="group relative rounded-2xl border border-slate-200 dark:border-zinc-700 w-full aspect-4/3 sm:aspect-square md:aspect-4/3 lg:aspect-square min-h-[340px] sm:min-h-[400px] shadow-xs overflow-hidden cursor-zoom-in bg-slate-900"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsFullscreen(true);
              }
            }}
            aria-label="Click to view full screen picture"
          >
            <img
              src={galleryImages[selectedImage] || galleryImages[0] || product.image}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />

            {/* Hover Full Screen indicator pill */}
            <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-full shadow-xs">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Screen</span>
              </span>
            </div>

            {hasDiscount && (
              <div className="absolute top-3 right-3 pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>-{discountPercent}% OFF</span>
                </span>
              </div>
            )}

            {/* Floating Picture Scroller at bottom-right matching Main Banner (invisible container) */}
            {galleryImages.length > 1 && (
              <div
                className="absolute bottom-3 right-3 z-20 flex items-center gap-1 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
                  }}
                  className="min-h-[44px] min-w-[36px] flex items-center justify-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] hover:text-emerald-400 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500"
                  aria-label="Previous picture"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Indicator Dots */}
                <div className="flex items-center gap-1.5 px-1">
                  {galleryImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(idx);
                      }}
                      aria-label={`Go to picture ${idx + 1}`}
                      className="min-h-[44px] min-w-[18px] flex items-center justify-center cursor-pointer focus-visible:outline-hidden"
                    >
                      <span
                        className={`h-2 rounded-full transition-all duration-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] ${
                          selectedImage === idx
                            ? "w-6 bg-white"
                            : "w-2 bg-white/60 hover:bg-white/90"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((prev) => (prev + 1) % galleryImages.length);
                  }}
                  className="min-h-[44px] min-w-[36px] flex items-center justify-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] hover:text-emerald-400 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500"
                  aria-label="Next picture"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Multiple Pictures Gallery Strip & Bottom Scroll Bar */}
          {galleryImages.length > 1 && (
            <div className="space-y-2.5 pt-1">
              <div
                ref={thumbnailContainerRef}
                className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scroll-smooth"
              >
                {galleryImages.map((imgUrl: string, idx: number) => {
                  const isSelected = selectedImage === idx;
                  return (
                    <button
                      key={`${imgUrl}-${idx}`}
                      ref={(el) => {
                        thumbnailRefs.current[idx] = el;
                      }}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-slate-50 dark:bg-zinc-800/80 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white min-h-[44px] ${
                        isSelected
                          ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/10 dark:ring-white/20 scale-102"
                          : "border-slate-200 dark:border-zinc-700/80 opacity-70 hover:opacity-100 hover:border-slate-400"
                      }`}
                      aria-label={`View photo ${idx + 1}`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover object-center" />
                      {idx === 0 && (
                        <span className="absolute bottom-0.5 left-0.5 right-0.5 bg-zinc-900/80 text-[7px] font-bold text-white uppercase text-center rounded">
                          Cover
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Scroll Bar Track at the bottom of the picture list */}
              <div
                className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden relative cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  const targetIdx = Math.min(
                    galleryImages.length - 1,
                    Math.floor(ratio * galleryImages.length)
                  );
                  setSelectedImage(targetIdx);
                }}
                role="progressbar"
                aria-label="Gallery picture list progress"
                aria-valuenow={selectedImage + 1}
                aria-valuemin={1}
                aria-valuemax={galleryImages.length}
              >
                <div
                  className="h-full bg-zinc-900 dark:bg-white rounded-full transition-transform duration-300 ease-out"
                  style={{
                    width: `${100 / galleryImages.length}%`,
                    transform: `translateX(${selectedImage * 100}%)`,
                  }}
                />
              </div>
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
        {/* Clean, modern aesthetic with high-legibility typography & slide-down providers */}
        {/* ======================================================================= */}
        <div className="md:col-span-2 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:row-span-2 min-w-0 self-stretch h-full">
          <div
            className={`lg:sticky space-y-4 z-20 transition-[top] duration-300 ease-in-out ${
              isCategoryBarVisible ? "lg:top-[176px]" : "lg:top-[128px]"
            }`}
          >
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-5 transition-all duration-200">
              {/* Price Header */}
              <div className="space-y-2 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Retail Price
                  </span>
                </div>

                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <div className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {formatRupiah(activePrice)}
                  </div>
                  {hasDiscount && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-normal text-zinc-400 dark:text-zinc-500 line-through">
                        {formatRupiah(retailPrice)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                        -{discountPercent}% OFF
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Two-Dimensional Attribute Selectors */}
              {hasVariations && Object.keys(attributeGroups).length > 0 && (
                <div className="space-y-3 pb-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
                  {Object.entries(attributeGroups).map(([groupName, options]) => {
                    const selectedVal = selectedAttributes[groupName];
                    return (
                      <div key={groupName} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            {groupName}
                          </span>
                          <span className="text-zinc-400 dark:text-zinc-500 font-medium">
                            Selected: <strong className="text-zinc-900 dark:text-zinc-100">{selectedVal || "None"}</strong>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {options.map((optVal) => {
                            const isSelected = selectedVal === optVal;
                            const hasInStock = variations.some(
                              (v) => v.attributes[groupName] === optVal && v.stockCount > 0
                            );

                            return (
                              <button
                                key={optVal}
                                type="button"
                                onClick={() => handleAttributeSelect(groupName, optVal)}
                                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-2 cursor-pointer border ${
                                  isSelected
                                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs ring-2 ring-zinc-900/20 dark:ring-zinc-100/20"
                                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                } ${!hasInStock ? "opacity-60" : ""}`}
                                aria-label={`Select ${groupName} ${optVal}`}
                              >
                                {groupName.toLowerCase().includes("colo") && (
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-zinc-400 dark:border-zinc-600 inline-block shrink-0"
                                    style={{
                                      backgroundColor:
                                        optVal.toLowerCase() === "white"
                                          ? "#ffffff"
                                          : optVal.toLowerCase() === "black"
                                          ? "#18181b"
                                          : optVal.toLowerCase() === "silver"
                                          ? "#94a3b8"
                                          : "#64748b",
                                    }}
                                    aria-hidden="true"
                                  />
                                )}
                                <span>{optVal}</span>
                                {!hasInStock && (
                                  <span className="text-[10px] text-red-500 dark:text-red-400 font-normal">
                                    (Out)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Merged Quantity & Stock Status */}
              <div className="flex items-center justify-between !mt-0 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 min-w-0">
                  <label className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Quantity
                  </label>
                  <span className="text-zinc-300 dark:text-zinc-700 text-xs">•</span>
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isOutOfStock ? "bg-red-500" : "bg-emerald-500"
                      }`}
                    />
                    <span>
                      {isOutOfStock ? "Out of Stock" : `In Stock (${currentStock} Available)`}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-transparent border-0 p-0 shrink-0">
                  <button
                    type="button"
                    onClick={handleDecreaseQuantity}
                    disabled={isOutOfStock || quantity <= 1}
                    className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="min-w-[36px] text-center font-normal text-sm sm:text-base text-zinc-800 dark:text-zinc-200 font-mono tabular-nums select-none">
                    {isOutOfStock ? 0 : quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncreaseQuantity}
                    disabled={isOutOfStock || quantity >= currentStock}
                    className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Delivery Method Selection (Accessible Radio Group: Click & Collect, then Standard, then Express) */}
              <div
                role="radiogroup"
                aria-labelledby="delivery-group-label"
                className="space-y-3"
              >
                <div>
                  <span
                    id="delivery-group-label"
                    className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Delivery Option
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: "click_and_collect" as const,
                      title: "Click and Collect",
                      subtitle: "Mangga Dua Mall Store (Ready in 60 mins)",
                      priceInfo: "Free",
                      icon: Store,
                    },
                    {
                      id: "standard" as const,
                      title: "Standard Delivery",
                      subtitle: "Regular courier (2 to 4 business days)",
                      priceInfo: selectedStandardRate
                        ? selectedStandardRate.priceFormatted
                        : standardPriceRange,
                      icon: Truck,
                    },
                    {
                      id: "express" as const,
                      title: "Express Delivery",
                      subtitle: "Instant & Next-Day (GoSend, Grab, JNE YES)",
                      priceInfo: selectedExpressRate
                        ? selectedExpressRate.priceFormatted
                        : expressPriceRange,
                      icon: Zap,
                    },
                  ].map((option) => {
                    const isSelected = selectedFulfillment === option.id;
                    const IconComponent = option.icon;

                    return (
                      <div key={option.id} className="space-y-2">
                        {/* Option Radio Card */}
                        <label
                          htmlFor={`fulfillment-${option.id}`}
                          className={`group relative flex items-start justify-between gap-3 p-3.5 rounded-xl border min-h-[44px] cursor-pointer transition-all duration-150 ease-out select-none active:scale-[0.99] ${
                            isSelected
                              ? "bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900/90 dark:ring-zinc-100/90 shadow-2xs"
                              : "bg-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                          } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-900 dark:has-[:focus-visible]:ring-zinc-100 has-[:focus-visible]:ring-offset-2 dark:has-[:focus-visible]:ring-offset-zinc-900`}
                        >
                          <input
                            type="radio"
                            id={`fulfillment-${option.id}`}
                            name="fulfillment-method"
                            value={option.id}
                            checked={isSelected}
                            onChange={() => handleFulfillmentSelect(option.id)}
                            className="sr-only"
                          />

                          <div className="flex items-start gap-3 min-w-0">
                            {/* Semantic Radio Check Indicator */}
                            <div
                              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150 ${
                                isSelected
                                  ? "border-zinc-900 dark:border-zinc-100 bg-transparent"
                                  : "border-zinc-300 dark:border-zinc-600 bg-transparent group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
                              }`}
                              aria-hidden="true"
                            >
                              <div
                                className={`w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 transform transition-transform duration-150 ease-out ${
                                  isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                                }`}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <IconComponent className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 tracking-tight">
                                  {option.title}
                                </span>
                              </div>
                              <p className="text-[11px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-normal mt-0.5">
                                {option.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right pt-0.5 flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {option.priceInfo}
                            </span>
                            {option.id !== "click_and_collect" && (
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ease-out ${
                                  isSelected ? "rotate-180 text-zinc-700 dark:text-zinc-200" : ""
                                }`}
                              />
                            )}
                          </div>
                        </label>

                        {/* Slide-Down Content Below Option: Standard Delivery Providers (Shifted forward with tree hierarchy) */}
                        {option.id === "standard" && (
                          <div className={`delivery-options-accordion ${isSelected ? "open" : ""}`}>
                            <div>
                              <div className="delivery-options-content ml-4 sm:ml-5 pl-3 sm:pl-3.5 border-l border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5 pt-1.5 pb-0.5">
                                {standardList.map((rate) => {
                                  const isRateSelected =
                                    selectedStandardRate?.courierId === rate.courierId &&
                                    selectedStandardRate?.serviceCode === rate.serviceCode;

                                  return (
                                    <button
                                      key={`${rate.courierId}-${rate.serviceCode}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedStandardRate(rate);
                                        setSelectedRate(rate);
                                      }}
                                      className={`w-full min-h-[44px] p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                                        isRateSelected
                                          ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50/70 dark:bg-zinc-800/40 ring-1 ring-zinc-900/90 dark:ring-zinc-100/90 shadow-2xs"
                                          : "border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 hover:border-zinc-300 dark:hover:border-zinc-700"
                                      } focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <CourierLogo courierId={rate.courierId} />
                                        <div className="min-w-0">
                                          <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 block truncate">
                                            {rate.serviceName}
                                          </span>
                                          <span className="text-[11px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 block truncate">
                                            ETD: {rate.etd}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                          {rate.priceFormatted}
                                        </span>
                                        <div
                                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150 ${
                                            isRateSelected
                                              ? "border-zinc-900 dark:border-zinc-100 bg-transparent"
                                              : "border-zinc-300 dark:border-zinc-600 bg-transparent"
                                          }`}
                                          aria-hidden="true"
                                        >
                                          <div
                                            className={`w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 transform transition-transform duration-150 ease-out ${
                                              isRateSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                                            }`}
                                          />
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Slide-Down Content Below Option: Express Delivery Providers (Shifted forward with tree hierarchy) */}
                        {option.id === "express" && (
                          <div className={`delivery-options-accordion ${isSelected ? "open" : ""}`}>
                            <div>
                              <div className="delivery-options-content ml-4 sm:ml-5 pl-3 sm:pl-3.5 border-l border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5 pt-1.5 pb-0.5">
                                {expressList.map((rate) => {
                                  const isRateSelected =
                                    selectedExpressRate?.courierId === rate.courierId &&
                                    selectedExpressRate?.serviceCode === rate.serviceCode;

                                  return (
                                    <button
                                      key={`${rate.courierId}-${rate.serviceCode}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedExpressRate(rate);
                                        setSelectedRate(rate);
                                      }}
                                      className={`w-full min-h-[44px] p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                                        isRateSelected
                                          ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50/70 dark:bg-zinc-800/40 ring-1 ring-zinc-900/90 dark:ring-zinc-100/90 shadow-2xs"
                                          : "border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 hover:border-zinc-300 dark:hover:border-zinc-700"
                                      } focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <CourierLogo courierId={rate.courierId} />
                                        <div className="min-w-0">
                                          <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 block truncate">
                                            {rate.serviceName}
                                          </span>
                                          <span className="text-[11px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 block truncate">
                                            ETD: {rate.etd}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                          {rate.priceFormatted}
                                        </span>
                                        <div
                                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150 ${
                                            isRateSelected
                                              ? "border-zinc-900 dark:border-zinc-100 bg-transparent"
                                              : "border-zinc-300 dark:border-zinc-600 bg-transparent"
                                          }`}
                                          aria-hidden="true"
                                        >
                                          <div
                                            className={`w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 transform transition-transform duration-150 ease-out ${
                                              isRateSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                                            }`}
                                          />
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`w-full min-h-[44px] py-3 px-5 rounded-xl text-xs sm:text-sm font-medium transition-all shadow-xs flex items-center justify-center gap-2 ${
                    isOutOfStock
                      ? "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                      : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 cursor-pointer active:scale-[0.99]"
                  } focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{isOutOfStock ? "Out of Stock" : "Add to Shopping Cart"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* BOTTOM HALF: DETAILED OVERVIEW & TECHNICAL SPECIFICATIONS */}
        {/* Spans across Columns 1 & 2 (8 cols on lg) alongside sticky action box */}
        {/* ======================================================================= */}
        <div className="md:col-span-2 lg:col-span-8 lg:col-start-1 lg:row-start-2 space-y-10 min-w-0 pt-8 border-t border-slate-300 dark:border-white/40">
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
                  <div className="py-1 space-y-3">
                    <RichTextRenderer content={product.description} />
                    {overviewData.paragraphs.length > 0 &&
                      !product.description.includes(overviewData.paragraphs[0]) && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                          {overviewData.paragraphs.map((para, i) => (
                            <p key={i} className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                              {para}
                            </p>
                          ))}
                        </div>
                      )}
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
            <div
              key={item.id}
              className="flex flex-col justify-between group transition-colors"
            >
              <div>
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-1.5 flex items-center justify-center block bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                  <Link href={`/products/${item.id}`} className="absolute inset-0 block">
                    <ProductItemTileImage
                      item={item}
                      sizes="(max-width: 640px) 100vw, 25vw"
                    />
                  </Link>

                  {/* Floating Green + Circle / Add to Cart on Bottom Right of Picture */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addStandardItem(
                        item.sale_price && item.sale_price < item.price
                          ? { ...item, price: item.sale_price, originalPrice: item.price }
                          : item
                      );
                      openCart();
                    }}
                    disabled={item.stockCount <= 0}
                    className="group/cart absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-10 min-h-[44px] min-w-[44px] flex items-center justify-end p-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    title="Add to Cart"
                    aria-label={`Add ${item.name} to Cart`}
                  >
                    <div className="h-9 min-w-9 sm:h-10 sm:min-w-10 px-2 sm:px-2.5 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-out group-hover/cart:px-3 sm:group-hover/cart:px-3.5">
                      <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 transition-transform duration-300 group-hover/cart:rotate-90" />
                      <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap text-xs font-bold transition-all duration-300 ease-out group-hover/cart:max-w-[85px] group-hover/cart:opacity-100 group-hover/cart:ml-1.5">
                        Add to Cart
                      </span>
                    </div>
                  </button>
                </div>

                <Link href={`/products/${item.id}`} className="block">
                  <h4 className="text-sm sm:text-base font-normal text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                    {item.name}
                  </h4>
                </Link>
              </div>

              <div className="mt-1 flex flex-col gap-1">
                {/* Price Row */}
                <div className="flex items-baseline justify-between gap-2">
                  {/* Left Column: Current Price & Discount Badge */}
                  <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
                    <span className="text-sm sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                      {formatRupiah(item.sale_price && item.sale_price < item.price ? item.sale_price : item.price)}
                    </span>
                    {item.sale_price && item.sale_price < item.price && (
                      <span className="text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded border border-rose-200 dark:border-rose-900/60 leading-tight shrink-0">
                        -{Math.round(((item.price - item.sale_price) / item.price) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Right Column: Original Price (if discounted) */}
                  {item.sale_price && item.sale_price < item.price && (
                    <div className="flex flex-col items-end text-right shrink-0">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 line-through leading-none">
                        {formatRupiah(item.price)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} fullscreen gallery`}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Top Bar with Title, Counter and Close Button */}
          <div
            className="flex items-center justify-between text-white z-10 w-full max-w-7xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-mono text-zinc-400">
                {selectedImage + 1} / {galleryImages.length}
              </span>
              <span className="text-sm font-semibold text-zinc-200 hidden sm:inline truncate max-w-md">
                {product.name}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Close fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Fullscreen Image Area with Left/Right Nav */}
          <div
            className="relative flex-1 flex items-center justify-center w-full max-w-7xl mx-auto my-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[selectedImage] || galleryImages[0] || product.image}
              alt={`${product.name} - Fullscreen view ${selectedImage + 1}`}
              className="max-h-[80vh] max-w-full w-auto h-auto object-contain select-none transition-all duration-200"
            />

            {/* Previous / Next Fullscreen Navigation Buttons */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImage((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
                  }
                  className="absolute left-2 sm:left-4 min-h-[44px] min-w-[44px] rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedImage((prev) => (prev + 1) % galleryImages.length)
                  }
                  className="absolute right-2 sm:right-4 min-h-[44px] min-w-[44px] rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {galleryImages.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 w-full max-w-xl mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {galleryImages.map((imgUrl: string, idx: number) => (
                <button
                  key={`fs-thumb-${idx}`}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 p-0.5 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    selectedImage === idx
                      ? "border-white ring-2 ring-white/30 scale-105 bg-white/20"
                      : "border-white/30 opacity-60 hover:opacity-100 bg-black/40"
                  }`}
                  aria-label={`View fullscreen photo ${idx + 1}`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-24 text-center text-sm text-slate-500 dark:text-zinc-400">Loading product details...</div>}>
      <ProductDetailContent />
    </Suspense>
  );
}

