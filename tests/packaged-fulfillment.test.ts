import { beforeEach,afterEach,describe,it,expect,vi } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { db,BaseRepository,InventoryReservationRow } from "@/lib/db";
import { catalogParcel } from "@/lib/shipping/packages";
import { quoteParcel,prepareParcel,bookParcel } from "@/lib/shipping/parcels";
import { shippingOperations,applyShipment } from "@/lib/shipping/dispatch";
import { BiteshipService,TETHERA_WAREHOUSE_ORIGIN } from "@/lib/shipping/biteship";
import { normalizeCheckout,priceBasket } from "@/lib/checkout/catalog";
import { SERVICE_TIERS } from "@/lib/data/mockHardware";
import { POST as ratesPOST } from "@/app/api/checkout/shipping-rates/route";
import { PUT as profilePUT } from "@/app/api/admin/products/shipping/route";
import { POST as parcelsPOST } from "@/app/api/admin/fulfillments/route";
import { fixtureCookie } from "./support/session";
let order:any,line:string,product:any,body:any;
const profile={weight_grams:600,dimensions_cm:{length:30,width:20,height:15},handling:"fragile" as const};
beforeEach(async()=>{
 vi.restoreAllMocks();const id=randomUUID();
 product=await db.products.create({id,sku:id,name:"Parcel fixture",slug:id,brand:"Fixture",retail_price:1000,is_active:true,specs:{shipping:profile}} as any);
 await db.inventory.create({id:randomUUID(),product_id:id,store_id:"00000000-0000-0000-0000-000000000001",stock_on_hand:10,stock_reserved:0,low_stock_threshold:1});
 const result=await db.orders.createOrderWithItems({order_number:randomUUID(),customer_id:"cust-001",customer_name:"Parcel fixture",customer_email:"alex.gamer@example.com",customer_phone:"081234567890",fulfillment_type:"delivery",shipping_address:{street:"Fixture Street",subdistrict:"Sawah Besar",city:"Jakarta",province:"DKI Jakarta",postalCode:"10730",country:"Indonesia"},status:"ready_for_dispatch",paid_at:new Date().toISOString(),payment_reference:"FIXTURE-PAID",subtotal:2000,shipping_fee:20000,assembly_fee:0,total:22000,courier_info:{quote_origin:TETHERA_WAREHOUSE_ORIGIN} as any},[{product_id:id,quantity:2,unit_price:1000,is_custom_build:false}]);
 order=result.order;line=result.items[0].id;
 await new BaseRepository<InventoryReservationRow>("inventory_reservations").create({order_id:order.id,product_id:id,store_id:"00000000-0000-0000-0000-000000000001",quantity:2,status:"settled",expires_at:new Date().toISOString()});
 body={orderId:order.id,carrier:"jne",serviceCode:"jne-reg",items:[{orderItemId:line,quantity:1}],parcel:profile,packingConfirmed:true};
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
async function quoted(input=body){const q=await quoteParcel(input);return {...input,expectedCarrierCost:q.rate.price};}
function evidence(op:any,status:string,insured=op.request.courier_insurance){return {provider_id:op.provider_id,reference_id:op.reference_id,status,insured_value:insured,insurance_fee:5};}
describe("measured parcel allocation and complete-order progress",()=>{
 it("derives declared value from saved order lines and preserves actual box dimensions",async()=>{
  const result=await prepareParcel(await quoted({...body,insuranceValue:1,price:1}),randomUUID(),"staff");
  expect(result.operation.request.courier_insurance).toBe(1000);expect(result.operation.request.items[0]).toMatchObject({value:1000,quantity:1,weight:600,length:30,width:20,height:15});
 });
 it("replays a booked parcel without another identity and refuses changed requests",async()=>{
  const request=await quoted(),key=randomUUID(),first=await bookParcel(request,key,"staff"),second=await bookParcel(request,key,"staff");
  expect(second.operation.id).toBe(first.operation.id);expect(first.operation.evidence.waybill_id).toMatch(/^DEMO-/);
  await expect(bookParcel({...request,parcel:{...profile,weight_grams:700}},key,"staff")).rejects.toThrow(/conflict/);
 });
 it("allows only one competing allocation of the final units",async()=>{
  const request=await quoted({...body,items:[{orderItemId:line,quantity:2}]}),results=await Promise.allSettled([bookParcel(request,randomUUID(),"staff"),bookParcel(request,randomUUID(),"staff")]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(await db.fulfillments.findMany({order_id:order.id})).toHaveLength(1);
 });
 it("claims a same-key concurrent parcel once",async()=>{
  const request=await quoted(),key=randomUUID(),results=await Promise.all(Array.from({length:5},()=>prepareParcel(request,key,"staff")));
  expect(results.filter(r=>r.may_create)).toHaveLength(1);expect(new Set(results.map(r=>r.operation.id)).size).toBe(1);
 });
 it("marks the order delivered only after every physical quantity arrives",async()=>{
  const first=(await bookParcel(await quoted(),randomUUID(),"staff")).operation;
  expect((await applyShipment(first,evidence(first,"delivered"))).order.status).toBe("partially_fulfilled");
  const second=(await bookParcel(await quoted(),randomUUID(),"staff")).operation;
  expect((await applyShipment(second,evidence(second,"in_transit"))).order.status).toBe("on_delivery");
  expect((await applyShipment(second,evidence(second,"delivered"))).order.status).toBe("delivery_arrived");
  await applyShipment(first,evidence(first,"picking_up"));expect((await db.orders.findById(order.id))!.status).toBe("delivery_arrived");
  expect((await db.orders.findById(order.id))!.total).toBe(22000);
 });
 it("retains failed parcel allocations and records insurance uncertainty separately",async()=>{
  const op=(await bookParcel(await quoted(),randomUUID(),"staff")).operation;
  expect((await applyShipment(op,evidence(op,"allocated",1))).operation.state).toBe("review");
  expect((await applyShipment(op,evidence(op,"allocated"))).operation.state).toBe("booked");
  await applyShipment(op,evidence(op,"failed"));
  await expect(bookParcel(await quoted({...body,items:[{orderItemId:line,quantity:2}]}),randomUUID(),"staff")).rejects.toThrow(/remaining/);
  expect((await db.orders.findById(order.id))!.paid_at).toBe(order.paid_at);
 });
 it("rejects missing packing confirmation, fractional dimensions, foreign lines and unpaid orders",async()=>{
  await expect(quoteParcel({...body,packingConfirmed:false})).rejects.toThrow(/packing/);
  await expect(quoteParcel({...body,parcel:{...profile,dimensions_cm:{length:1.5,width:20,height:15}}})).rejects.toThrow(/dimensions/);
  await expect(quoteParcel({...body,items:[{orderItemId:"foreign",quantity:1}]})).rejects.toThrow(/belong/);
  const request=await quoted();await db.orders.update(order.id,{paid_at:null});await expect(bookParcel(request,randomUUID(),"staff")).rejects.toThrow(/Paid/);
 });
 it("rejects stale charges and missing settled stock before claiming a booking",async()=>{
  const request=await quoted();await expect(bookParcel({...request,expectedCarrierCost:request.expectedCarrierCost-1},randomUUID(),"staff")).rejects.toThrow(/price/);
  const holds=new BaseRepository<InventoryReservationRow>("inventory_reservations");for(const hold of await holds.findMany({order_id:order.id}))await holds.update(hold.id,{status:"released"});
  await expect(bookParcel(request,randomUUID(),"staff")).rejects.toThrow(/coverage/);expect(await shippingOperations.findMany({order_id:order.id})).toHaveLength(0);
 });
 it("rolls allocations and fulfillment back if the operation write fails",async()=>{
  const request=await quoted();vi.spyOn(shippingOperations,"create").mockRejectedValueOnce(new Error("Injected failure"));
  await expect(bookParcel(request,randomUUID(),"staff")).rejects.toThrow();expect(await db.fulfillments.findMany({order_id:order.id})).toHaveLength(0);
 });
 it("does not split assembled components into independent shipments",async()=>{
  const group="build-1";await new BaseRepository<any>("order_items").update(line,{checkout_metadata:{build:group}});
  await new BaseRepository<any>("order_items").create({order_id:order.id,product_id:"cpu-1",quantity:1,unit_price:1000,is_custom_build:true,checkout_metadata:{build:group}});
  await expect(quoteParcel(body)).rejects.toThrow(/together/);
 });
 it("enforces dispatch permissions on the new quote path",async()=>{
  const result=await parcelsPOST(new NextRequest("http://localhost/api/admin/fulfillments",{method:"POST",headers:{cookie:fixtureCookie("SUPPORT_AGENT")},body:JSON.stringify({...body,action:"quote"})}));expect(result.status).toBe(403);
 });
});
describe("authoritative packaging and insured rates",()=>{
 it("uses a canonical variant profile and requires explicit approval to inherit parent packaging",()=>{
  vi.stubEnv("APP_ENV","staging");const variant:any={id:"variant",shipping:{...profile,weight_grams:2500}};
  expect(catalogParcel(product,variant,1000,1).weightGrams).toBe(2500);
  expect(()=>catalogParcel(product,{...variant,shipping:null},1000,1)).toThrow();
  expect(catalogParcel({...product,specs:{shipping:{...profile,variants_share_package:true}}},{...variant,shipping:null},1000,1).weightGrams).toBe(600);
  const assembled={...product,specs:{assembled_shipping:{...profile,weight_grams:15000}}};
  expect(()=>catalogParcel(assembled,variant,1000,1,true)).toThrow(/case variant/);
  expect(catalogParcel({...assembled,specs:{assembled_shipping:{...assembled.specs.assembled_shipping,variants_share_package:true}}},variant,1000,1,true).weightGrams).toBe(15000);
 });
 it("keeps assembly service fees out of declared physical goods value",async()=>{
  const parts:any={};for(const slot of ["cpu","motherboard","ram","storage_primary","case","psu"]){const id=randomUUID();await db.products.create({id,sku:id,name:slot,slug:id,brand:"Fixture",retail_price:1000,is_active:true,pc_builder_slot:slot,specs:{socket:"AM5",ram_type:"DDR5",wattage:850,assembled_shipping:{...profile,weight_grams:15000}}} as any);await db.inventory.create({id:randomUUID(),product_id:id,store_id:"00000000-0000-0000-0000-000000000001",stock_on_hand:5,stock_reserved:0,low_stock_threshold:1});parts[slot]={id};}
  const result=await priceBasket(normalizeCheckout({customer:{name:"Fixture",email:"f@example.test",phone:"081234567890",customerId:"fixture"},fulfillmentType:"delivery",shippingAddress:order.shipping_address,selectedRate:{courierId:"jne",serviceCode:"jne-reg"},customPCs:[{parts,serviceTier:{id:SERVICE_TIERS.find(t=>t.price>0)!.id}}]}));
  expect(result.assemblyFee).toBeGreaterThan(0);expect(result.packages[0].price).toBe(6000);expect(result.packages[0].weightGrams).toBe(15000);
 });
 it("quotes checkout shipping from server SKU data despite forged browser measurements/value",async()=>{
  const response=await ratesPOST(new NextRequest("http://localhost/api/checkout/shipping-rates",{method:"POST",headers:{cookie:fixtureCookie("alex.gamer@example.com")},body:JSON.stringify({customer:{name:"Fixture",email:"ignored@example.test",phone:"081234567890"},fulfillmentType:"delivery",shippingAddress:order.shipping_address,items:[{id:product.id,quantity:2,price:1,weightGrams:1}]})}));
  expect(response.status).toBe(200);const data=await response.json();expect(data.insuranceValue).toBe(2000);expect(data.packages[0].weightGrams).toBe(600);expect(data.rates[0].insuranceFee).toBe(10);
 });
 it("saves measured profiles with catalog permission and rejects another product's variant",async()=>{
  const req=(role:string,extra:any={})=>new NextRequest("http://localhost/api/admin/products/shipping",{method:"PUT",headers:{cookie:fixtureCookie(role)},body:JSON.stringify({productId:product.id,kind:"shipping",profile:{...profile,weight_grams:1900},...extra})});
  expect((await profilePUT(req("SUPPORT_AGENT"))).status).toBe(403);expect((await profilePUT(req("CATALOG_MANAGER"))).status).toBe(200);
  expect((await db.products.findById(product.id))!.specs.shipping.weight_grams).toBe(1900);expect((await profilePUT(req("CATALOG_MANAGER",{variantId:"foreign"}))).status).toBe(404);
 });
 it("passes full-value insurance to Biteship and uses its combined price without double charging",async()=>{
  vi.stubEnv("APP_ENV","staging");vi.stubEnv("BITESHIP_ENV","test");vi.stubEnv("BITESHIP_API_KEY","biteship_test.fixture");vi.stubEnv("BITESHIP_BASE_URL","https://api.biteship.com/v1");
  let payload:any;vi.stubGlobal("fetch",vi.fn(async(_url:unknown,init?:RequestInit)=>{payload=JSON.parse(String(init?.body));return new Response(JSON.stringify({success:true,pricing:[{courier_code:"jne",courier_service_code:"reg",price:12000,insurance_fee:100,available_for_insurance:true}]}),{status:200});}));
  const rates=await new BiteshipService().getRates({destination:{address:"Fixture",postalCode:"10730"},items:[catalogParcel(product,null,1000,1)],insuranceValue:1000});
  expect(payload.courier_insurance).toBe(1000);expect(rates[0]).toMatchObject({price:12000,insuranceFee:100,insuranceValue:1000,isAvailable:true});
 });
 it("does not advertise an uninsured courier as insured",async()=>{
  vi.stubEnv("APP_ENV","staging");vi.stubEnv("BITESHIP_ENV","test");vi.stubEnv("BITESHIP_API_KEY","biteship_test.fixture");vi.stubEnv("BITESHIP_BASE_URL","https://api.biteship.com/v1");
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({success:true,pricing:[{courier_code:"jne",courier_service_code:"reg",price:12000,available_for_insurance:false}]}),{status:200})));
  expect((await new BiteshipService().getRates({destination:{address:"Fixture",postalCode:"10730"},items:[catalogParcel(product,null,1000,1)],insuranceValue:1000}))[0].isAvailable).toBe(false);
 });
 it("does not POST a second parcel after a lost provider response",async()=>{
  const saved=(await db.orders.getOrderWithItems(order.id));vi.spyOn(db.orders,"getOrderWithItems").mockResolvedValue(saved);
  const request={...body,serviceCode:"reg",expectedCarrierCost:12005};let op:any=null,bookings=0;
  vi.spyOn(shippingOperations,"findOne").mockImplementation(async()=>op);
  vi.stubEnv("APP_ENV","staging");vi.stubEnv("BITESHIP_ENV","test");vi.stubEnv("BITESHIP_API_KEY","biteship_test.fixture");vi.stubEnv("BITESHIP_BASE_URL","https://api.biteship.com/v1");vi.stubEnv("BITESHIP_ORIGIN_CONFIRMED","true");vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://parcel-fixture.supabase.invalid");vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","fixture-service");
  vi.stubGlobal("fetch",vi.fn(async(input:unknown,init?:RequestInit)=>{const url=String(input);if(url.endsWith("/rates/couriers"))return new Response(JSON.stringify({success:true,pricing:[{courier_code:"jne",courier_service_code:"reg",price:12005,insurance_fee:5,available_for_insurance:true}]}),{status:200});if(url.includes("/rpc/prepare_parcel_dispatch")){const data=JSON.parse(String(init?.body));op={id:"operation",order_id:order.id,environment:"test",request_key:data.p_key,fingerprint:data.p_fingerprint,reference_id:"SHIP-operation",request:{...data.p_request,reference_id:"SHIP-operation"},state:"creating"};return new Response(JSON.stringify({success:true,may_create:true,operation:op}),{status:200});}if(url.endsWith("/orders")){bookings++;throw new Error("Lost response");}throw new Error("Unexpected fixture URL");}));
  const key=randomUUID();await expect(bookParcel(request,key,"staff")).rejects.toThrow(/unknown/);await expect(bookParcel(request,key,"staff")).rejects.toThrow(/unknown/);expect(bookings).toBe(1);
 });
});
