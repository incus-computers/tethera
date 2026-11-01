"use client";

import React, { useState } from "react";
import { ProductVariation } from "../../lib/db/types";
import { formatRupiah } from "../../lib/utils/currency";
import { Plus, Trash2, Edit2, Check, X, Layers, AlertCircle, Tag, Image as ImageIcon } from "lucide-react";

interface ProductVariationsManagerProps {
  productId?: string;
  variations: ProductVariation[];
  onChange: (variations: ProductVariation[]) => void;
  parentImages?: string[];
}

export function ProductVariationsManager({
  productId = "prod-temp",
  variations = [],
  onChange,
  parentImages = [],
}: ProductVariationsManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editVarId, setEditVarId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formSalePrice, setFormSalePrice] = useState<number | null>(null);
  const [formStock, setFormStock] = useState<number>(10);
  const [formAttributes, setFormAttributes] = useState<{ key: string; value: string }[]>([
    { key: "Colour", value: "" },
  ]);
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setEditVarId(null);
    setFormName("");
    setFormSku("");
    setFormPrice(0);
    setFormSalePrice(null);
    setFormStock(10);
    setFormAttributes([{ key: "Colour", value: "" }]);
    setFormImage(null);
    setFormError(null);
    setIsEditing(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (v: ProductVariation) => {
    setEditVarId(v.id);
    setFormName(v.name);
    setFormSku(v.sku || "");
    setFormPrice(v.price);
    setFormSalePrice(v.salePrice ?? null);
    setFormStock(v.stockCount);
    setFormImage(v.image || null);

    const attrs = Object.entries(v.attributes || {}).map(([key, value]) => ({
      key,
      value: String(value),
    }));
    setFormAttributes(attrs.length > 0 ? attrs : [{ key: "Colour", value: "" }]);
    setFormError(null);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this product variation?")) {
      const updated = variations.filter((v) => v.id !== id);
      onChange(updated);
      if (editVarId === id) resetForm();
    }
  };

  const handleAddAttributeRow = () => {
    setFormAttributes((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleRemoveAttributeRow = (index: number) => {
    setFormAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (index: number, field: "key" | "value", val: string) => {
    setFormAttributes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleApplyPresetKey = (index: number, presetKey: string) => {
    setFormAttributes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], key: presetKey };
      return copy;
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError("Variation name is required.");
      return;
    }
    if (formPrice <= 0) {
      setFormError("Price must be greater than 0.");
      return;
    }

    // Build attributes object
    const attributesObj: Record<string, string> = {};
    for (const attr of formAttributes) {
      const k = attr.key.trim();
      const v = attr.value.trim();
      if (k && v) {
        attributesObj[k] = v;
      }
    }

    if (Object.keys(attributesObj).length === 0) {
      setFormError("Please configure at least one attribute (e.g. Colour or Capacity).");
      return;
    }

    if (editVarId) {
      // Update existing
      const updated = variations.map((v) => {
        if (v.id === editVarId) {
          return {
            ...v,
            name: trimmedName,
            sku: formSku.trim() || undefined,
            price: Number(formPrice),
            salePrice: formSalePrice && formSalePrice > 0 ? Number(formSalePrice) : undefined,
            stockCount: Number(formStock),
            attributes: attributesObj,
            image: formImage || undefined,
          };
        }
        return v;
      });
      onChange(updated);
    } else {
      // Create new
      const newId = `${productId}-var-${Date.now()}`;
      const newVar: ProductVariation = {
        id: newId,
        productId,
        name: trimmedName,
        sku: formSku.trim() || undefined,
        price: Number(formPrice),
        salePrice: formSalePrice && formSalePrice > 0 ? Number(formSalePrice) : undefined,
        stockCount: Number(formStock),
        attributes: attributesObj,
        image: formImage || undefined,
      };
      onChange([...variations, newVar]);
    }

    resetForm();
  };

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-[#0A0B0E] p-5 sm:p-6 text-xs font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 font-semibold text-zinc-200">
            <Layers className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-200">Product Variations</span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400">
              {variations.length} {variations.length === 1 ? "option" : "options"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Configure multi-dimensional choices like Colour, RAM size, or Capacity with individual pricing and stock.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="min-h-[44px] px-4 py-2 bg-white/10 hover:bg-white/15 text-zinc-100 border border-white/15 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Variation</span>
          </button>
        )}
      </div>

      {/* Form Drawer (Add or Edit) */}
      {isEditing && (
        <form
          onSubmit={handleSaveForm}
          className="p-5 sm:p-6 bg-[#12141A] rounded-2xl border border-white/10 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Tag className="w-4 h-4 text-zinc-400" />
              <span>{editVarId ? "Edit Product Variation" : "Add New Variation"}</span>
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Cancel editing variation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Variation Name
              </label>
              <input
                type="text"
                placeholder="e.g. 32GB (2x16GB) White"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-100 min-h-[44px] focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Variation SKU (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. CMK32GX4M2E3200C16W"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-100 min-h-[44px] focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Retail Price (IDR)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 1490000"
                value={formPrice || ""}
                onChange={(e) => setFormPrice(Number(e.target.value))}
                className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-100 min-h-[44px] focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Sale Price (Optional IDR)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Leave blank if not on sale"
                value={formSalePrice ?? ""}
                onChange={(e) => setFormSalePrice(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-100 min-h-[44px] focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Inventory Stock (Units)
              </label>
              <input
                type="number"
                min="0"
                value={formStock}
                onChange={(e) => setFormStock(Number(e.target.value))}
                className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-100 min-h-[44px] focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
          </div>

          {/* Dynamic Attributes (Colour, Capacity, Speed, etc.) */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400">
                  Variation Attributes (Dimensions)
                </label>
                <span className="text-xs text-zinc-500">
                  These drive customer selection options (e.g. Colour: White, Capacity: 32GB).
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddAttributeRow}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-white/15 transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Dimension</span>
              </button>
            </div>

            <div className="space-y-3">
              {formAttributes.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-1/3">
                    <input
                      type="text"
                      placeholder="Dimension (e.g. Colour)"
                      value={attr.key}
                      onChange={(e) => handleAttributeChange(idx, "key", e.target.value)}
                      className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-100 min-h-[44px] focus:outline-none focus:border-zinc-400 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Value (e.g. White or 32GB)"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(idx, "value", e.target.value)}
                      className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-100 min-h-[44px] focus:outline-none focus:border-zinc-400 transition-colors"
                    />
                  </div>
                  {formAttributes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttributeRow(idx)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#0A0B0E] border border-white/10 text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Remove attribute"
                      aria-label="Remove attribute row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Suggestions for Dimension Keys */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-zinc-400 font-medium">Quick Dimensions:</span>
              {["Colour", "Capacity", "Speed", "Size"].map((suggest) => (
                <button
                  key={suggest}
                  type="button"
                  onClick={() => handleApplyPresetKey(0, suggest)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                >
                  +{suggest}
                </button>
              ))}
            </div>
          </div>

          {/* Storefront Tile Image Selector */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div>
              <label className="block text-xs font-semibold text-zinc-400">
                Storefront Tile Featured Image
              </label>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select which photo from the product gallery represents this variation on its catalog tile.
              </p>
            </div>

            {parentImages && parentImages.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Default Option */}
                <button
                  type="button"
                  onClick={() => setFormImage(null)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${
                    !formImage
                      ? "bg-white text-zinc-950 border-white font-bold"
                      : "bg-[#0A0B0E] border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                  }`}
                  aria-label="Use default product photo for this variation"
                >
                  {!formImage && <Check className="w-4 h-4 text-zinc-950" />}
                  <span>Default Primary Photo</span>
                </button>

                {/* Parent Gallery Images */}
                {parentImages.map((imgUrl, idx) => {
                  const isSelected = formImage === imgUrl;
                  return (
                    <button
                      key={imgUrl}
                      type="button"
                      onClick={() => setFormImage(imgUrl)}
                      className={`relative min-h-[44px] min-w-[44px] w-12 h-12 rounded-xl overflow-hidden border transition-all flex items-center justify-center bg-[#0A0B0E] ${
                        isSelected
                          ? "ring-2 ring-white border-white opacity-100 shadow-md"
                          : "border-white/10 opacity-60 hover:opacity-100 hover:border-white/25"
                      }`}
                      title={`Select photo ${idx + 1}`}
                      aria-label={`Select photo ${idx + 1} for this variation`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-white text-zinc-950 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#0A0B0E] border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>
                  No product gallery images uploaded yet. This variation tile will use the product primary photo.
                </span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{editVarId ? "Update Variation" : "Save Variation"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Variations Table / List */}
      {variations.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center space-y-1.5 bg-[#12141A]">
          <p className="text-xs font-semibold text-zinc-300">No product variations configured</p>
          <p className="text-xs text-zinc-500">
            This hardware item currently sells as a single standard product. Click &ldquo;Add Variation&rdquo; to define options like colours or capacities.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#12141A]">
          <table className="w-full text-left text-xs divide-y divide-white/10">
            <thead className="text-zinc-400 uppercase text-[10px] font-semibold border-b border-white/10 bg-white/5">
              <tr>
                <th className="py-3 px-4">Variation Name</th>
                <th className="py-3 px-4">Attributes</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {variations.map((v) => (
                <tr key={v.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-semibold text-zinc-100">
                    <div className="flex items-center gap-3">
                      {v.image ? (
                        <img
                          src={v.image}
                          alt={v.name}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 bg-[#0A0B0E]"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg bg-[#0A0B0E] border border-white/10 flex items-center justify-center text-zinc-500 shrink-0"
                          title="Uses primary product image"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div className="text-zinc-100 font-semibold">{v.name}</div>
                        {v.sku && <div className="text-xs text-zinc-500 mt-0.5">{v.sku}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {Object.entries(v.attributes || {}).map(([key, val]) => (
                        <span key={key} className="text-zinc-300">
                          <span className="text-zinc-500">{key}:</span> {val}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-zinc-100">{formatRupiah(v.price)}</div>
                    {v.salePrice && v.salePrice < v.price && (
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Sale: {formatRupiah(v.salePrice)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        v.stockCount > 0 ? "text-zinc-200" : "text-rose-400"
                      }`}
                    >
                      {v.stockCount} {v.stockCount === 1 ? "unit" : "units"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(v)}
                        className="min-h-[44px] min-w-[44px] p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center"
                        title="Edit variation"
                        aria-label={`Edit ${v.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v.id)}
                        className="min-h-[44px] min-w-[44px] p-2 text-zinc-400 hover:text-rose-400 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center"
                        title="Delete variation"
                        aria-label={`Delete ${v.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
