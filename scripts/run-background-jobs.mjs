// Run once per minute from the deployment scheduler. No credentials are printed.
const secret=process.env.BACKGROUND_JOB_SECRET||"";
let target;
try{target=new URL("/api/internal/jobs/run",process.env.BACKGROUND_WORKER_URL||"");if(target.username||target.password||!(target.protocol==="https:"||(target.protocol==="http:"&&["localhost","127.0.0.1"].includes(target.hostname))))throw new Error();}catch{console.error("Worker URL must be an HTTPS origin or localhost.");process.exit(1);}
if(secret.length<32){console.error("Worker secret is not configured.");process.exit(1);}
try{const response=await fetch(target,{method:"POST",redirect:"error",signal:AbortSignal.timeout(55000),headers:{Authorization:`Bearer ${secret}`}});const result=await response.json();if(!response.ok||!result.success)throw new Error();console.log(`Worker completed: ${result.processed} jobs.`);}catch{console.error("Worker run failed. Inspect scheduler/queue health.");process.exitCode=1;}
