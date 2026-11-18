import "server-only";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
import { jobs,jobEvents } from "./store";
const runs=new BaseRepository<any>("worker_runs");
export async function queueOverview(){
 const recent=await jobs.findMany(undefined,{orderBy:"created_at",orderDirection:"desc",limit:100});
 const states=["pending","running","retry","accepted","simulated","blocked","review","dead","cancelled"] as const;
 const counts=Object.fromEntries(await Promise.all(states.map(async status=>[status,await jobs.count({status})])));
 const lastRun=(await runs.findMany(undefined,{orderBy:"started_at",orderDirection:"desc",limit:1}))[0]||null;
 const stale=!lastRun||!lastRun.finished_at||Date.now()-Date.parse(lastRun.finished_at)>180000;
 return {counts,lastRun,stale,needsAttention:stale||counts.blocked+counts.review+counts.dead>0,jobs:recent.map(j=>({id:j.id,kind:j.kind,status:j.status,attempts:j.attempts,created_at:j.created_at,updated_at:j.updated_at,last_error:j.last_error,provider_id:j.provider_id,orderId:j.payload.orderId||null})),recentEvents:await jobEvents.findMany(undefined,{orderBy:"created_at",orderDirection:"desc",limit:50})};
}
