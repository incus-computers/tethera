import { ComponentItem, getExpandedCatalogItems, MOCK_COMPONENTS, PrebuiltSystem, SERVICE_TIERS } from "../data/mockHardware";
import type { BuilderSlotKey } from "../store/useBuilderStore";
import { prebuiltModelName } from "../data/prebuiltNames";

export type BuilderSlots = Record<BuilderSlotKey, ComponentItem | null>;
export const BUILDER_SLOTS: BuilderSlotKey[] = ["cpu", "motherboard", "ram", "gpu", "cooler", "storage_primary", "storage_secondary", "storage_tertiary", "case", "psu", "os", "mouse", "keyboard", "headphones", "mousepad", "other_peripherals"];
export const REQUIRED_SLOTS: BuilderSlotKey[] = ["cpu", "motherboard", "ram", "cooler", "storage_primary", "case", "psu"];
export function emptySlots(): BuilderSlots {
  return Object.fromEntries(BUILDER_SLOTS.map(key => [key, null])) as BuilderSlots;
}
export function effectiveComponent(item: ComponentItem): ComponentItem {
  const sale = item.sale_price ?? item.salePrice;
  return sale && sale > 0 && sale < item.price ? { ...item, price: sale, originalPrice: item.price } : item;
}
export const BUILDER_CATALOG = getExpandedCatalogItems(MOCK_COMPONENTS).map(effectiveComponent);
export function builderCatalogSlot(slot: BuilderSlotKey): BuilderSlotKey {
  return slot === "storage_secondary" || slot === "storage_tertiary" ? "storage_primary" : slot;
}

export function resolveBuilderParts(parts: string) {
  const slots = emptySlots(), rejected: string[] = [];
  for (const pair of parts.split(",")) {
    if (!pair) continue;
    const [key, id, extra] = pair.split(":");
    if (!BUILDER_SLOTS.includes(key as BuilderSlotKey) || !id || extra) { rejected.push(pair); continue; }
    // Parent IDs in older share links resolve to that product's first active variation.
    const item = BUILDER_CATALOG.find(p => p.id === id) || BUILDER_CATALOG.find(p => p.parentProductId === id);
    if (!item || item.slot !== builderCatalogSlot(key as BuilderSlotKey)) { rejected.push(pair); continue; }
    slots[key as BuilderSlotKey] = item;
  }
  return { slots, rejected };
}

export function prebuiltBuilderUrl(system: Pick<PrebuiltSystem, "id" | "name"> & { builderParts?: Record<string, string> }): string | null {
  if (!system.builderParts) return null;
  const parts = Object.entries(system.builderParts).map(([key, id]) => `${key}:${id}`).join(",");
  const resolved = resolveBuilderParts(parts);
  if (resolved.rejected.length || REQUIRED_SLOTS.some(key => !resolved.slots[key])) return null;
  const params = new URLSearchParams({ parts, name: prebuiltModelName(system.name), source: system.id, service: SERVICE_TIERS[0].id });
  return `/builder?${params}`;
}

/** Only constraints involving this slot block a replacement, so unrelated issues can be corrected. */
export function replacementIssues(slot: BuilderSlotKey, candidate: ComponentItem, slots: BuilderSlots): string[] {
  const parts = { ...slots, [slot]: candidate }, issues: string[] = [];
  const relevant = (...keys: BuilderSlotKey[]) => keys.includes(slot);
  if (relevant("cpu", "motherboard") && parts.cpu?.specs.socket && parts.motherboard?.specs.socket && parts.cpu.specs.socket !== parts.motherboard.specs.socket)
    issues.push(`Requires ${parts.motherboard.specs.socket} processor and motherboard sockets to match.`);
  if (relevant("motherboard", "ram") && parts.motherboard?.specs.ramType && parts.ram?.specs.ramType && parts.motherboard.specs.ramType !== parts.ram.specs.ramType)
    issues.push(`Memory must match the motherboard's ${parts.motherboard.specs.ramType} standard.`);
  if (slot === "ram" && candidate.specs.memoryType === "Laptop Memory") issues.push("Laptop memory does not fit this desktop build.");
  if (slot === "cooler" && candidate.specs.coolingType === "Cooling Fans") issues.push("Case fans do not replace a CPU cooler.");
  if (relevant("gpu", "case") && parts.gpu?.specs.lengthMm && parts.case?.specs.maxGpuLengthMm && parts.gpu.specs.lengthMm > parts.case.specs.maxGpuLengthMm)
    issues.push(`${parts.gpu.specs.lengthMm} mm graphics card exceeds this case's ${parts.case.specs.maxGpuLengthMm} mm clearance.`);
  if (relevant("cooler", "case") && parts.cooler?.specs.radiatorSizeMm && parts.case?.specs.radiatorSizeMm !== undefined && parts.cooler.specs.radiatorSizeMm > parts.case.specs.radiatorSizeMm)
    issues.push(`This case does not support the selected ${parts.cooler.specs.radiatorSizeMm} mm radiator.`);
  const boardForm = parts.motherboard?.specs.formFactor, caseForm = parts.case?.specs.formFactor;
  const sizes: Record<string, number> = { miniitx: 1, microatx: 2, matx: 2, atx: 3, eatx: 4 };
  const size = (form: string) => sizes[form.toLowerCase().replace(/[^a-z]/g, "")];
  if (relevant("motherboard", "case") && boardForm && caseForm && size(boardForm) && size(caseForm) && size(boardForm) > size(caseForm))
    issues.push(`The ${boardForm} motherboard is larger than this ${caseForm} case supports.`);
  return issues;
}

export function componentDetails(item: ComponentItem): [string, string][] {
  const specs = { ...item.specs, ...(item.selectedAttributes?.Capacity ? { capacity: item.selectedAttributes.Capacity } : {}) };
  return ([
    ["Socket", specs.socket], ["Memory", specs.ramType], ["Capacity", specs.capacity], ["Speed", specs.speed],
    ["Form factor", specs.formFactor], ["Power", specs.tdpWatts ? `${specs.tdpWatts} W` : undefined],
    ["Length", specs.lengthMm ? `${specs.lengthMm} mm` : undefined], ["GPU clearance", specs.maxGpuLengthMm ? `${specs.maxGpuLengthMm} mm` : undefined],
    ["Radiator", specs.radiatorSizeMm ? `${specs.radiatorSizeMm} mm` : undefined], ["Output", specs.wattage ? `${specs.wattage} W` : undefined],
    ["Efficiency", specs.efficiencyRating],
  ] as [string, string | undefined][]).filter((entry): entry is [string, string] => !!entry[1]).slice(0, 3);
}
