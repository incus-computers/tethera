import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
import { OrdersRepository } from "@/lib/db/repositories/orders.repository";
import { ProductsRepository, normalizeProduct } from "@/lib/db/repositories/products.repository";
import { HomepageSettingsRepository } from "@/lib/db/repositories/homepageSettings.repository";
import { DatabaseError } from "@/lib/db/errors";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/db/client";
import { GET as productGET } from "@/app/api/products/route";
import { GET as healthGET } from "@/app/api/health/route";
import { GET as settingsGET } from "@/app/api/admin/homepage-modules/route";

const originalEnv={...process.env};
function live() {
 process.env.APP_ENV="staging";
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://database-fixture.supabase.invalid";
 process.env.SUPABASE_SERVICE_ROLE_KEY="fixture-service-role";
 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY="fixture-anon";
}
function jsonFetch(body:any,status=200,headers:Record<string,string>={}) {
 const mock=vi.fn(async(_input?:unknown,_init?:RequestInit)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json",...headers}}));
 vi.stubGlobal("fetch",mock);return mock;
}
afterEach(()=>{
 for(const key of ["APP_ENV","NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  if(originalEnv[key]===undefined)delete process.env[key];else process.env[key]=originalEnv[key];
 }
 process.env.APP_ENV="demo";vi.restoreAllMocks();
});
describe("fail-closed database boundary",()=>{
 it("requires a service key outside explicit demo mode, not an anon fallback",()=>{
  live();delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(isSupabaseConfigured()).toBe(false);
  expect(()=>getServerSupabase()).toThrow(DatabaseError);
  expect(()=>getServerSupabase()).toThrow(/temporarily unavailable/);
 });
 it.each(["findById","findOne","findMany","create","update","delete","count"] as const)("does not return seeded results or volatile success when %s fails",async(method)=>{
  process.env.APP_ENV="demo";
  const repository=new BaseRepository<any>("failure-"+method,[{id:"seed",customer_id:"private-other"}]);
  live();
  jsonFetch({code:"42P01",message:"PRIVATE SQL missing relation with customer details"},503);
  const args:Record<string,any[]>={findById:["seed"],findOne:[{id:"seed"}],findMany:[{customer_id:"mine"}],create:[{id:"new"}],update:["seed",{customer_id:"changed"}],delete:["seed"],count:[]};
  await expect((repository[method] as any)(...args[method])).rejects.toMatchObject({name:"DatabaseError",status:503,code:"42P01"});
  process.env.APP_ENV="demo";
  expect(await repository.findById("new")).toBeNull();
  expect((await repository.findById("seed")).customer_id).toBe("private-other");
 });
 it("distinguishes unavailable reads from a real missing row",async()=>{
  live();jsonFetch(null);
  expect(await new BaseRepository<any>("records").findById("missing")).toBeNull();
  expect(await new BaseRepository<any>("records").update("missing",{name:"new"})).toBeNull();
  jsonFetch([]);
  expect(await new BaseRepository<any>("records").delete("missing")).toBe(false);
 });
 it("maps constraint failures to safe client errors without leaking provider details",async()=>{
  live();
  const repository=new BaseRepository<any>("records");
  for(const [code,status] of [["23505",409],["23503",400],["23514",400],["42501",503]] as const) {
   jsonFetch({code,message:"SECRET value and SQL text"},status);
   const failure=await repository.create({id:"x"}).catch(e=>e);
   expect(failure).toBeInstanceOf(DatabaseError);expect(failure.status).toBe(status);
   expect(failure.message).not.toContain("SECRET");
  }
 });
 it("sanitises transport failures and preserves normal query constraints",async()=>{
  live();
  const mock=jsonFetch([]);
  const repo=new BaseRepository<any>("records");
  await repo.findMany({customer_id:"mine",optional:undefined},{limit:2,offset:3,orderBy:"id"});
  const url=new URL(String(mock.mock.calls[0][0]));
  expect(url.searchParams.get("customer_id")).toBe("eq.mine");
  expect(url.searchParams.get("limit")).toBe("2");expect(url.searchParams.get("offset")).toBe("3");
  vi.stubGlobal("fetch",vi.fn(async()=>{throw new Error("PRIVATE transport diagnostics");}));
  await expect(repo.findMany()).rejects.toMatchObject({name:"DatabaseError",status:503});
 });
 it("does not invent product variants from the demo catalog in live mode",()=>{
  live();
  const product=normalizeProduct({id:"ram-1",sku:"COR-CMH32GX5M2B6000C30",specs:{}});
  expect(product.variations).toEqual([]);expect(product.images).toEqual([]);
 });
 it("propagates custom search failures instead of scanning fallback products",async()=>{
  live();jsonFetch({code:"42703",message:"private schema details"},400);
  const products=new ProductsRepository();
  await expect(products.search("fixture")).rejects.toBeInstanceOf(DatabaseError);
  await expect(products.findByCategory("cpu")).rejects.toBeInstanceOf(DatabaseError);
 });
 it("returns safe retryable API failures when the schema is missing",async()=>{
  live();jsonFetch({code:"42P01",message:"PRIVATE SQL"},404);
  const response=await productGET(new NextRequest("http://localhost:3000/api/products"));
  expect(response.status).toBe(503);
  expect(response.headers.get("content-type")).toContain("application/problem+json");
  expect(response.headers.get("retry-after")).toBe("5");
  expect(await response.text()).not.toContain("PRIVATE");
 });
 it("never acknowledges an order when its atomic insert RPC fails",async()=>{
  live();const fetcher=jsonFetch({code:"23503",message:"invalid line"},409);
  await expect(new OrdersRepository().createOrderWithItems({id:"failed-header"},[{product_id:"missing",quantity:1,unit_price:10}])).rejects.toBeInstanceOf(DatabaseError);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String(fetcher.mock.calls[0][0])).toContain("/rpc/create_order_with_items");
 });
 it("calls one transaction RPC for a complete order and requires all returned lines",async()=>{
  live();jsonFetch({order:{id:"saved-order"},items:[{id:"line",order_id:"saved-order"}]});
  const repository=new OrdersRepository();
  expect((await repository.createOrderWithItems({id:"saved-order"},[{quantity:1,unit_price:10}])).items).toHaveLength(1);
  jsonFetch({order:{id:"saved-order"},items:[]});
  await expect(repository.createOrderWithItems({id:"saved-order"},[{quantity:1,unit_price:10}])).rejects.toBeInstanceOf(DatabaseError);
 });
 it("removes the header and already-written demo lines after an injected local insert failure",async()=>{
  process.env.APP_ENV="demo";
  const repository=new OrdersRepository(),items=(repository as any).itemsRepository as BaseRepository<any>;
  const insert=items.create.bind(items);
  vi.spyOn(items,"create").mockImplementationOnce(insert).mockRejectedValueOnce(new DatabaseError("create","order_items"));
  await expect(repository.createOrderWithItems({id:"demo-rollback" as any},[{product_id:"cpu-1",quantity:1,unit_price:1},{product_id:"cpu-2",quantity:1,unit_price:1}])).rejects.toBeInstanceOf(DatabaseError);
  expect(await repository.findById("demo-rollback")).toBeNull();
  expect(await items.findMany({order_id:"demo-rollback"})).toEqual([]);
 });
 it("preserves explicit demo filtering, pagination, zero limits and shared writes",async()=>{
  process.env.APP_ENV="demo";
  const first=new BaseRepository<any>("demo-filter-contract",[{id:"one",owner:"a",rank:2},{id:"two",owner:"b",rank:1},{id:"three",owner:"a",rank:3}]);
  expect(await first.findMany({owner:"a"},{orderBy:"rank",orderDirection:"desc",offset:1,limit:1})).toEqual([{id:"one",owner:"a",rank:2}]);
  expect(await first.findMany(undefined,{limit:0})).toEqual([]);
  expect(await first.count({owner:"a"})).toBe(2);
  await first.create({id:"four",owner:"a",rank:4});
  expect(await new BaseRepository<any>("demo-filter-contract").findById("four")).not.toBeNull();
  expect(fetch).not.toHaveBeenCalled();
 });
 it("does not report a settings save as successful after a failed database update",async()=>{
  live();
  const repository=new HomepageSettingsRepository();
  const fetcher=vi.fn()
   .mockResolvedValueOnce(new Response(JSON.stringify({id:"homepage",modules:[],custom_pc_hero:{title:"Stored"},featured_prebuilt_ids:[]}),{status:200,headers:{"Content-Type":"application/json"}}))
   .mockResolvedValueOnce(new Response(JSON.stringify({code:"42501",message:"denied"}),{status:403,headers:{"Content-Type":"application/json"}}));
  vi.stubGlobal("fetch",fetcher);
  await expect(repository.saveLayout({featuredPrebuiltIds:["pb-1"]})).rejects.toBeInstanceOf(DatabaseError);
  jsonFetch({code:"42P01",message:"private schema"},404);
  expect((await settingsGET(new NextRequest("http://localhost:3000/api/admin/homepage-modules"))).status).toBe(503);
 });
 it("reports readiness separately from migration/configuration failure",async()=>{
  process.env.APP_ENV="demo";expect((await healthGET(new NextRequest("http://localhost:3000/api/health"))).status).toBe(200);
  live();jsonFetch(false);expect((await healthGET(new NextRequest("http://localhost:3000/api/health"))).status).toBe(503);
  jsonFetch(true);expect((await healthGET(new NextRequest("http://localhost:3000/api/health"))).status).toBe(503); // an older readiness RPC cannot confirm the new migration
  vi.stubGlobal("fetch",vi.fn(async(input:unknown)=>new Response(JSON.stringify(String(input).includes("/rpc/")?true:{version:"20261109090000_operational_controls"}),{status:200,headers:{"Content-Type":"application/json"}})));
  expect((await healthGET(new NextRequest("http://localhost:3000/api/health"))).status).toBe(200);
  jsonFetch({code:"PGRST202",message:"private missing function"},404);
  const failed=await healthGET(new NextRequest("http://localhost:3000/api/health"));expect(failed.status).toBe(503);expect(await failed.json()).toEqual({status:"unavailable"});
 });
});
