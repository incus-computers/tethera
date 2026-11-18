import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { normalizeImage, readImageFile, withImageSlot } from "@/lib/media/images";
import { MEDIA_MAX_BYTES } from "@/lib/media/policy";
import { loadImage, saveImage } from "@/lib/media/storage";
import { POST } from "@/app/api/admin/upload/route";
import { GET } from "@/app/api/uploads/[file]/route";
import { fixtureCookie } from "./support/session";

const png = () => sharp({ create: { width: 32, height: 24, channels: 3, background: "red" } }).png().toBuffer();
const file = (bytes: Uint8Array, name = "fixture.png", type = "image/png") => new File([new Uint8Array(bytes)], name, { type });
function request(image?: File, cookie = "", origin = process.env.APP_URL || "http://localhost:3000") {
  const body = new FormData();
  if (image) body.append("file", image);
  return new NextRequest("http://localhost:3000/api/admin/upload", { method: "POST", headers: { cookie, origin }, body });
}
beforeEach(() => { process.env.APP_ENV = "demo"; });

describe("bounded, decoded image ingestion", () => {
  it("fully re-encodes valid input and drops trailing active data and EXIF metadata", async () => {
    const source = await sharp(await png()).withExif({ IFD0: { Artist: "Private GPS fixture" } }).png().toBuffer();
    const image = await normalizeImage(file(Buffer.concat([source, Buffer.from("<script>alert(1)</script>")])));
    const meta = await sharp(image.bytes).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 32, height: 24 });
    expect(meta.exif).toBeUndefined();
    expect(image.bytes.includes(Buffer.from("<script>"))).toBe(false);
  });
  it.each(["jpeg", "webp"] as const)("accepts and decodes actual %s images", async format => {
    const bytes = await sharp(await png()).toFormat(format).toBuffer();
    expect((await normalizeImage(file(bytes, `image.${format}`, `image/${format}`))).width).toBe(32);
  });
  it("rejects SVG, fake MIME/extensions, truncated images and empty files", async () => {
    const valid = await png();
    for (const candidate of [file(Buffer.from('<svg onload="alert(1)"/>'), "x.svg", "image/svg+xml"),
      file(valid, "x.jpg", "image/jpeg"), file(valid, "x.png", "application/octet-stream"),
      file(valid, "x.svg"), file(Buffer.from([137,80,78,71,13,10,26,10])), file(Buffer.alloc(0))]) {
      await expect(normalizeImage(candidate)).rejects.toHaveProperty("status");
    }
  });
  it("caps input bytes, pixels and side lengths, and resizes accepted large images", async () => {
    await expect(normalizeImage(file(Buffer.alloc(MEDIA_MAX_BYTES + 1)))).rejects.toMatchObject({ status: 413 });
    const bomb = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: "red" } }).png().toBuffer();
    await expect(normalizeImage(file(bomb))).rejects.toMatchObject({ status: 422 });
    const wide = await sharp({ create: { width: 8001, height: 1, channels: 3, background: "red" } }).png().toBuffer();
    await expect(normalizeImage(file(wide))).rejects.toMatchObject({ status: 422 });
    const large = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: "red" } }).png().toBuffer();
    expect(await normalizeImage(file(large))).toMatchObject({ width: 2560, height: 853 });
  });
  it("rejects animated PNG and WebP instead of silently accepting their first frame", async () => {
    const source = await png();
    const animationChunk = Buffer.alloc(20); animationChunk.writeUInt32BE(8); animationChunk.write("acTL", 4);
    await expect(normalizeImage(file(Buffer.concat([source.subarray(0,33), animationChunk, source.subarray(33)])))).rejects.toMatchObject({ status: 422 });
    const frames = Buffer.alloc(24); frames.fill(255, 12); // Distinct frames prevent encoder deduplication.
    const animated = await sharp(frames, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
    await expect(normalizeImage(file(animated, "animated.webp", "image/webp"))).rejects.toMatchObject({ status: 422 });
  });
  it("bounds a chunked body even with a false Content-Length and rejects multiple file fields", async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MEDIA_MAX_BYTES + 65537)); controller.close(); } });
    const req = new Request("http://localhost/upload", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=fixture", "Content-Length": "1" }, body: stream, duplex: "half" } as RequestInit);
    await expect(readImageFile(req)).rejects.toMatchObject({ status: 413 });
    const body = new FormData(); body.append("file", file(await png())); body.append("file", file(await png()));
    await expect(readImageFile(new Request("http://localhost/upload", { method: "POST", body }))).rejects.toMatchObject({ status: 400 });
  });
  it("applies backpressure and releases slots even after failed processing", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const first = withImageSlot(() => gate), second = withImageSlot(() => gate);
    await expect(withImageSlot(async () => 1)).rejects.toMatchObject({ status: 503 });
    release(); await Promise.all([first, second]);
    await expect(withImageSlot(async () => { throw new Error("fixture"); })).rejects.toThrow("fixture");
    expect(await withImageSlot(async () => 7)).toBe(7);
  });
  it("cancels slow streams at the upload deadline", async () => {
    vi.useFakeTimers();
    let cancelled = false;
    try {
      const stream = new ReadableStream({ cancel() { cancelled = true; } });
      const req = new Request("http://localhost/upload", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=fixture" }, body: stream, duplex: "half" } as RequestInit);
      const outcome = expect(readImageFile(req)).rejects.toMatchObject({ status: 408 });
      await vi.advanceTimersByTimeAsync(30_000); await outcome;
      expect(cancelled).toBe(true);
    } finally { vi.useRealTimers(); }
  });
});

