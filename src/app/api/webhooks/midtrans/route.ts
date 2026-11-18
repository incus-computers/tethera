import { withApiProtection } from "@/lib/operations/apiProtection";
import { gatewayConfig, GatewayError, verifyGatewaySignature } from "@/lib/payment/gateway";
import { paymentAttempts, reconcileAttempt } from "@/lib/payment/attempts";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { verifyMidtransSignature } from "@/lib/payment/midtrans";
import { isDemoMode } from "@/lib/runtime/environment";
import { transitionInventory } from "@/lib/inventory/lifecycle";
export const dynamic="force-dynamic";
 async function protectedPOST(req:NextRequest){
 try {
  if(Number(req.headers.get("content-length")||0)>50000)return NextResponse.json({error:"Invalid notification."},{status:413});
  const raw=await req.text();if(raw.length>50000)return NextResponse.json({error:"Invalid notification."},{status:413});
  const p=JSON.parse(raw);
  if(!isDemoMode()) {
    gatewayConfig();
    if(!verifyGatewaySignature(p))return NextResponse.json({error:"Invalid cryptographic signature."},{status:401});
    const attempt=await paymentAttempts.findOne({provider_order_id:p.order_id});
    if(!attempt)return NextResponse.json({error:"Unknown payment attempt."},{status:404});
    // Notification status is only a trigger; evidence comes from the authenticated provider status API.
    const result=await reconcileAttempt(attempt);
    if(result.notFound)return NextResponse.json({error:"Payment status is not yet available."},{status:503});
    return NextResponse.json({success:true,state:result.state});
  }
  if(!p.order_id || !p.status_code || !p.gross_amount || !p.signature_key)return NextResponse.json({error:"Missing required notification fields."},{status:400});
  if(!verifyMidtransSignature(p.order_id,p.status_code,p.gross_amount,p.signature_key))return NextResponse.json({error:"Invalid cryptographic signature."},{status:401});
  const order=await db.orders.findByOrderNumber(p.order_id) || await db.orders.findById(p.order_id);
  if(!order)return NextResponse.json({error:"Order not found in database."},{status:404});
  if(!/^\d+(\.00)?$/.test(String(p.gross_amount)) || Number(p.gross_amount)!==order.total)return NextResponse.json({error:"Payment amount does not match order."},{status:409});
  const settled=p.transaction_status==="settlement" || (p.transaction_status==="capture" && p.fraud_status==="accept");
  if(settled && (typeof p.transaction_id!=="string" || !p.transaction_id))return NextResponse.json({error:"Transaction reference required."},{status:400});
  const action=settled?"settle":["cancel","expire","deny"].includes(p.transaction_status)?"cancel":"pending";
  const result=await transitionInventory(order.id,action,p.transaction_id||"","Payment cancelled or expired.",order.total);
  if(settled && result.success && typeof p.payment_type==="string" && p.payment_type.length<40)await db.orders.update(order.id,{payment_method:p.payment_type.toUpperCase().replace(/_/g," ")+" (Midtrans)"});
  return NextResponse.json({success:result.success,message:result.changed?"Inventory transition completed.":"Event is idempotent or leaves terminal state unchanged.",order_id:p.order_id,orderStatus:result.status,error:result.error},{status:result.success?200:409});
 }catch(error){if(error instanceof GatewayError)return NextResponse.json({error:"Service temporarily unavailable. Please retry."},{status:error.status});return databaseFailureResponse(error)||NextResponse.json({error:"Payment event could not be processed."},{status:500});}
}
export const POST = withApiProtection(protectedPOST);
