import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { normalizeImage } from "@/lib/media/images";
import { loadImage, saveImage } from "@/lib/media/storage";
import { MEDIA_BUCKET, MEDIA_MAX_BYTES } from "@/lib/media/policy";

// Real Supabase client/serialization with synthetic HTTP responses; no network.
const records = new Map<string, any>(), objects = new Map<string, Buffer>();
let failure = "";
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
let image: Awaited<ReturnType<typeof normalizeImage>>;
beforeEach(async () => {
  records.clear(); objects.clear(); failure = "";
  vi.stubEnv("APP_ENV", "staging"); vi.stubEnv("SUPABASE_URL", "https://storage-fixture.example.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage-fixture.example.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-key-not-a-real-credential");
  vi.stubGlobal("fetch", vi.fn(async (input: any, init?: RequestInit) => {
    const url = new URL(String(input)), method = init?.method || "GET";
    if (url.pathname.endsWith("/rpc/application_schema_health")) return json(failure !== "readiness");
    if (url.pathname.endsWith("/application_schema_versions")) return json({ version: "20261109090000_operational_controls" });
    if (url.pathname.endsWith(`/bucket/${MEDIA_BUCKET}`)) return json({ id: MEDIA_BUCKET, public: failure === "public", file_size_limit: MEDIA_MAX_BYTES, allowed_mime_types: ["image/webp"] });
    if (url.pathname.includes("/object/")) {
      const name = url.pathname.split("/").at(-1)!;
      if (method === "POST") {
        if (failure === "upload") return json({ message: "private backend detail", statusCode: "503", error: "Unavailable" }, 503);
        // SDK sends Buffer uploads as binary; browser File uploads use multipart.
        objects.set(name, Buffer.from(init!.body as Uint8Array));
        expect(new Headers(init?.headers).get("x-upsert")).toBe("false");
        return json({ Key: `${MEDIA_BUCKET}/${name}` });
      }
      const bytes = objects.get(name);
      return bytes ? new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp" } }) : json({ message: "missing", statusCode: "404" }, 404);
    }
    if (url.pathname.endsWith("/media_assets")) {
      if (method === "POST") {
        if (failure === "manifest") return json({ code: "57014", message: "private SQL detail" }, 503);
        const record = JSON.parse(String(init!.body)); records.set(record.id, record); return json(record, 201);
      }
      const id = url.searchParams.get("id")?.slice(3);
      return json(records.get(id || "") || null);
    }
    throw new Error("Unexpected fixture endpoint: " + url.pathname);
  }));
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "blue" } }).png().toBuffer();
  image = await normalizeImage(new File([new Uint8Array(bytes)], "fixture.png", { type: "image/png" }));
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("durable private object storage contract", () => {
  it("writes one immutable object and acceptance record, then reads without relying on the demo cache", async () => {
    const saved = await saveImage(image, "fixture-staff");
    expect(objects.size).toBe(1); expect(records.size).toBe(1);
    const record = Array.from(records.values())[0];
    expect(record).toMatchObject({ created_by: "fixture-staff", size_bytes: image.bytes.length });
    expect((await loadImage(saved.fileName))?.bytes).toEqual(image.bytes);
  });
  it.each(["public", "readiness", "upload"])("does not accept uploads when %s validation fails", async reason => {
    failure = reason;
    await expect(saveImage(image, "fixture-staff")).rejects.toMatchObject({ status: 503 });
    expect(records.size).toBe(0); expect(objects.size).toBe(0);
  });
  it("does not publicly serve an object after failed acceptance persistence", async () => {
    failure = "manifest";
    await expect(saveImage(image, "fixture-staff")).rejects.toMatchObject({ status: 503 });
    expect(objects.size).toBe(1); expect(records.size).toBe(0);
    expect(await loadImage(Array.from(objects.keys())[0])).toBeNull();
  });
  it("fails closed for missing or replaced accepted objects", async () => {
    const saved = await saveImage(image, "fixture-staff");
    objects.set(saved.fileName, Buffer.alloc(image.bytes.length));
    await expect(loadImage(saved.fileName)).rejects.toMatchObject({ status: 503 });
    objects.delete(saved.fileName);
    await expect(loadImage(saved.fileName)).rejects.toMatchObject({ status: 503 });
  });
});
