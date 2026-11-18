import { withApiProtection } from "@/lib/operations/apiProtection";
import { enqueueStockAlerts } from "@/lib/jobs/stockAlerts";
import { NextRequest,NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { isDemoMode } from "@/lib/runtime/environment";
import { queueOverview } from "@/lib/jobs/monitor";
import { runWorker,scheduleMaintenance } from "@/lib/jobs/worker";
import { repairJob } from "@/lib/jobs/store";
export const GET=withApiProtection(withAccess(async()=>NextResponse.json({success:true,...await queueOverview()})));
export const POST=withApiProtection(withAccess(async(req:NextRequest)=>{
 const access=await requireAdminPermission(req,"jobs:manage");if(!access.authorized)return NextResponse.json({success:false},{status:access.status||403});
 const b=await req.json();
 if(b.action==="run_demo"){
  if(!isDemoMode())return NextResponse.json({success:false,error:"Use the authenticated scheduler for connected workers."},{status:409});
  await enqueueStockAlerts();await scheduleMaintenance();return NextResponse.json(await runWorker());
 }
 if(!["retry","resolve","cancel"].includes(b.action)||typeof b.id!=="string"||typeof b.reason!=="string"||b.reason.trim().length<5||b.reason.length>500)return NextResponse.json({success:false,error:"Choose a job action and provide a reason (5-500 characters)."},{status:400});
 try{await repairJob(b.id,b.action,b.reason.trim(),access.user!.id);return NextResponse.json({success:true});}catch{return NextResponse.json({success:false,error:"Job cannot be retried safely. Reconcile the provider outcome before resolving it."},{status:409});}
}));
