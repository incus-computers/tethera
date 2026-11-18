import "server-only";
import { randomUUID } from "crypto";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
import { getServerSupabase } from "@/lib/db/client";
import { DatabaseError } from "@/lib/db/errors";
import { demoTransaction } from "@/lib/inventory/demoTransaction";
import { BackgroundJob,JobKind,JobStatus,JobError } from "./types";
export const jobs=new BaseRepository<BackgroundJob>("background_jobs");
export const jobEvents=new BaseRepository<any>("background_job_events");
export async function jobRpc(name:string,args:Record<string,unknown>){
 const client=getServerSupabase();if(!client)throw new DatabaseError(name,"background_jobs");
 const {data,error}=await client.rpc(name,args);if(error||data===null)throw new DatabaseError(name,"background_jobs",error?.code);return data;
}
export async function enqueue(kind:JobKind,key:string,payload:any,resource:string|null=null):Promise<BackgroundJob>{
 if(getServerSupabase())return jobRpc("enqueue_background_job",{p_kind:kind,p_key:key,p_payload:payload,p_resource:resource});
 return demoTransaction(async()=>{
  const prior=await jobs.findOne({event_key:key});if(prior){if(prior.kind!==kind||JSON.stringify(prior.payload)!==JSON.stringify(payload)||prior.resource_key!==resource)throw new JobError("job_key_conflict","dead");return prior;}
  const now=new Date().toISOString();return jobs.create({id:randomUUID(),kind,event_key:key,payload,resource_key:resource,status:"pending",attempts:0,available_at:now,lease_token:null,lease_until:null,request:null,remote_started_at:null,provider_id:null,last_error:null,created_at:now,updated_at:now});
 });
}
const unsafe=(j:BackgroundJob)=>!!j.remote_started_at&&j.request?.provider!=="resend";
export async function claimJob():Promise<BackgroundJob|null>{
 if(getServerSupabase())return (await jobRpc("claim_background_job",{})).job;
 return demoTransaction(async()=>{
  const all=await jobs.findMany(undefined,{orderBy:"available_at"});const now=Date.now();
  for(const j of all){
   if(j.status==="running"&&Date.parse(j.lease_until||"")<=now){await jobs.update(j.id,{status:unsafe(j)?"review":"retry",last_error:"lease_expired",lease_token:null,lease_until:null});j.status=unsafe(j)?"review":"retry";}
   if(!["pending","retry"].includes(j.status)||Date.parse(j.available_at)>now)continue;
   if(j.attempts>=6){await jobs.update(j.id,{status:j.remote_started_at?"review":"dead",last_error:"attempts_exhausted"});continue;}
   if(j.resource_key&&all.some(other=>other.id!==j.id&&other.resource_key===j.resource_key&&(other.status==="running"||(other.status==="review"&&other.remote_started_at))))continue;
   return (await jobs.update(j.id,{status:"running",attempts:j.attempts+1,lease_token:randomUUID(),lease_until:new Date(now+90000).toISOString(),updated_at:new Date().toISOString()}))!;
  }return null;
 });
}
async function leased(job:BackgroundJob){const current=await jobs.findById(job.id);if(!current||current.status!=="running"||current.lease_token!==job.lease_token||Date.parse(current.lease_until||"")<=Date.now())throw new JobError("lease_lost","review");return current;}
export async function startRemote(job:BackgroundJob,request:any):Promise<BackgroundJob>{
 if(getServerSupabase())return jobRpc("start_background_request",{p_id:job.id,p_token:job.lease_token,p_request:request});
 return demoTransaction(async()=>{const current=await leased(job);if(current.request&&JSON.stringify(current.request)!==JSON.stringify(request))throw new JobError("request_changed","review");return (await jobs.update(job.id,{request,remote_started_at:current.remote_started_at||new Date().toISOString()}))!;});
}
export async function finishJob(job:BackgroundJob,status:JobStatus,code:string|null=null,providerId:string|null=null){
 if(getServerSupabase())return jobRpc("finish_background_job",{p_id:job.id,p_token:job.lease_token,p_status:status,p_code:code,p_provider_id:providerId});
 return demoTransaction(async()=>{const current=await leased(job);if(!["accepted","simulated","blocked","review","dead","retry","cancelled"].includes(status))throw new JobError("invalid_outcome","dead");
 const outcome=status==="retry"&&current.attempts>=6?(current.remote_started_at?"review":"dead"):status;
 const updated=await jobs.update(job.id,{status:outcome,last_error:code,provider_id:providerId,lease_token:null,lease_until:null,available_at:new Date(Date.now()+Math.min(3600,30*2**(current.attempts-1))*1000).toISOString(),updated_at:new Date().toISOString()});
 await jobEvents.create({job_id:job.id,attempt:current.attempts,status:outcome,code,created_at:new Date().toISOString()});
 if(["accepted","simulated"].includes(outcome)&&current.kind==="stock_alert")await new BaseRepository<any>("stock_notifications").update(current.payload.notificationId,{notified_at:new Date().toISOString()});
 return updated;
 });
}
export async function repairJob(id:string,action:"retry"|"resolve"|"cancel",reason:string,actor:string){
 if(getServerSupabase())return jobRpc("repair_background_job",{p_id:id,p_action:action,p_reason:reason,p_actor:actor});
 return demoTransaction(async()=>{const j=await jobs.findById(id);if(!j||!["blocked","review","dead","retry"].includes(j.status))throw new JobError("job_not_repairable","dead");
 if(action==="retry"&&j.remote_started_at&&(unsafe(j)||Date.now()-Date.parse(j.remote_started_at)>23*3600000))throw new JobError("reconcile_remote_outcome_first","review");
 const status=action==="retry"?"pending":action==="resolve"?"accepted":"cancelled";
 const result=await jobs.update(id,{status,attempts:action==="retry"?0:j.attempts,available_at:new Date().toISOString(),last_error:action==="retry"?null:"operator_"+action});await jobEvents.create({job_id:id,status,code:"operator_"+action,actor,reason,created_at:new Date().toISOString()});return result;
 });
}
