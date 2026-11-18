import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootstrapPostgres } from "./support/postgres";
let pg: Awaited<ReturnType<typeof bootstrapPostgres>>;
async function read(kind: string, filters: object = {}, page = 1, limit = 50, owner: string | null = null) {
  return (await pg.query<{ r: any }>("select public.read_collection_page($1,$2::jsonb,$3,$4,$5) r", [kind, JSON.stringify(filters), page, limit, owner])).rows[0].r;
}
beforeAll(async () => {
  pg = await bootstrapPostgres();
  await pg.exec(`
   insert into public.products(id,sku,name,slug,brand,retail_price,cost_price,category_slug,pc_builder_slot,is_active,created_at)
   select 'page-'||lpad(n::text,4,'0'),'PAGE-'||n,case when n=1050 then 'Rare needle beyond cutoff' else 'Paging product '||n end,'page-'||n,'Common',1000,700,'processors','cpu',true,'2026-01-01'::timestamptz from generate_series(1,1050) n;
   insert into public.products(id,sku,name,slug,brand,retail_price,category_slug,is_active) values('hidden','HIDDEN','Rare needle hidden','hidden','Common',1000,'processors',false),('percent','PERCENT','Item%literal','percent','Literal',1000,'memory',true);
   insert into public.store_inventory(id,store_id,product_id,stock_on_hand,stock_reserved)
   select 'stock-'||id,'00000000-0000-0000-0000-000000000001',id,2,0 from public.products where id not in ('page-0003','page-0002');
   insert into public.product_variants(id,product_id,sku,name,attribute_type,attribute_value,price,stock_quantity,reserved_quantity,is_active) values
    ('sold-out','page-0001','SOLD-OUT','Sold out','color','Black',1000,4,4,true),('available','page-0002','AVAILABLE','Available','color','White',1000,10,3,true);
   insert into public.customer_profiles(id,email,full_name,phone,address_line1,subdistrict,city,province,postal_code)
   values('owner-a','alice@example.test','Alice','081234567890','','','','',''),('owner-b','bob@example.test','Bob','081234567891','','','','','');
   insert into public.orders(id,order_number,customer_id,customer_name,customer_email,customer_phone,fulfillment_type,subtotal,total,status,notes,pickup_code,created_at)
   select 'order-'||lpad(n::text,4,'0'),'PAGE-ORDER-'||n,'owner-a','Alice','alice@example.test','081234567890','click_and_collect',1000,1000,case when n=1050 then 'collected' else 'pending_payment' end,'private note','PRIVATE-CODE','2026-01-01'::timestamptz from generate_series(1,1050) n;
   insert into public.orders(id,order_number,customer_id,customer_name,customer_email,customer_phone,fulfillment_type,subtotal,total,status) values('foreign','FOREIGN','owner-b','Bob','bob@example.test','081234567891','click_and_collect',1000,1000,'pending_payment');
   insert into public.order_items(id,order_id,product_id,quantity,unit_price,unit_cost_snapshot)
   select 'item-'||lpad(n::text,4,'0'),'order-0001','page-0001',1,1000,700 from generate_series(1,1025) n;
  `);
}, 30000);
afterAll(async () => { await pg?.close(); });

