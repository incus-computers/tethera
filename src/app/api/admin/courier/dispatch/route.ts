import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest,NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { isDemoMode } from "@/lib/runtime/environment";
import { dispatchOrder,shippingOperations,applyShipment,reconcileShipment } from "@/lib/shipping/dispatch";
import { ShippingError,shipmentEvidence } from "@/lib/shipping/gateway";
export const dynamic="force-dynamic";
export const POST=withApiProtection(withAccess(async(req:NextRequest)=>{
 try{
  const access=await requireAdminPermission(req,"orders:dispatch");if(!access.authorized)return NextResponse.json({success:false,error:access.error},{status:access.status||403});
  const body=await req.json();if(typeof body.orderId!=="string")throw new ShippingError("Order ID is required.",400);
  const operationForOrder=async()=>{const list=await shippingOperations.findMany({order_id:body.orderId});const selected=body.operationId?list.find(op=>op.id===body.operationId):list.length===1?list[0]:null;if(!selected)throw new ShippingError("Choose the individual parcel operation for reconciliation or simulation.",409);return selected;};
  let result;
  if(body.action?.startsWith("simulate_")){
   if(!isDemoMode())throw new ShippingError("Shipping simulation is available only in demo mode.",403);
   const operation=await operationForOrder();if(!operation?.provider_id)throw new ShippingError("Book a demo shipment before simulating updates.",409);
   const status=body.action==="simulate_arrival"?"delivered":body.action==="simulate_failure"?"failed":body.action==="simulate_rejection"?"rejected":body.simulatedStatus||"in_transit";
   result=await applyShipment(operation,shipmentEvidence({success:true,id:operation.provider_id,reference_id:operation.reference_id,status,courier:{waybill_id:operation.evidence?.waybill_id,tracking_id:operation.evidence?.tracking_id}},operation.reference_id,operation.provider_id));
  }else if(body.action==="reconcile"){
   const operation=await operationForOrder();if(!operation)throw new ShippingError("Dispatch operation not found.",404);result=await reconcileShipment(operation,body.biteshipOrderId);
  }else{
   if(body.action && body.action!=="dispatch")throw new ShippingError("Unsupported dispatch action.",400);
   result=await dispatchOrder(body.orderId,body,access.user?.id||"staff");
  }
  return NextResponse.json({success:true,message:result.operation?.state==="review"?"Shipment needs review; no new booking was created.":"Shipment booking is recorded. Tracking reflects actual courier progress.",order:result.order,operationId:result.operation?.id,waybillId:result.operation?.evidence?.waybill_id||null,trackingUrl:result.operation?.evidence?.tracking_url||null,pickupTime:null});
 }catch(error){return databaseFailureResponse(error)||NextResponse.json({success:false,error:error instanceof ShippingError?error.message:"Dispatch could not complete. Retry the existing operation."},{status:error instanceof ShippingError?error.status:503});}
}));
