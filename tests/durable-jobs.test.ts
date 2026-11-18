import { afterAll,afterEach,beforeAll,beforeEach,describe,it,expect,vi } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { bootstrapPostgres } from "./support/postgres";
import { jobs,jobEvents,enqueue,claimJob,startRemote,finishJob,repairJob } from "@/lib/jobs/store";
import { runWorker,scheduleMaintenance } from "@/lib/jobs/worker";
import { JobError } from "@/lib/jobs/types";
import * as providers from "@/lib/jobs/providers";
import { BaseRepository,db } from "@/lib/db";
import { demoTransaction } from "@/lib/inventory/demoTransaction";
import { enqueueStockAlerts } from "@/lib/jobs/stockAlerts";
import { GET as adminGET,POST as adminPOST } from "@/app/api/admin/jobs/route";
import { POST as workerPOST } from "@/app/api/internal/jobs/run/route";
import { POST as stockPOST } from "@/app/api/products/[id]/notify-stock/route";
import { POST as marketplacePOST } from "@/app/api/webhooks/marketplace/route";
import { fixtureCookie } from "./support/session";
import { createOrderPOST } from "./support/checkout";
import { transitionInventory } from "@/lib/inventory/lifecycle";
let pg:Awaited<ReturnType<typeof bootstrapPostgres>>;
beforeAll(async()=>{pg=await bootstrapPostgres();},30000);afterAll(async()=>{await pg?.close();});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
const request=(path:string,body?:any,cookie="")=>new NextRequest("http://localhost:3000"+path,{method:body?"POST":"GET",headers:{...(cookie?{cookie}:{}),"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
async function rpc(name:string,params:any[]=[]){return (await pg.query<{r:any}>(`select public.${name}(${params.map((_,i)=>"$"+(i+1)).join(",")}) r`,params)).rows[0].r;}
async function enqueueSql(key=randomUUID(),resource:string|null=null){return rpc("enqueue_background_job",["email",key,JSON.stringify({to:"fixture@example.test",subject:"Fixture",html:"<p>Hi</p>"}),resource]);}
async function clearDemoQueue(){for(const e of await jobEvents.findMany())await jobEvents.delete(e.id);for(const j of await jobs.findMany())await jobs.delete(j.id!);}
beforeEach(clearDemoQueue);
describe("durable PostgreSQL outbox and worker leases",()=>{
 it("commits paid state and exactly one notification intent together; rollback preserves both",async()=>{
  const id=randomUUID();await pg.query("insert into public.orders(id,order_number,customer_id,customer_name,customer_email,customer_phone,fulfillment_type,subtotal,total,status) values($1,$1,'owner','Fixture','fixture@example.test','081234567890','click_and_collect',1000,1000,'pending_payment')",[id]);
  await expect(pg.transaction(async tx=>{await tx.query("update public.orders set paid_at=now(),status='ready_for_pickup' where id=$1",[id]);await tx.query("insert into public.orders(id) values($1)",[id]);})).rejects.toBeDefined();
  expect((await pg.query("select * from public.background_jobs where payload->>'orderId'=$1",[id])).rows).toHaveLength(0);
  await pg.query("update public.orders set paid_at=now(),status='ready_for_pickup' where id=$1",[id]);await pg.query("update public.orders set status='ready_for_pickup' where id=$1",[id]);
  expect((await pg.query("select kind from public.background_jobs where payload->>'orderId'=$1",[id])).rows).toHaveLength(2);
  await pg.query("update public.background_jobs set status='cancelled' where payload->>'orderId'=$1",[id]);
 });
 it("deduplicates keys, rejects changed payloads, and gives concurrent claims one owner",async()=>{
  const key=randomUUID(),j=await enqueueSql(key);expect((await enqueueSql(key)).id).toBe(j.id);
  await expect(rpc("enqueue_background_job",["email",key,'{"different":true}',null])).rejects.toMatchObject({code:"PT409"});
  const claims=await Promise.all([rpc("claim_background_job"),rpc("claim_background_job")]);expect(claims.filter(c=>c.job?.id===j.id)).toHaveLength(1);
  const owned=claims.find(c=>c.job?.id===j.id)!.job;await rpc("finish_background_job",[j.id,owned.lease_token,"accepted",null,"provider-1"]);
 });
 it("reclaims expired safe leases and refuses stale acknowledgement tokens",async()=>{
  const j=await enqueueSql();const a=(await rpc("claim_background_job")).job;expect(a.id).toBe(j.id);
  await pg.query("update public.background_jobs set lease_until=now()-interval '1 second' where id=$1",[j.id]);
  const b=(await rpc("claim_background_job")).job;expect(b.id).toBe(j.id);expect(b.lease_token).not.toBe(a.lease_token);
  await expect(rpc("finish_background_job",[j.id,a.lease_token,"accepted",null,"old"])).rejects.toMatchObject({code:"PT409"});
  await rpc("finish_background_job",[j.id,b.lease_token,"accepted",null,"new"]);
 });
 it("freezes requests across restart and quarantines unknown non-idempotent sends by resource",async()=>{
  const resource=randomUUID(),first=await enqueueSql(randomUUID(),resource),second=await enqueueSql(randomUUID(),resource);
  // The WASM clock can give both enqueues identical timestamps; establish the
  // priority this recovery scenario needs instead of relying on random UUID order.
  await pg.query("update public.background_jobs set available_at=now()-interval '1 second' where id=$1",[first.id]);
  const a=(await rpc("claim_background_job")).job;expect(a.id).toBe(first.id);
  await rpc("start_background_request",[a.id,a.lease_token,'{"provider":"whatsapp","body":{"text":"frozen"}}']);
  expect((await rpc("claim_background_job")).job).toBeNull();
  await pg.query("update public.background_jobs set lease_until=now()-interval '1 second' where id=$1",[a.id]);expect((await rpc("claim_background_job")).job).toBeNull();
  await expect(rpc("repair_background_job",[a.id,"retry","provider unknown","fixture-admin"])).rejects.toMatchObject({code:"PT409"});
  await rpc("repair_background_job",[a.id,"resolve","provider confirmed original send","fixture-admin"]);
  const b=(await rpc("claim_background_job")).job;expect(b.id).toBe(second.id);await rpc("finish_background_job",[b.id,b.lease_token,"accepted",null,"done"]);
 });
 it("preserves safe Resend request identity, backoff and finite attempts",async()=>{
  const j=await enqueueSql(),a=(await rpc("claim_background_job")).job;
  await rpc("start_background_request",[a.id,a.lease_token,'{"provider":"resend","body":{"subject":"frozen"}}']);
  await expect(rpc("start_background_request",[a.id,a.lease_token,'{"provider":"resend","body":{"subject":"changed"}}'])).rejects.toMatchObject({code:"PT409"});
  const retry=await rpc("finish_background_job",[a.id,a.lease_token,"retry","network_unknown",null]);expect(retry.status).toBe("retry");expect(Date.parse(retry.available_at)).toBeGreaterThan(Date.now());
  await pg.query("update public.background_jobs set available_at=now(),attempts=5 where id=$1",[j.id]);const b=(await rpc("claim_background_job")).job;expect(b.attempts).toBe(6);
  const done=await rpc("finish_background_job",[b.id,b.lease_token,"retry","still_failed",null]);expect(["dead","review"]).toContain(done.status);
 });
 it("scans only verified available subscriptions and records notification only on accepted completion",async()=>{
  const id=randomUUID(),uid=randomUUID(),owner=randomUUID();await pg.query("insert into auth.users(id) values($1)",[uid]);
  await pg.query("insert into public.customer_profiles(id,user_id,email,full_name,phone,address_line1,subdistrict,city,province,postal_code) values($1,$2,'owner@example.test','Owner','','','','','','')",[owner,uid]);
  await pg.query("insert into public.products(id,sku,name,slug,brand,retail_price,is_active) values($1,$1,'Alert fixture',$1,'Fixture',1000,true)",[id]);
  await pg.query("insert into public.store_inventory(id,store_id,product_id,stock_on_hand,stock_reserved) values($1,'00000000-0000-0000-0000-000000000001',$1,0,0)",[id]);
  await pg.query("insert into public.stock_notifications(product_id,email) values($1,'legacy-unverified@example.test')",[id]);
  const n=await rpc("subscribe_stock_alert",[id,null,owner,"owner@example.test"]);expect(n.verified_contact).toBe(true);expect(await rpc("enqueue_stock_alerts",[50])).toBe(0);
  await expect(rpc("subscribe_stock_alert",[id,"foreign-variant",owner,"owner@example.test"])).rejects.toMatchObject({code:"22023"});
  await pg.query("update public.store_inventory set stock_on_hand=2 where id=$1",[id]);expect(await rpc("enqueue_stock_alerts",[50])).toBe(1);expect(await rpc("enqueue_stock_alerts",[50])).toBe(0);
  const j=(await rpc("claim_background_job")).job;expect(j.payload.notificationId).toBe(n.id);await rpc("finish_background_job",[j.id,j.lease_token,"retry","provider_failed",null]);
  expect((await pg.query<{n:string|null}>("select notified_at n from public.stock_notifications where id=$1",[n.id])).rows[0].n).toBeNull();
  await pg.query("update public.background_jobs set available_at=now() where id=$1",[j.id]);const retry=(await rpc("claim_background_job")).job;await rpc("finish_background_job",[retry.id,retry.lease_token,"accepted",null,"receipt"]);
  expect((await pg.query<{n:string|null}>("select notified_at n from public.stock_notifications where id=$1",[n.id])).rows[0].n).not.toBeNull();
 });
 it("schedules maintenance once and keeps queue storage/functions private",async()=>{
  await rpc("schedule_background_maintenance");await rpc("schedule_background_maintenance");
  expect((await pg.query("select kind from public.background_jobs where event_key like 'maintenance:%'")).rows).toHaveLength(5);
  for(const role of ["anon","authenticated","service_role"]){
   expect((await pg.query<{ok:boolean}>("select has_table_privilege($1,'public.background_jobs','INSERT,UPDATE,DELETE') ok",[role])).rows[0].ok).toBe(false);
   if(role!=="service_role")expect((await pg.query<{ok:boolean}>("select has_function_privilege($1,'public.claim_background_job()','EXECUTE') ok",[role])).rows[0].ok).toBe(false);
  }
  expect((await rpc("application_security_audit")).ok).toBe(true);
 });
});
describe("dummy worker, failures and operator controls",()=>{
 it("rolls back payment and jobs when intent persistence fails and retries safely",async()=>{
  const id=randomUUID();await db.products.create({id,sku:id,slug:id,name:"Fixture",brand:"Fixture",retail_price:1001,is_active:true,specs:{}});await db.inventory.create({id,store_id:"00000000-0000-0000-0000-000000000001",product_id:id,stock_on_hand:2,stock_reserved:0});
  const response=await createOrderPOST(request("/api/checkout/create-order",{customer:{name:"Fixture",email:"fixture@example.test",phone:"081234567890"},fulfillmentType:"click_and_collect",items:[{id,quantity:1}]}));expect(response.status).toBe(200);const order=await response.json();
  vi.spyOn(jobs,"create").mockRejectedValueOnce(new Error("Outbox unavailable"));await expect(transitionInventory(order.orderId,"settle","fixture")).rejects.toThrow();
  expect((await db.orders.findById(order.orderId))!.paid_at).toBeFalsy();expect((await db.inventory.findById(id))!.stock_on_hand).toBe(2);expect(await jobs.count()).toBe(0);
  await transitionInventory(order.orderId,"settle","fixture");await transitionInventory(order.orderId,"settle","fixture");expect(await jobs.count({kind:"order_invoice"})).toBe(1);
  const fetcher=vi.spyOn(globalThis,"fetch");await runWorker();expect((await jobs.findOne({kind:"order_invoice"}))!.status).toBe("simulated");expect(fetcher).not.toHaveBeenCalled();
 });
 it("does not lose a failed send, retries the identical request after a new worker starts and saves acceptance",async()=>{
  const j=await enqueue("email",randomUUID(),{to:"fixture@example.test",subject:"Fixed",html:"<p>Frozen</p>"});
  const delivery=vi.spyOn(providers,"deliverEmail").mockRejectedValueOnce(new JobError("network_unknown")).mockResolvedValueOnce({id:"provider-id",simulated:false});
  await runWorker(1);const first=(await jobs.findById(j.id))!;expect(first.status).toBe("retry");expect(first.request.body.subject).toBe("Fixed");
  await jobs.update(j.id,{available_at:new Date(0).toISOString()});await runWorker(1);expect((await jobs.findById(j.id))!.status).toBe("accepted");expect(delivery.mock.calls[0][0].request).toEqual(delivery.mock.calls[1][0].request);expect(await jobEvents.count({job_id:j.id})).toBe(2);
 });
 it("keeps marketplace sync undecided, supports absolute stock fixtures and never applies inbound stock blindly",async()=>{
  const id=randomUUID();await db.products.create({id,sku:id,name:"Mapped",slug:id,is_active:true,retail_price:1000,brand:"Fixture",specs:{}});await db.inventory.create({id,store_id:"00000000-0000-0000-0000-000000000001",product_id:id,stock_on_hand:5,stock_reserved:0});
  const mapping=await new BaseRepository<any>("marketplace_product_mappings").create({product_id:id,variant_id:null,external_provider:"ginee",external_sku:id,buffer_stock:1});
  await db.inventory.update(id,{stock_reserved:2});const j=(await jobs.findMany({kind:"marketplace_sync"}))[0];expect(j.payload.mappingId).toBe(mapping.id);await runWorker(1);expect((await jobs.findById(j.id))!.request.availableStock).toBe(2);expect((await jobs.findById(j.id))!.status).toBe("simulated");
  const body={provider:"ginee",channel:"shopee",eventId:randomUUID(),sku:id,available_stock:0};
  const incoming=()=>new NextRequest("http://localhost/api/webhooks/marketplace",{method:"POST",headers:{"x-marketplace-token":"demo-webhook-only"},body:JSON.stringify(body)});
  expect((await marketplacePOST(incoming())).status).toBe(202);expect((await marketplacePOST(incoming())).status).toBe(202);expect(await jobs.count({kind:"marketplace_inbound"})).toBe(1);await runWorker();expect((await db.inventory.findById(id))!.stock_on_hand).toBe(5);
  vi.stubEnv("APP_ENV","live");expect((await marketplacePOST(incoming())).status).toBe(503);
 });
 it("requires verified stock-alert identity, queues only available variants, and marks notified only after acceptance",async()=>{
  const id=randomUUID();await db.products.create({id,sku:id,name:"Stock fixture",slug:id,is_active:true,retail_price:1000,brand:"Fixture",specs:{}});await db.inventory.create({id,store_id:"00000000-0000-0000-0000-000000000001",product_id:id,stock_on_hand:0,stock_reserved:0});
  const cookie=fixtureCookie("stock-owner@example.test"),context={params:Promise.resolve({id})};
  const response=await stockPOST(request(`/api/products/${id}/notify-stock`,{email:"attacker@example.test"},cookie),context);expect(response.status).toBe(201);const n=(await response.json()).notification;expect(n.email).toBe("stock-owner@example.test");expect(n.verified_contact).toBe(true);
  expect(await enqueueStockAlerts()).toBe(0);await db.inventory.update(id,{stock_on_hand:1});expect(await enqueueStockAlerts()).toBe(1);expect(await enqueueStockAlerts()).toBe(0);expect((await db.stockNotifications.findById(n.id))!.notified_at).toBeFalsy();
  await runWorker();expect((await db.stockNotifications.findById(n.id))!.notified_at).toBeTruthy();
  expect((await stockPOST(request(`/api/products/${id}/notify-stock`,{}),context)).status).toBe(401);
 });
 it("bounds worker access, hides payloads and restricts repair to the administrator",async()=>{
  await enqueue("email",randomUUID(),{to:"private@example.test",subject:"Private",html:"secret-html"});
  expect((await adminGET(request("/api/admin/jobs"))).status).toBe(401);
  const response=await adminGET(request("/api/admin/jobs",undefined,fixtureCookie("SUPPORT_AGENT")));const text=await response.text();expect(response.status).toBe(200);expect(text).not.toContain("secret-html");expect(text).not.toContain("private@example.test");
  expect((await adminPOST(request("/api/admin/jobs",{action:"run_demo"},fixtureCookie("SUPPORT_AGENT")))).status).toBe(403);
  vi.stubEnv("BACKGROUND_JOB_SECRET","fixture-job-secret-32-characters-long");expect((await workerPOST(request("/api/internal/jobs/run",{}))).status).toBe(401);
  const r=await workerPOST(new NextRequest("http://localhost/api/internal/jobs/run",{method:"POST",headers:{authorization:"Bearer "+process.env.BACKGROUND_JOB_SECRET}}));expect(r.status).toBe(200);
 });
});
describe("provider acceptance and uncertainty fixtures",()=>{
 const emailJob=()=>({id:randomUUID(),request:{provider:"resend",body:{from:"store@example.test",to:"fixture@example.test",subject:"Saved",html:"<p>Saved</p>"}},remote_started_at:new Date().toISOString()} as any);
 it("uses one stable Resend idempotency key and distinguishes rejection from acceptance",async()=>{
  vi.stubEnv("APP_ENV","live");vi.stubEnv("NOTIFICATIONS_ENABLED","true");vi.stubEnv("RESEND_API_KEY","fixture-key");vi.stubEnv("EMAIL_FROM","store@example.test");
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response('{"id":"provider-accepted"}',{status:200})),job=emailJob();
  expect((await providers.deliverEmail(job)).id).toBe("provider-accepted");expect((fetcher.mock.calls[0][1]?.headers as any)["Idempotency-Key"]).toBe("job/"+job.id);
  fetcher.mockResolvedValueOnce(new Response('{"name":"invalid_idempotent_request"}',{status:409}));await expect(providers.deliverEmail(job)).rejects.toMatchObject({disposition:"review"});
  job.remote_started_at=new Date(Date.now()-24*3600000).toISOString();await expect(providers.deliverEmail(job)).rejects.toMatchObject({code:"email_idempotency_window_expired"});
 });
 it("does not treat missing live configuration or an ambiguous WhatsApp response as delivery",async()=>{
  vi.stubEnv("APP_ENV","live");vi.stubEnv("NOTIFICATIONS_ENABLED","false");await expect(providers.deliverEmail(emailJob())).rejects.toMatchObject({disposition:"blocked"});
  vi.stubEnv("WHATSAPP_ENABLED","true");vi.stubEnv("WHATSAPP_API_TOKEN","fixture");vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID","123");vi.stubEnv("WHATSAPP_GRAPH_VERSION","v99.0");
  vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("Timeout"));await expect(providers.deliverWhatsapp(emailJob())).rejects.toMatchObject({disposition:"review",code:"whatsapp_outcome_unknown"});
 });
});
