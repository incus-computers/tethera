"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Layers,
  Sparkles,
  Cpu,
  Tag,
  Plus,
  Trash2,
  Edit3,
  Check,
  RefreshCw,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Eye,
  EyeOff,
  ExternalLink,
  Store,
  FileText,
  Upload,
} from "lucide-react";
import {
  HomepageModuleItem,
  CustomPcHeroConfig,
} from "@/lib/data/homepageConfig";
import { DynamicBannerSlide, Promotion } from "@/lib/db/types";
import { PREBUILT_SYSTEMS } from "@/lib/data/mockHardware";
import { formatRupiah } from "@/lib/utils/currency";

interface FluxPromotionsTabProps {
  banners: DynamicBannerSlide[];
  homepageModules: HomepageModuleItem[];
  setHomepageModules: React.Dispatch<React.SetStateAction<HomepageModuleItem[]>>;
  customPcHeroConfig: CustomPcHeroConfig;
  setCustomPcHeroConfig: React.Dispatch<React.SetStateAction<CustomPcHeroConfig>>;
  featuredPrebuiltIds: string[];
  setFeaturedPrebuiltIds: React.Dispatch<React.SetStateAction<string[]>>;
  promotions: Promotion[];
  handleResetHomepageModules: () => void;
  handleSaveHomepageModules: () => void;
  savingModules: boolean;
  handleSaveCustomPcHero: () => void;
  savingCustomPcHero: boolean;
  handleResetFeaturedPrebuilts: () => void;
  handleSaveFeaturedPrebuilts: () => void;
  savingFeaturedPrebuilts: boolean;
  handleMoveFeaturedPrebuilt: (index: number, direction: "up" | "down") => void;
  handleToggleFeaturedPrebuilt: (id: string) => void;
  onOpenNewBannerModal: () => void;
  onDeleteBanner: (bannerId: string) => void;
  onToggleBannerActive: (bannerId: string, currentActive: boolean) => void;
  onOpenNewPromoModal: () => void;
}