describe("indexed collection pages beyond the default transport row cap", () => {
  it("searches and counts the entire active catalog before paging, including beyond 1000 rows", async () => {
    const result = await read("catalog", { search: "Rare needle" });
    expect(result.rows.map((r: any) => r.id)).toEqual(["page-1050"]);
    expect(result.pagination.total).toBe(1);
    const all = await read("catalog", { brands: ["Common"], categorySlug: "cpu" });
    expect(all.rows).toHaveLength(50); expect(all.pagination.total).toBe(1050);
    expect(all.facets.totalMatching).toBe(1050);
    expect(all.facets.brands).toEqual([{ name: "Common", count: 1050 }]);
  });
  it("uses unique stable tie ordering for equal prices and dates, including final/empty pages", async () => {
    for (const sort of ["price-asc", "price-desc", "newest", "featured"]) {
      const first = await read("catalog", { brands: ["Common"], sort }, 1, 100);
      const second = await read("catalog", { brands: ["Common"], sort }, 2, 100);
      expect(first.rows[0].id).toBe("page-0001"); expect(second.rows[0].id).toBe("page-0101");
      expect(new Set([...first.rows, ...second.rows].map((r: any) => r.id)).size).toBe(200);
    }
    expect((await read("catalog", { brands: ["Common"] }, 11, 100)).rows).toHaveLength(50);
    expect((await read("catalog", { brands: ["Common"] }, 12, 100)).rows).toEqual([]);
  });
  it("uses active variant availability and actual sellable warehouse stock without inventing stock", async () => {
    const result = await read("catalog", { inStockOnly: true, brands: ["Common"] });
    expect(result.pagination.total).toBe(1048);
    expect(result.rows.find((r: any) => r.id === "page-0001")).toBeUndefined();
    expect(result.rows.find((r: any) => r.id === "page-0002")).toMatchObject({ stockCount: 7, inStock: true });
    expect(result.rows.find((r: any) => r.id === "page-0003")).toBeUndefined();
    expect(result.facets.inStockCount).toBe(1048);
  });
  it("treats wildcard and SQL-shaped search input as literal bound values", async () => {
    expect((await read("catalog", { search: "%" })).rows.map((r: any) => r.id)).toEqual(["percent"]);
    expect((await read("catalog", { search: "%' OR true --" })).pagination.total).toBe(0);
    expect((await read("catalog", { search: "_" })).pagination.total).toBe(0);
  });
  it("filters customer ownership and status before paging and preserves customer redaction", async () => {
    const result = await read("orders", { search: "PAGE-ORDER-1050", scope: "past" }, 1, 50, "owner-a");
    expect(result.pagination.total).toBe(1); expect(result.rows[0].id).toBe("order-1050");
    expect(result.rows[0]).not.toHaveProperty("notes"); expect(result.rows[0].pickup_code).toBeNull();
    expect(result.stats).toEqual({ current: 1049, past: 1 });
    expect((await read("orders", { search: "FOREIGN" }, 1, 50, "owner-a")).rows).toEqual([]);
    expect((await read("orders", {}, 1, 100, "owner-b")).rows.map((r: any) => r.id)).toEqual(["foreign"]);
  });
  it("returns related items and safe product data together without a nested row-cap truncation", async () => {
    const result = await read("orders", { id: "order-0001" }, 1, 50, "owner-a");
    expect(result.rows[0].items).toHaveLength(1025);
    expect(result.rows[0].items[0].product).toMatchObject({ id: "page-0001", sku: "PAGE-1" });
    expect(result.rows[0].items[0]).not.toHaveProperty("unit_cost_snapshot");
    expect(result.rows[0].items[0].product).not.toHaveProperty("cost_price");
    const admin = await read("orders", { id: "order-0001" });
    expect(admin.rows[0].items[0].unit_cost_snapshot).toBe(700); expect(admin.rows[0].notes).toBe("private note");
  });
  it("does not expose a foreign custom build attached to an owned historical order", async () => {
    await pg.exec(`insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
     update public.customer_profiles set user_id='11111111-1111-4111-8111-111111111111' where id='owner-a';
     update public.customer_profiles set user_id='22222222-2222-4222-8222-222222222222' where id='owner-b';
     insert into public.custom_builds(id,share_slug,user_id,platform,configuration,total_price,estimated_wattage,recommended_psu_wattage)
     values('owned-build','owned-build','11111111-1111-4111-8111-111111111111','amd','{}',1000,100,500),('foreign-build','foreign-build','22222222-2222-4222-8222-222222222222','amd','{}',1000,100,500);
     insert into public.order_items(id,order_id,custom_build_id,is_custom_build,quantity,unit_price) values('build-a','order-0002','owned-build',true,1,1000),('build-b','order-0002','foreign-build',true,1,1000);`);
    const result=await read("orders",{id:"order-0002"},1,50,"owner-a");
    expect(result.rows[0].items[0].customBuild.id).toBe("owned-build"); expect(result.rows[0].items[1].customBuild).toBeNull();
  });
  it("paginates administrator products/customers and computes full customer aggregates", async () => {
    expect((await read("products", {}, 1, 25)).pagination.total).toBe(1052);
    expect((await read("products", { search: "Rare needle" })).pagination.total).toBe(2);
    const customer = await read("customers", { search: "bob@example.test" }, 1, 1);
    expect(customer.rows.map((r: any) => r.id)).toEqual(["owner-b"]);
    expect(customer.pagination.total).toBe(1); expect(customer.stats.totalLeads).toBe(2);
    const inventory = await read("inventory", {productId:"page-1050"});
    expect(inventory.rows).toHaveLength(1); expect(inventory.rows[0]).toMatchObject({product_id:"page-1050",stock_on_hand:2,is_low_stock:true});
    expect(inventory.stats.totalSkus).toBe(1050);
  });
  it("rejects unsafe page sizes, depths, sorts and filter lengths at the SQL boundary", async () => {
    for (const [page, limit] of [[0,50],[1,0],[1,101],[10001,50]]) await expect(read("catalog", {}, page, limit)).rejects.toMatchObject({ code: "22023" });
    await expect(read("catalog", { sort: "DROP TABLE products" })).rejects.toMatchObject({ code: "22023" });
    await expect(read("catalog", { search: "a".repeat(121) })).rejects.toMatchObject({ code: "22023" });
  });
  it("denies direct customer/anonymous RPC execution, including forged owner and staff collection requests", async () => {
    for (const role of ["anon", "authenticated"]) await expect(pg.transaction(async tx => {
      await tx.exec(`set local role ${role}`); await tx.query("select public.read_collection_page('orders','{}',1,50,'owner-b')");
    })).rejects.toMatchObject({ code: "42501" });
    await pg.transaction(async tx => { await tx.exec("set local role service_role"); expect((await tx.query<{r:any}>("select public.read_collection_page('orders','{}',1,50,'owner-b') r")).rows[0].r.rows[0].id).toBe("foreign"); });
  });
  it("offers a usable owner/order index and makes readiness false if required indexes disappear", async () => {
    await pg.exec("analyze public.orders;set enable_seqscan=off");
    try { expect(JSON.stringify((await pg.query("explain (format json) select id from public.orders where customer_id='owner-b' order by created_at desc,id limit 50")).rows)).toContain("orders_owner_page_idx"); }
    finally { await pg.exec("reset enable_seqscan"); }
    await pg.transaction(async tx => {
      await tx.exec("drop index public.orders_owner_page_idx");
      expect((await tx.query<{r:boolean}>("select public.application_schema_health() r")).rows[0].r).toBe(false);
      // Throw to roll back the deliberate drift fixture.
      throw new Error("rollback-index-fixture");
    }).catch(error => { expect(error.message).toBe("rollback-index-fixture"); });
  });
});
