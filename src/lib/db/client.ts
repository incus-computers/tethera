import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedServerClient: SupabaseClient | null = null;
let hasLoggedConfigWarning = false;

/**
 * Returns true if Supabase URL and service role/anon keys are provided in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

/**
 * Get the server-side Supabase client singleton.
 * Uses the privileged SUPABASE_SERVICE_ROLE_KEY for server-side trusted operations,
 * completely isolated from browser clients.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (cachedServerClient) {
    return cachedServerClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (!hasLoggedConfigWarning && process.env.NODE_ENV !== "production") {
      console.warn(
        "[DB SERVER] Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) not found in environment. Database repositories will operate with graceful mock fallback mode."
      );
      hasLoggedConfigWarning = true;
    }
    return null;
  }

  cachedServerClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedServerClient;
}
