-- Step 1: provider-verified, server-revocable sessions. Apply to staging first.
create table if not exists public.auth_sessions (
  token_hash text not null,
  kind text not null check (kind in ('customer','admin')),
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (token_hash, kind)
);
create index if not exists auth_sessions_expiry_idx on public.auth_sessions(expires_at);
alter table public.auth_sessions enable row level security;
revoke all on public.auth_sessions from anon, authenticated;
grant all on public.auth_sessions to service_role;

create table if not exists public.auth_rate_limits (
  key text primary key,
  count integer not null,
  expires_at timestamptz not null
);
alter table public.auth_rate_limits enable row level security;
revoke all on public.auth_rate_limits from anon, authenticated;
grant all on public.auth_rate_limits to service_role;
create or replace function public.consume_auth_rate_limit(p_key text, p_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  -- Auth callers provide a hashed identifier; do not store contact details here.
  insert into public.auth_rate_limits as limits(key,count,expires_at)
  values(p_key,1,now()+interval '15 minutes')
  on conflict(key) do update set
    count=case when limits.expires_at <= now() then 1 else limits.count+1 end,
    expires_at=case when limits.expires_at <= now() then now()+interval '15 minutes' else limits.expires_at end
  returning count into v_count;
  return v_count <= least(greatest(p_limit,1),100);
end;
$$;
revoke all on function public.consume_auth_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.consume_auth_rate_limit(text,integer) to service_role;
create unique index if not exists customer_profiles_auth_user_unique on public.customer_profiles(user_id) where user_id is not null;
create unique index if not exists admin_users_auth_user_unique on public.admin_users(user_id) where user_id is not null;
alter table public.customer_profiles add column if not exists whatsapp_updates boolean not null default false;
-- Do not automatically link historical customer/staff rows by unverified email.
-- Provision auth.users and bind user_id explicitly after ownership verification.

-- Do not expose the privileged paid transition through the public database API.
revoke all on function public.process_order_payment_success(text,text) from public,anon,authenticated;
grant execute on function public.process_order_payment_success(text,text) to service_role;
-- Replace permissive policies from the phase-2 migration.
drop policy if exists "Users can view own cart" on public.carts;
create policy "Users can view own cart" on public.carts for select to authenticated using (auth.uid()=user_id);
drop policy if exists "Users can manage own cart items" on public.cart_items;
create policy "Users can manage own cart items" on public.cart_items for all to authenticated
 using (exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid()))
 with check (exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid()));
drop policy if exists "Public can view fulfillments for their orders" on public.fulfillments;
create policy "Customers view own fulfillments" on public.fulfillments for select to authenticated
 using (exists(select 1 from public.orders o join public.customer_profiles c on c.id=o.customer_id where o.id=order_id and c.user_id=auth.uid()));
drop policy if exists "Customers can view own return requests" on public.return_requests;
create policy "Customers can view own return requests" on public.return_requests for select to authenticated
 using (exists(select 1 from public.orders o join public.customer_profiles c on c.id=o.customer_id where o.id=order_id and c.user_id=auth.uid()));
