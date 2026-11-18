"use client";
import React,{useCallback,useEffect,useState} from "react";
export function BackgroundJobsPanel({canManage}:{canManage:boolean}){
 const [data,setData]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[demo,setDemo]=useState(false);
 const load=useCallback(async()=>{try{const r=await fetch("/api/admin/jobs",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Queue unavailable.");setData(d);setError("");}catch(e){setError(e instanceof Error?e.message:"Queue unavailable.");}},[]);
 useEffect(()=>{load();fetch("/api/auth/environment").then(r=>r.json()).then(d=>setDemo(d.demo===true)).catch(()=>{});},[load]);
 async function act(action:string,id?:string){const reason=action==="run_demo"?null:window.prompt(action==="resolve"?"Only resolve after confirming the provider outcome. Record the evidence/reference:":"Reason for this action:");if(action!=="run_demo"&&!reason)return;setBusy(true);try{const r=await fetch("/api/admin/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,id,reason})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Action failed.");await load();}catch(e){setError(e instanceof Error?e.message:"Action failed.");}finally{setBusy(false);}}
 return <section className="p-5 rounded-2xl border border-white/10 bg-[#12141A] space-y-4 text-slate-200">
 <div className="flex justify-between gap-4"><h2 className="font-bold">Background jobs &amp; notifications</h2><button onClick={load} disabled={busy} className="underline text-xs">Refresh</button></div>
 <p className="text-xs text-slate-400">Accepted means the task completed or the provider accepted a send. Delivery is not confirmed. Simulated jobs send nothing.</p>
 {error&&<p role="alert" className="text-red-400">{error}</p>}
 {data&&<><p className="text-xs">Worker: {data.stale?"No recent completed run. Check the scheduler.":"Recent run completed."}</p>
 <div className="flex flex-wrap gap-3 text-xs">{Object.entries(data.counts).map(([state,n])=><span key={state}>{state}: {String(n)}</span>)}</div>
 {demo&&canManage&&<button disabled={busy} onClick={()=>act("run_demo")} className="rounded-lg bg-sky-700 px-4 py-3">Run dummy worker now</button>}
 <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead><tr><th>Job</th><th>Status / attempts</th><th>Issue</th><th>Actions</th></tr></thead><tbody>{data.jobs.map((j:any)=><tr key={j.id} className="border-t border-white/10"><td className="py-3 pr-3">{j.kind}<small className="block font-mono">{j.id}</small></td><td>{j.status} / {j.attempts}</td><td>{j.last_error||"-"}</td><td>{canManage&&["blocked","review","dead","retry"].includes(j.status)&&<div className="flex gap-3"><button disabled={busy} onClick={()=>act("retry",j.id)} className="underline">Retry</button><button disabled={busy} onClick={()=>act("resolve",j.id)} className="underline">Resolve</button><button disabled={busy} onClick={()=>act("cancel",j.id)} className="underline">Cancel job</button></div>}</td></tr>)}</tbody></table></div></>}
 </section>;
}
