import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { buildFinancialSnapshot } from "@/lib/checkout/financials";
import { bootstrapPostgres } from "./support/postgres";

let pg:Awaited<ReturnType<typeof bootstrapPostgres>>;
const store="00000000-0000-0000-0000-000000000001";
beforeAll(async()=>{pg=await bootstrapPostgres();},30000);
afterAll(async()=>{await pg?.close();});
async function fixture(stock=10) {
  const id=randomUUID();
  await pg.query("insert into public.products(id,sku,name,slug,brand,retail_price,is_active) values($1,$1,'Fixture',$1,'Fixture',1000,true)",[id]);
  await pg.query("insert into public.store_inventory(id,store_id,product_id,stock_on_hand,stock_reserved) values($1,$2,$1,$3,0)",[id,store,stock]);
  return id;
}
function payload(product:string,quantity=1,key=randomUUID(),owner="fixture-owner") {
  const id=randomUUID();return {
    request:{owner_id:owner,request_key:key,fingerprint:"a".repeat(64)},
    order:{id,order_number:id,customer_id:owner,customer_name:"Fixture",customer_email:"fixture@example.test",customer_phone:"081234567890",fulfillment_type:"click_and_collect",subtotal:1000*quantity,assembly_fee:0,shipping_fee:0,discount_amount:0,total:1000*quantity,status:"pending_payment"},
    items:[{product_id:product,variant_id:null,quantity,unit_price:1000,is_custom_build:false,checkout_metadata:null}],
    stock:[{productId:product,variantId:null as string|null,quantity}],catalog:[{id:product,is_active:true,retail_price:1000}],variants:[] as any[],promotion:null as any,
  };
}
async function call(p:ReturnType<typeof payload>,alterFinancial?:(snapshot:ReturnType<typeof buildFinancialSnapshot>)=>void) {
  const f=buildFinancialSnapshot({lines:p.items.map((i:any)=>({name:i.product_title_snapshot||"Fixture",sku:null,kind:i.product_id?"merchandise":"assembly",unitPrice:i.unit_price,quantity:i.quantity})),shippingFee:p.order.shipping_fee,discount:p.order.discount_amount,discountWeights:p.items.map((i:any)=>p.promotion?.discount_type==="free_shipping"?0:i.unit_price*i.quantity).concat(p.promotion?.discount_type==="free_shipping"?p.order.shipping_fee:0),taxPolicy:{code:"fixture",mode:"inclusive",rateBps:1100}});
  alterFinancial?.(f);
  p=structuredClone(p);
  Object.assign(p.order,{financial_snapshot:f,dpp_amount:f.netAmount,tax_amount:f.taxAmount,tax_rate:0.11,shipping_tax_amount:f.shipping.tax});
  p.items.forEach((i:any,n:number)=>Object.assign(i,{discount_snapshot:f.lines[n].discount,gross_total_snapshot:f.lines[n].gross,tax_amount_snapshot:f.lines[n].tax,tax_rate_snapshot:0.11}));

  const result=await pg.query<{result:any}>("select public.commit_checkout($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb) as result",[p.request,p.order,p.items,p.stock,p.catalog,p.variants,p.promotion].map(x=>JSON.stringify(x)));
  return result.rows[0].result;
}
async function reserved(id:string) {return (await pg.query<{stock_reserved:number}>("select stock_reserved from public.store_inventory where product_id=$1",[id])).rows[0].stock_reserved;}
describe("checkout transaction on disposable PostgreSQL",()=>{
  it("persists one order and order-linked hold and replays without side effects",async()=>{
    const id=await fixture(),p=payload(id),first=await call(p);
    const retry={...p,order:{...p.order,id:randomUUID(),order_number:randomUUID()}};
    expect(await call(retry)).toEqual(first);expect(await reserved(id)).toBe(1);
    expect((await pg.query("select id from public.inventory_reservations where order_id=$1",[first.order.id])).rows).toHaveLength(1);
    expect((await pg.query("select id from public.checkout_requests where owner_id=$1 and request_key=$2",[p.request.owner_id,p.request.request_key])).rows).toHaveLength(1);
  });
  it("rejects key reuse with another fingerprint and scopes keys to the owner",async()=>{
    const id=await fixture(),p=payload(id);const first=await call(p);
    await expect(call({...p,request:{...p.request,fingerprint:"b".repeat(64)}})).rejects.toMatchObject({code:"PT409"});
    const other=payload(id,1,p.request.request_key,"other-owner");expect((await call(other)).order.id).not.toBe(first.order.id);expect(await reserved(id)).toBe(2);
  });
  it("rolls back the header, all lines and earlier stock mutations on later-line shortage",async()=>{
    const a=await fixture(),b=await fixture(0),p=payload(a);
    // Ensure the zero-stock product sorts after the stocked product in the lock order.
    const [first,last]=[a,b].sort();
    await pg.query("update public.store_inventory set stock_on_hand=case when product_id=$1 then 10 else 0 end where product_id in ($1,$2)",[first,last]);
    p.items.push({...p.items[0],product_id:b});p.stock.push({...p.stock[0],productId:b});p.catalog.push({...p.catalog[0],id:b});p.order.subtotal=p.order.total=2000;
    await expect(call(p)).rejects.toMatchObject({code:"PT409"});expect(await reserved(first)).toBe(0);expect(await reserved(last)).toBe(0);
    for(const table of ["orders","order_items","inventory_reservations","checkout_requests"]) {
      const column=table==="orders"?"id":"order_id";
      expect((await pg.query(`select * from public.${table} where ${column}=$1`,[p.order.id])).rows).toEqual([]);
    }
  });
  it("rejects a second last-unit checkout without overselling",async()=>{
    const id=await fixture(1);await call(payload(id));await expect(call(payload(id))).rejects.toMatchObject({code:"PT409"});expect(await reserved(id)).toBe(1);
  });
  it("replays a committed snapshot after catalog change but rejects a new stale checkout",async()=>{
    const id=await fixture(),p=payload(id),first=await call(p);await pg.query("update public.products set retail_price=2000 where id=$1",[id]);
    expect(await call(p)).toEqual(first);await expect(call(payload(id))).rejects.toMatchObject({code:"PT409"});expect(await reserved(id)).toBe(1);
  });
  it("reserves canonical variant stock independently from parent stock",async()=>{
    const id=await fixture(0),variant=randomUUID();
    await pg.query("insert into public.product_variants(id,product_id,sku,name,attribute_type,attribute_value,price,stock_quantity,reserved_quantity,is_active) values($1,$2,$1,'Variant','color','Black',1500,1,0,true)",[variant,id]);
    const p=payload(id);p.items[0].variant_id=variant as any;p.items[0].unit_price=1500;p.order.subtotal=p.order.total=1500;p.stock[0].variantId=variant;p.variants=[{id:variant,product_id:id,is_active:true,price:1500}];
    await call(p);expect(await reserved(id)).toBe(0);
    expect((await pg.query<{reserved_quantity:number}>("select reserved_quantity from public.product_variants where id=$1",[variant])).rows[0].reserved_quantity).toBe(1);
    const retry=structuredClone(p);retry.request.request_key=randomUUID();retry.order.id=retry.order.order_number=randomUUID();
    await expect(call(retry)).rejects.toMatchObject({code:"PT409"});
  });
  it("records promotion usage once and rolls back holds when its cap is exhausted",async()=>{
    const id=await fixture(),promo=randomUUID();
    await pg.query("insert into public.promotions(id,code,title,discount_type,discount_value,min_spend,is_active,usage_count,usage_limit) values($1,$1,'Fixture','fixed_amount',100,0,true,0,1)",[promo]);
    const row=(await pg.query<{data:any}>("select to_jsonb(p) as data from public.promotions p where id=$1",[promo])).rows[0].data;
    const p=payload(id);p.promotion=row;(p.order as any).promo_code=promo;p.order.discount_amount=100;p.order.total=900;
    const first=await call(p);expect(await call(p)).toEqual(first);
    const next=structuredClone(p);next.request.request_key=randomUUID();next.order.id=next.order.order_number=randomUUID();
    await expect(call(next)).rejects.toMatchObject({code:"PT409"});expect(await reserved(id)).toBe(1);
    expect((await pg.query<{usage_count:number}>("select usage_count from public.promotions where id=$1",[promo])).rows[0].usage_count).toBe(1);
    expect((await pg.query("select id from public.orders where id=$1",[next.order.id])).rows).toEqual([]);
  });
  it("rejects inconsistent line totals or missing reservation lines before writing",async()=>{
    const id=await fixture(),p=payload(id);p.order.total=1;await expect(call(p)).rejects.toMatchObject({code:"22023"});
    p.order.total=1000;p.stock[0].quantity=2;await expect(call(p)).rejects.toMatchObject({code:"22023"});expect(await reserved(id)).toBe(0);
  });
  it("keeps checkout data and the privileged transaction inaccessible to public roles",async()=>{
    for(const role of ["anon","authenticated"]) {
      expect((await pg.query<{allowed:boolean}>("select has_function_privilege($1,'public.commit_checkout(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)','EXECUTE') as allowed",[role])).rows[0].allowed).toBe(false);
      expect((await pg.query<{allowed:boolean}>("select has_table_privilege($1,'public.checkout_requests','SELECT') as allowed",[role])).rows[0].allowed).toBe(false);
    }
    expect((await pg.query<{allowed:boolean}>("select has_function_privilege('service_role','public.commit_checkout(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)','EXECUTE') as allowed")).rows[0].allowed).toBe(true);
  });
});

