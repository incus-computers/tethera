import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode } from "@/lib/runtime/environment";
import { DatabaseError } from "./errors";
let cached: { url: string; key: string; client: SupabaseClient } | null = null;

export function isSupabaseConfigured(): boolean {
  if (isDemoMode()) return false;
  return Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Null means explicit demo storage, never missing live configuration. */
export function getServerSupabase(): SupabaseClient | null {
  if (isDemoMode()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new DatabaseError("configure", "database", "DATABASE_NOT_CONFIGURED");
  if (cached?.url === url && cached.key === key) return cached.client;
  try {
    const client = createClient(url, key, {
      db: { retry: false },
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(10000) }) },
    });
    cached = { url, key, client };
    return client;
  } catch {
    throw new DatabaseError("configure", "database", "DATABASE_NOT_CONFIGURED");
  }
}
