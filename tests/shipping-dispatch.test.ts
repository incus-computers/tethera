import { beforeEach,afterEach,describe,it,expect,vi } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { prepareDispatch,dispatchOrder,shippingOperations,applyShipment } from "@/lib/shipping/dispatch";
import { shippingRequest,shipmentEvidence,shippingConfig } from "@/lib/shipping/gateway";
import { BiteshipService,TETHERA_WAREHOUSE_ORIGIN } from "@/lib/shipping/biteship";
import { POST as webhook } from "@/app/api/webhooks/biteship/route";
import { POST as dispatchRoute } from "@/app/api/admin/courier/dispatch/route";
import { fixtureCookie } from "./support/session";
let order:any;const options={courierProvider:"jne",serviceCode:"jne-reg",packingConfirmed:true};
beforeEach(async()=>{
 vi.restoreAllMocks();
 order=(await db.orders.createOrderWithItems({order_number:randomUUID(),customer_id:"fixture",customer_name:"Shipping Fixture",customer_email:"shipping@example.test",customer_phone:"081234567890",fulfillment_type:"delivery",shipping_address:{street:"Fixture Street",subdistrict:"Fixture",city:"Jakarta",province:"DKI Jakarta",postalCode:"10730",country:"Indonesia"},status:"ready_for_dispatch",paid_at:new Date().toISOString(),payment_reference:"FIXTURE-PAID",subtotal:1000,shipping_fee:20000,assembly_fee:0,total:21000},[{product_id:"cpu-1",quantity:1,unit_price:1000,is_custom_build:false}])).order;
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
describe("shipping operation and callback protection",()=>{
 it("rejects malformed or oversized callbacks before any shipment lookup",async()=>{
  const lookup=vi.spyOn(shippingOperations,"findOne");
  for(const [body,status] of [["{",400],["null",400],["x".repeat(50001),413]] as const){
   const result=await webhook(new NextRequest("http://localhost/api/webhooks/biteship",{method:"POST",headers:{"x-biteship-token":"demo-webhook-only"},body}));expect(result.status).toBe(status);
  }
  expect(lookup).not.toHaveBeenCalled();
 });
 it("requires paid delivery readiness and never invents a missing destination",async()=>{
  await db.orders.update(order.id,{paid_at:null});await expect(dispatchOrder(order.id,options,"staff")).rejects.toThrow(/paid/);
  await db.orders.update(order.id,{paid_at:new Date().toISOString(),fulfillment_type:"click_and_collect"});await expect(dispatchOrder(order.id,options,"staff")).rejects.toThrow(/paid/);
  await db.orders.update(order.id,{fulfillment_type:"delivery",shipping_address:null});await expect(dispatchOrder(order.id,options,"staff")).rejects.toThrow(/delivery details/);
 });
 it("concurrent requests claim one booking and one set of physical allocations",async()=>{
  const prepared=await Promise.all(Array.from({length:6},()=>prepareDispatch(order.id,options,"staff")));
  expect(prepared.filter(p=>p.may_create)).toHaveLength(1);expect(new Set(prepared.map(p=>p.operation.id)).size).toBe(1);
  const fulfillments=await db.fulfillments.getFulfillmentsByOrder(order.id);expect(fulfillments).toHaveLength(1);expect(fulfillments[0].items).toHaveLength(1);
 });
 it("supports dummy booking and repeated dispatch without creating another provider identity",async()=>{
  const first=await dispatchOrder(order.id,options,"staff"),second=await dispatchOrder(order.id,options,"staff");
  expect(second.operation.provider_id).toBe(first.operation.provider_id);expect(first.order.status).toBe("finding_courier");expect(first.operation.evidence.waybill_id).toMatch(/^DEMO-/);
 });
 it("keeps the agreed customer total unchanged on courier cost changes and cancellation",async()=>{
  const initial=await dispatchOrder(order.id,options,"staff"),op=initial.operation;
  await applyShipment(op,{provider_id:op.provider_id,reference_id:op.reference_id,status:"cancelled",carrier_cost:35000});
  const saved=(await db.orders.findById(order.id))!;expect(saved.total).toBe(21000);expect(saved.shipping_fee).toBe(20000);expect(saved.paid_at).toBe(order.paid_at);expect(saved.status).toBe("courier_failed");
  expect((await shippingOperations.findById(op.id))!.state).toBe("review");
 });
 it("does not regress delivery on duplicate or reordered callbacks",async()=>{
  const initial=await dispatchOrder(order.id,options,"staff"),op=initial.operation;
  const delivered={provider_id:op.provider_id,reference_id:op.reference_id,status:"delivered",carrier_cost:25000};
  await applyShipment(op,delivered);expect((await applyShipment(op,delivered)).replayed).toBe(true);
  await applyShipment(op,{...delivered,status:"picking_up"});await applyShipment(op,{...delivered,status:"cancelled"});
  expect((await db.orders.findById(order.id))!.status).toBe("delivery_arrived");
 });
 it("rejects unknown, spoofed or wrong-reference callbacks without changing an order",async()=>{
  const call=(body:any,secret="demo-webhook-only")=>webhook(new NextRequest("http://localhost/api/webhooks/biteship",{method:"POST",headers:{"x-biteship-token":secret},body:JSON.stringify(body)}));
  expect((await call({event:"order.status",order_id:"unknown",reference_id:order.order_number,status:"delivered"})).status).toBe(404);
  const initial=await dispatchOrder(order.id,options,"staff"),op=initial.operation;
  expect((await call({event:"order.status",order_id:op.provider_id,status:"delivered"},"wrong")).status).toBe(401);
  expect((await call({event:"order.status",order_id:op.provider_id,reference_id:"wrong",status:"delivered"})).status).toBe(409);
  expect((await db.orders.findById(order.id))!.status).toBe("finding_courier");
 });
 it("rolls booking-state writes back if fulfillment persistence fails",async()=>{
  const initial=await prepareDispatch(order.id,options,"staff"),op=initial.operation;
  vi.spyOn(db.fulfillments,"update").mockRejectedValueOnce(new Error("Injected DB failure"));
  const evidence={provider_id:"demo-provider",reference_id:op.reference_id,status:"allocated",carrier_cost:25000};
  await expect(applyShipment(op,evidence)).rejects.toThrow();expect((await shippingOperations.findById(op.id))!.provider_id).toBeUndefined();
  expect((await applyShipment(op,evidence)).operation.state).toBe("booked");
 });
 it("blocks staff without dispatch permission from shipping simulations",async()=>{
  const response=await dispatchRoute(new NextRequest("http://localhost/api/admin/courier/dispatch",{method:"POST",headers:{cookie:fixtureCookie("SUPPORT_AGENT")},body:JSON.stringify({orderId:order.id,action:"simulate_arrival"})}));
  expect(response.status).toBe(403);
 });
});
describe("offline Biteship provider failures",()=>{
 function live(){vi.stubEnv("APP_ENV","staging");vi.stubEnv("BITESHIP_ENV","test");vi.stubEnv("BITESHIP_API_KEY","biteship_test.fixture-not-real");vi.stubEnv("BITESHIP_BASE_URL","https://api.biteship.com/v1");}
 it("sends real package dimensions with the postal origin and rejects incomplete packages before quoting",async()=>{
  live();const fetcher=vi.fn(async()=>new Response(JSON.stringify({success:true,pricing:[{courier_code:"jne",courier_service_code:"reg",price:25000}]}),{status:200}));vi.stubGlobal("fetch",fetcher);
  const item={id:"fixture",name:"Fixture parcel",price:1000,quantity:2,weightGrams:600,dimensionsCm:{length:40,width:30,height:20}};
  await new BiteshipService().getRates({destination:{address:"Fixture",postalCode:"10730"},items:[item]});
  const payload=JSON.parse(String((fetcher.mock.calls[0] as any)[1].body));expect(payload.origin_postal_code).toBe(TETHERA_WAREHOUSE_ORIGIN.postalCode);expect(payload.origin_area_id).toBeUndefined();expect(payload.items[0]).toMatchObject({quantity:2,weight:600,length:40,width:30,height:20});
  await expect(new BiteshipService().getRates({destination:{address:"Fixture",postalCode:"10730"},items:[{...item,dimensionsCm:{length:40} as any}]})).rejects.toThrow(/package/);expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it.each([401,429,500])("provider HTTP %s never becomes successful booking or invented rates",async status=>{
  live();vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({success:false}),{status})));
  await expect(shippingRequest("/orders",{reference_id:"fixture"})).rejects.toThrow();await expect(new BiteshipService().getRates({destination:{address:"Fixture",postalCode:"10730"},items:[]})).rejects.toThrow();
 });
 it("returns an explicit unknown outcome on timeout and never fabricates a provider ID",async()=>{
  live();vi.stubGlobal("fetch",vi.fn(async()=>{throw new Error("timeout");}));await expect(shippingRequest("/orders",{})).rejects.toThrow(/unknown/);
 });
 it("does not synthesize unknown areas outside demo",async()=>{
  live();vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({success:true,areas:[]}),{status:200})));expect(await new BiteshipService().searchAreas("unknown area")).toEqual([]);
 });
 it("requires matching shipment identity and does not invent absent waybill or driver details",()=>{
  const result=shipmentEvidence({success:true,id:"provider",reference_id:"SHIP-fixture",status:"confirmed",courier:{}},"SHIP-fixture");expect(result.waybill_id).toBe(null);expect(result.driver_name).toBe(null);
  expect(()=>shipmentEvidence({success:true,id:"provider",reference_id:"other",status:"delivered"},"SHIP-fixture")).toThrow();
 });
 it("preserves package dimensions and the quote origin in the saved booking manifest",async()=>{
  await db.orders.update(order.id,{courier_info:{courier_company:"jne",service_code:"jne-reg",quote_origin:TETHERA_WAREHOUSE_ORIGIN,quote_items:[{id:"fixture",name:"Fixture",price:1000,quantity:2,weightGrams:600,dimensionsCm:{length:40,width:30,height:20}}]} as any});
  const result=await prepareDispatch(order.id,options,"staff");expect(result.operation.request.items[0]).toMatchObject({weight:600,length:40,width:30,height:20,quantity:2});expect(result.operation.request.destination_postal_code).toBe(10730);
 });
 it("requires explicit matching key/environment and blocks accidental production shipping",()=>{
  live();vi.stubEnv("APP_ENV","production");expect(()=>shippingConfig()).toThrow(/Production/);
 });
 it("does not send a second booking after a lost provider response",async()=>{
  const quoted={...order,courier_info:{quote_insurance:{value:1000,fee:5},courier_company:"jne",service_code:"jne-reg",quote_origin:TETHERA_WAREHOUSE_ORIGIN,quote_items:[{id:"fixture",name:"Fixture",price:1000,quantity:1,weightGrams:600,dimensionsCm:{length:40,width:30,height:20}}]}};
  vi.spyOn(db.orders,"findById").mockResolvedValue(quoted);live();vi.stubEnv("BITESHIP_ORIGIN_CONFIRMED","true");vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://shipping-fixture.supabase.invalid");vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","fixture-service");
  let claims=0,bookings=0;
  vi.stubGlobal("fetch",vi.fn(async(input:unknown)=>{
   const url=String(input);
   if(url.includes("/rpc/prepare_shipping_dispatch"))return new Response(JSON.stringify({success:true,may_create:++claims===1,operation:{id:"operation",order_id:order.id,environment:"test",reference_id:"SHIP-operation",request:{reference_id:"SHIP-operation"},state:"creating"}}),{status:200});
   if(url==="https://api.biteship.com/v1/orders"){bookings++;throw new Error("Injected lost response");}throw new Error("Unexpected fixture URL");
  }));
  await expect(dispatchOrder(order.id,options,"staff")).rejects.toThrow(/unknown/);await expect(dispatchOrder(order.id,options,"staff")).rejects.toThrow(/unknown/);expect(bookings).toBe(1);
 });
 it("retrieves provider status rather than trusting a callback's delivered or price claim",async()=>{
  live();vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://shipping-fixture.supabase.invalid");vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","fixture-service");vi.stubEnv("BITESHIP_WEBHOOK_SECRET","fixture-webhook-secret-32-characters-long");
  let applied:any=null;
  vi.stubGlobal("fetch",vi.fn(async(input:unknown,init?:RequestInit)=>{
   const url=String(input);
   if(url.includes("/shipping_operations?"))return new Response(JSON.stringify([{id:"operation",order_id:order.id,provider_id:"provider",reference_id:"SHIP-reference",environment:"test",state:"booked"}]),{status:200});
   if(url==="https://api.biteship.com/v1/orders/provider")return new Response(JSON.stringify({success:true,id:"provider",reference_id:"SHIP-reference",status:"in_transit",price:25000,courier:{}}),{status:200});
   if(url.includes("/rpc/apply_shipping_evidence")){applied=JSON.parse(String(init?.body));return new Response(JSON.stringify({operation:{state:"booked",shipment_status:"in_transit"}}),{status:200});}throw new Error("Unexpected fixture URL");
  }));
  const r=await webhook(new NextRequest("https://store.example/api/webhooks/biteship",{method:"POST",headers:{"x-biteship-token":process.env.BITESHIP_WEBHOOK_SECRET!},body:JSON.stringify({event:"order.price",order_id:"provider",status:"delivered",price:1})}));
  expect(r.status).toBe(200);expect(applied.p_evidence.status).toBe("in_transit");expect(applied.p_evidence.carrier_cost).toBe(25000);
 });
});
