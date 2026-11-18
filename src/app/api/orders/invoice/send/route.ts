import { withApiProtection } from "@/lib/operations/apiProtection";
import { createHash } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { enqueue } from "@/lib/jobs/store";
export const POST=withApiProtection(withAccess(async(req:NextRequest)=>{
 const {orderId}=await req.json();const supplied=req.headers.get("Idempotency-Key");
 if(supplied&&!/^[0-9a-f-]{36}$/i.test(supplied))return NextResponse.json({success:false,error:"Invalid invoice request key."},{status:400});
 const key=supplied||String(Math.floor(Date.now()/300000));
 const job=await enqueue("order_invoice",`invoice-request:${orderId}:${createHash("sha256").update(key).digest("hex")}`,{orderId,reason:"customer_request"});
 return NextResponse.json({success:true,queued:true,jobId:job.id,message:"Invoice email queued."},{status:202});
}));
