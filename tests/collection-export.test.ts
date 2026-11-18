import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as queries from "@/lib/db/collectionQueries";
import { GET } from "@/app/api/admin/products/bulk/export/route";
import { fixtureCookie } from "./support/session";
const request=()=>new NextRequest("http://localhost:3000/api/admin/products/bulk/export",{headers:{cookie:fixtureCookie("CATALOG_MANAGER")}});
const row=(n:number)=>({id:`export-${n}`,sku:`EXPORT-${n}`,name:`Product ${n}`,brand:"Fixture",retail_price:1000,category_slug:"processors",is_active:true,stock_on_hand:3,specs:{}});
afterEach(()=>vi.restoreAllMocks());
describe("bounded complete CSV export",()=>{
 it("collects consecutive bounded pages and exports the record after the first page",async()=>{
  const spy=vi.spyOn(queries,"readAdminProductPage").mockResolvedValueOnce({rows:Array.from({length:100},(_,n)=>row(n)),pagination:{page:1,limit:100,total:101,totalPages:2}})
   .mockResolvedValueOnce({rows:[row(100)],pagination:{page:2,limit:100,total:101,totalPages:2}});
  const result=await GET(request());expect(result.status).toBe(200);expect(await result.text()).toContain("EXPORT-100");expect(spy).toHaveBeenCalledTimes(2);
 });
 it("fails clearly instead of producing a partial export when the limit or dataset changes",async()=>{
  const spy=vi.spyOn(queries,"readAdminProductPage").mockResolvedValueOnce({rows:[],pagination:{page:1,limit:100,total:5001,totalPages:51}});
  expect((await GET(request())).status).toBe(413);
  spy.mockResolvedValueOnce({rows:[row(1)],pagination:{page:1,limit:100,total:2,totalPages:2}})
   .mockResolvedValueOnce({rows:[row(2)],pagination:{page:2,limit:100,total:3,totalPages:2}});
  expect((await GET(request())).status).toBe(409);
 });
 it("bounds specification-column expansion before constructing CSV",async()=>{
  const product={...row(1),specs:Object.fromEntries(Array.from({length:101},(_,n)=>[`key-${n}`,"x"]))};
  vi.spyOn(queries,"readAdminProductPage").mockResolvedValueOnce({rows:[product],pagination:{page:1,limit:100,total:1,totalPages:1}});
  expect((await GET(request())).status).toBe(413);
 });
});
