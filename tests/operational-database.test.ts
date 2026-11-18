import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { bootstrapPostgres } from "./support/postgres";
import fs from "node:fs";
import ts from "typescript";
let pg: Awaited<ReturnType<typeof bootstrapPostgres>>;
const uid="11111111-1111-4111-8111-111111111111";
beforeAll(async()=>{
  pg=await bootstrapPostgres({legacyBroadGrants:true});
  await pg.query("insert into auth.users(id) values($1)",[uid]);
  await pg.query("insert into public.customer_profiles(id,user_id,email,full_name,phone,address_line1,subdistrict,city,province,postal_code) values('privacy-owner',$1,'fixture@example.test','Fixture','','','','','','')",[uid]);
  await pg.exec("insert into public.products(id,sku,name,slug,brand,retail_price) values('restore-product','RESTORE-FIXTURE','Restore fixture','restore-fixture','Fixture',1000)");
  await pg.query("select public.create_order_with_items($1::jsonb,$2::jsonb)",[JSON.stringify({id:"recovery-order",order_number:"RECOVERY-FIXTURE",customer_id:"privacy-owner",customer_name:"Fixture",customer_email:"fixture@example.test",customer_phone:"+628123456789",fulfillment_type:"delivery",subtotal:1000,shipping_fee:100,assembly_fee:0,discount_amount:0,total:1100,tax_amount:0,dpp_amount:1000,tax_rate:0}),JSON.stringify([{product_id:"restore-product",quantity:1,unit_price:1000,product_title_snapshot:"Restore fixture",sku_snapshot:"RESTORE-FIXTURE"}])]);
},30000);
afterAll(async()=>{await pg?.close();});
describe("service-only shared budgets and privacy state",()=>{
  it("matches self-service export projections to real migrated columns",async()=>{
    const source=ts.createSourceFile("privacy.ts",fs.readFileSync("src/lib/operations/privacy.ts","utf8"),ts.ScriptTarget.Latest,true);
    const projections:{table:string;columns:string[]}[]=[];
    function visit(node:ts.Node){
      if(ts.isCallExpression(node)&&node.expression.getText(source)==="exportRows"&&ts.isStringLiteral(node.arguments[0])&&ts.isArrayLiteralExpression(node.arguments[2]))projections.push({table:node.arguments[0].text,columns:node.arguments[2].elements.map(e=>(e as ts.StringLiteral).text)});
      ts.forEachChild(node,visit);
    }
    visit(source);expect(projections.length).toBeGreaterThan(4);
    for(const {table,columns} of projections)await pg.query(`select ${columns.map(c=>'"'+c+'"').join(',')} from public."${table}" limit 0`);
  });
  it("serializes caller and global budgets without granting direct browser writes",async()=>{
    const consume=(key:string)=>pg.query<{allowed:boolean}>("select public.consume_api_budget($1,'invoice',4,6) allowed",[key.repeat(64)]);
    const a=await Promise.all(Array.from({length:8},()=>consume("a")));expect(a.filter(r=>r.rows[0].allowed)).toHaveLength(4);
    // Denied attempts consume the global budget too; changing network identity cannot reset it.
    expect((await consume("b")).rows[0].allowed).toBe(false);
    const valid=await pg.query<{allowed:boolean}>("select public.consume_api_budget($1,'shipping',1,20) allowed",["c".repeat(64)]);expect(valid.rows[0].allowed).toBe(true);
    expect((await pg.query<{allowed:boolean}>("select public.consume_api_budget($1,'shipping',1,20) allowed",["c".repeat(64)])).rows[0].allowed).toBe(false);
    expect((await pg.query("select key from public.api_rate_budgets where key like '%fixture@example.test%' ")).rows).toHaveLength(0);
    for(const role of ["anon","authenticated"]){
      await expect(pg.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select public.consume_api_budget($1,'invoice',4,6)",["d".repeat(64)]);})).rejects.toMatchObject({code:"42501"});
      await expect(pg.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.exec("select * from public.privacy_requests");})).rejects.toMatchObject({code:"42501"});
      await expect(pg.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.exec("select public.submit_privacy_request('privacy-owner','erasure','forged')");})).rejects.toMatchObject({code:"42501"});
    }
  });
  it("commits deduplicated requests and append-only evidence atomically",async()=>{
    const submit=()=>pg.query<{r:any}>("select public.submit_privacy_request('privacy-owner','erasure','Review retention') r");
    const result=await Promise.all([submit(),submit()]);expect(result[0].rows[0].r.id).toBe(result[1].rows[0].r.id);
    const id=result[0].rows[0].r.id;
    await expect(pg.query("select public.review_privacy_request($1,'completed','staff','Completed action','Case reference')",[id])).rejects.toMatchObject({code:"P0001"});
    await pg.query("select public.review_privacy_request($1,'in_review','staff','Review started','Case reference')",[id]);
    await pg.query("select public.review_privacy_request($1,'declined','staff','Required records retained with reason','Hold reference')",[id]);
    expect((await pg.query<{n:number}>("select count(*)::int n from public.privacy_request_events where request_id=$1",[id])).rows[0].n).toBe(3);
    for(const sql of ["delete from public.privacy_request_events","update public.privacy_requests set status='completed'","update public.api_rate_budgets set attempts=0"])
      await expect(pg.transaction(async tx=>{await tx.exec("set local role service_role");await tx.exec(sql);})).rejects.toMatchObject({code:"42501"});
    expect((await pg.query<{r:any}>("select public.application_security_audit() r")).rows[0].r).toEqual({ok:true,violations:[]});
  });
  it("cleans only expired operational state and retains privacy/financial evidence",async()=>{
    await pg.exec("insert into public.api_rate_budgets(key,attempts,expires_at) values('expired',1,now()-interval '1 hour'),('active',1,now()+interval '1 hour')");
    await pg.query("insert into public.auth_sessions(token_hash,user_id,kind,expires_at) values('expired-fixture',$1,'customer',now()-interval '1 hour'),('active-fixture',$1,'customer',now()+interval '1 hour')",[uid]);
    const before=(await pg.query<{n:number}>("select count(*)::int n from public.privacy_request_events")).rows[0].n;
    await pg.exec("select public.run_operational_hygiene()");
    expect((await pg.query("select * from public.api_rate_budgets where key='expired'")).rows).toHaveLength(0);
    expect((await pg.query("select * from public.api_rate_budgets where key='active'")).rows).toHaveLength(1);
    expect((await pg.query("select * from public.auth_sessions where token_hash='expired-fixture'")).rows).toHaveLength(0);
    expect((await pg.query<{n:number}>("select count(*)::int n from public.privacy_request_events")).rows[0].n).toBe(before);
  });
  it("restores a disposable local database snapshot with records and role boundaries intact",async()=>{
    const dump=await pg.dumpDataDir();
    const restored=new PGlite({loadDataDir:dump,extensions:{pg_trgm,"uuid-ossp":uuid_ossp}});
    try {
      expect((await restored.query<{ready:boolean}>("select public.application_schema_health() ready")).rows[0].ready).toBe(true);
      expect((await restored.query("select id from public.customer_profiles where id='privacy-owner'")).rows).toHaveLength(1);
      expect((await restored.query("select * from public.privacy_request_events")).rows.length).toBeGreaterThan(0);
      expect(Number((await restored.query<{total:string}>("select total from public.orders where id='recovery-order'")).rows[0].total)).toBe(1100);
      expect((await restored.query("select id from public.order_items where order_id='recovery-order'")).rows).toHaveLength(1);
      await expect(restored.transaction(async tx=>{await tx.exec("set local role anon");await tx.exec("select * from public.privacy_requests");})).rejects.toMatchObject({code:"42501"});
    } finally {await restored.close();}
  },30000);
});
