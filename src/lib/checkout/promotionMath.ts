import type { Promotion,PromotionValidationParams } from "@/lib/db/types";
import { idr } from "./financials";
export function promotionDiscount(promo:Promotion,params:PromotionValidationParams){
 const subtotal=idr(params.subtotal),shipping=idr(params.shippingFee??0),items=params.items||[];
 const restricted=Boolean(promo.eligible_product_ids?.length||promo.eligible_categories?.length);
 if(restricted&&!items.length)throw new Error("Eligible cart items are required for this promotion.");
 const amounts=items.map(item=>{const quantity=item.quantity??1;if(!Number.isInteger(quantity)||quantity<1||quantity>100)throw new Error("Invalid cart quantity.");return idr(idr(item.unit_price??item.price??0)*quantity);});
 const eligible=items.map(item=>!restricted||promo.eligible_product_ids?.includes(item.product_id||item.id||"")||promo.eligible_categories?.some(category=>category.toLowerCase()===(item.category_slug||item.category||"").toLowerCase()));
 let weights=amounts.map((amount,i)=>eligible[i]?amount:0),basis=items.length?weights.reduce((a,b)=>a+b,0):subtotal,discount=0;
 if(restricted&&!basis)throw new Error("No eligible products in cart for this promotion.");
 const percentage=(base:number,value:number)=>{const bps=value*100;if(!Number.isFinite(value)||value<0||value>100||Math.abs(bps-Math.round(bps))>1e-7)throw new Error("Invalid promotion percentage.");return Number((BigInt(base)*BigInt(Math.round(bps))+BigInt(5000))/BigInt(10000));};
 switch(promo.discount_type){
  case "percentage":discount=percentage(basis,promo.discount_value);break;
  case "fixed_amount":discount=Math.min(basis,idr(promo.discount_value));break;
  case "free_shipping":discount=promo.discount_value===0?shipping:Math.min(shipping,idr(promo.discount_value));weights=weights.map(()=>0);break;
  case "buy_x_get_y":{
   const rule=promo.buy_x_get_y;if(!rule||!Number.isInteger(rule.buy_quantity)||rule.buy_quantity<1)throw new Error("Invalid Buy X Get Y rule.");
   const matches=(item:typeof items[number],sku:string)=>item.sku===sku||item.product_id===sku||item.id===sku;
   const buyCount=items.reduce((sum,item,i)=>sum+(eligible[i]&&matches(item,rule.buy_sku)?item.quantity??1:0),0);
   let units=rule.buy_sku===rule.get_sku?Math.floor(buyCount/(rule.buy_quantity+1)):Math.floor(buyCount/rule.buy_quantity);
   weights=weights.map(()=>0);
   const candidates=items.map((item,i)=>({item,i,price:item.unit_price??item.price??0})).filter(({item,i})=>eligible[i]&&matches(item,rule.get_sku)).sort((a,b)=>a.price-b.price||a.i-b.i);
   for(const {item,i,price} of candidates){const count=Math.min(units,item.quantity??1);weights[i]=price*count;units-=count;}
   basis=weights.reduce((a,b)=>a+b,0);if(!basis)throw new Error("Bundle requirements for Buy X Get Y promotion not met.");
   discount=percentage(basis,rule.get_discount_percent);break;
  }
  default:throw new Error("Unsupported promotion type.");
 }
 if(promo.max_discount!=null)discount=Math.min(discount,idr(promo.max_discount));
 return {discountAmount:idr(discount),eligibleLineAmounts:weights};
}
