import "server-only";
import { randomUUID,createHash } from "crypto";
import { db,BaseRepository,OrderItem } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/client";
import { DatabaseError } from "@/lib/db/errors";
import { demoTransaction } from "@/lib/inventory/demoTransaction";
import { isDemoMode } from "@/lib/runtime/environment";
import { biteship,TETHERA_WAREHOUSE_ORIGIN } from "./biteship";
import { packageProfile } from "./packages";
import { ShippingError,shippingConfig } from "./gateway";
import { shippingSnapshot,shippingOperations,ShippingOperation,reconcileShipment,bookPreparedShipment } from "./dispatch";

const allocations=new BaseRepository<any>("fulfillment_items");
export async function parcelRpc(name:string,args:Record<string,unknown>){
 const client=getServerSupabase();if(!client)throw new ShippingError("Persistent shipping storage required.");
 try{
  const {data,error}=await client.rpc(name,args);
  if(error){if(["PT409","PT404"].includes(error.code))throw new ShippingError(error.message,error.code==="PT404"?404:409);throw new DatabaseError(name,"shipping_operations",error.code);}
  if(data==null)throw new DatabaseError(name,"shipping_operations");return data;
 }catch(e){if(e instanceof ShippingError||e instanceof DatabaseError)throw e;throw new DatabaseError(name,"shipping_operations");}
}
function normalise(body:any){
 if(typeof body.orderId!=="string"||!body.orderId||body.orderId.length>150||typeof body.carrier!=="string"||!/^[a-z0-9_]{2,30}$/.test(body.carrier)||["grab","gojek"].includes(body.carrier)||typeof body.serviceCode!=="string"||!/^[a-zA-Z0-9_-]{1,60}$/.test(body.serviceCode))throw new ShippingError("Order and supported postal courier/service required.",400);
 if(!Array.isArray(body.items)||!body.items.length||body.items.length>100)throw new ShippingError("Select physical order items.",400);
 const seen=new Set<string>();
 const items=body.items.map((item:any)=>{if(typeof item?.orderItemId!=="string"||seen.has(item.orderItemId)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>100)throw new ShippingError("Use one positive quantity per order item.",400);seen.add(item.orderItemId);return {order_item_id:item.orderItemId,quantity:item.quantity};}).sort((a:any,b:any)=>a.order_item_id.localeCompare(b.order_item_id));
 const parcel=packageProfile(body.parcel);
 if(parcel.handling!=="fragile"||body.packingConfirmed!==true)throw new ShippingError("Confirm measured, secured fragile-electronics packing.",409);
 return {orderId:body.orderId,carrier:body.carrier,serviceCode:body.serviceCode,items,parcel,packingConfirmed:true,expectedCarrierCost:body.expectedCarrierCost??null};
}
async function context(input:ReturnType<typeof normalise>){
 const {order,items:lines}=await db.orders.getOrderWithItems(input.orderId);if(!order)throw new ShippingError("Order not found.",404);
 const address=order.shipping_address,info=order.courier_info as any,origin=info?.quote_origin||(isDemoMode()?TETHERA_WAREHOUSE_ORIGIN:null);
 if(!address?.street||!address.city||!/^\d{5}$/.test(address.postalCode)||!order.customer_name||!order.customer_phone||!origin?.address||!origin.contactName||!origin.contactPhone||!/^\d{5}$/.test(String(origin.postalCode)))throw new ShippingError("Complete saved origin and destination details are required.",409);
 const selected:(OrderItem&{selected_quantity:number})[]=input.items.map((allocation:any)=>{const line=lines.find(line=>line.id===allocation.order_item_id);if(!line?.product_id)throw new ShippingError("Parcel line does not belong to this order.",400);return {...line,selected_quantity:allocation.quantity};});
 for(const line of selected)if(line.checkout_metadata?.build && lines.some(sibling=>sibling.product_id&&sibling.checkout_metadata?.build===line.checkout_metadata!.build&&!input.items.some((i:any)=>i.order_item_id===sibling.id&&i.quantity===sibling.quantity)))throw new ShippingError("Assembled build components must travel together.",409);
 const value=selected.reduce((sum,line)=>sum+Number(line.unit_price)*line.selected_quantity,0);
 if(!Number.isSafeInteger(value)||value<0||value>9999999999)throw new ShippingError("Invalid declared goods value.",409);
 const p=input.parcel,item={id:"measured-parcel",name:selected.map(line=>line.product_title_snapshot||line.product_id).join(", ").slice(0,200),price:value,quantity:1,weightGrams:p.weight_grams,dimensionsCm:p.dimensions_cm,handling:p.handling};
 const request:any={_snapshot:shippingSnapshot(order),_packing:{confirmed:true,handling:"fragile"},_lines:selected.map(line=>({id:line.id,product_id:line.product_id,variant_id:line.variant_id??null,unit_price:Number(line.unit_price),checkout_metadata:line.checkout_metadata??null})),
  origin_contact_name:origin.contactName,origin_contact_phone:origin.contactPhone,origin_address:origin.address,origin_postal_code:Number(origin.postalCode),origin_collection_method:"pickup",
  destination_contact_name:order.customer_name,destination_contact_phone:order.customer_phone,destination_contact_email:order.customer_email,destination_address:[address.street,address.unit,address.subdistrict,address.city,address.province].filter(Boolean).join(", "),destination_postal_code:Number(address.postalCode),destination_note:address.deliveryNotes||"",
  courier_company:input.carrier,courier_type:input.serviceCode.startsWith(input.carrier+"-")?input.serviceCode.slice(input.carrier.length+1):input.serviceCode,courier_insurance:value,delivery_type:"now",
  items:[{name:item.name,category:"electronic",value,quantity:1,weight:p.weight_grams,...p.dimensions_cm}]};
 return {order,origin,item,request};
}
async function quote(input:ReturnType<typeof normalise>){
 const c=await context(input);
 const rates=await biteship.getRates({destination:{address:c.order.shipping_address!.street,postalCode:c.order.shipping_address!.postalCode},origin:c.origin,items:[c.item],insuranceValue:c.item.price,couriersFilter:[input.carrier],requireLive:true});
 const rate=rates.find(rate=>rate.isAvailable&&rate.courierId===input.carrier&&rate.serviceCode===input.serviceCode);
 if(!rate)throw new ShippingError("Selected insured pickup service is unavailable.",409);
 return {...c,rate};
}
export async function quoteParcel(body:any){const result=await quote(normalise(body));return {rate:result.rate,parcel:result.item,insuranceValue:result.item.price};}
export async function prepareParcel(body:any,key:string,actor:string){
 const input=normalise(body);
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key||""))throw new ShippingError("A UUID v4 Idempotency-Key is required.",400);
 key=key.toLowerCase();const hash=createHash("sha256").update(JSON.stringify(input)).digest("hex");
 const prior=await shippingOperations.findOne({request_key:key});
 if(prior){if(prior.order_id!==input.orderId||prior.fingerprint!==hash)throw new ShippingError("Parcel key conflicts with its existing request.",409);return {success:true,may_create:false,operation:prior};}
 const environment=isDemoMode()?"demo":shippingConfig().mode;
 if(!isDemoMode()&&process.env.BITESHIP_ORIGIN_CONFIRMED!=="true")throw new ShippingError("Warehouse origin must be confirmed before booking.");
 const c=await quote(input);
 if(!Number.isSafeInteger(input.expectedCarrierCost)||input.expectedCarrierCost!==c.rate.price)throw new ShippingError("Carrier price changed. Review the insured quote before booking.",409);
 const request={...c.request,_quote:{price:c.rate.price,insuranceFee:c.rate.insuranceFee??0,quoted_at:new Date().toISOString()}};
 if(!isDemoMode())return parcelRpc("prepare_parcel_dispatch",{p_order_id:input.orderId,p_key:key,p_fingerprint:hash,p_items:input.items,p_request:request,p_environment:environment,p_actor:actor});
 return demoTransaction(async()=>{
  const previous=await shippingOperations.findOne({request_key:key});if(previous){if(previous.fingerprint!==hash)throw new ShippingError("Parcel key conflicts with its existing request.",409);return {success:true,may_create:false,operation:previous};}
  const fresh=await db.orders.findById(input.orderId);
  if(!fresh?.paid_at||fresh.fulfillment_type!=="delivery"||!["ready_for_dispatch","finding_courier","partially_fulfilled","on_delivery","courier_failed","courier_rejected"].includes(fresh.status))throw new ShippingError("Paid delivery-ready order required.",409);
  if((await new BaseRepository<any>("payment_attempts").findMany({order_id:fresh.id,state:"review"})).length)throw new ShippingError("Payment requires reconciliation before shipping.",409);
  if(JSON.stringify(shippingSnapshot(fresh))!==JSON.stringify(request._snapshot))throw new ShippingError("Shipping details changed.",409);
  if((await new BaseRepository<any>("refund_operations").findMany({order_id:fresh.id})).length||(await new BaseRepository<any>("return_receipts").findMany({order_id:fresh.id})).length)throw new ShippingError("Refund/return requires fulfillment review.",409);
  const existing=await db.fulfillments.findMany({order_id:fresh.id}),operations=await shippingOperations.findMany({order_id:fresh.id});
  if(operations.some(op=>!op.request_key)||existing.some(f=>!operations.some(op=>op.fulfillment_id===f.id)))throw new ShippingError("Legacy shipment/allocation requires reconciliation.",409);
  const lines=(await db.orders.getOrderWithItems(fresh.id)).items,used=(await Promise.all(existing.map(f=>allocations.findMany({fulfillment_id:f.id})))).flat();
  for(const item of input.items){const line=lines.find(line=>line.id===item.order_item_id),snap=request._lines.find((l:any)=>l.id===item.order_item_id);if(!line?.product_id||!snap||Number(line.unit_price)!==snap.unit_price||JSON.stringify(line.checkout_metadata??null)!==JSON.stringify(snap.checkout_metadata))throw new ShippingError("Order line snapshot changed.",409);if(used.filter(row=>row.order_item_id===line.id).reduce((sum,row)=>sum+row.quantity,0)+item.quantity>line.quantity)throw new ShippingError("Parcel exceeds remaining ordered quantity.",409);}
  const sold=await new BaseRepository<any>("inventory_reservations").findMany({order_id:fresh.id,status:"settled"});
  for(const item of input.items){const line=lines.find(l=>l.id===item.order_item_id)!;const same=(l:any)=>l.product_id===line.product_id&&(l.variant_id??null)===(line.variant_id??null);const sameIds=new Set(lines.filter(same).map(l=>l.id));const committed=used.filter(row=>sameIds.has(row.order_item_id)).reduce((sum,row)=>sum+row.quantity,0),wanted=input.items.filter((i:any)=>sameIds.has(i.order_item_id)).reduce((sum:number,i:any)=>sum+i.quantity,0),settled=sold.filter(same).reduce((sum,row)=>sum+row.quantity,0);if(committed+wanted>settled)throw new ShippingError("Settled inventory coverage requires reconciliation.",409);}
  const id=randomUUID(),fulfillment=await db.fulfillments.create({id:randomUUID(),order_id:fresh.id,fulfillment_number:"FUL-"+id,carrier:input.carrier,service_code:request.courier_type,status:"processing",dispatched_by:actor,package_snapshot:{items:request.items,packing:request._packing,insurance_requested:request.courier_insurance}});
  for(const item of input.items)await allocations.create({fulfillment_id:fulfillment.id,...item});
  const operation=await shippingOperations.create({id,order_id:fresh.id,fulfillment_id:fulfillment.id,request_key:key,fingerprint:hash,reference_id:"SHIP-"+id,environment,request:{...request,reference_id:"SHIP-"+id},state:"creating",progress:-1,updated_at:new Date().toISOString()});
  await db.auditLogs.log({actor_id:actor,actor_name:actor,role:"FULFILLMENT_OPERATOR",action:"PARCEL_PREPARED",entity_type:"shipping_operation",entity_id:id,after_state:{items:input.items,insured_value:request.courier_insurance,quote:request._quote}});
  return {success:true,may_create:true,operation};
 });
}
export async function bookParcel(body:any,key:string,actor:string){const prepared=await prepareParcel(body,key,actor),operation=prepared.operation as ShippingOperation;return prepared.may_create?bookPreparedShipment(operation):reconcileShipment(operation,body.biteshipOrderId);}
