import "server-only";
import sharp from "sharp";
import { MEDIA_MAX_BYTES, MEDIA_MAX_PIXELS, MEDIA_MAX_DIMENSION, MEDIA_OUTPUT_DIMENSION } from "./policy";

export class MediaError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

/** Bound the streamed request before multipart parsing, including chunked transfers. */
export async function readImageFile(request: Request): Promise<File> {
  const maxRequest = MEDIA_MAX_BYTES + 64 * 1024;
  if (!/^multipart\/form-data;\s*boundary=/i.test(request.headers.get("content-type") || ""))
    throw new MediaError("Upload one JPEG, PNG or WebP image using the file field.", 415);
  if (Number(request.headers.get("content-length")) > maxRequest)
    throw new MediaError("Image uploads must be 5 MB or smaller.", 413);
  if (!request.body) throw new MediaError("No image file provided.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let deadline: ReturnType<typeof setTimeout>;
  const timedOut = new Promise<never>((_, reject) => {
    deadline = setTimeout(() => { reject(new MediaError("Image upload timed out. Please retry.", 408)); void reader.cancel().catch(() => {}); }, 30_000);
    deadline.unref?.();
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timedOut]);
      if (done) break;
      size += value.byteLength;
      if (size > maxRequest) {
        await reader.cancel();
        throw new MediaError("Image uploads must be 5 MB or smaller.", 413);
      }
      chunks.push(value);
    }
  } finally { clearTimeout(deadline!); reader.releaseLock(); }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type")! } }).formData();
  } catch { throw new MediaError("Invalid image upload form."); }
  const entries = Array.from(form.entries());
  if (entries.length !== 1 || entries[0][0] !== "file" || !(entries[0][1] instanceof File))
    throw new MediaError("Upload exactly one image using the file field.");
  const file = entries[0][1];
  if (!file.size) throw new MediaError("The image is empty.");
  if (file.size > MEDIA_MAX_BYTES) throw new MediaError("Image uploads must be 5 MB or smaller.", 413);
  return file;
}

function signature(bytes: Buffer): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

function animatedPng(bytes: Buffer) {
  // libvips may decode only the first APNG frame. Reject animation explicitly.
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString("ascii", offset + 4, offset + 8) === "acTL") return true;
    offset += length + 12;
  }
  return false;
}

/** Never persist user-supplied bytes: fully decode and re-encode without metadata. */
export async function normalizeImage(file: File) {
  if (!file.size) throw new MediaError("The image is empty.");
  if (file.size > MEDIA_MAX_BYTES) throw new MediaError("Image uploads must be 5 MB or smaller.", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  const format = signature(bytes);
  const extension = file.name.toLowerCase().match(/\.([a-z]+)$/)?.[1];
  if (!format || file.type !== `image/${format}` || !(format === "jpeg" ? ["jpg", "jpeg"] : [format]).includes(extension || ""))
    throw new MediaError("Use a JPEG, PNG or WebP image with matching file type and extension. SVG and animated images are not accepted.", 415);
  if (format === "png" && animatedPng(bytes)) throw new MediaError("Animated images are not accepted.", 422);
  try {
    const image = sharp(bytes, { failOn: "warning", limitInputPixels: MEDIA_MAX_PIXELS, sequentialRead: true });
    const meta = await image.metadata();
    if (meta.format !== format || !meta.width || !meta.height || meta.width > MEDIA_MAX_DIMENSION || meta.height > MEDIA_MAX_DIMENSION || (meta.pages || 1) !== 1)
      throw new MediaError("Use a still image up to 8000 pixels per side and 16 megapixels.", 422);
    const result = await image.rotate().resize({ width: MEDIA_OUTPUT_DIMENSION, height: MEDIA_OUTPUT_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, effort: 3 }).timeout({ seconds: 5 }).toBuffer({ resolveWithObject: true });
    if (result.data.length > MEDIA_MAX_BYTES) throw new MediaError("The processed image is too large.", 413);
    return { bytes: result.data, width: result.info.width, height: result.info.height };
  } catch (error) {
    if (error instanceof MediaError) throw error;
    throw new MediaError("The image could not be decoded. Use a valid still JPEG, PNG or WebP up to 16 megapixels.", 422);
  }
}

// Per-process backpressure bounds simultaneous multipart buffers and native decoders.
export async function withImageSlot<T>(work: () => Promise<T>): Promise<T> {
  const state = globalThis as typeof globalThis & { __mediaActive?: number };
  if ((state.__mediaActive || 0) >= 2) throw new MediaError("Image processing is busy. Please retry shortly.", 503);
  state.__mediaActive = (state.__mediaActive || 0) + 1;
  try { return await work(); } finally { state.__mediaActive = (state.__mediaActive || 1) - 1; }
}
