import { beforeEach,afterEach,describe,it,expect,vi } from "vitest";
import { createHash } from "crypto";
import { createSnap,gatewayConfig,getGatewayStatus,verifiedEvidence,verifyGatewaySignature,paymentRedirect } from "@/lib/payment/gateway";
import { initiateHostedPayment } from "@/lib/payment/attempts";
import { db } from "@/lib/db";
import { POST as webhook } from "@/app/api/webhooks/midtrans/route";
import { NextRequest } from "next/server";
const original={...process.env};
const keys=["APP_ENV","MIDTRANS_ENV","MIDTRANS_SERVER_KEY","MIDTRANS_MERCHANT_ID","APP_ORIGIN","NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","MIDTRANS_PRODUCTION_ENABLED"];
beforeEach(()=>{process.env.APP_ENV="staging";process.env.MIDTRANS_ENV="sandbox";process.env.MIDTRANS_SERVER_KEY="SB-Mid-server-fixture-not-a-real-key";process.env.MIDTRANS_MERCHANT_ID="fixture-merchant";process.env.APP_ORIGIN="https://store.example";process.env.NEXT_PUBLIC_SUPABASE_URL="https://db-fixture.supabase.invalid";process.env.SUPABASE_SERVICE_ROLE_KEY="fixture-service";});
afterEach(()=>{vi.restoreAllMocks();for(const k of keys){if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];}});
const attempt={id:"attempt",order_id:"order",provider_order_id:"PAY-reference",amount:1000,merchant_id:"fixture-merchant",environment:"sandbox",state:"creating",expires_at:new Date(Date.now()+900000).toISOString()};
const evidence={order_id:attempt.provider_order_id,merchant_id:attempt.merchant_id,currency:"IDR",gross_amount:"1000.00",transaction_id:"provider-tx",transaction_status:"settlement"};
describe("Midtrans isolated HTTP fixtures",()=>{
 it("never uses credentials or external providers in demo and rejects environment mismatch",()=>{
  process.env.APP_ENV="demo";expect(()=>gatewayConfig()).toThrow(/Demo/);process.env.APP_ENV="staging";
  process.env.MIDTRANS_ENV="production";expect(()=>gatewayConfig()).toThrow(/not enabled/);
  process.env.APP_ENV="production";process.env.MIDTRANS_ENV="sandbox";expect(()=>gatewayConfig()).toThrow(/cannot use sandbox/);process.env.APP_ENV="staging";
  process.env.MIDTRANS_ENV="sandbox";process.env.MIDTRANS_SERVER_KEY="Mid-server-production-fixture";expect(()=>gatewayConfig()).toThrow(/credentials/);
 });
 it("creates a hosted sandbox payment with trusted amount and short expiry",async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({redirect_url:"https://app.sandbox.midtrans.com/snap/v2/vtweb/fixture",token:"private-token"}),{status:201}));vi.stubGlobal("fetch",fetcher);
  const result=await createSnap(attempt.provider_order_id,1000,{name:"Fixture",email:"fixture@example.test",phone:"081234567890"},"order",attempt.expires_at);
  expect(result).toContain("app.sandbox.midtrans.com/snap/");const [url,options]=fetcher.mock.calls[0] as any;
  expect(url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");const body=JSON.parse(options.body);expect(body.transaction_details).toEqual({order_id:"PAY-reference",gross_amount:1000});expect(body.expiry.duration).toBeLessThanOrEqual(10);expect(body.callbacks.finish).toBe("https://store.example/checkout/payment?orderId=order");expect(options.redirect).toBe("error");
 });
 it.each(["https://evil.example/snap/foo","https://app.sandbox.midtrans.com.evil.example/snap/foo","http://app.sandbox.midtrans.com/snap/foo","https://app.midtrans.com/snap/foo"])("rejects untrusted redirect %s",value=>{expect(()=>paymentRedirect(value)).toThrow();});
 it("uses exact signatures, including the provider's amount string",()=>{
  const p={order_id:"PAY-1",status_code:"200",gross_amount:"1000.00",signature_key:""};p.signature_key=createHash("sha512").update(p.order_id+p.status_code+p.gross_amount+process.env.MIDTRANS_SERVER_KEY).digest("hex");
  expect(verifyGatewaySignature(p)).toBe(true);expect(verifyGatewaySignature({...p,gross_amount:"1000"})).toBe(false);expect(verifyGatewaySignature({...p,signature_key:"a"})).toBe(false);
 });
 it.each([{gross_amount:"1.00"},{currency:"USD"},{merchant_id:"other"},{order_id:"other"},{transaction_id:""}])("rejects evidence mismatch %j",patch=>{expect(()=>verifiedEvidence(attempt,{...evidence,...patch})).toThrow(/does not match/);});
 it("reads provider status over authenticated HTTPS and treats missing transactions explicitly",async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({status_code:"404"}),{status:404}));vi.stubGlobal("fetch",fetcher);
  expect(await getGatewayStatus("PAY-reference")).toBe(null);expect((fetcher.mock.calls[0] as any)[0]).toBe("https://api.sandbox.midtrans.com/v2/PAY-reference/status");
 });
 it("does not re-create after a lost creation response, even if status is still 404",async()=>{
  let claims=0,creates=0,statusReads=0;
  vi.spyOn(db.orders,"findById").mockResolvedValue({id:"order",customer_name:"Fixture",customer_email:"fixture@example.test",customer_phone:"081234567890"} as any);
  vi.stubGlobal("fetch",vi.fn(async(input:unknown)=>{
   const url=String(input);
   if(url.includes("/rpc/prepare_midtrans_attempt"))return new Response(JSON.stringify({success:true,may_create:++claims===1,attempt}),{status:200});
   if(url.includes("/snap/v1/transactions")){creates++;throw new Error("Injected lost response after remote creation");}
   if(url.includes("/status")){statusReads++;return new Response(JSON.stringify({status_code:"404"}),{status:404});}
   throw new Error("Unexpected external fixture URL");
  }));
  await expect(initiateHostedPayment("order")).rejects.toThrow(/unknown/);await expect(initiateHostedPayment("order")).rejects.toThrow(/unknown/);
  expect(creates).toBe(1);expect(statusReads).toBe(1);
 });
 it("uses independent status evidence instead of a notification's claimed settlement",async()=>{
  const payload={order_id:attempt.provider_order_id,status_code:"200",gross_amount:"1000.00",transaction_status:"settlement",transaction_id:"provider-tx",signature_key:""};
  payload.signature_key=createHash("sha512").update(payload.order_id+payload.status_code+payload.gross_amount+process.env.MIDTRANS_SERVER_KEY).digest("hex");
  let applied:any=null;
  vi.stubGlobal("fetch",vi.fn(async(input:unknown,init?:RequestInit)=>{
   const url=String(input);
   if(url.includes("/payment_attempts?"))return new Response(JSON.stringify([attempt]),{status:200});
   if(url.includes("/status"))return new Response(JSON.stringify({...evidence,transaction_status:"pending"}),{status:200});
   if(url.includes("/rpc/apply_midtrans_evidence")){applied=JSON.parse(String(init?.body));return new Response(JSON.stringify({state:"pending"}),{status:200});}
   throw new Error("Unexpected fixture URL");
  }));
  const response=await webhook(new NextRequest("https://store.example/api/webhooks/midtrans",{method:"POST",body:JSON.stringify(payload)}));
  expect(response.status).toBe(200);expect(applied.p_evidence.transaction_status).toBe("pending");
 });
});
