import type { BuilderSlotKey } from "../store/useBuilderStore";

export interface BuildSnapshot {
  parts: Partial<Record<BuilderSlotKey, string>>;
  name: string | null;
  sourceProductId: string | null;
  serviceId: string;
}

export function normalizeBuildCode(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!/^INC[A-HJ-NP-Z2-9]{12}$/.test(compact)) return null;
  return `INC-${compact.slice(3, 7)}-${compact.slice(7, 11)}-${compact.slice(11)}`;
}

export function snapshotParts(snapshot: BuildSnapshot): string {
  return Object.entries(snapshot.parts).map(([slot, id]) => `${slot}:${id}`).join(",");
}

export function snapshotUrl(snapshot: BuildSnapshot): string {
  const params = new URLSearchParams({ parts: snapshotParts(snapshot), service: snapshot.serviceId });
  if (snapshot.name) params.set("name", snapshot.name);
  if (snapshot.sourceProductId) params.set("source", snapshot.sourceProductId);
  return `/builder?${params}`;
}
