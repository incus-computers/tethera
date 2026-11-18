import { withApiProtection } from "@/lib/operations/apiProtection";
import { timingSafeEqual } from "crypto";
import { NextRequest,NextResponse } from "next/server";
import { reconcileShipping } from "@/lib/shipping/dispatch";
 async function protectedPOST(req:NextRequest){
 const secret=process.env.SHIPPING_JOB_SECRET||"",given=req.headers.get("authorization")||"",expected="Bearer "+secret;
 if(secret.length<32)return NextResponse.json({success:false},{status:503});
 if(Buffer.byteLength(given)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(given),Buffer.from(expected)))return NextResponse.json({success:false},{status:401});
 try{const results=await reconcileShipping(),success=results.every(r=>r.success);return NextResponse.json({success,results},{status:success?200:503});}catch{return NextResponse.json({success:false},{status:503});}
}
export const POST = withApiProtection(protectedPOST);
