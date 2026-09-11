import "server-only";
import { getServerSupabase } from "../client";

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

  constructor(tableName: string, initialFallbackData: T[] = []) {
    this.tableName = tableName;
    initialFallbackData.forEach((item) => {
      const id = (item as any).id || (item as any).slug || (item as any).sku || String(Math.random());
      this.localFallbackStore.set(String(id), item);
    });
  }

  /**
   * Get direct reference to Supabase client if available.
   */
  protected getClient() {
    return getServerSupabase();
  }

  /**
   * Find a single record by its ID.
   */
  async findById(id: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) {
      return this.localFallbackStore.get(id) || null;
    }

    const { data, error } = await client
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[DB ${this.tableName}] findById error:`, error.message);
      return this.localFallbackStore.get(id) || null;
    }

    return (data as unknown as T) || null;
  }

  /**
   * Find a single record matching specific criteria.
   */
  async findOne(filter: Partial<Record<keyof T, any>>): Promise<T | null> {
    const client = this.getClient();
    if (!client) {
      const items = Array.from(this.localFallbackStore.values());
      for (const item of items) {
        const matches = Object.entries(filter).every(
          ([k, v]) => (item as any)[k] === v
        );
        if (matches) return item;
      }
      return null;
    }

    let query = client.from(this.tableName).select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error(`[DB ${this.tableName}] findOne error:`, error.message);
      return null;
    }

    return (data as unknown as T) || null;
  }

  /**
   * Query multiple records with optional filtering, sorting, and pagination.
   */
  async findMany(
    filter?: Partial<Record<keyof T, any>>,
    options?: QueryOptions<T>
  ): Promise<T[]> {
    const client = this.getClient();
    if (!client) {
      let results = Array.from(this.localFallbackStore.values());
      if (filter) {
        results = results.filter((item) =>
          Object.entries(filter).every(([k, v]) => (item as any)[k] === v)
        );
      }
      if (options?.orderBy) {
        const orderKey = options.orderBy as string;
        const asc = options.orderDirection !== "desc";
        results.sort((a: any, b: any) => {
          if (a[orderKey] < b[orderKey]) return asc ? -1 : 1;
          if (a[orderKey] > b[orderKey]) return asc ? 1 : -1;
          return 0;
        });
      }
      if (options?.offset !== undefined || options?.limit !== undefined) {
        const start = options.offset || 0;
        const end = options.limit ? start + options.limit : undefined;
        results = results.slice(start, end);
      }
      return results;
    }

    let query = client.from(this.tableName).select(options?.select || "*");

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    if (options?.orderBy) {
      query = query.order(String(options.orderBy), {
        ascending: options.orderDirection !== "desc",
      });
    }

    if (options?.limit !== undefined) {
      const from = options.offset || 0;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    } else if (options?.offset !== undefined) {
      query = query.range(options.offset, options.offset + 9999);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[DB ${this.tableName}] findMany error:`, error.message);
      return Array.from(this.localFallbackStore.values());
    }

    return (data as unknown as T[]) || [];
  }

  /**
   * Insert a new record into the database table.
   */
  async create(data: Partial<T>): Promise<T> {
    const client = this.getClient();
    const id = (data as any).id || crypto.randomUUID();
    const newRecord = { ...data, id } as T;

    if (!client) {
      this.localFallbackStore.set(id, newRecord);
      return newRecord;
    }

    const { data: inserted, error } = await (client
      .from(this.tableName)
      .insert(data as any)
      .select()
      .single() as any);

    if (error) {
      console.error(`[DB ${this.tableName}] create error:`, error.message);
      this.localFallbackStore.set(id, newRecord);
      return newRecord;
    }

    return inserted as unknown as T;
  }

  /**
   * Update an existing record by ID.
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const client = this.getClient();
    if (!client) {
      const existing = this.localFallbackStore.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      this.localFallbackStore.set(id, updated);
      return updated;
    }

    const { data: updated, error } = await (client
      .from(this.tableName)
      .update(data as any)
      .eq("id", id)
      .select()
      .maybeSingle() as any);

    if (error) {
      console.error(`[DB ${this.tableName}] update error:`, error.message);
      const existing = this.localFallbackStore.get(id);
      if (existing) {
        const merged = { ...existing, ...data };
        this.localFallbackStore.set(id, merged);
        return merged;
      }
      return null;
    }

    return (updated as unknown as T) || null;
  }

  /**
   * Delete a record by ID.
   */
  async delete(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      return this.localFallbackStore.delete(id);
    }

    const { error } = await client.from(this.tableName).delete().eq("id", id);
    if (error) {
      console.error(`[DB ${this.tableName}] delete error:`, error.message);
      return false;
    }
    this.localFallbackStore.delete(id);
    return true;
  }

  /**
   * Count records matching optional filter.
   */
  async count(filter?: Partial<Record<keyof T, any>>): Promise<number> {
    const client = this.getClient();
    if (!client) {
      if (!filter) return this.localFallbackStore.size;
      return (await this.findMany(filter)).length;
    }

    let query = client.from(this.tableName).select("*", { count: "exact", head: true });
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        query = query.eq(key, value);
      }
    }

    const { count, error } = await query;
    if (error) {
      console.error(`[DB ${this.tableName}] count error:`, error.message);
      return this.localFallbackStore.size;
    }
    return count || 0;
  }

  /**
   * Access the raw Supabase query builder for advanced table operations.
   */
  query() {
    const client = this.getClient();
    if (!client) {
      throw new Error(
        `[DB ${this.tableName}] Cannot perform advanced query: Supabase client is not configured.`
      );
    }
    return client.from(this.tableName);
  }
}
