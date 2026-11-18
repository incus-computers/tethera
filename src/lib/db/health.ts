import "server-only";
import { getServerSupabase } from "./client";
import { DatabaseError, databaseError } from "./errors";
export async function checkDatabaseReadiness(): Promise<"demo" | "ready"> {
  const client = getServerSupabase();
  if (!client) return "demo";
  const { data, error } = await client.rpc("application_schema_health");
  if (error) databaseError("readiness", "database", error);
  if (data !== true) throw new DatabaseError("readiness", "database", "SCHEMA_NOT_READY");
  const version = await client.from("application_schema_versions").select("version").eq("version", "20261109090000_operational_controls").maybeSingle();
  if (version.error || version.data?.version !== "20261109090000_operational_controls") throw new DatabaseError("readiness", "database", "SCHEMA_NOT_READY");
  return "ready";
}
