import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { db, BaseRepository, InventoryReservationRow } from "@/lib/db";
import { transitionInventory } from "@/lib/inventory/lifecycle";
import { createReturn, transitionReturn, issueRefund, prepareRefund, applyRefundEvidence, refundOperations, receiveReturn } from "@/lib/refunds/service";
import { fingerprint, refundInput } from "@/lib/refunds/contracts";
import { refundStatus, refundablePayment, refundConfig } from "@/lib/refunds/provider";
import { paymentAttempts } from "@/lib/payment/attempts";
import { POST as adminPOST } from "@/app/api/admin/rma/route";
import { POST as jobPOST } from "@/app/api/internal/refunds/reconcile/route";
import { fixtureCookie } from "./support/session";

let order:any, product:string, line:string;
beforeEach(async()=>{
 vi.restoreAllMocks();product=randomUUID();
 await db.products.create({id:product,sku:product,name:"Refund fixture",slug:product,brand:"Fixture",retail_price:1000,is_active:true,specs:{}} as any);
 await db.inventory.create({id:randomUUID(),product_id:product,store_id:"00000000-0000-0000-0000-000000000001",stock_on_hand:5,stock_reserved:2,low_stock_threshold:1});
 const result=await db.orders.createOrderWithItems({order_number:randomUUID(),customer_id:"cust-001",customer_name:"Fixture",customer_email:"alex.gamer@example.com",customer_phone:"081234567890",fulfillment_type:"delivery",status:"pending_payment",subtotal:2000,shipping_fee:0,assembly_fee:0,total:2000},[{product_id:product,quantity:2,unit_price:1000,is_custom_build:false}]);
 order=result.order;line=result.items[0].id;
 await new BaseRepository<InventoryReservationRow>("inventory_reservations").create({order_id:order.id,product_id:product,store_id:"00000000-0000-0000-0000-000000000001",quantity:2,status:"reserved",expires_at:new Date(Date.now()+900000).toISOString()});
 expect((await transitionInventory(order.id,"settle","fixture-payment",undefined,2000)).success).toBe(true);
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
const input=(id:string,amount=500,key=randomUUID())=>({orderId:id,amount,reason:"Fixture refund",requestKey:key});
async function inspected(id=order.id){const rma=await createReturn(id,"Inspection fixture");for(const status of ["approved","item_received","inspected"] as const)await transitionReturn(rma.id,status,null,"staff");return rma;}
describe("refund and physical recovery invariants",()=>{
 it.each([0,-1,0.5,"500",null,undefined])("rejects invalid refund amount %s",async amount=>{await expect(issueRefund({...input(order.id),amount},"staff")).rejects.toThrow(/amount/);});
 it("rejects unpaid money movement and the old blanket restock flag",async()=>{
  await expect(issueRefund({...input(order.id),restockInventory:true},"staff")).rejects.toThrow(/restock/);
  await db.orders.update(order.id,{paid_at:null});await expect(issueRefund(input(order.id),"staff")).rejects.toThrow(/Paid/);
 });
 it("replays one refund and caps cumulative partial refunds without changing paid totals or stock",async()=>{
  const p=input(order.id,500),first=await issueRefund(p,"staff");expect(first.refund.gateway_refund_id).toMatch(/^DEMO-REFUND-/);
  expect((await issueRefund(p,"staff")).operation.id).toBe(first.operation.id);
  await expect(issueRefund({...p,amount:600},"staff")).rejects.toThrow(/conflict/);
  await expect(issueRefund(input(order.id,1600),"staff")).rejects.toThrow(/remaining/);
  expect((await issueRefund(input(order.id,1500),"staff")).orderStatus).toBe("refunded");
  const saved=(await db.orders.findById(order.id))!;expect(saved.total).toBe(2000);expect(saved.paid_at).toBeTruthy();expect(saved.payment_reference).toBe("fixture-payment");
  expect((await db.inventory.getByProductAndStore(product))!.stock_on_hand).toBe(3);
  expect(await db.rma.refunds.findMany({order_id:order.id})).toHaveLength(2);
 });
 it("claims one concurrent request and blocks a different refund while the first outcome is unresolved",async()=>{
  const p=input(order.id),results=await Promise.all(Array.from({length:6},()=>prepareRefund(p,"staff")));
  expect(results.filter(result=>result.may_create)).toHaveLength(1);
  await expect(prepareRefund(input(order.id),"staff")).rejects.toThrow(/unresolved/);
 });
 it("does not link a refund to another order's return case",async()=>{
  const rma=await inspected();await expect(issueRefund({...input("ord-1001"),returnRequestId:rma.id},"staff")).rejects.toThrow();
 });
 it("keeps acknowledged refunds pending and atomically retries persistence failures",async()=>{
  const op=(await prepareRefund(input(order.id),"staff")).operation;
  const pending={refund_total:500,refund:{id:"provider-refund",key:op.request_key,amount:500,method:null}};
  expect((await applyRefundEvidence(op,pending)).pending).toBe(true);expect(await db.rma.refunds.findMany({order_id:order.id})).toHaveLength(0);
  const confirmed={...pending,refund:{...pending.refund,method:"online"}};
  vi.spyOn(db.orders,"update").mockRejectedValueOnce(new Error("Injected save failure"));
  await expect(applyRefundEvidence(op,confirmed)).rejects.toThrow();expect(await db.rma.refunds.findMany({order_id:order.id})).toHaveLength(0);
  expect((await refundOperations.findById(op.id))!.state).toBe("pending");
  expect((await applyRefundEvidence(op,confirmed)).pending).toBe(false);
  expect((await applyRefundEvidence(op,pending)).pending).toBe(false);
 });
 it("requires inspection and bounds returned quantities across receipt keys and RMAs",async()=>{
  const rma=await createReturn(order.id,"Fixture");const receipt={rmaId:rma.id,requestKey:randomUUID(),items:[{orderItemId:line,quantity:1,disposition:"restock"}]};
  await expect(receiveReturn(receipt,"staff")).rejects.toThrow(/Inspect/);
  for(const status of ["approved","item_received","inspected"] as const)await transitionReturn(rma.id,status,null,"staff");
  const first=await receiveReturn(receipt,"staff");expect((await receiveReturn(receipt,"staff")).receipt.id).toBe(first.receipt.id);
  expect((await db.inventory.getByProductAndStore(product))!.stock_on_hand).toBe(4);
  await expect(receiveReturn({...receipt,requestKey:randomUUID(),items:[{orderItemId:line,quantity:2,disposition:"restock"}]},"staff")).rejects.toThrow(/exceeds/);
  await receiveReturn({...receipt,requestKey:randomUUID(),items:[{orderItemId:line,quantity:1,disposition:"quarantine"}]},"staff");
  expect((await db.inventory.getByProductAndStore(product))!.stock_on_hand).toBe(4);
  await transitionReturn(rma.id,"completed",null,"staff");const next=await inspected();
  await expect(receiveReturn({...receipt,rmaId:next.id,requestKey:randomUUID()},"staff")).rejects.toThrow(/exceeds/);
  await expect(transitionReturn(rma.id,"requested",null,"staff")).rejects.toThrow(/transition/);
 });
 it("rolls all receipt and stock writes back on ledger persistence failure",async()=>{
  const rma=await inspected(),receipt={rmaId:rma.id,requestKey:randomUUID(),items:[{orderItemId:line,quantity:1,disposition:"restock"}]};
  vi.spyOn(db.inventoryLedger,"recordAdjustment").mockRejectedValueOnce(new Error("Injected ledger failure"));
  await expect(receiveReturn(receipt,"staff")).rejects.toThrow();expect((await db.inventory.getByProductAndStore(product))!.stock_on_hand).toBe(3);
  await receiveReturn(receipt,"staff");expect((await db.inventory.getByProductAndStore(product))!.stock_on_hand).toBe(4);
 });
 it("enforces refund permissions, request keys and scheduler authentication",async()=>{
  const req=(role:string)=>new NextRequest("http://localhost/api/admin/rma",{method:"POST",headers:{cookie:fixtureCookie(role)},body:JSON.stringify(input(order.id))});
  expect((await adminPOST(req("SUPPORT_AGENT"))).status).toBe(403);expect((await adminPOST(req("SUPER_ADMIN"))).status).toBe(400);
  vi.stubEnv("REFUND_JOB_SECRET","fixture-independent-secret-32-characters");expect((await jobPOST(new NextRequest("http://localhost/api/internal/refunds/reconcile",{method:"POST"}))).status).toBe(401);
 });
});

describe("offline provider refund evidence and recovery",()=>{
 it("disables new provider refunds while keeping status reconciliation available",()=>{
  vi.stubEnv("APP_ENV","staging");vi.stubEnv("MIDTRANS_ENV","sandbox");vi.stubEnv("MIDTRANS_SERVER_KEY","SB-Mid-server-fixture-key-not-real");vi.stubEnv("MIDTRANS_MERCHANT_ID","fixture-merchant");vi.stubEnv("MIDTRANS_REFUNDS_ENABLED","false");
  expect(()=>refundConfig(true)).toThrow(/not enabled/);expect(refundConfig().environment).toBe("sandbox");
 });
 const attempt:any={id:"attempt",provider_order_id:"PAY-fixture",amount:2000,merchant_id:"fixture-merchant",transaction_id:"provider-transaction",environment:"sandbox"};
 const status=(extra:any={})=>({order_id:attempt.provider_order_id,merchant_id:attempt.merchant_id,transaction_id:attempt.transaction_id,gross_amount:"2000.00",currency:"IDR",transaction_status:"settlement",payment_type:"credit_card",...extra});
 it("rejects forged identity, malformed totals, duplicate history and unsupported partial refunds",()=>{
  expect(()=>refundStatus(attempt,status({merchant_id:"other"}))).toThrow();
  expect(()=>refundStatus(attempt,status({refund_amount:"500.50"}))).toThrow();
  const record={refund_chargeback_id:1,refund_key:"key",refund_amount:"500.00",refund_method:"online"};
  expect(()=>refundStatus(attempt,status({transaction_status:"partial_refund",refund_amount:"1000.00",refunds:[record,record]}))).toThrow();
  expect(()=>refundablePayment(refundStatus(attempt,status({payment_type:"shopeepay"})),500)).toThrow(/full/);
  expect(()=>refundablePayment(refundStatus(attempt,status({payment_type:"bank_transfer"})),500)).toThrow(/manual/);
 });
 it("recovers a lost refund response by status lookup without sending another refund",async()=>{
  const p=input(order.id),op:any={id:"operation",order_id:order.id,attempt_id:attempt.id,request_key:p.requestKey,fingerprint:fingerprint(refundInput(p)),amount:500,reason:p.reason,environment:"sandbox",state:"creating"};
  vi.spyOn(refundOperations,"findOne").mockResolvedValueOnce(null).mockResolvedValue(op);vi.spyOn(paymentAttempts,"findOne").mockResolvedValue(attempt);vi.spyOn(paymentAttempts,"findById").mockResolvedValue(attempt);
  vi.stubEnv("APP_ENV","staging");vi.stubEnv("MIDTRANS_ENV","sandbox");vi.stubEnv("MIDTRANS_SERVER_KEY","SB-Mid-server-fixture-key-not-real");vi.stubEnv("MIDTRANS_MERCHANT_ID",attempt.merchant_id);vi.stubEnv("MIDTRANS_REFUNDS_ENABLED","true");vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://refund-fixture.supabase.invalid");vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","fixture-service");
  let posts=0,gets=0;
  vi.stubGlobal("fetch",vi.fn(async(input:unknown,init?:RequestInit)=>{
   const url=String(input);
   if(url.includes("/rpc/prepare_refund"))return new Response(JSON.stringify({may_create:true,operation:op}),{status:200});
   if(url.endsWith("/refund")){posts++;throw new Error("Lost provider response");}
   if(url.endsWith("/status")){gets++;return new Response(JSON.stringify(gets===1?status():status({transaction_status:"partial_refund",refund_amount:"500.00",refunds:[{refund_chargeback_id:1,refund_key:p.requestKey,refund_amount:"500.00",refund_method:"online"}]})),{status:200});}
   if(url.includes("/rpc/apply_refund_evidence")){expect(JSON.parse(String(init?.body)).p_evidence.refund.key).toBe(p.requestKey);return new Response(JSON.stringify({operation:{...op,state:"completed"},pending:false}),{status:200});}
   throw new Error("Unexpected fixture URL");
  }));
  await expect(issueRefund(p,"staff")).rejects.toThrow(/unknown/);expect((await issueRefund(p,"staff")).pending).toBe(false);expect(posts).toBe(1);expect(gets).toBe(2);
 });
});
