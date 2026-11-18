import "server-only";
import { isDemoMode } from "@/lib/runtime/environment";
import { BackgroundJob,JobError } from "./types";
export function emailConfig(){
 if(isDemoMode())return {from:"Demo Store <demo@example.invalid>",key:""};
 if(process.env.NOTIFICATIONS_ENABLED!=="true"||!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM||!/^.{1,150}<[^<>\s]+@[^<>\s]+>$|^[^<>\s]+@[^<>\s]+$/.test(process.env.EMAIL_FROM))throw new JobError("email_not_configured","blocked");
 return {from:process.env.EMAIL_FROM,key:process.env.RESEND_API_KEY};
}
export async function deliverEmail(job:BackgroundJob){
 const config=emailConfig();
 if(job.remote_started_at&&Date.now()-Date.parse(job.remote_started_at)>23*3600000)throw new JobError("email_idempotency_window_expired","review");
 if(isDemoMode())return {id:"DEMO-"+job.id,simulated:true};
 let response:Response;
 try{response=await fetch("https://api.resend.com/emails",{method:"POST",redirect:"error",signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${config.key}`,"Content-Type":"application/json","Idempotency-Key":"job/"+job.id},body:JSON.stringify(job.request.body)});}catch{throw new JobError("email_network_unknown");}
 let body:any;try{body=await response.json();}catch{throw new JobError("email_response_unknown");}
 if(response.ok){if(typeof body.id!=="string"||!body.id)throw new JobError("email_acceptance_unknown");return {id:body.id,simulated:false};}
 if(response.status===409&&body.name!=="concurrent_idempotent_requests")throw new JobError("email_request_conflict","review");
 if(response.status===429||response.status>=500||response.status===409)throw new JobError("email_provider_retry");
 throw new JobError("email_provider_rejected","dead");
}
export async function deliverWhatsapp(job:BackgroundJob){
 if(isDemoMode())return {id:"DEMO-WA-"+job.id,simulated:true};
 const key=process.env.WHATSAPP_API_TOKEN,phone=process.env.WHATSAPP_PHONE_NUMBER_ID,version=process.env.WHATSAPP_GRAPH_VERSION;
 if(process.env.WHATSAPP_ENABLED!=="true"||!key||!/^\d+$/.test(phone||"")||!/^v\d+\.\d+$/.test(version||""))throw new JobError("whatsapp_not_configured","blocked");
 let response:Response;try{response=await fetch(`https://graph.facebook.com/${version}/${phone}/messages`,{method:"POST",redirect:"error",signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(job.request.body)});}catch{throw new JobError("whatsapp_outcome_unknown","review");}
 let body:any;try{body=await response.json();}catch{throw new JobError("whatsapp_outcome_unknown","review");}
 if(response.ok&&typeof body.messages?.[0]?.id==="string")return {id:body.messages[0].id,simulated:false};
 // No assumed provider idempotency. Ambiguous responses require operator/provider reconciliation.
 if(response.status>=500||response.ok)throw new JobError("whatsapp_outcome_unknown","review");
 if(response.status===429)throw new JobError("whatsapp_rate_limited");
 throw new JobError("whatsapp_provider_rejected","dead");
}
