import "server-only";
import { randomUUID,createHash } from "crypto";
import { db,BaseRepository,Order } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/client";
import { DatabaseError } from "@/lib/db/errors";
import { demoTransaction } from "@/lib/inventory/demoTransaction";
import { isDemoMode } from "@/lib/runtime/environment";
import { TETHERA_WAREHOUSE_ORIGIN } from "./biteship";
import { shippingConfig,ShippingError,shippingRequest,shipmentEvidence,retrieveShipment } from "./gateway";
export type ShippingOperation={id:string;order_id:string;fulfillment_id:string;reference_id:string;provider_id?:string|null;request_key?:string|null;fingerprint?:string|null;environment:string;request:any;state:"creating"|"booked"|"review";shipment_status?:string|null;progress:number;evidence?:any;updated_at:string};
export const shippingOperations=new BaseRepository<ShippingOperation>("shipping_operations");
const events=new BaseRepository<any>("shipping_events"),costs=new BaseRepository<any>("shipping_carrier_costs"),allocations=new BaseRepository<any>("fulfillment_items");
async function rpc(name:string,args:Record<string,unknown>){
 const client=getServerSupabase();if(!client)throw new ShippingError("Persistent dispatch storage required.");
 try{const {data,error}=await client.rpc(name,args);if(error)throw new DatabaseError(name,"shipping_operations",error.code);if(!data)throw new DatabaseError(name,"shipping_operations");return data;}catch(e){if(e instanceof DatabaseError)throw e;throw new DatabaseError(name,"shipping_operations");}
}
function number(value:any,label:string,min=1,max=100000){if(typeof value!=="number"||!Number.isSafeInteger(value)||value<min||value>max)throw new ShippingError(`Invalid ${label}.`,409);return value;}
export function shippingSnapshot(order:Order){const info=order.courier_info as any;return {shipping_address:order.shipping_address??null,customer_name:order.customer_name,customer_email:order.customer_email,customer_phone:order.customer_phone,quote_items:info?.quote_items??null,quote_origin:info?.quote_origin??null,courier_company:info?.courier_company??null,service_code:info?.service_code??null};}
export async function dispatchPayload(order:Order,options:any={}){
 const info=order.courier_info as any,address=order.shipping_address;
 if(!address?.street || !address.city || !/^\d{5}$/.test(address.postalCode) || !order.customer_name || !order.customer_phone)throw new ShippingError("Complete saved delivery details are required.",409);
 const demo=isDemoMode();
 const company=info?.courier_company || (demo?options.courierProvider||"jne":null),service=info?.service_code || (demo?options.serviceCode||"jne-reg":null);
 if(typeof company!=="string" || !/^[a-z0-9_]{2,30}$/.test(company) || typeof service!=="string" || !/^[a-zA-Z0-9_-]{1,60}$/.test(service))throw new ShippingError("A verified courier quote is required.",409);
 if((options.courierProvider && options.courierProvider!==company) || (options.serviceCode && options.serviceCode!==service))throw new ShippingError("Dispatch must use the saved courier selection.",409);
 if(!demo && ["gojek","grab"].includes(company))throw new ShippingError("Instant dispatch needs a verified coordinate workflow; choose a supported postal service.",409);
 if(!demo && options.deliveryType && options.deliveryType!=="now")throw new ShippingError("Scheduled dispatch is not supported by this booking workflow.",409);
 let items=info?.quote_items,origin=info?.quote_origin;
 if(demo && (!Array.isArray(items)||!items.length)){
  const details=await db.orders.getOrderWithItems(order.id);
  items=details.items.filter(i=>i.product_id).map(i=>({id:i.product_id,name:i.product_title_snapshot||"Demo component",price:i.unit_price,quantity:i.quantity,weightGrams:1500,dimensionsCm:{length:30,width:25,height:15}}));
 }
 if(demo && !origin)origin=TETHERA_WAREHOUSE_ORIGIN;
 if(!origin || !origin.contactName || !origin.contactPhone || !origin.address || !/^\d{5}$/.test(String(origin.postalCode)))throw new ShippingError("The saved shipping origin is missing. Reconciliation is required.",409);
 if(!Array.isArray(items)||!items.length||items.length>100)throw new ShippingError("The verified package manifest is missing.",409);
 if(demo && options.deliveryType==="scheduled" && (!/^\d{4}-\d{2}-\d{2}$/.test(options.deliveryDate||"") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(options.deliveryTime||"")))throw new ShippingError("Valid demo pickup date and time required.",400);
 const packed=items.map((i:any)=>({name:String(i.name||"").slice(0,200),value:number(i.price,"declared value",0,9999999999),quantity:number(i.quantity??1,"package quantity",1,100),weight:number(i.weightGrams,"package weight"),length:number(i.dimensionsCm?.length,"package length",1,300),width:number(i.dimensionsCm?.width,"package width",1,300),height:number(i.dimensionsCm?.height,"package height",1,300)}));
 const insurance=info?.quote_insurance?.value;
 if(!demo && (!Number.isSafeInteger(insurance)||insurance<0 || options.packingConfirmed!==true))throw new ShippingError("Confirm measured packing and the saved full-value insurance before booking.",409);
 return {_snapshot:shippingSnapshot(order),_packing:{confirmed:options.packingConfirmed===true,handling:"fragile"},...(insurance!=null?{courier_insurance:insurance}:{}),origin_contact_name:origin.contactName,origin_contact_phone:origin.contactPhone,origin_address:origin.address,origin_postal_code:Number(origin.postalCode),origin_collection_method:"pickup",
  destination_contact_name:order.customer_name,destination_contact_phone:order.customer_phone,destination_contact_email:order.customer_email,destination_address:[address.street,address.unit,address.subdistrict,address.city,address.province].filter(Boolean).join(", "),destination_postal_code:Number(address.postalCode),destination_note:address.deliveryNotes||"",
  courier_company:company,courier_type:service.startsWith(company+"-")?service.slice(company.length+1):service,delivery_type:demo&&options.deliveryType==="scheduled"?"scheduled":"now",...(demo&&options.deliveryType==="scheduled"?{delivery_date:options.deliveryDate,delivery_time:options.deliveryTime}:{}),items:packed};
}
export async function prepareDispatch(orderId:string,options:any,actor:string){
 const order=await db.orders.findById(orderId);if(!order)throw new ShippingError("Order not found.",404);
 const payload=await dispatchPayload(order,options),environment=isDemoMode()?"demo":shippingConfig().mode;
 if(!isDemoMode() && process.env.BITESHIP_ORIGIN_CONFIRMED!=="true")throw new ShippingError("Warehouse origin must be confirmed before booking.");
 if(!isDemoMode())return rpc("prepare_shipping_dispatch",{p_order_id:orderId,p_request:payload,p_environment:environment,p_actor:actor});
 return demoTransaction(async()=>{
  const fresh=await db.orders.findById(orderId),prior=await shippingOperations.findOne({order_id:orderId});
  if(prior?.request_key)throw new ShippingError("Use the individual parcel operations for this order.",409);
  if(prior){const {reference_id:_,...previous}=prior.request;if(JSON.stringify(previous)!==JSON.stringify(payload))throw new ShippingError("Dispatch request conflicts with the existing operation.",409);return {success:true,may_create:false,operation:prior};}
  if(!fresh?.paid_at || fresh.fulfillment_type!=="delivery" || !["ready_for_dispatch","finding_courier","courier_failed","courier_rejected"].includes(fresh.status))throw new ShippingError("Order must be paid and delivery-ready before dispatch.",409);
  if((await new BaseRepository<any>("payment_attempts").findMany({order_id:orderId,state:"review"})).length)throw new ShippingError("Payment requires reconciliation before shipping.",409);
  if((await new BaseRepository<any>("refund_operations").findMany({order_id:orderId})).length || (await new BaseRepository<any>("return_receipts").findMany({order_id:orderId})).length)throw new ShippingError("Refunded or returned goods need fulfillment review before any new shipment.",409);
  if(JSON.stringify(shippingSnapshot(fresh))!==JSON.stringify(payload._snapshot))throw new ShippingError("Shipping details changed before booking.",409);
  if((await db.fulfillments.findMany({order_id:orderId})).length || fresh.courier_info?.biteship_order_id)throw new ShippingError("Existing shipment requires reconciliation.",409);
  const physical=(await db.orders.getOrderWithItems(orderId)).items.filter(i=>i.product_id);if(!physical.length)throw new ShippingError("No physical order items.",409);
  const id=randomUUID(),fulfillment=await db.fulfillments.create({id:randomUUID(),order_id:orderId,fulfillment_number:"FUL-"+id,carrier:payload.courier_company,service_code:payload.courier_type,status:"processing",dispatched_by:actor});
  for(const line of physical)await allocations.create({fulfillment_id:fulfillment.id,order_item_id:line.id,quantity:line.quantity});
  const operation=await shippingOperations.create({id,order_id:orderId,fulfillment_id:fulfillment.id,reference_id:"SHIP-"+id,environment,request:{...payload,reference_id:"SHIP-"+id},state:"creating",progress:-1,updated_at:new Date().toISOString()});
  await db.auditLogs.log({actor_id:actor,actor_name:actor,role:"FULFILLMENT_OPERATOR",action:"DISPATCH_PREPARED",entity_type:"shipping_operation",entity_id:id,after_state:{orderId}});
  return {success:true,may_create:true,operation};
 });
}
export async function applyShipment(operation:ShippingOperation,evidence:any){
 if(!isDemoMode())return rpc("apply_shipping_evidence",{p_operation_id:operation.id,p_evidence:evidence});
 return demoTransaction(async()=>{
  const fresh=(await shippingOperations.findById(operation.id))!,order=(await db.orders.findById(fresh.order_id))!;
  if(evidence.reference_id!==fresh.reference_id || !evidence.provider_id || (fresh.provider_id&&evidence.provider_id!==fresh.provider_id))throw new ShippingError("Shipment identity mismatch.",409);
  const ranks:Record<string,number>={confirmed:0,scheduled:0,allocated:1,picking_up:2,picked:3,in_transit:4,dropping_off:5,delivered:6,cancelled:7,rejected:7,failed:7,returned:7};
  const rank=ranks[evidence.status];if(rank===undefined)throw new ShippingError("Unsupported shipment status.",409);
  const key=createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
  if(await events.findOne({operation_id:fresh.id,event_key:key}))return finalizeDemoShipment(fresh,order,evidence,true);
  await events.create({operation_id:fresh.id,event_key:key,evidence,created_at:new Date().toISOString()});
  if(evidence.carrier_cost!=null && !await costs.findOne({operation_id:fresh.id,carrier_cost:evidence.carrier_cost}))await costs.create({operation_id:fresh.id,carrier_cost:evidence.carrier_cost,created_at:new Date().toISOString()});
  if(fresh.progress>=6 || rank<fresh.progress)return finalizeDemoShipment(fresh,order,evidence);
  if(!order.paid_at || ["cancelled","refunded","partially_refunded","collected","finished"].includes(order.status)){const updated=await shippingOperations.update(fresh.id,{state:"review",provider_id:evidence.provider_id,evidence});return {success:true,review:true,operation:updated,order};}
  const updated=await shippingOperations.update(fresh.id,{state:rank===7?"review":"booked",provider_id:evidence.provider_id,evidence,progress:rank,shipment_status:evidence.status,updated_at:new Date().toISOString()});
  await db.fulfillments.update(fresh.fulfillment_id,{waybill_id:evidence.waybill_id||null,tracking_url:evidence.tracking_url||null,status:rank===6?"delivered":rank===7?"failed":rank>=3?"shipped":"processing",...(rank===6?{delivered_at:new Date().toISOString()}:{}),...(rank>=3&&rank<=6?{shipped_at:new Date().toISOString()}:{})});
  const courier:any={...order.courier_info,provider:"biteship",biteship_order_id:evidence.provider_id,status:evidence.status,dispatched_at:order.courier_info?.dispatched_at||new Date().toISOString()};
  for(const key of ["waybill_id","tracking_id","tracking_url","driver_name","driver_phone","vehicle_plate"])if(evidence[key]!=null)courier[key]=evidence[key];
  const changed=await db.orders.updateStage(order.id,rank===6?"delivery_arrived":rank===7?"courier_failed":rank>=3?"on_delivery":"finding_courier",courier);
  return finalizeDemoShipment(updated!,changed!,evidence);
 });
}
export async function reconcileShipment(operation:ShippingOperation,providerId?:string){
 if(!isDemoMode()&&operation.environment!==shippingConfig().mode)throw new ShippingError("Shipping environment mismatch.",409);
 const id=operation.provider_id||providerId;
 if(!id)throw new ShippingError("Dispatch outcome is unknown. Find its provider order ID before retrying; no second booking was sent.",409);
 if(isDemoMode()){if(!operation.evidence)throw new ShippingError("Demo operation has no provider evidence.",409);return applyShipment(operation,operation.evidence);}
 return applyShipment(operation,await retrieveShipment(id,operation.reference_id));
}
export async function dispatchOrder(orderId:string,options:any,actor:string){
 const prepared=await prepareDispatch(orderId,options,actor);if(!prepared.success)throw new ShippingError(prepared.error||"Dispatch is not eligible.",409);
 const operation=prepared.operation as ShippingOperation;
 if(!prepared.may_create)return reconcileShipment(operation,options.biteshipOrderId);
 return bookPreparedShipment(operation);
}
export async function bookPreparedShipment(operation:ShippingOperation){
 if(isDemoMode())return applyShipment(operation,shipmentEvidence({success:true,id:"demo-"+operation.id,reference_id:operation.reference_id,status:"allocated",courier:{waybill_id:"DEMO-"+operation.id,tracking_id:"DEMO-TRACK-"+operation.id,insurance:{amount:operation.request.courier_insurance??0,fee:operation.request._quote?.insuranceFee??0}},price:operation.request._quote?.price??0},operation.reference_id));
 const providerRequest=Object.fromEntries(Object.entries(operation.request).filter(([key])=>!key.startsWith("_")));
 const evidence=shipmentEvidence(await shippingRequest("/orders",providerRequest),operation.reference_id);
 return applyShipment(operation,evidence);
}
async function finalizeDemoShipment(operation:ShippingOperation,order:Order,evidence:any,replayed=false){
 let fresh=operation;
 const fulfillment=(await db.fulfillments.findById(operation.fulfillment_id))!,expected=operation.request.courier_insurance;
 if(expected!=null){
  const confirmed=evidence.insured_value??fulfillment.package_snapshot?.insurance_confirmed??null;
  await db.fulfillments.update(fulfillment.id,{package_snapshot:{...fulfillment.package_snapshot,insurance_requested:expected,insurance_confirmed:confirmed,insurance_fee:evidence.insurance_fee??fulfillment.package_snapshot?.insurance_fee??null,insurance_status:expected===confirmed?"confirmed":"review"}});
  if(expected>0 && expected!==confirmed)fresh=(await shippingOperations.update(operation.id,{state:"review"}))!;
  else if(operation.state==="review" && order.paid_at && !["failed","rejected","cancelled","returned"].includes(operation.shipment_status||"") && !["cancelled","refunded","partially_refunded","finished","collected"].includes(order.status))fresh=(await shippingOperations.update(operation.id,{state:"booked"}))!;
 }
 if(order.paid_at && !["cancelled","refunded","partially_refunded","finished","collected"].includes(order.status)){
  const shipments=await db.fulfillments.findMany({order_id:order.id}),rows=await allocations.findMany(),lines=(await db.orders.getOrderWithItems(order.id)).items.filter(line=>line.product_id);
  const covered=(statuses:string[])=>lines.length>0&&lines.every(line=>rows.filter(row=>row.order_item_id===line.id&&shipments.some(f=>f.id===row.fulfillment_id&&statuses.includes(f.status))).reduce((n,row)=>n+row.quantity,0)>=line.quantity);
  const status=covered(["delivered"])?"delivery_arrived":shipments.some(f=>["failed","cancelled"].includes(f.status))?"courier_failed":shipments.some(f=>["shipped","in_transit","delivered"].includes(f.status))?(covered(["shipped","in_transit","delivered"])?"on_delivery":"partially_fulfilled"):"finding_courier";
  order=(await db.orders.update(order.id,{status}))!;
 }
 return {success:true,replayed,operation:fresh,order};
}

export async function reconcileShipping(limit=50){
 const client=getServerSupabase();if(!client)return [];
 shippingConfig();const {data,error}=await client.from("shipping_operations").select("*").in("state",["creating","booked","review"]).order("updated_at",{ascending:true}).limit(limit);if(error)throw new DatabaseError("reconcileShipping","shipping_operations",error.code);
 const results=[];for(const operation of data||[]){try{const r=await reconcileShipment(operation);results.push({id:operation.id,success:true,state:r.operation?.state});}catch{results.push({id:operation.id,success:false});}const touched=await client.from("shipping_operations").update({updated_at:new Date().toISOString()}).eq("id",operation.id);if(touched.error)throw new DatabaseError("shippingCheckpoint","shipping_operations",touched.error.code);}return results;
}
