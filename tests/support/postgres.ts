import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Disposable PostgreSQL WASM engine: never opens network or loads .env files. */
export async function bootstrapPostgres(options: { legacyBroadGrants?: boolean } = {}) {
  const pg = new PGlite({ extensions: { pg_trgm, "uuid-ossp": uuid_ossp } });
  await pg.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant select on auth.users to service_role;
    create publication supabase_realtime;
    -- Minimal Storage metadata fixture, not an implementation of hosted Storage.
    create schema storage;
    create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated,service_role;
    grant all on storage.objects to anon,authenticated,service_role;
  `);
  const files = ["schema.sql", "migrations/20261105_phase2_architecture_upgrade.sql", "migrations/20261106090000_verified_auth_sessions.sql", "migrations/20261106120000_durable_feature_storage.sql", "migrations/20261106150000_trusted_checkout.sql", "migrations/20261106180000_inventory_transitions.sql", "migrations/20261106210000_midtrans_attempts.sql", "migrations/20261106230000_least_privilege.sql", "migrations/20261106233000_biteship_dispatch.sql", "migrations/20261107010000_refund_recovery.sql", "migrations/20261107040000_packaged_fulfillment.sql", "migrations/20261107070000_financial_reconciliation.sql", "migrations/20261107100000_durable_jobs.sql", "migrations/20261107130000_safe_media_storage.sql", "migrations/20261108100000_query_pagination.sql"];
  try {
    for (const file of files) {
      if(options.legacyBroadGrants && file.includes("least_privilege")) await pg.exec(`
        grant all on all tables in schema public to anon,authenticated,service_role;
        grant select(cost_price),update(cost_price) on public.products to anon,authenticated;
        grant execute on all functions in schema public to anon,authenticated,service_role;
        grant create on schema public to public;
        alter default privileges grant all on tables to anon,authenticated,service_role;
        alter default privileges grant execute on functions to public,anon,authenticated,service_role;
      `);
      await pg.exec(await readFile(path.join(process.cwd(), "supabase", file), "utf8"));
    }
    await pg.exec(await readFile(path.join(process.cwd(), "supabase/migrations/20261109090000_operational_controls.sql"), "utf8"));
    return pg;
  } catch (error) {
    await pg.close();
    throw error;
  }
}
