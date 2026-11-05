"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Upload,
  ArrowUp,
  ArrowDown,
  Ban,
  FileText,
  Image as ImageIcon,
  ShoppingBag,
  Calendar,
  Compass,
  Share2,
  TrendingUp,
  BarChart3,
  DollarSign,
  Percent,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Bell,
  AlertTriangle,
  ArrowLeftRight,
  GripVertical,
  ChevronLeft,
  Cpu,
  Store,
  MessageSquare,
} from "lucide-react";
import { useAdminStore } from "@/lib/store/useAdminStore";
import { formatRupiah } from "@/lib/utils/currency";
import { Product, Order, Promotion, DynamicBannerSlide, CustomerProfileRow } from "@/lib/db/types";
import { ProductGalleryManager } from "@/components/admin/ProductGalleryManager";
import { ProductVariationsManager } from "@/components/admin/ProductVariationsManager";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  HomepageModuleItem,
  CustomPcHeroConfig,
  DEFAULT_HOMEPAGE_MODULES,
  DEFAULT_CUSTOM_PC_HERO,
  DEFAULT_FEATURED_PREBUILT_IDS,
} from "@/lib/data/homepageConfig";
import { PREBUILT_SYSTEMS } from "@/lib/data/mockHardware";
import { AdminSidebar, AdminTab } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { FluxOverviewTab } from "@/components/admin/FluxOverviewTab";
import { FluxOrdersTab } from "@/components/admin/FluxOrdersTab";
import { FluxProductsTab } from "@/components/admin/FluxProductsTab";
import { FluxPromotionsTab } from "@/components/admin/FluxPromotionsTab";
import { FluxCrmTab } from "@/components/admin/FluxCrmTab";
import { FluxAnalyticsTab } from "@/components/admin/FluxAnalyticsTab";
import { FluxOrderDrawer } from "@/components/admin/FluxOrderDrawer";
import { FluxCustomerDrawer } from "@/components/admin/FluxCustomerDrawer";

const HARDWARE_CATEGORIES = [
  { slug: "cpu", name: "Processors (CPUs)", slot: "cpu" },
  { slug: "gpu", name: "Graphics Cards (GPUs)", slot: "gpu" },
  { slug: "motherboards", name: "Motherboards", slot: "motherboard" },
  { slug: "cooling", name: "Cooling & Fans", slot: "cooler" },
  { slug: "ram", name: "Memory (RAM)", slot: "ram" },
  { slug: "storage", name: "Solid State Storage (SSD)", slot: "storage_primary" },
  { slug: "cases", name: "PC Cases / Chassis", slot: "case" },
  { slug: "power-supplies", name: "Power Supplies (PSU)", slot: "psu" },
];

