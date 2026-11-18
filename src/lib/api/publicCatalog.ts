import type { Product,ProductVariation } from "@/lib/db/types";
import { prebuiltModelName } from "@/lib/data/prebuiltNames";
/** Server repositories use service privileges; public HTTP responses need a separate projection. */
export function publicCatalogProduct(product:Product){
 const source=product as Product & {stockCount?:number;inStock?:boolean};
 const variations=(product.variations||product.specs?.variations||[]).filter((v:ProductVariation)=>v.isActive!==false).map((v:ProductVariation)=>({id:v.id,productId:v.productId,name:v.name,sku:v.sku,price:v.price,originalPrice:v.originalPrice,salePrice:v.salePrice,stockCount:v.stockCount,attributes:v.attributes,isActive:v.isActive,image:v.image}));
 return {id:source.id,sku:source.sku,name:source.pc_builder_slot?source.name:prebuiltModelName(source.name),slug:source.slug,brand:source.brand,description:source.description,
  category_id:source.category_id,category_slug:source.category_slug,retail_price:source.retail_price,sale_price:source.sale_price,
  images:source.images,specs:{...source.specs,...(source.specs?.variations?{variations}:{})},warranty_months:source.warranty_months,is_active:source.is_active,
  pc_builder_slot:source.pc_builder_slot,created_at:source.created_at,variations,stockCount:source.stockCount,inStock:source.inStock};
}