async function transition(id:string,action:string,reference="fixture-payment",amount:number|null=null){
 return (await pg.query<{r:any}>("select public.transition_order_inventory($1,$2,$3,'fixture',$4::numeric) r",[id,action,reference,amount])).rows[0].r;
}
describe("atomic reservation lifecycle in PostgreSQL",()=>{
 it("consumes a hold once, records one sale and keeps paid state monotonic",async()=>{
  const id=await fixture(1),o=(await call(payload(id))).order;
  expect((await transition(o.id,"settle","reference",1000)).success).toBe(true);
  expect((await transition(o.id,"settle","reference",1000)).changed).toBe(false);
  expect((await transition(o.id,"settle","different",1000)).success).toBe(false);
  expect((await transition(o.id,"pending")).status).toBe("ready_for_pickup");
  expect((await transition(o.id,"cancel")).success).toBe(false);
  expect((await pg.query<{stock_on_hand:number}>("select stock_on_hand from public.store_inventory where product_id=$1",[id])).rows[0].stock_on_hand).toBe(0);
  expect(await reserved(id)).toBe(0);
  expect((await pg.query("select id from public.inventory_adjustment_ledger where reference_order_id=$1",[o.id])).rows).toHaveLength(1);
 });
 it("cancels once without increasing physical stock and rejects late settlement",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order;
  expect((await transition(o.id,"cancel")).success).toBe(true);expect((await transition(o.id,"cancel")).changed).toBe(false);
  expect((await transition(o.id,"settle")).success).toBe(false);expect(await reserved(id)).toBe(0);
  expect((await pg.query<{stock_on_hand:number}>("select stock_on_hand from public.store_inventory where product_id=$1",[id])).rows[0].stock_on_hand).toBe(10);
 });
 it("expiry releases all holds, can be retried and never consumes stock for a late payment",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order;
  await pg.query("update public.inventory_reservations set expires_at=now()-interval '1 minute' where order_id=$1",[o.id]);
  const result=await transition(o.id,"settle");expect(result.success).toBe(false);expect(result.status).toBe("cancelled");expect(await reserved(id)).toBe(0);
  expect((await transition(o.id,"expire")).changed).toBe(false);
 });
 it("expiry batch skips fresh holds and releases expired orders",async()=>{
  const id=await fixture(),a=(await call(payload(id))).order,b=(await call(payload(id))).order;
  await pg.query("update public.inventory_reservations set expires_at=now()-interval '1 minute' where order_id=$1",[a.id]);
  await pg.query("select public.expire_order_reservations(100)");expect(await reserved(id)).toBe(1);
  expect((await transition(b.id,"expire")).changed).toBe(false);
 });
 it("rolls back earlier deductions and ledger entries if a later inventory record has drifted",async()=>{
  const ids=[await fixture(),await fixture()].sort(),p=payload(ids[0]);
  p.items.push({...p.items[0],product_id:ids[1]});p.stock.push({...p.stock[0],productId:ids[1]});p.catalog.push({...p.catalog[0],id:ids[1]});p.order.total=p.order.subtotal=2000;
  const o=(await call(p)).order;await pg.query("update public.store_inventory set stock_reserved=0 where product_id=$1",[ids[1]]);
  await expect(transition(o.id,"settle")).rejects.toMatchObject({code:"23514"});expect(await reserved(ids[0])).toBe(1);
  expect((await pg.query("select id from public.inventory_adjustment_ledger where reference_order_id=$1",[o.id])).rows).toEqual([]);
  expect((await pg.query<{paid_at:null}>("select paid_at from public.orders where id=$1",[o.id])).rows[0].paid_at).toBe(null);
 });
 it("rejects amount mismatches and public access to lifecycle functions",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order;expect((await transition(o.id,"settle","ref",1)).success).toBe(false);expect(await reserved(id)).toBe(1);
  for(const role of ["anon","authenticated"]){expect((await pg.query<{ok:boolean}>("select has_function_privilege($1,'public.transition_order_inventory(text,text,text,text,numeric)','EXECUTE') ok",[role])).rows[0].ok).toBe(false);}
  expect((await pg.query<{ok:boolean}>("select has_function_privilege('service_role','public.process_order_payment_success(text,text)','EXECUTE') ok")).rows[0].ok).toBe(false);
 });
});

