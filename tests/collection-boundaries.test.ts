import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { readOrderPage, readCustomerPage, readAdminProductPage } from "@/lib/db/collectionQueries";
import { GET as catalogGET } from "@/app/api/products/route";
import { GET as ordersGET } from "@/app/api/admin/orders/route";
import { GET as accountGET } from "@/app/api/account/orders/route";
import { fixtureCookie } from "./support/session";

beforeEach(() => { process.env.APP_ENV = "demo"; });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("bounded collection HTTP and transport contract", () => {
  it.each(["limit=101", "limit=0", "page=-1", "page=1.5", "page=10001", "minPrice=garbage", "maxPrice=-1", "sort=unexpected"])("rejects invalid catalog parameters: %s", async query => {
    expect((await catalogGET(new NextRequest(`http://localhost:3000/api/products?${query}`))).status).toBe(400);
  });
  it("returns correct page metadata in demo mode without any connected request", async () => {
    const first = await (await catalogGET(new NextRequest("http://localhost:3000/api/products?limit=3&page=1&sort=price-asc"))).json();
    const second = await (await catalogGET(new NextRequest("http://localhost:3000/api/products?limit=3&page=2&sort=price-asc"))).json();
    expect(first.products).toHaveLength(3); expect(second.products).toHaveLength(3);
    expect(first.pagination.total).toBe(second.pagination.total);
    expect(new Set([...first.products,...second.products].map(p => p.id)).size).toBe(6);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps admin permissions and verified account ownership ahead of paging", async () => {
    expect((await ordersGET(new NextRequest("http://localhost:3000/api/admin/orders?limit=1"))).status).toBe(401);
    const result = await accountGET(new NextRequest("http://localhost:3000/api/account/orders?customerId=cust-002&email=budi.builder@techcorp.id&limit=1", { headers: { cookie: fixtureCookie("alex.gamer@example.com") } }));
    expect(result.status).toBe(200);
    const data = await result.json();
    expect(data.orders.every((o: any) => o.customer_id !== "cust-002")).toBe(true);
    expect(data.pagination.limit).toBe(1);
  });
  it("uses one RPC per connected page and never fetches a whole table or enriches per item", async () => {
    vi.stubEnv("APP_ENV", "staging"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://paging-fixture.example.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-paging-key-not-a-real-secret");
    const responses: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: any, init?: RequestInit) => {
      expect(String(input)).toContain("/rpc/read_collection_page");
      responses.push(JSON.parse(String(init!.body)));
      return new Response(JSON.stringify({ rows: [], pagination: { page: 2, limit: 10, total: 30, totalPages: 3 },
        facets: { brands: [], categories: [], priceRange: {min:0,max:0}, inStockCount:0,totalMatching:30 } }), { headers: { "Content-Type": "application/json" } });
    }));
    const scan = vi.spyOn(db.products, "findMany"); const enrichment = vi.spyOn(db.orders, "getOrderWithItems");
    await db.products.getFacetedCatalog({ search: "late match", page: 2, limit: 10 });
    await readOrderPage({ search: "owned" }, 2, 10, "verified-owner");
    await readAdminProductPage({}, 2, 10); await readCustomerPage({}, 2, 10);
    expect(fetch).toHaveBeenCalledTimes(4); expect(scan).not.toHaveBeenCalled(); expect(enrichment).not.toHaveBeenCalled();
    expect(responses.map(r => r.p_kind)).toEqual(["catalog","orders","products","customers"]);
    expect(responses[1]).toMatchObject({ p_owner: "verified-owner", p_page: 2, p_limit: 10 });
  });
  it("returns a safe failure when the connected RPC is unavailable, with no dummy fallback", async () => {
    vi.stubEnv("APP_ENV", "staging"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://paging-fixture.example.test"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-paging-key-not-a-real-secret");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "42883", message: "private SQL detail" }), { status: 404, headers: { "Content-Type": "application/json" } })));
    const response = await catalogGET(new NextRequest("http://localhost:3000/api/products"));
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private SQL detail");
  });
});
