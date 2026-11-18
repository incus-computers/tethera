import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { isDemoMode } from "@/lib/runtime/environment";
export class GatewayError extends Error {constructor(message:string,public status=503){super(message);}}
export function gatewayConfig(){
 if(isDemoMode())throw new GatewayError("Demo does not contact payment providers.");
 const environment=process.env.MIDTRANS_ENV,key=process.env.MIDTRANS_SERVER_KEY||"",merchant=process.env.MIDTRANS_MERCHANT_ID||"";
 if(!["sandbox","production"].includes(environment||"") || !merchant || merchant.length>100)throw new GatewayError("Payment gateway is not configured.");
 if(process.env.APP_ENV==="production" && environment!=="production")throw new GatewayError("Production storefront cannot use sandbox payments.");
 if(environment==="production" && (process.env.MIDTRANS_PRODUCTION_ENABLED!=="true" || process.env.APP_ENV!=="production" || process.env.NODE_ENV!=="production"))throw new GatewayError("Production payments are not enabled.");
 if(!key.startsWith(environment==="sandbox"?"SB-Mid-server-":"Mid-server-") || key.length<25)throw new GatewayError("Payment credentials do not match the selected environment.");
 return {environment,key,merchant,app:environment==="sandbox"?"https://app.sandbox.midtrans.com":"https://app.midtrans.com",api:environment==="sandbox"?"https://api.sandbox.midtrans.com":"https://api.midtrans.com"};
}
export function paymentRedirect(value:unknown){
 const config=gatewayConfig();let url:URL;try{url=new URL(String(value));}catch{throw new GatewayError("Invalid payment redirect.");}
 if(url.origin!==config.app || !url.pathname.startsWith("/snap/") || url.username || url.password || url.hash)throw new GatewayError("Invalid payment redirect.");return url.href;
}
async function request(url:string,body?:unknown){
 const config=gatewayConfig();let response:Response;
 try{response=await fetch(url,{method:body?"POST":"GET",headers:{Authorization:"Basic "+Buffer.from(config.key+":").toString("base64"),"Content-Type":"application/json",Accept:"application/json"},...(body?{body:JSON.stringify(body)}:{}),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000)});}catch{throw new GatewayError("Payment provider outcome is unknown. Retry the same payment attempt.");}
 let data:any;try{const raw=await response.text();if(raw.length>200000)throw new Error();data=JSON.parse(raw);}catch{throw new GatewayError("Invalid payment provider response.");}
 if(response.status===404 || data.status_code==="404")return null;
 if(!response.ok)throw new GatewayError("Payment provider is temporarily unavailable.");return data;
}
export async function requestGatewayRefund(transactionId:string,key:string,amount:number,reason:string){
 let result:any;
 try{result=await request(gatewayConfig().api+"/v2/"+encodeURIComponent(transactionId)+"/refund",{refund_key:key,amount,reason});}
 catch{throw new GatewayError("Refund outcome is unknown. Reconcile the existing refund; do not request another.");}
 if(!result || String(result.status_code)!=="200")throw new GatewayError("Refund outcome is unresolved. Reconcile this refund before requesting another.");
 return result;
}
export function gatewayOrigin(){
 let origin:URL;try{origin=new URL(process.env.APP_ORIGIN||"");}catch{throw new GatewayError("Payment return origin is not configured.");}
 if(origin.protocol!=="https:" || origin.username || origin.password || origin.pathname!=="/" || origin.search || origin.hash)throw new GatewayError("Payment return origin must be an HTTPS origin.");return origin.origin;
}
export async function createSnap(reference:string,amount:number,customer:{name:string;email:string;phone:string},orderId:string,expiresAt:string){
 const config=gatewayConfig(),origin=gatewayOrigin();
 const duration=Math.min(10,Math.floor((new Date(expiresAt).getTime()-Date.now())/60000)-1);
 if(!Number.isFinite(duration)||duration<1)throw new GatewayError("Payment reservation expires too soon.",409);
 const result=await request(config.app+"/snap/v1/transactions",{transaction_details:{order_id:reference,gross_amount:amount},customer_details:{first_name:customer.name,email:customer.email,phone:customer.phone},credit_card:{secure:true},expiry:{unit:"minutes",duration},callbacks:{finish:origin+"/checkout/payment?orderId="+encodeURIComponent(orderId)}});
 if(!result?.redirect_url)throw new GatewayError("Payment creation outcome is unknown. Reconcile before retrying.");return paymentRedirect(result.redirect_url);
}
export async function getGatewayStatus(reference:string){return request(gatewayConfig().api+"/v2/"+encodeURIComponent(reference)+"/status");}
export function verifyGatewaySignature(body:any){
 const config=gatewayConfig();if(typeof body?.order_id!=="string" || typeof body.status_code!=="string" || typeof body.gross_amount!=="string" || !/^\d+(\.00)?$/.test(body.gross_amount) || !/^[a-f0-9]{128}$/i.test(body.signature_key||""))return false;
 const expected=createHash("sha512").update(body.order_id+body.status_code+body.gross_amount+config.key).digest();return timingSafeEqual(expected,Buffer.from(body.signature_key,"hex"));
}
export function verifiedEvidence(attempt:{provider_order_id:string;amount:number;merchant_id:string;transaction_id?:string|null},data:any){
 if(!data || data.order_id!==attempt.provider_order_id || data.merchant_id!==attempt.merchant_id || data.currency!=="IDR" || !/^\d+(\.00)?$/.test(String(data.gross_amount)) || Number(data.gross_amount)!==attempt.amount || typeof data.transaction_id!=="string" || !data.transaction_id || data.transaction_id.length>200 || (attempt.transaction_id && attempt.transaction_id!==data.transaction_id))throw new GatewayError("Payment evidence does not match the expected attempt.",409);
 if(!["pending","capture","settlement","deny","cancel","expire","refund","partial_refund"].includes(data.transaction_status))throw new GatewayError("Unsupported payment status requires reconciliation.",409);
 if((data.transaction_status==="settlement" && data.fraud_status && data.fraud_status!=="accept") || (data.transaction_status==="capture" && !["accept","challenge","deny"].includes(data.fraud_status)))throw new GatewayError("Payment fraud status requires reconciliation.",409);
 return {order_id:data.order_id,merchant_id:data.merchant_id,currency:"IDR",gross_amount:Number(data.gross_amount),transaction_id:data.transaction_id,transaction_status:data.transaction_status,fraud_status:typeof data.fraud_status==="string"?data.fraud_status:null};
}