describe("variant inventory settlement",()=>{
 it("consumes canonical variant holds once without deducting parent stock",async()=>{
  const id=await fixture(10),v=randomUUID();
  await pg.query("insert into public.product_variants(id,product_id,sku,name,attribute_type,attribute_value,price,stock_quantity,reserved_quantity,is_active) values($1,$2,$1,'Variant','color','Black',1000,2,0,true)",[v,id]);
  const p=payload(id);p.items[0].variant_id=v as any;p.stock[0].variantId=v;p.variants=[{id:v,product_id:id,is_active:true,price:1000}];
  const o=(await call(p)).order;expect((await transition(o.id,"settle","variant-ref")).success).toBe(true);expect((await transition(o.id,"settle","variant-ref")).changed).toBe(false);
  const state=(await pg.query<{stock_quantity:number;reserved_quantity:number}>("select stock_quantity,reserved_quantity from public.product_variants where id=$1",[v])).rows[0];
  expect(state).toEqual({stock_quantity:1,reserved_quantity:0});expect(await reserved(id)).toBe(0);
  expect((await pg.query<{stock_on_hand:number}>("select stock_on_hand from public.store_inventory where product_id=$1",[id])).rows[0].stock_on_hand).toBe(10);
 });
});

async function preparePayment(id:string){return (await pg.query<{r:any}>("select public.prepare_midtrans_attempt($1,'sandbox','fixture-merchant') r",[id])).rows[0].r;}
function paymentEvidence(a:any,status="settlement"){return {order_id:a.provider_order_id,merchant_id:a.merchant_id,currency:"IDR",gross_amount:a.amount,transaction_id:"TX-"+a.id,transaction_status:status};}
async function applyPayment(a:any,e=paymentEvidence(a)){return (await pg.query<{r:any}>("select public.apply_midtrans_evidence($1,$2::jsonb) r",[a.id,JSON.stringify(e)])).rows[0].r;}
describe("durable gateway attempts and evidence",()=>{
 it("claims creation once and preserves its unique provider reference",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order,first=await preparePayment(o.id),retry=await preparePayment(o.id);
  expect(first.may_create).toBe(true);expect(retry.may_create).toBe(false);expect(retry.attempt).toEqual(first.attempt);
 });
 it("commits settlement, event, sale movement and outbox once across notification replays",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order,a=(await preparePayment(o.id)).attempt;
  expect((await applyPayment(a)).state).toBe("settled");expect((await applyPayment(a)).replayed).toBe(true);
  expect(await reserved(id)).toBe(0);
  expect((await pg.query("select id from public.payment_events where attempt_id=$1",[a.id])).rows).toHaveLength(1);
  expect((await pg.query("select id from public.payment_outbox where attempt_id=$1 and kind='payment_settled'",[a.id])).rows).toHaveLength(1);
  expect((await pg.query("select id from public.inventory_adjustment_ledger where reference_order_id=$1",[o.id])).rows).toHaveLength(1);
  expect((await applyPayment(a,paymentEvidence(a,"pending"))).state).toBe("settled");
  expect((await applyPayment(a,paymentEvidence(a,"expire"))).state).toBe("settled");
 });
 it("rolls back event and paid state on a later stock failure, allowing safe recovery",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order,a=(await preparePayment(o.id)).attempt;
  await pg.query("update public.store_inventory set stock_reserved=0 where product_id=$1",[id]);
  await expect(applyPayment(a)).rejects.toMatchObject({code:"23514"});
  expect((await pg.query("select id from public.payment_events where attempt_id=$1",[a.id])).rows).toHaveLength(0);
  await pg.query("update public.store_inventory set stock_reserved=1 where product_id=$1",[id]);expect((await applyPayment(a)).state).toBe("settled");
 });
 it("keeps late captured funds visible as review without selling expired stock",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order,a=(await preparePayment(o.id)).attempt;
  await transition(o.id,"cancel");expect((await applyPayment(a)).state).toBe("review");
  expect((await pg.query("select id from public.payment_outbox where attempt_id=$1 and kind='payment_review'",[a.id])).rows).toHaveLength(1);
  expect((await pg.query<{stock_on_hand:number}>("select stock_on_hand from public.store_inventory where product_id=$1",[id])).rows[0].stock_on_hand).toBe(10);
 });
 it("does not settle challenged captures and marks refunds for review without restocking",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order,a=(await preparePayment(o.id)).attempt;
  expect((await applyPayment(a,{...paymentEvidence(a,"capture"),fraud_status:"challenge"} as any)).state).toBe("pending");expect(await reserved(id)).toBe(1);
  expect((await applyPayment(a)).state).toBe("settled");expect((await applyPayment(a,paymentEvidence(a,"refund"))).state).toBe("review");
  expect((await pg.query<{stock_on_hand:number}>("select stock_on_hand from public.store_inventory where product_id=$1",[id])).rows[0].stock_on_hand).toBe(9);
 });
 it("rejects wrong amounts, currencies, merchant and transaction binding at the SQL boundary",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order,a=(await preparePayment(o.id)).attempt;
  for(const patch of [{gross_amount:1},{currency:"USD"},{merchant_id:"other"},{order_id:"other"}])await expect(applyPayment(a,{...paymentEvidence(a),...patch})).rejects.toMatchObject({code:"22023"});
  await applyPayment(a);await expect(applyPayment(a,{...paymentEvidence(a),transaction_id:"OTHER"})).rejects.toMatchObject({code:"22023"});
 });
 it("does not expose attempts, evidence or outbox rows to customer database roles",async()=>{
  for(const role of ["anon","authenticated"])for(const table of ["payment_attempts","payment_events","payment_outbox"]){expect((await pg.query<{ok:boolean}>("select has_table_privilege($1,$2,'SELECT') ok",[role,"public."+table])).rows[0].ok).toBe(false);}
  expect((await pg.query<{ok:boolean}>("select has_function_privilege('authenticated','public.apply_midtrans_evidence(text,jsonb)','EXECUTE') ok")).rows[0].ok).toBe(false);
 });
});