export default function AdminPortalPage() {
  const { user, token, isAuthenticated, isSuperAdmin, isLoading, error, login, logout, initSession } =
    useAdminStore();

  // Navigation State
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<any | null>(null);
  const [selectedCustomerForDrawer, setSelectedCustomerForDrawer] = useState<CustomerProfileRow | null>(null);

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
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modals State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newProductImageUrl, setNewProductImageUrl] = useState("");
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductRetailPrice, setNewProductRetailPrice] = useState<number | "">("");
  const [newProductSalePrice, setNewProductSalePrice] = useState<number | "">("");
  const [newProductDiscountPercent, setNewProductDiscountPercent] = useState<number | "">("");
  const [newProductDiscountEnabled, setNewProductDiscountEnabled] = useState(false);

  const [dispatchModalOrder, setDispatchModalOrder] = useState<any | null>(null);
  const [selectedCourierProvider, setSelectedCourierProvider] = useState<
    "jne" | "jnt" | "sicepat" | "anteraja" | "gojek" | "grab"
  >("jne");
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>("jne-reg");
  const [pickupMode, setPickupMode] = useState<"now" | "scheduled">("now");
  const [pickupDate, setPickupDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [pickupTime, setPickupTime] = useState<string>("14:00");
  const [dispatchingLoading, setDispatchingLoading] = useState(false);
  const [simulatingWebhookOrderId, setSimulatingWebhookOrderId] = useState<string | null>(null);
  const [activeWebhookMenuOrderId, setActiveWebhookMenuOrderId] = useState<string | null>(null);

  // Reject Order Modal State
  const [rejectModalOrder, setRejectModalOrder] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("Out of stock in warehouse");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [rejectingSubmitting, setRejectingSubmitting] = useState(false);

  // Promotions & Banners Modal State
  const [newPromoModalOpen, setNewPromoModalOpen] = useState(false);
  const [newBannerModalOpen, setNewBannerModalOpen] = useState(false);
  const [newBannerForm, setNewBannerForm] = useState({
    title: "New High-Performance Drop",
    highlight: "Exclusive Allocation • Limited Supply",
    description: "Experience ultra-fast gaming and computing with official manufacturer guaranteed hardware.",
    badge: "Special Promotion",
    badge_type: "event" as const,
    cta_text: "Explore Collection",
    cta_link: "/components",
    image_url: "",
    hide_overlay: false,
    perk: "Full 3-Year Official Manufacturer Warranty",
    display_order: 1,
  });

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [newImageUrlInput, setNewImageUrlInput] = useState("");

  // Customer Management & Inspection State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfileRow | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSegmentFilter, setCustomerSegmentFilter] = useState<string>("all");
  const [customerOptInOnly, setCustomerOptInOnly] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const newProductFileInputRef = useRef<HTMLInputElement | null>(null);
  const customPcHeroFileInputRef = useRef<HTMLInputElement | null>(null);

  // Homepage Modules, Custom PC Hero & Featured Prebuilts State
  const [homepageModules, setHomepageModules] = useState<HomepageModuleItem[]>(DEFAULT_HOMEPAGE_MODULES);
  const [customPcHeroConfig, setCustomPcHeroConfig] = useState<CustomPcHeroConfig>(DEFAULT_CUSTOM_PC_HERO);
  const [featuredPrebuiltIds, setFeaturedPrebuiltIds] = useState<string[]>(DEFAULT_FEATURED_PREBUILT_IDS);
  const [savingModules, setSavingModules] = useState(false);
  const [savingCustomPcHero, setSavingCustomPcHero] = useState(false);
  const [savingFeaturedPrebuilts, setSavingFeaturedPrebuilts] = useState(false);
  const [draggedModuleIdx, setDraggedModuleIdx] = useState<number | null>(null);
  const [dragOverModuleIdx, setDragOverModuleIdx] = useState<number | null>(null);

  // Draggable Table & Sales Analytics State
  const DEFAULT_ANALYTICS_COL_WIDTHS: Record<string, number> = {
    product: 260,
    sku: 120,
    category: 130,
    price: 130,
    cost: 120,
    unitsWeek: 105,
    unitsLifetime: 105,
    revWeek: 140,
    profitWeek: 140,
    margin: 95,
    stock: 110,
    actions: 125,
  };

  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_ANALYTICS_COL_WIDTHS);
  const [isResizing, setIsResizing] = useState(false);
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [analyticsCategoryFilter, setAnalyticsCategoryFilter] = useState("all");
  const [analyticsSortBy, setAnalyticsSortBy] = useState<string>("weeklyGrossProfit");
  const [analyticsSortOrder, setAnalyticsSortOrder] = useState<"desc" | "asc">("desc");
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<"7d" | "30d" | "all">("7d");
  const [selectedItemAnalytics, setSelectedItemAnalytics] = useState<any | null>(null);

  // Column Resizing Handler
  const handleColResizeStart = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = colWidths[colKey] || 120;
    setIsResizing(true);

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(65, Math.min(650, startWidth + delta));
      setColWidths((prev) => ({
        ...prev,
        [colKey]: nextWidth,
      }));
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const resetColWidths = () => {
    setColWidths(DEFAULT_ANALYTICS_COL_WIDTHS);
    showToast("Table column widths reset to default.");
  };

  // Product Catalog: Resizable & Arrangeable Table State
  const DEFAULT_PRODUCT_COL_WIDTHS: Record<string, number> = {
    product: 280,
    category: 140,
    sku: 140,
    price: 150,
    stock_on_hand: 120,
    stock_available: 120,
    pictures: 100,
    actions: 160,
  };

  const DEFAULT_PRODUCT_COL_ORDER = [
    "product",
    "category",
    "sku",
    "price",
    "stock_on_hand",
    "stock_available",
    "pictures",
    "actions",
  ];

  const PRODUCT_COL_LABELS: Record<string, string> = {
    product: "Hardware Product",
    category: "Category",
    sku: "SKU / Brand",
    price: "Retail Price",
    stock_on_hand: "Stock on Hand",
    stock_available: "Available",
    pictures: "Pictures",
    actions: "Actions",
  };

  const [productColWidths, setProductColWidths] = useState<Record<string, number>>(DEFAULT_PRODUCT_COL_WIDTHS);
  const [productColOrder, setProductColOrder] = useState<string[]>(DEFAULT_PRODUCT_COL_ORDER);
  const [isProductResizing, setIsProductResizing] = useState(false);
  const [draggedProductCol, setDraggedProductCol] = useState<string | null>(null);
  const [dragOverProductCol, setDragOverProductCol] = useState<string | null>(null);
  const [productLowStockFilter, setProductLowStockFilter] = useState(false);

  // Column Resizing Handler for Product Catalog
  const handleProductColResizeStart = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = productColWidths[colKey] || 120;
    setIsProductResizing(true);

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(65, Math.min(650, startWidth + delta));
      setProductColWidths((prev) => ({
        ...prev,
        [colKey]: nextWidth,
      }));
    };

    const onMouseUp = () => {
      setIsProductResizing(false);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Column Reordering Handlers for Product Catalog
  const moveProductCol = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= productColOrder.length) return;
    const next = [...productColOrder];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setProductColOrder(next);
  };

  const handleProductColDragStart = (colKey: string, e: React.DragEvent) => {
    setDraggedProductCol(colKey);
    e.dataTransfer.setData("text/plain", colKey);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleProductColDragOver = (colKey: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverProductCol !== colKey) {
      setDragOverProductCol(colKey);
    }
  };

  const handleProductColDrop = (targetColKey: string, e: React.DragEvent) => {
    e.preventDefault();
    const sourceColKey = draggedProductCol || e.dataTransfer.getData("text/plain");
    if (sourceColKey && sourceColKey !== targetColKey) {
      const fromIndex = productColOrder.indexOf(sourceColKey);
      const toIndex = productColOrder.indexOf(targetColKey);
      if (fromIndex !== -1 && toIndex !== -1) {
        moveProductCol(fromIndex, toIndex);
        showToast(`Column reordered: '${PRODUCT_COL_LABELS[sourceColKey] || sourceColKey}' moved.`);
      }
    }
    setDraggedProductCol(null);
    setDragOverProductCol(null);
  };

  const resetProductTableLayout = () => {
    setProductColWidths(DEFAULT_PRODUCT_COL_WIDTHS);
    setProductColOrder(DEFAULT_PRODUCT_COL_ORDER);
    showToast("Product Catalog table columns and widths reset to default.");
  };

  // Actionable Notifications Bar State
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [notificationsDismissed, setNotificationsDismissed] = useState(false);

  const notificationsData = useMemo(() => {
    const unfulfilledOrders = orders.filter((o) =>
      ["order_received", "order_accepted", "finding_stock", "finding_courier", "ready_for_pickup"].includes(o.status)
    );

    const newOrders = orders.filter((o) => o.status === "order_received");
    const findingCourierOrders = orders.filter((o) => o.status === "finding_courier");
    const readyForPickupOrders = orders.filter((o) => o.status === "ready_for_pickup");

    const lowStockProducts = products.filter((p) => {
      const avail = p.stock_available !== undefined ? p.stock_available : p.stock_on_hand;
      return avail > 0 && avail <= 3;
    });

    const outOfStockProducts = products.filter((p) => {
      const avail = p.stock_available !== undefined ? p.stock_available : p.stock_on_hand;
      return avail <= 0;
    });

    const totalActionCount = unfulfilledOrders.length + lowStockProducts.length + outOfStockProducts.length;

    return {
      unfulfilledOrders,
      newOrders,
      findingCourierOrders,
      readyForPickupOrders,
      lowStockProducts,
      outOfStockProducts,
      totalActionCount,
    };
  }, [orders, products]);

  // Analytics & Profit Intelligence Calculation Engine
  const analyticsData = useMemo(() => {
    const now = new Date();
    const ms7d = 7 * 24 * 60 * 60 * 1000;
    const ms14d = 14 * 24 * 60 * 60 * 1000;

    const t7d = now.getTime() - ms7d;
    const t14d = now.getTime() - ms14d;

    // Filter out cancelled orders for sales computations
    const validOrders = orders.filter((o) => o.status !== "cancelled");

    // Orders in last 7 days vs previous 7 days
    const orders7d = validOrders.filter((o) => new Date(o.created_at).getTime() >= t7d);
    const ordersPrev7d = validOrders.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= t14d && t < t7d;
    });

    const calcOrderEconomics = (ord: any) => {
      let rev = 0;
      let profit = 0;
      let units = 0;
      if (ord.items && Array.isArray(ord.items) && ord.items.length > 0) {
        for (const it of ord.items) {
          const qty = it.quantity || 1;
          const uPrice = it.unit_price || it.product?.retail_price || 0;
          const uCost =
            it.product?.cost_price ??
            (it.product?.retail_price ? Math.round(it.product.retail_price * 0.82) : Math.round(uPrice * 0.82));
          rev += uPrice * qty;
          profit += (uPrice - uCost) * qty;
          units += qty;
        }
      } else {
        rev = ord.total || ord.subtotal || 0;
        profit = Math.round(rev * 0.18);
        units = 1;
      }
      return { rev, profit, units };
    };

    // Weekly aggregate (last 7 days)
    let weeklySales = 0;
    let weeklyGrossProfit = 0;
    let weeklyUnits = 0;
    for (const o of orders7d) {
      const { rev, profit, units } = calcOrderEconomics(o);
      weeklySales += rev;
      weeklyGrossProfit += profit;
      weeklyUnits += units;
    }

    // Previous 7 days aggregate for comparison
    let prevWeeklySales = 0;
    let prevWeeklyGrossProfit = 0;
    for (const o of ordersPrev7d) {
      const { rev, profit } = calcOrderEconomics(o);
      prevWeeklySales += rev;
      prevWeeklyGrossProfit += profit;
    }

    const weeklyOrdersCount = orders7d.length;
    const weeklyAov = weeklyOrdersCount > 0 ? Math.round(weeklySales / weeklyOrdersCount) : 0;
    const weeklyMarginPct = weeklySales > 0 ? Math.round((weeklyGrossProfit / weeklySales) * 100) : 18;

    const salesGrowthPct =
      prevWeeklySales > 0 ? Math.round(((weeklySales - prevWeeklySales) / prevWeeklySales) * 100) : 0;
    const profitGrowthPct =
      prevWeeklyGrossProfit > 0
        ? Math.round(((weeklyGrossProfit - prevWeeklyGrossProfit) / prevWeeklyGrossProfit) * 100)
        : 0;

    // Lifetime totals
    let lifetimeSales = 0;
    let lifetimeGrossProfit = 0;
    let lifetimeUnits = 0;
    for (const o of validOrders) {
      const { rev, profit, units } = calcOrderEconomics(o);
      lifetimeSales += rev;
      lifetimeGrossProfit += profit;
      lifetimeUnits += units;
    }

    // 7-Day Day-by-Day Series
    const daysMap: Record<
      string,
      { dateStr: string; label: string; revenue: number; profit: number; orders: number; units: number }
    > = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      const dayName =
        i === 0
          ? "Today"
          : i === 1
          ? "Yesterday"
          : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      daysMap[key] = {
        dateStr: key,
        label: dayName,
        revenue: 0,
        profit: 0,
        orders: 0,
        units: 0,
      };
    }

    for (const o of orders7d) {
      const key = new Date(o.created_at).toISOString().split("T")[0];
      if (daysMap[key]) {
        const { rev, profit, units } = calcOrderEconomics(o);
        daysMap[key].revenue += rev;
        daysMap[key].profit += profit;
        daysMap[key].orders += 1;
        daysMap[key].units += units;
      }
    }

    const dailyBreakdown = Object.values(daysMap);

    // Per-Product Aggregations
    const productSalesMap: Record<
      string,
      {
        weeklyUnits: number;
        weeklyRevenue: number;
        weeklyProfit: number;
        lifetimeUnits: number;
        lifetimeRevenue: number;
        lifetimeProfit: number;
        orders: Array<{ order: any; item: any; unitCost: number; unitProfit: number }>;
        dailySales7D: Record<string, { units: number; revenue: number; profit: number }>;
      }
    > = {};

    for (const p of products) {
      const dailyInit: Record<string, { units: number; revenue: number; profit: number }> = {};
      for (const d of dailyBreakdown) {
        dailyInit[d.dateStr] = { units: 0, revenue: 0, profit: 0 };
      }
      productSalesMap[p.id] = {
        weeklyUnits: 0,
        weeklyRevenue: 0,
        weeklyProfit: 0,
        lifetimeUnits: 0,
        lifetimeRevenue: 0,
        lifetimeProfit: 0,
        orders: [],
        dailySales7D: dailyInit,
      };
    }

    for (const o of validOrders) {
      const is7d = new Date(o.created_at).getTime() >= t7d;
      const dateKey = new Date(o.created_at).toISOString().split("T")[0];

      if (o.items && Array.isArray(o.items)) {
        for (const it of o.items) {
          const prodId = it.product_id;
          if (!prodId) continue;

          if (!productSalesMap[prodId]) {
            const dailyInit: Record<string, { units: number; revenue: number; profit: number }> = {};
            for (const d of dailyBreakdown) {
              dailyInit[d.dateStr] = { units: 0, revenue: 0, profit: 0 };
            }
            productSalesMap[prodId] = {
              weeklyUnits: 0,
              weeklyRevenue: 0,
              weeklyProfit: 0,
              lifetimeUnits: 0,
              lifetimeRevenue: 0,
              lifetimeProfit: 0,
              orders: [],
              dailySales7D: dailyInit,
            };
          }

          const qty = it.quantity || 1;
          const uPrice = it.unit_price || it.product?.retail_price || 0;
          const uCost =
            it.product?.cost_price ??
            (it.product?.retail_price ? Math.round(it.product.retail_price * 0.82) : Math.round(uPrice * 0.82));
          const uProfit = uPrice - uCost;
          const lineRev = uPrice * qty;
          const lineProfit = uProfit * qty;

          const stat = productSalesMap[prodId];
          stat.lifetimeUnits += qty;
          stat.lifetimeRevenue += lineRev;
          stat.lifetimeProfit += lineProfit;
          stat.orders.push({ order: o, item: it, unitCost: uCost, unitProfit: uProfit });

          if (is7d) {
            stat.weeklyUnits += qty;
            stat.weeklyRevenue += lineRev;
            stat.weeklyProfit += lineProfit;
            if (stat.dailySales7D[dateKey]) {
              stat.dailySales7D[dateKey].units += qty;
              stat.dailySales7D[dateKey].revenue += lineRev;
              stat.dailySales7D[dateKey].profit += lineProfit;
            }
          }
        }
      }
    }

    const enrichedProducts = products.map((p) => {
      const stats = productSalesMap[p.id] || {
        weeklyUnits: 0,
        weeklyRevenue: 0,
        weeklyProfit: 0,
        lifetimeUnits: 0,
        lifetimeRevenue: 0,
        lifetimeProfit: 0,
        orders: [],
        dailySales7D: {},
      };

      const costPrice = p.cost_price ?? Math.round(p.retail_price * 0.82);
      const unitGrossProfit = p.retail_price - costPrice;
      const marginPct = p.retail_price > 0 ? Math.round((unitGrossProfit / p.retail_price) * 100) : 0;

      const dailyRunRate = stats.weeklyUnits / 7;
      const daysOfSupply =
        dailyRunRate > 0 ? Math.round(p.stock_on_hand / dailyRunRate) : p.stock_on_hand > 0 ? 999 : 0;

      return {
        ...p,
        cost_price: costPrice,
        unitGrossProfit,
        marginPct,
        weeklyUnits: stats.weeklyUnits,
        weeklyRevenue: stats.weeklyRevenue,
        weeklyGrossProfit: stats.weeklyProfit,
        lifetimeUnits: stats.lifetimeUnits,
        lifetimeRevenue: stats.lifetimeRevenue,
        lifetimeGrossProfit: stats.lifetimeProfit,
        ordersCount: stats.orders.length,
        orders: stats.orders,
        dailySales7D: stats.dailySales7D,
        daysOfSupply,
      };
    });

    return {
      weeklySales,
      weeklyGrossProfit,
      weeklyUnits,
      weeklyOrdersCount,
      weeklyAov,
      weeklyMarginPct,
      salesGrowthPct,
      profitGrowthPct,
      lifetimeSales,
      lifetimeGrossProfit,
      lifetimeUnits,
      lifetimeOrdersCount: validOrders.length,
      dailyBreakdown,
      enrichedProducts,
    };
  }, [orders, products]);

  // Filtered & Sorted Products for Draggable Analytics Table
  const sortedAndFilteredProducts = useMemo(() => {
    let list = [...analyticsData.enrichedProducts];

    if (analyticsSearch.trim()) {
      const q = analyticsSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
      );
    }

    if (analyticsCategoryFilter !== "all") {
      list = list.filter((p) => p.category_slug === analyticsCategoryFilter);
    }

    list.sort((a, b) => {
      let valA: any = a[analyticsSortBy];
      let valB: any = b[analyticsSortBy];

      if (analyticsSortBy === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
        return analyticsSortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      const numA = typeof valA === "number" ? valA : 0;
      const numB = typeof valB === "number" ? valB : 0;
      return analyticsSortOrder === "asc" ? numA - numB : numB - numA;
    });

    return list;
  }, [
    analyticsData.enrichedProducts,
    analyticsSearch,
    analyticsCategoryFilter,
    analyticsSortBy,
    analyticsSortOrder,
  ]);

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

      // 4. Load Customers (for all authenticated admins)
      const resCustomers = await fetch("/api/admin/customers", { headers });
      if (resCustomers.ok) {
        const d = await resCustomers.json();
        if (d.success) {
          setCustomers(d.customers || []);
          setCrmStats(d.stats);
        }
      }

      // 5. Load Homepage Modules & Custom PC Hero
      try {
        const resHp = await fetch("/api/admin/homepage-modules");
        if (resHp.ok) {
          const dHp = await resHp.json();
          if (dHp.success) {
            if (Array.isArray(dHp.modules) && dHp.modules.length > 0) {
              setHomepageModules(dHp.modules);
              if (typeof window !== "undefined") {
                localStorage.setItem("tethera_homepage_modules", JSON.stringify(dHp.modules));
              }
            }
            if (dHp.customPcHero) {
              setCustomPcHeroConfig(dHp.customPcHero);
              if (typeof window !== "undefined") {
                localStorage.setItem("tethera_custom_pc_hero", JSON.stringify(dHp.customPcHero));
              }
            }
            if (Array.isArray(dHp.featuredPrebuiltIds) && dHp.featuredPrebuiltIds.length > 0) {
              setFeaturedPrebuiltIds(dHp.featuredPrebuiltIds);
              if (typeof window !== "undefined") {
                localStorage.setItem("tethera_featured_prebuilt_ids", JSON.stringify(dHp.featuredPrebuiltIds));
              }
            } else if (typeof window !== "undefined") {
              const cachedPrebuilts = localStorage.getItem("tethera_featured_prebuilt_ids");
              if (cachedPrebuilts) {
                try {
                  const parsed = JSON.parse(cachedPrebuilts);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setFeaturedPrebuiltIds(parsed);
                  }
                } catch {
                  // Ignore parse error
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load homepage modules:", err);
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
  // LOCAL PC IMAGE UPLOAD HANDLER
  // --------------------------------------------------------------------------
  const handleUploadFileFromPC = async (
    file: File,
    destination: "edit_product" | "new_product" | "banner" | "custom_pc_hero"
  ) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Image upload failed.");
        setUploadingImage(false);
        return;
      }

      const finalUrl = data.url || data.publicUrl || data.dataUrl;

      if (destination === "edit_product" && editingProduct) {
        const existingImages = editingProduct.images || [];
        setEditingProduct({
          ...editingProduct,
          images: [...existingImages, finalUrl],
        });
        showToast("Image uploaded from PC and added to product gallery.");
      } else if (destination === "new_product") {
        setNewProductImageUrl(finalUrl);
        setNewProductImages((prev) => [...prev, finalUrl]);
        showToast("Image uploaded from PC and assigned to new product.");
      } else if (destination === "banner") {
        setNewBannerForm((prev) => ({ ...prev, image_url: finalUrl }));
        showToast("Banner image uploaded from PC.");
      } else if (destination === "custom_pc_hero") {
        setCustomPcHeroConfig((prev) => ({ ...prev, imageUrl: finalUrl }));
        showToast("Custom Desktop PCs showcase rig image uploaded from PC.");
      }
    } catch (err: any) {
      alert("Error uploading image: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // --------------------------------------------------------------------------
  // HOMEPAGE MODULES REORDERING & CUSTOM PC HERO BANNER HANDLERS
  // --------------------------------------------------------------------------
  const handleMoveModule = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === homepageModules.length - 1) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    setHomepageModules((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleToggleModule = (id: string) => {
    setHomepageModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleModuleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedModuleIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleModuleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverModuleIdx !== index) {
      setDragOverModuleIdx(index);
    }
  };

  const handleModuleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedModuleIdx === null || draggedModuleIdx === targetIndex) {
      setDraggedModuleIdx(null);
      setDragOverModuleIdx(null);
      return;
    }
    setHomepageModules((prev) => {
      const next = [...prev];
      const [draggedItem] = next.splice(draggedModuleIdx, 1);
      next.splice(targetIndex, 0, draggedItem);
      return next;
    });
    setDraggedModuleIdx(null);
    setDragOverModuleIdx(null);
  };

  const handleSaveHomepageModules = async () => {
    setSavingModules(true);
    try {
      const res = await fetch("/api/admin/homepage-modules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ modules: homepageModules }),
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("tethera_homepage_modules", JSON.stringify(homepageModules));
          window.dispatchEvent(new Event("tethera_homepage_updated"));
        }
        showToast("Homepage layout module order saved successfully.");
      } else {
        alert(data.error || "Failed to save module order");
      }
    } catch (err: any) {
      alert("Error saving layout: " + err.message);
    } finally {
      setSavingModules(false);
    }
  };

  const handleResetHomepageModules = async () => {
    if (!confirm("Reset homepage module order to standard factory default?")) return;
    setHomepageModules(DEFAULT_HOMEPAGE_MODULES);
    try {
      await fetch("/api/admin/homepage-modules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ modules: DEFAULT_HOMEPAGE_MODULES }),
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("tethera_homepage_modules", JSON.stringify(DEFAULT_HOMEPAGE_MODULES));
        window.dispatchEvent(new Event("tethera_homepage_updated"));
      }
      showToast("Homepage layout reset to default order.");
    } catch (err: any) {
      alert("Error resetting layout: " + err.message);
    }
  };

  const handleSaveCustomPcHero = async () => {
    setSavingCustomPcHero(true);
    try {
      const res = await fetch("/api/admin/homepage-modules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ customPcHero: customPcHeroConfig }),
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("tethera_custom_pc_hero", JSON.stringify(customPcHeroConfig));
          window.dispatchEvent(new Event("tethera_homepage_updated"));
        }
        showToast("Custom Desktop PCs showcase banner updated successfully.");
      } else {
        alert(data.error || "Failed to save Custom PC banner");
      }
    } catch (err: any) {
      alert("Error saving banner: " + err.message);
    } finally {
      setSavingCustomPcHero(false);
    }
  };

  // --------------------------------------------------------------------------
  // FEATURED PREBUILT SYSTEMS HANDLERS
  // --------------------------------------------------------------------------
  const handleMoveFeaturedPrebuilt = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === featuredPrebuiltIds.length - 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const nextIds = [...featuredPrebuiltIds];
    const temp = nextIds[index];
    nextIds[index] = nextIds[targetIndex];
    nextIds[targetIndex] = temp;
    setFeaturedPrebuiltIds(nextIds);
  };

  const handleToggleFeaturedPrebuilt = (id: string) => {
    const isSelected = featuredPrebuiltIds.includes(id);
    if (isSelected) {
      if (featuredPrebuiltIds.length <= 1) {
        showToast("At least one prebuilt system must remain featured.");
        return;
      }
      setFeaturedPrebuiltIds(featuredPrebuiltIds.filter((item) => item !== id));
    } else {
      if (featuredPrebuiltIds.length >= 4) {
        showToast("Maximum of 4 featured systems allowed. Remove a system first to replace it.");
        return;
      }
      setFeaturedPrebuiltIds([...featuredPrebuiltIds, id]);
    }
  };

  const handleSaveFeaturedPrebuilts = async () => {
    if (featuredPrebuiltIds.length !== 4) {
      showToast("Please select exactly 4 featured prebuilt systems.");
      return;
    }
    setSavingFeaturedPrebuilts(true);
    try {
      const res = await fetch("/api/admin/homepage-modules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ featuredPrebuiltIds }),
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "tethera_featured_prebuilt_ids",
            JSON.stringify(featuredPrebuiltIds)
          );
          window.dispatchEvent(new Event("tethera_homepage_updated"));
        }
        showToast("Featured prebuilt systems saved successfully.");
      } else {
        alert(data.error || "Failed to save featured prebuilt systems");
      }
    } catch (err: any) {
      alert("Error saving featured prebuilt systems: " + err.message);
    } finally {
      setSavingFeaturedPrebuilts(false);
    }
  };

  const handleResetFeaturedPrebuilts = async () => {
    if (!confirm("Reset featured prebuilt systems to standard factory defaults?")) return;
    setFeaturedPrebuiltIds(DEFAULT_FEATURED_PREBUILT_IDS);
    try {
      await fetch("/api/admin/homepage-modules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ featuredPrebuiltIds: DEFAULT_FEATURED_PREBUILT_IDS }),
      });
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "tethera_featured_prebuilt_ids",
          JSON.stringify(DEFAULT_FEATURED_PREBUILT_IDS)
        );
        window.dispatchEvent(new Event("tethera_homepage_updated"));
      }
      showToast("Featured prebuilt systems reset to default slots.");
    } catch (err: any) {
      alert("Error resetting featured systems: " + err.message);
    }
  };

  // --------------------------------------------------------------------------
  // ORDER STAGES MANAGEMENT & REJECTION
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
        setSelectedOrderForDrawer((prev: any) =>
          prev && prev.id === orderId ? { ...prev, status: nextStatus } : prev
        );
      } else {
        alert(data.error || "Failed to update order stage");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmRejectOrder = async () => {
    if (!rejectModalOrder) return;
    setRejectingSubmitting(true);

    const finalReason =
      rejectReason === "Other" && customRejectReason.trim()
        ? customRejectReason.trim()
        : rejectReason;

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId: rejectModalOrder.id,
          nextStatus: "cancelled",
          notes: `[ORDER REJECTED]: ${finalReason}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === rejectModalOrder.id
              ? { ...o, status: "cancelled", notes: `[ORDER REJECTED]: ${finalReason}` }
              : o
          )
        );
        setRejectModalOrder(null);
        setCustomRejectReason("");
      } else {
        alert(data.error || "Failed to reject order.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRejectingSubmitting(false);
    }
  };

  const dispatchCourier = async () => {
    if (!dispatchModalOrder) return;
    setDispatchingLoading(true);
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
          serviceCode: selectedServiceCode,
          deliveryType: pickupMode,
          deliveryDate: pickupMode === "scheduled" ? pickupDate : undefined,
          deliveryTime: pickupMode === "scheduled" ? pickupTime : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setOrders((prev) =>
          prev.map((o) => (o.id === dispatchModalOrder.id ? { ...data.order, status: "dispatched" } : o))
        );
        setSelectedOrderForDrawer((prev: any) =>
          prev && prev.id === dispatchModalOrder.id ? { ...data.order, status: "dispatched" } : prev
        );
        setDispatchModalOrder(null);
      } else {
        alert(data.error || "Failed to dispatch courier via Biteship");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDispatchingLoading(false);
    }
  };

  const handleSimulateCourierFailure = async (orderId: string) => {
    try {
      const res = await fetch("/api/admin/courier/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId,
          action: "simulate_failure",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Courier assignment rejected. Re-dispatch is now unlocked.");
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: "courier_failed" } : o))
        );
        setSelectedOrderForDrawer((prev: any) =>
          prev && prev.id === orderId ? { ...prev, status: "courier_failed" } : prev
        );
      } else {
        alert(data.error || "Failed to simulate courier rejection");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSimulateBiteshipWebhook = async (orderId: string, simulatedStatus: string) => {
    setSimulatingWebhookOrderId(orderId);
    try {
      const res = await fetch("/api/admin/courier/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId,
          action: "simulate_webhook",
          simulatedStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? data.order : o))
        );
        setActiveWebhookMenuOrderId(null);
      } else {
        alert(data.error || "Failed to simulate Biteship tracking webhook");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSimulatingWebhookOrderId(null);
    }
  };

  const simulateDeliveryArrival = async (orderId: string) => {
    await handleSimulateBiteshipWebhook(orderId, "delivered");
  };

  // --------------------------------------------------------------------------
  // PRODUCT MANIPULATION (EDIT / CATEGORY / IMAGES / DELETE / CREATE)
  // --------------------------------------------------------------------------
  const handleSaveProductEdit = async () => {
    if (!editingProduct) return;
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editingProduct),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Product changes, category, and images saved successfully.");
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

  const openEditProductModal = (prod: any) => {
    const images = Array.isArray(prod.images) && prod.images.length > 0
      ? prod.images
      : prod.image ? [prod.image] : [];
    setEditingProduct({
      ...prod,
      images,
      sale_price: prod.sale_price ?? null,
      variations: Array.isArray(prod.variations) ? prod.variations : (prod.specs?.variations || []),
    });
  };

  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const categorySlug = (formData.get("category_slug") as string) || "cpu";
    const selectedCat = HARDWARE_CATEGORIES.find((c) => c.slug === categorySlug);

    const primaryImg =
      (newProductImages.length > 0 && newProductImages[0]) ||
      newProductImageUrl ||
      (formData.get("image_url") as string) ||
      "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop&q=60";

    const allImages = newProductImages.length > 0 ? newProductImages : [primaryImg];

    const retailPriceNum = Number(formData.get("retail_price")) || Number(newProductRetailPrice);
    const salePriceNum =
      newProductDiscountEnabled && Number(newProductSalePrice) > 0 && Number(newProductSalePrice) < retailPriceNum
        ? Number(newProductSalePrice)
        : null;

    const payload = {
      name: formData.get("name") as string,
      brand: formData.get("brand") as string,
      sku: formData.get("sku") as string,
      category_slug: categorySlug,
      pc_builder_slot: selectedCat?.slot || null,
      retail_price: retailPriceNum,
      sale_price: salePriceNum,
      initial_stock: Number(formData.get("initial_stock")),
      description: newProductDescription || (formData.get("description") as string),
      images: allImages,
      specs: {
        socket: (formData.get("spec_socket") as string) || undefined,
        tdpWatts: Number(formData.get("spec_tdp")) || undefined,
      },
    };

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
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
        setNewProductImageUrl("");
        setNewProductImages([]);
        setNewProductDescription("");
        setNewProductRetailPrice("");
        setNewProductSalePrice("");
        setNewProductDiscountPercent("");
        setNewProductDiscountEnabled(false);
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

    const code = (formData.get("code") as string).toUpperCase().trim();
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";
    const discount_type = (formData.get("discount_type") as string) || "percentage";
    const discount_value = Number(formData.get("discount_value") || 0);
    const min_spend = Number(formData.get("min_spend")) || undefined;
    const max_discount = Number(formData.get("max_discount")) || undefined;
    const max_global_uses = Number(formData.get("max_global_uses")) || Number(formData.get("usage_limit")) || undefined;
    const starts_at = (formData.get("starts_at") as string) || undefined;
    const ends_at = (formData.get("ends_at") as string) || undefined;

    const payload = {
      code,
      title,
      description,
      discount_type,
      discount_value,
      min_spend,
      max_discount,
      max_global_uses,
      usage_limit: max_global_uses,
      starts_at,
      ends_at,
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

  // BANNER CREATION & REORDERING
  const handleSaveNewBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerForm.title || !newBannerForm.cta_link) {
      alert("Banner Title and CTA link are required.");
      return;
    }

    try {
      const payload = {
        ...newBannerForm,
        type: newBannerForm.image_url ? "image" : "content",
      };

      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast("New promotional banner added successfully.");
        setBanners((prev) => [...prev, data.banner].sort((a, b) => a.display_order - b.display_order));
        setNewBannerModalOpen(false);
        setNewBannerForm({
          title: "New High-Performance Drop",
          highlight: "Exclusive Allocation • Limited Supply",
          description: "Experience ultra-fast gaming and computing with official manufacturer guaranteed hardware.",
          badge: "Special Promotion",
          badge_type: "event",
          cta_text: "Explore Collection",
          cta_link: "/components",
          image_url: "",
          hide_overlay: false,
          perk: "Full 3-Year Official Manufacturer Warranty",
          display_order: banners.length + 1,
        });
      } else {
        alert(data.error || "Failed to create banner");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      const res = await fetch(`/api/admin/banners?id=${bannerId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setBanners((prev) => prev.filter((b) => b.id !== bannerId));
        showToast("Banner deleted successfully.");
      } else {
        alert(data.error || "Failed to delete banner");
      }
    } catch (err: any) {
      alert("Error deleting banner: " + err.message);
    }
  };

  const toggleBannerActive = async (bannerId: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/banners", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: bannerId, is_active: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        setBanners((prev) =>
          prev.map((b) => (b.id === bannerId ? { ...b, is_active: !currentActive } : b))
        );
        showToast(`Banner ${!currentActive ? "activated" : "deactivated"} successfully.`);
      } else {
        alert(data.error || "Failed to toggle banner status");
      }
    } catch (err: any) {
      alert("Error updating banner: " + err.message);
    }
  };

  const handleMoveBannerOrder = async (bannerId: string, direction: "up" | "down") => {
    const sorted = [...banners].sort((a, b) => a.display_order - b.display_order);
    const index = sorted.findIndex((b) => b.id === bannerId);
    if (index === -1) return;

    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sorted.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const currentBanner = sorted[index];
    const swapBanner = sorted[targetIndex];

    const currentNewOrder = swapBanner.display_order;
    const swapNewOrder = currentBanner.display_order;

    try {
      // Update both orders
      await Promise.all([
        fetch("/api/admin/banners", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ id: currentBanner.id, display_order: currentNewOrder }),
        }),
        fetch("/api/admin/banners", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ id: swapBanner.id, display_order: swapNewOrder }),
        }),
      ]);

      setBanners((prev) =>
        prev
          .map((b) => {
            if (b.id === currentBanner.id) return { ...b, display_order: currentNewOrder };
            if (b.id === swapBanner.id) return { ...b, display_order: swapNewOrder };
            return b;
          })
          .sort((a, b) => a.display_order - b.display_order)
      );

      showToast(`Banner display order updated (${direction === "up" ? "moved up" : "moved down"}).`);
    } catch (err: any) {
      alert("Failed to reorder banners: " + err.message);
    }
  };

  // ==========================================================================
  // RENDER: LOGIN GATEWAY (IF UNAUTHENTICATED)
  // ==========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-[#37baf2]/30 selection:text-white">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#37baf2]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-[#52E394]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full relative z-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#37baf2] to-[#126891] p-0.5 shadow-2xl shadow-[#37baf2]/20 mx-auto">
              <div className="w-full h-full bg-[#0A0B0E] rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[#37baf2]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                Incus Control Center
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#37baf2]/20 text-[#37baf2] border border-[#37baf2]/30">
                  Flux
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Restricted portal for Incus Hardware administrative and store operations.
              </p>
            </div>
          </div>

          <div className="bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Clearance Identifier / Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="admin@tethera.com or superadmin"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#37baf2] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Clearance Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#37baf2] transition"
                />
              </div>

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full min-h-[44px] mt-2 bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] font-bold py-2.5 rounded-xl shadow-lg shadow-[#37baf2]/25 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                {loginSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>Authenticate Clearance</span>
              </button>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="pt-5 border-t border-white/10 space-y-2.5">
              <p className="text-[11px] text-slate-400 text-center font-medium">
                Quick-Access Demo Clearance:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => quickDemoLogin("admin")}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0A0B0E] hover:bg-white/5 border border-white/10 text-xs text-[#37baf2] font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-[#37baf2]" />
                  <span>Store Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickDemoLogin("superadmin")}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0A0B0E] hover:bg-white/5 border border-white/10 text-xs text-purple-300 font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span>Superadmin</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="min-h-[44px] inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <span>Return to Public Incus Storefront</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: AUTHENTICATED COMMAND CENTER (FLUX LAYOUT)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-[#37baf2]/30 selection:text-white">
      {/* Toast Alert */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12141A] text-white border border-[#37baf2]/40 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="w-5 h-5 text-[#37baf2] flex-shrink-0" />
          <span className="text-sm font-medium">{actionNotice}</span>
        </div>
      )}

      {/* Collapsible Left Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOrdersCount={orders.filter((o) => o.status === "pending" || o.status === "order_received").length}
        lowStockCount={products.filter((p) => (p.stock_available ?? p.stock_on_hand ?? 0) <= 5).length}
        user={user}
        isSuperAdmin={isSuperAdmin}
        onLogout={logout}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <AdminHeader
          activeTab={activeTab}
          onRefresh={loadAllDashboardData}
          loadingData={loadingData}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          user={user}
          isSuperAdmin={isSuperAdmin}
          onQuickAction={
            activeTab === "products"
              ? () => {
                  setNewProductImageUrl("");
                  setNewProductImages([]);
                  setNewProductRetailPrice("");
                  setNewProductSalePrice("");
                  setNewProductDiscountPercent("");
                  setNewProductDiscountEnabled(false);
                  setNewProductModalOpen(true);
                }
              : activeTab === "promotions"
              ? () => setNewBannerModalOpen(true)
              : undefined
          }
          quickActionLabel={
            activeTab === "products"
              ? "New Hardware Item"
              : activeTab === "promotions"
              ? "New Hero Banner"
              : undefined
          }
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1920px] w-full mx-auto">
          {/* Action Required Notification Banner */}
          {notificationsData.totalActionCount > 0 && !notificationsDismissed && (
            <div className="bg-[#12141A] border border-amber-500/30 rounded-2xl p-4 transition-all duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider">
                        Action Required
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Live store operations need administrative action
                      </div>
                    </div>
                  </div>

                  <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

                  {notificationsData.unfulfilledOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("orders");
                      }}
                      className="min-h-[44px] inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-xs font-medium transition group"
                    >
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        <strong className="text-white font-bold">{notificationsData.unfulfilledOrders.length}</strong> Order(s) Awaiting Fulfillment
                      </span>
                      <ArrowRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {notificationsData.outOfStockProducts.length + notificationsData.lowStockProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("products");
                      }}
                      className="min-h-[44px] inline-flex items-center gap-1.5 text-rose-300 hover:text-rose-200 text-xs font-medium transition group"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>
                        <strong className="text-white font-bold">
                          {notificationsData.outOfStockProducts.length + notificationsData.lowStockProducts.length}
                        </strong> Hardware Item(s) Low / Out of Stock
                      </span>
                      <ArrowRight className="w-3 h-3 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setNotificationsDismissed(true)}
                  className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition flex items-center justify-center ml-auto"
                  title="Dismiss notification bar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Active Tab View with Flux Smooth Transition */}
          <div key={activeTab} className="flux-animate-fade flux-animate-slide-up">
            {/* Tab 0: Overview */}
            {activeTab === "overview" && (
              <FluxOverviewTab
                orders={orders}
                products={products}
                customers={customers}
                user={user}
                analyticsData={analyticsData}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onInspectOrder={(ord) => setSelectedOrderForDrawer(ord)}
                onUpdateStatus={(orderId, status) => advanceOrderStage(orderId, status)}
                onOpenNewProductModal={() => {
                  setNewProductImageUrl("");
                  setNewProductImages([]);
                  setNewProductRetailPrice("");
                  setNewProductSalePrice("");
                  setNewProductDiscountPercent("");
                  setNewProductDiscountEnabled(false);
                  setNewProductModalOpen(true);
                }}
              />
            )}

            {/* Tab 1: Orders */}
            {activeTab === "orders" && (
              <FluxOrdersTab
                orders={orders}
                onInspectOrder={(ord) => setSelectedOrderForDrawer(ord)}
                onOpenDispatchModal={(ord) => setDispatchModalOrder(ord)}
                onUpdateStatus={(orderId, status) => advanceOrderStage(orderId, status)}
                onSimulateCourierFailure={handleSimulateCourierFailure}
                onOpenRejectModal={(ord) => {
                  setRejectModalOrder(ord);
                  setRejectReason("Out of stock in warehouse");
                  setCustomRejectReason("");
                }}
              />
            )}

            {/* Tab 2: Products */}
            {activeTab === "products" && (
              <FluxProductsTab
                products={products}
                onOpenNewProductModal={() => {
                  setNewProductImageUrl("");
                  setNewProductImages([]);
                  setNewProductRetailPrice("");
                  setNewProductSalePrice("");
                  setNewProductDiscountPercent("");
                  setNewProductDiscountEnabled(false);
                  setNewProductModalOpen(true);
                }}
                onEditProduct={(p) => openEditProductModal(p)}
                onDeleteProduct={(id) => {
                  const prod = products.find((x) => x.id === id);
                  handleDeleteProduct(id, prod?.name || "Product");
                }}
              />
            )}

            {/* Tab 3: Promotions & Featured Prebuilt Systems (Homepage Showcase) */}
            {activeTab === "promotions" && (
              <FluxPromotionsTab
                banners={banners}
                homepageModules={homepageModules}
                setHomepageModules={setHomepageModules}
                customPcHeroConfig={customPcHeroConfig}
                setCustomPcHeroConfig={setCustomPcHeroConfig}
                featuredPrebuiltIds={featuredPrebuiltIds}
                setFeaturedPrebuiltIds={setFeaturedPrebuiltIds}
                promotions={promotions}
                handleResetHomepageModules={handleResetHomepageModules}
                handleSaveHomepageModules={handleSaveHomepageModules}
                savingModules={savingModules}
                handleSaveCustomPcHero={handleSaveCustomPcHero}
                savingCustomPcHero={savingCustomPcHero}
                handleResetFeaturedPrebuilts={handleResetFeaturedPrebuilts}
                handleSaveFeaturedPrebuilts={handleSaveFeaturedPrebuilts}
                savingFeaturedPrebuilts={savingFeaturedPrebuilts}
                handleMoveFeaturedPrebuilt={handleMoveFeaturedPrebuilt}
                handleToggleFeaturedPrebuilt={handleToggleFeaturedPrebuilt}
                onOpenNewBannerModal={() => setNewBannerModalOpen(true)}
                onDeleteBanner={(id) => handleDeleteBanner(id)}
                onToggleBannerActive={(id, curr) => toggleBannerActive(id, curr)}
                onOpenNewPromoModal={() => setNewPromoModalOpen(true)}
                onTogglePromoActive={handleTogglePromo}
                onDeletePromo={handleDeletePromo}
              />
            )}

            {/* Tab 4: CRM & Customer Intelligence */}
            {activeTab === "crm" && (
              <FluxCrmTab
                customers={customers}
                orders={orders}
                onInspectCustomer={(c) => setSelectedCustomerForDrawer(c)}
              />
            )}

            {/* Tab 5: Sales & Profit Intelligence */}
            {activeTab === "analytics" && (
              <FluxAnalyticsTab
                products={products}
                analyticsData={analyticsData}
                sortedAndFilteredProducts={sortedAndFilteredProducts}
                colWidths={colWidths}
                handleColResizeStart={handleColResizeStart}
                resetColWidths={resetColWidths}
                analyticsSearch={analyticsSearch}
                setAnalyticsSearch={setAnalyticsSearch}
                analyticsCategoryFilter={analyticsCategoryFilter}
                setAnalyticsCategoryFilter={setAnalyticsCategoryFilter}
                analyticsSortBy={analyticsSortBy}
                setAnalyticsSortBy={setAnalyticsSortBy}
                analyticsSortOrder={analyticsSortOrder}
                setAnalyticsSortOrder={setAnalyticsSortOrder}
                setSelectedItemAnalytics={setSelectedItemAnalytics}
                formatRupiah={formatRupiah}
                categories={HARDWARE_CATEGORIES}
              />
            )}
          </div>
        </main>
      </div>

      {/* Slide-over Right Drawers */}
      <FluxOrderDrawer
        order={selectedOrderForDrawer}
        onClose={() => setSelectedOrderForDrawer(null)}
        onOpenDispatchModal={(ord) => setDispatchModalOrder(ord)}
        onUpdateStatus={(orderId, status) => advanceOrderStage(orderId, status)}
      />

      <FluxCustomerDrawer
        customer={selectedCustomerForDrawer}
        orders={orders}
        onClose={() => setSelectedCustomerForDrawer(null)}
        onInspectOrder={(ord) => {
          setSelectedCustomerForDrawer(null);
          setSelectedOrderForDrawer(ord);
        }}
      />

      {/* ====================================================================== */}
      {/* MODAL 1: EDIT PRODUCT (CATEGORY SELECTOR & PC IMAGE UPLOAD)            */}
      {/* ====================================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden">
          <div className="bg-[#0F1117] border border-white/10 rounded-2xl sm:rounded-3xl max-w-5xl xl:max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-white/10 bg-[#12141A] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg sm:text-xl tracking-tight">Edit Hardware Product</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Update details, hardware category, pricing, inventory, rich overview, images, and variations.
                </p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/10"
                aria-label="Close edit product modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8 bg-[#0A0B0E]">
              {/* Section 1: General Information */}
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                  General Information
                </span>
                <div className="bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-7 space-y-6">
                  {/* Product Name & Brand */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Product Name</label>
                      <input
                        type="text"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Brand</label>
                      <input
                        type="text"
                        value={editingProduct.brand}
                        onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Category Selector & SKU */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">
                        Product Category (Hardware Slot)
                      </label>
                      <select
                        value={editingProduct.category_slug || "cpu"}
                        onChange={(e) => {
                          const newSlug = e.target.value;
                          const matched = HARDWARE_CATEGORIES.find((c) => c.slug === newSlug);
                          setEditingProduct({
                            ...editingProduct,
                            category_slug: newSlug,
                            pc_builder_slot: matched?.slot || editingProduct.pc_builder_slot,
                          });
                        }}
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-400 transition-colors"
                      >
                        {HARDWARE_CATEGORIES.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name} (Slot: {c.slot})
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-zinc-500 mt-2 block">
                        Assigned Builder Slot: <strong className="text-zinc-300 font-medium">{editingProduct.pc_builder_slot || "none"}</strong>
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">SKU</label>
                      <input
                        type="text"
                        value={editingProduct.sku}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Pricing & Inventory */}
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                  Pricing and Inventory
                </span>
                <div className="bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-7 space-y-6">
                  {/* Retail Price and Stock on Hand */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">
                        Retail Price (Original MSRP)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.retail_price}
                        onChange={(e) => {
                          const newRetail = Number(e.target.value);
                          setEditingProduct({
                            ...editingProduct,
                            retail_price: newRetail,
                          });
                        }}
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">
                        Store Stock on Hand (Inventory)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.stock_on_hand}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, stock_on_hand: Number(e.target.value) })
                        }
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Promotional Discount Fields */}
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Promotional Discount and Sale Pricing</span>
                      </span>
                      {editingProduct.sale_price ? (
                        <button
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, sale_price: null })}
                          className="text-xs text-zinc-400 hover:text-rose-400 font-medium min-h-[44px] inline-flex items-center px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                        >
                          Remove Discount
                        </button>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-2">
                          Discounted Sale Price (IDR)
                        </label>
                        <input
                          type="number"
                          placeholder="Leave empty for regular price"
                          value={editingProduct.sale_price ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setEditingProduct({
                              ...editingProduct,
                              sale_price: val,
                            });
                          }}
                          className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-2">
                          Discount Percentage (%)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          placeholder="e.g. 15"
                          value={
                            editingProduct.sale_price && editingProduct.retail_price && editingProduct.sale_price < editingProduct.retail_price
                              ? Math.round(((editingProduct.retail_price - editingProduct.sale_price) / editingProduct.retail_price) * 100)
                              : ""
                          }
                          onChange={(e) => {
                            const percent = Number(e.target.value);
                            if (percent > 0 && percent < 100 && editingProduct.retail_price) {
                              const computedSale = Math.round(editingProduct.retail_price * (1 - percent / 100));
                              setEditingProduct({
                                ...editingProduct,
                                sale_price: computedSale,
                              });
                            } else if (!e.target.value) {
                              setEditingProduct({
                                ...editingProduct,
                                sale_price: null,
                              });
                            }
                          }}
                          className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Live Discount Preview Text */}
                    {editingProduct.sale_price && editingProduct.retail_price && editingProduct.sale_price < editingProduct.retail_price && (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0A0B0E] border border-white/10 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white text-sm">
                            {formatRupiah(editingProduct.sale_price)}
                          </span>
                          <span className="text-zinc-400 line-through text-xs">
                            {formatRupiah(editingProduct.retail_price)}
                          </span>
                          <span className="text-zinc-200 font-semibold px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-xs">
                            -{Math.round(((editingProduct.retail_price - editingProduct.sale_price) / editingProduct.retail_price) * 100)}% OFF
                          </span>
                        </div>
                        <span className="text-zinc-400 font-medium">
                          Customer saves {formatRupiah(editingProduct.retail_price - editingProduct.sale_price)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Rich Description */}
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                  Rich Product Description
                </span>
                <div className="bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-7 space-y-4">
                  <RichTextEditor
                    value={editingProduct.description || ""}
                    onChange={(val) => setEditingProduct({ ...editingProduct, description: val })}
                    availableImages={editingProduct.images || []}
                    token={token}
                    minHeight="260px"
                  />
                </div>
              </div>

              {/* Section 4: Product Gallery Manager */}
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                  Media and Images
                </span>
                <ProductGalleryManager
                  images={editingProduct.images || []}
                  onChange={(newImgs) => setEditingProduct({ ...editingProduct, images: newImgs })}
                  token={token}
                  onUploadSuccess={(msg) => showToast(msg)}
                />
              </div>

              {/* Section 5: Product Variations Manager */}
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                  Product Variations
                </span>
                <ProductVariationsManager
                  productId={editingProduct.id}
                  variations={editingProduct.variations || []}
                  parentImages={editingProduct.images || (editingProduct.image ? [editingProduct.image] : [])}
                  onChange={(newVars) => setEditingProduct({ ...editingProduct, variations: newVars })}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 sm:px-8 py-5 border-t border-white/10 bg-[#12141A] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <span className="text-xs text-zinc-400">
                Changes will only take effect on the store once saved.
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProductEdit}
                  className="min-h-[44px] px-7 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-md"
                >
                  Save All Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 2: REJECT ORDER (STOCK OUT OR OTHER REASON)                      */}
      {/* ====================================================================== */}
      {rejectModalOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <Ban className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Reject / Cancel Order</h3>
              </div>
              <button
                onClick={() => setRejectModalOrder(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              You are rejecting Order <strong className="text-white">#{rejectModalOrder.order_number}</strong> placed by <strong className="text-white">{rejectModalOrder.customer_name}</strong> ({formatRupiah(rejectModalOrder.total)}).
            </div>

            {/* Predefined Rejection Reasons */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Select Rejection Reason:</label>
              {[
                "Out of stock in warehouse",
                "Defective / damaged unit discovered during inspection",
                "Item discontinued by distributor",
                "Customer requested cancellation",
                "Delivery address unreachable by Gojek / Grab couriers",
                "Other",
              ].map((reason) => (
                <label
                  key={reason}
                  className={`min-h-[44px] flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    rejectReason === reason
                      ? "bg-red-950/40 border-red-700 text-white font-medium"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="reject_reason"
                    checked={rejectReason === reason}
                    onChange={() => setRejectReason(reason)}
                    className="accent-red-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {rejectReason === "Other" && (
                <textarea
                  rows={2}
                  required
                  placeholder="Specify custom reason for rejection..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white mt-2"
                />
              )}
            </div>

            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-[11px] text-red-300">
              ⚠️ Note: Rejecting will automatically release any reserved stock back into available store inventory and notify operations.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Back
              </button>
              <button
                type="button"
                disabled={rejectingSubmitting}
                onClick={handleConfirmRejectOrder}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {rejectingSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 3: DISPATCH ON-DEMAND COURIER (GOJEK / GRAB)                     */}
      {/* ====================================================================== */}
      {/* ====================================================================== */}
      {/* MODAL 3: DISPATCH BITESHIP MULTI-COURIER & SCHEDULE PICKUP             */}
      {/* ====================================================================== */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Biteship Multi-Courier Dispatch</h3>
                  <p className="text-[11px] text-slate-400">Waybill Generation & Automated Shop Pickup</p>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalOrder(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Order <strong>#{dispatchModalOrder.order_number}</strong> for <strong>{dispatchModalOrder.customer_name}</strong> is packed and ready at Mangga Dua Flagship Hub. Select carrier to create shipment, generate official Waybill (AWB), and trigger courier pickup.
            </p>

            {/* Courier Selection Grid */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Select Courier Partner:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "jne",
                    name: "JNE Express",
                    services: "REG, YES",
                    badge: "JNE",
                    bg: "bg-[#003399]",
                    defaultCode: "jne-reg",
                  },
                  {
                    id: "jnt",
                    name: "J&T Express",
                    services: "EZ",
                    badge: "J&T",
                    bg: "bg-[#ED1C24]",
                    defaultCode: "jnt-ez",
                  },
                  {
                    id: "sicepat",
                    name: "SiCepat",
                    services: "REG, BEST",
                    badge: "SCP",
                    bg: "bg-[#D31515]",
                    defaultCode: "sicepat-reg",
                  },
                  {
                    id: "anteraja",
                    name: "AnterAja",
                    services: "REG",
                    badge: "ANR",
                    bg: "bg-[#E91E63]",
                    defaultCode: "anteraja-reg",
                  },
                  {
                    id: "gojek",
                    name: "Gojek",
                    services: "GoSend Instant",
                    badge: "GJ",
                    bg: "bg-[#00AA13]",
                    defaultCode: "gojek-instant-bike",
                  },
                  {
                    id: "grab",
                    name: "Grab",
                    services: "GrabExpress",
                    badge: "GB",
                    bg: "bg-[#00B14F]",
                    defaultCode: "grab-instant",
                  },
                ].map((c) => {
                  const isSelected = selectedCourierProvider === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCourierProvider(c.id as any);
                        setSelectedServiceCode(c.defaultCode);
                      }}
                      className={`min-h-[44px] p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                        isSelected
                          ? "bg-slate-800 border-cyan-400 ring-1 ring-cyan-400"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-7 h-7 rounded-lg ${c.bg} text-white flex items-center justify-center font-black text-xs`}>
                          {c.badge}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.services}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pickup Mode Scheduling Options */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-300">
                Automated Hub Pickup Scheduling (Mangga Dua Mall Lt. 3 No. 36):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPickupMode("now")}
                  className={`min-h-[44px] p-2.5 rounded-lg border text-xs font-semibold text-left transition flex items-center gap-2 ${
                    pickupMode === "now"
                      ? "bg-cyan-950/60 border-cyan-500 text-cyan-300"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <div>
                    <div className="font-bold">Immediate Pickup</div>
                    <div className="text-[10px] opacity-70">Courier dispatched now</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPickupMode("scheduled")}
                  className={`min-h-[44px] p-2.5 rounded-lg border text-xs font-semibold text-left transition flex items-center gap-2 ${
                    pickupMode === "scheduled"
                      ? "bg-cyan-950/60 border-cyan-500 text-cyan-300"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <div>
                    <div className="font-bold">Schedule Slot</div>
                    <div className="text-[10px] opacity-70">Specify date & time</div>
                  </div>
                </button>
              </div>

              {pickupMode === "scheduled" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Pickup Date:</label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Pickup Time:</label>
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Destination Address Preview */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Customer Destination:</div>
              <div className="font-medium text-white">
                {dispatchModalOrder.shipping_address?.street}, {dispatchModalOrder.shipping_address?.subdistrict},{" "}
                {dispatchModalOrder.shipping_address?.city} {dispatchModalOrder.shipping_address?.postalCode}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dispatchingLoading}
                onClick={dispatchCourier}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2"
              >
                {dispatchingLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Booking with Biteship API...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" />
                    <span>Generate Waybill & Dispatch ({selectedCourierProvider.toUpperCase()})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 4: ADD NEW HARDWARE ITEM (SUPERADMIN ONLY - WITH PC UPLOAD)      */}
      {/* ====================================================================== */}
      {newProductModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden">
          <div className="bg-[#0F1117] border border-white/10 rounded-2xl sm:rounded-3xl max-w-5xl xl:max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-white/10 bg-[#12141A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-zinc-400" />
                <div>
                  <h3 className="font-bold text-white text-lg sm:text-xl tracking-tight">Add New Hardware Item</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Create a new component or rig in the database.</p>
                </div>
              </div>
              <button
                onClick={() => setNewProductModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/10"
                aria-label="Close add hardware modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8 bg-[#0A0B0E]">
              {/* Section 1: General Details */}
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                  General Information
                </span>
                <div className="bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-7 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Product Name</label>
                      <input
                        name="name"
                        required
                        placeholder="e.g. AMD Ryzen 9 9950X"
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Brand</label>
                      <input
                        name="brand"
                        required
                        placeholder="e.g. AMD / ASUS / Corsair"
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Category &amp; Builder Slot</label>
                      <select
                        name="category_slug"
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-400 transition-colors"
                      >
                        {HARDWARE_CATEGORIES.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name} (Slot: {c.slot})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">SKU</label>
                      <input
                        name="sku"
                        required
                        placeholder="e.g. AMD-100-9950X"
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Pricing & Stock */}
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                  Pricing and Inventory
                </span>
                <div className="bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-7 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Retail Price (IDR)</label>
                      <input
                        name="retail_price"
                        type="number"
                        required
                        placeholder="e.g. 10999000"
                        value={newProductRetailPrice}
                        onChange={(e) => setNewProductRetailPrice(Number(e.target.value))}
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Initial Stock on Hand</label>
                      <input
                        name="initial_stock"
                        type="number"
                        defaultValue={10}
                        className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Promotional Discount Inputs */}
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newProductDiscountEnabled}
                          onChange={(e) => setNewProductDiscountEnabled(e.target.checked)}
                          className="rounded bg-[#0A0B0E] border-white/20 text-white focus:ring-0"
                        />
                        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Apply Promotional Discount and Slashed Price</span>
                        </span>
                      </label>
                    </div>

                    {newProductDiscountEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 mb-2">
                            Discounted Sale Price (IDR)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 9499000"
                            value={newProductSalePrice}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : "";
                              setNewProductSalePrice(val);
                              if (val && typeof newProductRetailPrice === "number" && newProductRetailPrice > 0) {
                                setNewProductDiscountPercent(
                                  Math.round(((newProductRetailPrice - Number(val)) / newProductRetailPrice) * 100)
                                );
                              }
                            }}
                            className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 mb-2">
                            Discount Percentage (%)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            placeholder="e.g. 15"
                            value={newProductDiscountPercent}
                            onChange={(e) => {
                              const pct = e.target.value ? Number(e.target.value) : "";
                              setNewProductDiscountPercent(pct);
                              if (pct && typeof newProductRetailPrice === "number" && newProductRetailPrice > 0) {
                                setNewProductSalePrice(
                                  Math.round(newProductRetailPrice * (1 - Number(pct) / 100))
                                );
                              }
                            }}
                            className="w-full min-h-[44px] bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    {newProductDiscountEnabled &&
                      typeof newProductSalePrice === "number" &&
                      typeof newProductRetailPrice === "number" &&
                      newProductSalePrice > 0 &&
                      newProductSalePrice < newProductRetailPrice && (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0A0B0E] border border-white/10 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white text-sm">
                              {formatRupiah(newProductSalePrice)}
                            </span>
                            <span className="text-zinc-400 line-through text-xs">
                              {formatRupiah(newProductRetailPrice)}
                            </span>
                            <span className="text-zinc-200 font-semibold px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-xs">
                              -{Math.round(((newProductRetailPrice - newProductSalePrice) / newProductRetailPrice) * 100)}% OFF
                            </span>
                          </div>
                          <span className="text-zinc-400 font-medium">
                            Customer saves {formatRupiah(newProductRetailPrice - newProductSalePrice)}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Section 3: Rich Description */}
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                  Product Description
                </span>
                <div className="bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-7 space-y-4">
                  <RichTextEditor
                    value={newProductDescription}
                    onChange={setNewProductDescription}
                    availableImages={newProductImages}
                    token={token}
                    minHeight="260px"
                  />
                </div>
              </div>

              {/* Section 4: Product Gallery */}
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                  Media and Images
                </span>
                <ProductGalleryManager
                  images={newProductImages}
                  onChange={setNewProductImages}
                  token={token}
                  onUploadSuccess={(msg) => showToast(msg)}
                />
              </div>

              {/* Footer Actions */}
              <div className="px-6 sm:px-8 py-5 border-t border-white/10 bg-[#12141A] -mx-6 sm:-mx-8 lg:-mx-10 -mb-6 sm:-mb-8 flex items-center justify-end gap-3 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setNewProductModalOpen(false)}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-7 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-md"
                >
                  Create Product in Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 5: ADD BANNER WITH PC UPLOAD & WRITING ON TOP (SUPERADMIN ONLY)   */}
      {/* ====================================================================== */}
      {newBannerModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Add Promotional Banner Slide</h3>
                  <p className="text-xs text-slate-400">Upload background picture & configure writing on top.</p>
                </div>
              </div>
              <button
                onClick={() => setNewBannerModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewBanner} className="space-y-4 text-xs">
              {/* LIVE CARD PREVIEW WITH WRITING ON TOP */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Live Preview (How it will appear on the main screen):
                </label>
                <div className="h-44 w-full rounded-2xl bg-slate-950 border border-slate-700 relative overflow-hidden shadow-inner">
                  {newBannerForm.image_url ? (
                    <img src={newBannerForm.image_url} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950" />
                  )}

                  {!newBannerForm.hide_overlay && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 uppercase ">
                          {newBannerForm.badge || "FEATURED"}
                        </span>
                        <span className="text-xs text-slate-400 ">
                          Order #{newBannerForm.display_order}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-white font-black text-base line-clamp-1">{newBannerForm.title}</h3>
                        <p className="text-cyan-300 text-xs font-medium line-clamp-1">{newBannerForm.highlight}</p>
                        <p className="text-slate-300 text-[11px] line-clamp-1 mt-0.5">{newBannerForm.description}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 font-semibold">{newBannerForm.perk}</span>
                        <span className="text-xs text-white font-bold uppercase tracking-wider">
                          {newBannerForm.cta_text} →
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Picture Upload from PC */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="block font-semibold text-slate-300">Background Picture (Upload from PC or URL)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadFileFromPC(file, "banner");
                        e.target.value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap border border-slate-700"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Picture from Computer</span>
                  </button>

                  <input
                    type="url"
                    placeholder="Or paste background image URL..."
                    value={newBannerForm.image_url}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, image_url: e.target.value })}
                    className="flex-1 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white  text-xs"
                  />
                </div>
              </div>

              {/* Writing on Top of Picture Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Headline Title (Writing on top)</label>
                  <input
                    required
                    value={newBannerForm.title}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, title: e.target.value })}
                    placeholder="e.g. Tethera Apex White Edition Rig"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Highlight / Subtitle</label>
                  <input
                    value={newBannerForm.highlight}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, highlight: e.target.value })}
                    placeholder="e.g. Free 72-Hour Rig Stress Test Included"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Badge Text</label>
                  <input
                    value={newBannerForm.badge}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, badge: e.target.value })}
                    placeholder="e.g. Limited Time Event / Official Partner"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Display Order (Position on Screen)</label>
                  <input
                    type="number"
                    value={newBannerForm.display_order}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, display_order: Number(e.target.value) })}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white "
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description Copy</label>
                <textarea
                  rows={2}
                  value={newBannerForm.description}
                  onChange={(e) => setNewBannerForm({ ...newBannerForm, description: e.target.value })}
                  placeholder="Design your custom rig with complimentary calibration..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Perk / Warranty Line</label>
                  <input
                    value={newBannerForm.perk}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, perk: e.target.value })}
                    placeholder="e.g. Full 3-Year Official Manufacturer Warranty"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Button CTA Text & Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={newBannerForm.cta_text}
                      onChange={(e) => setNewBannerForm({ ...newBannerForm, cta_text: e.target.value })}
                      placeholder="Shop Now"
                      className="w-1/2 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                    <input
                      value={newBannerForm.cta_link}
                      onChange={(e) => setNewBannerForm({ ...newBannerForm, cta_link: e.target.value })}
                      placeholder="/components/gpu"
                      className="w-1/2 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white "
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hide_overlay"
                  checked={newBannerForm.hide_overlay}
                  onChange={(e) => setNewBannerForm({ ...newBannerForm, hide_overlay: e.target.checked })}
                  className="accent-cyan-500 rounded"
                />
                <label htmlFor="hide_overlay" className="text-slate-300 cursor-pointer">
                  Hide text overlay (Display pure raw picture with no writings on top)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewBannerModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Publish Banner to Main Screen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 6: CREATE PROMOTION CODE (SUPERADMIN ONLY)                       */}
      {/* ====================================================================== */}
      {newPromoModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Create Promotional Voucher</h3>
                <p className="text-xs text-slate-400">Configure tiered discounts, minimum spends, and usage limits</p>
              </div>
              <button
                type="button"
                onClick={() => setNewPromoModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Promo Code</label>
                  <input
                    name="code"
                    required
                    placeholder="e.g. RTXSUPER10"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase focus:ring-2 focus:ring-[#37baf2] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Discount Type</label>
                  <select
                    name="discount_type"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-[#37baf2] outline-hidden cursor-pointer"
                  >
                    <option value="percentage">Percentage Off (%)</option>
                    <option value="fixed_amount">Fixed Amount (IDR)</option>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="buy_x_get_y">Buy X Get Y Free</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Campaign Title</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. 10% Off RTX Series GPUs"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-[#37baf2] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description (Optional)</label>
                <input
                  name="description"
                  placeholder="e.g. Applies to cart subtotals over 5jt"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-[#37baf2] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Discount Value</label>
                  <input
                    name="discount_value"
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 10 or 150000"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-[#37baf2] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Max Discount Cap (IDR)</label>
                  <input
                    name="max_discount"
                    type="number"
                    min="0"
                    placeholder="e.g. 1500000"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-[#37baf2] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Min. Cart Spend (IDR)</label>
                  <input
                    name="min_spend"
                    type="number"
                    min="0"
                    placeholder="e.g. 5000000"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-[#37baf2] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Global Usage Limit</label>
                  <input
                    name="max_global_uses"
                    type="number"
                    min="1"
                    placeholder="e.g. 100 uses"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-[#37baf2] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Starts At</label>
                  <input
                    name="starts_at"
                    type="date"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-[#37baf2] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Ends At</label>
                  <input
                    name="ends_at"
                    type="date"
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-[#37baf2] outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewPromoModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] font-bold shadow-md shadow-[#37baf2]/20 cursor-pointer"
                >
                  Activate Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 7: CUSTOMER FULL PROFILE & ORDER HISTORY                         */}
      {/* ====================================================================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-6 my-8 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 font-bold text-base flex-shrink-0">
                  {selectedCustomer.full_name
                    ? selectedCustomer.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "CU"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">{selectedCustomer.full_name}</h3>
                    <span className="text-xs text-slate-400 uppercase ">
                      ({selectedCustomer.customer_segment || "general"})
                    </span>
                  </div>
                  <div className="text-xs text-slate-400  mt-0.5">
                    Customer ID: {selectedCustomer.id}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                aria-label="Close customer profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Section 1 & 2 Grid: Contact Info & Delivery Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800/80">
                {/* Contact Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs pb-1">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span>Contact &amp; Account Details</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Primary Email</span>
                      <a
                        href={`mailto:${selectedCustomer.email}`}
                        className="text-cyan-400 hover:underline "
                      >
                        {selectedCustomer.email}
                      </a>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Mobile Phone</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white ">{selectedCustomer.phone || "Not provided"}</span>
                        {selectedCustomer.phone && (
                          <a
                            href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] px-2.5 inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                          >
                            WhatsApp Chat
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Registered Date</span>
                      <span className="text-slate-300 ">
                        {selectedCustomer.created_at
                          ? new Date(selectedCustomer.created_at).toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Legacy Customer"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>Primary Delivery Address</span>
                    </div>
                    {selectedCustomer.address_label && (
                      <span className="text-xs text-slate-400 ">
                        ({selectedCustomer.address_label})
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-slate-300">
                    <div className="text-white font-medium">
                      {selectedCustomer.address_line1 || "No street address recorded"}
                    </div>
                    {selectedCustomer.address_line2 && (
                      <div className="text-slate-400">{selectedCustomer.address_line2}</div>
                    )}
                    <div>
                      {[
                        selectedCustomer.subdistrict,
                        selectedCustomer.city,
                        selectedCustomer.province,
                        selectedCustomer.postal_code,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    <div className="text-slate-400  text-[11px]">
                      {selectedCustomer.country || "Indonesia"}
                    </div>

                    {selectedCustomer.delivery_notes && (
                      <div className="mt-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">Delivery Notes:</span>{" "}
                        {selectedCustomer.delivery_notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3 & 4 Grid: Attribution & Preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800/80">
                {/* Discovery & Acquisition Attribution */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs pb-1">
                    <Compass className="w-4 h-4 text-purple-400" />
                    <span>Discovery &amp; Attribution</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">How they got to know us</span>
                      <span className="text-xs text-purple-300 capitalize font-medium block mt-0.5">
                        {selectedCustomer.lead_source
                          ? selectedCustomer.lead_source.replace(/_/g, " ")
                          : "Direct / Unknown"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Hardware Architecture Preference</span>
                      <span className="text-slate-200 uppercase  mt-0.5 block">
                        {selectedCustomer.hardware_preference || "All Vendors"}
                      </span>
                    </div>

                    {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                      <div>
                        <span className="text-slate-400 block text-[11px] mb-1">Customer Tags</span>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-400 ">
                          {selectedCustomer.tags.map((tag) => (
                            <span key={tag}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Marketing & Newsletter Preferences */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs pb-1">
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>Marketing &amp; Subscriptions</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Promotional Opt-In</span>
                      <div className="mt-0.5">
                        {selectedCustomer.marketing_opt_in ? (
                          <span className="text-xs text-emerald-400 font-semibold">
                            Opted In (Email &amp; WhatsApp Announcements)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Opted Out
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Dispatch Frequency</span>
                      <span className="text-slate-200 capitalize  mt-0.5 block">
                        {selectedCustomer.newsletter_frequency || "Weekly"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Order History & Lifetime Financials */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                    <span>Purchase History &amp; Orders</span>
                  </div>
                  <div className="flex items-center gap-3  text-xs">
                    <span className="text-slate-400">Total: {selectedCustomer.total_orders || 0} orders</span>
                    <span className="text-cyan-400 font-bold">
                      {formatRupiah(selectedCustomer.total_spent || 0)}
                    </span>
                  </div>
                </div>

                {(() => {
                  const customerCleanPhone = (selectedCustomer.phone || "").replace(/[^0-9]/g, "");
                  const customerEmail = (selectedCustomer.email || "").toLowerCase();

                  const customerOrders = orders.filter((o) => {
                    const oEmail = (o.customer_email || "").toLowerCase();
                    const oPhone = (o.customer_phone || "").replace(/[^0-9]/g, "");
                    const emailMatch = Boolean(customerEmail && oEmail && oEmail === customerEmail);
                    const phoneMatch = Boolean(
                      customerCleanPhone.length > 5 &&
                        oPhone.length > 5 &&
                        (oPhone === customerCleanPhone ||
                          oPhone.endsWith(customerCleanPhone) ||
                          customerCleanPhone.endsWith(oPhone))
                    );
                    return emailMatch || phoneMatch;
                  });

                  if (customerOrders.length === 0) {
                    return (
                      <div className="py-4 text-center text-slate-500 text-xs">
                        No active orders found in current store database for this customer profile.
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-400 uppercase  tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Order ID</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Total</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {customerOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3  text-white font-semibold">{ord.id}</td>
                              <td className="py-2.5 px-3 text-slate-400">
                                {ord.created_at
                                  ? new Date(ord.created_at).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "N/A"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-xs uppercase  text-slate-300">
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3  text-cyan-400 font-bold">
                                {formatRupiah(ord.total || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(null);
                                    setActiveTab("orders");
                                  }}
                                  className="min-h-[44px] px-2 text-cyan-400 hover:text-cyan-300 text-xs font-medium inline-flex items-center gap-1"
                                >
                                  <span>View in Orders</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 8: ITEM DETAILED SALES DASHBOARD MODAL                           */}
      {/* ====================================================================== */}
      {selectedItemAnalytics && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 space-y-6 my-8 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                  {selectedItemAnalytics.images && selectedItemAnalytics.images.length > 0 ? (
                    <Image
                      src={selectedItemAnalytics.images[0]}
                      alt={selectedItemAnalytics.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      {selectedItemAnalytics.brand}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className=" text-xs text-slate-400">
                      SKU: {selectedItemAnalytics.sku}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400 uppercase ">
                      {selectedItemAnalytics.category_slug}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                    {selectedItemAnalytics.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Item Performance Dossier, Weekly &amp; Lifetime Sales Telemetry
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemAnalytics(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                aria-label="Close dashboard"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="overflow-y-auto pr-1 space-y-6 flex-1 text-xs">
              {/* Top Highlights Banner: Stock Health & Run Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-slate-800/80">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Current Warehouse Stock</span>
                  </div>
                  <div className="text-base font-bold text-white ">
                    {selectedItemAnalytics.stock_on_hand} units available
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    <span>Weekly Run Rate</span>
                  </div>
                  <div className="text-base font-bold text-purple-300 ">
                    {selectedItemAnalytics.weeklyUnits} units/wk ({(selectedItemAnalytics.weeklyUnits / 7).toFixed(2)}/day)
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Estimated Days of Supply</span>
                  </div>
                  <div className="text-base font-bold text-emerald-400 ">
                    {selectedItemAnalytics.daysOfSupply === 999
                      ? "Ample Supply"
                      : `${selectedItemAnalytics.daysOfSupply} days remaining`}
                  </div>
                </div>
              </div>

              {/* Financials & Unit Economics Grid */}
              <div className="space-y-3 pb-6 border-b border-slate-800/80">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Unit Economics &amp; Gross Margins</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Retail Price */}
                  <div>
                    <span className="text-xs text-slate-400">Retail Selling Price</span>
                    <div className="text-base font-bold text-white  mt-1">
                      {formatRupiah(selectedItemAnalytics.retail_price)}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Active SRP</span>
                  </div>

                  {/* Estimated Cost (COGS) */}
                  <div>
                    <span className="text-xs text-slate-400">Wholesale Cost (COGS)</span>
                    <div className="text-base font-bold text-slate-300  mt-1">
                      {formatRupiah(selectedItemAnalytics.cost_price)}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Distributor base</span>
                  </div>

                  {/* Gross Profit per Unit */}
                  <div>
                    <span className="text-xs text-slate-400">Profit Per Unit</span>
                    <div className="text-base font-bold text-emerald-400  mt-1">
                      {formatRupiah(selectedItemAnalytics.unitGrossProfit)}
                    </div>
                    <span className="text-[11px] text-emerald-500/80 mt-0.5 block">Per-sale margin</span>
                  </div>

                  {/* Gross Margin % */}
                  <div>
                    <span className="text-xs text-slate-400">Gross Margin %</span>
                    <div className="text-base font-bold text-cyan-400  mt-1">
                      {selectedItemAnalytics.marginPct}%
                    </div>
                    <span className="text-[11px] text-cyan-500/80 mt-0.5 block">Return on sales</span>
                  </div>
                </div>
              </div>

              {/* Trailing Performance & Volume Aggregates */}
              <div className="space-y-3 pb-6 border-b border-slate-800/80">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sales Volume &amp; Profit Comparison</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* 7D Revenue */}
                  <div>
                    <span className="text-xs text-slate-400">7D Gross Revenue</span>
                    <div className="text-base font-bold text-cyan-400  mt-1">
                      {formatRupiah(selectedItemAnalytics.weeklyRevenue)}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {selectedItemAnalytics.weeklyUnits} unit(s) in last 7 days
                    </span>
                  </div>

                  {/* 7D Gross Profit */}
                  <div>
                    <span className="text-xs text-slate-400">7D Gross Profit</span>
                    <div className="text-base font-bold text-emerald-400  mt-1">
                      {formatRupiah(selectedItemAnalytics.weeklyGrossProfit)}
                    </div>
                    <span className="text-[11px] text-emerald-500/80 mt-0.5 block">Weekly net profit contribution</span>
                  </div>

                  {/* Lifetime Revenue */}
                  <div>
                    <span className="text-xs text-slate-400">Lifetime Revenue</span>
                    <div className="text-base font-bold text-slate-200  mt-1">
                      {formatRupiah(selectedItemAnalytics.lifetimeRevenue)}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {selectedItemAnalytics.lifetimeUnits} unit(s) all-time
                    </span>
                  </div>

                  {/* Lifetime Gross Profit */}
                  <div>
                    <span className="text-xs text-slate-400">Lifetime Gross Profit</span>
                    <div className="text-base font-bold text-emerald-400  mt-1">
                      {formatRupiah(selectedItemAnalytics.lifetimeGrossProfit)}
                    </div>
                    <span className="text-[11px] text-emerald-500/80 mt-0.5 block">Total historical profit</span>
                  </div>
                </div>
              </div>

              {/* 7-Day Day-by-Day Performance Table for this Item */}
              <div className="space-y-3 pb-6 border-b border-slate-800/80">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Trailing 7-Day Pacing</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-800">
                    <thead className="text-slate-400 font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Units Sold</th>
                        <th className="py-2.5 px-3">Daily Revenue</th>
                        <th className="py-2.5 px-3">Daily Gross Profit</th>
                        <th className="py-2.5 px-3">Pacing Visual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80  text-[11px]">
                      {analyticsData.dailyBreakdown.map((d) => {
                        const dayData = selectedItemAnalytics.dailySales7D?.[d.dateStr] || {
                          units: 0,
                          revenue: 0,
                          profit: 0,
                        };
                        const hasSales = dayData.units > 0;
                        return (
                          <tr key={d.dateStr} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-sans">
                              <span className="text-slate-300 font-medium">{d.label}</span>{" "}
                              <span className="text-slate-500 text-[10px]">({d.dateStr})</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={hasSales ? "text-cyan-300 font-semibold" : "text-slate-600"}>
                                {dayData.units}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={hasSales ? "text-white font-medium" : "text-slate-600"}>
                                {formatRupiah(dayData.revenue)}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={hasSales ? "text-emerald-400 font-semibold" : "text-slate-600"}>
                                {formatRupiah(dayData.profit)}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans w-36">
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-cyan-500 h-full rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      selectedItemAnalytics.weeklyUnits > 0
                                        ? Math.round((dayData.units / selectedItemAnalytics.weeklyUnits) * 100)
                                        : 0
                                    )}%`,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Orders Breakdown Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Customer Orders Featuring This SKU ({selectedItemAnalytics.orders.length})</span>
                  </h4>
                  {selectedItemAnalytics.orders.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      Total Units: <strong className="text-white">{selectedItemAnalytics.lifetimeUnits}</strong>
                    </span>
                  )}
                </div>

                {selectedItemAnalytics.orders.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Package className="w-6 h-6 mx-auto mb-1.5 text-slate-600" />
                    <p className="font-medium text-slate-300 text-xs">No orders recorded for this item yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      New customer checkouts containing this product will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs divide-y divide-slate-800">
                      <thead className="bg-slate-950 text-slate-400 font-medium sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Order Number</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Customer</th>
                          <th className="py-2 px-3">Qty</th>
                          <th className="py-2 px-3">Unit Price</th>
                          <th className="py-2 px-3">Line Revenue</th>
                          <th className="py-2 px-3">Gross Profit</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80  text-[11px]">
                        {selectedItemAnalytics.orders.map((record: any, idx: number) => {
                          const ord = record.order;
                          const it = record.item;
                          const lineRev = (it.unit_price || 0) * (it.quantity || 1);
                          const lineProfit = record.unitProfit * (it.quantity || 1);

                          return (
                            <tr key={`${ord.id}-${idx}`} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 text-cyan-300 font-semibold">
                                #{ord.order_number || ord.id.slice(0, 8)}
                              </td>
                              <td className="py-2 px-3 text-slate-400 font-sans">
                                {ord.created_at
                                  ? new Date(ord.created_at).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "N/A"}
                              </td>
                              <td className="py-2 px-3 font-sans">
                                <div className="text-white font-medium truncate max-w-[120px]">
                                  {ord.customer_name}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                                  {ord.customer_email}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-white font-bold">{it.quantity || 1}</td>
                              <td className="py-2 px-3 text-slate-300">{formatRupiah(it.unit_price || 0)}</td>
                              <td className="py-2 px-3 text-cyan-300 font-medium">{formatRupiah(lineRev)}</td>
                              <td className="py-2 px-3 text-emerald-400 font-bold">{formatRupiah(lineProfit)}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <span className="text-xs uppercase  text-slate-300">
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-sans">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedItemAnalytics(null);
                                    setActiveTab("orders");
                                  }}
                                  className="min-h-[44px] px-2 text-cyan-400 hover:text-cyan-300 text-xs font-medium inline-flex items-center gap-1"
                                >
                                  <span>View</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  const prodToEdit = selectedItemAnalytics;
                  setSelectedItemAnalytics(null);
                  openEditProductModal(prodToEdit);
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Product Elements</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedItemAnalytics(null)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
