import { withApiProtection } from "@/lib/operations/apiProtection";
import { timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { runWorker,scheduleMaintenance } from "@/lib/jobs/worker";
export const maxDuration=60;
 async function protectedPOST(req:NextRequest){
 const secret=process.env.BACKGROUND_JOB_SECRET||"",expected="Bearer "+secret,given=req.headers.get("authorization")||"";
 if(secret.length<32)return NextResponse.json({success:false,error:"Worker not configured."},{status:503});
 if(Buffer.byteLength(given)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(given),Buffer.from(expected)))return NextResponse.json({success:false},{status:401});
 try{await scheduleMaintenance();const result=await runWorker();return NextResponse.json(result,{status:result.success?200:503});}catch{return NextResponse.json({success:false},{status:503});}
}
export const POST = withApiProtection(protectedPOST);
