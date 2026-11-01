"use client";

import React, { useState, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Search,
  X,
  Plus,
  Package,
  Edit3,
  Trash2,
  Filter,
  Columns3,
  List,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/currency";

interface FluxProductsTabProps {
  products: any[];
  onOpenNewProductModal: () => void;
  onEditProduct: (product: any) => void;
  onDeleteProduct: (productId: string) => void;
}

type ColumnKey = "component" | "category" | "price" | "stock" | "variations" | "actions";

const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  component: 360,
  category: 200,
  price: 160,
  stock: 140,
  variations: 140,
  actions: 110,
};

export const CATEGORIES = [
  { slug: "all", name: "All Categories" },
  { slug: "cpu", name: "Processors (CPUs)" },
  { slug: "gpu", name: "Graphics Cards (GPUs)" },
  { slug: "motherboards", name: "Motherboards" },
  { slug: "cooling", name: "Cooling & Fans" },
  { slug: "ram", name: "Memory (RAM)" },
  { slug: "storage", name: "Solid State Storage (SSD)" },
  { slug: "cases", name: "PC Cases / Chassis" },
  { slug: "power-supplies", name: "Power Supplies (PSU)" },
];

export function getProductPrimaryImage(prod: any): string {
  if (Array.isArray(prod.images) && prod.images.length > 0 && typeof prod.images[0] === "string" && prod.images[0].trim()) {
    return prod.images[0];
  }
  if (typeof prod.image === "string" && prod.image.trim()) {
    return prod.image;
  }
  if (typeof prod.image_url === "string" && prod.image_url.trim()) {
    return prod.image_url;
  }
  if (typeof prod.images === "string" && prod.images.trim()) {
    return prod.images;
  }
  return "";
}

export function getProductCategoryLabel(prod: any): string {
  const raw = (
    prod.category_slug ||
    prod.category ||
    prod.pc_builder_slot ||
    prod.slot ||
    ""
  ).toLowerCase().trim();

  if (raw.includes("cpu") || raw.includes("processor")) return "Processors (CPUs)";
  if (raw.includes("gpu") || raw.includes("graphic")) return "Graphics Cards (GPUs)";
  if (raw.includes("motherboard") || raw.includes("mobo")) return "Motherboards";
  if (raw.includes("cool") || raw.includes("fan")) return "Cooling & Fans";
  if (raw.includes("ram") || raw.includes("memory")) return "Memory (RAM)";
  if (raw.includes("storage") || raw.includes("ssd") || raw.includes("hdd") || raw.includes("drive")) return "Solid State Storage (SSD)";
  if (raw.includes("case") || raw.includes("chassis")) return "PC Cases / Chassis";
  if (raw.includes("power") || raw.includes("psu") || raw.includes("supply")) return "Power Supplies (PSU)";

  if (raw) {
    return raw
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
  }

  return "Component";
}