async function shippingFixture(){const id=await fixture(),p=payload(id);p.order.fulfillment_type="delivery";const o=(await call(p)).order;await transition(o.id,"settle","SHIP-PAYMENT");await pg.query("update public.orders set status='ready_for_dispatch' where id=$1",[o.id]);return o.id;}
const shipRequest={courier_company:"jne",courier_type:"reg",destination_postal_code:10730,items:[{name:"Fixture",value:1000,quantity:1,weight:500,length:30,width:20,height:10}]};
async function prepareShip(id:string,request:any=shipRequest,mode="demo"){return (await pg.query<{r:any}>("select public.prepare_shipping_dispatch($1,$2::jsonb,$3,'fixture-staff') r",[id,JSON.stringify(request),mode])).rows[0].r;}
async function shipEvent(op:any,status="allocated",cost=20000,provider="provider-"+op.id){return (await pg.query<{r:any}>("select public.apply_shipping_evidence($1,$2::jsonb) r",[op.id,JSON.stringify({provider_id:provider,reference_id:op.reference_id,status,carrier_cost:cost})])).rows[0].r;}
describe("atomic Biteship dispatch persistence",()=>{
 it("rejects unpaid and non-ready orders before booking or allocations",async()=>{
  const id=await fixture(),o=(await call(payload(id))).order;expect((await prepareShip(o.id)).success).toBe(false);
  expect((await pg.query("select id from public.fulfillments where order_id=$1",[o.id])).rows).toEqual([]);
 });
 it("claims exactly one shipment and allocates physical order lines once",async()=>{
  const id=await shippingFixture(),a=await prepareShip(id),b=await prepareShip(id);expect(a.may_create).toBe(true);expect(b.may_create).toBe(false);expect(b.operation.id).toBe(a.operation.id);
  expect((await pg.query("select id from public.fulfillments where order_id=$1",[id])).rows).toHaveLength(1);
  expect((await prepareShip(id,{...shipRequest,courier_company:"jnt"})).success).toBe(false);
 });
 it("rejects a stale live booking snapshot before writes",async()=>{
  const id=await shippingFixture();expect((await prepareShip(id,{...shipRequest,_snapshot:{}},"test")).success).toBe(false);
  expect((await pg.query("select id from public.shipping_operations where order_id=$1",[id])).rows).toHaveLength(0);
 });
 it("records provider identity, deduplicates updates and prevents delivery regression",async()=>{
  const id=await shippingFixture(),op=(await prepareShip(id)).operation;
  expect((await shipEvent(op)).operation.provider_id).toBe("provider-"+op.id);
  expect((await shipEvent(op,"delivered")).order.status).toBe("delivery_arrived");expect((await shipEvent(op,"delivered")).replayed).toBe(true);
  expect((await shipEvent(op,"picking_up")).order.status).toBe("delivery_arrived");expect((await shipEvent(op,"cancelled")).order.status).toBe("delivery_arrived");
 });
 it("retains merchandise payment and agreed charges on shipment failure and cost adjustment",async()=>{
  const id=await shippingFixture(),op=(await prepareShip(id)).operation;const before=(await pg.query<{total:number;shipping_fee:number;paid_at:string}>("select total,shipping_fee,paid_at from public.orders where id=$1",[id])).rows[0];
  const r=await shipEvent(op,"failed",35000);expect(r.order.status).toBe("courier_failed");expect(r.operation.state).toBe("review");
  const after=(await pg.query("select total,shipping_fee,paid_at from public.orders where id=$1",[id])).rows[0];expect(after).toEqual(before);
  expect((await pg.query("select carrier_cost from public.shipping_carrier_costs where operation_id=$1",[op.id])).rows).toEqual([{carrier_cost:"35000.00"}]);
 });
 it("rolls event/state writes back on a failed local fulfillment write and can recover",async()=>{
  const id=await shippingFixture(),op=(await prepareShip(id)).operation;
  await pg.exec("create function public.reject_shipping_fixture() returns trigger language plpgsql as $$begin raise exception 'Injected failure';end$$;create trigger reject_shipping_fixture before update on public.fulfillments for each row execute function public.reject_shipping_fixture();");
  try{await expect(shipEvent(op)).rejects.toThrow();expect((await pg.query("select id from public.shipping_events where operation_id=$1",[op.id])).rows).toEqual([]);}
  finally{await pg.exec("drop trigger reject_shipping_fixture on public.fulfillments;drop function public.reject_shipping_fixture();");}
  expect((await shipEvent(op)).operation.state).toBe("booked");
 });
 it("rejects aliasing another provider shipment and retains Step 7 privacy/readiness",async()=>{
  const id=await shippingFixture(),op=(await prepareShip(id)).operation;await shipEvent(op);
  await expect(shipEvent(op,"delivered",20000,"other-provider")).rejects.toMatchObject({code:"22023"});
  for(const role of ["anon","authenticated"]){expect((await pg.query<{allowed:boolean}>("select has_function_privilege($1,'public.prepare_shipping_dispatch(text,jsonb,text,text)','EXECUTE') allowed",[role])).rows[0].allowed).toBe(false);expect((await pg.query<{allowed:boolean}>("select has_table_privilege($1,'public.shipping_operations','SELECT') allowed",[role])).rows[0].allowed).toBe(false);}
  expect((await pg.query<{ready:boolean}>("select public.application_schema_health() ready")).rows[0].ready).toBe(true);
  await pg.exec("grant update(state) on public.refund_operations to service_role");
  try{expect((await pg.query<{r:any}>("select public.application_security_audit() r")).rows[0].r.violations).toContain("mutable_refund_operations");}
  finally{await pg.exec("revoke update(state) on public.refund_operations from service_role");}
 });
});

