"use client";

import React, { useState } from "react";
import { X, Search, Check, AlertCircle, Plus, ShieldCheck, Filter, Eye, EyeOff } from "lucide-react";
import { MOCK_COMPONENTS, ComponentItem } from "../../lib/data/mockHardware";
import { BuilderSlotKey, useBuilderStore } from "../../lib/store/useBuilderStore";
import { formatRupiah } from "../../lib/utils/currency";

interface ComponentSelectModalProps {
  slot: BuilderSlotKey | null;
  onClose: () => void;
}

export function ComponentSelectModal({ slot, onClose }: ComponentSelectModalProps) {
  const [search, setSearch] = useState("");
  const [showIncompatible, setShowIncompatible] = useState(false);
  const { slots, selectSlotItem } = useBuilderStore();

  if (!slot) return null;

  // Filter items for this slot
  const candidateItems = MOCK_COMPONENTS.filter((item) => item.slot === slot);

  // Active compatibility constraints description
  let activeConstraint: { title: string; detail: string } | null = null;

  if (slot === "motherboard" && slots.cpu) {
    activeConstraint = {
      title: `Socket ${slots.cpu.specs.socket} Only`,
      detail: `Filtered to match your chosen processor (${slots.cpu.name})`,
    };
  } else if (slot === "cpu" && slots.motherboard) {
    activeConstraint = {
      title: `Socket ${slots.motherboard.specs.socket} Only`,
      detail: `Filtered to match your chosen motherboard (${slots.motherboard.name})`,
    };
  } else if (slot === "ram" && slots.motherboard) {
    activeConstraint = {
      title: `${slots.motherboard.specs.ramType} Memory Only`,
      detail: `Filtered to match your motherboard's memory architecture`,
    };
  } else if (slot === "gpu" && slots.case) {
    activeConstraint = {
      title: `Max Length ≤ ${slots.case.specs.maxGpuLengthMm}mm`,
      detail: `Filtered to fit inside your chosen chassis (${slots.case.name})`,
    };
  } else if (slot === "case" && slots.gpu) {
    activeConstraint = {
      title: `Chassis Clearance ≥ ${slots.gpu.specs.lengthMm}mm`,
      detail: `Filtered to accommodate your graphics card length`,
    };
  } else if (slot === "case" && slots.cooler && (slots.cooler.specs.radiatorSizeMm || 0) > 0) {
    activeConstraint = {
      title: `Radiator Support ≥ ${slots.cooler.specs.radiatorSizeMm}mm`,
      detail: `Filtered to accommodate your liquid AIO cooler`,
    };
  }

  // Strict compatibility check against currently selected parts in other slots
  const getCompatibilityCheck = (item: ComponentItem): { compatible: boolean; reason?: string } => {
    // 1. Motherboard compatibility with selected CPU
    if (slot === "motherboard" && slots.cpu) {
      if (item.specs.socket !== slots.cpu.specs.socket) {
        return {
          compatible: false,
          reason: `Requires ${slots.cpu.specs.socket} socket (Selected CPU: ${slots.cpu.name})`,
        };
      }
    }

    // 2. CPU compatibility with selected Motherboard
    if (slot === "cpu" && slots.motherboard) {
      if (item.specs.socket !== slots.motherboard.specs.socket) {
        return {
          compatible: false,
          reason: `Requires ${slots.motherboard.specs.socket} socket (Selected Motherboard: ${slots.motherboard.name})`,
        };
      }
    }

    // 3. RAM compatibility with selected Motherboard
    if (slot === "ram" && slots.motherboard) {
      if (item.specs.ramType !== slots.motherboard.specs.ramType) {
        return {
          compatible: false,
          reason: `Motherboard requires ${slots.motherboard.specs.ramType} (Selected: ${slots.motherboard.name})`,
        };
      }
    }

    // 4. Motherboard compatibility with selected RAM
    if (slot === "motherboard" && slots.ram) {
      if (item.specs.ramType !== slots.ram.specs.ramType) {
        return {
          compatible: false,
          reason: `RAM requires ${slots.ram.specs.ramType} (Selected RAM: ${slots.ram.name})`,
        };
      }
    }

    // 5. Case compatibility with selected GPU length
    if (slot === "gpu" && slots.case) {
      const gpuLength = item.specs.lengthMm || 0;
      const maxGpu = slots.case.specs.maxGpuLengthMm || 400;
      if (gpuLength > maxGpu) {
        return {
          compatible: false,
          reason: `GPU length (${gpuLength}mm) exceeds case max clearance (${maxGpu}mm)`,
        };
      }
    }

    // 6. Case compatibility when picking case for existing GPU
    if (slot === "case" && slots.gpu) {
      const gpuLength = slots.gpu.specs.lengthMm || 0;
      const maxGpu = item.specs.maxGpuLengthMm || 400;
      if (gpuLength > maxGpu) {
        return {
          compatible: false,
          reason: `Case max clearance (${maxGpu}mm) cannot fit your GPU (${gpuLength}mm)`,
        };
      }
    }

    // 7. Case compatibility with selected cooler radiator
    if (slot === "case" && slots.cooler && (slots.cooler.specs.radiatorSizeMm || 0) > 0) {
      const radSize = slots.cooler.specs.radiatorSizeMm || 0;
      const caseRad = item.specs.radiatorSizeMm || 0;
      if (radSize > caseRad) {
        return {
          compatible: false,
          reason: `Case does not support ${radSize}mm AIO cooler radiator`,
        };
      }
    }

    return { compatible: true };
  };

  // Search filter
  const searchMatched = candidateItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.brand.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase())
  );

  // Separate compatible vs incompatible
  const compatibleItems = searchMatched.filter((item) => getCompatibilityCheck(item).compatible);
  const incompatibleItems = searchMatched.filter((item) => !getCompatibilityCheck(item).compatible);

  // Determine which items to display
  const itemsToDisplay = showIncompatible ? searchMatched : compatibleItems;

  const slotTitles: Record<BuilderSlotKey, string> = {
    cpu: "Select Processor (CPU)",
    motherboard: "Select Motherboard",
    ram: "Select Memory (RAM)",
    gpu: "Select Graphics Card (GPU)",
    cooler: "Select CPU Cooling",
    storage_primary: "Select Primary Solid State Drive (NVMe)",
    case: "Select PC Chassis / Case",
    psu: "Select Power Supply (PSU)",
    os: "Select Operating System",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-modal-pop">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                Hardware Slot
              </span>
              {activeConstraint && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                  <Filter className="w-3 h-3 text-emerald-600" />
                  <span>Strict Logic Active</span>
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-zinc-900 mt-1">{slotTitles[slot]}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-zinc-800 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Constraint Banner */}
        {activeConstraint && (
          <div className="bg-emerald-50/80 px-6 py-2.5 border-b border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{activeConstraint.title}</strong>: {activeConstraint.detail}
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700">
              Showing {compatibleItems.length} compatible option{compatibleItems.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Search & Incompatible Toggle Bar */}
        <div className="p-3 sm:px-6 border-b border-slate-200 bg-slate-100/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${slotTitles[slot]} by brand or model...`}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-zinc-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {incompatibleItems.length > 0 && (
            <button
              onClick={() => setShowIncompatible(!showIncompatible)}
              className="text-[11px] font-semibold text-slate-500 hover:text-zinc-800 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {showIncompatible ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span>
                {showIncompatible ? "Hide Incompatible Options" : `Show Incompatible (${incompatibleItems.length} hidden)`}
              </span>
            </button>
          )}
        </div>

        {/* Component Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {itemsToDisplay.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-60" />
              <p className="text-sm font-bold text-zinc-700">No compatible parts match your selection</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeConstraint?.detail || "Try clearing search filters or changing previous parts."}
              </p>
            </div>
          ) : (
            itemsToDisplay.map((item, idx) => {
              const compCheck = getCompatibilityCheck(item);
              const isSelected = slots[slot]?.id === item.id;

              return (
                <div
                  key={item.id}
                  style={{ animationDelay: `${idx * 35}ms` }}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pop-in ${
                    !compCheck.compatible
                      ? "bg-red-50/30 border-red-200/80 opacity-75"
                      : isSelected
                      ? "bg-slate-50 border-zinc-900 ring-1 ring-zinc-900 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs hover:scale-[1.005]"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.brand}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {item.sku}
                        </span>
                        {item.specs.socket && (
                          <span className="text-[10px] font-bold text-zinc-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                            Socket {item.specs.socket}
                          </span>
                        )}
                        {item.specs.ramType && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {item.specs.ramType}
                          </span>
                        )}
                        {item.specs.tdpWatts && (
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.specs.tdpWatts}W TDP
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 mt-1 leading-snug">
                        {item.name}
                      </h4>

                      {/* Compatibility / Stock Status */}
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs">
                        {compCheck.compatible ? (
                          <span className="flex items-center gap-1 font-medium text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Flagship In Stock ({item.stockCount} units)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 font-semibold bg-red-100/60 px-2 py-0.5 rounded text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {compCheck.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-black text-zinc-900">
                        {formatRupiah(item.price)}
                      </div>
                      <div className="text-[10px] text-slate-400">incl. tax</div>
                    </div>

                    <button
                      onClick={() => {
                        selectSlotItem(slot, item);
                        onClose();
                      }}
                      disabled={!compCheck.compatible}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs tactile-btn active:scale-95 ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : !compCheck.compatible
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-zinc-900 hover:bg-zinc-800 text-white"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Select</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>PC Builder Compatibility Filter: Strict Enforcement</span>
          <button
            onClick={onClose}
            className="text-xs font-bold text-zinc-700 hover:text-zinc-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
