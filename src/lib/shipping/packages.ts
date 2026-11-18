import "server-only";
import type { Product, ProductVariantRow } from "@/lib/db/types";
import type { ShippableItem } from "./types";
import { ShippingError } from "./gateway";
import { isDemoMode } from "@/lib/runtime/environment";

export interface PackageProfile {weight_grams:number; dimensions_cm:{length:number;width:number;height:number}; handling:"standard"|"fragile"}
export function packageProfile(value:any):PackageProfile {
  if(!value || !Number.isSafeInteger(value.weight_grams) || value.weight_grams<1 || value.weight_grams>100000 ||
    !value.dimensions_cm || [value.dimensions_cm.length,value.dimensions_cm.width,value.dimensions_cm.height].some(n=>!Number.isSafeInteger(n)||n<1||n>300) ||
    !["standard","fragile"].includes(value.handling))throw new ShippingError("Enter packed weight, all three dimensions, and handling requirements.",409);
  return {weight_grams:value.weight_grams,dimensions_cm:{length:value.dimensions_cm.length,width:value.dimensions_cm.width,height:value.dimensions_cm.height},handling:value.handling};
}
export function catalogParcel(product:Product,variant:ProductVariantRow|null,value:number,quantity:number,assembled=false):ShippableItem {
  let metadata=assembled?product.specs?.assembled_shipping:variant?.shipping;
  if(!assembled && !metadata && (!variant || product.specs?.shipping?.variants_share_package===true))metadata=product.specs?.shipping;
  if(!metadata && isDemoMode())metadata={weight_grams:assembled?15000:variant?.weight_grams||1500,dimensions_cm:assembled?{length:60,width:40,height:60}:{length:30,width:25,height:15},handling:assembled?"fragile":"standard"};
  if(assembled && variant && metadata?.variants_share_package!==true && !isDemoMode())throw new ShippingError("Approve assembled packing for the selected case variant before delivery.",409);
  const profile=packageProfile(metadata);
  if(assembled && profile.handling!=="fragile")throw new ShippingError("Assembled PCs require a fragile packing profile.",409);
  return {id:variant?.id||product.id,name:product.name,price:value,quantity,weightGrams:profile.weight_grams,dimensionsCm:profile.dimensions_cm,handling:profile.handling};
}
export function declaredValue(items:ShippableItem[]){
  const value=items.reduce((sum,item)=>sum+item.price*(item.quantity??1),0);
  if(!Number.isSafeInteger(value)||value<0||value>9999999999)throw new ShippingError("Declared goods value is invalid.",409);
  return value;
}
