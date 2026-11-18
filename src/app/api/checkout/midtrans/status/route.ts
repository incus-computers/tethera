import { withApiProtection } from "@/lib/operations/apiProtection";
import { limitAuth, authResponse } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/errors";
import { NextRequest, NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/runtime/environment";
import { paymentAttempts, reconcileAttempt } from "@/lib/payment/attempts";
import { GatewayError } from "@/lib/payment/gateway";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
export const POST=withApiProtection(withAccess(async(req:NextRequest)=>{
 try{
  const {orderId}=await req.json();
  if(isDemoMode()){const order=await db.orders.findById(orderId);return NextResponse.json({success:true,state:order?.paid_at?"settled":order?.status==="cancelled"?"cancelled":"pending"});}
  const attempt=await paymentAttempts.findOne({order_id:orderId});if(!attempt)return NextResponse.json({error:"Payment attempt not found."},{status:404});
  await limitAuth("gateway-status",attempt.id,30);
  const result=await reconcileAttempt(attempt);return NextResponse.json({success:true,state:result.state});
 }catch(error){if(error instanceof AuthError)return authResponse(error);return databaseFailureResponse(error)||NextResponse.json({error:error instanceof GatewayError?error.message:"Could not verify payment."},{status:error instanceof GatewayError?error.status:503});}
}));
