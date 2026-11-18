import "server-only";
import { transitionPromotionClaim } from "@/lib/checkout/promotionClaims";
import { db, BaseRepository, InventoryReservationRow, ProductVariantRow, Order } from "@/lib/db";
import { DatabaseError } from "@/lib/db/errors";
import { getServerSupabase } from "@/lib/db/client";
import { demoTransaction } from "./demoTransaction";
export type Action="settle"|"cancel"|"expire"|"pending";
export type TransitionResult={success:boolean;changed?:boolean;status?:string;error?:string;order?:Order;reservedItems?:any[]};
function repositories(){return {holds:new BaseRepository<InventoryReservationRow>("inventory_reservations")};}
export async function transitionInventory(id:string,action:Action,reference="",reason="",amount?:number):Promise<TransitionResult> {
  const client=getServerSupabase();
  if(client){
    try {
      const {data,error}=await client.rpc("transition_order_inventory",{p_order_id:id,p_action:action,p_reference:reference,p_reason:reason,p_amount:amount??null});
      if(error)throw new DatabaseError("transitionInventory","orders",error.code);
      if(typeof data?.success!=="boolean")throw new DatabaseError("transitionInventory","orders");
      return data;
    }catch(error){if(error instanceof DatabaseError)throw error;throw new DatabaseError("transitionInventory","orders");}
  }
  const {holds}=repositories();
  return demoTransaction(async()=>{
    const order=await db.orders.findById(id);if(!order)return {success:false,error:"Order not found."};
    const result=(success:boolean,changed=false,error?:string):TransitionResult=>({success,changed,error,status:order.status,order});
    if(action==="pending")return result(true);
    if(order.paid_at){
      if(action==="settle" && reference===order.payment_reference)return result(true);
      return result(false,false,"Paid orders require reconciliation or the refund workflow; stock was not changed.");
    }
    if(order.status==="cancelled")return result(action!=="settle",false,action==="settle"?"Payment arrived after cancellation. Reconciliation required.":undefined);
    if(!["pending_payment","order_received"].includes(order.status))return result(false,false,"Order is not awaiting payment.");
    const all=await holds.findMany({order_id:id}),active=all.filter(h=>h.status==="reserved");
    const {items}=await db.orders.getOrderWithItems(id);
    const expected=new Map<string,number>(),actual=new Map<string,number>();
    for(const line of items)if(line.product_id){const key=JSON.stringify([line.product_id,line.variant_id||null]);expected.set(key,(expected.get(key)||0)+line.quantity);}
    for(const hold of active){const key=JSON.stringify([hold.product_id,hold.variant_id||null]);actual.set(key,(actual.get(key)||0)+hold.quantity);}
    if(!active.length || expected.size!==actual.size || Array.from(expected).some(([k,n])=>actual.get(k)!==n))return result(false,false,"Order-linked reservation coverage is missing. Reconcile historical inventory.");
    const expired=active.some(h=>new Date(h.expires_at).getTime()<=Date.now());
    if(action==="expire" && !expired)return result(true);
    if(action==="settle" && (!reference || reference.length>200 || (amount!==undefined && amount!==order.total)))return result(false,false,"Invalid payment reference or amount.");
    const settle=action==="settle" && !expired;
    const moved:any[]=[];
    for(const hold of active.sort((a,b)=>(a.product_id+":"+a.variant_id).localeCompare(b.product_id+":"+b.variant_id))){
      let previous:number,next:number;
      if(hold.variant_id){
        const variants=new BaseRepository<ProductVariantRow>("product_variants");
        const v=await variants.findById(hold.variant_id);
        if(!v || v.product_id!==hold.product_id || v.reserved_quantity<hold.quantity || (settle && v.stock_quantity<hold.quantity))throw new DatabaseError("reservationDrift","product_variants");
        previous=v.stock_quantity;next=previous-(settle?hold.quantity:0);
        await variants.update(v.id,{stock_quantity:next,reserved_quantity:v.reserved_quantity-hold.quantity});
      } else {
        const inv=await db.inventory.getByProductAndStore(hold.product_id,hold.store_id);
        if(!inv || inv.stock_reserved<hold.quantity || (settle && inv.stock_on_hand<hold.quantity))throw new DatabaseError("reservationDrift","store_inventory");
        previous=inv.stock_on_hand;next=previous-(settle?hold.quantity:0);
        await db.inventory.update(inv.id,{stock_on_hand:next,stock_reserved:inv.stock_reserved-hold.quantity});
      }
      if(settle)await db.inventoryLedger.recordAdjustment({productId:hold.product_id,variantId:hold.variant_id,storeId:hold.store_id,deltaQuantity:-hold.quantity,previousStock:previous,newStock:next,reasonCode:"SALE",referenceOrderId:id,actorId:"inventory_transition"});
      await holds.update(hold.id,{status:settle?"settled":"released",updated_at:new Date().toISOString()});moved.push({product_id:hold.product_id,variant_id:hold.variant_id,quantity:hold.quantity});
    }
    const status=settle?(items.some(i=>i.is_custom_build)?"assembly_in_progress":order.fulfillment_type==="click_and_collect"?"ready_for_pickup":"order_accepted"):"cancelled";
    await transitionPromotionClaim(id,settle);
    const updated=await db.orders.update(id,{status,updated_at:new Date().toISOString(),...(settle?{paid_at:new Date().toISOString(),payment_reference:reference,payment_method:"Midtrans"}:{notes:reason||"Reservation released or expired."})});
    if(!updated)throw new DatabaseError("transitionInventory","orders");
    return {success:!(action==="settle" && expired),changed:true,status,order:updated,reservedItems:settle?moved:[],...(action==="settle" && expired?{error:"Reservation expired; payment needs reconciliation."}:{})};
  });
}
export async function expireReservations(limit=100){
  if(!Number.isInteger(limit)||limit<1||limit>500)throw new Error("Invalid expiry batch size.");
  const client=getServerSupabase();
  if(client){const {data,error}=await client.rpc("expire_order_reservations",{p_limit:limit});if(error)throw new DatabaseError("expireReservations","inventory_reservations",error.code);return data;}
  const {holds}=repositories();const all=await holds.findMany({status:"reserved"});
  const ids=Array.from(new Set(all.filter(h=>new Date(h.expires_at).getTime()<=Date.now()).map(h=>h.order_id))).slice(0,limit);
  const results=[];for(const id of ids)results.push(await transitionInventory(id,"expire","","Reservation expired."));return results;
}
