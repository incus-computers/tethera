import "server-only";
import { getServerSupabase } from "./client";
import { DatabaseError, databaseError } from "./errors";
import { pageInput, queryText, type Pagination } from "./pagination";
export type CollectionKind = "catalog" | "orders" | "products" | "customers" | "inventory";
export interface CollectionPage<T = any> { rows: T[]; pagination: Pagination; stats?: any; facets?: any; }
export interface ListFilters { search?: string; status?: string; sort?: string; id?: string; segment?: string; optInOnly?: boolean; scope?: string; }
export function listFilters(filters: ListFilters): ListFilters {
  const result = { ...filters, search: queryText(filters.search), status: queryText(filters.status, 40),
    sort: queryText(filters.sort, 24), id: queryText(filters.id, 100), segment: queryText(filters.segment, 40), scope: queryText(filters.scope, 12) || "all" };
  if (result.sort && !["date-desc", "date-asc", "total-desc", "total-asc"].includes(result.sort)) throw new DatabaseError("sort", "collections", "INVALID_ARGUMENT");
  if (result.scope && !["current", "past", "all"].includes(result.scope)) throw new DatabaseError("scope", "collections", "INVALID_ARGUMENT");
  return result;
}
export async function connectedPage<T>(kind: CollectionKind, filters: object, page?: unknown, limit?: unknown, owner: string | null = null): Promise<CollectionPage<T> | null> {
  const input = pageInput(page, limit), client = getServerSupabase();
  if (!client) return null;
  try {
    const result = await client.rpc("read_collection_page", { p_kind: kind, p_filters: filters, p_page: input.page, p_limit: input.limit, p_owner: owner });
    if (result.error) databaseError("page", kind, result.error);
    if (!result.data || !Array.isArray(result.data.rows) || !result.data.pagination) throw new DatabaseError("page", kind);
    return result.data;
  } catch (error) { if (error instanceof DatabaseError) throw error; return databaseError("page", kind); }
}
