import { withApiProtection } from "@/lib/operations/apiProtection";
import { timingSafeEqual } from "crypto";
import { NextRequest,NextResponse } from "next/server";
import { isDemoMode } from "@/lib/runtime/environment";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { shippingOperations,applyShipment,reconcileShipment } from "@/lib/shipping/dispatch";
import { ShippingError,shipmentEvidence } from "@/lib/shipping/gateway";
export const dynamic="force-dynamic";
async function notificationBody(req:NextRequest){
 const limit=50000,reader=req.body?.getReader();if(!reader)throw new ShippingError("Invalid shipping notification.",400);
 const chunks:Uint8Array[]=[];let size=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new ShippingError("Notification too large.",413);}chunks.push(value);}
 }finally{reader.releaseLock();}
 try{const p=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks)));if(!p||typeof p!=="object"||Array.isArray(p))throw new Error();return p;}
 catch{throw new ShippingError("Invalid shipping notification.",400);}
}
 async function protectedPOST(req:NextRequest){
 try{
  const demo=isDemoMode(),secret=demo?"demo-webhook-only":process.env.BITESHIP_WEBHOOK_SECRET||"",given=req.headers.get("x-biteship-token")||"";
  if(!demo&&secret.length<32)throw new ShippingError("Shipping callback is not configured.");
  if(Buffer.byteLength(given)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(given),Buffer.from(secret)))return NextResponse.json({success:false,error:"Unauthorised webhook"},{status:401});
  const p=await notificationBody(req);
  if(typeof p.order_id!=="string"||!p.order_id||p.order_id.length>100||!["order.status","order.price","order.waybill_id"].includes(p.event))throw new ShippingError("Invalid shipping notification.",400);
  let operation=await shippingOperations.findOne({provider_id:p.order_id});
  if(!operation&&typeof p.reference_id==="string")operation=await shippingOperations.findOne({reference_id:p.reference_id});
  if(!operation)throw new ShippingError("No matching dispatch operation. Reconciliation is required.",404);
  if(operation.provider_id&&operation.provider_id!==p.order_id)throw new ShippingError("Provider shipment does not match.",409);
  if(p.reference_id&&p.reference_id!==operation.reference_id)throw new ShippingError("Dispatch reference does not match.",409);
  let result;
  if(demo){result=await applyShipment(operation,shipmentEvidence({success:true,id:p.order_id,reference_id:operation.reference_id,status:p.status||operation.shipment_status,courier:{waybill_id:p.courier_waybill_id,tracking_id:p.courier_tracking_id,link:p.courier_link},price:p.order_price??p.price},operation.reference_id,operation.provider_id||undefined));}
  else result=await reconcileShipment(operation,p.order_id);
  return NextResponse.json({success:true,state:result.operation?.state,status:result.operation?.shipment_status});
 }catch(error){return databaseFailureResponse(error)||NextResponse.json({success:false,error:error instanceof ShippingError?error.message:"Shipping update could not be recorded. Retry required."},{status:error instanceof ShippingError?error.status:503});}
}
export const POST = withApiProtection(protectedPOST);
 async function protectedGET(){return NextResponse.json({status:"active",supportedEvents:["order.status","order.waybill_id","order.price"]});}
export const GET = withApiProtection(protectedGET);
