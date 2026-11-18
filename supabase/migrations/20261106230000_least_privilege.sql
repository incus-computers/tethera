begin;
create table public.application_security_policy_baseline (table_name text not null,policy_name text not null,definition jsonb not null,primary key(table_name,policy_name));
alter table public.application_security_policy_baseline enable row level security;
revoke all on public.application_security_policy_baseline from public,anon,authenticated,service_role;
grant select on public.application_security_policy_baseline to service_role;

-- This manifest scopes changes to application objects, never auth/storage/extension tables.
create function public.application_security_tables() returns setof text language sql immutable set search_path='' as $$
 select unnest(array['admin_audit_logs','admin_users','application_security_policy_baseline','application_schema_versions','auth_rate_limits','auth_sessions','cart_items','carts','categories','checkout_requests','crm_email_campaigns','custom_builds','customer_profiles','customer_wishlist','fulfillment_items','fulfillments','inventory_adjustment_ledger','inventory_reservations','marketplace_integrations','marketplace_product_mappings','marketplace_sync_logs','order_items','orders','payment_attempts','payment_events','payment_outbox','product_reviews','product_variants','products','promotional_banners','promotions','refunds','return_requests','stock_notifications','store_inventory','storefront_settings','stores']::text[]);
$$;
revoke create on schema public from public,anon,authenticated;
grant usage on schema public to anon,authenticated,service_role;
-- Global revocation is necessary: a per-schema REVOKE cannot undo global defaults.
-- Applies to the migration creator. Other object-creating roles need the same review.
alter default privileges revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema public revoke all on tables from public,anon,authenticated,service_role;
alter default privileges revoke all on sequences from public,anon,authenticated,service_role;
alter default privileges in schema public revoke all on sequences from public,anon,authenticated,service_role;
alter default privileges revoke execute on functions from public,anon,authenticated,service_role;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated,service_role;

do $$
declare t text;p record;cols text;
begin
 for t in select public.application_security_tables() loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from public,anon,authenticated,service_role',t);
  -- Table REVOKE does not remove independently granted column privileges.
  select string_agg(format('%I',attname),',') into cols from pg_attribute where attrelid=format('public.%I',t)::regclass and attnum>0 and not attisdropped;
  execute format('revoke all (%s) on table public.%I from public,anon,authenticated,service_role',cols,t);
  if t in ('inventory_adjustment_ledger','admin_audit_logs') then execute format('grant select,insert on public.%I to service_role',t);
  elsif t in ('application_security_policy_baseline','application_schema_versions','checkout_requests','payment_events','payment_outbox','payment_attempts') then execute format('grant select on public.%I to service_role',t);
  elsif t<>'auth_rate_limits' then execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end if;
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy %I on public.%I',p.policyname,t);
  end loop;
  -- No browser client in this application consumes raw Realtime database changes.
  if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime drop table public.%I',t);
  end if;
 end loop;
end;
$$;

-- Explicit public column lists protect costs, stock counters and future columns.
grant select(id,name,slug,address,city,province,postal_code,phone,whatsapp,email,latitude,longitude,is_active,is_click_and_collect,pickup_lead_time_minutes,trading_hours) on public.stores to anon,authenticated;
grant select(id,name,slug,parent_id,icon,sort_order,pc_builder_slot) on public.categories to anon,authenticated;
grant select(id,sku,name,slug,brand,description,category_id,category_slug,retail_price,sale_price,images,specs,warranty_months,is_active,pc_builder_slot,created_at) on public.products to anon,authenticated;
grant select(id,product_id,sku,name,attribute_type,attribute_value,price,sale_price,image_url,is_active) on public.product_variants to anon,authenticated;
grant select(id,type,title,highlight,description,badge,badge_type,cta_text,cta_link,secondary_cta_text,secondary_cta_link,image_url,hide_overlay,perk,bg_gradient,tag_color,is_active,display_order) on public.promotional_banners to anon,authenticated;
create policy storefront_stores on public.stores for select to anon,authenticated using(is_active);
create policy storefront_categories on public.categories for select to anon,authenticated using(true);
create policy storefront_products on public.products for select to anon,authenticated using(is_active);
create policy storefront_variants on public.product_variants for select to anon,authenticated using(is_active and exists(select 1 from public.products p where p.id=product_id and p.is_active));
create policy storefront_banners on public.promotional_banners for select to anon,authenticated using(is_active);