export function FluxProductsTab({
  products,
  onOpenNewProductModal,
  onEditProduct,
  onDeleteProduct,
}: FluxProductsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Column Resizing State
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
  const [resizingCol, setResizingCol] = useState<ColumnKey | null>(null);
  const startPosRef = useRef<{ x: number; startWidth: number } | null>(null);

  const handleResizeStart = (col: ColumnKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(col);
    startPosRef.current = {
      x: e.clientX,
      startWidth: columnWidths[col],
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!startPosRef.current) return;
      const diff = moveEvent.clientX - startPosRef.current.x;
      const minWidths: Record<ColumnKey, number> = {
        component: 220,
        category: 140,
        price: 130,
        stock: 110,
        variations: 110,
        actions: 90,
      };
      const nextWidth = Math.max(minWidths[col], startPosRef.current.startWidth + diff);
      setColumnWidths((prev) => ({
        ...prev,
        [col]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      startPosRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleResetColumnWidth = (col: ColumnKey) => {
    setColumnWidths((prev) => ({
      ...prev,
      [col]: DEFAULT_COLUMN_WIDTHS[col],
    }));
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category filter
      if (categoryFilter !== "all") {
        const raw = (
          prod.category_slug ||
          prod.category ||
          prod.pc_builder_slot ||
          prod.slot ||
          ""
        ).toLowerCase().trim();

        let matches = false;
        switch (categoryFilter) {
          case "cpu":
            matches = raw.includes("cpu") || raw.includes("processor");
            break;
          case "gpu":
            matches = raw.includes("gpu") || raw.includes("graphic");
            break;
          case "motherboards":
          case "motherboard":
            matches = raw.includes("motherboard") || raw.includes("mobo");
            break;
          case "cooling":
          case "cooler":
            matches = raw.includes("cool") || raw.includes("fan");
            break;
          case "ram":
            matches = raw.includes("ram") || raw.includes("memory");
            break;
          case "storage":
            matches = raw.includes("storage") || raw.includes("ssd") || raw.includes("hdd") || raw.includes("drive");
            break;
          case "cases":
          case "case":
            matches = raw.includes("case") || raw.includes("chassis");
            break;
          case "power-supplies":
          case "psu":
            matches = raw.includes("power") || raw.includes("psu") || raw.includes("supply");
            break;
          default:
            matches = raw.includes(categoryFilter.toLowerCase());
            break;
        }
        if (!matches) return false;
      }

      // Stock status filter
      const stock =
        prod.stock_available !== undefined
          ? Number(prod.stock_available)
          : prod.stock_on_hand !== undefined
          ? Number(prod.stock_on_hand)
          : prod.stockCount !== undefined
          ? Number(prod.stockCount)
          : prod.stock !== undefined
          ? Number(prod.stock)
          : 0;

      if (stockFilter === "in-stock" && stock <= 0) return false;
      if (stockFilter === "low-stock" && (stock <= 0 || stock >= 5)) return false;
      if (stockFilter === "out-of-stock" && stock > 0) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const name = (prod.name || "").toLowerCase();
        const brand = (prod.brand || "").toLowerCase();
        const sku = (prod.sku || "").toLowerCase();
        const cat = getProductCategoryLabel(prod).toLowerCase();
        if (!name.includes(q) && !brand.includes(q) && !sku.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [products, categoryFilter, stockFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hardware by title, brand, SKU..."
              className="w-full min-h-[44px] pl-10 pr-9 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#37baf2] focus:border-[#37baf2] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right: Category, Stock Filter, View Switcher, and Add Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2] cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug} className="bg-[#12141A] text-white">
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2] cursor-pointer"
            >
              <option value="all" className="bg-[#12141A] text-white">
                All Stock Levels
              </option>
              <option value="in-stock" className="bg-[#12141A] text-white">
                In Stock (&gt; 0)
              </option>
              <option value="low-stock" className="bg-[#12141A] text-white">
                Low Stock (&lt; 5)
              </option>
              <option value="out-of-stock" className="bg-[#12141A] text-white">
                Out of Stock (0)
              </option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center ${
                  viewMode === "table"
                    ? "bg-[#37baf2] text-[#0A0B0E] font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Table View"
                aria-label="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center ${
                  viewMode === "grid"
                    ? "bg-[#37baf2] text-[#0A0B0E] font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Grid Cards View"
                aria-label="Grid Cards View"
              >
                <Columns3 className="w-4 h-4" />
              </button>
            </div>

            {/* Add Product Button */}
            <button
              type="button"
              onClick={onOpenNewProductModal}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] text-sm font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#37baf2]/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Display */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#12141A] rounded-2xl border border-white/10 p-12 text-center space-y-3 shadow-xl">
          <Package className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-base font-semibold text-zinc-300">
            No products found matching the criteria.
          </p>
          {(categoryFilter !== "all" || stockFilter !== "all" || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setStockFilter("all");
                setSearchTerm("");
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* Table View with Resizable Columns */
        <div className="bg-[#12141A] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-collapse table-fixed select-text"
              style={{
                minWidth: `${Object.values(columnWidths).reduce((a, b) => a + b, 0)}px`,
              }}
            >
              <colgroup>
                <col style={{ width: `${columnWidths.component}px` }} />
                <col style={{ width: `${columnWidths.category}px` }} />
                <col style={{ width: `${columnWidths.price}px` }} />
                <col style={{ width: `${columnWidths.stock}px` }} />
                <col style={{ width: `${columnWidths.variations}px` }} />
                <col style={{ width: `${columnWidths.actions}px` }} />
              </colgroup>
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="relative py-4 px-4 select-none">
                    <span>Hardware Component</span>
                    <div
                      onMouseDown={(e) => handleResizeStart("component", e)}
                      onDoubleClick={() => handleResetColumnWidth("component")}
                      className={`absolute top-0 right-0 h-full w-3.5 cursor-col-resize select-none touch-none flex items-center justify-center group/resizer z-20 ${
                        resizingCol === "component" ? "bg-[#37baf2]/20" : "hover:bg-white/10"
                      }`}
                      title="Drag to resize column (double-click to reset)"
                      aria-label="Resize Hardware Component column"
                    >
                      <div
                        className={`w-[2px] h-4 rounded-full transition-colors ${
                          resizingCol === "component"
                            ? "bg-[#37baf2]"
                            : "bg-white/20 group-hover/resizer:bg-[#37baf2]"
                        }`}
                      />
                    </div>
                  </th>

                  <th className="relative py-4 px-4 select-none">
                    <span>Category</span>
                    <div
                      onMouseDown={(e) => handleResizeStart("category", e)}
                      onDoubleClick={() => handleResetColumnWidth("category")}
                      className={`absolute top-0 right-0 h-full w-3.5 cursor-col-resize select-none touch-none flex items-center justify-center group/resizer z-20 ${
                        resizingCol === "category" ? "bg-[#37baf2]/20" : "hover:bg-white/10"
                      }`}
                      title="Drag to resize column (double-click to reset)"
                      aria-label="Resize Category column"
                    >
                      <div
                        className={`w-[2px] h-4 rounded-full transition-colors ${
                          resizingCol === "category"
                            ? "bg-[#37baf2]"
                            : "bg-white/20 group-hover/resizer:bg-[#37baf2]"
                        }`}
                      />
                    </div>
                  </th>

                  <th className="relative py-4 px-4 text-right select-none">
                    <span>Price</span>
                    <div
                      onMouseDown={(e) => handleResizeStart("price", e)}
                      onDoubleClick={() => handleResetColumnWidth("price")}
                      className={`absolute top-0 right-0 h-full w-3.5 cursor-col-resize select-none touch-none flex items-center justify-center group/resizer z-20 ${
                        resizingCol === "price" ? "bg-[#37baf2]/20" : "hover:bg-white/10"
                      }`}
                      title="Drag to resize column (double-click to reset)"
                      aria-label="Resize Price column"
                    >
                      <div
                        className={`w-[2px] h-4 rounded-full transition-colors ${
                          resizingCol === "price"
                            ? "bg-[#37baf2]"
                            : "bg-white/20 group-hover/resizer:bg-[#37baf2]"
                        }`}
                      />
                    </div>
                  </th>

                  <th className="relative py-4 px-4 text-center select-none">
                    <span>Stock</span>
                    <div
                      onMouseDown={(e) => handleResizeStart("stock", e)}
                      onDoubleClick={() => handleResetColumnWidth("stock")}
                      className={`absolute top-0 right-0 h-full w-3.5 cursor-col-resize select-none touch-none flex items-center justify-center group/resizer z-20 ${
                        resizingCol === "stock" ? "bg-[#37baf2]/20" : "hover:bg-white/10"
                      }`}
                      title="Drag to resize column (double-click to reset)"
                      aria-label="Resize Stock column"
                    >
                      <div
                        className={`w-[2px] h-4 rounded-full transition-colors ${
                          resizingCol === "stock"
                            ? "bg-[#37baf2]"
                            : "bg-white/20 group-hover/resizer:bg-[#37baf2]"
                        }`}
                      />
                    </div>
                  </th>

                  <th className="relative py-4 px-4 text-center select-none">
                    <span>Variations</span>
                    <div
                      onMouseDown={(e) => handleResizeStart("variations", e)}
                      onDoubleClick={() => handleResetColumnWidth("variations")}
                      className={`absolute top-0 right-0 h-full w-3.5 cursor-col-resize select-none touch-none flex items-center justify-center group/resizer z-20 ${
                        resizingCol === "variations" ? "bg-[#37baf2]/20" : "hover:bg-white/10"
                      }`}
                      title="Drag to resize column (double-click to reset)"
                      aria-label="Resize Variations column"
                    >
                      <div
                        className={`w-[2px] h-4 rounded-full transition-colors ${
                          resizingCol === "variations"
                            ? "bg-[#37baf2]"
                            : "bg-white/20 group-hover/resizer:bg-[#37baf2]"
                        }`}
                      />
                    </div>
                  </th>

                  <th className="relative py-4 px-4 text-right select-none">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-sans">
                {filteredProducts.map((prod) => {
                  const stock =
                    prod.stock_available !== undefined
                      ? Number(prod.stock_available)
                      : prod.stock_on_hand !== undefined
                      ? Number(prod.stock_on_hand)
                      : prod.stockCount !== undefined
                      ? Number(prod.stockCount)
                      : prod.stock !== undefined
                      ? Number(prod.stock)
                      : 0;
                  const price = Number(prod.retail_price ?? prod.price) || 0;
                  const salePrice = Number(prod.sale_price ?? prod.salePrice) || 0;
                  const hasDiscount = Boolean(salePrice && salePrice < price);
                  const variationsCount = prod.variations?.length || 0;
                  const productImage = getProductPrimaryImage(prod);
                  const categoryLabel = getProductCategoryLabel(prod);

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Hardware Component: Photo, Title, Brand, SKU */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden shrink-0 flex items-center justify-center">
                            {productImage ? (
                              <Image
                                src={productImage}
                                alt={prod.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-zinc-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white text-sm sm:text-base truncate leading-snug">
                              {prod.name}
                            </div>
                            <div className="text-xs sm:text-sm text-zinc-400 flex items-center gap-2 mt-0.5 font-sans">
                              <span className="font-medium text-zinc-300">{prod.brand || "Incus"}</span>
                              {prod.sku && (
                                <>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-zinc-400 font-sans">{prod.sku}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category: Clean text without container */}
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-zinc-300">
                          {categoryLabel}
                        </span>
                      </td>

                      {/* Price: Legible text, discount strikethrough */}
                      <td className="py-4 px-4 text-right">
                        {hasDiscount ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-white text-sm sm:text-base">
                              {formatRupiah(salePrice)}
                            </div>
                            <div className="text-xs text-zinc-500 line-through">
                              {formatRupiah(price)}
                            </div>
                          </div>
                        ) : (
                          <div className="font-bold text-white text-sm sm:text-base">
                            {formatRupiah(price)}
                          </div>
                        )}
                      </td>

                      {/* Stock: Clean text without container */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              stock > 5
                                ? "bg-emerald-400"
                                : stock > 0
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium text-zinc-200">
                            {stock} {stock === 1 ? "unit" : "units"}
                          </span>
                        </div>
                      </td>

                      {/* Variations Count */}
                      <td className="py-4 px-4 text-center">
                        {variationsCount > 0 ? (
                          <span className="text-sm font-semibold text-[#37baf2]">
                            {variationsCount} {variationsCount === 1 ? "option" : "options"}
                          </span>
                        ) : (
                          <span className="text-sm text-zinc-500">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditProduct(prod)}
                            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors border border-white/5"
                            title="Edit Product"
                            aria-label={`Edit ${prod.name}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteProduct(prod.id)}
                            className="p-2.5 rounded-xl text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors border border-white/5"
                            title="Delete Product"
                            aria-label={`Delete ${prod.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((prod) => {
            const stock =
              prod.stock_available !== undefined
                ? Number(prod.stock_available)
                : prod.stock_on_hand !== undefined
                ? Number(prod.stock_on_hand)
                : prod.stockCount !== undefined
                ? Number(prod.stockCount)
                : prod.stock !== undefined
                ? Number(prod.stock)
                : 0;
            const price = Number(prod.retail_price ?? prod.price) || 0;
            const salePrice = Number(prod.sale_price ?? prod.salePrice) || 0;
            const hasDiscount = Boolean(salePrice && salePrice < price);
            const productImage = getProductPrimaryImage(prod);
            const categoryLabel = getProductCategoryLabel(prod);

            return (
              <div
                key={prod.id}
                className="bg-[#12141A] rounded-2xl border border-white/10 p-5 flex flex-col justify-between shadow-xl group hover:border-[#37baf2]/40 transition-colors"
              >
                <div>
                  <div className="relative w-full aspect-square rounded-xl bg-white/5 border border-white/5 overflow-hidden mb-3.5 flex items-center justify-center">
                    {productImage ? (
                      <Image
                        src={productImage}
                        alt={prod.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 25vw"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-zinc-500" />
                    )}

                    {hasDiscount && (
                      <div className="absolute top-2 left-2 pointer-events-none">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-600 text-white shadow-xs">
                          -{Math.round(((price - salePrice) / price) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-medium text-zinc-400">
                    {prod.brand || "Incus"} • {categoryLabel}
                  </div>
                  <h3 className="font-semibold text-white text-sm sm:text-base line-clamp-2 mt-1 leading-snug">
                    {prod.name}
                  </h3>
                  {prod.sku && (
                    <div className="text-xs text-zinc-500 mt-1 font-sans">
                      SKU: {prod.sku}
                    </div>
                  )}
                </div>

                <div className="pt-3.5 border-t border-white/5 mt-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-base">
                      {formatRupiah(hasDiscount ? salePrice : price)}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Stock: {stock} units
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditProduct(prod)}
                      className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/5"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(prod.id)}
                      className="p-2 rounded-xl text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/5"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default FluxProductsTab;
