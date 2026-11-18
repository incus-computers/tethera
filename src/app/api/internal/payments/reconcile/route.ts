import { withApiProtection } from "@/lib/operations/apiProtection";
import { timingSafeEqual } from "crypto";
import { NextRequest,NextResponse } from "next/server";
import { reconcilePayments } from "@/lib/payment/attempts";
 async function protectedPOST(req:NextRequest){
 const key=process.env.PAYMENT_JOB_SECRET||"",provided=req.headers.get("authorization")||"",expected="Bearer "+key;
 if(key.length<32)return NextResponse.json({success:false},{status:503});
 if(Buffer.byteLength(provided)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return NextResponse.json({success:false},{status:401});
 try{const results=await reconcilePayments();const success=results.every(r=>!r.error&&!r.notFound);return NextResponse.json({success,results},{status:success?200:503});}catch{return NextResponse.json({success:false},{status:503});}
}
export const POST = withApiProtection(protectedPOST);
