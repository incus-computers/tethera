import { beforeEach, describe, expect, it } from "vitest";
import { BUILDER_CATALOG, componentDetails, emptySlots, prebuiltBuilderUrl, replacementIssues, resolveBuilderParts } from "../src/lib/builder/configuration";
import { useBuilderStore } from "../src/lib/store/useBuilderStore";
import { PREBUILT_SYSTEMS, SERVICE_TIERS } from "../src/lib/data/mockHardware";
import { builderDisplayName, prebuiltModelName } from "../src/lib/data/prebuiltNames";

const part = (id: string) => BUILDER_CATALOG.find(item => item.id === id)!;
const original = () => resolveBuilderParts(new URL(prebuiltBuilderUrl(PREBUILT_SYSTEMS[0])!, "http://example.test").searchParams.get("parts")!).slots;

describe("PC configuration handoff and editing baseline", () => {
  beforeEach(() => useBuilderStore.getState().resetBuild());
  it("loads the explicitly linked prebuilt configuration with variation identity and sale prices", () => {
    const url = new URL(prebuiltBuilderUrl(PREBUILT_SYSTEMS[0])!, "http://example.test");
    const parsed = resolveBuilderParts(url.searchParams.get("parts")!);
    expect(parsed.rejected).toEqual([]);
    expect(parsed.slots.ram?.variationId).toBe("ram-1-white-32");
    expect(componentDetails(part("ram-1-var-ram-1-black-64"))).toContainEqual(["Capacity", "64GB (2x32GB)"]);
    expect(parsed.slots.cpu?.price).toBe(6499000);
    useBuilderStore.getState().loadBuild(parsed.slots, { name: url.searchParams.get("name")! });
    const state = useBuilderStore.getState();
    expect(Object.values(state.slots).filter(Boolean)).toHaveLength(9);
    expect(state.getCompatibility().isCompatible).toBe(true);
    expect(state.originalSlots).toEqual(parsed.slots);
    expect(state.buildName).toBe(PREBUILT_SYSTEMS[0].name);
  });
  it("uses model and GPU catalog names and keeps the descriptive builder title out of shared metadata", () => {
    expect(PREBUILT_SYSTEMS.map(system => system.name)).toEqual(["Apex RTX 4080S", "Kinetic Core RTX 4070 Ti", "Minimalist White RTX 4080S", "Creator Studio RTX 4070", "Stealth Compact RTX 4060 Ti", "Valkyrie RTX 4070S", "Titan Studio RTX 4090", "Precision CAD RTX 4080S"]);
    const legacy = "Incus Apex Ryzen 7 RTX 4080S";
    expect(prebuiltModelName(legacy)).toBe("Apex RTX 4080S");
    expect(prebuiltModelName("Apex")).toBe("Apex RTX 4080S");
    expect(prebuiltModelName("Kinetic Core")).toBe("Kinetic Core RTX 4070 Ti");
    expect(builderDisplayName(legacy)).toBe("INCUS Apex RTX 4080S Custom Built Gaming PC");
    expect(builderDisplayName("INCUS Apex Custom Built Gaming PC")).toBe("INCUS Apex RTX 4080S Custom Built Gaming PC");
    expect(builderDisplayName("INCUS Apex RTX 4080S Custom Built Gaming PC")).toBe("INCUS Apex RTX 4080S Custom Built Gaming PC");
    const url = new URL(prebuiltBuilderUrl({ ...PREBUILT_SYSTEMS[0], name: legacy })!, "http://example.test");
    expect(url.searchParams.get("name")).toBe("Apex RTX 4080S");
    for (const name of ["My PC", "__proto__", "constructor", "toString"])
      expect(prebuiltModelName(name)).toBe(name);
  });
  it("replaces rather than merges incoming builds and restores the original parts and service atomically", () => {
    const state = useBuilderStore.getState();
    state.selectSlotItem("mouse", part("mou-1"));
    state.loadBuild(original());
    expect(useBuilderStore.getState().slots.mouse).toBeNull();
    const before = useBuilderStore.getState().getTotalPrice();
    state.selectSlotItem("cpu", part("cpu-2"));
    expect(useBuilderStore.getState().getTotalPrice() - before).toBe(2900000);
    state.removeSlotItem("case");
    state.setServiceTier(SERVICE_TIERS[1]);
    state.restoreBuild();
    expect(useBuilderStore.getState().slots).toEqual(original());
    expect(useBuilderStore.getState().selectedService.id).toBe("srv-standard");
    expect(useBuilderStore.getState().getTotalPrice()).toBe(before);
  });
  it("rejects unknown slots, missing IDs and products placed in the wrong slot", () => {
    const result = resolveBuilderParts("__proto__:cpu-1,cpu:gpu-1,ram:missing,cpu:cpu-2,psu:psu-1:extra");
    expect(result.rejected).toHaveLength(4);
    expect(result.slots.cpu?.id).toBe("cpu-2");
    expect(result.slots.gpu).toBeNull();
  });
  it("restores older parent-product links and round-trips a selected variation, service and build name", () => {
    expect(resolveBuilderParts("ram:ram-1").slots.ram?.variationId).toBe("ram-1-black-32");
    const state = useBuilderStore.getState();
    state.loadBuild(original(), { name: "A PC & monitor", sourceProductId: "pb-1", serviceId: "srv-self" });
    const url = new URL(state.getBuildShareUrl());
    expect(url.searchParams.get("name")).toBe("A PC & monitor");
    expect(url.searchParams.get("service")).toBe("srv-self");
    expect(url.searchParams.get("source")).toBe("pb-1");
    expect(resolveBuilderParts(url.searchParams.get("parts")!).slots.ram?.id).toBe("ram-1-var-ram-1-white-32");
  });
  it("does not offer editing by guessing parts for descriptive-only or invalid prebuilt data", () => {
    expect(prebuiltBuilderUrl(PREBUILT_SYSTEMS[1])).toBeNull();
    expect(prebuiltBuilderUrl({ id: "x", name: "Incomplete", builderParts: { cpu: "cpu-1" } })).toBeNull();
  });
  it("keeps two identical SSDs independent through totals, shared links, removal and reset", () => {
    const state = useBuilderStore.getState();
    state.loadBuild(original());
    const baseline = state.getTotalPrice();
    expect(useBuilderStore.getState().slots.storage_secondary).toBeNull();
    state.selectSlotItem("storage_secondary", part("str-1"));
    expect(state.getTotalPrice()).toBe(baseline + 2899000);
    const url = new URL(state.getBuildShareUrl());
    const shared = resolveBuilderParts(url.searchParams.get("parts")!);
    expect(shared.rejected).toEqual([]);
    expect(shared.slots.storage_primary?.id).toBe("str-1");
    expect(shared.slots.storage_secondary?.id).toBe("str-1");
    state.removeSlotItem("storage_secondary");
    expect(useBuilderStore.getState().slots.storage_primary?.id).toBe("str-1");
    expect(state.getTotalPrice()).toBe(baseline);
    state.loadBuild(shared.slots);
    state.removeSlotItem("storage_secondary");
    state.restoreBuild();
    expect(useBuilderStore.getState().slots.storage_secondary?.id).toBe("str-1");
    expect(state.getTotalPrice()).toBe(baseline + 2899000);
    state.resetBuild();
    expect(useBuilderStore.getState().slots.storage_secondary).toBeNull();
  });
  it("keeps three SSDs independent through sharing, changes and baseline restoration", () => {
    const state = useBuilderStore.getState();
    state.loadBuild(original());
    const baseline = state.getTotalPrice();
    expect(useBuilderStore.getState().slots.storage_tertiary).toBeNull();
    state.selectSlotItem("storage_secondary", part("str-1"));
    state.selectSlotItem("storage_tertiary", part("str-1"));
    expect(state.getTotalPrice()).toBe(baseline + 2 * part("str-1").price);
    const shared = resolveBuilderParts(new URL(state.getBuildShareUrl()).searchParams.get("parts")!);
    expect(shared.rejected).toEqual([]);
    for (const key of ["storage_primary", "storage_secondary", "storage_tertiary"] as const)
      expect(shared.slots[key]?.id).toBe("str-1");
    state.loadBuild(shared.slots);
    state.selectSlotItem("storage_tertiary", part("str-2"));
    expect(state.getTotalPrice()).toBe(baseline + part("str-1").price + part("str-2").price);
    expect(useBuilderStore.getState().slots.storage_secondary?.id).toBe("str-1");
    state.removeSlotItem("storage_secondary");
    expect(useBuilderStore.getState().slots.storage_tertiary?.id).toBe("str-2");
    state.restoreBuild();
    expect(useBuilderStore.getState().slots).toEqual(shared.slots);
    state.resetBuild();
    expect(useBuilderStore.getState().slots.storage_tertiary).toBeNull();
  });
  it.each(["storage_secondary", "storage_tertiary"] as const)("rejects a non-storage product in %s", slot => {
    const parsed = resolveBuilderParts(`${slot}:cpu-1`);
    expect(parsed.slots[slot]).toBeNull();
    expect(parsed.rejected).toEqual([`${slot}:cpu-1`]);
  });
});