describe("image routes and storage boundary", () => {
  it("requires staff product-write permission and a same-origin mutation", async () => {
    const image = file(await png());
    expect((await POST(request(image))).status).toBe(401);
    expect((await POST(request(image, fixtureCookie("SUPPORT_AGENT")))).status).toBe(403);
    expect((await POST(request(image, fixtureCookie(), "https://untrusted.example"))).status).toBe(403);
  });
  it("uploads in dummy storage and serves canonical bytes with safe headers and ETag", async () => {
    const uploaded = await POST(request(file(await png(), "../../untrusted.png"), fixtureCookie("CATALOG_MANAGER")));
    expect(uploaded.status).toBe(200);
    const result = await uploaded.json();
    expect(result.url).toMatch(/^\/api\/uploads\/[0-9a-f-]+\.webp$/);
    expect(result.dataUrl).toBeUndefined();
    expect(uploaded.headers.get("cache-control")).toBe("no-store");
    const read = () => GET(new NextRequest(`http://localhost:3000${result.url}`), { params: Promise.resolve({ file: result.fileName }) });
    const image = await read();
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/webp");
    expect(image.headers.get("x-content-type-options")).toBe("nosniff");
    expect(image.headers.get("content-security-policy")).toContain("sandbox");
    expect((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format).toBe("webp");
    expect((await GET(new NextRequest(`http://localhost:3000${result.url}`, { headers: { "If-None-Match": image.headers.get("etag")! } }), { params: Promise.resolve({ file: result.fileName }) })).status).toBe(304);
    expect((await read()).status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects traversal, legacy SVG and unaccepted UUIDs without fetching storage", async () => {
    for (const name of ["../secret.webp", "legacy.svg", `${randomUUID()}.webp`, "retired"]) {
      expect((await GET(new NextRequest("http://localhost:3000/api/uploads/invalid"), { params: Promise.resolve({ file: name }) })).status).toBe(404);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("detects altered storage bytes rather than serving untrusted replacement content", async () => {
    const image = await normalizeImage(file(await png()));
    const saved = await saveImage(image, "fixture");
    const memory = (globalThis as any).__demoMediaBytes as Map<string, Buffer>;
    memory.set(saved.fileName, Buffer.alloc(image.bytes.length));
    await expect(loadImage(saved.fileName)).rejects.toMatchObject({ status: 503 });
  });
  it("fails closed when connected storage is unconfigured without writing a local upload", async () => {
    const image = await normalizeImage(file(await png()));
    vi.stubEnv("APP_ENV", "staging"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    try { await expect(saveImage(image, "fixture")).rejects.toHaveProperty("status", 503); }
    finally { vi.unstubAllEnvs(); }
    expect(fetch).not.toHaveBeenCalled();
  });
});
