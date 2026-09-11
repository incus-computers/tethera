"use client";

import { create } from "zustand";
import { ComponentItem, SERVICE_TIERS } from "../data/mockHardware";

export type BuilderSlotKey =
  | "cpu"
  | "motherboard"
  | "ram"
  | "gpu"
  | "cooler"
  | "storage_primary"
  | "case"
  | "psu"
  | "os";

export interface ServiceTier {
  id: string;
  name: string;
  price: number;
  leadTime: string;
  features: string[];
}

interface BuilderState {
  slots: Record<BuilderSlotKey, ComponentItem | null>;
  selectedService: ServiceTier;
  selectSlotItem: (slot: BuilderSlotKey, item: ComponentItem) => void;
  removeSlotItem: (slot: BuilderSlotKey) => void;
  setServiceTier: (tier: ServiceTier) => void;
  resetBuild: () => void;
  getWattage: () => { estimated: number; recommendedPsu: number };
  getTotalPrice: () => number;
  getCompatibility: () => { isCompatible: boolean; issues: string[]; warnings: string[] };
  getBuildShareUrl: () => string;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  slots: {
    cpu: null,
    motherboard: null,
    ram: null,
    gpu: null,
    cooler: null,
    storage_primary: null,
    case: null,
    psu: null,
    os: null,
  },
  selectedService: SERVICE_TIERS[0],

  selectSlotItem: (slot, item) =>
    set((state) => {
      const newSlots = { ...state.slots, [slot]: item };

      // Auto-reconcile: If CPU socket changed and doesn't match selected Motherboard, clear Motherboard
      if (slot === "cpu" && newSlots.motherboard) {
        if (newSlots.motherboard.specs.socket !== item.specs.socket) {
          newSlots.motherboard = null;
        }
      }

      // If Motherboard socket changed and doesn't match selected CPU, clear CPU
      if (slot === "motherboard" && newSlots.cpu) {
        if (newSlots.cpu.specs.socket !== item.specs.socket) {
          newSlots.cpu = null;
        }
      }

      // If Motherboard changed and RAM type (DDR4 vs DDR5) no longer matches, clear RAM
      if (slot === "motherboard" && newSlots.ram) {
        if (newSlots.ram.specs.ramType !== item.specs.ramType) {
          newSlots.ram = null;
        }
      }

      return { slots: newSlots };
    }),

  removeSlotItem: (slot) =>
    set((state) => ({
      slots: { ...state.slots, [slot]: null },
    })),

  setServiceTier: (tier) => set({ selectedService: tier }),

  resetBuild: () =>
    set({
      slots: {
        cpu: null,
        motherboard: null,
        ram: null,
        gpu: null,
        cooler: null,
        storage_primary: null,
        case: null,
        psu: null,
        os: null,
      },
      selectedService: SERVICE_TIERS[0],
    }),

  getWattage: () => {
    const { slots } = get();
    const cpuTdp = slots.cpu?.specs.tdpWatts || 65;
    const gpuTdp = slots.gpu?.specs.tdpWatts || 0;
    const systemBaseOverhead = 100; // Motherboard, fans, RAM, NVMe
    const estimated = cpuTdp + gpuTdp + systemBaseOverhead;
    const recommendedPsu = Math.ceil((estimated * 1.3) / 50) * 50; // +30% headroom rounded to 50W
    return { estimated, recommendedPsu: Math.max(550, recommendedPsu) };
  },

  getTotalPrice: () => {
    const { slots, selectedService } = get();
    const partsTotal = Object.values(slots).reduce((acc, item) => {
      return acc + (item ? item.price : 0);
    }, 0);
    return partsTotal + selectedService.price;
  },

  getCompatibility: () => {
    const { slots } = get();
    const issues: string[] = [];
    const warnings: string[] = [];

    // 1. CPU & Motherboard Socket Compatibility
    if (slots.cpu && slots.motherboard) {
      if (slots.cpu.specs.socket !== slots.motherboard.specs.socket) {
        issues.push(
          `Socket Mismatch: ${slots.cpu.brand} CPU uses ${slots.cpu.specs.socket}, but motherboard is ${slots.motherboard.specs.socket}.`
        );
      }
    }

    // 2. Motherboard & RAM Memory Standard
    if (slots.motherboard && slots.ram) {
      if (slots.motherboard.specs.ramType !== slots.ram.specs.ramType) {
        issues.push(
          `Memory Incompatibility: Motherboard requires ${slots.motherboard.specs.ramType}, but selected RAM is ${slots.ram.specs.ramType}.`
        );
      }
    }

    // 3. GPU Length vs Case Max Clearance
    if (slots.gpu && slots.case) {
      const gpuLength = slots.gpu.specs.lengthMm || 0;
      const maxCaseGpu = slots.case.specs.maxGpuLengthMm || 400;
      if (gpuLength > maxCaseGpu) {
        issues.push(
          `GPU Length Conflict: Graphics card (${gpuLength}mm) exceeds case clearance (${maxCaseGpu}mm).`
        );
      }
    }

    // 4. Power Supply Headroom Check
    if (slots.psu) {
      const psuWattage = slots.psu.specs.wattage || 750;
      const { recommendedPsu } = get().getWattage();
      if (psuWattage < recommendedPsu) {
        warnings.push(
          `PSU Wattage Warning: System recommends ${recommendedPsu}W, but chosen PSU is ${psuWattage}W.`
        );
      }
    }

    return {
      isCompatible: issues.length === 0,
      issues,
      warnings,
    };
  },

  getBuildShareUrl: () => {
    const { slots } = get();
    const partIds = Object.entries(slots)
      .filter(([_, item]) => item !== null)
      .map(([slot, item]) => `${slot}:${item?.id}`)
      .join(",");
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://tethera.com";
    return `${baseUrl}/builder?parts=${encodeURIComponent(partIds)}`;
  },
}));