describe("Inline replacement fit restrictions", () => {
  it("blocks socket and memory mismatches without changing other selections", () => {
    const slots = original();
    expect(replacementIssues("cpu", part("cpu-3"), slots).join(" ")).toContain("socket");
    expect(replacementIssues("ram", part("ram-3-var-ram-3-black-16"), slots).join(" ")).toContain("DDR5");
    expect(replacementIssues("cpu", part("cpu-2"), slots)).toEqual([]);
    expect(slots.cpu?.id).toBe("cpu-1");
  });
  it("checks both radiator and motherboard fit when choosing a compact case", () => {
    const issues = replacementIssues("case", part("cas-4"), original());
    expect(issues.join(" ")).toContain("360 mm radiator");
    expect(issues.join(" ")).toContain("motherboard");
    expect(replacementIssues("case", part("cas-3"), original()).join(" ")).toContain("motherboard");
  });
  it("keeps a corrective choice available when another component is in conflict", () => {
    const slots = { ...original(), case: part("cas-4") };
    expect(replacementIssues("cpu", part("cpu-2"), slots)).toEqual([]);
    expect(replacementIssues("case", part("cas-1"), slots)).toEqual([]);
  });
  it("does not offer laptop memory or case fans as desktop memory or a CPU cooler", () => {
    expect(replacementIssues("ram", part("ram-4"), emptySlots())).not.toEqual([]);
    expect(replacementIssues("cooler", part("clr-3"), emptySlots())).not.toEqual([]);
  });
});
