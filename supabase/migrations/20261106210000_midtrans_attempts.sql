begin;
create table public.payment_attempts(
 id text primary key default gen_random_uuid()::text,
 order_id text not null unique references public.orders(id),
 provider_order_id text not null unique,
 amount numeric(12,2) not null check(amount>0 and amount=trunc(amount)),
 currency text not null default 'IDR' check(currency='IDR'),
 merchant_id text not null,
 environment text not null check(environment in ('sandbox','production')),
 state text not null default 'creating' check(state in ('creating','pending','settled','cancelled','review')),
 redirect_url text,
 transaction_id text,expires_at timestamptz not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index payment_attempts_recovery_idx on public.payment_attempts(state,updated_at);
create table public.payment_events(
 id text primary key default gen_random_uuid()::text,
 attempt_id text not null references public.payment_attempts(id),event_key text not null,
 evidence jsonb not null,outcome jsonb not null,created_at timestamptz not null default now(),unique(attempt_id,event_key)
);
create table public.payment_outbox(
 id text primary key,attempt_id text not null references public.payment_attempts(id),order_id text not null references public.orders(id),
 kind text not null check(kind in ('payment_settled','payment_review')),created_at timestamptz not null default now(),delivered_at timestamptz
);
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_outbox enable row level security;
revoke all on public.payment_attempts,public.payment_events,public.payment_outbox from public,anon,authenticated;
grant select,update on public.payment_attempts to service_role;
grant select on public.payment_events,public.payment_outbox to service_role;
create function public.prepare_midtrans_attempt(p_order_id text,p_environment text,p_merchant_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders;a public.payment_attempts;v_id text:=gen_random_uuid()::text;
begin
 if p_environment not in ('sandbox','production') or p_merchant_id is null or length(p_merchant_id) not between 1 and 100 then raise exception using errcode='22023',message='Invalid gateway configuration';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then return jsonb_build_object('success',false,'error','Order not found.');end if;
 select * into a from public.payment_attempts where order_id=o.id;
 if found then return jsonb_build_object('success',true,'may_create',false,'attempt',to_jsonb(a));end if;
 if o.paid_at is not null or o.status not in ('pending_payment','order_received')
 or not exists(select 1 from public.inventory_reservations where order_id=o.id and status='reserved')
 or exists(select 1 from public.inventory_reservations where order_id=o.id and (status<>'reserved' or expires_at<=now()+interval '2 minutes')) then
  return jsonb_build_object('success',false,'error','Order has no active payment reservation.');
 end if;
 insert into public.payment_attempts(id,order_id,provider_order_id,amount,merchant_id,environment,expires_at)
 values(v_id,o.id,'PAY-'||v_id,o.total,p_merchant_id,p_environment,(select min(expires_at) from public.inventory_reservations where order_id=o.id and status='reserved')) returning * into a;
 return jsonb_build_object('success',true,'may_create',true,'attempt',to_jsonb(a));
end;
$$;
create function public.save_midtrans_redirect(p_attempt_id text,p_redirect text) returns boolean language plpgsql security definer set search_path='' as $$
declare a public.payment_attempts;
begin
 select * into a from public.payment_attempts where id=p_attempt_id for update;
 if not found or p_redirect !~ (case when a.environment='sandbox' then '^https://app\.sandbox\.midtrans\.com/snap/' else '^https://app\.midtrans\.com/snap/' end) then raise exception using errcode='22023',message='Invalid payment redirect';end if;
 update public.payment_attempts set redirect_url=coalesce(redirect_url,p_redirect),state=case when state='creating' then 'pending' else state end,updated_at=now() where id=a.id;
 return true;
end;
$$;
create function public.apply_midtrans_evidence(p_attempt_id text,p_evidence jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.payment_attempts;r jsonb;v_key text;v_status text:=p_evidence->>'transaction_status';v_settle boolean;v_cancel boolean;v_order_id text;v_state text;
begin
 -- Order before attempt matches preparation lock order and the inventory worker.
 select order_id into v_order_id from public.payment_attempts where id=p_attempt_id;
 perform 1 from public.orders where id=v_order_id for update;
 select * into a from public.payment_attempts where id=p_attempt_id for update;
 if not found then raise exception using errcode='22023',message='Unknown payment attempt';end if;
 if p_evidence->>'order_id' is distinct from a.provider_order_id or p_evidence->>'merchant_id' is distinct from a.merchant_id
 or p_evidence->>'currency' is distinct from 'IDR' or (p_evidence->>'gross_amount')::numeric is distinct from a.amount
 or coalesce(length(p_evidence->>'transaction_id'),0) not between 1 and 200
 or (a.transaction_id is not null and a.transaction_id is distinct from p_evidence->>'transaction_id')
 or v_status is null or v_status not in ('pending','capture','settlement','cancel','deny','expire','refund','partial_refund') then raise exception using errcode='22023',message='Payment evidence mismatch';end if;
 v_key:=(p_evidence->>'transaction_id')||':'||v_status||':'||coalesce(p_evidence->>'fraud_status','');
 if exists(select 1 from public.payment_events where attempt_id=a.id and event_key=v_key) then return jsonb_build_object('state',a.state,'replayed',true);end if;
 v_settle:=(v_status='settlement' and coalesce(p_evidence->>'fraud_status','accept')='accept') or (v_status='capture' and p_evidence->>'fraud_status'='accept');
 v_cancel:=v_status in ('cancel','deny','expire') or (v_status='capture' and p_evidence->>'fraud_status'='deny');v_state:=a.state;
 if v_status in ('refund','partial_refund') then v_state:='review';
 elsif v_settle then
  r:=public.transition_order_inventory(a.order_id,'settle',p_evidence->>'transaction_id','',a.amount);
  v_state:=case when (r->>'success')::boolean then 'settled' else 'review' end;
 elsif v_cancel and a.state not in ('settled','review') then
  r:=public.transition_order_inventory(a.order_id,'cancel','','Provider cancelled or expired payment.',a.amount);
  v_state:=case when (r->>'success')::boolean then 'cancelled' else 'review' end;
 elsif a.state='creating' then v_state:='pending';end if;
 update public.payment_attempts set state=v_state,transaction_id=p_evidence->>'transaction_id',updated_at=now() where id=a.id;
 insert into public.payment_events(attempt_id,event_key,evidence,outcome) values(a.id,v_key,p_evidence,jsonb_build_object('state',v_state,'inventory',r));
 if v_state in ('settled','review') then
  insert into public.payment_outbox(id,attempt_id,order_id,kind) values(a.id||':'||v_state,a.id,a.order_id,case when v_state='settled' then 'payment_settled' else 'payment_review' end) on conflict do nothing;
 end if;
 return jsonb_build_object('state',v_state,'replayed',false);
end;
$$;
revoke all on function public.prepare_midtrans_attempt(text,text,text),public.save_midtrans_redirect(text,text),public.apply_midtrans_evidence(text,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_midtrans_attempt(text,text,text),public.save_midtrans_redirect(text,text),public.apply_midtrans_evidence(text,jsonb) to service_role;
insert into public.application_schema_versions(version) values('20261106210000_midtrans_attempts');
alter function public.application_schema_health() rename to application_inventory_schema_health;
revoke all on function public.application_inventory_schema_health() from public,anon,authenticated;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$
 select public.application_inventory_schema_health() and exists(select 1 from public.application_schema_versions where version='20261106210000_midtrans_attempts')
 and to_regprocedure('public.apply_midtrans_evidence(text,jsonb)') is not null and to_regprocedure('public.prepare_midtrans_attempt(text,text,text)') is not null;
$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
