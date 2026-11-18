begin;
create table public.background_jobs(
 id text primary key default gen_random_uuid()::text,event_key text not null unique,kind text not null check(kind in ('order_invoice','order_notice','whatsapp_notice','email','stock_alert','marketplace_sync','marketplace_inbound','payment_review','inventory_expiry','payment_reconcile','shipping_reconcile','refund_reconcile','stock_scan')),
 resource_key text,payload jsonb not null,status text not null default 'pending' check(status in ('pending','running','retry','accepted','simulated','blocked','review','dead','cancelled')),
 attempts integer not null default 0 check(attempts>=0),available_at timestamptz not null default now(),lease_token text,lease_until timestamptz,
 request jsonb,remote_started_at timestamptz,provider_id text,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index background_jobs_ready_idx on public.background_jobs(status,available_at);
create index background_jobs_resource_idx on public.background_jobs(resource_key,status);
create table public.background_job_events(id text primary key default gen_random_uuid()::text,job_id text not null references public.background_jobs(id),attempt integer,status text not null,code text,actor text,reason text,created_at timestamptz not null default now());
create index background_job_events_job_idx on public.background_job_events(job_id,created_at);
create table public.worker_runs(id text primary key default gen_random_uuid()::text,started_at timestamptz not null default now(),finished_at timestamptz,status text not null default 'running',processed integer not null default 0);
create index worker_runs_recent_idx on public.worker_runs(started_at desc);
alter table public.background_jobs enable row level security;
alter table public.background_job_events enable row level security;
alter table public.worker_runs enable row level security;
revoke all on public.background_jobs,public.background_job_events,public.worker_runs from public,anon,authenticated,service_role;
grant select on public.background_jobs,public.background_job_events,public.worker_runs to service_role;
alter table public.marketplace_product_mappings add column variant_id text references public.product_variants(id);
alter table public.stock_notifications add column owner_id text,add column verified_contact boolean not null default false;
alter table public.payment_outbox add column expanded_at timestamptz;

create function public.enqueue_background_job(p_kind text,p_key text,p_payload jsonb,p_resource text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.background_jobs;
begin
 if length(p_key) not between 1 and 240 or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>250000 then raise exception using errcode='22023',message='Invalid background job';end if;
 insert into public.background_jobs(kind,event_key,payload,resource_key) values(p_kind,p_key,p_payload,p_resource) on conflict(event_key) do nothing;
 select * into j from public.background_jobs where event_key=p_key;
 if j.kind is distinct from p_kind or j.payload is distinct from p_payload or j.resource_key is distinct from p_resource then raise exception using errcode='PT409',message='Background key conflict';end if;
 return to_jsonb(j);
end;$$;
create function public.claim_background_job() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.background_jobs;
begin
 -- Serialize the short claim operation, not the provider call. Each resource has one owner.
 perform pg_advisory_xact_lock(hashtextextended('background_job_claim',0));
 update public.background_jobs set status=case when remote_started_at is not null and coalesce(request->>'provider','')<>'resend' then 'review' else 'retry' end,last_error='lease_expired',lease_token=null,lease_until=null,updated_at=now() where status='running' and lease_until<=now();
 update public.background_jobs set status=case when remote_started_at is not null then 'review' else 'dead' end,last_error='attempts_exhausted' where status in ('pending','retry') and attempts>=6;
 select b.* into j from public.background_jobs b where b.status in ('pending','retry') and b.available_at<=now() and b.attempts<6
 and (b.resource_key is null or not exists(select 1 from public.background_jobs x where x.id<>b.id and x.resource_key=b.resource_key and (x.status='running' or (x.status='review' and x.remote_started_at is not null))))
 order by b.available_at,b.created_at,b.id for update skip locked limit 1;
 if not found then return jsonb_build_object('job',null);end if;
 update public.background_jobs set status='running',attempts=attempts+1,lease_token=gen_random_uuid()::text,lease_until=now()+interval '90 seconds',updated_at=now() where id=j.id returning * into j;
 insert into public.background_job_events(job_id,attempt,status) values(j.id,j.attempts,'running');
 return jsonb_build_object('job',to_jsonb(j));
end;$$;
create function public.start_background_request(p_id text,p_token text,p_request jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.background_jobs;
begin
 select * into j from public.background_jobs where id=p_id for update;
 if not found or j.status<>'running' or j.lease_token is distinct from p_token or j.lease_until<=now() then raise exception using errcode='PT409',message='Worker lease lost';end if;
 if jsonb_typeof(p_request)<>'object' or octet_length(p_request::text)>250000 or (j.request is not null and j.request is distinct from p_request) then raise exception using errcode='PT409',message='Provider request changed';end if;
 update public.background_jobs set request=p_request,remote_started_at=coalesce(remote_started_at,now()),updated_at=now() where id=p_id returning * into j;return to_jsonb(j);
end;$$;
create function public.finish_background_job(p_id text,p_token text,p_status text,p_code text default null,p_provider_id text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.background_jobs;v_status text:=p_status;
begin
 select * into j from public.background_jobs where id=p_id for update;
 if not found or j.status<>'running' or j.lease_token is distinct from p_token or j.lease_until<=now() then raise exception using errcode='PT409',message='Worker lease lost';end if;
 if p_status not in ('accepted','simulated','blocked','review','dead','retry','cancelled') or length(coalesce(p_code,''))>100 or length(coalesce(p_provider_id,''))>200 then raise exception using errcode='22023',message='Invalid job outcome';end if;
 if p_status='retry' and j.attempts>=6 then v_status:=case when j.remote_started_at is not null then 'review' else 'dead' end;end if;
 update public.background_jobs set status=v_status,last_error=p_code,provider_id=coalesce(p_provider_id,provider_id),lease_token=null,lease_until=null,available_at=now()+make_interval(secs=>least(3600,(30*power(2,j.attempts-1))::integer)),updated_at=now() where id=p_id returning * into j;
 insert into public.background_job_events(job_id,attempt,status,code) values(p_id,j.attempts,v_status,p_code);
 if j.kind='stock_alert' and v_status in ('accepted','simulated') then update public.stock_notifications set notified_at=now() where id=j.payload->>'notificationId';end if;
 return to_jsonb(j);
end;$$;
create function public.repair_background_job(p_id text,p_action text,p_reason text,p_actor text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.background_jobs;v_status text;
begin
 select * into j from public.background_jobs where id=p_id for update;
 if not found or j.status not in ('retry','blocked','review','dead') or length(p_reason) not between 5 and 500 or coalesce(length(p_actor),0)<1 or p_action not in ('retry','resolve','cancel') then raise exception using errcode='PT409',message='Job not repairable';end if;
 if p_action='retry' and j.remote_started_at is not null and (coalesce(j.request->>'provider','')<>'resend' or j.remote_started_at<now()-interval '23 hours') then raise exception using errcode='PT409',message='Reconcile remote outcome first';end if;
 v_status:=case p_action when 'retry' then 'pending' when 'resolve' then 'accepted' else 'cancelled' end;
 update public.background_jobs set status=v_status,attempts=case when p_action='retry' then 0 else attempts end,available_at=now(),last_error=case when p_action='retry' then null else 'operator_'||p_action end,updated_at=now() where id=p_id returning * into j;
 insert into public.background_job_events(job_id,attempt,status,code,actor,reason) values(p_id,j.attempts,v_status,'operator_'||p_action,p_actor,p_reason);return to_jsonb(j);
end;$$;
create function public.record_worker_run(p_id text default null,p_status text default 'running',p_processed integer default 0) returns text language plpgsql security definer set search_path='' as $$
declare v_id text;
begin
 if p_id is null then insert into public.worker_runs default values returning id into v_id;return v_id;end if;
 if p_status not in ('completed','failed') or p_processed not between 0 and 20 then raise exception using errcode='22023',message='Invalid worker result';end if;
 update public.worker_runs set status=p_status,finished_at=now(),processed=p_processed where id=p_id and status='running';return p_id;
end;$$;
create function public.schedule_background_maintenance() returns boolean language plpgsql security definer set search_path='' as $$
declare v_kind text;v_bucket text:=floor(extract(epoch from now())/60)::bigint::text;
begin
 foreach v_kind in array array['inventory_expiry','payment_reconcile','shipping_reconcile','refund_reconcile','stock_scan'] loop
  -- At most one outstanding job per recurring task, including retries/parked failures.
  perform pg_advisory_xact_lock(hashtextextended('maintenance:'||v_kind,0));
  if not exists(select 1 from public.background_jobs where background_jobs.kind=v_kind and status in ('pending','retry','running')) then perform public.enqueue_background_job(v_kind,'maintenance:'||v_kind||':'||v_bucket,'{}',null);end if;
 end loop;return true;
end;$$;
create function public.order_background_effects() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.paid_at is null and new.paid_at is not null then
  perform public.enqueue_background_job('order_invoice','order:'||new.id||':paid:email',jsonb_build_object('orderId',new.id));
  perform public.enqueue_background_job('whatsapp_notice','order:'||new.id||':paid:whatsapp',jsonb_build_object('orderId',new.id,'status','payment_received'));
 elsif old.status is distinct from new.status and new.status::text in ('cancelled','ready_for_pickup','collected','on_delivery','partially_fulfilled','delivery_arrived','courier_failed','refunded','partially_refunded') then
  perform public.enqueue_background_job('order_notice','order:'||new.id||':status:'||new.status::text||':email',jsonb_build_object('orderId',new.id,'status',new.status));
  perform public.enqueue_background_job('whatsapp_notice','order:'||new.id||':status:'||new.status::text||':whatsapp',jsonb_build_object('orderId',new.id,'status',new.status));
 end if;return new;
end;$$;
create trigger order_background_effects after update of paid_at,status on public.orders for each row execute function public.order_background_effects();
create function public.stock_background_effects() returns trigger language plpgsql security definer set search_path='' as $$
declare m public.marketplace_product_mappings;v_variant text;v_change boolean;
begin
 if tg_table_name='store_inventory' then v_change:=new.stock_on_hand-new.stock_reserved is distinct from old.stock_on_hand-old.stock_reserved;v_variant:=null;
 else v_change:=new.stock_quantity-new.reserved_quantity is distinct from old.stock_quantity-old.reserved_quantity;v_variant:=new.id;end if;
 if v_change then
  for m in select * from public.marketplace_product_mappings where product_id=new.product_id and variant_id is not distinct from v_variant loop
   perform public.enqueue_background_job('marketplace_sync','stock:'||m.id||':'||gen_random_uuid()::text,jsonb_build_object('mappingId',m.id),'marketplace:'||m.id);
  end loop;
 end if;return new;
end;$$;
create trigger stock_background_effects after update on public.store_inventory for each row execute function public.stock_background_effects();
create trigger variant_background_effects after update on public.product_variants for each row execute function public.stock_background_effects();
create function public.expand_payment_outbox() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='payment_review' then perform public.enqueue_background_job('payment_review','payment-review:'||new.id,jsonb_build_object('orderId',new.order_id,'attemptId',new.attempt_id));end if;
 update public.payment_outbox set expanded_at=now() where id=new.id;return new;
end;$$;
create trigger expand_payment_outbox after insert on public.payment_outbox for each row execute function public.expand_payment_outbox();
-- Historical entries are exposed for review rather than automatically emailing old customers.
insert into public.background_jobs(event_key,kind,payload,status,last_error)
select 'legacy-payment:'||id,case when kind='payment_review' then 'payment_review' else 'order_invoice' end,jsonb_build_object('orderId',order_id),'review','legacy_unprocessed_outbox' from public.payment_outbox where delivered_at is null;
update public.payment_outbox set expanded_at=now() where expanded_at is null;

create function public.subscribe_stock_alert(p_product text,p_variant text,p_owner text,p_email text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.stock_notifications;
begin
 if not exists(select 1 from public.customer_profiles where id=p_owner and user_id is not null and lower(email)=lower(p_email)) or not exists(select 1 from public.products where id=p_product and is_active) or (p_variant is not null and not exists(select 1 from public.product_variants where id=p_variant and product_id=p_product and is_active)) then raise exception using errcode='22023',message='Verified owner and active product/variant required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_product||':'||coalesce(p_variant,'')||':'||lower(p_email),0));
 select * into n from public.stock_notifications where product_id=p_product and variant_id is not distinct from p_variant and lower(email)=lower(p_email) and notified_at is null for update;
 if found then update public.stock_notifications set owner_id=p_owner,verified_contact=true where id=n.id returning * into n;
 else insert into public.stock_notifications(product_id,variant_id,owner_id,email,verified_contact) values(p_product,p_variant,p_owner,lower(p_email),true) returning * into n;end if;return to_jsonb(n);
end;$$;
create function public.enqueue_stock_alerts(p_limit integer default 50) returns integer language plpgsql security definer set search_path='' as $$
declare n public.stock_notifications;v_count integer:=0;
begin
 if p_limit not between 1 and 100 then raise exception using errcode='22023',message='Invalid alert batch';end if;
 for n in select s.* from public.stock_notifications s join public.products p on p.id=s.product_id and p.is_active where s.notified_at is null and s.verified_contact and s.email is not null
 and not exists(select 1 from public.background_jobs j where j.event_key='stock-alert:'||s.id)
 and (case when s.variant_id is null then not exists(select 1 from public.product_variants where product_id=s.product_id and is_active) and coalesce((select sum(stock_on_hand-stock_reserved) from public.store_inventory where product_id=s.product_id),0)>0
 else exists(select 1 from public.product_variants where id=s.variant_id and product_id=s.product_id and is_active and stock_quantity-reserved_quantity>0) end)
 order by s.created_at for update of s skip locked limit p_limit loop
  perform public.enqueue_background_job('stock_alert','stock-alert:'||n.id,jsonb_build_object('notificationId',n.id));v_count:=v_count+1;
 end loop;return v_count;
end;$$;
revoke all on function public.enqueue_background_job(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.enqueue_background_job(text,text,jsonb,text) to service_role;
revoke all on function public.claim_background_job() from public,anon,authenticated;
grant execute on function public.claim_background_job() to service_role;
revoke all on function public.start_background_request(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.start_background_request(text,text,jsonb) to service_role;
revoke all on function public.finish_background_job(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.finish_background_job(text,text,text,text,text) to service_role;
revoke all on function public.repair_background_job(text,text,text,text) from public,anon,authenticated;
grant execute on function public.repair_background_job(text,text,text,text) to service_role;
revoke all on function public.record_worker_run(text,text,integer) from public,anon,authenticated;
grant execute on function public.record_worker_run(text,text,integer) to service_role;
revoke all on function public.schedule_background_maintenance() from public,anon,authenticated;
grant execute on function public.schedule_background_maintenance() to service_role;
revoke all on function public.subscribe_stock_alert(text,text,text,text) from public,anon,authenticated;
grant execute on function public.subscribe_stock_alert(text,text,text,text) to service_role;
revoke all on function public.enqueue_stock_alerts(integer) from public,anon,authenticated;
grant execute on function public.enqueue_stock_alerts(integer) to service_role;
revoke all on function public.order_background_effects() from public,anon,authenticated,service_role;
revoke all on function public.stock_background_effects() from public,anon,authenticated,service_role;
revoke all on function public.expand_payment_outbox() from public,anon,authenticated,service_role;
alter function public.application_security_tables() rename to application_financial_security_tables;
create function public.application_security_tables() returns setof text language sql immutable set search_path='' as $$select public.application_financial_security_tables() union all select unnest(array['background_jobs','background_job_events','worker_runs']);$$;
revoke all on function public.application_security_tables(),public.application_financial_security_tables() from public,anon,authenticated,service_role;
alter function public.application_security_audit() rename to application_financial_security_audit;
revoke all on function public.application_financial_security_audit() from public,anon,authenticated,service_role;
create function public.application_security_audit() returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;v jsonb;t text;f regprocedure;
begin
 r:=public.application_financial_security_audit();v:=r->'violations';
 foreach t in array array['background_jobs','background_job_events','worker_runs'] loop
  if has_any_column_privilege('anon','public.'||t,'SELECT') or has_any_column_privilege('authenticated','public.'||t,'SELECT') or has_any_column_privilege('service_role','public.'||t,'INSERT,UPDATE') or has_table_privilege('service_role','public.'||t,'DELETE,TRUNCATE') then v:=v||jsonb_build_array('background_table_access:'||t);end if;
 end loop;
 foreach t in array array['enqueue_background_job(text,text,jsonb,text)','claim_background_job()','start_background_request(text,text,jsonb)','finish_background_job(text,text,text,text,text)','repair_background_job(text,text,text,text)','record_worker_run(text,text,integer)','schedule_background_maintenance()','subscribe_stock_alert(text,text,text,text)','enqueue_stock_alerts(integer)','order_background_effects()','stock_background_effects()','expand_payment_outbox()','application_background_schema_health()','application_financial_security_tables()','application_financial_security_audit()'] loop
  f:=to_regprocedure('public.'||t);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then v:=v||jsonb_build_array('background_function_access:'||t);end if;
  if f is not null and not coalesce((select 'search_path=""'=any(proconfig) from pg_proc where oid=f),false) then v:=v||jsonb_build_array('background_function_search_path:'||t);end if;
 end loop;
 foreach t in array array['order_background_effects','stock_background_effects','variant_background_effects','expand_payment_outbox'] loop
  if not exists(select 1 from pg_trigger where tgname=t and not tgisinternal and tgenabled in ('O','A')) then v:=v||jsonb_build_array('missing_background_trigger:'||t);end if;
 end loop;
 return jsonb_build_object('ok',jsonb_array_length(v)=0,'violations',v);
end;$$;
revoke all on function public.application_security_audit() from public,anon,authenticated;
grant execute on function public.application_security_audit() to service_role;
insert into public.application_schema_versions(version) values('20261107100000_durable_jobs');
alter function public.application_schema_health() rename to application_background_schema_health;
revoke all on function public.application_background_schema_health() from public,anon,authenticated,service_role;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$select public.application_background_schema_health() and exists(select 1 from public.application_schema_versions where version='20261107100000_durable_jobs') and (public.application_security_audit()->>'ok')::boolean;$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
