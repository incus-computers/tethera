import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (!process.argv.includes("--connected")) {
  console.log("No connected database was accessed. To run a read-only readiness check intentionally: npm run db:check -- --connected");
  console.log("Pending migrations are listed in docs/deployment-checklist.md.");
  process.exitCode = 2;
} else {
  for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);
  if (process.env.APP_ENV === "demo") {
    console.log("Demo mode uses isolated memory, not a connected database.");
    process.exitCode = 2;
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("Database readiness failed: a URL and service-role key are required.");
      process.exitCode = 1;
    } else {
      try {
        const database = createClient(url, key, {
          db: { retry: false },
          auth: { persistSession: false, autoRefreshToken: false },
          global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
        });
        const { data, error } = await database.rpc("application_schema_health");
        const version = await database.from("application_schema_versions").select("version").eq("version", "20261109090000_operational_controls").maybeSingle();
        if (error || data !== true || version.error || version.data?.version !== "20261109090000_operational_controls") {
          console.error("Database schema is not ready. Review pending migrations in docs/deployment-checklist.md.");
          process.exitCode = 1;
        } else {
          const security=await database.rpc("application_security_audit");
          if(security.error || security.data?.ok!==true){console.error("Database permission readiness failed. Review the least-privilege migration and role/grant drift.");process.exitCode=1;}
          else console.log("Read-only database schema and permission readiness passed. No migration or data mutation was performed.");
        }
      } catch {
        console.error("Database readiness check could not complete. Check configuration and connectivity.");
        process.exitCode = 1;
      }
    }
  }
}
