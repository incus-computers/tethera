import "server-only";
import { randomBytes } from "node:crypto";
import { customBuildsRepository } from "../db/repositories/customBuilds.repository";
import { DatabaseError } from "../db/errors";
import type { CustomBuild } from "../db/types";
import { SERVICE_TIERS } from "../data/mockHardware";
import { prebuiltModelName } from "../data/prebuiltNames";
import { BUILDER_SLOTS, resolveBuilderParts } from "./configuration";
import { type BuildSnapshot, normalizeBuildCode, snapshotParts } from "./snapshots";

export class BuildInputError extends Error {}

// Retain existing storage identifiers; customer-facing timings come from SERVICE_TIERS.
const assemblyTiers: Record<string, CustomBuild["assembly_tier"]> = {
  "srv-standard": "standard_48h", "srv-express": "express_24h", "srv-self": "parts_only",
};
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > max) throw new BuildInputError(`Invalid ${label}.`);
  return value.trim() || null;
}

export function parseBuildSnapshot(input: unknown): BuildSnapshot {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BuildInputError("Invalid build configuration.");
  const body = input as Record<string, unknown>;
  if (!body.parts || typeof body.parts !== "object" || Array.isArray(body.parts)) throw new BuildInputError("Choose at least one component before saving.");
  const entries = Object.entries(body.parts);
  if (!entries.length || entries.length > BUILDER_SLOTS.length) throw new BuildInputError("Choose at least one component before saving.");
  const parts: BuildSnapshot["parts"] = {};
  for (const [slot, id] of entries) {
    if (!BUILDER_SLOTS.includes(slot as typeof BUILDER_SLOTS[number]) || typeof id !== "string" || !id || id.length > 100 || /[:,]/.test(id))
      throw new BuildInputError("Invalid component selection.");
    parts[slot as typeof BUILDER_SLOTS[number]] = id;
  }
  const service = SERVICE_TIERS.find(tier => tier.id === body.serviceId);
  if (!service) throw new BuildInputError("Choose an available assembly service.");
  const name = optionalText(body.name, "build name", 160);
  const snapshot: BuildSnapshot = { parts, name: name ? prebuiltModelName(name) : null,
    sourceProductId: optionalText(body.sourceProductId, "source product", 100), serviceId: service.id };
  if (resolveBuilderParts(snapshotParts(snapshot)).rejected.length) throw new BuildInputError("A selected component is unavailable or belongs in another slot.");
  return snapshot;
}

export async function saveBuildSnapshot(input: unknown): Promise<string> {
  const snapshot = parseBuildSnapshot(input);
  const { slots } = resolveBuilderParts(snapshotParts(snapshot));
  const service = SERVICE_TIERS.find(tier => tier.id === snapshot.serviceId)!;
  const estimated = (slots.cpu?.specs.tdpWatts || 65) + (slots.gpu?.specs.tdpWatts || 0) + 100;
  const configuration: Record<string, string> = { ...snapshot.parts, _builder_version: "1", _source_product_id: snapshot.sourceProductId || "" };
  for (let attempt = 0; attempt < 3; attempt++) {
    const characters = Array.from(randomBytes(12), byte => alphabet[byte & 31]).join("");
    const code = normalizeBuildCode(`INC${characters}`)!;
    try {
      await customBuildsRepository.create({ id: code, share_slug: code, user_id: null, build_name: snapshot.name || "",
        platform: /^LGA/i.test(slots.cpu?.specs.socket || slots.motherboard?.specs.socket || "") ? "intel" : "amd",
        configuration, total_price: Object.values(slots).reduce((sum, part) => sum + (part?.price || 0), service.price),
        estimated_wattage: estimated, recommended_psu_wattage: Math.max(550, Math.ceil(estimated * 1.3 / 50) * 50),
        assembly_tier: assemblyTiers[service.id] });
      return code;
    } catch (error) {
      if (!(error instanceof DatabaseError) || error.code !== "23505" || attempt === 2) throw error;
    }
  }
  throw new Error("Could not generate a build code.");
}

export async function findBuildSnapshot(value: string): Promise<{ code: string; build: BuildSnapshot } | null> {
  const code = normalizeBuildCode(value);
  if (!code) throw new BuildInputError("Enter a valid build code, such as INC-ABCD-EFGH-JKLM.");
  const row = await customBuildsRepository.findByShareSlug(code);
  // Only explicit public simulations are exposed; private/order-linked records stay private.
  if (!row || row.user_id != null || row.configuration?._builder_version !== "1") return null;
  const serviceId = Object.entries(assemblyTiers).find(([, tier]) => tier === row.assembly_tier)?.[0];
  if (!serviceId) return null;
  const parts: BuildSnapshot["parts"] = {};
  for (const slot of BUILDER_SLOTS) if (typeof row.configuration[slot] === "string") parts[slot] = row.configuration[slot];
  return { code, build: { parts, serviceId, name: row.build_name ? prebuiltModelName(row.build_name) : null,
    sourceProductId: row.configuration._source_product_id || null } };
}
