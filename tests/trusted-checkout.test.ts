import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { POST as create } from "@/app/api/checkout/create-order/route";
import { POST as quote } from "@/app/api/checkout/quote/route";
import { GET as track } from "@/app/api/orders/track/route";
import { verifyGuestTrackingToken } from "@/lib/utils/orderTracking";
import { GET as session } from "@/app/api/checkout/session/route";
import { db, BaseRepository, Product, InventoryReservationRow } from "@/lib/db";
import { checkoutVariants, checkoutProducts, normalizeCheckout } from "@/lib/checkout/catalog";
import { checkoutRepository } from "@/lib/checkout/repository";
import { priceCheckout } from "@/lib/checkout/pricing";
import { biteship, BiteshipService } from "@/lib/shipping/biteship";
import { SERVICE_TIERS } from "@/lib/data/mockHardware";
import { getStorefrontProfile, policyAcceptance } from "@/lib/storefront/profile";

afterEach(()=>vi.unstubAllEnvs());
let cookie:string, product:Product, body:any;
const url="http://localhost:3000";
function request(path:string,payload?:any,key?:string,owner=cookie) { return new NextRequest(url+path,{method:payload?"POST":"GET",headers:{"content-type":"application/json",cookie:owner,...(key?{"Idempotency-Key":key}:{})},...(payload?{body:JSON.stringify(payload)}:{})}); }
async function quoted(payload=body) { const response=await quote(request("/api/checkout/quote",payload));return {response,data:await response.json()}; }
async function submit(payload=body,key=randomUUID()) {const response=await create(request("/api/checkout/create-order",payload,key));return {response,data:await response.json()};}
async function fixture(slot:string,specs:any={},price=1000) {
  const id=randomUUID();const p=await db.products.create({id,sku:id,name:slot,slug:id,brand:"Fixture",category_slug:slot,is_active:true,retail_price:price,specs,pc_builder_slot:slot as any,images:[],warranty_months:12});
  await db.inventory.create({id:randomUUID(),product_id:id,store_id:"00000000-0000-0000-0000-000000000001",stock_on_hand:20,stock_reserved:0,low_stock_threshold:1});return p;
}
beforeEach(async()=>{
  vi.restoreAllMocks();
  const response=await session(request("/api/checkout/session",undefined,undefined,""));
  cookie=(response as NextResponse).cookies.getAll().map(c=>c.name+"="+c.value).join("; ");
  product=await fixture("cpu",{socket:"AM5",tdpWatts:65},1001);
  body={customer:{name:"Fixture Buyer",email:"buyer@example.test",phone:"081234567890"},fulfillmentType:"click_and_collect",items:[{id:product.id,quantity:1}],expectedTotal:1001};
  body.policyAcceptance=policyAcceptance(getStorefrontProfile(),"en");
});
describe("trusted checkout and durable request contract",()=>{
  it("requires a preflight guest cookie before any checkout side effects",async()=>{
    const count=await db.orders.count();const r=await create(request("/api/checkout/create-order",body,randomUUID(),""));
    expect(r.status).toBe(409);expect(r.headers.get("set-cookie")).toContain("HttpOnly");expect(await db.orders.count()).toBe(count);
  });
  it("requires a UUID key, rejects empty baskets and unknown fulfillment",async()=>{
    expect((await create(request("/api/checkout/create-order",body))).status).toBe(400);
    expect((await submit({...body,items:[]})).response.status).toBe(400);
    expect((await submit({...body,fulfillmentType:"anything"})).response.status).toBe(400);
  });
  it.each([0,-1,1.5,"2",null,101])("rejects quantity %s before writes",async quantity=>{
    const before=await db.orders.count();const {response}=await submit({...body,items:[{id:product.id,quantity}]});
    expect(response.status).toBe(400);expect(await db.orders.count()).toBe(before);
  });
  it("rejects unknown/inactive products and forged variants",async()=>{
    expect((await submit({...body,items:[{id:"unknown",price:1}]})).response.status).toBe(409);
    await db.products.update(product.id,{is_active:false});expect((await submit()).response.status).toBe(409);
    await db.products.update(product.id,{is_active:true});expect((await submit({...body,items:[{id:product.id,variantId:"fake"}]})).response.status).toBe(409);
  });
  it("ignores browser prices, totals, discounts and names and requires current total acceptance",async()=>{
    const tampered={...body,total:1,discountAmount:999999,shippingFee:-1,items:[{id:product.id,price:1,name:"Fake",quantity:1}]};
    const q=await quoted(tampered);expect(q.data.total).toBe(1001);expect(q.data.lines[0].product_title_snapshot).toBe("cpu");
    expect((await submit({...tampered,expectedTotal:1})).response.status).toBe(409);
    const saved=await submit(tampered);expect(saved.data.total).toBe(1001);expect(saved.data.discountAmount).toBe(0);
    expect(verifyGuestTrackingToken(saved.data.trackingToken,saved.data.orderNumber,body.customer.email)).toBe(true);
    expect((await track(request("/api/orders/track?token="+encodeURIComponent(saved.data.trackingToken)))).status).toBe(200);
  });
  it("replays concurrent and later retries without another order, item or hold",async()=>{
    const key=randomUUID(),before=await db.orders.count();const inv=await db.inventory.getByProductAndStore(product.id);
    const results=await Promise.all(Array.from({length:8},()=>submit(body,key)));
    expect(results.every(r=>r.response.status===200)).toBe(true);
    expect(new Set(results.map(r=>r.data.orderId)).size).toBe(1);
    expect(await db.orders.count()).toBe(before+1);
    expect((await db.inventory.getByProductAndStore(product.id))!.stock_reserved).toBe(inv!.stock_reserved+1);
    expect((await db.orders.getOrderWithItems(results[0].data.orderId)).items).toHaveLength(1);
    // Re-instantiating the repository models a second demo route bundle.
    const stored=await checkoutRepository.findOne({request_key:key});
    expect(await new (checkoutRepository.constructor as any)().replay(stored!.owner_id,key,stored!.fingerprint)).toEqual(stored!.result);
  });
  it("rejects same key with different contents; another owner cannot recover its order",async()=>{
    const key=randomUUID(),first=await submit(body,key);
    expect(first.response.status).toBe(200);
    expect((await submit({...body,notes:"changed"},key)).response.status).toBe(409);
    const other=await session(request("/api/checkout/session",undefined,undefined,""));
    const otherCookie=(other as NextResponse).cookies.getAll().map(c=>c.name+"="+c.value).join("; ");
    const result=await create(request("/api/checkout/create-order",body,key,otherCookie));
    expect(result.status).toBe(200);expect((await result.json()).orderId).not.toBe(first.data.orderId);
  });
  it("returns the saved result after a lost response even if current price or stock has changed",async()=>{
    const key=randomUUID(),first=await submit(body,key);await db.products.update(product.id,{retail_price:9000,is_active:false});
    const retry=await submit(body,key);expect(retry.response.status).toBe(200);expect(retry.data).toEqual(first.data);
  });
  it("rejects catalog drift between pricing and commit without saving an order",async()=>{
    const input=normalizeCheckout({...body,customer:{...body.customer,customerId:"fixture-owner"}}),p=await priceCheckout(input);
    await db.products.update(product.id,{retail_price:9999});
    const count=await db.orders.count();await expect(checkoutRepository.commit("fixture-owner",randomUUID(),"a".repeat(64),{},p)).rejects.toThrow(/Catalog changed/);
    expect(await db.orders.count()).toBe(count);
  });
  it("rolls back earlier line reservations and order if a later stock write fails",async()=>{
    const second=await fixture("gpu");const original=db.inventory.reserveStock.bind(db.inventory);
    vi.spyOn(db.inventory,"reserveStock").mockImplementation(async(id,q,store)=>id===second.id?{success:false,error:"injected"}:original(id,q,store));
    const count=await db.orders.count();const result=await submit({...body,items:[...body.items,{id:second.id,quantity:1}],expectedTotal:2001});
    expect(result.response.status).toBe(409);expect(await db.orders.count()).toBe(count);
    expect((await db.inventory.getByProductAndStore(product.id))!.stock_reserved).toBe(0);
  });
  it("last-unit contention yields exactly one accepted order and combines duplicate lines",async()=>{
    const inv=(await db.inventory.getByProductAndStore(product.id))!;await db.inventory.update(inv.id,{stock_on_hand:1});
    const results=await Promise.all([submit(),submit()]);expect(results.map(r=>r.response.status).sort()).toEqual([200,409]);
    const second=await fixture("gpu");const v=(await db.inventory.getByProductAndStore(second.id))!;await db.inventory.update(v.id,{stock_on_hand:1});
    expect((await submit({...body,items:[{id:second.id,quantity:1},{id:second.id,quantity:1}],expectedTotal:2000})).response.status).toBe(409);
  });
  it("uses canonical variant price and stock and refuses foreign or unselected variants",async()=>{
    const id=randomUUID();await checkoutVariants.create({id,product_id:product.id,sku:id,name:"Variant",attribute_type:"color",attribute_value:"Black",price:2000,stock_quantity:1,reserved_quantity:0,is_active:true});
    expect((await submit()).response.status).toBe(409);
    const result=await submit({...body,items:[{id:product.id,variantId:id,price:1}],expectedTotal:2000});expect(result.response.status).toBe(200);expect(result.data.total).toBe(2000);
    expect((await checkoutVariants.findById(id))!.reserved_quantity).toBe(1);
    expect((await db.inventory.getByProductAndStore(product.id))!.stock_reserved).toBe(0);
  });
  it("retains server-owned prebuilt pricing in demo checkout",async()=>{
    const p=(await db.products.findById("pb-1"))!;
    const result=await submit({...body,items:[],customPCs:[{isPrebuilt:true,catalogProductId:p.id,totalPrice:1,parts:{cpu:{name:"Fake"}}}],expectedTotal:p.sale_price??p.retail_price});
    expect(result.response.status).toBe(200);expect(result.data.total).toBe(p.sale_price??p.retail_price);
  });
  it("accepts existing storefront variation tiles while resolving their canonical parent",async()=>{
    const p=(await db.products.findById("ram-1"))!,v=p.variations![0];
    const q=await quoted({...body,items:[{item:{id:`${p.id}-var-${v.id}`,variationId:v.id,price:1},quantity:1}]});
    expect(q.response.status).toBe(200);expect(q.data.lines[0].product_id).toBe(p.id);expect(q.data.lines[0].variant_id).toBe(v.id);expect(q.data.total).toBe(v.salePrice??v.price);
  });
  it("prices every build component and charges assembly exactly once, rejecting incompatible parts",async()=>{
    const parts:any={cpu:{id:product.id,price:1}};
    for(const [slot,spec] of Object.entries({motherboard:{socket:"AM5",ramType:"DDR5"},ram:{ramType:"DDR5"},storage_primary:{},case:{maxGpuLengthMm:400},psu:{wattage:800}}))parts[slot]={id:(await fixture(slot,spec)).id,price:1};
    const build={name:"Fixture Build",parts,serviceTier:{id:SERVICE_TIERS[0].id,price:1},totalPrice:1};
    const payload={...body,items:[],customPCs:[build],expectedTotal:256001};
    const result=await submit(payload);expect(result.response.status).toBe(200);expect(result.data.subtotal).toBe(6001);expect(result.data.assemblyFee).toBe(250000);expect(result.data.total).toBe(256001);
    const items=(await db.orders.getOrderWithItems(result.data.orderId)).items;expect(items.filter(i=>i.product_id)).toHaveLength(6);expect(items.some(i=>i.custom_build_id)).toBe(false);
    await db.products.update(parts.motherboard.id,{specs:{socket:"AM4",ramType:"DDR5"}});
    expect((await quoted(payload)).response.status).toBe(400);
  });
  it.each([2,3])("prices and reserves %i units when the same SSD fills multiple storage slots",async count=>{
    const parts:any={cpu:{id:product.id,price:1}};
    for(const [slot,spec] of Object.entries({motherboard:{socket:"AM5",ramType:"DDR5"},ram:{ramType:"DDR5"},storage_primary:{storageType:"SSD"},case:{maxGpuLengthMm:400},psu:{wattage:800}}))parts[slot]={id:(await fixture(slot,spec)).id,price:1};
    parts.storage_secondary={...parts.storage_primary};
    if(count===3)parts.storage_tertiary={...parts.storage_primary};
    const expectedSubtotal=6001+(count-1)*1000;
    const payload={...body,items:[],customPCs:[{name:`${count} SSDs`,parts,serviceTier:{id:SERVICE_TIERS[0].id}}],expectedTotal:expectedSubtotal+250000};
    const inv=(await db.inventory.getByProductAndStore(parts.storage_primary.id))!;
    await db.inventory.update(inv.id,{stock_on_hand:count-1});
    expect((await quoted(payload)).response.status).toBe(409);
    await db.inventory.update(inv.id,{stock_on_hand:count});
    const result=await submit(payload);
    expect(result.response.status).toBe(200);
    expect(result.data.subtotal).toBe(expectedSubtotal);
    expect(result.data.assemblyFee).toBe(250000);
    expect(result.data.total).toBe(expectedSubtotal+250000);
    expect((await db.inventory.getByProductAndStore(parts.storage_primary.id))!.stock_reserved).toBe(count);
    const saved=(await db.orders.getOrderWithItems(result.data.orderId)).items;
    expect(saved.filter(item=>item.product_id===parts.storage_primary.id)).toHaveLength(count);
  });
  it("recalculates shipping using trusted package and saved destination data",async()=>{
    const spy=vi.spyOn(biteship,"getRates").mockResolvedValue([{courierId:"jne",serviceCode:"reg",price:15000,isAvailable:true,serviceName:"Regular"} as any]);
    const payload={...body,fulfillmentType:"delivery",shippingAddress:{street:"Test Street",subdistrict:"Test Area",city:"Jakarta",province:"DKI Jakarta",postalCode:"10730"},selectedRate:{courierId:"jne",serviceCode:"reg",price:1},shippingFee:1,expectedTotal:16001};
    const result=await submit(payload);expect(result.response.status).toBe(200);expect(result.data.shippingFee).toBe(15000);
    const args=spy.mock.calls[0][0];expect(args.requireLive).toBe(true);expect(args.destination.address).toBe("Test Street");expect(args.items![0].price).toBe(1001);expect(args.items![0].weightGrams).toBe(1500);
    const order=(await db.orders.findById(result.data.orderId))!;expect(order.shipping_address!.postalCode).toBe("10730");
    expect(result.data.tax.dpp+result.data.tax.taxAmount).toBe(result.data.total);
    expect((await quoted({...payload,selectedRate:{courierId:"fake",serviceCode:"fake"}})).response.status).toBe(409);
  });
  it("never synthesizes a live checkout shipping quote when configuration is missing",async()=>{
    process.env.APP_ENV="live";
    try { await expect(new BiteshipService().getRates({requireLive:true,destination:{address:"Fixture"},items:[]})).rejects.toThrow(/unavailable|credentials/); }
    finally { process.env.APP_ENV="demo"; }
  });
  it.each([null,0,-1,1.5])("rejects malformed live provider price %s without a synthetic quote",async price=>{
    vi.stubEnv("BITESHIP_ENV","test");vi.stubEnv("BITESHIP_API_KEY","biteship_test.fixture-not-real");
    const service=new BiteshipService();
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({success:true,pricing:[{courier_code:"jne",courier_service_code:"reg",price}]}),{status:200})));
    process.env.APP_ENV="live";
    try { await expect(service.getRates({requireLive:true,destination:{address:"Fixture",postalCode:"10730"},items:[{id:"fixture",name:"Fixture",price:1000,quantity:1,weightGrams:500,dimensionsCm:{length:30,width:20,height:10}}]})).rejects.toThrow(/unavailable/); }
    finally {process.env.APP_ENV="demo";}
  });
  it("refuses unconfigured live package metadata instead of using demo weights",async()=>{
    vi.spyOn(checkoutProducts,"findById").mockResolvedValue(product);vi.spyOn(checkoutVariants,"findMany").mockResolvedValue([]);
    const input=normalizeCheckout({...body,customer:{...body.customer,customerId:"fixture-owner"},fulfillmentType:"delivery",shippingAddress:{street:"Fixture",subdistrict:"Fixture",city:"Jakarta",province:"DKI",postalCode:"10730"},selectedRate:{courierId:"jne",serviceCode:"reg"}});
    process.env.APP_ENV="live";
    try { await expect(priceCheckout(input)).rejects.toThrow(/package information is incomplete/); }
    finally {process.env.APP_ENV="demo";}
  });
  it("keeps promotion category eligibility and retries record redemption once",async()=>{
    const promo=await db.promotions.create({id:randomUUID(),code:randomUUID().toUpperCase(),title:"Fixture",discount_type:"fixed_amount",discount_value:2000,is_active:true,eligible_categories:["cpu"],usage_count:0,usage_limit:1});
    const other=await fixture("gpu",{},3000),payload={...body,items:[...body.items,{id:other.id,quantity:1}],promoCode:promo.code,expectedTotal:3000};
    const key=randomUUID(),first=await submit(payload,key);expect(first.response.status).toBe(200);expect(first.data.discountAmount).toBe(1001);
    expect((await submit(payload,key)).data).toEqual(first.data);expect((await db.promotions.findById(promo.id))!.usage_count).toBe(1);
    const saved=(await db.orders.getOrderWithItems(first.data.orderId));
    expect(saved.items.find(i=>i.product_id===product.id)!.discount_snapshot).toBe(1001);
    expect(saved.items.find(i=>i.product_id===other.id)!.discount_snapshot).toBe(0);
    expect(saved.items.reduce((n,i)=>n+i.gross_total_snapshot!,0)).toBe(first.data.total);
    expect(saved.items.reduce((n,i)=>n+i.tax_amount_snapshot!,0)).toBe(first.data.tax.taxAmount);
  });
});
