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
} from "lucide-react";
import { useAdminStore } from "@/lib/store/useAdminStore";
import { formatRupiah } from "@/lib/utils/currency";
import { Product, Order, Promotion, DynamicBannerSlide, CustomerProfileRow } from "@/lib/db/types";
import { ProductGalleryManager } from "@/components/admin/ProductGalleryManager";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

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
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "promotions" | "crm" | "analytics">("orders");

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
    destination: "edit_product" | "new_product" | "banner"
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
      }
    } catch (err: any) {
      alert("Error uploading image: " + err.message);
    } finally {
      setUploadingImage(false);
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
          prev.map((o) => (o.id === dispatchModalOrder.id ? data.order : o))
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full relative z-10">
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

            {/* Quick Demo Fill Buttons */}
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
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-3.5 flex items-center justify-between">
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

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setNotificationsDismissed((prev) => !prev);
              setNotificationsExpanded(true);
            }}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Toggle Actionable Operations Notifications"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            {notificationsData.totalActionCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                {notificationsData.totalActionCount}
              </span>
            )}
          </button>

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
      <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
        {/* ==================================================================== */}
        {/* ACTIONABLE NOTIFICATIONS BAR (ORDERS NEEDING FULFILLMENT & LOW STOCK) */}
        {/* ==================================================================== */}
        {notificationsData.totalActionCount > 0 && !notificationsDismissed && (
          <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
            {/* Main Bar */}
            <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-amber-500/5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-sm animate-pulse">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Action Required</span>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Live store operations need administrative action
                    </div>
                  </div>
                </div>

                <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

                {/* Orders needing fulfillment badge & action */}
                {notificationsData.unfulfilledOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("orders");
                      setOrderStatusFilter("all");
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 text-amber-200 text-xs font-medium transition group"
                    title="Jump to Orders &amp; Fulfillment Pipeline"
                  >
                    <Truck className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white font-bold">{notificationsData.unfulfilledOrders.length}</strong> Order(s) Awaiting Fulfillment
                    </span>
                    <ArrowRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}

                {/* Low / Out of stock badge & action */}
                {notificationsData.outOfStockProducts.length + notificationsData.lowStockProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("products");
                      setProductLowStockFilter(true);
                      setProductCategoryFilter("all");
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-200 text-xs font-medium transition group"
                    title="Filter Product Catalog to Low-Stock items"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white font-bold">
                        {notificationsData.outOfStockProducts.length + notificationsData.lowStockProducts.length}
                      </strong> Hardware Item(s) Low / Out of Stock
                    </span>
                    <ArrowRight className="w-3 h-3 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>

              {/* Right Controls: View Details Drawer & Dismiss */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setNotificationsExpanded(!notificationsExpanded)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 border border-slate-700"
                >
                  <span>{notificationsExpanded ? "Hide Details" : `Inspect Details (${notificationsData.totalActionCount})`}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-cyan-400 transition-transform duration-200 ${
                      notificationsExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationsDismissed(true)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
                  title="Minimize notification bar (Can be reopened from the bell icon in header)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Action Drawer */}
            {notificationsExpanded && (
              <div className="border-t border-slate-800/80 p-5 bg-slate-950/90 grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Fulfillment Action Queue */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Fulfillment Queue ({notificationsData.unfulfilledOrders.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("orders");
                        setOrderStatusFilter("all");
                      }}
                      className="text-cyan-400 hover:text-cyan-300 text-xs font-medium flex items-center gap-1"
                    >
                      <span>Open Pipeline</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {notificationsData.unfulfilledOrders.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs text-center">
                      All orders have been fulfilled or collected!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {notificationsData.unfulfilledOrders.slice(0, 6).map((ord) => {
                        return (
                          <div
                            key={ord.id}
                            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-xs transition"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white">
                                  #{ord.order_number || ord.id.slice(0, 8)}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-800 text-amber-300 border border-amber-800/60">
                                  {ord.status.replace(/_/g, " ")}
                                </span>
                              </div>
                              <div className="text-slate-400 text-[11px] truncate mt-0.5">
                                {ord.customer_name} • <span className="font-mono text-cyan-300">{formatRupiah(ord.total)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {ord.status === "order_received" && (
                                <button
                                  type="button"
                                  onClick={() => advanceOrderStage(ord.id, "order_accepted")}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                                >
                                  Accept
                                </button>
                              )}
                              {ord.status === "finding_courier" && (
                                <button
                                  type="button"
                                  onClick={() => setDispatchModalOrder(ord)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
                                >
                                  Dispatch
                                </button>
                              )}
                              {ord.status === "ready_for_pickup" && (
                                <button
                                  type="button"
                                  onClick={() => advanceOrderStage(ord.id, "collected")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
                                >
                                  Handover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab("orders");
                                  setOrderStatusFilter(ord.status);
                                }}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                title="View in Orders"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Column 2: Low-Stock Inventory Alerts */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>
                        Low Stock Alerts ({notificationsData.outOfStockProducts.length + notificationsData.lowStockProducts.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("products");
                        setProductLowStockFilter(true);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 text-xs font-medium flex items-center gap-1"
                    >
                      <span>View in Catalog</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {notificationsData.outOfStockProducts.length === 0 && notificationsData.lowStockProducts.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs text-center">
                      Warehouse stock levels are healthy across all categories!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {[...notificationsData.outOfStockProducts, ...notificationsData.lowStockProducts].slice(0, 6).map((prod) => {
                        const avail = prod.stock_available !== undefined ? prod.stock_available : prod.stock_on_hand;
                        const isOut = avail <= 0;

                        return (
                          <div
                            key={prod.id}
                            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-xs transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {prod.images?.[0] ? (
                                  <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-4 h-4 text-slate-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-white truncate max-w-[170px]" title={prod.name}>
                                  {prod.name}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-cyan-400">{prod.sku}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                                      isOut
                                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                                        : "bg-amber-950 text-amber-300 border border-amber-800"
                                    }`}
                                  >
                                    {isOut ? "Out of Stock" : `${avail} left in store`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditProductModal(prod)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-medium transition flex items-center gap-1"
                                title="Adjust inventory stock level"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Restock</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const itemStats =
                                    analyticsData.enrichedProducts.find((p: any) => p.id === prod.id) || prod;
                                  setSelectedItemAnalytics(itemStats);
                                }}
                                className="p-1 rounded-lg hover:bg-slate-800 text-purple-400 transition"
                                title="View Sales Stats"
                              >
                                <BarChart3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
            onClick={() => setActiveTab("crm")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "crm"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers &amp; Profiles</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-xs ${
                activeTab === "crm" ? "bg-slate-950 text-cyan-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {customers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "analytics"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Sales &amp; Profit Analytics</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-xs ${
                activeTab === "analytics" ? "bg-slate-950 text-cyan-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              Live
            </span>
          </button>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: ORDERS & FULFILLMENT PIPELINE (WITH REJECT BUTTON)             */}
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
                  { id: "cancelled", label: "Cancelled / Rejected" },
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
                  const isCancelled = order.status === "cancelled";

                  return (
                    <div
                      key={order.id}
                      className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition ${
                        isCancelled
                          ? "border-red-900/60 bg-red-950/10"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-base font-bold text-white">
                              #{order.order_number}
                            </span>
                            {isCancelled ? (
                              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-950 border border-red-700 text-red-300 flex items-center gap-1">
                                <Ban className="w-3 h-3 text-red-400" />
                                <span>ORDER REJECTED / CANCELLED</span>
                              </span>
                            ) : isCnC ? (
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

                      {/* STAGES PROGRESS STEPPER (Only for non-cancelled orders) */}
                      {!isCancelled && (
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
                            ].map((step) => {
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
                      )}

                      {/* Rejection Note if Cancelled */}
                      {isCancelled && order.notes && (
                        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Rejection Note: </span>
                            <span>{order.notes}</span>
                            <div className="text-[11px] text-red-400 mt-1 font-mono">
                              Reserved stock has been automatically released back to warehouse inventory.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Courier Live Telemetry Banner */}
                      {order.courier_info && !isCancelled && (
                        <div className="p-3.5 rounded-xl border bg-slate-950/80 border-slate-800 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* Courier Emblem */}
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md ${
                                  (order.courier_info.courier_company || order.courier_info.provider) === "jne"
                                    ? "bg-[#003399]"
                                    : (order.courier_info.courier_company || order.courier_info.provider) === "jnt"
                                    ? "bg-[#ED1C24]"
                                    : (order.courier_info.courier_company || order.courier_info.provider) === "sicepat"
                                    ? "bg-[#D31515]"
                                    : (order.courier_info.courier_company || order.courier_info.provider) === "anteraja"
                                    ? "bg-[#E91E63]"
                                    : (order.courier_info.courier_company || order.courier_info.provider) === "gojek"
                                    ? "bg-[#00AA13]"
                                    : (order.courier_info.courier_company || order.courier_info.provider) === "grab"
                                    ? "bg-[#00B14F]"
                                    : "bg-cyan-700"
                                }`}
                              >
                                {((order.courier_info.courier_company || order.courier_info.provider) as string)?.toUpperCase()?.slice(0, 3) || "BIT"}
                              </div>

                              <div>
                                <div className="text-xs font-semibold text-white flex flex-wrap items-center gap-2">
                                  <span>{order.courier_info.service_name || "Biteship Multi-Courier"}</span>
                                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                                    {order.courier_info.status || "dispatched"}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                                  <span>
                                    Driver: <strong>{order.courier_info.driver_name || "Assigned Driver"}</strong> ({order.courier_info.vehicle_plate || "B 1234 BTE"})
                                  </span>
                                  <span>•</span>
                                  <span>{order.courier_info.driver_phone || "+62 812-0000-0000"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Waybill / Resi (AWB) Pill with Click-to-Copy */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const waybill = order.courier_info.waybill_id || order.courier_info.tracking_id;
                                  navigator.clipboard.writeText(waybill);
                                  showToast(`Waybill (Resi) copied: ${waybill}`);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800/60 font-mono text-xs flex items-center gap-1.5 transition shadow-xs group"
                                title="Click to copy Air Waybill / Resi"
                              >
                                <span className="text-[10px] uppercase tracking-wider text-slate-400">AWB:</span>
                                <span className="font-bold">{order.courier_info.waybill_id || order.courier_info.tracking_id}</span>
                                <FileText className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          </div>

                          {/* Pickup & Webhook Status Telemetry Bar */}
                          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="text-slate-400 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Pickup: <strong>Mangga Dua Mall Lt. 3 No. 36</strong></span>
                              {order.courier_info.pickup_scheduled_time && (
                                <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded font-mono">
                                  Scheduled: {new Date(order.courier_info.pickup_scheduled_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>

                            {/* Biteship Webhook Simulator Buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] uppercase font-bold text-slate-500">
                                Simulate Biteship Webhook:
                              </span>
                              {[
                                { st: "allocated", label: "Allocated" },
                                { st: "picking_up", label: "Picking Up" },
                                { st: "picked", label: "Picked" },
                                { st: "in_transit", label: "In Transit" },
                                { st: "delivered", label: "Delivered" },
                              ].map((step) => (
                                <button
                                  key={step.st}
                                  type="button"
                                  disabled={simulatingWebhookOrderId === order.id}
                                  onClick={() => handleSimulateBiteshipWebhook(order.id, step.st)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                    order.courier_info.status === step.st
                                      ? "bg-emerald-900/60 border-emerald-500 text-emerald-300"
                                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
                                  }`}
                                >
                                  {step.label}
                                </button>
                              ))}
                            </div>
                          </div>
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
                        </div>
                      </div>

                      {/* STAGE ACTION CONTROLS & REJECT BUTTON */}
                      {!isCancelled && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                          <div className="text-xs text-slate-400">
                            Current Status: <strong className="text-cyan-300 uppercase font-mono">{order.status.replace(/_/g, " ")}</strong>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* REJECT ORDER BUTTON (Available to Admin and Superadmin) */}
                            {!isDelivered && (
                              <button
                                onClick={() => {
                                  setRejectModalOrder(order);
                                  setRejectReason("Out of stock in warehouse");
                                  setCustomRejectReason("");
                                }}
                                className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 text-xs font-semibold transition flex items-center gap-1.5"
                                title="Reject order due to zero stock or other reasons"
                              >
                                <Ban className="w-3.5 h-3.5 text-red-400" />
                                <span>Reject Order</span>
                              </button>
                            )}

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
                                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-semibold text-xs shadow-md transition flex items-center gap-1.5"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Dispatch Courier (Biteship API)</span>
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
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: PRODUCT CATALOG & IMAGE MANAGEMENT (RESIZABLE & ARRANGEABLE)  */}
        {/* ==================================================================== */}
        {activeTab === "products" && (() => {
          const filteredProducts = products.filter((p) => {
            const matchesSearch =
              !productSearch ||
              p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
              p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
              p.sku.toLowerCase().includes(productSearch.toLowerCase());
            const matchesCat =
              productCategoryFilter === "all" ||
              p.category_slug === productCategoryFilter ||
              p.pc_builder_slot === productCategoryFilter;
            const avail = p.stock_available !== undefined ? p.stock_available : p.stock_on_hand;
            const matchesLowStock = !productLowStockFilter || avail <= 3;
            return matchesSearch && matchesCat && matchesLowStock;
          });

          return (
            <div className="space-y-6">
              {/* Product Toolbar */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[280px] flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by hardware name, brand, or SKU..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Category Filter */}
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="all">All Categories ({products.length})</option>
                      {HARDWARE_CATEGORIES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {/* Low Stock Toggle Filter */}
                    <button
                      type="button"
                      onClick={() => setProductLowStockFilter(!productLowStockFilter)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                        productLowStockFilter
                          ? "bg-rose-950 text-rose-300 border border-rose-700 shadow-md shadow-rose-950/40"
                          : "bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                      title="Filter table to only show low stock and out-of-stock hardware"
                    >
                      <AlertTriangle className={`w-3.5 h-3.5 ${productLowStockFilter ? "text-rose-400" : "text-slate-400"}`} />
                      <span>{productLowStockFilter ? "Low Stock Active" : "Filter Low Stock"}</span>
                      {notificationsData.outOfStockProducts.length + notificationsData.lowStockProducts.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                          {notificationsData.outOfStockProducts.length + notificationsData.lowStockProducts.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Reset Column Layout Button */}
                    <button
                      type="button"
                      onClick={resetProductTableLayout}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
                      title="Reset table column widths and order to default layout"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Reset Layout</span>
                    </button>

                    {/* Add Product Button (Superadmin) */}
                    {isSuperAdmin && (
                      <button
                        onClick={() => setNewProductModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-600/20 flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Hardware Product</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-bar with count and arrangeable/resizable guidance */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
                    <span>
                      Showing <strong className="text-white">{filteredProducts.length}</strong> of{" "}
                      <strong className="text-white">{products.length}</strong> products
                      {productLowStockFilter && " (Filtered to Low Stock)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400">
                    <GripVertical className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      <strong>Arrangeable &amp; Resizable:</strong> Drag headers to reorder columns • Drag borders to resize widths.
                    </span>
                  </div>
                </div>
              </div>

              {/* Resizable & Arrangeable Table Container */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
                <table
                  style={{
                    width: `${productColOrder.reduce((acc, colKey) => acc + (productColWidths[colKey] || 120), 0)}px`,
                    minWidth: "100%",
                  }}
                  className="table-fixed border-collapse divide-y divide-slate-800 text-left text-xs"
                >
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 select-none">
                    <tr>
                      {productColOrder.map((colKey, index) => {
                        const isDragging = draggedProductCol === colKey;
                        const isDragOver = dragOverProductCol === colKey;
                        const isActions = colKey === "actions";

                        return (
                          <th
                            key={colKey}
                            draggable={!isProductResizing}
                            onDragStart={(e) => handleProductColDragStart(colKey, e)}
                            onDragOver={(e) => handleProductColDragOver(colKey, e)}
                            onDragLeave={() => setDragOverProductCol(null)}
                            onDrop={(e) => handleProductColDrop(colKey, e)}
                            style={{
                              width: `${productColWidths[colKey]}px`,
                              minWidth: `${productColWidths[colKey]}px`,
                            }}
                            className={`py-3.5 px-3 relative group transition-colors ${
                              isDragging ? "opacity-40 bg-slate-800" : ""
                            } ${
                              isDragOver ? "border-l-2 border-cyan-400 bg-cyan-950/40" : ""
                            } ${isActions ? "text-right" : "text-left"}`}
                          >
                            <div className={`flex items-center gap-1.5 ${isActions ? "justify-end" : "justify-between"}`}>
                              <div
                                className="flex items-center gap-1 min-w-0 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
                                title="Drag header to rearrange column position"
                              >
                                {!isActions && (
                                  <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 flex-shrink-0" />
                                )}
                                <span className="truncate">{PRODUCT_COL_LABELS[colKey] || colKey}</span>
                              </div>

                              {/* Left / Right Move Arrows for click accessibility */}
                              {!isActions && (
                                <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                                  {index > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveProductCol(index, index - 1);
                                      }}
                                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                                      title="Move column left"
                                    >
                                      <ChevronLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {index < productColOrder.length - 1 && productColOrder[index + 1] !== "actions" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveProductCol(index, index + 1);
                                      }}
                                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                                      title="Move column right"
                                    >
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Draggable resize handle on right border */}
                            <div
                              onMouseDown={(e) => handleProductColResizeStart(colKey, e)}
                              className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                              title="Drag to resize column width"
                            >
                              <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={productColOrder.length} className="py-12 text-center text-slate-400">
                          <Package className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                          <div className="font-medium text-slate-300">No hardware items match your filter criteria</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {productLowStockFilter
                              ? "No products are currently low on stock."
                              : "Try clearing your search query or selecting All Categories."}
                          </div>
                          {productLowStockFilter && (
                            <button
                              type="button"
                              onClick={() => setProductLowStockFilter(false)}
                              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium"
                            >
                              Show All Products
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((prod) => {
                        const catObj = HARDWARE_CATEGORIES.find(
                          (c) => c.slug === prod.category_slug || c.slot === prod.pc_builder_slot
                        );

                        return (
                          <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                            {productColOrder.map((colKey) => {
                              switch (colKey) {
                                case "product":
                                  return (
                                    <td key={colKey} className="py-3.5 px-3">
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
                                        <div className="min-w-0">
                                          <div className="font-semibold text-white truncate max-w-xs" title={prod.name}>
                                            {prod.name}
                                          </div>
                                          <div className="text-[11px] text-slate-400">{prod.brand}</div>
                                        </div>
                                      </div>
                                    </td>
                                  );

                                case "category":
                                  return (
                                    <td key={colKey} className="py-3.5 px-3">
                                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-cyan-300 border border-slate-700 truncate inline-block">
                                        {catObj?.name || prod.category_slug || "Hardware"}
                                      </span>
                                    </td>
                                  );

                                case "sku":
                                  return (
                                    <td key={colKey} className="py-3.5 px-3">
                                      <div className="font-mono text-cyan-400 text-xs">{prod.sku}</div>
                                      <div className="text-[11px] text-slate-400">{prod.brand}</div>
                                    </td>
                                  );

                                case "price":
                                  return (
                                    <td key={colKey} className="py-3.5 px-3 font-mono font-bold text-white">
                                      {prod.sale_price && prod.sale_price < prod.retail_price ? (
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-emerald-400 font-bold">{formatRupiah(prod.sale_price)}</span>
                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-600 text-white">
                                              -{Math.round(((prod.retail_price - prod.sale_price) / prod.retail_price) * 100)}%
                                            </span>
                                          </div>
                                          <span className="text-slate-400 line-through text-[11px] block">
                                            {formatRupiah(prod.retail_price)}
                                          </span>
                                        </div>
                                      ) : (
                                        <span>{formatRupiah(prod.retail_price)}</span>
                                      )}
                                    </td>
                                  );

                                case "stock_on_hand":
                                  return (
                                    <td key={colKey} className="py-3.5 px-3">
                                      <span className="font-mono font-semibold text-slate-200">
                                        {prod.stock_on_hand}
                                      </span>
                                      <span className="text-[10px] text-slate-500 block">units in store</span>
                                    </td>
                                  );

                                case "stock_available":
                                  return (
                                    <td key={colKey} className="py-3.5 px-3">
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
                                  );

                                case "pictures":
                                  return (
                                    <td key={colKey} className="py-3.5 px-3">
                                      <span className="text-slate-400 text-xs">
                                        {prod.images?.length || 0} picture(s)
                                      </span>
                                    </td>
                                  );

                                case "actions":
                                  return (
                                    <td key={colKey} className="py-3.5 px-3 text-right">
                                      <div className="inline-flex items-center gap-1.5">
                                        <button
                                          onClick={() => {
                                            const itemStats =
                                              analyticsData.enrichedProducts.find((p: any) => p.id === prod.id) || prod;
                                            setSelectedItemAnalytics(itemStats);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-purple-200 border border-slate-700 transition flex items-center gap-1"
                                          title="View detailed sales statistics and profit dashboard"
                                        >
                                          <BarChart3 className="w-3.5 h-3.5" />
                                          <span>Stats</span>
                                        </button>

                                        <button
                                          onClick={() => openEditProductModal(prod)}
                                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 transition flex items-center gap-1"
                                          title="Edit category, price, stock &amp; pictures"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                          <span>Edit</span>
                                        </button>

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
                                  );

                                default:
                                  return null;
                              }
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ==================================================================== */}
        {/* TAB 3: PROMOTIONS & BANNERS (SUPERADMIN ONLY - REORDERING & UPLOAD)   */}
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

            {/* 2. Dynamic Promotional Banners (With PC Upload, Overlay Writing & Reordering) */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span>Homepage Rotating Banners (Dynamic Order)</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Upload pictures, configure headline writing on top, and click Move Up / Move Down to change the rotation order on the main screen.
                  </p>
                </div>

                <button
                  onClick={() => setNewBannerModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Banner Slide with Overlay</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {banners
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((slide, idx) => (
                    <div
                      key={slide.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition"
                    >
                      <div>
                        {/* Picture with Writing on Top */}
                        <div className="h-44 w-full bg-slate-950 relative overflow-hidden">
                          {slide.image_url ? (
                            <img
                              src={slide.image_url}
                              alt={slide.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950" />
                          )}

                          {/* Writing Overlaid on top of picture */}
                          {!slide.hide_overlay && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 p-3.5 flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500 text-slate-950 uppercase font-mono">
                                  {slide.badge || "FEATURED"}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-mono font-bold">
                                  Position #{idx + 1}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-white font-black text-sm line-clamp-1">{slide.title}</h4>
                                <p className="text-cyan-300 text-[11px] font-medium line-clamp-1">{slide.highlight}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Banner Description & Details */}
                        <div className="p-4 space-y-2 text-xs">
                          <div className="font-semibold text-white text-sm">{slide.title}</div>
                          <p className="text-slate-400 line-clamp-2 text-[11px]">{slide.description}</p>
                          {slide.perk && (
                            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>{slide.perk}</span>
                            </div>
                          )}
                          <div className="text-[11px] text-cyan-400 font-mono">CTA Link: {slide.cta_link}</div>
                        </div>
                      </div>

                      {/* Reorder Buttons (Move Up / Down) & Remove */}
                      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500 mr-1 font-mono">Order:</span>
                          <button
                            onClick={() => handleMoveBannerOrder(slide.id, "up")}
                            disabled={idx === 0}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move Earlier in Rotation (Main Screen)"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveBannerOrder(slide.id, "down")}
                            disabled={idx === banners.length - 1}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move Later in Rotation (Main Screen)"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

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
                          className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
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
        {/* TAB 4: CUSTOMER DIRECTORY & DETAILED PROFILES                         */}
        {/* ==================================================================== */}
        {activeTab === "crm" && (
          <div className="space-y-6">
            {crmStats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">Total Registered Customers</div>
                  <div className="text-2xl font-bold text-white mt-1">{crmStats.totalLeads}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">Marketing Opt-In Rate</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{crmStats.optInRate}%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">Cumulative GMV Spent</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                    {formatRupiah(crmStats.totalRevenueGenerated)}
                  </div>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    placeholder="Search name, email, phone, city, or source..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={customerSegmentFilter}
                    onChange={(e) => setCustomerSegmentFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All Segments</option>
                    <option value="gamer">Gamer</option>
                    <option value="pc_builder">PC Builder</option>
                    <option value="creator">Content Creator</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="general">General</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setCustomerOptInOnly(!customerOptInOnly)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      customerOptInOnly
                        ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-semibold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {customerOptInOnly ? "Opt-In Only (Active)" : "Opt-In Only"}
                  </button>
                </div>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Registered Customer Directory</h3>
                  <p className="text-xs text-slate-400">
                    Comprehensive customer profiles, contact numbers, delivery addresses, and attribution details.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {
                    customers.filter((c) => {
                      if (customerOptInOnly && !c.marketing_opt_in) return false;
                      if (customerSegmentFilter !== "all" && c.customer_segment !== customerSegmentFilter) return false;
                      if (customerSearchTerm.trim()) {
                        const q = customerSearchTerm.toLowerCase();
                        const matchName = c.full_name?.toLowerCase().includes(q);
                        const matchEmail = c.email?.toLowerCase().includes(q);
                        const matchPhone = c.phone?.includes(q);
                        const matchCity = c.city?.toLowerCase().includes(q);
                        const matchSource = c.lead_source?.toLowerCase().includes(q);
                        if (!matchName && !matchEmail && !matchPhone && !matchCity && !matchSource) return false;
                      }
                      return true;
                    }).length
                  }{" "}
                  of {customers.length} records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Phone & Location</th>
                      <th className="py-3 px-4">Discovery Source</th>
                      <th className="py-3 px-4">Segment</th>
                      <th className="py-3 px-4">Orders &amp; Spend</th>
                      <th className="py-3 px-4">Marketing</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {customers
                      .filter((c) => {
                        if (customerOptInOnly && !c.marketing_opt_in) return false;
                        if (customerSegmentFilter !== "all" && c.customer_segment !== customerSegmentFilter) return false;
                        if (customerSearchTerm.trim()) {
                          const q = customerSearchTerm.toLowerCase();
                          const matchName = c.full_name?.toLowerCase().includes(q);
                          const matchEmail = c.email?.toLowerCase().includes(q);
                          const matchPhone = c.phone?.includes(q);
                          const matchCity = c.city?.toLowerCase().includes(q);
                          const matchSource = c.lead_source?.toLowerCase().includes(q);
                          if (!matchName && !matchEmail && !matchPhone && !matchCity && !matchSource) return false;
                        }
                        return true;
                      })
                      .map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCustomer(c)}
                          className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{c.full_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{c.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-slate-200">{c.phone || "No phone"}</div>
                            <div className="text-[11px] text-slate-400">
                              {c.city}
                              {c.subdistrict ? `, ${c.subdistrict}` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-950/70 border border-cyan-800/50 text-cyan-300 capitalize">
                              {c.lead_source ? c.lead_source.replace(/_/g, " ") : "Direct"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-200 uppercase">
                              {c.customer_segment || "general"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <div className="font-bold text-cyan-400">{formatRupiah(c.total_spent || 0)}</div>
                            <div className="text-[10px] text-slate-400">{c.total_orders || 0} orders</div>
                          </td>
                          <td className="py-3 px-4">
                            {c.marketing_opt_in ? (
                              <span className="text-emerald-400 font-medium">Opted-in</span>
                            ) : (
                              <span className="text-slate-500">No</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(c);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
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
        {/* TAB 5: SALES & PROFIT ANALYTICS (WITH DRAGGABLE RESIZABLE TABLE)     */}
        {/* ==================================================================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Top Overview & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-cyan-500/20">
                    <TrendingUp className="w-4 h-4 text-slate-950" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Sales &amp; Profit Intelligence</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Live Telemetry
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Storewide sales velocity, unit economics, gross margins, and draggable resizable data grid.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={resetColWidths}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
                  title="Reset table column widths to default layout"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reset Column Widths</span>
                </button>

                <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    <strong className="text-white font-medium">{products.length}</strong> items tracked
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Sales Statistics Headline Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Weekly Gross Profit */}
              <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/60 transition">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Weekly Gross Profit (7D)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-400 tracking-tight font-mono">
                  {formatRupiah(analyticsData.weeklyGrossProfit)}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80">
                  <span className="text-slate-400">
                    Gross Margin: <strong className="text-emerald-300 font-semibold">{analyticsData.weeklyMarginPct}%</strong>
                  </span>
                  {analyticsData.profitGrowthPct !== 0 && (
                    <span
                      className={`inline-flex items-center gap-0.5 font-medium ${
                        analyticsData.profitGrowthPct >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {analyticsData.profitGrowthPct >= 0 ? "+" : ""}
                      {analyticsData.profitGrowthPct}% vs prior 7D
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Sales in a Week (Revenue) */}
              <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/60 transition">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Sales in a Week (7D)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-700/50 flex items-center justify-center text-cyan-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-cyan-400 tracking-tight font-mono">
                  {formatRupiah(analyticsData.weeklySales)}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80">
                  <span className="text-slate-400">
                    Orders: <strong className="text-white font-medium">{analyticsData.weeklyOrdersCount}</strong>
                  </span>
                  <span className="text-slate-400">
                    AOV: <strong className="text-cyan-300 font-mono">{formatRupiah(analyticsData.weeklyAov)}</strong>
                  </span>
                </div>
              </div>

              {/* Card 3: Weekly Units & Run-Rate */}
              <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-purple-500/60 transition">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Weekly Volume Sold
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-700/50 flex items-center justify-center text-purple-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-300 tracking-tight font-mono">
                  {analyticsData.weeklyUnits.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-slate-400">units</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80">
                  <span className="text-slate-400">Daily Velocity:</span>
                  <span className="text-purple-300 font-medium font-mono">
                    {(analyticsData.weeklyUnits / 7).toFixed(1)} units / day
                  </span>
                </div>
              </div>

              {/* Card 4: Store Lifetime Totals */}
              <div className="bg-slate-900/80 border border-blue-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/60 transition">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Store Lifetime Profit
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-700/50 flex items-center justify-center text-blue-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-300 tracking-tight font-mono">
                  {formatRupiah(analyticsData.lifetimeGrossProfit)}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80">
                  <span className="text-slate-400">
                    Revenue: <strong className="text-slate-300 font-mono">{formatRupiah(analyticsData.lifetimeSales)}</strong>
                  </span>
                  <span className="text-slate-400">
                    <strong className="text-white font-medium">{analyticsData.lifetimeOrdersCount}</strong> orders
                  </span>
                </div>
              </div>
            </div>

            {/* 7-Day Daily Breakdown Bar & Flow */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>7-Day Daily Revenue &amp; Gross Profit Breakdown</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Day-by-day sales pacing and profit margins over the trailing 7 days.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-cyan-500/80" />
                    <span>Revenue</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500/80" />
                    <span>Gross Profit</span>
                  </div>
                </div>
              </div>

              {(() => {
                const maxDayRev = Math.max(...analyticsData.dailyBreakdown.map((d) => d.revenue), 1);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                    {analyticsData.dailyBreakdown.map((day) => {
                      const revPct = Math.round((day.revenue / maxDayRev) * 100);
                      const profitPct = Math.round((day.profit / maxDayRev) * 100);

                      return (
                        <div
                          key={day.dateStr}
                          className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-slate-700 transition"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-300">{day.label}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{day.dateStr}</div>
                          </div>

                          <div className="my-3 space-y-1.5">
                            {/* Revenue Bar */}
                            <div>
                              <div className="flex justify-between text-[11px] font-mono text-cyan-300 mb-0.5">
                                <span>Rev</span>
                                <span>{formatRupiah(day.revenue)}</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(revPct, day.revenue > 0 ? 6 : 0)}%` }}
                                />
                              </div>
                            </div>

                            {/* Profit Bar */}
                            <div>
                              <div className="flex justify-between text-[11px] font-mono text-emerald-400 mb-0.5">
                                <span>Profit</span>
                                <span>{formatRupiah(day.profit)}</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(profitPct, day.profit > 0 ? 6 : 0)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                            <span>{day.orders} order(s)</span>
                            <span className="font-mono">{day.units} unit(s)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Draggable Table Toolbar & Filter Controls */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by product title, brand, or SKU code..."
                    value={analyticsSearch}
                    onChange={(e) => setAnalyticsSearch(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                  {analyticsSearch && (
                    <button
                      onClick={() => setAnalyticsSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={analyticsCategoryFilter}
                    onChange={(e) => setAnalyticsCategoryFilter(e.target.value)}
                    className="bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="all">All Categories ({products.length})</option>
                    {HARDWARE_CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Sort Selection */}
                  <select
                    value={analyticsSortBy}
                    onChange={(e) => setAnalyticsSortBy(e.target.value)}
                    className="bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="weeklyGrossProfit">Sort by 7D Gross Profit</option>
                    <option value="weeklyRevenue">Sort by 7D Revenue</option>
                    <option value="weeklyUnits">Sort by 7D Units Sold</option>
                    <option value="lifetimeGrossProfit">Sort by Lifetime Profit</option>
                    <option value="lifetimeRevenue">Sort by Lifetime Revenue</option>
                    <option value="lifetimeUnits">Sort by Lifetime Units</option>
                    <option value="retail_price">Sort by Retail Price</option>
                    <option value="marginPct">Sort by Gross Margin %</option>
                    <option value="stock_on_hand">Sort by Stock On Hand</option>
                    <option value="name">Sort by Product Name</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setAnalyticsSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                    className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
                    title={`Sort Direction: ${analyticsSortOrder === "asc" ? "Ascending" : "Descending"}`}
                  >
                    {analyticsSortOrder === "asc" ? (
                      <ArrowUp className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-cyan-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Helper Bar & Tip */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>
                    Showing <strong className="text-white">{sortedAndFilteredProducts.length}</strong> of{" "}
                    <strong className="text-white">{products.length}</strong> items
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    <strong>Draggable columns active:</strong> Drag the border handle between any two columns to resize.
                  </span>
                </div>
              </div>
            </div>

            {/* Draggable Resizable Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
              <table
                style={{
                  width: `${Object.values(colWidths).reduce((acc, w) => acc + w, 0)}px`,
                  minWidth: "100%",
                }}
                className="table-fixed border-collapse divide-y divide-slate-800 text-left text-xs"
              >
                <thead className="bg-slate-950 text-slate-300 font-semibold tracking-wider text-[11px] uppercase sticky top-0 z-10 select-none">
                  <tr>
                    {/* 1. Product Name */}
                    <th
                      style={{ width: `${colWidths.product}px`, minWidth: `${colWidths.product}px` }}
                      className="py-3.5 px-4 relative group"
                    >
                      <div
                        onClick={() => {
                          setAnalyticsSortBy("name");
                          setAnalyticsSortOrder((prev) => (analyticsSortBy === "name" && prev === "asc" ? "desc" : "asc"));
                        }}
                        className="flex items-center justify-between cursor-pointer hover:text-white"
                      >
                        <span>Product Elements</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("product", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 2. SKU */}
                    <th
                      style={{ width: `${colWidths.sku}px`, minWidth: `${colWidths.sku}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span>SKU</span>
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("sku", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 3. Category */}
                    <th
                      style={{ width: `${colWidths.category}px`, minWidth: `${colWidths.category}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span>Category</span>
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("category", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 4. Retail Price */}
                    <th
                      style={{ width: `${colWidths.price}px`, minWidth: `${colWidths.price}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div
                        onClick={() => {
                          setAnalyticsSortBy("retail_price");
                          setAnalyticsSortOrder((prev) => (analyticsSortBy === "retail_price" && prev === "desc" ? "asc" : "desc"));
                        }}
                        className="flex items-center justify-between cursor-pointer hover:text-white"
                      >
                        <span>Retail Price</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("price", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 5. Unit Cost (COGS) */}
                    <th
                      style={{ width: `${colWidths.cost}px`, minWidth: `${colWidths.cost}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span>Est. Cost (COGS)</span>
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("cost", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 6. Units Sold (7D) */}
                    <th
                      style={{ width: `${colWidths.unitsWeek}px`, minWidth: `${colWidths.unitsWeek}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div
                        onClick={() => {
                          setAnalyticsSortBy("weeklyUnits");
                          setAnalyticsSortOrder((prev) => (analyticsSortBy === "weeklyUnits" && prev === "desc" ? "asc" : "desc"));
                        }}
                        className="flex items-center justify-between cursor-pointer hover:text-white"
                      >
                        <span>7D Units</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("unitsWeek", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 7. Lifetime Units */}
                    <th
                      style={{ width: `${colWidths.unitsLifetime}px`, minWidth: `${colWidths.unitsLifetime}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div
                        onClick={() => {
                          setAnalyticsSortBy("lifetimeUnits");
                          setAnalyticsSortOrder((prev) => (analyticsSortBy === "lifetimeUnits" && prev === "desc" ? "asc" : "desc"));
                        }}
                        className="flex items-center justify-between cursor-pointer hover:text-white"
                      >
                        <span>Total Units</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("unitsLifetime", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 8. 7D Revenue */}
                    <th
                      style={{ width: `${colWidths.revWeek}px`, minWidth: `${colWidths.revWeek}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div
                        onClick={() => {
                          setAnalyticsSortBy("weeklyRevenue");
                          setAnalyticsSortOrder((prev) => (analyticsSortBy === "weeklyRevenue" && prev === "desc" ? "asc" : "desc"));
                        }}
                        className="flex items-center justify-between cursor-pointer hover:text-white"
                      >
                        <span>7D Revenue</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("revWeek", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 9. 7D Gross Profit */}
                    <th
                      style={{ width: `${colWidths.profitWeek}px`, minWidth: `${colWidths.profitWeek}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div
                        onClick={() => {
                          setAnalyticsSortBy("weeklyGrossProfit");
                          setAnalyticsSortOrder((prev) => (analyticsSortBy === "weeklyGrossProfit" && prev === "desc" ? "asc" : "desc"));
                        }}
                        className="flex items-center justify-between cursor-pointer hover:text-white"
                      >
                        <span>7D Profit</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("profitWeek", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 10. Margin % */}
                    <th
                      style={{ width: `${colWidths.margin}px`, minWidth: `${colWidths.margin}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div
                        onClick={() => {
                          setAnalyticsSortBy("marginPct");
                          setAnalyticsSortOrder((prev) => (analyticsSortBy === "marginPct" && prev === "desc" ? "asc" : "desc"));
                        }}
                        className="flex items-center justify-between cursor-pointer hover:text-white"
                      >
                        <span>Margin %</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("margin", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 11. Stock on Hand */}
                    <th
                      style={{ width: `${colWidths.stock}px`, minWidth: `${colWidths.stock}px` }}
                      className="py-3.5 px-3 relative group"
                    >
                      <div
                        onClick={() => {
                          setAnalyticsSortBy("stock_on_hand");
                          setAnalyticsSortOrder((prev) => (analyticsSortBy === "stock_on_hand" && prev === "desc" ? "asc" : "desc"));
                        }}
                        className="flex items-center justify-between cursor-pointer hover:text-white"
                      >
                        <span>Stock</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                      </div>
                      <div
                        onMouseDown={(e) => handleColResizeStart("stock", e)}
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-cyan-500/20 active:bg-cyan-500/40 z-20 group"
                        title="Drag to resize column"
                      >
                        <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-cyan-400 group-active:bg-cyan-300 transition-colors rounded-full" />
                      </div>
                    </th>

                    {/* 12. Actions */}
                    <th
                      style={{ width: `${colWidths.actions}px`, minWidth: `${colWidths.actions}px` }}
                      className="py-3.5 px-4 text-right"
                    >
                      <span>Dashboard</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80">
                  {sortedAndFilteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <div className="font-medium text-slate-300">No products found</div>
                        <div className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or category filter.</div>
                      </td>
                    </tr>
                  ) : (
                    sortedAndFilteredProducts.map((p) => {
                      const hasImage = p.images && p.images.length > 0;
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                          onClick={() => setSelectedItemAnalytics(p)}
                        >
                          {/* Product Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                                {hasImage ? (
                                  <Image
                                    src={p.images[0]}
                                    alt={p.name}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-slate-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider truncate">
                                  {p.brand}
                                </div>
                                <div className="text-xs font-medium text-white truncate max-w-[200px]" title={p.name}>
                                  {p.name}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="py-3 px-3">
                            <span className="font-mono text-[11px] text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 truncate block">
                              {p.sku}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 truncate">
                              {p.category_slug}
                            </span>
                          </td>

                          {/* Retail Price */}
                          <td className="py-3 px-3 font-mono text-xs text-white font-medium">
                            {formatRupiah(p.retail_price)}
                          </td>

                          {/* Cost (COGS) */}
                          <td className="py-3 px-3 font-mono text-xs text-slate-400">
                            {formatRupiah(p.cost_price)}
                          </td>

                          {/* 7D Units */}
                          <td className="py-3 px-3 font-mono text-xs">
                            <span
                              className={`font-semibold ${
                                p.weeklyUnits > 0 ? "text-cyan-300" : "text-slate-500"
                              }`}
                            >
                              {p.weeklyUnits}
                            </span>
                          </td>

                          {/* Total Units */}
                          <td className="py-3 px-3 font-mono text-xs text-slate-300">
                            {p.lifetimeUnits}
                          </td>

                          {/* 7D Revenue */}
                          <td className="py-3 px-3 font-mono text-xs text-cyan-400 font-medium">
                            {formatRupiah(p.weeklyRevenue)}
                          </td>

                          {/* 7D Gross Profit */}
                          <td className="py-3 px-3 font-mono text-xs text-emerald-400 font-bold">
                            {formatRupiah(p.weeklyGrossProfit)}
                          </td>

                          {/* Margin % */}
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                p.marginPct >= 20
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : p.marginPct >= 12
                                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                  : "bg-amber-950 text-amber-300 border border-amber-800"
                              }`}
                            >
                              {p.marginPct}%
                            </span>
                          </td>

                          {/* Stock & Velocity */}
                          <td className="py-3 px-3">
                            <div className="font-mono text-xs text-white">
                              {p.stock_on_hand}{" "}
                              <span className="text-[10px] text-slate-400 font-sans">left</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {p.daysOfSupply === 999 ? "Ample supply" : `${p.daysOfSupply}d supply`}
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedItemAnalytics(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 border border-cyan-800 transition flex items-center gap-1 text-xs font-medium ml-auto"
                              title="Open full item sales dashboard"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              <span>Dashboard</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================== */}
      {/* MODAL 1: EDIT PRODUCT (CATEGORY SELECTOR & PC IMAGE UPLOAD)            */}
      {/* ====================================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Edit Product Elements</h3>
                <p className="text-xs text-slate-400">
                  Modify name, category, price, stock, specs, and picture gallery.
                </p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Product Name & Brand */}
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

              {/* CATEGORY SELECTOR (NOW EDITABLE AS REQUESTED) & SKU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cyan-400 mb-1">
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
                    className="w-full bg-slate-950 border border-cyan-600/70 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {HARDWARE_CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name} (Slot: {c.slot})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Assigned Builder Slot: <strong className="text-cyan-300 font-mono">{editingProduct.pc_builder_slot || "none"}</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Pricing & Stock on Hand + Promotional Discount Controls */}
              <div className="space-y-3 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
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

                {/* Promotional Discount Fields */}
                <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Promotional Discount / Sale Price</span>
                    </span>
                    {editingProduct.sale_price ? (
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, sale_price: null })}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Remove Discount
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
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
                        className="w-full bg-slate-950 border border-amber-600/50 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono placeholder-slate-600 focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
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
                        className="w-full bg-slate-950 border border-amber-600/50 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono placeholder-slate-600 focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Live Discount Preview Badge */}
                  {editingProduct.sale_price && editingProduct.retail_price && editingProduct.sale_price < editingProduct.retail_price && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">
                          {formatRupiah(editingProduct.sale_price)}
                        </span>
                        <span className="text-slate-400 line-through font-mono text-[11px]">
                          {formatRupiah(editingProduct.retail_price)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[10px]">
                          -{Math.round(((editingProduct.retail_price - editingProduct.sale_price) / editingProduct.retail_price) * 100)}% OFF
                        </span>
                      </div>
                      <span className="text-emerald-400 font-semibold text-[11px]">
                        Save {formatRupiah(editingProduct.retail_price - editingProduct.sale_price)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rich Description (Formatting & In-text Pictures) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Rich Product Description (Formatting &amp; In-text Pictures)</span>
                </label>
                <RichTextEditor
                  value={editingProduct.description || ""}
                  onChange={(val) => setEditingProduct({ ...editingProduct, description: val })}
                  availableImages={editingProduct.images || []}
                  token={token}
                />
              </div>

              {/* Product Gallery Manager with Rearrange, Delete, Upload */}
              <ProductGalleryManager
                images={editingProduct.images || []}
                onChange={(newImgs) => setEditingProduct({ ...editingProduct, images: newImgs })}
                token={token}
                onUploadSuccess={(msg) => showToast(msg)}
              />
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
      {/* MODAL 2: REJECT ORDER (STOCK OUT OR OTHER REASON)                      */}
      {/* ====================================================================== */}
      {rejectModalOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <Ban className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Reject / Cancel Order</h3>
              </div>
              <button onClick={() => setRejectModalOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              You are rejecting Order <strong className="text-white font-mono">#{rejectModalOrder.order_number}</strong> placed by <strong className="text-white">{rejectModalOrder.customer_name}</strong> ({formatRupiah(rejectModalOrder.total)}).
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
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
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
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Back
              </button>
              <button
                type="button"
                disabled={rejectingSubmitting}
                onClick={handleConfirmRejectOrder}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-1.5"
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-950 text-cyan-400 border border-blue-800">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Biteship Multi-Courier Dispatch</h3>
                  <p className="text-[11px] text-slate-400">Waybill Generation & Automated Shop Pickup</p>
                </div>
              </div>
              <button onClick={() => setDispatchModalOrder(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
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
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                        isSelected
                          ? "bg-slate-800 border-cyan-400 shadow-md ring-1 ring-cyan-400"
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
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition flex items-center gap-2 ${
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
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition flex items-center gap-2 ${
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Pickup Time:</label>
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
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
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dispatchingLoading}
                onClick={dispatchCourier}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Add New Hardware Item (Superadmin)</h3>
              </div>
              <button onClick={() => setNewProductModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
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
                  <label className="block font-semibold text-slate-300 mb-1">Category & Builder Slot</label>
                  <select
                    name="category_slug"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {HARDWARE_CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Promotional Discount */}
              <div className="space-y-3 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Retail Price (IDR)</label>
                    <input
                      name="retail_price"
                      type="number"
                      required
                      placeholder="e.g. 10999000"
                      value={newProductRetailPrice}
                      onChange={(e) => setNewProductRetailPrice(Number(e.target.value))}
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

                {/* Promotional Discount Inputs */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProductDiscountEnabled}
                        onChange={(e) => setNewProductDiscountEnabled(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <span className="font-bold text-amber-400 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Apply Promotional Discount / Slashed Price</span>
                      </span>
                    </label>
                  </div>

                  {newProductDiscountEnabled && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
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
                          className="w-full bg-slate-950 border border-amber-600/50 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
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
                          className="w-full bg-slate-950 border border-amber-600/50 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {newProductDiscountEnabled &&
                    typeof newProductSalePrice === "number" &&
                    typeof newProductRetailPrice === "number" &&
                    newProductSalePrice > 0 &&
                    newProductSalePrice < newProductRetailPrice && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono">
                            {formatRupiah(newProductSalePrice)}
                          </span>
                          <span className="text-slate-400 line-through font-mono text-[11px]">
                            {formatRupiah(newProductRetailPrice)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[10px]">
                            -{Math.round(((newProductRetailPrice - newProductSalePrice) / newProductRetailPrice) * 100)}% OFF
                          </span>
                        </div>
                        <span className="text-emerald-400 font-semibold text-[11px]">
                          Save {formatRupiah(newProductRetailPrice - newProductSalePrice)}
                        </span>
                      </div>
                    )}
                </div>
              </div>

              {/* Rich Product Description with Formatting & Image Inserter */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">
                  Product Description (Headers, Bold, Italics &amp; In-text Pictures)
                </label>
                <RichTextEditor
                  value={newProductDescription}
                  onChange={setNewProductDescription}
                  availableImages={newProductImages}
                  token={token}
                />
              </div>

              {/* Product Gallery Manager (Multi-upload & Rearrange) */}
              <ProductGalleryManager
                images={newProductImages}
                onChange={setNewProductImages}
                token={token}
                onUploadSuccess={(msg) => showToast(msg)}
              />

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
      {/* MODAL 5: ADD BANNER WITH PC UPLOAD & WRITING ON TOP (SUPERADMIN ONLY)   */}
      {/* ====================================================================== */}
      {newBannerModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-purple-800/80 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Add Promotional Banner Slide</h3>
                  <p className="text-xs text-slate-400">Upload background picture & configure writing on top.</p>
                </div>
              </div>
              <button onClick={() => setNewBannerModalOpen(false)} className="text-slate-400 hover:text-white">
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
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500 text-slate-950 uppercase font-mono">
                          {newBannerForm.badge || "FEATURED"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-mono">
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
                        <span className="px-3 py-1 bg-white text-zinc-900 rounded-lg text-[10px] font-black uppercase tracking-wider">
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
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>📁 Upload Picture from Computer</span>
                  </button>

                  <input
                    type="url"
                    placeholder="Or paste background image URL..."
                    value={newBannerForm.image_url}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, image_url: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Highlight / Subtitle</label>
                  <input
                    value={newBannerForm.highlight}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, highlight: e.target.value })}
                    placeholder="e.g. Free 72-Hour Rig Stress Test Included"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Display Order (Position on Screen)</label>
                  <input
                    type="number"
                    value={newBannerForm.display_order}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, display_order: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Perk / Warranty Line</label>
                  <input
                    value={newBannerForm.perk}
                    onChange={(e) => setNewBannerForm({ ...newBannerForm, perk: e.target.value })}
                    placeholder="e.g. Full 3-Year Official Manufacturer Warranty"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Button CTA Text & Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={newBannerForm.cta_text}
                      onChange={(e) => setNewBannerForm({ ...newBannerForm, cta_text: e.target.value })}
                      placeholder="Shop Now"
                      className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                    <input
                      value={newBannerForm.cta_link}
                      onChange={(e) => setNewBannerForm({ ...newBannerForm, cta_link: e.target.value })}
                      placeholder="/components/gpu"
                      className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
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
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold"
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

      {/* ====================================================================== */}
      {/* MODAL 7: CUSTOMER FULL PROFILE & ORDER HISTORY                         */}
      {/* ====================================================================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-6 my-8 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
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
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 uppercase">
                      {selectedCustomer.customer_segment || "general"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Customer ID: {selectedCustomer.id}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Section 1 & 2 Grid: Contact Info & Delivery Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Information */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs border-b border-slate-800 pb-2">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span>Contact &amp; Account Details</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Primary Email</span>
                      <a
                        href={`mailto:${selectedCustomer.email}`}
                        className="text-cyan-400 hover:underline font-mono"
                      >
                        {selectedCustomer.email}
                      </a>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Mobile Phone</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white font-mono">{selectedCustomer.phone || "Not provided"}</span>
                        {selectedCustomer.phone && (
                          <a
                            href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-semibold transition-colors"
                          >
                            WhatsApp Chat
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Registered Date</span>
                      <span className="text-slate-300 font-mono">
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
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>Primary Delivery Address</span>
                    </div>
                    {selectedCustomer.address_label && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                        {selectedCustomer.address_label}
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
                    <div className="text-slate-400 font-mono text-[11px]">
                      {selectedCustomer.country || "Indonesia"}
                    </div>

                    {selectedCustomer.delivery_notes && (
                      <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">Delivery Notes:</span>{" "}
                        {selectedCustomer.delivery_notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3 & 4 Grid: Attribution & Preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Discovery & Acquisition Attribution */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs border-b border-slate-800 pb-2">
                    <Compass className="w-4 h-4 text-purple-400" />
                    <span>Discovery &amp; Attribution</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">How they got to know us</span>
                      <span className="px-2.5 py-1 rounded-md bg-purple-950/60 border border-purple-800/60 text-purple-200 text-xs font-medium inline-block mt-1 capitalize">
                        {selectedCustomer.lead_source
                          ? selectedCustomer.lead_source.replace(/_/g, " ")
                          : "Direct / Unknown"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Hardware Architecture Preference</span>
                      <span className="text-slate-200 uppercase font-mono mt-0.5 block">
                        {selectedCustomer.hardware_preference || "All Vendors"}
                      </span>
                    </div>

                    {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                      <div>
                        <span className="text-slate-400 block text-[11px] mb-1">Customer Tags</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCustomer.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Marketing & Newsletter Preferences */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs border-b border-slate-800 pb-2">
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>Marketing &amp; Subscriptions</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Promotional Opt-In</span>
                      <div className="mt-1">
                        {selectedCustomer.marketing_opt_in ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold">
                            Opted In (Email &amp; WhatsApp Announcements)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                            Opted Out
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Dispatch Frequency</span>
                      <span className="text-slate-200 capitalize font-mono mt-0.5 block">
                        {selectedCustomer.newsletter_frequency || "Weekly"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Order History & Lifetime Financials */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                    <span>Purchase History &amp; Orders</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
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
                        <thead className="bg-slate-900 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3">Order ID</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Total</th>
                            <th className="py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {customerOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-900/60">
                              <td className="py-2 px-3 font-mono text-white font-semibold">{ord.id}</td>
                              <td className="py-2 px-3 text-slate-400">
                                {ord.created_at
                                  ? new Date(ord.created_at).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "N/A"}
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-cyan-400 font-bold">
                                {formatRupiah(ord.total || 0)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(null);
                                    setActiveTab("orders");
                                  }}
                                  className="text-cyan-400 hover:text-cyan-300 text-xs font-medium inline-flex items-center gap-1"
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
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
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
                <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                  {selectedItemAnalytics.images && selectedItemAnalytics.images.length > 0 ? (
                    <Image
                      src={selectedItemAnalytics.images[0]}
                      alt={selectedItemAnalytics.name}
                      fill
                      className="object-cover"
                      sizes="56px"
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
                    <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      SKU: {selectedItemAnalytics.sku}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedItemAnalytics.category_slug}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                    {selectedItemAnalytics.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Item Performance Dossier • Weekly &amp; Lifetime Sales Telemetry
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemAnalytics(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="overflow-y-auto pr-1 space-y-6 flex-1 text-xs">
              {/* Top Highlights Banner: Stock Health & Run Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Current Warehouse Stock</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {selectedItemAnalytics.stock_on_hand} units available
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-950/70 border border-purple-800/60 flex items-center justify-center text-purple-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Weekly Run Rate</div>
                    <div className="text-sm font-bold text-purple-300 font-mono">
                      {selectedItemAnalytics.weeklyUnits} units/wk ({(selectedItemAnalytics.weeklyUnits / 7).toFixed(2)}/day)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Estimated Days of Supply</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      {selectedItemAnalytics.daysOfSupply === 999
                        ? "Ample Supply"
                        : `${selectedItemAnalytics.daysOfSupply} days remaining`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financials & Unit Economics Grid */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Unit Economics &amp; Gross Margins</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Retail Price */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[11px] text-slate-400">Retail Selling Price</span>
                    <div className="text-base font-bold text-white font-mono mt-1">
                      {formatRupiah(selectedItemAnalytics.retail_price)}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Active SRP</span>
                  </div>

                  {/* Estimated Cost (COGS) */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[11px] text-slate-400">Wholesale Cost (COGS)</span>
                    <div className="text-base font-bold text-slate-300 font-mono mt-1">
                      {formatRupiah(selectedItemAnalytics.cost_price)}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Distributor base</span>
                  </div>

                  {/* Gross Profit per Unit */}
                  <div className="bg-slate-950/80 border border-emerald-900/40 rounded-xl p-3.5">
                    <span className="text-[11px] text-slate-400">Profit Per Unit</span>
                    <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                      {formatRupiah(selectedItemAnalytics.unitGrossProfit)}
                    </div>
                    <span className="text-[10px] text-emerald-500/80 mt-1 block">Per-sale margin</span>
                  </div>

                  {/* Gross Margin % */}
                  <div className="bg-slate-950/80 border border-cyan-900/40 rounded-xl p-3.5">
                    <span className="text-[11px] text-slate-400">Gross Margin %</span>
                    <div className="text-base font-bold text-cyan-400 font-mono mt-1">
                      {selectedItemAnalytics.marginPct}%
                    </div>
                    <span className="text-[10px] text-cyan-500/80 mt-1 block">Return on sales</span>
                  </div>
                </div>
              </div>

              {/* Trailing Performance & Volume Aggregates */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sales Volume &amp; Profit Comparison</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* 7D Revenue */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[11px] text-slate-400">7D Gross Revenue</span>
                    <div className="text-base font-bold text-cyan-400 font-mono mt-1">
                      {formatRupiah(selectedItemAnalytics.weeklyRevenue)}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {selectedItemAnalytics.weeklyUnits} unit(s) in last 7 days
                    </span>
                  </div>

                  {/* 7D Gross Profit */}
                  <div className="bg-slate-950/80 border border-emerald-900/40 rounded-xl p-3.5">
                    <span className="text-[11px] text-slate-400">7D Gross Profit</span>
                    <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                      {formatRupiah(selectedItemAnalytics.weeklyGrossProfit)}
                    </div>
                    <span className="text-[10px] text-emerald-500/80 mt-1 block">Weekly net profit contribution</span>
                  </div>

                  {/* Lifetime Revenue */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[11px] text-slate-400">Lifetime Revenue</span>
                    <div className="text-base font-bold text-slate-200 font-mono mt-1">
                      {formatRupiah(selectedItemAnalytics.lifetimeRevenue)}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {selectedItemAnalytics.lifetimeUnits} unit(s) all-time
                    </span>
                  </div>

                  {/* Lifetime Gross Profit */}
                  <div className="bg-slate-950/80 border border-emerald-900/40 rounded-xl p-3.5">
                    <span className="text-[11px] text-slate-400">Lifetime Gross Profit</span>
                    <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                      {formatRupiah(selectedItemAnalytics.lifetimeGrossProfit)}
                    </div>
                    <span className="text-[10px] text-emerald-500/80 mt-1 block">Total historical profit</span>
                  </div>
                </div>
              </div>

              {/* 7-Day Day-by-Day Performance Table for this Item */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Trailing 7-Day Pacing</span>
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-left text-xs divide-y divide-slate-800">
                    <thead className="bg-slate-950 text-slate-400 font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Units Sold</th>
                        <th className="py-2.5 px-3">Daily Revenue</th>
                        <th className="py-2.5 px-3">Daily Gross Profit</th>
                        <th className="py-2.5 px-3">Pacing Visual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
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
                                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full"
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
              <div>
                <div className="flex items-center justify-between mb-2">
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
                  <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60 text-center text-slate-400">
                    <Package className="w-6 h-6 mx-auto mb-1.5 text-slate-600" />
                    <p className="font-medium text-slate-300 text-xs">No orders recorded for this item yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      New customer checkouts containing this product will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-56">
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
                      <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
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
                              <td className="py-2 px-3 font-sans">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-sans">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedItemAnalytics(null);
                                    setActiveTab("orders");
                                  }}
                                  className="text-cyan-400 hover:text-cyan-300 text-xs font-medium inline-flex items-center gap-1"
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Product Elements</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedItemAnalytics(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
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
