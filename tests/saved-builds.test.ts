import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/builder/builds/route";
import { GET } from "../src/app/api/builder/builds/[code]/route";
import { customBuildsRepository } from "../src/lib/db/repositories/customBuilds.repository";
import { DatabaseError } from "../src/lib/db/errors";
import { db } from "../src/lib/db";
import { normalizeBuildCode, snapshotUrl } from "../src/lib/builder/snapshots";
import { abusePolicy } from "../src/lib/operations/abuse";

const created: string[] = [];
const configuration = () => ({ parts: { cpu: "cpu-1", ram: "ram-1-var-ram-1-white-32", storage_primary: "str-1", storage_secondary: "str-1", storage_tertiary: "str-1" },
  name: "Apex", sourceProductId: "pb-1", serviceId: "srv-express" });
async function save(body: unknown) {
  const response = await POST(new NextRequest("http://localhost/api/builder/builds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  const result = await response.json();
  if (result.code) created.push(result.code);
  return { response, result };
}
async function load(code: string) {
  const response = await GET(new NextRequest(`http://localhost/api/builder/builds/${code}`), { params: Promise.resolve({ code }) });
  return { response, result: await response.json() };
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const code of created.splice(0)) await customBuildsRepository.delete(code);
});

describe("public saved build simulations", () => {
  it("restores variation IDs, three drives, service and name without trusting prices or creating reservations", async () => {
    const orders = await db.orders.count();
    const stock = await db.inventory.getByProductAndStore("str-1");
    const input = { ...configuration(), user_id: "forged-owner", total_price: 1, estimated_wattage: 1 };
    const saved = await save(input);
    expect(saved.response.status).toBe(201);
    expect(saved.result.code).toMatch(/^INC-(?:[A-HJ-NP-Z2-9]{4}-){2}[A-HJ-NP-Z2-9]{4}$/);
    const row = (await customBuildsRepository.findById(saved.result.code))!;
    expect(row.user_id).toBeNull();
    expect(row.total_price).toBe(17995000);
    expect(row.assembly_tier).toBe("express_24h");
    const loaded = await load(saved.result.code.toLowerCase().replaceAll("-", ""));
    expect(loaded.response.status).toBe(200);
    expect(loaded.response.headers.get("cache-control")).toBe("no-store");
    expect(loaded.result.build).toEqual({ ...configuration(), name: "Apex RTX 4080S" });
    expect(Object.keys(loaded.result).sort()).toEqual(["build", "code", "success"]);
    expect(JSON.stringify(loaded.result)).not.toMatch(/user_id|total_price|estimated_wattage|created_at/);
    expect((await db.inventory.getByProductAndStore("str-1"))?.stock_reserved).toBe(stock?.stock_reserved);
    expect(await db.orders.count()).toBe(orders);
    const url = new URL(snapshotUrl(loaded.result.build), "http://localhost");
    expect(url.searchParams.get("parts")).toContain("storage_tertiary:str-1");
    expect(url.searchParams.get("service")).toBe("srv-express");
  });
  it("saves incomplete or conflicting simulations and keeps each generated snapshot independent", async () => {
    const input = { parts: { cpu: "cpu-3", motherboard: "mb-1" }, serviceId: "srv-standard" };
    const first = await save(input);
    expect(first.response.status).toBe(201);
    input.parts.cpu = "cpu-2";
    const second = await save(input);
    expect(second.result.code).not.toBe(first.result.code);
    expect((await load(first.result.code)).result.build.parts.cpu).toBe("cpu-3");
    expect((await load(second.result.code)).result.build.parts.cpu).toBe("cpu-2");
    expect((await load(first.result.code)).result.build.name).toBeNull();
  });
  it.each([
    null, [], {}, { parts: {}, serviceId: "srv-standard" }, { parts: [], serviceId: "srv-standard" },
    { ...configuration(), serviceId: "unknown" }, { ...configuration(), parts: { cpu: "missing" } },
    { ...configuration(), parts: { cpu: "gpu-1" } }, { ...configuration(), parts: { storage_tertiary: "cpu-1" } },
    { ...configuration(), parts: { cpu: "cpu-1,motherboard:mb-1" } },
    { ...configuration(), parts: { cpu: { id: "cpu-1", price: 1 } } },
    { ...configuration(), parts: JSON.parse('{"__proto__":"cpu-1"}') },
    { ...configuration(), name: "x".repeat(161) },
  ])("rejects invalid input before a saved row is written (%#)", async input => {
    const before = await customBuildsRepository.count();
    expect((await save(input)).response.status).toBe(400);
    expect(await customBuildsRepository.count()).toBe(before);
  });
  it("distinguishes invalid, missing and unavailable codes without exposing private builds", async () => {
    expect(normalizeBuildCode(" INC-abcd-efgh-jklm ")).toBe("INC-ABCD-EFGH-JKLM");
    expect(normalizeBuildCode("INC-OOOO-1111-IIII")).toBeNull();
    expect((await load("bad-code")).response.status).toBe(400);
    expect((await load("INC-AAAA-AAAA-AAAA")).response.status).toBe(404);
    const saved = await save(configuration());
    await customBuildsRepository.update(saved.result.code, { user_id: "private-owner" });
    expect((await load(saved.result.code)).response.status).toBe(404);
    await customBuildsRepository.update(saved.result.code, { user_id: null, configuration: { cpu: "cpu-1" } });
    expect((await load(saved.result.code)).response.status).toBe(404);
  });
  it("returns missing historical part IDs for the builder's replacement warning instead of silently substituting", async () => {
    const saved = await save(configuration());
    const row = (await customBuildsRepository.findById(saved.result.code))!;
    await customBuildsRepository.update(row.id, { configuration: { ...row.configuration, cpu: "removed-product" } });
    const loaded = await load(saved.result.code);
    expect(loaded.response.status).toBe(200);
    expect(loaded.result.build.parts.cpu).toBe("removed-product");
  });
  it("reports storage failure as unavailable for both save and load", async () => {
    vi.spyOn(customBuildsRepository, "create").mockRejectedValue(new DatabaseError("create", "custom_builds", "42P01"));
    const saved = await save(configuration());
    expect(saved.response.status).toBe(503);
    expect(saved.result.code).toBeUndefined();
    vi.spyOn(customBuildsRepository, "findByShareSlug").mockRejectedValue(new DatabaseError("findOne", "custom_builds", "42P01"));
    const loaded = await load("INC-ABCD-EFGH-JKLM");
    expect(loaded.response.status).toBe(503);
    expect(loaded.result.build).toBeUndefined();
  });
  it("applies separate public read and save budgets", () => {
    expect(abusePolicy("/api/builder/builds", "POST")).toEqual({ scope: "build-write", limit: 20, global: 200 });
    expect(abusePolicy("/api/builder/builds/INC-ABCD-EFGH-JKLM", "GET")).toEqual({ scope: "build-read", limit: 120, global: 1200 });
  });
});
