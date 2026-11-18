export async function register(){
 if(process.env.NEXT_RUNTIME==="nodejs"){
 if(process.env.APP_ENV!=="demo"||process.env.NODE_ENV==="production")return;
 const state=globalThis as typeof globalThis & {__demoJobsTimer?:ReturnType<typeof setInterval>;__demoJobsRunning?:boolean};
 if(!state.__demoJobsTimer){
  state.__demoJobsTimer=setInterval(async()=>{if(state.__demoJobsRunning)return;state.__demoJobsRunning=true;try{const {scheduleMaintenance,runWorker}=await import("@/lib/jobs/worker");await scheduleMaintenance();await runWorker();}catch{console.error("[DEMO_WORKER_FAILURE]");}finally{state.__demoJobsRunning=false;}},15000);state.__demoJobsTimer.unref();
 }
}
}
