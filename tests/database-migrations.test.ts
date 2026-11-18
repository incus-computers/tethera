import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import ts from "typescript";
import fs from "node:fs";
import { bootstrapPostgres } from "./support/postgres";

let pg:PGlite;
const a="11111111-1111-4111-8111-111111111111",b="22222222-2222-4222-8222-222222222222";
const order=(id:string)=>({id,order_number:id,customer_name:"Fixture",customer_email:"fixture@example.com",customer_phone:"+628123456789",fulfillment_type:"delivery",subtotal:1000,shipping_fee:100,assembly_fee:0,discount_amount:0,total:1100,tax_amount:99,dpp_amount:901,tax_rate:0.11});
async function create(id:string,items:unknown[]) { return pg.query("select public.create_order_with_items($1::jsonb,$2::jsonb) as result",[JSON.stringify(order(id)),JSON.stringify(items)]); }
beforeAll(async()=>{
 pg=await bootstrapPostgres();
 await pg.query("insert into public.products(id,sku,name,slug,brand,retail_price) values('fixture-product','FIXTURE-SKU','Fixture','fixture-product','Fixture',1000)");
 await pg.query("insert into auth.users(id) values($1),($2)",[a,b]);
 await pg.query("insert into public.customer_profiles(id,user_id,email,full_name,phone,address_line1,subdistrict,city,province,postal_code) values('profile-a',$1,'a@example.com','A','','','','','',''),('profile-b',$2,'b@example.com','B','','','','','','')",[a,b]);
},30000);
afterAll(async()=>{await pg?.close();});
describe("complete migrations on disposable PostgreSQL",()=>{
 it("bootstraps the exact baseline and all migrations and reports readiness",async()=>{
  expect((await pg.query<{ready:boolean}>("select public.application_schema_health() ready")).rows[0].ready).toBe(true);
 });
 it("contains every persisted TypeScript model column",async()=>{
  const tables:Record<string,string>={Store:"stores",Category:"categories",Product:"products",StoreInventory:"store_inventory",CustomBuild:"custom_builds",Order:"orders",OrderItem:"order_items",ProductVariantRow:"product_variants",Cart:"carts",CartItemRow:"cart_items",InventoryReservationRow:"inventory_reservations",FulfillmentRow:"fulfillments",FulfillmentItemRow:"fulfillment_items",ReturnRequestRow:"return_requests",RefundRow:"refunds",InventoryAdjustmentLedgerRow:"inventory_adjustment_ledger",AdminUserRow:"admin_users",AdminAuditLogRow:"admin_audit_logs",CustomerProfileRow:"customer_profiles",CrmEmailCampaignRow:"crm_email_campaigns",MarketplaceIntegration:"marketplace_integrations",MarketplaceProductMapping:"marketplace_product_mappings",MarketplaceSyncLog:"marketplace_sync_logs",Promotion:"promotions",DynamicBannerSlide:"promotional_banners",ProductReviewRow:"product_reviews",WishlistItemRow:"customer_wishlist",StockNotificationRow:"stock_notifications"};
  const columns=(await pg.query<{table_name:string;column_name:string}>("select table_name,column_name from information_schema.columns where table_schema='public'")).rows;
  const source=ts.createSourceFile("types.ts",fs.readFileSync("src/lib/db/types.ts","utf8"),ts.ScriptTarget.Latest,true);
  const missing:string[]=[];
  for(const statement of source.statements) {
   if(!ts.isInterfaceDeclaration(statement) || !tables[statement.name.text])continue;
   for(const member of statement.members) {
    if(!member.name)continue;
    const name=member.name.getText(source).replace(/['"]/g,"");
    if(statement.name.text==="Product" && name==="variations")continue; // stored as specs.variations
    if(!columns.some(c=>c.table_name===tables[statement.name.text] && c.column_name===name))missing.push(tables[statement.name.text]+"."+name);
   }
  }
  expect(missing).toEqual([]);
 });
 it("persists the complete order and financial snapshots in one transaction",async()=>{
  const result=await create("persisted-order",[{product_id:"fixture-product",quantity:1,unit_price:1000,product_title_snapshot:"Fixture",sku_snapshot:"FIXTURE-SKU",tax_amount_snapshot:99,tax_rate_snapshot:0.11}]);
  const saved=(result.rows[0] as any).result;
  expect(saved.order.total).toBe(1100);expect(saved.order.tax_amount).toBe(99);
  expect(saved.items).toHaveLength(1);expect(saved.items[0].order_id).toBe("persisted-order");
 });
 it("rolls back the header and earlier lines if a later FK insert fails",async()=>{
  await expect(create("rollback-order",[{product_id:"fixture-product",quantity:1,unit_price:1000},{product_id:"missing-product",quantity:1,unit_price:1000}])).rejects.toMatchObject({code:"23503"});
  expect((await pg.query("select id from public.orders where id='rollback-order'")).rows).toEqual([]);
  expect((await pg.query("select id from public.order_items where order_id='rollback-order'")).rows).toEqual([]);
 });
 it("does not partially save duplicate order numbers or duplicate line IDs",async()=>{
  await expect(create("persisted-order",[{product_id:"fixture-product",quantity:1,unit_price:1000}])).rejects.toMatchObject({code:"23505"});
  await expect(create("duplicate-line-order",[{id:"same-line",product_id:"fixture-product",quantity:1,unit_price:1000},{id:"same-line",product_id:"fixture-product",quantity:1,unit_price:1000}])).rejects.toMatchObject({code:"23505"});
  expect((await pg.query("select id from public.orders where id='duplicate-line-order'")).rows).toEqual([]);
 });
 it("rejects missing model columns instead of silently discarding JSON keys",async()=>{
  await expect(create("unknown-column",[{product_id:"fixture-product",quantity:1,unit_price:1000,unmigrated_snapshot:1}])).rejects.toMatchObject({code:"42703"});
  expect((await pg.query("select id from public.orders where id='unknown-column'")).rows).toEqual([]);
 });
 it("enforces new quantity constraints and rolls back the whole order",async()=>{
  await expect(create("invalid-quantity",[{product_id:"fixture-product",quantity:0,unit_price:1000}])).rejects.toMatchObject({code:"23514"});
  expect((await pg.query("select id from public.orders where id='invalid-quantity'")).rows).toEqual([]);
 });
 it("supports all promotion types and their extended fields",async()=>{
  await pg.query("insert into public.promotions(id,code,title,discount_type,discount_value,eligible_categories,max_global_uses,max_uses_per_user,buy_x_get_y) values('promo-new','NEW','New','buy_x_get_y',100,array['cpu'],5,1,'{\"buy_sku\":\"FIXTURE-SKU\"}')");
  expect((await pg.query<any>("select eligible_categories,max_global_uses from public.promotions where id='promo-new'")).rows[0]).toEqual({eligible_categories:["cpu"],max_global_uses:5});
 });
 it("enforces private wishlist ownership and does not expose raw reviews publicly",async()=>{
  await pg.query("insert into public.customer_wishlist(id,user_id,product_id) values('wish-a',$1,'fixture-product'),('wish-b',$2,'fixture-product')",[a,b]);
  await pg.query("insert into public.product_reviews(id,product_id,user_id,customer_name,customer_email,rating,title,content) values('review-a','fixture-product','profile-a','A','a@example.com',5,'Good','Works'),('review-b','fixture-product','profile-b','B','b@example.com',4,'Good','Works')");
  await pg.transaction(async tx=>{
   await tx.exec("set local role authenticated");
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);
   expect((await tx.query<any>("select id from public.customer_wishlist")).rows).toEqual([{id:"wish-a"}]);
   expect((await tx.query<any>("select id from public.product_reviews")).rows).toEqual([{id:"review-a"}]);
  });
  await expect(pg.transaction(async tx=>{await tx.exec("set local role anon");await tx.query("select customer_email from public.product_reviews");})).rejects.toMatchObject({code:"42501"});
 });
 it("restricts write RPCs and readiness to the trusted service role",async()=>{
  expect((await pg.query<any>("select has_function_privilege('anon','public.create_order_with_items(jsonb,jsonb)','EXECUTE') as allowed")).rows[0].allowed).toBe(false);
  expect((await pg.query<any>("select has_function_privilege('authenticated','public.process_order_payment_success(text,text)','EXECUTE') as allowed")).rows[0].allowed).toBe(false);
  expect((await pg.query<any>("select has_function_privilege('service_role','public.create_order_with_items(jsonb,jsonb)','EXECUTE') as allowed")).rows[0].allowed).toBe(true);
 });
 it("detects schema drift rather than trusting the migration marker alone",async()=>{
  await pg.exec("alter table public.orders rename column tax_amount to temporary_tax_amount");
  expect((await pg.query<any>("select public.application_schema_health() ready")).rows[0].ready).toBe(false);
  await pg.exec("alter table public.orders rename column temporary_tax_amount to tax_amount");
 });
});
