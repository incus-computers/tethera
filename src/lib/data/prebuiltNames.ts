// Keep older product records and shared configurations readable after model renaming.
const legacyModelNames: Record<string, string> = {
  "incus apex ryzen 7 rtx 4080s": "Apex RTX 4080S",
  "apex": "Apex RTX 4080S",
  "incus kinetic core i7 rtx 4070ti": "Kinetic Core RTX 4070 Ti",
  "kinetic core": "Kinetic Core RTX 4070 Ti",
  "incus minimalist white workstation": "Minimalist White RTX 4080S",
  "minimalist white": "Minimalist White RTX 4080S",
  "incus creator studio rtx 4070": "Creator Studio RTX 4070",
  "creator studio": "Creator Studio RTX 4070",
  "incus stealth compact itx": "Stealth Compact RTX 4060 Ti",
  "stealth compact": "Stealth Compact RTX 4060 Ti",
  "incus valkyrie": "Valkyrie RTX 4070S",
  "valkyrie": "Valkyrie RTX 4070S",
  "incus titan threadripper studio": "Titan Studio RTX 4090",
  "titan studio": "Titan Studio RTX 4090",
  "incus precision cad core i9": "Precision CAD RTX 4080S",
  "precision cad": "Precision CAD RTX 4080S",
};

export function prebuiltModelName(name: string): string {
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  return Object.hasOwn(legacyModelNames, key) ? legacyModelNames[key] : trimmed;
}

/** This descriptive title is presentation for the builder, never a catalog name. */
export function builderDisplayName(name: string): string {
  const withoutSuffix = name.replace(/\s*(?:-\s*)?Custom Built Gaming PC$/i, "");
  const normalized = prebuiltModelName(withoutSuffix);
  const model = prebuiltModelName(normalized.replace(/^INCUS(?: Computers)?\s+/i, "").trim());
  return `INCUS ${model} Custom Built Gaming PC`;
}
