import { describe,it,expect } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publicCatalogProduct } from "@/lib/api/publicCatalog";
import { GET as product } from "@/app/api/products/[id]/route";
import { GET as catalog } from "@/app/api/products/route";
describe("service-role catalog projection",()=>{
 it("does not leak costs or new private columns through product or variant projections",()=>{
  const p:any={id:"fixture",name:"Fixture",sku:"Fixture",is_active:true,cost_price:700,barcode:"private-barcode",future_internal_field:"secret",specs:{socket:"AM5",variations:[{id:"v",cost_price:700,price:1000},{id:"disabled",isActive:false}]},variations:[{id:"v",cost_price:700,future_internal_field:"secret",price:1000},{id:"disabled",isActive:false}]};
  const result=JSON.stringify(publicCatalogProduct(p));expect(result).not.toContain("secret");expect(result).not.toContain("cost_price");expect(result).not.toContain("barcode");expect(result).not.toContain("disabled");expect(result).toContain("AM5");
 });
 it("enforces active visibility and safe fields in both HTTP endpoints despite privileged repository access",async()=>{
  const id=randomUUID();await db.products.create({id,sku:id,slug:id,name:id,brand:"Fixture",retail_price:1000,cost_price:700,is_active:true,specs:{}});
  try{
   const response=await product(new NextRequest("http://localhost/api/products/"+id),{params:Promise.resolve({id})});
   const data=await response.json();expect(data.success).toBe(true);expect(data.product.id).toBe(id);expect(data.product).not.toHaveProperty("cost_price");expect(data.product.stockCount).toBe(0);
   const collection=await catalog(new NextRequest("http://localhost/api/products?search="+id));const listed=await collection.json();expect(listed.products).toHaveLength(1);expect(listed.products[0]).not.toHaveProperty("cost_price");
   await db.products.update(id,{is_active:false});expect((await product(new NextRequest("http://localhost/api/products/"+id),{params:Promise.resolve({id})})).status).toBe(404);
   expect((await (await catalog(new NextRequest("http://localhost/api/products?search="+id))).json()).products).toEqual([]);
  }finally{await db.products.delete(id);}
 });
});
