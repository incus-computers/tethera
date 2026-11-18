import "server-only";
import { db,BaseRepository } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/client";
import { demoTransaction } from "@/lib/inventory/demoTransaction";
import { enqueue,jobRpc,jobs } from "./store";
export async function availableStock(productId:string,variantId:string|null){
 if(variantId){const v=await new BaseRepository<any>("product_variants").findById(variantId);return v?.product_id===productId&&v.is_active?Math.max(0,v.stock_quantity-v.reserved_quantity):0;}
 if((await new BaseRepository<any>("product_variants").findMany({product_id:productId,is_active:true},{limit:1})).length)return 0;
 return Math.max(0,(await db.inventory.findMany({product_id:productId})).reduce((n,v)=>n+v.stock_on_hand-v.stock_reserved,0));
}
export async function enqueueStockAlerts(){
 if(getServerSupabase())return jobRpc("enqueue_stock_alerts",{p_limit:50});
 return demoTransaction(async()=>{let count=0;for(const n of await db.stockNotifications.findMany({notified_at:null,verified_contact:true},{limit:100,orderBy:"created_at"})){
  const row=n as any;if(!row.verified_contact||!row.email||await jobs.findOne({event_key:"stock-alert:"+n.id}))continue;
  if((await db.products.findById(n.product_id))?.is_active&&await availableStock(n.product_id,n.variant_id||null)>0){await enqueue("stock_alert","stock-alert:"+n.id,{notificationId:n.id});if(++count>=50)break;}
 }return count;});
}