-- Direct customer SQL access is read-only. HTTP routes own all mutations.
grant select(id,user_id,email,full_name,phone,address_line1,address_line2,subdistrict,city,province,postal_code,country,address_label,delivery_notes,marketing_opt_in,whatsapp_updates) on public.customer_profiles to authenticated;
grant select(id,order_number,customer_id,customer_name,customer_email,customer_phone,fulfillment_type,pickup_store_id,shipping_address,subtotal,shipping_fee,assembly_fee,discount_amount,promo_code,total,tax_amount,tax_rate,dpp_amount,status,payment_method,paid_at,created_at,updated_at) on public.orders to authenticated;
grant select(id,order_id,product_id,variant_id,custom_build_id,quantity,unit_price,is_custom_build,product_title_snapshot,sku_snapshot,variant_title_snapshot,tax_rate_snapshot,tax_amount_snapshot,checkout_metadata,discount_snapshot,gross_total_snapshot) on public.order_items to authenticated;
grant select(id,user_id,status,expires_at,created_at,updated_at) on public.carts to authenticated;
grant select(id,cart_id,product_id,variant_id,custom_build_id,quantity,created_at,updated_at) on public.cart_items to authenticated;
grant select(id,share_slug,user_id,build_name,platform,configuration,total_price,estimated_wattage,recommended_psu_wattage,assembly_tier,created_at) on public.custom_builds to authenticated;
grant select(id,user_id,product_id,created_at) on public.customer_wishlist to authenticated;
grant select(id,product_id,user_id,customer_name,customer_email,rating,title,content,verified_purchase,helpful_votes,created_at) on public.product_reviews to authenticated;
grant select(id,order_id,fulfillment_number,carrier,service_code,waybill_id,tracking_url,status,shipped_at,delivered_at,created_at,updated_at) on public.fulfillments to authenticated;
grant select(id,fulfillment_id,order_item_id,quantity) on public.fulfillment_items to authenticated;
grant select(id,rma_number,order_id,customer_id,customer_email,status,reason,customer_notes,photos,requested_at,inspected_at,resolved_at) on public.return_requests to authenticated;
grant select(id,refund_number,order_id,return_request_id,amount,currency,reason,status,created_at) on public.refunds to authenticated;
create policy own_profile on public.customer_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy own_orders on public.orders for select to authenticated using(exists(select 1 from public.customer_profiles p where p.id=customer_id and p.user_id=(select auth.uid())));
create policy own_order_items on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id));
create policy own_carts on public.carts for select to authenticated using(user_id=(select auth.uid()));
create policy own_cart_items on public.cart_items for select to authenticated using(exists(select 1 from public.carts c where c.id=cart_id));
create policy own_builds on public.custom_builds for select to authenticated using(user_id=(select auth.uid()));
create policy own_wishlist on public.customer_wishlist for select to authenticated using(user_id=(select auth.uid()));
create policy own_reviews on public.product_reviews for select to authenticated using(exists(select 1 from public.customer_profiles p where p.id=product_reviews.user_id and p.user_id=(select auth.uid())));
create policy own_fulfillments on public.fulfillments for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id));
create policy own_fulfillment_items on public.fulfillment_items for select to authenticated using(exists(select 1 from public.fulfillments f join public.order_items i on i.order_id=f.order_id where f.id=fulfillment_id and i.id=order_item_id));
create policy own_returns on public.return_requests for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id));
create policy own_refunds on public.refunds for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id));

