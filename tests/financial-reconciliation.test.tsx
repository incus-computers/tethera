import { jobs } from "@/lib/jobs/store";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach,describe,expect,it,vi } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { allocateIdr,assertFinancialSnapshot,buildFinancialSnapshot,splitIncluded } from "@/lib/checkout/financials";
import { promotionDiscount } from "@/lib/checkout/promotionMath";
import { promotionClaims } from "@/lib/checkout/promotionClaims";
import { commercialTaxPolicy } from "@/lib/tax/policy";
import { db,BaseRepository } from "@/lib/db";
import { transitionInventory } from "@/lib/inventory/lifecycle";
import { createOrderPOST } from "./support/checkout";
import { POST as promotionPOST, DELETE as promotionDELETE, PUT as promotionPUT } from "@/app/api/admin/promotions/route";
import { fixtureCookie } from "./support/session";
import { GET as invoice } from "@/app/api/orders/invoice/route";
import { POST as send } from "@/app/api/orders/invoice/send/route";
import { generateInvoiceHtml,invoiceAmounts } from "@/lib/utils/invoiceDownload";
import { sendInvoiceEmail } from "@/lib/notifications/email";
import { FinancialSummary } from "@/components/orders/FinancialSummary";
const policy={code:"fixture",rateBps:1100,mode:"inclusive" as const};
const snapshot=(overrides:any={})=>buildFinancialSnapshot({lines:[{name:'CPU <script>alert("x")</script>',sku:"CPU&1",kind:"merchandise",unitPrice:1001,quantity:3},{name:"Assembly",kind:"assembly",unitPrice:251,quantity:1}],shippingFee:103,discount:101,discountWeights:[3003,0,0],taxPolicy:policy,...overrides});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
describe("whole-IDR reconciliation",()=>{
 it("charges assembly once, allocates only eligible merchandise and reconciles fees/tax/discounts",()=>{
  const f=snapshot();expect(f.merchandiseSubtotal).toBe(3003);expect(f.assemblyFee).toBe(251);expect(f.total).toBe(3256);
  expect(f.lines.map(l=>l.discount)).toEqual([101,0]);expect(f.shipping.discount).toBe(0);
  expect(f.lines.reduce((n,l)=>n+l.gross,f.shipping.gross)).toBe(f.total);expect(f.netAmount+f.taxAmount).toBe(f.total);assertFinancialSnapshot(f);
 });
 it("uses stable largest remainders and preserves integer conservation over many odd amounts",()=>{
  expect(allocateIdr(2,[1,1,1])).toEqual([1,1,0]);expect(allocateIdr(1,[0,3,3])).toEqual([0,1,0]);
  for(let n=1;n<=150;n++){
   const f=snapshot({lines:[{name:"Odd",kind:"merchandise",unitPrice:n,quantity:3}],discountWeights:[n*3,0],discount:n,shippingFee:n+1});
   expect(f.total).toBe(n*3+1);expect(f.netAmount+f.taxAmount).toBe(f.total);expect(f.lines[0].discount+f.shipping.discount).toBe(n);
  }
 });
 it("applies free shipping to shipping alone, retaining assembly and merchandise",()=>{
  const f=snapshot({discount:103,discountWeights:[0,0,103]});expect(f.shipping.gross).toBe(0);expect(f.shipping.tax).toBe(0);expect(f.lines.every(l=>l.discount===0)).toBe(true);
 });
 it("supports explicit zero tax and line rounding that differs from recomputing the order total",()=>{
  const f=snapshot({taxPolicy:{code:"no-tax",mode:"not_collected",rateBps:0}});expect(f.taxAmount).toBe(0);expect(f.netAmount).toBe(f.total);
  const rounded=snapshot({lines:[{name:"A",kind:"merchandise",unitPrice:5,quantity:1},{name:"B",kind:"merchandise",unitPrice:5,quantity:1}],shippingFee:0,discount:0,discountWeights:[0,0,0]});
  expect(rounded.taxAmount).toBe(0);expect(splitIncluded(rounded.total,1100).tax).toBe(1);
 });
 it.each([-1,1.5,NaN,Infinity,"100"])("rejects invalid monetary input %s",amount=>{expect(()=>snapshot({shippingFee:amount})).toThrow();});
 it("rejects excessive discounts, invalid quantities and inconsistent frozen totals",()=>{
  expect(()=>snapshot({discount:3004})).toThrow();expect(()=>snapshot({lines:[{name:"A",kind:"merchandise",unitPrice:1,quantity:0}]})).toThrow();
  const f=snapshot();f.taxAmount++;expect(()=>assertFinancialSnapshot(f)).toThrow();
 });
});
describe("promotion eligible units",()=>{
 const promo=(rule:any)=>({discount_type:"buy_x_get_y",discount_value:0,buy_x_get_y:rule} as any);
 it("aggregates duplicate SKU lines, discounts qualifying get units and respects an explicit zero percent",()=>{
  const params={subtotal:420,items:[{sku:"A",price:100,quantity:1},{sku:"A",price:100,quantity:1},{sku:"B",price:80,quantity:1},{sku:"B",price:140,quantity:1}]};
  expect(promotionDiscount(promo({buy_sku:"A",get_sku:"B",buy_quantity:2,get_discount_percent:100}),params)).toEqual({discountAmount:80,eligibleLineAmounts:[0,0,80,0]});
  expect(promotionDiscount(promo({buy_sku:"A",get_sku:"B",buy_quantity:2,get_discount_percent:0}),params).discountAmount).toBe(0);
 });
 it("requires an extra unit for same-SKU Buy X Get Y",()=>{
  const p=promo({buy_sku:"A",get_sku:"A",buy_quantity:2,get_discount_percent:100});
  expect(()=>promotionDiscount(p,{subtotal:200,items:[{sku:"A",price:100,quantity:2}]})).toThrow();
  expect(promotionDiscount(p,{subtotal:600,items:[{sku:"A",price:100,quantity:6}]}).discountAmount).toBe(200);
 });
 it("keeps category/product restrictions and zero caps",()=>{
  const p={discount_type:"percentage",discount_value:50,eligible_categories:["gpu"]} as any,params={subtotal:300,items:[{id:"a",category:"cpu",price:100,quantity:1},{id:"b",category:"GPU",price:200,quantity:1}]};
  expect(promotionDiscount(p,params)).toEqual({discountAmount:100,eligibleLineAmounts:[0,200]});
  expect(promotionDiscount({...p,max_discount:0},params).discountAmount).toBe(0);
 });
});
async function placed(promoOverrides:any={}){
 const id=randomUUID(),code=randomUUID().toUpperCase();
 await db.products.create({id,sku:id,name:"Frozen CPU",slug:id,brand:"Fixture",is_active:true,retail_price:1001,specs:{}});
 await db.inventory.create({id,store_id:"00000000-0000-0000-0000-000000000001",product_id:id,stock_on_hand:10,stock_reserved:0});
 const promotion=await db.promotions.create({id:code,code,title:"Fixture",discount_type:"fixed_amount",discount_value:101,min_spend:0,is_active:true,usage_count:0,total_discount_given:0,max_global_uses:1,...promoOverrides});
 const body={customer:{name:"Fixture Buyer",email:"fixture@example.test",phone:"081234567890"},fulfillmentType:"click_and_collect",items:[{id,quantity:1}],promoCode:code};
 const response=await createOrderPOST(new NextRequest("http://localhost/api/checkout/create-order",{method:"POST",body:JSON.stringify(body)}));
 const data=await response.json(),cookie=response.headers.get("set-cookie")?.split(";")[0]||"";return {id,promotion,body,data,cookie,response};
}
const req=(path:string,cookie:string,body?:any)=>new NextRequest("http://localhost"+path,{method:body?"POST":"GET",headers:{cookie,"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
describe("voucher claim lifecycle and owned documents",()=>{
 it("preserves explicit zero caps when a staff member creates a voucher",async()=>{
  const response=await promotionPOST(req("/api/admin/promotions",fixtureCookie("SUPER_ADMIN"),{code:randomUUID(),title:"Zero-cap fixture",discount_type:"fixed_amount",discount_value:100,min_spend:0,max_discount:0,max_uses_per_user:0,max_global_uses:0}));
  expect(response.status).toBe(200);const {promotion}=await response.json();expect(promotion.max_discount).toBe(0);expect(promotion.max_global_uses).toBe(0);expect(promotion.max_uses_per_user).toBe(0);
 });

 it("reserves a capped claim, consumes it once on verified payment and freezes the original total",async()=>{
  const p=await placed();expect(p.response.status).toBe(200);expect((await db.promotions.findById(p.promotion.id))!.usage_count).toBe(1);expect((await db.promotions.findById(p.promotion.id))!.total_discount_given).toBe(0);
  expect((await transitionInventory(p.data.orderId,"settle","ref",undefined,900)).success).toBe(true);await transitionInventory(p.data.orderId,"settle","ref",undefined,900);
  expect((await db.promotions.findById(p.promotion.id))!.total_discount_given).toBe(101);expect((await promotionClaims.findOne({order_id:p.data.orderId}))!.state).toBe("consumed");
  await expect(db.orders.update(p.data.orderId,{total:1})).rejects.toThrow(/immutable/);
 });
 it.each(["cancel","expire"])("releases an unpaid %s claim, permitting a later redemption",async(action)=>{
  const p=await placed();if(action==="expire"){const holds=new BaseRepository<any>("inventory_reservations");for(const h of await holds.findMany({order_id:p.data.orderId}))await holds.update(h.id,{expires_at:new Date(Date.now()-1000).toISOString()});}
  await transitionInventory(p.data.orderId,action as any);await transitionInventory(p.data.orderId,action as any);
  expect((await db.promotions.findById(p.promotion.id))!.usage_count).toBe(0);expect((await promotionClaims.findOne({order_id:p.data.orderId}))!.state).toBe("released");
  const validation=await db.promotions.validatePromotion(p.promotion.code,{subtotal:1001,items:[{id:p.id,quantity:1,price:1001}]});expect(validation.valid).toBe(true);
 });
 it("retains voucher history across deletion/rename attempts and permits deactivation",async()=>{
  const p=await placed();await transitionInventory(p.data.orderId,"cancel");
  const remove=new NextRequest("http://localhost/api/admin/promotions?id="+p.promotion.id,{method:"DELETE",headers:{cookie:fixtureCookie("SUPER_ADMIN")}});
  expect((await promotionDELETE(remove)).status).toBe(409);
  expect((await promotionPUT(req("/api/admin/promotions",fixtureCookie("SUPER_ADMIN"),{id:p.promotion.id,code:"RENAMED"}))).status).toBe(409);
  expect((await promotionPUT(req("/api/admin/promotions",fixtureCookie("SUPER_ADMIN"),{id:p.promotion.id,is_active:false}))).status).toBe(200);
 });
 it("requires verified sign-in for per-customer limits and enforces a zero global cap",async()=>{
  expect((await placed({max_uses_per_user:1})).response.status).toBe(409);expect((await placed({max_global_uses:0})).response.status).toBe(409);
 });
 it("rolls back the entire order and claim if reservation persistence fails",async()=>{
  vi.spyOn(promotionClaims,"create").mockRejectedValueOnce(new Error("Injected"));const before=await db.orders.count(),p=await placed();expect(p.response.status).toBe(500);expect(await db.orders.count()).toBe(before);expect((await db.promotions.findById(p.promotion.id))!.usage_count).toBe(0);expect((await db.inventory.findById(p.id))!.stock_reserved).toBe(0);
 });
 it("serves the original snapshot after catalog changes and denies other browsers or tracking-only tokens",async()=>{
  const p=await placed();await db.products.update(p.id,{retail_price:99999,name:"Changed"});
  const response=await invoice(req("/api/orders/invoice?orderNumber="+p.data.orderNumber,p.cookie));expect(response.status).toBe(200);const {document}=await response.json();expect(document.financialSnapshot).toEqual(p.data.financialSnapshot);expect(document.items[0].name).toBe("Frozen CPU");expect(document.grandTotal).toBe(900);
  expect((await invoice(req("/api/orders/invoice?orderNumber="+p.data.orderNumber,""))).status).toBe(404);
  expect((await invoice(req("/api/orders/invoice?orderNumber="+p.data.orderNumber+"&token="+p.data.trackingToken,""))).status).toBe(404);
  expect((await send(req("/api/orders/invoice/send",p.cookie,{orderId:p.data.orderId,email:"attacker@example.test",grandTotal:1}))).status).toBe(202);
 });
});
describe("commercial documents and tax setup",()=>{
 it("uses saved rounding in printable/email/account summaries, escapes HTML and reports unpaid orders truthfully",async()=>{
  const f=snapshot({lines:[{name:'<script>alert("x")</script>',kind:"merchandise",unitPrice:5,quantity:1},{name:"B",kind:"merchandise",unitPrice:5,quantity:1}],shippingFee:0,discount:0,discountWeights:[0,0,0]});
  const document={orderNumber:"INV<&>",customer:{name:"<img src=x>",email:"fixture@example.test",phone:""},financialSnapshot:f,subtotal:9999,shippingFee:9999,grandTotal:9999};
  const html=generateInvoiceHtml(document);expect(html).not.toContain("<script>");expect(html).toContain("&lt;script&gt;");expect(html).toContain("Payment not confirmed");expect(html).not.toContain("PAID IN FULL");expect(html).not.toContain("NPWP");expect(invoiceAmounts(document).grandTotal).toBe(10);expect(invoiceAmounts(document).tax).toBe(0);
  const summary=renderToStaticMarkup(<FinancialSummary order={document}/>);expect(summary).toContain("Included tax (11% effective)");expect(summary).toContain("Rp");
  const fetcher=vi.spyOn(globalThis,"fetch");
  expect((await sendInvoiceEmail({toEmail:document.customer.email,customerName:"Untrusted",orderNumber:"Untrusted",subtotal:1,shippingFee:1,grandTotal:1,document})).success).toBe(true);
  const queued=(await jobs.findMany({kind:"email"})).find(j=>j.payload.html===html);expect(queued?.payload.to).toBe(document.customer.email);expect(fetcher).not.toHaveBeenCalled();

 });
 it("does not invent tax facts for historical orders",()=>{
  const html=generateInvoiceHtml({orderNumber:"Legacy",subtotal:100,shippingFee:0,grandTotal:100});expect(html).toContain("Historical tax breakdown unavailable");expect(html).not.toContain("11%");
 });
 it("keeps demo arithmetic available but requires explicit reviewed live configuration",()=>{
  expect(commercialTaxPolicy().code).toBe("demo-effective-11");vi.stubEnv("DEMO_TAX_EFFECTIVE_RATE_BPS","0");expect(commercialTaxPolicy().rateBps).toBe(0);vi.stubEnv("APP_ENV","live");vi.stubEnv("TAX_POLICY_CONFIRMED","false");expect(()=>commercialTaxPolicy()).toThrow(/confirmation/);
  vi.stubEnv("TAX_POLICY_CONFIRMED","true");vi.stubEnv("TAX_POLICY_ID","reviewed-example");vi.stubEnv("TAX_COLLECTION_MODE","not_collected");vi.stubEnv("TAX_EFFECTIVE_RATE_BPS","0");expect(commercialTaxPolicy().rateBps).toBe(0);
  vi.stubEnv("TAX_EFFECTIVE_RATE_BPS","1100");expect(()=>commercialTaxPolicy()).toThrow();
 });
});
