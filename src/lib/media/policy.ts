// Shared with admin file pickers; the server independently enforces every limit.
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp";
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_MAX_PIXELS = 16_000_000;
export const MEDIA_MAX_DIMENSION = 8000;
export const MEDIA_OUTPUT_DIMENSION = 2560;
export const MEDIA_BUCKET = "catalog-media-v1";
export const MEDIA_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/;