-- Narrow service rights on append-only evidence. Definer transactions insert payment events/outbox.
revoke update,delete,truncate,references,trigger on public.inventory_adjustment_ledger,public.admin_audit_logs from service_role;
revoke all on public.payment_events,public.payment_outbox,public.application_schema_versions from service_role;
grant select on public.payment_events,public.payment_outbox,public.application_schema_versions to service_role;
grant update(delivered_at) on public.payment_outbox to service_role;
grant update(updated_at) on public.payment_attempts to service_role;

-- Application function inventory excludes extension/provider functions in the same schema.
do $$
declare signature text;f regprocedure;
begin
 foreach signature in array array[
 'process_order_payment_success(text,text)','consume_auth_rate_limit(text,integer)',
 'create_order_with_items(jsonb,jsonb)','commit_checkout(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)',
 'transition_order_inventory(text,text,text,text,numeric)','expire_order_reservations(integer)',
 'prepare_midtrans_attempt(text,text,text)','save_midtrans_redirect(text,text)','apply_midtrans_evidence(text,jsonb)',
 'application_schema_health()','application_storage_schema_health()','application_checkout_schema_health()',
 'application_inventory_schema_health()','application_security_tables()'] loop
  f:=to_regprocedure('public.'||signature);
  if f is null then raise exception 'Missing application function: %',signature;end if;
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f);
  execute format('alter function %s set search_path = %L',f,'');
  if signature not in ('process_order_payment_success(text,text)','application_storage_schema_health()','application_checkout_schema_health()','application_inventory_schema_health()','application_security_tables()') then
   execute format('grant execute on function %s to service_role',f);
  end if;
 end loop;
end;
$$;

insert into public.application_security_policy_baseline(table_name,policy_name,definition)
 select c.relname,p.polname,jsonb_build_object('command',p.polcmd,'roles',p.polroles,'permissive',p.polpermissive,'using',p.polqual::text,'check',p.polwithcheck::text)
 from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in(select public.application_security_tables());

