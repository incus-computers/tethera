import { DatabaseError } from "./errors";
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export const MAX_PAGE_SIZE = 100;
export function pageInput(page: unknown = 1, limit: unknown = 50) {
  const p = page === undefined || page === null ? 1 : Number(page);
  const n = limit === undefined || limit === null ? 50 : Number(limit);
  if (!Number.isSafeInteger(p) || p < 1 || p > 10000 || !Number.isSafeInteger(n) || n < 1 || n > MAX_PAGE_SIZE)
    throw new DatabaseError("pagination", "collections", "INVALID_ARGUMENT");
  return { page: p, limit: n };
}
export function pagination(total: number, page: number, limit: number): Pagination {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
export function queryText(value: unknown, max = 120): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max) throw new DatabaseError("filter", "collections", "INVALID_ARGUMENT");
  return value.trim();
}
