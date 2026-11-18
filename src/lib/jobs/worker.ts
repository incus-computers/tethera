import "server-only";
import { db,BaseRepository } from "@/lib/db";
import { isDemoMode } from "@/lib/runtime/environment";
import { getServerSupabase } from "@/lib/db/client";
import { orderInvoiceDocument } from "@/lib/checkout/invoice";
import { escapeHtml,generateInvoiceHtml } from "@/lib/utils/invoiceDownload";
import { expireReservations } from "@/lib/inventory/lifecycle";
import { reconcilePayments } from "@/lib/payment/attempts";
import { reconcileShipping } from "@/lib/shipping/dispatch";
import { reconcileRefunds } from "@/lib/refunds/service";
import { availableStock,enqueueStockAlerts } from "./stockAlerts";
import { claimJob,enqueue,finishJob,jobRpc,startRemote,jobs } from "./store";
import { BackgroundJob,JobError,JobKind } from "./types";
import { deliverEmail,deliverWhatsapp,emailConfig } from "./providers";
import { operationalHygiene } from "@/lib/operations/monitor";
const runs=new BaseRepository<any>("worker_runs");
const maintenance:JobKind[]=["inventory_expiry","payment_reconcile","shipping_reconcile","refund_reconcile","stock_scan"];
export async function scheduleMaintenance(){
 await operationalHygiene();
 if(getServerSupabase())return jobRpc("schedule_background_maintenance",{});
 const bucket=Math.floor(Date.now()/60000);for(const kind of maintenance){const existing=(await jobs.findMany({kind})).some(j=>["pending","running","retry"].includes(j.status));if(!existing)await enqueue(kind,`maintenance:${kind}:${bucket}`,{});}
}
async function emailRequest(job:BackgroundJob){
 const {from}=emailConfig();let to:string,subject:string,html:string;
 if(job.kind==="order_invoice"){
  const document=await orderInvoiceDocument(job.payload.orderId);if(!document.paidAt&&job.payload.reason!=="customer_request")throw new JobError("payment_not_confirmed","review");
  to=document.customer!.email;subject=`Invoice #${document.orderNumber} - Tethera`;html=generateInvoiceHtml(document);
 }else if(job.kind==="order_notice"){
  const order=await db.orders.findById(job.payload.orderId);if(!order)throw new JobError("order_missing","dead");to=order.customer_email;subject=`Order ${order.order_number}: ${job.payload.status.replaceAll("_"," ")}`;html=`<p>Order ${escapeHtml(order.order_number)}: ${escapeHtml(job.payload.status.replaceAll("_"," "))}.</p><p>Check your account for the latest status. This message records a previous order event.</p>`;
 }else if(job.kind==="stock_alert"){
  const n:any=await db.stockNotifications.findById(job.payload.notificationId);if(!n?.verified_contact||n.notified_at)throw new JobError("subscription_inactive","cancelled");
  const product=await db.products.findById(n.product_id);if(!product?.is_active)throw new JobError("product_inactive","blocked");if(await availableStock(n.product_id,n.variant_id||null)<1)throw new JobError("stock_unavailable");
  to=n.email;subject=`Back in stock: ${product.name}`;html=`<p>${escapeHtml(product.name)} is available again.</p><p>Availability may change before checkout.</p>`;
 }else {to=job.payload.to;subject=job.payload.subject;html=job.payload.html;}
 if(typeof to!=="string"||!/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(to)||to.endsWith(".invalid"))throw new JobError("recipient_unavailable","blocked");
 return {provider:"resend",body:{from,to,subject,html}};
}
async function whatsappRequest(job:BackgroundJob){
 const order=await db.orders.findById(job.payload.orderId);if(!order)throw new JobError("order_missing","dead");
 const profile=await db.customers.findById(order.customer_id||"");
 if(!profile?.whatsapp_updates)throw new JobError("whatsapp_not_opted_in","cancelled");
 const phone=order.customer_phone.replace(/[^0-9]/g,"").replace(/^0/,"62");if(!/^62\d{8,13}$/.test(phone))throw new JobError("invalid_phone","blocked");
 const name=process.env.WHATSAPP_ORDER_TEMPLATE,language=process.env.WHATSAPP_TEMPLATE_LANGUAGE;
 if(!isDemoMode()&&(!/^[a-z0-9_]{1,100}$/.test(name||"")||!language||process.env.WHATSAPP_ENABLED!=="true"||!process.env.WHATSAPP_API_TOKEN||!/^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID||"")||!/^v\d+\.\d+$/.test(process.env.WHATSAPP_GRAPH_VERSION||"")))throw new JobError("whatsapp_not_configured","blocked");
 return {provider:"whatsapp",body:{messaging_product:"whatsapp",to:phone,type:"template",template:{name:name||"demo_order_update",language:{code:language||"id"},components:[{type:"body",parameters:[{type:"text",text:order.order_number},{type:"text",text:job.payload.status.replaceAll("_"," ")}]}]}}};
}
async function handle(job:BackgroundJob){
 if(job.kind==="inventory_expiry"){const result=await expireReservations(50);if(result.some((r:any)=>!r.success))throw new JobError("inventory_reconciliation_required");return {id:null};}
 if(job.kind==="stock_scan"){await enqueueStockAlerts();return {id:null};}
 if(["payment_reconcile","shipping_reconcile","refund_reconcile"].includes(job.kind)){
  if(isDemoMode())return {id:null,simulated:true};
  const results=job.kind==="payment_reconcile"?await reconcilePayments(1):job.kind==="shipping_reconcile"?await reconcileShipping(1):await reconcileRefunds(undefined,1);
  if(results.some((r:any)=>r.error||r.notFound||r.success===false||r.state==="review"))throw new JobError("provider_reconciliation_required");return {id:null};
 }
 if(job.kind==="payment_review")throw new JobError("payment_requires_operator_review","review");
 if(job.kind.startsWith("marketplace")){
  if(!isDemoMode())throw new JobError("marketplace_provider_undecided","blocked");
  if(job.kind==="marketplace_inbound")throw new JobError("stock_authority_requires_review","review");
  const mapping=await new BaseRepository<any>("marketplace_product_mappings").findById(job.payload.mappingId);if(!mapping)throw new JobError("mapping_missing","blocked");
  const available=await availableStock(mapping.product_id,mapping.variant_id||null);const buffer=mapping.buffer_stock||0;
  await startRemote(job,{provider:"demo_marketplace",mappingId:mapping.id,availableStock:Math.max(0,available-buffer),mode:"absolute"});return {id:"DEMO-STOCK-"+job.id,simulated:true};
 }
 if(job.kind==="whatsapp_notice"){
  if(job.remote_started_at)throw new JobError("whatsapp_outcome_unknown","review");
  const request=await whatsappRequest(job),started=await startRemote(job,request);return deliverWhatsapp(started);
 }
 const request=job.request||await emailRequest(job),started=await startRemote(job,request);return deliverEmail(started);
}
export async function runWorker(limit=10){
 if(!Number.isInteger(limit)||limit<1||limit>20)throw new JobError("invalid_batch","dead");
 const runId=getServerSupabase()?await jobRpc("record_worker_run",{}):(await runs.create({started_at:new Date().toISOString(),status:"running",processed:0})).id;
 let processed=0,failed=false;const began=Date.now();
 try{while(processed<limit&&Date.now()-began<35000){const job=await claimJob();if(!job)break;
   let outcome;try{const result=await handle(job);outcome={status:("simulated" in result&&result.simulated)?"simulated":"accepted",id:result.id,code:null};}
   catch(error){const failure=error instanceof JobError?error:new JobError("job_execution_failed");outcome={status:failure.disposition,id:null,code:failure.code};}
   await finishJob(job,outcome.status as any,outcome.code,outcome.id);processed++;
  }}catch{failed=true;}
 const status=failed?"failed":"completed";
 if(getServerSupabase())await jobRpc("record_worker_run",{p_id:runId,p_status:status,p_processed:processed});else await runs.update(runId,{status,processed,finished_at:new Date().toISOString()});
 return {success:!failed,processed,runId};
}