create function public.application_security_audit() returns jsonb language plpgsql security definer set search_path='' as $$
declare t text;r text;v text[]:='{}';f record;v_owner oid;
begin
 for t in select public.application_security_tables() loop
  if not coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.'||t)),false) then v:=array_append(v,'rls:'||t);end if;
  foreach r in array array['anon','authenticated'] loop
   if has_table_privilege(r,'public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or exists(select 1 from pg_attribute a where a.attrelid=to_regclass('public.'||t) and a.attnum>0 and not a.attisdropped and has_column_privilege(r,a.attrelid,a.attnum,'INSERT,UPDATE,REFERENCES')) then v:=array_append(v,'client_write:'||r||':'||t);end if;
  end loop;
 end loop;
 foreach r in array array['anon','authenticated'] loop
  if has_schema_privilege(r,'public','CREATE') then v:=array_append(v,'schema_create:'||r);end if;
  if has_column_privilege(r,'public.products','cost_price','SELECT') or has_column_privilege(r,'public.product_variants','reserved_quantity','SELECT') then v:=array_append(v,'private_catalog_column:'||r);end if;
  foreach t in array array['auth_sessions','auth_rate_limits','admin_users','admin_audit_logs','inventory_reservations','inventory_adjustment_ledger','checkout_requests','stock_notifications','store_inventory','storefront_settings','promotions','crm_email_campaigns','marketplace_integrations','marketplace_product_mappings','marketplace_sync_logs','payment_attempts','payment_events','payment_outbox','application_schema_versions'] loop
   if has_any_column_privilege(r,'public.'||t,'SELECT') then v:=array_append(v,'private_read:'||r||':'||t);end if;
  end loop;
 end loop;
 for f in select p.oid,p.proname,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
  'process_order_payment_success','consume_auth_rate_limit','create_order_with_items','commit_checkout','transition_order_inventory','expire_order_reservations','prepare_midtrans_attempt','save_midtrans_redirect','apply_midtrans_evidence','application_schema_health','application_storage_schema_health','application_checkout_schema_health','application_inventory_schema_health','application_payment_schema_health','application_security_audit','application_security_tables') loop
  if has_function_privilege('anon',f.oid,'EXECUTE') or has_function_privilege('authenticated',f.oid,'EXECUTE') then v:=array_append(v,'function_execute:'||f.proname);end if;
  if not coalesce('search_path=""'=any(f.proconfig),false) then v:=array_append(v,'function_search_path:'||f.proname);end if;
 end loop;
 if exists(
  select 1 from (
   (select table_name,policy_name,definition from public.application_security_policy_baseline
    except select c.relname,p.polname,jsonb_build_object('command',p.polcmd,'roles',p.polroles,'permissive',p.polpermissive,'using',p.polqual::text,'check',p.polwithcheck::text) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in(select public.application_security_tables()))
   union all
   (select c.relname,p.polname,jsonb_build_object('command',p.polcmd,'roles',p.polroles,'permissive',p.polpermissive,'using',p.polqual::text,'check',p.polwithcheck::text) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in(select public.application_security_tables())
    except select table_name,policy_name,definition from public.application_security_policy_baseline)
  ) drift
 ) then v:=array_append(v,'policy_definition_drift');end if;
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r and (rolsuper or rolbypassrls)) or pg_has_role(r,'service_role','MEMBER') then v:=array_append(v,'unsafe_role:'||r);end if;
 end loop;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))) then v:=array_append(v,'exposed_public_definer');end if;
 if has_table_privilege('service_role','public.inventory_adjustment_ledger','UPDATE,DELETE,TRUNCATE') or has_table_privilege('service_role','public.admin_audit_logs','UPDATE,DELETE,TRUNCATE') then v:=array_append(v,'mutable_audit_evidence');end if;
 select proowner into v_owner from pg_proc where oid='public.application_security_audit()'::regprocedure;
 if exists(select 1 from (
   select defaclacl acl from pg_default_acl where defaclrole=v_owner and defaclnamespace in (0,'public'::regnamespace::oid) and defaclobjtype in ('r','S','f')
   union all select acldefault('f',v_owner) where not exists(select 1 from pg_default_acl where defaclrole=v_owner and defaclnamespace=0 and defaclobjtype='f')
  ) a cross join lateral aclexplode(a.acl) e where e.grantee in (0,(select oid from pg_roles where rolname='anon'),(select oid from pg_roles where rolname='authenticated'))) then v:=array_append(v,'unsafe_creator_default_acl');end if;
 if has_any_column_privilege('service_role','public.inventory_adjustment_ledger','UPDATE') or has_any_column_privilege('service_role','public.admin_audit_logs','UPDATE') then v:=array_append(v,'mutable_audit_columns');end if;
 if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename in(select public.application_security_tables())) then v:=array_append(v,'raw_realtime_publication');end if;
 return jsonb_build_object('ok',cardinality(v)=0,'violations',to_jsonb(v));
end;
$$;
revoke all on function public.application_security_audit() from public,anon,authenticated;
grant execute on function public.application_security_audit() to service_role;
insert into public.application_schema_versions(version) values('20261106230000_least_privilege');
alter function public.application_schema_health() rename to application_payment_schema_health;
revoke all on function public.application_payment_schema_health() from public,anon,authenticated,service_role;
create function public.application_schema_health() returns boolean language sql security definer set search_path='' as $$
 select public.application_payment_schema_health() and exists(select 1 from public.application_schema_versions where version='20261106230000_least_privilege')
 and (public.application_security_audit()->>'ok')::boolean;
$$;
revoke all on function public.application_schema_health() from public,anon,authenticated;
grant execute on function public.application_schema_health() to service_role;
commit;
