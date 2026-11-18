import "server-only";
import {randomUUID} from "node:crypto";
import { enqueue } from "./store";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
export async function orderEffects(old:any,next:any){
 if(!old.paid_at&&next.paid_at){await enqueue("order_invoice",`order:${next.id}:paid:email`,{orderId:next.id});await enqueue("whatsapp_notice",`order:${next.id}:paid:whatsapp`,{orderId:next.id,status:"payment_received"});}
 else if(old.status!==next.status&&["cancelled","ready_for_pickup","collected","on_delivery","partially_fulfilled","delivery_arrived","courier_failed","refunded","partially_refunded"].includes(next.status)){
  await enqueue("order_notice",`order:${next.id}:status:${next.status}:email`,{orderId:next.id,status:next.status});
  await enqueue("whatsapp_notice",`order:${next.id}:status:${next.status}:whatsapp`,{orderId:next.id,status:next.status});
 }
}
export async function stockEffects(table:string,old:any,next:any){
 const available=(r:any)=>table==="store_inventory"?r.stock_on_hand-r.stock_reserved:r.stock_quantity-r.reserved_quantity;
 if(available(old)===available(next))return;
 const mappings=await new BaseRepository<any>("marketplace_product_mappings").findMany({product_id:next.product_id,variant_id:table==="store_inventory"?null:next.id});
 for(const m of mappings)await enqueue("marketplace_sync",`stock:${m.id}:${randomUUID()}`,{mappingId:m.id},`marketplace:${m.id}`);
}
