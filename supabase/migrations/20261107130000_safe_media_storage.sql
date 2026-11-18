-- Step 14. Run once, after durable_jobs, in the same Supabase SQL editor.
begin;
create table public.media_assets (
 id uuid primary key check (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
 file_name text not null unique check (file_name=id::text||'.webp'),
 sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
 size_bytes integer not null check (size_bytes between 1 and 5242880),
 width integer not null check (width between 1 and 2560),
 height integer not null check (height between 1 and 2560),
 created_by text not null check (length(created_by) between 1 and 200),
 created_at timestamptz not null default now()
);
alter table public.media_assets enable row level security;
revoke all on public.media_assets from public,anon,authenticated,service_role;
grant select,insert on public.media_assets to service_role;

-- Only this dedicated bucket is affected. Never modify storage.objects metadata
-- directly: object creation/deletion still goes through the Storage API.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('catalog-media-v1','catalog-media-v1',false,5242880,array['image/webp'])
on conflict (id) do nothing;
-- Restrictive policies also constrain any existing broad permissive policies.
create policy catalog_media_server_only on storage.objects as restrictive for all to public
using (bucket_id <> 'catalog-media-v1') with check (bucket_id <> 'catalog-media-v1');

create function public.application_media_storage_health() returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from storage.buckets where id='catalog-media-v1' and not public and file_size_limit=5242880 and allowed_mime_types=array['image/webp'])
 and coalesce((select relrowsecurity from pg_class where oid='storage.objects'::regclass),false)
 and exists(select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='catalog_media_server_only'
   and not polpermissive and polcmd='*' and polroles=array[0::oid]
   and pg_get_expr(polqual,polrelid)='(bucket_id <> ''catalog-media-v1''::text)'
   and pg_get_expr(polwithcheck,polrelid)='(bucket_id <> ''catalog-media-v1''::text)');
$$;
revoke all on function public.application_media_storage_health() from public,anon,authenticated;
grant execute on function public.application_media_storage_health() to service_role;

alter function public.application_security_tables() rename to application_job_security_tables;
create function public.application_security_tables() returns setof text language sql immutable set search_path='' as $$
 select public.application_job_security_tables() union all select 'media_assets'::text;
$$;
revoke all on function public.application_security_tables(),public.application_job_security_tables() from public,anon,authenticated,service_role;
alter function public.application_security_audit() rename to application_job_security_audit;
revoke all on function public.application_job_security_audit() from public,anon,authenticated,service_role;
create function public.application_security_audit() returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;v jsonb;t text;f regprocedure;
begin
 r:=public.application_job_security_audit();v:=r->'violations';
 if has_any_column_privilege('anon','public.media_assets','SELECT') or has_any_column_privilege('authenticated','public.media_assets','SELECT')
 or has_any_column_privilege('service_role','public.media_assets','UPDATE') or has_table_privilege('service_role','public.media_assets','DELETE,TRUNCATE') then
  v:=v||jsonb_build_array('media_manifest_access');end if;
 if not public.application_media_storage_health() then v:=v||jsonb_build_array('media_storage_configuration');end if;
 foreach t in array array['application_media_storage_health()','application_job_security_tables()','application_job_security_audit()','application_job_schema_health()'] loop
  f:=to_regprocedure('public.'||t);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then v:=v||jsonb_build_array('media_function_access:'||t);end if;
  if f is not null and not coalesce((select 'search_path=""'=any(proconfig) from pg_proc where oid=f),false) then v:=v||jsonb_build_array('media_function_search_path:'||t);end if;
 end loop;
 return jsonb_build_object('ok',jsonb_array_length(v)=0,'violations',v);
end;$$;
revoke all on function public.application_security_audit() from public,anon,authenticated;
grant execute on function public.application_security_audit() to service_role;
insert into public.application_schema_versions(version) values('20261107130000_safe_media_storage');
alter function public.application_schema_health() rename to application_job_schema_health;
revoke all on function public.application_job_schema_health() from public,anon,authenticated,service_role;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$
 select public.application_job_schema_health() and exists(select 1 from public.application_schema_versions where version='20261107130000_safe_media_storage') and (public.application_security_audit()->>'ok')::boolean;
$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