async function refundFixture(variant=false){
 const product=await fixture(5),p=payload(product,2);let variantId:string|null=null;
 if(variant){variantId=randomUUID();await pg.query("insert into public.product_variants(id,product_id,sku,name,attribute_type,attribute_value,price,stock_quantity,reserved_quantity,is_active) values($1,$2,$1,'Variant','color','Black',1000,5,0,true)",[variantId,product]);p.items[0].variant_id=variantId as any;p.stock[0].variantId=variantId;p.variants=[{id:variantId,product_id:product,is_active:true,price:1000}];}
 const result=await call(p);await transition(result.order.id,"settle","fixture-paid",2000);
 return {order:result.order,items:result.items,product,variant:variantId};
}
async function prepareSqlRefund(orderId:string,amount=500,key=randomUUID(),extra:any={},mode="demo",verified:any=null,hash="f".repeat(64)){
 return (await pg.query<{r:any}>("select public.prepare_refund($1,$2,$3::jsonb,$4,'fixture-admin',$5::jsonb) r",[key,hash,JSON.stringify({order_id:orderId,amount,reason:"Fixture refund",return_request_id:null,...extra}),mode,JSON.stringify(verified)])).rows[0].r;
}
async function applySqlRefund(op:any,total=op.amount,patch:any={}){
 const evidence={refund_total:total,refund:{id:"provider-refund-"+op.id,key:op.request_key,amount:op.amount,method:"online"},...patch};
 return (await pg.query<{r:any}>("select public.apply_refund_evidence($1,$2::jsonb) r",[op.id,JSON.stringify(evidence)])).rows[0].r;
}
async function sqlRma(orderId:string,inspect=true){
 const r=(await pg.query<{r:any}>("select public.create_return_request($1,'Fixture',null,array[]::text[]) r",[orderId])).rows[0].r;
 if(inspect)for(const status of ["approved","item_received","inspected"])await pg.query("select public.transition_return_request($1,$2,null,'fixture-admin')",[r.id,status]);
 return r.id;
}
async function sqlReceipt(rmaId:string,line:string,quantity=1,disposition="restock",key=randomUUID(),hash="a".repeat(64)){
 return (await pg.query<{r:any}>("select public.receive_return_items($1,$2,$3::jsonb,'fixture-admin') r",[key,hash,JSON.stringify({rma_id:rmaId,items:[{order_item_id:line,quantity,disposition}]})])).rows[0].r;
}
describe("atomic refunds and bounded physical recovery in PostgreSQL",()=>{
 it("prevents a warehouse status edit from shipping refunded or returned goods",async()=>{
  const f=await refundFixture();await prepareSqlRefund(f.order.id);
  await pg.query("update public.orders set fulfillment_type='delivery',status='ready_for_dispatch' where id=$1",[f.order.id]);
  const result=await prepareShip(f.order.id);expect(result.success).toBe(false);expect(result.error).toMatch(/review/);
  expect((await pg.query("select id from public.shipping_operations where order_id=$1",[f.order.id])).rows).toHaveLength(0);
 });
 it("claims a request once and reserves its remaining refund budget",async()=>{
  const f=await refundFixture(),key=randomUUID(),first=await prepareSqlRefund(f.order.id,500,key);
  expect(first.may_create).toBe(true);expect((await prepareSqlRefund(f.order.id,500,key)).operation.id).toBe(first.operation.id);
  await expect(prepareSqlRefund(f.order.id,500,key,{},"demo",null,"b".repeat(64))).rejects.toMatchObject({code:"PT409"});
  await expect(prepareSqlRefund(f.order.id)).rejects.toMatchObject({code:"PT409"});
 });
 it("caps partial refunds cumulatively and preserves original charges/payment/stock",async()=>{
  const f=await refundFixture(),a=(await prepareSqlRefund(f.order.id)).operation;
  expect((await applySqlRefund(a)).orderStatus).toBe("partially_refunded");expect((await applySqlRefund(a)).replayed).toBe(true);
  await expect(prepareSqlRefund(f.order.id,1600)).rejects.toMatchObject({code:"PT409"});
  const b=(await prepareSqlRefund(f.order.id,1500)).operation;expect((await applySqlRefund(b,2000)).orderStatus).toBe("refunded");
  expect((await pg.query("select total,payment_reference from public.orders where id=$1",[f.order.id])).rows[0]).toEqual({total:"2000.00",payment_reference:"fixture-paid"});
  expect((await pg.query<{stock_on_hand:number}>("select stock_on_hand from public.store_inventory where product_id=$1",[f.product])).rows[0].stock_on_hand).toBe(3);
  expect((await pg.query("select id from public.refunds where order_id=$1",[f.order.id])).rows).toHaveLength(2);
 });
 it("rejects unpaid, fractional, oversized and unrelated-return refunds",async()=>{
  const f=await refundFixture(),other=await refundFixture(),rma=await sqlRma(other.order.id);
  await expect(prepareSqlRefund(f.order.id,0.5)).rejects.toMatchObject({code:"22023"});
  await expect(prepareSqlRefund(f.order.id,2001)).rejects.toMatchObject({code:"PT409"});
  await expect(prepareSqlRefund(f.order.id,500,randomUUID(),{return_request_id:rma})).rejects.toMatchObject({code:"PT409"});
  await pg.query("update public.orders set paid_at=null where id=$1",[f.order.id]);await expect(prepareSqlRefund(f.order.id)).rejects.toMatchObject({code:"PT409"});
 });
 it("binds live refunds to settled provider payment and reconciled prior amounts",async()=>{
  const product=await fixture(),order=(await call(payload(product))).order,a=(await preparePayment(order.id)).attempt;await applyPayment(a);
  const evidence={...paymentEvidence(a),refund_total:0};
  await expect(prepareSqlRefund(order.id,100,randomUUID(),{},"sandbox",{...evidence,transaction_id:"other"})).rejects.toMatchObject({code:"PT409"});
  await expect(prepareSqlRefund(order.id,100,randomUUID(),{},"sandbox",{...evidence,refund_total:50})).rejects.toMatchObject({code:"PT409"});
  const op=(await prepareSqlRefund(order.id,100,randomUUID(),{},"sandbox",evidence)).operation;
  await expect(applySqlRefund(op,100,{...evidence,merchant_id:"other"})).rejects.toMatchObject({code:"PT409"});
  const result=await applySqlRefund(op,100,{...evidence,refund_total:100});expect(result.refund.amount).toBe(100);
 });
 it("keeps acknowledgement pending and never regresses a completed refund",async()=>{
  const f=await refundFixture(),op=(await prepareSqlRefund(f.order.id)).operation;
  const pending={refund:{id:"provider-refund-"+op.id,key:op.request_key,amount:op.amount,method:null}};
  expect((await applySqlRefund(op,500,pending)).pending).toBe(true);
  expect((await pg.query("select id from public.refunds where order_id=$1",[f.order.id])).rows).toHaveLength(0);
  await expect(applySqlRefund(op,500,{refund:{...pending.refund,key:"other"}})).rejects.toMatchObject({code:"PT409"});
  await applySqlRefund(op);expect((await applySqlRefund(op,500,pending)).operation.state).toBe("completed");
 });
 it("rolls financial records and evidence back if the final order write fails",async()=>{
  const f=await refundFixture(),op=(await prepareSqlRefund(f.order.id)).operation;
  await pg.exec("create function public.reject_refund_fixture() returns trigger language plpgsql as $$begin raise exception 'Injected failure';end$$;create trigger reject_refund_fixture before update on public.orders for each row execute function public.reject_refund_fixture();");
  try{await expect(applySqlRefund(op)).rejects.toThrow();for(const table of ["refunds","refund_events"])expect((await pg.query(`select id from public.${table} where ${table==="refunds"?"operation_id":"operation_id"}=$1`,[op.id])).rows).toEqual([]);}
  finally{await pg.exec("drop trigger reject_refund_fixture on public.orders;drop function public.reject_refund_fixture();");}
  expect((await applySqlRefund(op)).operation.state).toBe("completed");
 });
 it("requires inspection, replays receipts and caps quantities across all returns",async()=>{
  const f=await refundFixture(),rma=await sqlRma(f.order.id,false),line=f.items[0].id,key=randomUUID();
  await expect(sqlReceipt(rma,line)).rejects.toMatchObject({code:"PT409"});
  for(const status of ["approved","item_received","inspected"])await pg.query("select public.transition_return_request($1,$2,null,'fixture-admin')",[rma,status]);
  const first=await sqlReceipt(rma,line,1,"restock",key);expect((await sqlReceipt(rma,line,1,"restock",key)).receipt.id).toBe(first.receipt.id);
  await expect(sqlReceipt(rma,line,1,"restock",key,"b".repeat(64))).rejects.toMatchObject({code:"PT409"});
  await expect(sqlReceipt(rma,line,2)).rejects.toMatchObject({code:"PT409"});await sqlReceipt(rma,line,1,"quarantine");
  expect((await pg.query<{stock_on_hand:number}>("select stock_on_hand from public.store_inventory where product_id=$1",[f.product])).rows[0].stock_on_hand).toBe(4);
  await pg.query("select public.transition_return_request($1,'completed',null,'fixture-admin')",[rma]);
  const next=await sqlRma(f.order.id);await expect(sqlReceipt(next,line)).rejects.toMatchObject({code:"PT409"});
  await expect(pg.query("select public.transition_return_request($1,'approved',null,'fixture-admin')",[rma])).rejects.toMatchObject({code:"PT409"});
 });
 it("restores variant stock rather than the parent and rejects foreign lines or missing sale coverage",async()=>{
  const f=await refundFixture(true),other=await refundFixture(),rma=await sqlRma(f.order.id);
  await expect(sqlReceipt(rma,other.items[0].id)).rejects.toMatchObject({code:"22023"});
  await sqlReceipt(rma,f.items[0].id);
  expect((await pg.query<{stock_quantity:number}>("select stock_quantity from public.product_variants where id=$1",[f.variant])).rows[0].stock_quantity).toBe(4);
  expect((await pg.query<{stock_on_hand:number}>("select stock_on_hand from public.store_inventory where product_id=$1",[f.product])).rows[0].stock_on_hand).toBe(5);
  await pg.query("update public.inventory_reservations set status='released' where order_id=$1",[f.order.id]);await expect(sqlReceipt(rma,f.items[0].id)).rejects.toMatchObject({code:"PT409"});
 });
 it("rolls receipt, stock and ledger back together on a ledger insert failure",async()=>{
  const f=await refundFixture(),rma=await sqlRma(f.order.id),key=randomUUID();
  await pg.exec("create function public.reject_return_fixture() returns trigger language plpgsql as $$begin raise exception 'Injected failure';end$$;create trigger reject_return_fixture before insert on public.inventory_adjustment_ledger for each row execute function public.reject_return_fixture();");
  try{await expect(sqlReceipt(rma,f.items[0].id,1,"restock",key)).rejects.toThrow();expect((await pg.query("select id from public.return_receipts where request_key=$1",[key])).rows).toEqual([]);}
  finally{await pg.exec("drop trigger reject_return_fixture on public.inventory_adjustment_ledger;drop function public.reject_return_fixture();");}
  expect((await pg.query<{stock_on_hand:number}>("select stock_on_hand from public.store_inventory where product_id=$1",[f.product])).rows[0].stock_on_hand).toBe(3);
  await sqlReceipt(rma,f.items[0].id,1,"restock",key);
 });
 it("keeps provider evidence private, service writes transactional and readiness intact",async()=>{
  for(const role of ["anon","authenticated"])for(const table of ["refund_operations","refund_events","return_receipts","return_receipt_items"])expect((await pg.query<{allowed:boolean}>("select has_table_privilege($1,$2,'SELECT') allowed",[role,"public."+table])).rows[0].allowed).toBe(false);
  for(const fn of ["prepare_refund(text,text,jsonb,text,text,jsonb)","apply_refund_evidence(text,jsonb)","receive_return_items(text,text,jsonb,text)"])expect((await pg.query<{allowed:boolean}>("select has_function_privilege('authenticated',$1,'EXECUTE') allowed",["public."+fn])).rows[0].allowed).toBe(false);
  expect((await pg.query<{allowed:boolean}>("select has_table_privilege('service_role','public.refunds','INSERT,UPDATE,DELETE') allowed")).rows[0].allowed).toBe(false);
  expect((await pg.query<{r:any}>("select public.application_security_audit() r")).rows[0].r).toEqual({ok:true,violations:[]});
  expect((await pg.query<{ready:boolean}>("select public.application_schema_health() ready")).rows[0].ready).toBe(true);
 });
});