export function FluxPromotionsTab({
  banners,
  homepageModules,
  setHomepageModules,
  customPcHeroConfig,
  setCustomPcHeroConfig,
  featuredPrebuiltIds,
  promotions,
  handleResetHomepageModules,
  handleSaveHomepageModules,
  savingModules,
  handleSaveCustomPcHero,
  savingCustomPcHero,
  handleResetFeaturedPrebuilts,
  handleSaveFeaturedPrebuilts,
  savingFeaturedPrebuilts,
  handleMoveFeaturedPrebuilt,
  handleToggleFeaturedPrebuilt,
  onOpenNewBannerModal,
  onDeleteBanner,
  onToggleBannerActive,
  onOpenNewPromoModal,
}: FluxPromotionsTabProps) {
  const [subTab, setSubTab] = useState<"banners" | "layout" | "hero" | "prebuilts" | "coupons">("banners");

  const handleToggleModule = (id: string) => {
    setHomepageModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleMoveModuleOrder = (index: number, direction: "up" | "down") => {
    setHomepageModules((prev) => {
      const copy = [...prev];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sub Navigation Bar */}
      <div className="bg-[#12141A] rounded-2xl border border-white/10 p-4 shadow-xl flex flex-wrap items-center gap-2">
        {[
          { id: "banners", label: "Hero Banners", icon: Sparkles, count: banners.length },
          { id: "layout", label: "Storefront Modules", icon: Layers, count: homepageModules.length },
          { id: "hero", label: "Custom PC Hero", icon: Store },
          { id: "prebuilts", label: "Featured Prebuilts", icon: Cpu, count: featuredPrebuiltIds.length },
          { id: "coupons", label: "Discount Codes", icon: Tag, count: promotions.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as any)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all ${
                isActive
                  ? "bg-[#37baf2] text-[#0A0B0E] font-bold shadow-md shadow-[#37baf2]/20"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-[#0A0B0E]/20 text-[#0A0B0E]"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. HERO BANNERS */}
      {subTab === "banners" && (
        <div className="space-y-4">
          <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Storefront Hero Banners
              </h2>
              <p className="text-xs text-slate-400">
                Active promotional slides displayed on the homepage marquee
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenNewBannerModal}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#37baf2]/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Banner Slide</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="bg-[#12141A] rounded-2xl border border-white/10 p-4 shadow-xl flex flex-col justify-between group hover:border-[#37baf2]/30 transition-colors"
              >
                <div>
                  <div className="relative h-44 rounded-xl overflow-hidden bg-slate-900 mb-3 border border-white/5">
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                        No image assigned
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#37baf2] text-[#0A0B0E] uppercase tracking-wider">
                        {banner.badge || "Promotion"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          banner.is_active
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        {banner.is_active ? "Active" : "Hidden"}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-white text-sm line-clamp-1">
                    {banner.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {banner.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    CTA: {banner.cta_text || "Explore"} &rarr; {banner.cta_link}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleBannerActive(banner.id, banner.is_active)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 min-h-[38px] min-w-[38px] flex items-center justify-center"
                      title={banner.is_active ? "Hide Banner" : "Publish Banner"}
                    >
                      {banner.is_active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBanner(banner.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 min-h-[38px] min-w-[38px] flex items-center justify-center"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. STOREFRONT MODULES ORDER */}
      {subTab === "layout" && (
        <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Homepage Section Modules Layout
              </h2>
              <p className="text-xs text-slate-400">
                Arrange the visual order and visibility of sections on the storefront homepage
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetHomepageModules}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleSaveHomepageModules}
                disabled={savingModules}
                className="min-h-[44px] px-4 py-1.5 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#37baf2]/20 transition-all disabled:opacity-50"
              >
                {savingModules ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{savingModules ? "Saving..." : "Save Module Order"}</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/5 rounded-xl border border-white/5 overflow-hidden">
            {homepageModules.map((mod, idx) => (
              <div
                key={mod.id}
                className="p-3.5 flex items-center justify-between gap-3 bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-[#37baf2]">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm">
                      {mod.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Module Key: {mod.id}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleModule(mod.id)}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                      mod.enabled
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                    }`}
                  >
                    {mod.enabled ? "Visible" : "Hidden"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveModuleOrder(idx, "up")}
                    disabled={idx === 0}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 min-h-[38px] min-w-[38px] flex items-center justify-center disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveModuleOrder(idx, "down")}
                    disabled={idx === homepageModules.length - 1}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 min-h-[38px] min-w-[38px] flex items-center justify-center disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. CUSTOM PC HERO CONFIGURATION */}
      {subTab === "hero" && (
        <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Custom PC Builder Hero Banner
              </h2>
              <p className="text-xs text-slate-400">
                Configure headline copy, value guarantees, and imagery for the builder showcase
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveCustomPcHero}
              disabled={savingCustomPcHero}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#37baf2]/20 transition-all disabled:opacity-50"
            >
              {savingCustomPcHero ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{savingCustomPcHero ? "Saving Banner..." : "Save Custom PC Banner"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Main Headline
              </label>
              <input
                type="text"
                value={customPcHeroConfig.title}
                onChange={(e) =>
                  setCustomPcHeroConfig((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Highlight Label
              </label>
              <input
                type="text"
                value={customPcHeroConfig.badgeHighlight}
                onChange={(e) =>
                  setCustomPcHeroConfig((prev) => ({ ...prev, badgeHighlight: e.target.value }))
                }
                className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Description Paragraph
              </label>
              <textarea
                rows={2}
                value={customPcHeroConfig.description}
                onChange={(e) =>
                  setCustomPcHeroConfig((prev) => ({ ...prev, description: e.target.value }))
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary Button Text
              </label>
              <input
                type="text"
                value={customPcHeroConfig.primaryCtaText}
                onChange={(e) =>
                  setCustomPcHeroConfig((prev) => ({ ...prev, primaryCtaText: e.target.value }))
                }
                className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary Button Link
              </label>
              <input
                type="text"
                value={customPcHeroConfig.primaryCtaLink}
                onChange={(e) =>
                  setCustomPcHeroConfig((prev) => ({ ...prev, primaryCtaLink: e.target.value }))
                }
                className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#37baf2]"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. FEATURED PREBUILT SYSTEMS SHOWCASE */}
      {subTab === "prebuilts" && (
        <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Featured Prebuilt Systems (Homepage Showcase)
              </h2>
              <p className="text-xs text-slate-400">
                Select and rank 4 prebuilts for the Ready to Go PCs storefront row
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFeaturedPrebuilts}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleSaveFeaturedPrebuilts}
                disabled={savingFeaturedPrebuilts}
                className="min-h-[44px] px-4 py-1.5 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#37baf2]/20 transition-all disabled:opacity-50"
              >
                {savingFeaturedPrebuilts ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>
                  {savingFeaturedPrebuilts
                    ? "Saving Featured Systems..."
                    : "Save Featured Systems"}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((slotIndex) => {
              const rigId = featuredPrebuiltIds[slotIndex];
              const rig = PREBUILT_SYSTEMS.find((p) => p.id === rigId);

              return (
                <div
                  key={`slot-${slotIndex}`}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                      <span>Slot #{slotIndex + 1}</span>
                      <span className="text-[#37baf2]">
                        {slotIndex < 2 ? "All Viewports" : "Desktop Only"}
                      </span>
                    </div>

                    {rig ? (
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm line-clamp-1">
                          {rig.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatRupiah((rig as any).sale_price || rig.price)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {rig.cpu} • {rig.gpu}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 py-4 text-center">
                        Empty Slot
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      ID: {rigId || "none"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveFeaturedPrebuilt(slotIndex, "up")}
                        disabled={slotIndex === 0}
                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                        title="Move Left"
                      >
                        <ArrowUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveFeaturedPrebuilt(slotIndex, "down")}
                        disabled={slotIndex === 3}
                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                        title="Move Right"
                      >
                        <ArrowDown className="w-3.5 h-3.5 rotate-[-90deg]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. DISCOUNT COUPONS */}
      {subTab === "coupons" && (
        <div className="bg-[#12141A] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Discount Promotions &amp; Coupons
              </h2>
              <p className="text-xs text-slate-400">
                Manage promotional coupon codes, percentage deductions, and active date windows
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenNewPromoModal}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] text-[#0A0B0E] text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#37baf2]/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Coupon</span>
            </button>
          </div>

          {promotions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No promotions registered currently.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#37baf2]">
                      {p.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="font-semibold text-white">{p.title || p.description}</div>
                  <div className="text-slate-400 text-[11px]">
                    Discount: {p.discount_type === "percentage" ? `${p.discount_value}%` : formatRupiah(p.discount_value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default FluxPromotionsTab;
