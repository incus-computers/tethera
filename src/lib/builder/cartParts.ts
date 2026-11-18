import { PREBUILT_SYSTEMS } from "../data/mockHardware";
import { prebuiltModelName } from "../data/prebuiltNames";
import type { BuilderSlotKey } from "../store/useBuilderStore";
import type { CartCustomPC } from "../store/useCartStore";
import { type BuilderSlots, resolveBuilderParts } from "./configuration";

const partLabels: Record<BuilderSlotKey, string> = {
  cpu: "CPU",
  motherboard: "Motherboard",
  ram: "Memory",
  gpu: "GPU",
  storage_primary: "Primary storage",
  case: "Case",
  psu: "Power supply",
  storage_secondary: "Secondary storage",
  storage_tertiary: "Tertiary storage",
  cooler: "CPU cooler",
  os: "Operating system",
  other_peripherals: "Accessories",
  mouse: "Mouse",
  keyboard: "Keyboard",
  headphones: "Headphones",
  mousepad: "Mousepad",
};
const orderedSlots = Object.keys(partLabels) as BuilderSlotKey[];

export function prebuiltCartBaseline(productId: string): BuilderSlots | null {
  const mapping = PREBUILT_SYSTEMS.find(system => system.id === productId)?.builderParts;
  if (!mapping || !Object.keys(mapping).length) return null;
  const { slots, rejected } = resolveBuilderParts(Object.entries(mapping).map(([slot, id]) => `${slot}:${id}`).join(","));
  return rejected.length ? null : slots;
}

export function customizedCartSlots(parts: CartCustomPC["parts"], baseline: BuilderSlots): BuilderSlotKey[] {
  return orderedSlots.filter(slot => parts[slot]?.id !== baseline[slot]?.id);
}

export function cartPartSummary(pc: CartCustomPC) {
  let customized = pc.customizedSlots;
  // Older cart entries only stored the generated name and the final selections.
  const suffix = " - Customized";
  if (!pc.isPrebuilt && !customized && pc.name.endsWith(suffix)) {
    const model = prebuiltModelName(pc.name.slice(0, -suffix.length));
    const prebuilt = PREBUILT_SYSTEMS.find(system => system.name === model);
    const baseline = prebuilt && prebuiltCartBaseline(prebuilt.id);
    if (baseline) customized = customizedCartSlots(pc.parts, baseline);
  }

  const slots = pc.isPrebuilt ? ["cpu", "gpu", "ram"] as const : orderedSlots;
  const rows = slots.flatMap(slot => {
    const name = pc.parts[slot]?.name;
    if (customized ? !customized.includes(slot) : !name) return [];
    return [{ slot, label: partLabels[slot], name: name || "Removed" }];
  });
  return { rows, customized: !pc.isPrebuilt && customized !== undefined };
}