async function parcelFixture(){
 const f=await refundFixture();
 await pg.query("update public.orders set fulfillment_type='delivery',status='ready_for_dispatch',shipping_address=$2::jsonb,courier_info=$3::jsonb where id=$1",[f.order.id,JSON.stringify({street:"Fixture Street",subdistrict:"Fixture",city:"Jakarta",province:"DKI Jakarta",postalCode:"10730",country:"Indonesia"}),JSON.stringify({quote_origin:{contactName:"Warehouse",contactPhone:"081234567890",address:"Fixture warehouse",postalCode:10730}})]);
 return f;
}
async function prepareSqlParcel(f:any,quantity=1,key=randomUUID(),hash="a".repeat(64),extra:any={},mode="demo"){
 const snapshot=(await pg.query<{s:any}>("select jsonb_build_object('shipping_address',o.shipping_address,'customer_name',o.customer_name,'customer_email',o.customer_email,'customer_phone',o.customer_phone,'quote_items',o.courier_info->'quote_items','quote_origin',o.courier_info->'quote_origin','courier_company',o.courier_info->'courier_company','service_code',o.courier_info->'service_code') s from public.orders o where id=$1",[f.order.id])).rows[0].s;
 const lines=(await pg.query<{s:any}>("select jsonb_build_object('id',id,'product_id',product_id,'variant_id',variant_id,'unit_price',unit_price,'checkout_metadata',checkout_metadata) s from public.order_items where order_id=$1",[f.order.id])).rows.map(row=>row.s);
 const request={_snapshot:snapshot,_packing:{confirmed:true,handling:"fragile"},_lines:lines,_quote:{price:16005,insuranceFee:5},courier_company:"jne",courier_type:"reg",origin_postal_code:10730,destination_postal_code:10730,courier_insurance:1000*quantity,items:[{name:"Fixture parcel",value:1000*quantity,quantity:1,weight:600,length:30,width:20,height:15}],...extra};
 return (await pg.query<{r:any}>("select public.prepare_parcel_dispatch($1,$2,$3,$4::jsonb,$5::jsonb,$6,'fixture-staff') r",[f.order.id,key,hash,JSON.stringify([{order_item_id:f.items[0].id,quantity}]),JSON.stringify(request),mode])).rows[0].r;
}
async function parcelEvent(op:any,status="allocated",insured:any=op.request.courier_insurance){
 return (await pg.query<{r:any}>("select public.apply_shipping_evidence($1,$2::jsonb) r",[op.id,JSON.stringify({provider_id:"PROVIDER-"+op.id,reference_id:op.reference_id,status,carrier_cost:16005,insured_value:insured,insurance_fee:5})])).rows[0].r;
}
describe("measured insured split parcels in PostgreSQL",()=>{
 it("requires a matching settled payment attempt outside demo",async()=>{
  const f=await parcelFixture();
  await expect(prepareSqlParcel(f,1,randomUUID(),"a".repeat(64),{},"test")).rejects.toMatchObject({code:"PT409"});
  await pg.query("insert into public.payment_attempts(id,order_id,provider_order_id,amount,merchant_id,environment,state,transaction_id,expires_at) values($1,$2,$1,2000,'fixture-merchant','sandbox','settled','fixture-paid',now()+interval '10 minutes')",[randomUUID(),f.order.id]);
  await expect(prepareSqlParcel(f,1,randomUUID(),"a".repeat(64),{},"production")).rejects.toMatchObject({code:"PT409"});
  expect((await prepareSqlParcel(f,1,randomUUID(),"a".repeat(64),{},"test")).may_create).toBe(true);
 });
 it("claims and replays one parcel while bounding all allocations to remaining units",async()=>{
  const f=await parcelFixture(),key=randomUUID(),first=await prepareSqlParcel(f,1,key);
  expect(first.may_create).toBe(true);expect((await prepareSqlParcel(f,1,key)).operation.id).toBe(first.operation.id);
  await expect(prepareSqlParcel(f,1,key,"b".repeat(64))).rejects.toMatchObject({code:"PT409"});
  await expect(prepareSqlParcel(f,2)).rejects.toMatchObject({code:"PT409"});
  expect((await pg.query("select id from public.fulfillments where order_id=$1",[f.order.id])).rows).toHaveLength(1);
 });
 it("requires all physical quantities to arrive before marking the order delivered",async()=>{
  const f=await parcelFixture(),first=(await prepareSqlParcel(f)).operation;
  expect((await parcelEvent(first,"delivered")).order.status).toBe("partially_fulfilled");
  const second=(await prepareSqlParcel(f)).operation;
  expect((await parcelEvent(second,"in_transit")).order.status).toBe("on_delivery");
  expect((await parcelEvent(second,"delivered")).order.status).toBe("delivery_arrived");
  expect((await parcelEvent(first,"picking_up")).order.status).toBe("delivery_arrived");
  expect((await pg.query("select total,payment_reference from public.orders where id=$1",[f.order.id])).rows[0]).toEqual({total:"2000.00",payment_reference:"fixture-paid"});
 });
 it("keeps insurance in review until matching provider evidence, without regressing delivery",async()=>{
  const f=await parcelFixture(),op=(await prepareSqlParcel(f,2)).operation;
  expect((await parcelEvent(op,"allocated",null)).operation.state).toBe("review");
  expect((await parcelEvent(op,"delivered",1)).operation.state).toBe("review");
  const confirmed=await parcelEvent(op,"delivered",2000);expect(confirmed.operation.state).toBe("booked");expect(confirmed.order.status).toBe("delivery_arrived");
  expect((await parcelEvent(op,"picking_up",null)).operation.state).toBe("booked");
  expect((await pg.query<{p:any}>("select package_snapshot p from public.fulfillments where id=$1",[op.fulfillment_id])).rows[0].p.insurance_confirmed).toBe(2000);
 });
 it("rejects missing packing, forged declared value, stale snapshots, unpaid and unreserved orders",async()=>{
  const f=await parcelFixture();
  for(const patch of [{_packing:{confirmed:false,handling:"fragile"}},{courier_insurance:1},{_snapshot:{}}])await expect(prepareSqlParcel(f,1,randomUUID(),"a".repeat(64),patch)).rejects.toThrow();
  await pg.query("update public.orders set paid_at=null where id=$1",[f.order.id]);await expect(prepareSqlParcel(f)).rejects.toMatchObject({code:"PT409"});
  await pg.query("update public.orders set paid_at=now() where id=$1",[f.order.id]);await pg.query("update public.inventory_reservations set status='released' where order_id=$1",[f.order.id]);await expect(prepareSqlParcel(f)).rejects.toMatchObject({code:"PT409"});
 });
 it("rejects a foreign order line and an incomplete assembled group",async()=>{
  const f=await parcelFixture(),other=await parcelFixture();const foreign={...f,items:other.items};await expect(prepareSqlParcel(foreign)).rejects.toMatchObject({code:"22023"});
  await pg.query("update public.order_items set checkout_metadata='{\"build\":\"assembled\"}'::jsonb where order_id=$1",[f.order.id]);
  await expect(prepareSqlParcel(f,1)).rejects.toMatchObject({code:"PT409"}); // only half the assembled line
 });
 it("does not mix whole-order and split booking identities or recycle failed allocations",async()=>{
  const f=await parcelFixture(),op=(await prepareSqlParcel(f)).operation;
  expect((await prepareShip(f.order.id)).success).toBe(false);
  await parcelEvent(op,"failed");await expect(prepareSqlParcel(f,2)).rejects.toMatchObject({code:"PT409"});
 });
 it("blocks parcel booking after a refund claim even if warehouse status is edited",async()=>{
  const f=await parcelFixture();await prepareSqlRefund(f.order.id);
  await pg.query("update public.orders set status='ready_for_dispatch' where id=$1",[f.order.id]);await expect(prepareSqlParcel(f)).rejects.toMatchObject({code:"PT409"});
 });
 it("rolls fulfillment and allocation back if operation persistence fails",async()=>{
  const f=await parcelFixture();
  await pg.exec("create function public.reject_parcel_fixture() returns trigger language plpgsql as $$begin raise exception 'Injected failure';end$$;create trigger reject_parcel_fixture before insert on public.shipping_operations for each row execute function public.reject_parcel_fixture();");
  try{await expect(prepareSqlParcel(f)).rejects.toThrow();expect((await pg.query("select id from public.fulfillments where order_id=$1",[f.order.id])).rows).toHaveLength(0);}
  finally{await pg.exec("drop trigger reject_parcel_fixture on public.shipping_operations;drop function public.reject_parcel_fixture();");}
  expect((await prepareSqlParcel(f)).may_create).toBe(true);
 });
 it("saves valid product/variant profiles and rejects incomplete dimensions or handling",async()=>{
  const product=await fixture(),variant=randomUUID(),profile={weight_grams:600,dimensions_cm:{length:30,width:20,height:15},handling:"fragile"};
  await pg.query("insert into public.product_variants(id,product_id,sku,name,attribute_type,attribute_value,price,stock_quantity,reserved_quantity,is_active) values($1,$2,$1,'Variant','color','Black',1000,5,0,true)",[variant,product]);
  const save=(variantId:string|null,p:any)=>pg.query("select public.save_package_profile($1,$2,'shipping',$3::jsonb,'fixture-catalog')",[product,variantId,JSON.stringify(p)]);
  await save(null,profile);await save(variant,{...profile,weight_grams:2000});
  await pg.query("update public.products set specs='{\"socket\":\"AM5\"}'::jsonb where id=$1",[product]);
  expect((await pg.query<{s:any}>("select specs s from public.products where id=$1",[product])).rows[0].s).toMatchObject({socket:"AM5",shipping:profile});
  expect((await pg.query<{s:any}>("select shipping s from public.product_variants where id=$1",[variant])).rows[0].s.weight_grams).toBe(2000);
  await expect(save(variant,{...profile,dimensions_cm:{length:30}})).rejects.toMatchObject({code:"22023"});
  await expect(save(variant,{...profile,handling:null})).rejects.toMatchObject({code:"22023"});
 });
 it("denies direct service allocation writes and public RPC access while retaining readiness",async()=>{
  for(const table of ["fulfillments","fulfillment_items"])expect((await pg.query<{a:boolean}>("select has_table_privilege('service_role',$1,'INSERT,UPDATE,DELETE') a",["public."+table])).rows[0].a).toBe(false);
  for(const role of ["anon","authenticated"])expect((await pg.query<{a:boolean}>("select has_function_privilege($1,'public.prepare_parcel_dispatch(text,text,text,jsonb,jsonb,text,text)','EXECUTE') a",[role])).rows[0].a).toBe(false);
  expect((await pg.query<{ready:boolean}>("select public.application_schema_health() ready")).rows[0].ready).toBe(true);
  await pg.exec("alter table public.products disable trigger preserve_package_profiles");
  try{expect((await pg.query<{ready:boolean}>("select public.application_schema_health() ready")).rows[0].ready).toBe(false);}
  finally{await pg.exec("alter table public.products enable trigger preserve_package_profiles");}
 });
});


