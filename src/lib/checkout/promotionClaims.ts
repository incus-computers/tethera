import "server-only";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
import { db } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/client";
import { DatabaseError } from "@/lib/db/errors";
import type { Promotion } from "@/lib/db/types";
import { CheckoutError } from "./errors";
export interface PromotionClaim {id:string;order_id:string;promotion_id:string;owner_id:string;discount:number;state:"reserved"|"consumed"|"released"}
export const promotionClaims=new BaseRepository<PromotionClaim>("promotion_claims");
export async function promotionCustomerUsage(promotion:Promotion,owner:string,excludeOrder?:string){
 const client=getServerSupabase();if(client){const {data,error}=await client.rpc("promotion_customer_usage",{p_promotion_id:promotion.id,p_owner_id:owner,p_exclude_order:excludeOrder??null});if(error)throw new DatabaseError("promotionCustomerUsage","promotion_claims",error.code);return Number(data);}
 const claims=await promotionClaims.findMany({promotion_id:promotion.id,owner_id:owner});
 const legacy=(await db.orders.findMany({customer_id:owner,promo_code:promotion.code})).filter(order=>order.id!==excludeOrder&&!claims.some(claim=>claim.order_id===order.id));
 return claims.filter(claim=>claim.order_id!==excludeOrder&&claim.state!=="released").length+legacy.length;
}
/** Runs inside the existing demo checkout transaction. */
export async function reservePromotion(promotion:Promotion,orderId:string,owner:string,discount:number){
 if(promotion.max_uses_per_user!=null){if(owner.startsWith("guest:"))throw new CheckoutError("Sign in to use this customer-limited promotion.",409);if(await promotionCustomerUsage(promotion,owner,orderId)>=promotion.max_uses_per_user)throw new CheckoutError("Promotion usage limit reached.",409);}
 await db.promotions.update(promotion.id,{usage_count:Number(promotion.usage_count||0)+1});
 await promotionClaims.create({id:orderId,order_id:orderId,promotion_id:promotion.id,owner_id:owner,discount,state:"reserved"});
}
/** Runs inside the existing demo inventory transaction; completed refunds keep consumed claims. */
export async function transitionPromotionClaim(orderId:string,settled:boolean){
 const claim=await promotionClaims.findOne({order_id:orderId});if(!claim||claim.state!=="reserved")return;
 const promotion=await db.promotions.findById(claim.promotion_id);if(!promotion||promotion.usage_count<1)throw new DatabaseError("promotionClaimDrift","promotions");
 await db.promotions.update(promotion.id,settled?{total_discount_given:Number(promotion.total_discount_given||0)+claim.discount}:{usage_count:promotion.usage_count-1});
 await promotionClaims.update(claim.id,{state:settled?"consumed":"released"});
}
