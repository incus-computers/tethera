import "server-only";
import { db, BaseRepository } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/client";
import { DatabaseError } from "@/lib/db/errors";
import { gatewayConfig, createSnap, getGatewayStatus, verifiedEvidence, GatewayError, gatewayOrigin, paymentRedirect } from "./gateway";
export interface PaymentAttempt {id:string;order_id:string;provider_order_id:string;amount:number;merchant_id:string;environment:string;state:string;redirect_url?:string|null;transaction_id?:string|null;expires_at:string;created_at:string;updated_at:string}
export const paymentAttempts=new BaseRepository<PaymentAttempt>("payment_attempts");
export async function paymentRpc(name:string,args:Record<string,unknown>){
 const client=getServerSupabase();if(!client)throw new GatewayError("Hosted gateway requires persistent storage.");
 try{const {data,error}=await client.rpc(name,args);if(error)throw new DatabaseError(name,"payment_attempts",error.code);if(data==null)throw new DatabaseError(name,"payment_attempts");return data;}catch(error){if(error instanceof DatabaseError)throw error;throw new DatabaseError(name,"payment_attempts");}
}
export async function reconcileAttempt(attempt:PaymentAttempt){
 const config=gatewayConfig();if(attempt.environment!==config.environment || attempt.merchant_id!==config.merchant)throw new GatewayError("Payment attempt belongs to another gateway environment.",409);
 const status=await getGatewayStatus(attempt.provider_order_id);if(!status)return {state:attempt.state,notFound:true};
 const evidence=verifiedEvidence(attempt,status);
 const result=await paymentRpc("apply_midtrans_evidence",{p_attempt_id:attempt.id,p_evidence:evidence});
 if(["refund","partial_refund"].includes(evidence.transaction_status)){
  const {reconcileRefunds}=await import("@/lib/refunds/service");
  const refunds=await reconcileRefunds(attempt.order_id);
  if(refunds.some(r=>!r.success))throw new GatewayError("Refund reconciliation requires review.");
 }
 return result;
}
export async function initiateHostedPayment(orderId:string){
 const config=gatewayConfig();gatewayOrigin();
 const prepared=await paymentRpc("prepare_midtrans_attempt",{p_order_id:orderId,p_environment:config.environment,p_merchant_id:config.merchant});
 if(!prepared.success)throw new GatewayError(prepared.error||"Order cannot accept payment.",409);
 const attempt=prepared.attempt as PaymentAttempt;
 if(attempt.environment!==config.environment || attempt.merchant_id!==config.merchant)throw new GatewayError("Attempt environment mismatch.",409);
 if(prepared.may_create){
  const order=await db.orders.findById(orderId);if(!order)throw new GatewayError("Order not found.",404);
  const redirect=await createSnap(attempt.provider_order_id,attempt.amount,{name:order.customer_name,email:order.customer_email,phone:order.customer_phone},order.id,attempt.expires_at);
  await paymentRpc("save_midtrans_redirect",{p_attempt_id:attempt.id,p_redirect:redirect});
  return {success:true,pending:true,orderId,orderNumber:order.order_number,paymentId:attempt.id,redirectUrl:redirect};
 }
 const result=await reconcileAttempt(attempt);
 if(result.state==="settled")return {success:true,pending:false,verified:true,orderId,paymentId:attempt.id};
 if(["cancelled","review"].includes(result.state))throw new GatewayError("Payment requires review or a new order; do not pay again.",409);
 if(attempt.redirect_url)return {success:true,pending:true,orderId,paymentId:attempt.id,redirectUrl:paymentRedirect(attempt.redirect_url)};
 throw new GatewayError("Payment creation outcome is unknown. Reconciliation is pending; do not create another payment.");
}
export async function reconcilePayments(limit=50){
 gatewayConfig();const client=getServerSupabase();if(!client)throw new GatewayError("Persistent payment storage required.");
 const {data,error}=await client.from("payment_attempts").select("*").in("state",["creating","pending","review"]).order("updated_at",{ascending:true}).limit(limit);
 if(error)throw new DatabaseError("reconcilePayments","payment_attempts",error.code);
 const results=[];for(const attempt of data||[]){try{results.push({id:attempt.id,...await reconcileAttempt(attempt)});}catch{results.push({id:attempt.id,error:true});}const touched=await client.from("payment_attempts").update({updated_at:new Date().toISOString()}).eq("id",attempt.id);if(touched.error)throw new DatabaseError("reconcileCheckpoint","payment_attempts",touched.error.code);}
 return results;
}