describe("financial snapshots and atomic promotion claims in PostgreSQL",()=>{
 async function promoted(owner="fixture-owner",limit:number|null=null){
  const product=await fixture(),id=randomUUID();
  await pg.query("insert into public.promotions(id,code,title,discount_type,discount_value,min_spend,is_active,usage_count,total_discount_given,max_global_uses,max_uses_per_user) values($1,$1,'Claim fixture','fixed_amount',101,0,true,0,0,1,$2)",[id,limit]);
  const promotion=(await pg.query<{p:any}>("select to_jsonb(p) p from public.promotions p where id=$1",[id])).rows[0].p;
  const p=payload(product,1,randomUUID(),owner);p.promotion=promotion;Object.assign(p.order,{promo_code:id,discount_amount:101,total:899});return p;
 }
 async function counters(id:string){return (await pg.query("select usage_count,total_discount_given::integer as total_discount_given from public.promotions where id=$1",[id])).rows[0];}
 it("persists per-line tax rounding rather than recomputing a rounded grand total",async()=>{
  const a=await fixture(),b=await fixture(),p=payload(a);
  await pg.query("update public.products set retail_price=5 where id in ($1,$2)",[a,b]);
  p.items[0].unit_price=5;p.items.push({...p.items[0],product_id:b});p.stock.push({...p.stock[0],productId:b});p.catalog[0].retail_price=5;p.catalog.push({...p.catalog[0],id:b});p.order.subtotal=p.order.total=10;
  const o=(await call(p)).order;expect(o.total).toBe(10);expect(o.dpp_amount).toBe(10);expect(o.tax_amount).toBe(0);expect(o.financial_snapshot.lines.every((l:any)=>l.net===5&&l.tax===0)).toBe(true);
 });
 it("reserves once on replay, releases on cancellation and consumes only once after payment",async()=>{
  const p=await promoted(),o=(await call(p)).order;await call(p);expect(await counters(p.promotion.id)).toEqual({usage_count:1,total_discount_given:0});
  const blocked=structuredClone(p);blocked.order.id=blocked.order.order_number=randomUUID();blocked.request.request_key=randomUUID();await expect(call(blocked)).rejects.toMatchObject({code:"PT409"});
  await transition(o.id,"cancel");await transition(o.id,"cancel");expect(await counters(p.promotion.id)).toEqual({usage_count:0,total_discount_given:0});
  const next=(await call(blocked)).order;await transition(next.id,"settle","paid",899);await transition(next.id,"settle","paid",899);
  expect(await counters(p.promotion.id)).toEqual({usage_count:1,total_discount_given:101});
  expect((await pg.query("select state from public.promotion_claims where order_id=$1",[next.id])).rows).toEqual([{state:"consumed"}]);
 });
 it("releases a claim on late settlement of an expired hold",async()=>{
  const p=await promoted(),o=(await call(p)).order;
  await pg.query("update public.inventory_reservations set expires_at=now()-interval '1 minute' where order_id=$1",[o.id]);
  expect((await transition(o.id,"settle","late",899)).success).toBe(false);expect(await counters(p.promotion.id)).toEqual({usage_count:0,total_discount_given:0});
  expect((await pg.query("select state from public.promotion_claims where order_id=$1",[o.id])).rows).toEqual([{state:"released"}]);
 });
 it("enforces signed customer limits, ignores released claims, and denies guest limited claims",async()=>{
  const p=await promoted("verified-fixture",1);const o=(await call(p)).order;
  await pg.query("update public.promotions set max_global_uses=10 where id=$1",[p.promotion.id]);p.promotion.max_global_uses=10;
  const next=structuredClone(p);next.order.id=next.order.order_number=randomUUID();next.request.request_key=randomUUID();await expect(call(next)).rejects.toMatchObject({code:"PT409"});
  await transition(o.id,"cancel");expect((await call(next)).order.id).toBe(next.order.id);
  const guest=await promoted("guest:fixture",1);await expect(call(guest)).rejects.toMatchObject({code:"PT409"});
 });
 it("rolls back order, stock and claim on financial or inventory corruption",async()=>{
  const p=await promoted();await expect(call(p,f=>{f.total--;})).rejects.toMatchObject({code:"22023"});
  expect(await counters(p.promotion.id)).toEqual({usage_count:0,total_discount_given:0});expect(await reserved(p.stock[0].productId)).toBe(0);
  expect((await pg.query("select * from public.promotion_claims where order_id=$1",[p.order.id])).rows).toEqual([]);
  await pg.query("update public.store_inventory set stock_on_hand=0 where product_id=$1",[p.stock[0].productId]);await expect(call(p)).rejects.toMatchObject({code:"PT409"});expect(await counters(p.promotion.id)).toEqual({usage_count:0,total_discount_given:0});
 });
 it("guards frozen financial headers/lines and managed counters while permitting fulfillment updates",async()=>{
  const p=await promoted(),o=(await call(p)).order;
  for(const sql of ["update public.orders set total=1 where id=$1","update public.orders set financial_snapshot=null where id=$1","update public.order_items set quantity=2 where order_id=$1","delete from public.order_items where order_id=$1"])await expect(pg.query(sql,[o.id])).rejects.toMatchObject({code:"PT409"});
  await expect(pg.query("update public.promotions set usage_count=0 where id=$1",[p.promotion.id])).rejects.toMatchObject({code:"PT409"});
  expect((await transition(o.id,"settle","paid",899)).success).toBe(true);
  expect((await pg.query<{n:number}>("select total::integer n from public.orders where id=$1",[o.id])).rows[0].n).toBe(899);
 });
 it("keeps new claim storage and private compatibility helpers inaccessible",async()=>{
  for(const role of ["anon","authenticated","service_role"]){
   expect((await pg.query<{ok:boolean}>("select has_table_privilege($1,'public.promotion_claims','INSERT,UPDATE,DELETE') ok",[role])).rows[0].ok).toBe(false);
   expect((await pg.query<{ok:boolean}>("select has_function_privilege($1,'public.commit_checkout_before_financials(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)','EXECUTE') ok",[role])).rows[0].ok).toBe(false);
  }
 });
});
