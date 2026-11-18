import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getServerSupabase } from "@/lib/db/client";
import { checkDatabaseReadiness } from "@/lib/db/health";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
import { MEDIA_BUCKET, MEDIA_FILE_PATTERN, MEDIA_MAX_BYTES } from "./policy";
import { MediaError } from "./images";

interface MediaAsset {
  id: string; file_name: string; sha256: string; size_bytes: number;
  width: number; height: number; created_by: string; created_at: string;
}
const assets = () => new BaseRepository<MediaAsset>("media_assets");
function demoBytes() {
  const state = globalThis as typeof globalThis & { __demoMediaBytes?: Map<string, Buffer> };
  return state.__demoMediaBytes ||= new Map();
}
function storageFailure(): never { throw new MediaError("Image storage is temporarily unavailable. Please retry.", 503); }

async function bucket() {
  const client = getServerSupabase();
  if (!client) return null;
  try {
    await checkDatabaseReadiness();
    const { data, error } = await client.storage.getBucket(MEDIA_BUCKET);
    if (error || !data || data.public !== false || Number(data.file_size_limit) !== MEDIA_MAX_BYTES ||
      data.allowed_mime_types?.length !== 1 || data.allowed_mime_types[0] !== "image/webp") storageFailure();
    return client.storage.from(MEDIA_BUCKET);
  } catch { return storageFailure(); }
}

export async function saveImage(image: { bytes: Buffer; width: number; height: number }, actor: string) {
  const id = randomUUID(), fileName = `${id}.webp`;
  const store = await bucket();
  if (store) {
    try {
      const { error } = await store.upload(fileName, image.bytes, { contentType: "image/webp", cacheControl: "3600", upsert: false });
      if (error) storageFailure();
    } catch { storageFailure(); }
  } else {
    const memory = demoBytes();
    if (Array.from(memory.values()).reduce((n, bytes) => n + bytes.length, 0) + image.bytes.length > 64 * 1024 * 1024)
      throw new MediaError("Dummy image storage is full. Restart the demo server to reset it.", 503);
    memory.set(fileName, Buffer.from(image.bytes));
  }
  // Serve only objects with immutable acceptance records. Unknown outcomes require
  // operator review; never delete an upload blindly after an insert timeout.
  try {
    await assets().create({ id, file_name: fileName, sha256: createHash("sha256").update(image.bytes).digest("hex"),
      size_bytes: image.bytes.length, width: image.width, height: image.height, created_by: actor, created_at: new Date().toISOString() });
  } catch { storageFailure(); }
  return { fileName, url: `/api/uploads/${fileName}`, sizeBytes: image.bytes.length, width: image.width, height: image.height };
}

export async function loadImage(fileName: string) {
  if (!MEDIA_FILE_PATTERN.test(fileName)) return null;
  const record = await assets().findById(fileName.slice(0, -5));
  if (!record) return null;
  if (record.file_name !== fileName || record.size_bytes < 1 || record.size_bytes > MEDIA_MAX_BYTES) storageFailure();
  const store = await bucket();
  let bytes: Buffer | undefined;
  if (store) {
    try {
      const { data, error } = await store.download(fileName);
      if (error || !data || data.size !== record.size_bytes) storageFailure();
      bytes = Buffer.from(await data.arrayBuffer());
    } catch { storageFailure(); }
  } else bytes = demoBytes().get(fileName);
  if (!bytes || bytes.length !== record.size_bytes || createHash("sha256").update(bytes).digest("hex") !== record.sha256) storageFailure();
  return { bytes, etag: `"${record.sha256}"` };
}
