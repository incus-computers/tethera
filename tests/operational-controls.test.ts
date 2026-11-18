import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { middleware } from "@/middleware";
import { abuseKey, abusePolicy, clientNetwork, consumeLocalLimit } from "@/lib/operations/abuse";
import { withApiProtection } from "@/lib/operations/apiProtection";
import { contentSecurityPolicy } from "@/lib/operations/securityHeaders";
import { operationalEvent, safeFailure } from "@/lib/operations/telemetry";
import { privacyRequests, privacyEvents, submitPrivacy, reviewPrivacy, accountDataExport } from "@/lib/operations/privacy";
import { GET as privacyGet, POST as privacyPost } from "@/app/api/account/privacy/route";
import { POST as adminPrivacyPost } from "@/app/api/admin/privacy/route";
import { GET as adminPrivacyGet } from "@/app/api/admin/privacy/route";
import { GET as operationsGet } from "@/app/api/admin/operations/route";
import { GET as monitorGet } from "@/app/api/internal/operations/route";
import { demoAuth } from "@/lib/auth/demo";
import { issueSession, tokenHash } from "@/lib/auth/session";
import { fixtureCookie } from "./support/session";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
import { operationsSnapshot } from "@/lib/operations/monitor";

beforeEach(() => { process.env.APP_ENV = "demo"; });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("distributed abuse boundary and browser headers", () => {
  it("keeps public image optimization available when connected API limits are unavailable",async()=>{
    vi.stubEnv("APP_ENV","staging");vi.stubEnv("ABUSE_HMAC_SECRET","");
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    const image=await middleware(new NextRequest("http://localhost/_next/image?url=%2Fincus-logo.png&w=256&q=75"));
    expect(image.status).toBe(200);expect(image.headers.get("x-middleware-next")).toBe("1");expect(fetcher).not.toHaveBeenCalled();
    expect((await middleware(new NextRequest("http://localhost/api/products"))).status).toBe(503);
    vi.stubEnv("ABUSE_HMAC_SECRET","s".repeat(40));vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://fixture.invalid");vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","fixture-key");
    fetcher.mockRejectedValue(new Error("database offline"));
    expect((await middleware(new NextRequest("http://localhost/_next/image?url=%2Fincus-logo.png&w=256&q=75"))).status).toBe(200);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await middleware(new NextRequest("http://localhost/api/products"))).status).toBe(503);
  });
  it("does not trust arbitrary forwarded addresses or cookie identities", async () => {
    expect(clientNetwork(new Headers({"x-forwarded-for":"1.2.3.4"}))).toBe("shared");
    expect(clientNetwork(new Headers({"cf-connecting-ip":"1.2.3.4"}), "cf-connecting-ip")).toBe("1.2.3.4");
    expect(clientNetwork(new Headers({"cf-connecting-ip":"1.2.3.4,5.6.7.8"}), "cf-connecting-ip")).toBe("shared");
    expect(clientNetwork(new Headers({"x-real-ip":"999.1.1.1"}), "x-real-ip")).toBe("shared");
    expect(clientNetwork(new Headers({"x-real-ip":"2001:0db8:0:0:0:0:0:1"}), "x-real-ip")).toBe(clientNetwork(new Headers({"x-real-ip":"2001:db8::1"}), "x-real-ip"));
    const key = await abuseKey("a-secret", "private@example.test:1.2.3.4");
    expect(key).toMatch(/^[a-f0-9]{64}$/); expect(await abuseKey("another-secret", "private@example.test:1.2.3.4")).not.toBe(key);
  });
  it("bounds dummy requests, resets expired buckets and distinguishes cost-sensitive routes", () => {
    const key = randomUUID(); expect(consumeLocalLimit(key, 2, 10)).toBe(true); expect(consumeLocalLimit(key, 2, 20)).toBe(true); expect(consumeLocalLimit(key, 2, 30)).toBe(false); expect(consumeLocalLimit(key, 2, 60000)).toBe(true);
    expect(abusePolicy("/api/orders/invoice/send", "POST").limit).toBe(5);
    expect(abusePolicy("/api/admin/upload", "POST").scope).toBe("bulk");
    expect(abusePolicy("/api/webhooks/midtrans", "POST").scope).toBe("webhooks");
    expect(abusePolicy("/api/auth/me", "GET").scope).toBe("read");
    expect(abusePolicy("/api/admin/auth", "POST").scope).toBe("auth");
  });
  it("uses the shared RPC with a pseudonym and fails closed on denial or failure", async () => {
    vi.stubEnv("APP_ENV", "staging"); vi.stubEnv("ABUSE_HMAC_SECRET", "h".repeat(40)); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.invalid"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-service-key");
    const fetcher = vi.fn(async (_input: unknown, _init?: RequestInit) => new Response("false", {status:200})); vi.stubGlobal("fetch", fetcher);
    const result = await middleware(new NextRequest("https://store.example/api/shipping/google/autocomplete?input=private-address", {headers:{"x-forwarded-for":"8.8.8.8",cookie:"tethera_guest_token=arbitrary"}}));
    expect(result.status).toBe(429); expect(result.headers.get("Retry-After")).toBe("60");
    const body = JSON.parse(String(fetcher.mock.calls[0][1]!.body)); expect(body.p_key).toMatch(/^[a-f0-9]{64}$/); expect(JSON.stringify(body)).not.toMatch(/private-address|8\.8\.8\.8|arbitrary/);
    fetcher.mockResolvedValueOnce(new Response("private upstream failure",{status:500}));
    expect((await middleware(new NextRequest("https://store.example/api/products"))).status).toBe(503);
    vi.stubEnv("ABUSE_HMAC_SECRET", ""); expect((await middleware(new NextRequest("https://store.example/api/products"))).status).toBe(503);
  });
  it("sets unique CSP nonces and refuses frames, objects and injected nonce headers", async () => {
    const a = await middleware(new NextRequest("https://store.example/privacy",{headers:{"x-nonce":"attacker"}}));
    const b = await middleware(new NextRequest("https://store.example/privacy"));
    expect(a.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(a.headers.get("Content-Security-Policy")).not.toContain("attacker");
    expect(a.headers.get("Content-Security-Policy")).not.toBe(b.headers.get("Content-Security-Policy"));
    expect(a.headers.get("X-Frame-Options")).toBe("DENY"); expect(a.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const production = contentSecurityPolicy("fixture",false); expect(production).not.toContain("unsafe-eval"); expect(production).toContain("object-src 'none'"); expect(production).toContain("'nonce-fixture'");
  });
  it("rejects a production demo process before touching connected counters",async()=>{
    vi.stubEnv("NODE_ENV","production");vi.stubEnv("ABUSE_HMAC_SECRET","s".repeat(40));
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    const response=await middleware(new NextRequest("https://store.example/api/products"));
    expect(response.status).toBe(503);expect(fetcher).not.toHaveBeenCalled();expect(response.headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
  });
});
describe("bounded request handling and safe operational diagnostics", () => {
  it("detects stale workers, overdue work and expired leases without exposing payloads", async () => {
    expect((await operationsSnapshot()).worker.stale).toBe(true);
    const runs=new BaseRepository<any>("worker_runs"),queue=new BaseRepository<any>("background_jobs");
    const now=new Date().toISOString(),run=await runs.create({started_at:now,finished_at:now,status:"completed"});
    const pending=await queue.create({status:"pending",available_at:new Date(Date.now()-700000).toISOString(),payload:{email:"PRIVATE-MONITOR@example.test"}});
    const lease=await queue.create({status:"running",lease_until:new Date(Date.now()-1000).toISOString(),payload:{email:"PRIVATE-MONITOR@example.test"}});
    try {
      const state=await operationsSnapshot();expect(state.worker.stale).toBe(false);expect(state.healthy).toBe(false);expect(state.queue).toMatchObject({overduePending:true,expiredLease:true});expect(JSON.stringify(state)).not.toContain("PRIVATE-MONITOR");
    } finally {await runs.delete(run.id);await queue.delete(pending.id);await queue.delete(lease.id);}
  });
  it("counts actual streamed bytes even with no or forged Content-Length", async () => {
    const handler = vi.fn(async () => NextResponse.json({success:true})), route = withApiProtection(handler);
    const oversized = new NextRequest("http://localhost/api/auth/login", {method:"POST",headers:{"content-length":"1"},body:"x".repeat(16385)});
    expect((await route(oversized)).status).toBe(413); expect(handler).not.toHaveBeenCalled();
    expect((await route(new NextRequest("http://localhost/api/auth/login",{method:"POST",body:"x".repeat(16384)}))).status).toBe(200);
  });
  it("redacts thrown failures and legacy 5xx bodies while retaining correlation and problem format", async () => {
    const logger = vi.spyOn(console,"info").mockImplementation(()=>{});
    const route = withApiProtection(async () => { safeFailure(); throw new Error("secret-token private@example.test OTP123456"); });
    const response = await route(new NextRequest("http://localhost/api/orders/private-id?token=secret-token",{headers:{"x-request-id":"private@example.test"}}));
    expect(response.status).toBe(503); expect(response.headers.get("X-Request-ID")).toMatch(/^[a-f0-9-]{36}$/);
    expect(JSON.stringify(await response.json())).not.toMatch(/secret-token|private@example|OTP123456/);
    expect(JSON.stringify(logger.mock.calls)).not.toMatch(/secret-token|private@example|private-id|OTP123456/);
    operationalEvent("api_request", {area:"private@example.test", method:"secret-token"}); expect(JSON.stringify(logger.mock.calls)).not.toContain("private@example.test");
    const legacy = withApiProtection(async () => NextResponse.json({detail:"private SQL",stack:"token"},{status:500,headers:{"content-type":"application/problem+json"}}));
    const sanitized=await legacy(new NextRequest("http://localhost/api/products")); expect(sanitized.headers.get("content-type")).toContain("application/problem+json");expect(JSON.stringify(await sanitized.json())).not.toMatch(/private SQL|stack/);
  });
  it("wraps every declared route method, including future public/auth and upload entry points", () => {
    const collect=(dir:string):string[]=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?collect(path.join(dir,e.name)):[path.join(dir,e.name)]);
    const unprotected:string[]=[];
    for(const file of collect("src/app/api").filter(f=>f.endsWith("route.ts"))) {
      const source=ts.createSourceFile(file,fs.readFileSync(file,"utf8"),ts.ScriptTarget.Latest,true);
      for(const statement of source.statements)if(ts.canHaveModifiers(statement)&&ts.getModifiers(statement)?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)) {
        if(ts.isFunctionDeclaration(statement)&&/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(statement.name?.text||""))unprotected.push(file);
        if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations)if(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(d.name.getText(source))&&!d.initializer?.getText(source).startsWith("withApiProtection("))unprotected.push(file);
      }
    }
    expect(unprotected).toEqual([]);
  });
});
async function privacyCookie(verified=false) {
  const account=Array.from(demoAuth().accounts.values()).find(a=>!a.role)!;
  const response=NextResponse.json({});await issueSession(response,"customer",account.id,account.contact,undefined,undefined,verified);
  return {cookie:`tethera_customer_token=${response.cookies.get("tethera_customer_token")!.value}`,account};
}
describe("privacy ownership, verification and reviewed decisions", () => {
  it("uses the verified session contact rather than an editable secondary phone",async()=>{
    const verifiedContact="+6281709991111",auth=demoAuth(),otp=auth.otp(verifiedContact),account=auth.verify(verifiedContact,otp);
    account.profile.fullName="Phone fixture";account.profile.phone="+6281709992222";
    const issued=NextResponse.json({});await issueSession(issued,"customer",account.id,verifiedContact);
    const cookie=`tethera_customer_token=${issued.cookies.get("tethera_customer_token")!.value}`;
    const response=await privacyGet(new NextRequest("http://localhost/api/account/privacy",{headers:{cookie}}));
    expect((await response.json()).verificationContact).toBe(verifiedContact);
  });
  it("requires a signed-in owner and fresh verification, with no chosen customer identity", async () => {
    expect((await privacyGet(new NextRequest("http://localhost/api/account/privacy"))).status).toBe(401);
    const {cookie,account}=await privacyCookie();
    expect((await privacyGet(new NextRequest("http://localhost/api/account/privacy?download=1",{headers:{cookie}}))).status).toBe(403);
    const {cookie:fresh}=await privacyCookie(true);
    const response=await privacyPost(new NextRequest("http://localhost/api/account/privacy",{method:"POST",headers:{cookie:fresh,"Content-Type":"application/json"},body:JSON.stringify({kind:"correction",notes:"Fixture request",customer_id:"another-owner"})}));
    expect(response.status).toBe(200);const row=(await response.json()).request;expect(row).not.toHaveProperty("customer_id");
    expect((await privacyRequests.findById(row.id))?.customer_id).toBe(account.profile.id);
    const unrelated=await submitPrivacy("unrelated-owner","erasure","not for this customer");
    const listing=await(await privacyGet(new NextRequest("http://localhost/api/account/privacy",{headers:{cookie:fresh}}))).json();expect(listing.requests.some((r:any)=>r.id===unrelated.id)).toBe(false);
    const denied=await privacyPost(new NextRequest("http://localhost/api/account/privacy",{method:"POST",headers:{cookie:fresh,origin:"https://evil.example"},body:JSON.stringify({kind:"erasure"})}));expect(denied.status).toBe(403);
  });
  it("deduplicates open requests, records evidence, and redacts internal notes from customer views", async () => {
    const owner="owner-"+randomUUID(), request=await submitPrivacy(owner,"erasure","Please review retention.");
    expect((await submitPrivacy(owner,"erasure","repeat")).id).toBe(request.id);
    await expect(reviewPrivacy(request.id,"completed","staff","Completed action","Case 12345")).rejects.toMatchObject({status:409});
    await reviewPrivacy(request.id,"in_review","staff","Retention review started.","Internal case 12345");
    await reviewPrivacy(request.id,"declined","staff","Some records remain under a documented hold.","Private hold reference 12345");
    expect((await privacyEvents.findMany({request_id:request.id}))).toHaveLength(3);
    await expect(reviewPrivacy(request.id,"completed","staff","Attempt again","case 12345")).rejects.toMatchObject({status:409});
    const {cookie,account}=await privacyCookie(true);const own=await submitPrivacy(account.profile.id,"access","Account export request");
    await reviewPrivacy(own.id,"in_review","staff","Review started.","SECRET INTERNAL NOTE");
    const data=await(await privacyGet(new NextRequest("http://localhost/api/account/privacy",{headers:{cookie}}))).json();expect(JSON.stringify(data)).not.toMatch(/SECRET INTERNAL NOTE|internal_evidence|decided_by/);
  });
  it("exports only verified account scope and rejects requests lacking privacy staff permission", async () => {
    const {cookie,account}=await privacyCookie(true);
    const response=await privacyGet(new NextRequest("http://localhost/api/account/privacy?download=1&customerId=another-owner",{headers:{cookie}}));
    expect(response.status).toBe(200);expect(response.headers.get("Content-Disposition")).toContain("attachment");
    const data=await response.json();expect(data.profile.id).toBe(account.profile.id);expect(data.scope).toContain("not a complete");expect(JSON.stringify(data)).not.toMatch(/token_hash|internal_evidence|cost_price|password|admin_notes/);
    const support=fixtureCookie("SUPPORT_AGENT");
    expect((await adminPrivacyGet(new NextRequest("http://localhost/api/admin/privacy",{headers:{cookie:support}}))).status).toBe(403);
    expect((await adminPrivacyPost(new NextRequest("http://localhost/api/admin/privacy",{method:"POST",headers:{cookie:support},body:JSON.stringify({id:"any",status:"completed"})}))).status).toBe(403);
    const admin=fixtureCookie("SUPER_ADMIN");
    expect((await operationsGet(new NextRequest("http://localhost/api/admin/operations",{headers:{cookie:admin}}))).status).toBe(200);
    expect((await monitorGet(new NextRequest("http://localhost/api/internal/operations?secret=fake"))).status).toBe(401);
    vi.stubEnv("OPERATIONS_MONITOR_SECRET","s".repeat(40));
    expect((await monitorGet(new NextRequest("http://localhost/api/internal/operations",{headers:{authorization:"Bearer short"}}))).status).toBe(401);
  });
  it("fails a large immediate export instead of silently cutting off the result", async () => {
    const {account}=await privacyCookie(true);
    const store=new BaseRepository<any>("orders");
    const created:string[]=[];
    try {
      for(let n=0;n<1001;n++) {const row=await store.create({id:`export-${randomUUID()}`,customer_id:account.profile.id});created.push(row.id);}
      await expect(accountDataExport(account.profile,account.id)).rejects.toMatchObject({status:409});
    } finally {for(const key of created)await store.delete(key);}
  });
});
