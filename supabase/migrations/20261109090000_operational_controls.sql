begin;

create table public.api_rate_budgets (
 key text primary key check(length(key) between 1 and 100),
 attempts integer not null check(attempts>=0),
 expires_at timestamptz not null
);
create index api_rate_budgets_expiry_idx on public.api_rate_budgets(expires_at);
alter table public.api_rate_budgets enable row level security;
revoke all on public.api_rate_budgets from public,anon,authenticated,service_role;
grant select on public.api_rate_budgets to service_role;

-- One lock per endpoint group and minute serializes global and network budgets
-- across all app instances. No raw IP, cookie, email or request URL is stored.
create function public.consume_api_budget(p_key text,p_scope text,p_limit integer,p_global_limit integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare bucket timestamptz:=date_trunc('minute',clock_timestamp());g text;n text;c integer;
begin
 if p_key is null or p_key!~'^[a-f0-9]{64}$' or p_scope is null or p_scope not in('auth','shipping','invoice','checkout','webhooks','internal','bulk','privacy','read','write') or p_limit is null or p_limit not between 1 and 10000 or p_global_limit is null or p_global_limit not between 1 and 10000 then raise exception 'invalid_budget' using errcode='22023';end if;
 g:='global:'||p_scope||':'||extract(epoch from bucket)::bigint::text;
 n:=p_key||':'||extract(epoch from bucket)::bigint::text;
 perform pg_advisory_xact_lock(hashtextextended(g,0));
 insert into public.api_rate_budgets(key,attempts,expires_at) values(g,1,bucket+interval '1 minute')
 on conflict(key) do update set attempts=least(public.api_rate_budgets.attempts+1,p_global_limit+1) returning attempts into c;
 if c>p_global_limit then return false;end if;
 insert into public.api_rate_budgets(key,attempts,expires_at) values(n,1,bucket+interval '1 minute')
 on conflict(key) do update set attempts=least(public.api_rate_budgets.attempts+1,p_limit+1) returning attempts into c;
 return c<=p_limit;
end;$$;
revoke all on function public.consume_api_budget(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_api_budget(text,text,integer,integer) to service_role;

create table public.privacy_requests (
 id text primary key default gen_random_uuid()::text,
 customer_id text not null references public.customer_profiles(id),
 kind text not null check(kind in('access','erasure','correction')),
 status text not null default 'requested' check(status in('requested','in_review','completed','declined')),
 requester_notes text not null default '' check(length(requester_notes)<=2000),
 response_notes text not null default '' check(length(response_notes)<=2000),
 internal_evidence text not null default '' check(length(internal_evidence)<=2000),
 decided_by text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index privacy_requests_one_open_idx on public.privacy_requests(customer_id,kind) where status in('requested','in_review');
create index privacy_requests_owner_idx on public.privacy_requests(customer_id,created_at desc,id);
create index privacy_requests_status_idx on public.privacy_requests(status,created_at,id);
create table public.privacy_request_events (
 id text primary key default gen_random_uuid()::text,
 request_id text not null references public.privacy_requests(id),
 actor_id text not null,
 status text not null check(status in('requested','in_review','completed','declined')),
 evidence text not null default '' check(length(evidence)<=2000),
 created_at timestamptz not null default now()
);
alter table public.privacy_requests enable row level security;
alter table public.privacy_request_events enable row level security;
revoke all on public.privacy_requests,public.privacy_request_events from public,anon,authenticated,service_role;
grant select on public.privacy_requests,public.privacy_request_events to service_role;

create function public.submit_privacy_request(p_owner text,p_kind text,p_notes text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.privacy_requests;
begin
 if p_kind is null or p_kind not in('access','erasure','correction') or p_notes is null or length(p_notes)>2000 then raise exception 'invalid_request' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('privacy:'||p_owner,0));
 select * into r from public.privacy_requests where customer_id=p_owner and kind=p_kind and status in('requested','in_review');
 if found then return to_jsonb(r);end if;
 if (select count(*) from public.privacy_requests where customer_id=p_owner and created_at>now()-interval '24 hours')>=5 then raise exception 'privacy_request_limit' using errcode='P0001';end if;
 insert into public.privacy_requests(customer_id,kind,requester_notes) values(p_owner,p_kind,p_notes) returning * into r;
 insert into public.privacy_request_events(request_id,actor_id,status) values(r.id,p_owner,'requested');
 return to_jsonb(r);
end;$$;
create function public.review_privacy_request(p_id text,p_status text,p_actor text,p_response text,p_evidence text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.privacy_requests;
begin
 if p_status is null or p_status not in('in_review','completed','declined') or p_actor is null or length(p_actor) not between 1 and 200 or p_response is null or length(p_response) not between 5 and 2000 or p_evidence is null or length(p_evidence) not between 5 and 2000 then raise exception 'invalid_review' using errcode='22023';end if;
 select * into r from public.privacy_requests where id=p_id for update;
 if not found then raise exception 'request_missing' using errcode='P0001';end if;
 if r.status in('completed','declined') or (p_status in('completed','declined') and r.status<>'in_review') then raise exception 'invalid_transition' using errcode='P0001';end if;
 update public.privacy_requests set status=p_status,response_notes=p_response,internal_evidence=p_evidence,decided_by=p_actor,updated_at=now() where id=p_id returning * into r;
 insert into public.privacy_request_events(request_id,actor_id,status,evidence) values(p_id,p_actor,p_status,p_evidence);
 return to_jsonb(r);
end;$$;
revoke all on function public.submit_privacy_request(text,text,text),public.review_privacy_request(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_privacy_request(text,text,text),public.review_privacy_request(text,text,text,text,text) to service_role;

-- Only already-expired security state is removed. No orders, audits, financial
-- evidence, queue payloads, customer profiles or privacy records are purged.
create function public.run_operational_hygiene() returns jsonb language plpgsql security definer set search_path='' as $$
declare b integer;s integer;
begin
 delete from public.api_rate_budgets where key in(select key from public.api_rate_budgets where expires_at<=now() order by expires_at limit 25000);get diagnostics b=row_count;
 delete from public.auth_sessions where ctid in(select ctid from public.auth_sessions where expires_at<=now() limit 1000);get diagnostics s=row_count;
 return jsonb_build_object('expiredBudgets',b,'expiredSessions',s);
end;$$;
revoke all on function public.run_operational_hygiene() from public,anon,authenticated;
grant execute on function public.run_operational_hygiene() to service_role;

alter function public.application_security_audit() rename to application_collection_security_audit;
revoke all on function public.application_collection_security_audit() from public,anon,authenticated,service_role;
create function public.application_security_audit() returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;v jsonb;t text;f regprocedure;
begin
 r:=public.application_collection_security_audit();v:=r->'violations';
 foreach t in array array['api_rate_budgets','privacy_requests','privacy_request_events'] loop
  if not exists(select 1 from pg_class where oid=to_regclass('public.'||t) and relrowsecurity) then v:=v||jsonb_build_array('operations_rls:'||t);end if;
  if has_table_privilege('anon','public.'||t,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.'||t,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('service_role','public.'||t,'INSERT,UPDATE,DELETE') then v:=v||jsonb_build_array('operations_acl:'||t);end if;
 end loop;
 foreach t in array array['consume_api_budget(text,text,integer,integer)','submit_privacy_request(text,text,text)','review_privacy_request(text,text,text,text,text)','run_operational_hygiene()','application_collection_security_audit()','application_collection_schema_health()'] loop
  f:=to_regprocedure('public.'||t);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then v:=v||jsonb_build_array('operations_function_access:'||t);end if;
  if f is not null and not coalesce((select 'search_path=""'=any(proconfig) from pg_proc where oid=f),false) then v:=v||jsonb_build_array('operations_search_path:'||t);end if;
  if f is not null and t not like 'application_collection_%' and not has_function_privilege('service_role',f,'EXECUTE') then v:=v||jsonb_build_array('operations_service_execute:'||t);end if;
 end loop;
 foreach t in array array['api_rate_budgets_expiry_idx','privacy_requests_one_open_idx','privacy_requests_owner_idx','privacy_requests_status_idx'] loop
  if not exists(select 1 from pg_index where indexrelid=to_regclass('public.'||t) and indisvalid and indisready) then v:=v||jsonb_build_array('operations_index_missing:'||t);end if;
 end loop;
 foreach t in array array['api_rate_budgets.key','api_rate_budgets.attempts','api_rate_budgets.expires_at','privacy_requests.customer_id','privacy_requests.requester_notes','privacy_requests.response_notes','privacy_requests.internal_evidence','privacy_request_events.actor_id','privacy_request_events.evidence'] loop
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=split_part(t,'.',1) and column_name=split_part(t,'.',2)) then v:=v||jsonb_build_array('operations_column_missing:'||t);end if;
 end loop;
 return jsonb_build_object('ok',jsonb_array_length(v)=0,'violations',v);
end;$$;
revoke all on function public.application_security_audit() from public,anon,authenticated;
grant execute on function public.application_security_audit() to service_role;
insert into public.application_schema_versions(version) values('20261109090000_operational_controls');
alter function public.application_schema_health() rename to application_collection_schema_health;
revoke all on function public.application_collection_schema_health() from public,anon,authenticated,service_role;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$select public.application_collection_schema_health() and exists(select 1 from public.application_schema_versions where version='20261109090000_operational_controls') and (public.application_security_audit()->>'ok')::boolean;$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
