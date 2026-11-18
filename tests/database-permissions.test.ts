import { beforeAll,afterAll,describe,it,expect } from "vitest";
import { bootstrapPostgres } from "./support/postgres";
let pg:Awaited<ReturnType<typeof bootstrapPostgres>>;
const alice="11111111-1111-4111-8111-111111111111",bob="22222222-2222-4222-8222-222222222222";
async function asRole<T>(role:string,uid:string|null,sql:string,params:any[]=[]){
 return pg.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid||""]);return (await tx.query<T>(sql,params)).rows;});
}
async function security(){return (await pg.query<{r:{ok:boolean;violations:string[]}}>("select public.application_security_audit() r")).rows[0].r;}
beforeAll(async()=>{
 pg=await bootstrapPostgres({legacyBroadGrants:true});
 await pg.query("insert into auth.users(id) values($1),($2)",[alice,bob]);
 await pg.exec("insert into public.products(id,sku,name,slug,brand,retail_price,cost_price,is_active) values('visible','VISIBLE','Visible','visible','Fixture',1000,700,true),('hidden','HIDDEN','Hidden','hidden','Fixture',1000,700,false)");
 for(const [id,uid] of [["alice",alice],["bob",bob],["guest",null]] as const){
  if(uid)await pg.query("insert into public.customer_profiles(id,user_id,email,full_name,phone,address_line1,subdistrict,city,province,postal_code) values($1,$2,$3,$1,'081234567890','','','','','')",[id,uid,id+"@example.test"]);
  await pg.query("insert into public.orders(id,order_number,customer_id,customer_name,customer_email,customer_phone,fulfillment_type,subtotal,total) values($1,$1,$2,'Fixture',$3,'081234567890','delivery',1000,1000)",[id,uid?id:"guest:secret",id+"@example.test"]);
  await pg.query("insert into public.order_items(id,order_id,product_id,quantity,unit_price,unit_cost_snapshot) values($1,$2,'visible',1,1000,700)",[id+"-line",id]);
  await pg.query("insert into public.carts(id,user_id,anonymous_session_token) values($1,$2,$3)",[id,uid,uid?null:"guest-token"]);
  await pg.query("insert into public.cart_items(id,cart_id,product_id,quantity) values($1,$2,'visible',1)",[id+"-cart",id]);
  await pg.query("insert into public.custom_builds(id,share_slug,user_id,platform,configuration,total_price,estimated_wattage,recommended_psu_wattage) values($1,$1,$2,'amd','{}',1000,100,500)",[id,uid]);
  await pg.query("insert into public.fulfillments(id,order_id,fulfillment_number,carrier,service_code,notes) values($1,$2,$1,'jne','reg','Internal only')",[id+"-ship",id]);
  await pg.query("insert into public.fulfillment_items(id,fulfillment_id,order_item_id,quantity) values($1,$2,$3,1)",[id+"-shipment-line",id+"-ship",id+"-line"]);
  await pg.query("insert into public.return_requests(id,rma_number,order_id,customer_email,reason,admin_notes) values($1,$1,$2,$3,'defective','Internal only')",[id+"-return",id,id+"@example.test"]);
  await pg.query("insert into public.refunds(id,refund_number,order_id,amount,reason) values($1,$1,$2,100,'Fixture')",[id+"-refund",id]);
  await pg.query("insert into public.customer_wishlist(id,user_id,anonymous_session_token,product_id) values($1,$2,$3,'visible')",[id+"-wish",uid,uid?null:"guest-wish"]);
  if(uid)await pg.query("insert into public.product_reviews(id,product_id,user_id,customer_name,customer_email,rating,title,content) values($1,'visible',$2,'Fixture',$3,5,'Good','Works')",[id+"-review",id,id+"@example.test"]);
 }
 await pg.exec("insert into public.product_variants(id,product_id,sku,name,attribute_type,attribute_value,price,is_active) values('visible-variant','visible','VISIBLE-V','Visible variant','color','Black',1000,true),('hidden-parent-variant','hidden','HIDDEN-V','Variant of inactive product','color','Black',1000,true),('inactive-variant','visible','INACTIVE-V','Inactive variant','color','Black',1000,false)");
},30000);
afterAll(async()=>{await pg?.close();});
describe("least-privilege SQL boundary after broad legacy grants",()=>{
 it("reports a healthy schema and security contract after stripping legacy table/column/function ACLs",async()=>{
  expect(await security()).toEqual({ok:true,violations:[]});expect((await pg.query<{ready:boolean}>("select public.application_schema_health() ready")).rows[0].ready).toBe(true);
 });
 it.each([["alice",alice],["bob",bob]])("restricts %s to their profile, orders, lines, carts, builds and fulfillment/refund records",async(name,uid)=>{
  const suffix:Record<string,string>={customer_profiles:"",orders:"",order_items:"-line",carts:"",cart_items:"-cart",custom_builds:"",fulfillments:"-ship",fulfillment_items:"-shipment-line",return_requests:"-return",refunds:"-refund",customer_wishlist:"-wish",product_reviews:"-review"};
  for(const [table,end] of Object.entries(suffix))expect(await asRole("authenticated",uid,`select id from public.${table} order by id`)).toEqual([{id:name+end}]);
 });
 it("does not treat NULL ownership, a known guest token or a matching email as SQL ownership",async()=>{
  expect(await asRole("authenticated",null,"select id from public.orders")).toEqual([]);
  expect(await asRole("authenticated",alice,"select id from public.orders where customer_email='guest@example.test' or id='bob'")).toEqual([]);
  await expect(asRole("anon",null,"select id from public.carts where anonymous_session_token='guest-token'")).rejects.toMatchObject({code:"42501"});
  await expect(asRole("anon",null,"select id from public.custom_builds where share_slug='guest'")).rejects.toMatchObject({code:"42501"});
 });
 it.each(["anon","authenticated"])("lets %s read active public catalog columns but not costs, stock internals or inactive variants",async role=>{
  expect(await asRole(role,role==="authenticated"?alice:null,"select id from public.products order by id")).toEqual([{id:"visible"}]);
  expect(await asRole(role,role==="authenticated"?alice:null,"select id from public.product_variants order by id")).toEqual([{id:"visible-variant"}]);
  for(const sql of ["select cost_price from public.products","select * from public.products","select reserved_quantity from public.product_variants","select stock_on_hand from public.store_inventory"])
   await expect(asRole(role,alice,sql)).rejects.toMatchObject({code:"42501"});
 });
 it("hides internal fields even on the customer's own rows",async()=>{
  for(const sql of ["select unit_cost_snapshot from public.order_items","select notes,pickup_code from public.orders","select admin_notes from public.return_requests","select dispatched_by,notes from public.fulfillments","select crm_status,tags from public.customer_profiles","select anonymous_session_token from public.customer_wishlist"])
   await expect(asRole("authenticated",alice,sql)).rejects.toMatchObject({code:"42501"});
 });
 it.each(["anon","authenticated"])("blocks all direct %s writes, including ownership changes and verified-review forgery",async role=>{
  for(const sql of ["update public.customer_profiles set user_id='22222222-2222-4222-8222-222222222222' where id='alice'","update public.orders set paid_at=now() where id='alice'","update public.product_reviews set verified_purchase=true where id='alice-review'","delete from public.cart_items where cart_id='alice'","insert into public.customer_wishlist(user_id,product_id) values('11111111-1111-4111-8111-111111111111','hidden')"])
   await expect(asRole(role,alice,sql)).rejects.toMatchObject({code:"42501"});
 });
 it("keeps private operational tables unreadable to either customer role",async()=>{
  for(const role of ["anon","authenticated"])for(const table of ["auth_sessions","auth_rate_limits","admin_users","admin_audit_logs","payment_attempts","payment_events","payment_outbox","checkout_requests","inventory_reservations","inventory_adjustment_ledger","stock_notifications","storefront_settings","promotions","marketplace_integrations","marketplace_sync_logs","application_security_policy_baseline"])
   await expect(asRole(role,alice,`select * from public.${table}`)).rejects.toMatchObject({code:"42501"});
 });
 it("denies real privileged function execution, not only grant inspection",async()=>{
  for(const role of ["anon","authenticated"])for(const sql of ["select public.process_order_payment_success('alice','forged')","select public.transition_order_inventory('alice','settle','forged','',1000)","select public.consume_auth_rate_limit('forged',100)","select public.apply_midtrans_evidence('forged','{}'::jsonb)","select public.application_security_audit()"])
   await expect(asRole(role,alice,sql)).rejects.toMatchObject({code:"42501"});
 });
 it("lets the service role read private records while preserving append-only evidence and function-only attempt state",async()=>{
  expect((await asRole("service_role",null,"select id from public.orders")).length).toBe(3);
  expect((await asRole<{r:{ok:boolean}}>("service_role",null,"select public.application_security_audit() r"))[0].r.ok).toBe(true);
  for(const sql of ["delete from public.admin_audit_logs","update public.inventory_adjustment_ledger set delta_quantity=0","update public.payment_attempts set state='settled'","delete from public.checkout_requests","insert into public.payment_events(attempt_id,event_key,evidence,outcome) values('fake','fake','{}','{}')"])
   await expect(asRole("service_role",null,sql)).rejects.toMatchObject({code:"42501"});
 });
 it("removes application tables from public Realtime publication",async()=>{
  expect((await pg.query("select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public'")).rows).toEqual([]);
 });
 it("defaults new tables/functions to private and denies browser schema creation",async()=>{
  await pg.exec("create table public.future_security_canary(id text);create function public.future_security_canary() returns integer language sql as $$select 1$$;");
  try{for(const role of ["anon","authenticated"]) {
   await expect(asRole(role,alice,"select * from public.future_security_canary")).rejects.toMatchObject({code:"42501"});
   await expect(asRole(role,alice,"select public.future_security_canary()")).rejects.toMatchObject({code:"42501"});
   await expect(asRole(role,alice,"create table public.browser_created(id text)")).rejects.toMatchObject({code:"42501"});
  }}finally{await pg.exec("drop function public.future_security_canary();drop table public.future_security_canary;");}
 });
 it("detects policy, column-grant and role-membership drift through readiness",async()=>{
  await pg.exec("create policy unsafe_extra_read on public.orders for select to authenticated using(true)");
  expect((await security()).violations).toContain("policy_definition_drift");expect((await pg.query<{r:boolean}>("select public.application_schema_health() r")).rows[0].r).toBe(false);
  await pg.exec("drop policy unsafe_extra_read on public.orders;grant select(cost_price) on public.products to anon;");
  expect((await security()).violations).toContain("private_catalog_column:anon");await pg.exec("revoke select(cost_price) on public.products from anon");
  await pg.exec("grant service_role to authenticated");expect((await security()).violations).toContain("unsafe_role:authenticated");await pg.exec("revoke service_role from authenticated");
  await pg.exec("alter default privileges grant execute on functions to public");expect((await security()).violations).toContain("unsafe_creator_default_acl");await pg.exec("alter default privileges revoke execute on functions from public");
  expect((await security()).ok).toBe(true);
 });
 it("keeps media acceptance records private and immutable, and blocks broad Storage policies",async()=>{
  await pg.exec("create policy legacy_storage_allow on storage.objects for all to anon,authenticated using(true) with check(true);insert into storage.buckets(id,name) values('unrelated','unrelated');insert into storage.objects(bucket_id,name) values('catalog-media-v1','private.webp'),('unrelated','fixture.webp')");
  try {
   for(const role of ["anon","authenticated"]) {
    await expect(asRole(role,alice,"select * from public.media_assets")).rejects.toMatchObject({code:"42501"});
    expect(await asRole(role,alice,"select name from storage.objects order by name")).toEqual([{name:"fixture.webp"}]);
    await expect(asRole(role,alice,"insert into storage.objects(bucket_id,name) values('catalog-media-v1','forged.svg')")).rejects.toMatchObject({code:"42501"});
    expect(await asRole(role,alice,"update storage.objects set name='forged.webp' where bucket_id='catalog-media-v1' returning name")).toEqual([]);
    expect(await asRole(role,alice,"delete from storage.objects where bucket_id='catalog-media-v1' returning name")).toEqual([]);
   }
   for(const sql of ["update public.media_assets set sha256=repeat('a',64)","delete from public.media_assets"])
    await expect(asRole("service_role",null,sql)).rejects.toMatchObject({code:"42501"});
  }finally{await pg.exec("drop policy legacy_storage_allow on storage.objects;delete from storage.objects;delete from storage.buckets where id='unrelated'");}
 });
 it("makes readiness false if media bucket settings or the restrictive storage policy drift",async()=>{
  await pg.exec("update storage.buckets set public=true where id='catalog-media-v1'");
  expect((await security()).violations).toContain("media_storage_configuration");
  expect((await pg.query<{r:boolean}>("select public.application_schema_health() r")).rows[0].r).toBe(false);
  await pg.exec("update storage.buckets set public=false where id='catalog-media-v1';alter policy catalog_media_server_only on storage.objects using(true)");
  expect((await security()).violations).toContain("media_storage_configuration");
  await pg.exec("alter policy catalog_media_server_only on storage.objects using(bucket_id <> 'catalog-media-v1')");
  expect((await security()).ok).toBe(true);
 });
});
