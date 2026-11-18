import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest,NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { db } from "@/lib/db";
export const POST=withApiProtection(withAccess(async(req:NextRequest)=>{
 const {orderId,paymentReference}=await req.json();const result=await db.orders.processPaymentSuccess(orderId,paymentReference||"DEMO-PAYMENT");
 if(!result.success)return NextResponse.json({success:false,error:result.error},{status:409});
 const order=await db.orders.findById(orderId);
 return NextResponse.json({success:true,orderNumber:order?.order_number,status:result.status,fulfillmentType:order?.fulfillment_type,pickupCode:order?.pickup_code,message:"Payment recorded. Notifications are queued."});
}));
