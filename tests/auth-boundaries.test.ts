import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { authHandler } from "@/lib/auth/handlers";
import { demoAuth, DEMO_PASSWORD } from "@/lib/auth/demo";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";
import { authorizeAdminRequest, hasPermission } from "@/lib/auth/rbac";
import { withAccess, assertOrderOwner } from "@/lib/auth/routeGuard";
import { generateGuestTrackingToken, verifyGuestTrackingToken } from "@/lib/utils/orderTracking";
import { getServerSupabase } from "@/lib/db/client";
import { BiteshipService } from "@/lib/shipping/biteship";
import { sendInvoiceEmail } from "@/lib/notifications/email";
import { loginCookie } from "./support/session";
import { GET as checkoutSession } from "@/app/api/checkout/session/route";
import { GET as accountOrders } from "@/app/api/account/orders/route";
import { PUT as homepagePUT } from "@/app/api/admin/homepage-modules/route";
import { GET as reviewsGET } from "@/app/api/products/[id]/reviews/route";
import { db } from "@/lib/db";
import { BaseRepository } from "@/lib/db/repositories/base.repository";

function req(path:string,method="GET",body?:unknown,cookie="",headers:Record<string,string>={}) {
 return new NextRequest("http://localhost:3000/api/"+path,{method,headers:{...(body!==undefined?{"Content-Type":"application/json"}:{}),...(cookie?{cookie}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
}
const echo=withAccess(async(request)=>NextResponse.json({query:Object.fromEntries(request.nextUrl.searchParams),body:request.method==="GET"?null:await request.json()}));
beforeEach(()=>{process.env.APP_ENV="demo";demoAuth().limits.clear();demoAuth().sessions.clear();});
describe("verified authentication boundaries",()=>{
 it("shares demo table state across route repository instances",async()=>{
  const first=new BaseRepository<{id:string;value:number}>("auth-fixture-shared");
  const second=new BaseRepository<{id:string;value:number}>("auth-fixture-shared");
  await first.create({id:"shared",value:7});
  expect(await second.findById("shared")).toEqual({id:"shared",value:7});
 });
 it("requires a fresh OTP to reset passwords, revokes sessions and consumes proof",async()=>{
  const email="recovery-fixture@example.com";
  const code=demoAuth().otp(email),account=demoAuth().verify(email,code);
  account.profile.fullName="Recovery Fixture";
  demoAuth().setPassword(account.id,DEMO_PASSWORD);
  const oldCookie=await loginCookie(email);
  expect((await authHandler("reset-password")(req("auth/reset-password","POST",{password:"ReplacementPassword!"},oldCookie))).status).toBe(403);
  const sent=await authHandler("send-otp")(req("auth/send-otp","POST",{identifier:email,purpose:"recovery"}));
  const verification=await authHandler("verify-otp")(req("auth/verify-otp","POST",{identifier:email,code:(await sent.json()).demoCode}));
  const verifiedCookie=verification.cookies.getAll().map(c=>c.name+"="+c.value).join("; ");
  expect((await authHandler("reset-password")(req("auth/reset-password","POST",{password:"ReplacementPassword!"},verifiedCookie))).status).toBe(200);
  expect((await authHandler("me")(req("auth/me","GET",undefined,oldCookie))).status).toBe(401);
  expect((await authHandler("reset-password")(req("auth/reset-password","POST",{password:"AnotherPassword!"},verifiedCookie))).status).toBe(401);
  expect((await authHandler("login")(req("auth/login","POST",{identifier:email,password:DEMO_PASSWORD}))).status).toBe(401);
  expect((await authHandler("login")(req("auth/login","POST",{identifier:email,password:"ReplacementPassword!"}))).status).toBe(200);
 });
 it("does not treat a shared tracking token as payment or return permission",async()=>{
  const order={customer_id:"other",order_number:"SCOPED",customer_email:"scoped@example.com"};
  const token=generateGuestTrackingToken(order.order_number,order.customer_email);
  await expect(assertOrderOwner(req("checkout/midtrans/charge?token="+token),order)).rejects.toThrow();
  await expect(assertOrderOwner(req("orders/rma?token="+token),order)).rejects.toThrow();
  await expect(assertOrderOwner(req("orders/track?token="+token),order)).resolves.toBeUndefined();
 });
 it("rejects password omission and old default credentials",async()=>{
  for(const password of [undefined,"","Password123!"]) {
   const response=await authHandler("login")(req("auth/login","POST",{identifier:"alex.gamer@example.com",password}));
   expect(response.status).toBe(401);
  }
 });
 it("uses HttpOnly session cookies and never returns bearer tokens",async()=>{
  const response=await authHandler("login")(req("auth/login","POST",{identifier:"alex.gamer@example.com",password:DEMO_PASSWORD}));
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  expect(await response.json()).not.toHaveProperty("token");
 });
 it("ignores auth/me query identity and returns only the current profile",async()=>{
  const cookie=await loginCookie("alex.gamer@example.com");
  const response=await authHandler("me")(req("auth/me?email=budi.builder@techcorp.id&id=cust-002","GET",undefined,cookie));
  expect((await response.json()).user.id).toBe("cust-001");
 });
 it("revokes logout on the server even if the old cookie is replayed",async()=>{
  const cookie=await loginCookie("alex.gamer@example.com");
  expect((await authHandler("logout")(req("auth/logout","POST",{},cookie))).status).toBe(200);
  expect((await authHandler("me")(req("auth/me","GET",undefined,cookie))).status).toBe(401);
 });
 it("rejects expired server sessions",async()=>{
  const cookie=await loginCookie("alex.gamer@example.com");
  for(const value of Array.from(demoAuth().sessions.values()))value.expires=0;
  expect((await authHandler("me")(req("auth/me","GET",undefined,cookie))).status).toBe(401);
 });
 it.each(["superadmin","admin-super",Buffer.from("admin-super:SUPER_ADMIN:2:123").toString("base64")])("rejects forged admin cookie %s",async(token)=>{
  const result=await verifyAdminClearance(req("admin/orders","GET",undefined,"tethera_admin_token="+token));
  expect(result.authorized).toBe(false);
 });
 it("does not grant a missing-header fallback or legacy role aliases",async()=>{
  expect((await authorizeAdminRequest(req("admin/orders"))).authorized).toBe(false);
  expect(hasPermission("admin","refunds:write")).toBe(false);
  expect(hasPermission("__proto__","products:read")).toBe(false);
 });
 it("uses actual demo logins for role enforcement on legacy routes",async()=>{
  const catalog=await loginCookie("CATALOG_MANAGER");
  const result=await echo(req("admin/orders","PUT",{orderId:"ord-1001"},catalog));
  expect(result.status).toBe(403);
  const support=await loginCookie("SUPPORT_AGENT");
  expect((await echo(req("admin/customers","GET",undefined,support))).status).toBe(200);
  expect((await echo(req("admin/courier/dispatch","POST",{},support))).status).toBe(403);
 });
 it("protects homepage mutations while keeping public configuration readable",async()=>{
  expect((await homepagePUT(req("admin/homepage-modules","PUT",{modules:[]}))).status).toBe(401);
  const cookie=await loginCookie();
  expect((await homepagePUT(req("admin/homepage-modules","PUT",{featuredPrebuiltIds:["pb-1"]},cookie))).status).toBe(200);
 });
 it("rejects cross-origin cookie writes including login",async()=>{
  const response=await authHandler("login")(req("auth/login","POST",{identifier:"alex.gamer@example.com",password:DEMO_PASSWORD},"",{origin:"https://evil.invalid"}));
  expect(response.status).toBe(403);
 });
 it("scopes account history by customer ID despite forged email/ID",async()=>{
  const cookie=await loginCookie("alex.gamer@example.com");
  const response=await accountOrders(req("account/orders?email=budi.builder@techcorp.id&customerId=cust-002","GET",undefined,cookie));
  expect(response.status).toBe(200);
  const data=await response.json();
  expect(data.orders.length).toBeGreaterThan(0);
  expect(data.orders.every((o:any)=>o.customer_id==="cust-001")).toBe(true);
 });
 it("rejects profile identity/CRM mass assignment",async()=>{
  const cookie=await loginCookie("alex.gamer@example.com");
  for(const updates of [{id:"cust-002"},{email:"someone@example.com"},{crm:{totalSpent:999}}]) {
   expect((await authHandler("update")(req("account/update","PUT",{id:"cust-002",updates},cookie))).status).toBe(400);
  }
 });
 it("validates contact control before registration and bounds OTP retries",async()=>{
  expect((await authHandler("register")(req("auth/register","POST",{email:"new@example.com",password:DEMO_PASSWORD,fullName:"Test",termsAccepted:true}))).status).toBe(401);
  const sent=await authHandler("send-otp")(req("auth/send-otp","POST",{identifier:"new@example.com"}));
  const {demoCode}=await sent.json();
  const verified=await authHandler("verify-otp")(req("auth/verify-otp","POST",{identifier:"new@example.com",code:demoCode}));
  expect(verified.status).toBe(200);
  const cookie=verified.cookies.getAll().map(c=>c.name+"="+c.value).join("; ");
  expect((await authHandler("register")(req("auth/register","POST",{email:"different@example.com",password:DEMO_PASSWORD,fullName:"Test",termsAccepted:true},cookie))).status).toBe(403);
  const registered=await authHandler("register")(req("auth/register","POST",{email:"new@example.com",password:DEMO_PASSWORD,fullName:"Test User",termsAccepted:true},cookie));
  expect(registered.status).toBe(200);
  expect((await authHandler("verify-otp")(req("auth/verify-otp","POST",{identifier:"new@example.com",code:demoCode}))).status).toBe(400);
 });
 it("throttles resends independently from OTP replacement",async()=>{
  for(let i=0;i<5;i++)expect((await authHandler("send-otp")(req("auth/send-otp","POST",{identifier:"rate@example.com"}))).status).toBe(200);
  expect((await authHandler("send-otp")(req("auth/send-otp","POST",{identifier:"rate@example.com"}))).status).toBe(429);
 });
 it("ignores supplied wishlist identities and anonymous tokens",async()=>{
  const cookie=await loginCookie("alex.gamer@example.com");
  const response=await echo(req("wishlist?userId=cust-002&sessionToken=stolen","POST",{userId:"cust-002",sessionToken:"stolen",productId:"cpu-1"},cookie));
  const data=await response.json();
  expect(data.body.userId).toBe("cust-001");expect(data.body.sessionToken).not.toBe("stolen");
 });
 it("rejects simulated bearer/internal-query cart impersonation",async()=>{
  const response=await echo(req("cart?_verifiedCustomer=cust-002","GET",undefined,"",{Authorization:"Bearer usr_cust-002"}));
  const data=await response.json();
  expect(data.query).not.toHaveProperty("_verifiedCustomer");
 });
 it("requires sign-in plus the current guest cookie to merge",async()=>{
  expect((await echo(req("cart/merge","POST",{userId:"cust-001",anonymousToken:"stolen"}))).status).toBe(401);
 });
 it("rejects foreign order access even when the email is known",async()=>{
  const cookie=await loginCookie("alex.gamer@example.com");
  await expect(assertOrderOwner(req("orders/track","POST",{},cookie),{id:"other",customer_id:"cust-002",customer_email:"alex.gamer@example.com",order_number:"OTHER"})).rejects.toThrow();
  expect((await echo(req("orders/invoice/send","POST",{orderId:"ord-1002",email:"attacker@example.com"},cookie))).status).toBe(404);
 });
 it("creates guest capabilities and never accepts caller customerId",async()=>{
  let owner:string|undefined;
  const create=withAccess(async r=>{const body=await r.json();owner=body.customer.customerId;return NextResponse.json({success:true,orderNumber:"TEST-GUEST"});});
  const initialized=await checkoutSession(req("checkout/session"));
  const initialCookie=(initialized as NextResponse).cookies.getAll().map(c=>c.name+"="+c.value).join("; ");
  const response=await create(req("checkout/create-order","POST",{customer:{email:"guest@example.com",customerId:"cust-001"}},initialCookie));
  const data=await response.json();
  expect(owner).toMatch(/^guest:/);
  expect(verifyGuestTrackingToken(data.trackingToken,"TEST-GUEST","guest@example.com")).toBe(true);
  const cookie=initialCookie;
  await expect(assertOrderOwner(req("orders/track","GET",undefined,cookie),{customer_id:owner})).resolves.toBeUndefined();
  await expect(assertOrderOwner(req("orders/track"),{customer_id:owner,order_number:"TEST-GUEST",customer_email:"guest@example.com"})).rejects.toThrow();
 });
 it("expires signed tracking tokens and rejects old known-key tokens",()=>{
  const token=generateGuestTrackingToken("ABC","guest@example.com");
  expect(verifyGuestTrackingToken(token,"ABC","guest@example.com")).toBe(true);
  expect(verifyGuestTrackingToken(token,"ABC","other@example.com")).toBe(false);
  expect(verifyGuestTrackingToken(generateGuestTrackingToken("ABC","guest@example.com",undefined,1),"ABC","guest@example.com")).toBe(false);
  expect(verifyGuestTrackingToken("ABC.fake","ABC","guest@example.com")).toBe(false);
 });
 it("scrubs private customer/order identifiers from public reviews",async()=>{
  await db.reviews.create({product_id:"cpu-1",customer_email:"private@example.com",customer_name:"Display",user_id:"secret-user",order_id:"secret-order",rating:5,title:"Fine",content:"Works",verified_purchase:true} as any);
  const response=await reviewsGET(req("products/cpu-1/reviews"),{params:{id:"cpu-1"}});
  const data=await response.json();
  expect(data.summary.reviews.length).toBeGreaterThan(0);
  expect(data.summary.reviews[0]).not.toHaveProperty("customer_email");
  expect(data.summary.reviews[0]).not.toHaveProperty("order_id");
 });
 it("keeps demo provider credentials isolated from database/shipping/email",async()=>{
  process.env.BITESHIP_API_KEY="pretend-live-key-not-used";
  process.env.SUPABASE_SERVICE_ROLE_KEY="pretend-live-key-not-used";
  expect(getServerSupabase()).toBeNull();
  const booking=await new BiteshipService().createOrderAndSchedulePickup({orderNumber:"DEMO",courierCompany:"jne",courierType:"reg",destinationName:"Test",destinationPhone:"+6281234567890",destinationAddress:"Fixture",items:[]});
  expect(booking.success).toBe(true);
  await sendInvoiceEmail({toEmail:"fixture@example.com",customerName:"Fixture",orderNumber:"DEMO",paymentMethod:"Demo",fulfillmentType:"delivery",subtotal:1,shippingFee:0,grandTotal:1});
  expect(fetch).not.toHaveBeenCalled();
 });
 it("does not enable demo accounts in staging or a production process",async()=>{
  process.env.APP_ENV="staging";
  expect((await authHandler("login")(req("auth/login","POST",{identifier:"alex.gamer@example.com",password:DEMO_PASSWORD}))).status).not.toBe(200);
  process.env.APP_ENV="demo";vi.stubEnv("NODE_ENV","production");
  expect(()=>demoAuth()).toThrow();
  vi.stubEnv("NODE_ENV","test");
 });
});
