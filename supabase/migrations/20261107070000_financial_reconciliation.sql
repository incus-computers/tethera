begin;
alter table public.orders add column financial_snapshot jsonb;
create table public.promotion_claims(
 id text primary key default gen_random_uuid()::text,order_id text not null unique references public.orders(id),
 promotion_id text not null references public.promotions(id),owner_id text not null,
 discount numeric(12,2) not null check(discount>=0 and discount=trunc(discount)),
 state text not null check(state in ('reserved','consumed','released')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index promotion_claims_owner_idx on public.promotion_claims(promotion_id,owner_id,state);
alter table public.promotion_claims enable row level security;
revoke all on public.promotion_claims from public,anon,authenticated,service_role;
grant select on public.promotion_claims to service_role;

create function public.promotion_customer_usage(p_promotion_id text,p_owner_id text,p_exclude_order text default null) returns bigint
language sql stable security definer set search_path='' as $$
 select (select count(*) from public.promotion_claims where promotion_id=p_promotion_id and owner_id=p_owner_id and state in ('reserved','consumed') and order_id is distinct from p_exclude_order)
 +(select count(*) from public.orders o join public.promotions p on p.code=o.promo_code where p.id=p_promotion_id and o.customer_id=p_owner_id and o.id is distinct from p_exclude_order and not exists(select 1 from public.promotion_claims c where c.order_id=o.id));
$$;

create function public.validate_checkout_financials(p_order jsonb,p_items jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare f jsonb:=p_order->'financial_snapshot';l jsonb;i jsonb;s jsonb;v_idx integer:=0;v_rate numeric;v_merch numeric:=0;v_assembly numeric:=0;v_discount numeric:=0;v_gross numeric:=0;v_net numeric:=0;v_tax numeric:=0;v_amount numeric;v_value jsonb;
begin
 if f->>'version' is distinct from '1' or f->>'currency' is distinct from 'IDR' or jsonb_typeof(f->'lines') is distinct from 'array' or jsonb_array_length(f->'lines')<>jsonb_array_length(p_items) or coalesce(length(f->'taxPolicy'->>'code'),0) not between 1 and 80 or coalesce(f->'taxPolicy'->>'mode','') not in ('inclusive','not_collected') then raise exception using errcode='22023',message='Financial snapshot required';end if;
 v_rate:=(f->'taxPolicy'->>'rateBps')::numeric;
 if v_rate is null or v_rate not between 0 and 10000 or v_rate<>trunc(v_rate) or (f->'taxPolicy'->>'mode'='not_collected' and v_rate<>0) then raise exception using errcode='22023',message='Invalid effective tax policy';end if;
 for i in select value from jsonb_array_elements(p_items) loop
  l:=f->'lines'->v_idx;
  for v_value in select value from jsonb_array_elements(jsonb_build_array(l->'unitPrice',l->'quantity',l->'beforeDiscount',l->'discount',l->'gross',l->'net',l->'tax')) loop
   v_amount:=(v_value#>>'{}')::numeric;if v_amount is null or v_amount<0 or v_amount>9999999999 or v_amount<>trunc(v_amount) then raise exception using errcode='22023',message='Invalid whole-IDR snapshot amount';end if;
  end loop;
  if (l->>'index')::integer is distinct from v_idx or (l->>'unitPrice')::numeric is distinct from (i->>'unit_price')::numeric or (l->>'quantity')::integer is distinct from (i->>'quantity')::integer or (l->>'beforeDiscount')::numeric is distinct from (l->>'unitPrice')::numeric*(l->>'quantity')::numeric
   or (l->>'gross')::numeric is distinct from (l->>'beforeDiscount')::numeric-(l->>'discount')::numeric or (l->>'net')::numeric is distinct from round((l->>'gross')::numeric*10000/(10000+v_rate)) or (l->>'tax')::numeric is distinct from (l->>'gross')::numeric-(l->>'net')::numeric
   or (i->>'discount_snapshot')::numeric is distinct from (l->>'discount')::numeric or (i->>'gross_total_snapshot')::numeric is distinct from (l->>'gross')::numeric or (i->>'tax_amount_snapshot')::numeric is distinct from (l->>'tax')::numeric or (i->>'tax_rate_snapshot')::numeric is distinct from v_rate/10000 then raise exception using errcode='22023',message='Financial line does not reconcile';end if;
  if i->>'product_id' is not null then
   if l->>'kind' is distinct from 'merchandise' then raise exception using errcode='22023',message='Invalid merchandise classification';end if;v_merch:=v_merch+(l->>'beforeDiscount')::numeric;
  else
   if l->>'kind' is distinct from 'assembly' then raise exception using errcode='22023',message='Invalid service classification';end if;v_assembly:=v_assembly+(l->>'beforeDiscount')::numeric;
  end if;
  v_discount:=v_discount+(l->>'discount')::numeric;v_gross:=v_gross+(l->>'gross')::numeric;v_net:=v_net+(l->>'net')::numeric;v_tax:=v_tax+(l->>'tax')::numeric;v_idx:=v_idx+1;
 end loop;
 s:=f->'shipping';
 for v_value in select value from jsonb_array_elements(jsonb_build_array(s->'beforeDiscount',s->'discount',s->'gross',s->'net',s->'tax')) loop
  v_amount:=(v_value#>>'{}')::numeric;if v_amount is null or v_amount<0 or v_amount>9999999999 or v_amount<>trunc(v_amount) then raise exception using errcode='22023',message='Invalid whole-IDR shipping amount';end if;
 end loop;
 if (s->>'gross')::numeric is distinct from (s->>'beforeDiscount')::numeric-(s->>'discount')::numeric or (s->>'net')::numeric is distinct from round((s->>'gross')::numeric*10000/(10000+v_rate)) or (s->>'tax')::numeric is distinct from (s->>'gross')::numeric-(s->>'net')::numeric
 or (p_order->>'subtotal')::numeric is distinct from v_merch or (p_order->>'assembly_fee')::numeric is distinct from v_assembly or (p_order->>'shipping_fee')::numeric is distinct from (s->>'beforeDiscount')::numeric
 or (p_order->>'discount_amount')::numeric is distinct from v_discount+(s->>'discount')::numeric or (p_order->>'total')::numeric is distinct from v_gross+(s->>'gross')::numeric or (p_order->>'dpp_amount')::numeric is distinct from v_net+(s->>'net')::numeric or (p_order->>'tax_amount')::numeric is distinct from v_tax+(s->>'tax')::numeric
 or (p_order->>'tax_rate')::numeric is distinct from v_rate/10000 or (p_order->>'shipping_tax_amount')::numeric is distinct from (s->>'tax')::numeric
 or (f->>'merchandiseSubtotal')::numeric is distinct from v_merch or (f->>'assemblyFee')::numeric is distinct from v_assembly or (f->>'shippingFee')::numeric is distinct from (s->>'beforeDiscount')::numeric or (f->>'discountAmount')::numeric is distinct from v_discount+(s->>'discount')::numeric
 or (f->>'total')::numeric is distinct from (p_order->>'total')::numeric or (f->>'netAmount')::numeric is distinct from (p_order->>'dpp_amount')::numeric or (f->>'taxAmount')::numeric is distinct from (p_order->>'tax_amount')::numeric then raise exception using errcode='22023',message='Order financial totals do not reconcile';end if;
 return true;
end;
$$;

alter function public.commit_checkout(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) rename to commit_checkout_before_financials;
revoke all on function public.commit_checkout_before_financials(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.commit_checkout(p_request jsonb,p_order jsonb,p_items jsonb,p_stock jsonb,p_catalog jsonb,p_variants jsonb,p_promotion jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_prior public.checkout_requests;p public.promotions;r jsonb;v_owner text:=p_request->>'owner_id';v_discount numeric:=(p_order->>'discount_amount')::numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended(v_owner||':'||(p_request->>'request_key'),0));
 select * into v_prior from public.checkout_requests where owner_id=v_owner and request_key=p_request->>'request_key';
 if found then return public.commit_checkout_before_financials(p_request,p_order,p_items,p_stock,p_catalog,p_variants,null);end if;
 perform public.validate_checkout_financials(p_order,p_items);
 if p_promotion is not null and p_promotion<>'null'::jsonb then
  select * into p from public.promotions where id=p_promotion->>'id' for update;
  if not found or not p.is_active or (to_jsonb(p)-'usage_count'-'total_discount_given'-'updated_at') is distinct from (p_promotion-'usage_count'-'total_discount_given'-'updated_at') or p.code is distinct from p_order->>'promo_code' or coalesce(p.starts_at,p.start_date)>now() or coalesce(p.ends_at,p.end_date)<now()
   or (coalesce(p.max_global_uses,p.usage_limit) is not null and p.usage_count>=coalesce(p.max_global_uses,p.usage_limit)) then raise exception using errcode='PT409',message='Promotion changed or exhausted';end if;
  if p.max_uses_per_user is not null and (v_owner like 'guest:%' or public.promotion_customer_usage(p.id,v_owner,null)>=p.max_uses_per_user) then raise exception using errcode='PT409',message='Customer promotion limit reached; sign in with a verified account';end if;
 elsif v_discount<>0 or p_order->>'promo_code' is not null then raise exception using errcode='22023',message='Discount requires a validated promotion';end if;
 r:=public.commit_checkout_before_financials(p_request,p_order,p_items,p_stock,p_catalog,p_variants,null);
 if p.id is not null then
  perform set_config('app.promotion_claim_write','allowed',true);
  update public.promotions set usage_count=usage_count+1,updated_at=now() where id=p.id;
  insert into public.promotion_claims(order_id,promotion_id,owner_id,discount,state) values(r->'order'->>'id',p.id,v_owner,v_discount,'reserved');
 end if;
 return r;
end;
$$;

alter function public.transition_order_inventory(text,text,text,text,numeric) rename to transition_inventory_before_financials;
revoke all on function public.transition_inventory_before_financials(text,text,text,text,numeric) from public,anon,authenticated,service_role;
create function public.transition_order_inventory(p_order_id text,p_action text,p_reference text default '',p_reason text default '',p_amount numeric default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders;c public.promotion_claims;r jsonb;
begin
 select * into o from public.orders where id=p_order_id for update;
 select * into c from public.promotion_claims where order_id=p_order_id for update;
 -- Match checkout's promotion-before-stock lock order.
 if c.id is not null and c.state='reserved' then perform 1 from public.promotions where id=c.promotion_id for update;end if;
 r:=public.transition_inventory_before_financials(p_order_id,p_action,p_reference,p_reason,p_amount);
 select * into o from public.orders where id=p_order_id;
 if c.id is not null and c.state='reserved' and (o.paid_at is not null or o.status='cancelled') then
  perform set_config('app.promotion_claim_write','allowed',true);
  if o.paid_at is not null then
   update public.promotions set total_discount_given=coalesce(total_discount_given,0)+c.discount,updated_at=now() where id=c.promotion_id and usage_count>=1;
  else update public.promotions set usage_count=usage_count-1,updated_at=now() where id=c.promotion_id and usage_count>=1;end if;
  if not found then raise exception using errcode='23514',message='Promotion claim counter drift';end if;
  update public.promotion_claims set state=case when o.paid_at is not null then 'consumed' else 'released' end,updated_at=now() where id=c.id;
 end if;
 return r;
end;
$$;

create function public.protect_financial_snapshot() returns trigger language plpgsql set search_path='' as $$
declare key text;
begin
 if old.financial_snapshot is not null then
  foreach key in array array['financial_snapshot','subtotal','assembly_fee','shipping_fee','discount_amount','promo_code','total','dpp_amount','tax_amount','tax_rate','shipping_tax_amount'] loop
   if to_jsonb(new)->key is distinct from to_jsonb(old)->key then raise exception using errcode='PT409',message='Committed financial breakdown is immutable';end if;
  end loop;
 end if;
 return new;
end;
$$;
create trigger protect_financial_snapshot before update on public.orders for each row execute function public.protect_financial_snapshot();
create function public.protect_financial_line() returns trigger language plpgsql set search_path='' as $$
declare key text;
begin
 if exists(select 1 from public.orders where id=old.order_id and financial_snapshot is not null) then
  if tg_op='DELETE' then raise exception using errcode='PT409',message='Committed financial lines are immutable';end if;
  foreach key in array array['order_id','product_id','variant_id','quantity','unit_price','discount_snapshot','gross_total_snapshot','tax_amount_snapshot','tax_rate_snapshot'] loop
   if to_jsonb(new)->key is distinct from to_jsonb(old)->key then raise exception using errcode='PT409',message='Committed financial lines are immutable';end if;
  end loop;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end;
$$;
create trigger protect_financial_line before update or delete on public.order_items for each row execute function public.protect_financial_line();
create function public.protect_promotion_counters() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.usage_count is distinct from old.usage_count or new.total_discount_given is distinct from old.total_discount_given) and current_setting('app.promotion_claim_write',true) is distinct from 'allowed' then raise exception using errcode='PT409',message='Promotion counters are maintained by order transitions';end if;
 return new;
end;
$$;
create trigger protect_promotion_counters before update on public.promotions for each row execute function public.protect_promotion_counters();
revoke all on function public.protect_financial_snapshot(),public.protect_financial_line(),public.protect_promotion_counters(),public.validate_checkout_financials(jsonb,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.commit_checkout(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb),public.transition_order_inventory(text,text,text,text,numeric),public.promotion_customer_usage(text,text,text) from public,anon,authenticated;
grant execute on function public.commit_checkout(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb),public.transition_order_inventory(text,text,text,text,numeric),public.promotion_customer_usage(text,text,text) to service_role;

alter function public.application_security_tables() rename to application_package_security_tables;
create function public.application_security_tables() returns setof text language sql immutable set search_path='' as $$select public.application_package_security_tables() union all select 'promotion_claims';$$;
revoke all on function public.application_security_tables(),public.application_package_security_tables() from public,anon,authenticated,service_role;
alter function public.application_security_audit() rename to application_package_security_audit;
revoke all on function public.application_package_security_audit() from public,anon,authenticated,service_role;
create function public.application_security_audit() returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;v jsonb;t text;f regprocedure;
begin
 r:=public.application_package_security_audit();v:=r->'violations';
 if has_any_column_privilege('anon','public.promotion_claims','SELECT') or has_any_column_privilege('authenticated','public.promotion_claims','SELECT') or has_any_column_privilege('service_role','public.promotion_claims','INSERT,UPDATE') or has_table_privilege('service_role','public.promotion_claims','DELETE,TRUNCATE') then v:=v||jsonb_build_array('promotion_claim_access');end if;
 foreach t in array array['commit_checkout_before_financials(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)','transition_inventory_before_financials(text,text,text,text,numeric)','promotion_customer_usage(text,text,text)','validate_checkout_financials(jsonb,jsonb)','protect_financial_snapshot()','protect_financial_line()','protect_promotion_counters()','application_package_security_tables()','application_package_security_audit()','application_financial_schema_health()'] loop
  f:=to_regprocedure('public.'||t);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then v:=v||jsonb_build_array('financial_function_access:'||t);end if;
  if f is not null and not coalesce((select 'search_path=""'=any(proconfig) from pg_proc where oid=f),false) then v:=v||jsonb_build_array('financial_function_search_path:'||t);end if;
 end loop;
 foreach t in array array['protect_financial_snapshot','protect_financial_line','protect_promotion_counters'] loop
  if not exists(select 1 from pg_trigger where tgname=t and not tgisinternal and tgenabled in ('O','A')) then v:=v||jsonb_build_array('missing_financial_guard:'||t);end if;
 end loop;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='financial_snapshot') then v:=v||jsonb_build_array('missing_financial_snapshot');end if;
 return jsonb_build_object('ok',jsonb_array_length(v)=0,'violations',v);
end;
$$;
revoke all on function public.application_security_audit() from public,anon,authenticated;
grant execute on function public.application_security_audit() to service_role;
insert into public.application_schema_versions(version) values('20261107070000_financial_reconciliation');
alter function public.application_schema_health() rename to application_financial_schema_health;
revoke all on function public.application_financial_schema_health() from public,anon,authenticated,service_role;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$select public.application_financial_schema_health() and exists(select 1 from public.application_schema_versions where version='20261107070000_financial_reconciliation') and (public.application_security_audit()->>'ok')::boolean;$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
