import "server-only";
import { randomUUID } from "crypto";
import { getServerSupabase } from "../client";
import { DatabaseError, databaseError } from "../errors";
import { isDemoMode } from "@/lib/runtime/environment";
import { demoVariantRows } from "../demoVariants";

export interface QueryOptions<T> {
  limit?: number;
  offset?: number;
  orderBy?: keyof T;
  orderDirection?: "asc" | "desc";
  select?: string;
}

export class BaseRepository<T extends { id?: string }> {
  protected tableName: string;
  protected localFallbackStore: Map<string, T> = new Map();

  constructor(tableName: string, initialDemoData: T[] = []) {
    this.tableName = tableName;
    if (!isDemoMode()) return;
    const state = globalThis as typeof globalThis & { __demoRepositoryTables?: Map<string, Map<string, unknown>> };
    const tables = state.__demoRepositoryTables ||= new Map();
    const existing = tables.get(tableName);
    if (existing) {
      this.localFallbackStore = existing as Map<string, T>;
      return;
    }
    tables.set(tableName, this.localFallbackStore);
    const seeds = tableName === "product_variants" && !initialDemoData.length
      ? demoVariantRows() as unknown as T[] : initialDemoData;
    for (const item of structuredClone(seeds)) {
      const id = item.id || randomUUID();
      this.localFallbackStore.set(id, { ...item, id });
    }
  }

  protected getClient() { return getServerSupabase(); }

  private demoStore(): Map<string, T> {
    if (!isDemoMode()) throw new DatabaseError("configure", this.tableName, "DATABASE_NOT_CONFIGURED");
    return this.localFallbackStore;
  }

  /** Supabase returned errors and transport failures share one safe failure path. */
  protected async execute<R>(operation: string, query: PromiseLike<{ data: R | null; error: any }>): Promise<R | null> {
    try {
      const result = await query;
      if (result.error) databaseError(operation, this.tableName, result.error);
      return result.data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      return databaseError(operation, this.tableName);
    }
  }

  private filters(query: any, filter?: Partial<Record<keyof T, any>>) {
    for (const [key, value] of Object.entries(filter || {})) {
      if (value === undefined) continue;
      query = value === null ? query.is(key, null) : query.eq(key, value);
    }
    return query;
  }

  async findById(id: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) return this.demoStore().get(id) || null;
    return await this.execute<T | null>("findById", client.from(this.tableName).select("*").eq("id", id).maybeSingle()) || null;
  }

  async findOne(filter: Partial<Record<keyof T, any>>): Promise<T | null> {
    const client = this.getClient();
    if (!client) return (await this.findMany(filter, { limit: 1 }))[0] || null;
    return await this.execute<T | null>("findOne", this.filters(client.from(this.tableName).select("*"), filter).maybeSingle()) || null;
  }

  async findMany(filter?: Partial<Record<keyof T, any>>, options?: QueryOptions<T>): Promise<T[]> {
    for (const value of [options?.limit, options?.offset]) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) throw new DatabaseError("findMany", this.tableName, "INVALID_ARGUMENT");
    }
    const client = this.getClient();
    if (options?.limit === 0) return [];
    if (!client) {
      let rows = Array.from(this.demoStore().values()).filter(item =>
        Object.entries(filter || {}).every(([key, value]) => value === undefined || (value === null ? (item as any)[key] == null : (item as any)[key] === value)),
      );
      if (options?.orderBy) {
        const key = options.orderBy;
        const direction = options.orderDirection === "desc" ? -1 : 1;
        rows.sort((a: any, b: any) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * direction || String(a.id).localeCompare(String(b.id)));
      }
      const from = options?.offset || 0;
      return rows.slice(from, options?.limit === undefined ? undefined : from + options.limit);
    }
    let query = this.filters(client.from(this.tableName).select(options?.select || "*"), filter);
    if (options?.orderBy) query = query.order(String(options.orderBy), { ascending: options.orderDirection !== "desc" });
    if (options?.orderBy && options.orderBy !== "id") query = query.order("id", { ascending: true });
    if (options?.limit !== undefined) {
      const from = options.offset || 0;
      query = query.range(from, from + options.limit - 1);
    } else if (options?.offset !== undefined) query = query.range(options.offset, options.offset + 9999);
    return await this.execute<T[]>("findMany", query) || [];
  }

  async create(data: Partial<T>): Promise<T> {
    const client = this.getClient();
    const row = { ...data, id: data.id || randomUUID() } as T;
    if (!client) {
      if (this.demoStore().has(row.id!)) throw new DatabaseError("create", this.tableName, "23505");
      this.demoStore().set(row.id!, row);
      return row;
    }
    const inserted = await this.execute<T | null>("create", client.from(this.tableName).insert(row).select().single());
    if (!inserted) throw new DatabaseError("create", this.tableName);
    return inserted;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const client = this.getClient();
    if (!client) {
      const existing = this.demoStore().get(id);
      if (!existing) return null;
      const row = { ...existing, ...data, id };
      if(["store_inventory","product_variants"].includes(this.tableName)){
        const {demoTransaction}=await import("@/lib/inventory/demoTransaction");
        return demoTransaction(async()=>{this.demoStore().set(id,row);const {stockEffects}=await import("@/lib/jobs/effects");await stockEffects(this.tableName,existing,row);return row;});
      }
      this.demoStore().set(id, row);
      return row;
    }
    const { id: ignoredId, ...patch } = data;
    return await this.execute<T | null>("update", client.from(this.tableName).update(patch as any).eq("id", id).select().maybeSingle()) || null;
  }

  async delete(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return this.demoStore().delete(id);
    const rows = await this.execute<Array<{ id: string }>>("delete", client.from(this.tableName).delete().eq("id", id).select("id"));
    return Boolean(rows?.length);
  }

  async count(filter?: Partial<Record<keyof T, any>>): Promise<number> {
    const client = this.getClient();
    if (!client) return (await this.findMany(filter)).length;
    const result = await this.execute<number>("count", Promise.resolve(this.filters(client.from(this.tableName).select("*", { count: "exact", head: true }), filter)).then((r: any) => ({ data: r.count, error: r.error })));
    return result || 0;
  }

  query() {
    const client = this.getClient();
    if (!client) throw new DatabaseError("query", this.tableName, "DEMO_QUERY_UNSUPPORTED");
    return client.from(this.tableName);
  }
}
