import { databaseFailureResponse } from "@/lib/api/problemDetails";
import "server-only";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkOrigin, authResponse, readSession, tokenHash } from "./session";
import { customerProfile } from "./customer";
import { requireAdminPermission, AdminPermission } from "./rbac";
import { AuthError } from "./errors";
import { isDemoMode } from "@/lib/runtime/environment";
import { generateGuestTrackingToken, verifyGuestTrackingToken } from "@/lib/utils/orderTracking";

type Handler = (req: NextRequest, context: any) => Promise<Response>;
const guestCookie = "tethera_guest_token";
function guestId(req: NextRequest) {
  const value = req.cookies.get(guestCookie)?.value;
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? "guest:" + tokenHash(value) : null;
}
export async function assertOrderOwner(req: NextRequest, order: any) {
  if (!order) throw new AuthError("Order not found.",404);
  const session=await readSession(req,"customer");
  if (session) {
    const profile=await customerProfile(req);
    if(order.customer_id===profile.id) return;
  }
  if(guestId(req) && order.customer_id===guestId(req)) return;
  const token=req.nextUrl.searchParams.get("token") || req.headers.get("x-order-token");
  if(req.nextUrl.pathname === "/api/orders/track" && token && verifyGuestTrackingToken(token,order.order_number,order.customer_email)) return;
  throw new AuthError("Order not found.",404);
}
function permission(path:string,method:string): AdminPermission {
  if(path==="/api/admin/privacy")return method==="GET"?"privacy:read":"privacy:manage";
  if(path==="/api/admin/operations")return "operations:read";
  if(path==="/api/admin/jobs")return method==="GET"?"jobs:read":"jobs:manage";
  if(path.includes("/products")) return method==="GET"?"products:read":method==="DELETE"?"products:delete":"products:write";
  if(path.includes("/inventory")) return method==="GET"?"inventory:read":"inventory:adjust";
  if(path.includes("/customers")) return method==="GET"?"customers:read":"customers:write";
  if(path.includes("/rma")) return method==="GET"?"refunds:read":"refunds:write";
  if(path.includes("/audit-logs")) return "audit_logs:read";
  if(path.includes("/promotions") || path.includes("/banners") || path.includes("/homepage-modules")) return method==="GET"?"promotions:read":"promotions:write";
  if(path.includes("/upload")) return "products:write";
  if(path.includes("/courier") || path.includes("/fulfillments")) return method==="GET"?"orders:read":"orders:dispatch";
  if(path.includes("/orders")) return method==="GET"?"orders:read":"orders:write";
  throw new AuthError("No access policy for this administrative action.",403);
}
function rebuild(req:NextRequest,url:URL,body:any) {
  const headers=new Headers(req.headers);
  headers.delete("content-length");
  if(body!==undefined) headers.set("content-type","application/json");
  return new NextRequest(url,{method:req.method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
}
async function readCheckoutBody(req:NextRequest) {
  const limit=200000;
  if(Number(req.headers.get("content-length")||0)>limit) throw new AuthError("Checkout request too large.",413);
  const reader=req.body!.getReader(), decoder=new TextDecoder("utf-8",{fatal:true});
  let size=0,raw="";
  try {
    while(true) {
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>limit) {await reader.cancel();throw new AuthError("Checkout request too large.",413);}
      raw+=decoder.decode(value,{stream:true});
    }
    raw+=decoder.decode();return JSON.parse(raw);
  } finally {reader.releaseLock();}
}
export function withAccess(handler: Handler) {
 return async(req: NextRequest,context?: any)=>{
  try {
    const path=req.nextUrl.pathname, method=req.method, url=new URL(req.url);
    checkOrigin(req);
    if(path.startsWith("/api/admin/")) {
      // Homepage configuration is public storefront data, only writes require staff.
      if(!(path==="/api/admin/homepage-modules" && method==="GET")) {
        const access=await requireAdminPermission(req,permission(path,method));
        if(!access.authorized) throw new AuthError(access.error,access.status||403);
      }
      const response=await handler(req,context); response.headers.set("Cache-Control","no-store"); return response;
    }
    const usesJson=!["GET","HEAD"].includes(method) && req.body !== null;
    let body: any;
    try {
      if(usesJson && ["/api/checkout/create-order","/api/checkout/quote","/api/checkout/shipping-rates"].includes(path)) {
        body=await readCheckoutBody(req);
      } else body=usesJson?await req.clone().json():undefined;
    } catch(error) { if(error instanceof AuthError)throw error;throw new AuthError("Invalid JSON body.",400); }
    let changed=false;
    const session=await readSession(req,"customer");
    if(path==="/api/checkout/session") {
      const response=await handler(req,context);
      if(!session && !guestId(req)) (response as NextResponse).cookies.set(guestCookie,randomBytes(32).toString("base64url"),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:2592000});
      response.headers.set("Cache-Control","no-store");return response;
    }
    if(path==="/api/account/orders") {
      const profile=await customerProfile(req);
      url.searchParams.delete("email"); url.searchParams.set("customerId",profile.id); changed=true;
    }
    if(path==="/api/cart" || path==="/api/wishlist" || path.endsWith("/merge")) {
      const isCart=path.includes("/cart"), cookie=isCart?"tethera_cart_token":"tethera_wishlist_token";
      const old=req.cookies.get(cookie)?.value;
      const ownToken=old && /^[a-z]{3}_[A-Za-z0-9_-]{43}$/.test(old)?old:(isCart?"gst_":"wsh_")+randomBytes(32).toString("base64url");
      const userId=session?session.id:null;
      if(path.endsWith("/merge") && (!userId || !old)) throw new AuthError("Sign in with the guest session being merged.",401);
      url.searchParams.delete("userId"); url.searchParams.delete("sessionToken"); url.searchParams.delete("_verifiedCustomer");
      if(userId) url.searchParams.set("userId",userId);
      url.searchParams.set("sessionToken",ownToken);
      if(body) Object.assign(body,{userId,sessionToken:ownToken,anonymousToken:ownToken});
      const headers=new Headers(req.headers);
      headers.delete("authorization");headers.delete("x-cart-token");headers.delete("x-wishlist-token");headers.delete("x-session-token");
      headers.set("cookie",req.cookies.getAll().filter(c=>c.name!==cookie).map(c=>c.name+"="+c.value).concat(cookie+"="+ownToken).join("; "));
      req=new NextRequest(req.url,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
      changed=true;
      // Cart resolver gets verified userId explicitly, never from a simulated bearer.
      if(isCart && userId) url.searchParams.set("_verifiedCustomer",userId);
      const response=await handler(rebuild(req,url,body),context);
      const result=NextResponse.next(); // cookie serializer only
      result.cookies.set(cookie,ownToken,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:2592000});
      for(const c of result.cookies.getAll()) (response as NextResponse).cookies?.set(c);
      response.headers.set("Cache-Control","no-store");
      return response;
    }
    if(/\/products\/[^/]+\/notify-stock$/.test(path)){
      const profile=await customerProfile(req);
      if(!session?.contact?.includes("@"))throw new AuthError("Sign in with a verified email address for stock alerts.",409);
      body={variantId:body?.variantId,email:session.contact,verifiedOwnerId:profile.id};changed=true;
    }
    if(/\/products\/[^/]+\/reviews$/.test(path)) {
      url.searchParams.delete("checkEmail");url.searchParams.delete("customerEmail");url.searchParams.delete("userId");
      if(method!=="GET" || session) {
        const profile=await customerProfile(req);
        if(body) Object.assign(body,{customerEmail:profile.email,customerName:profile.fullName,userId:profile.id});
        url.searchParams.set("checkEmail",profile.email);url.searchParams.set("userId",profile.id);
      }
      changed=true;
    }
    if(path==="/api/checkout/create-order" || path==="/api/checkout/quote" || path==="/api/checkout/shipping-rates") {
      if(!body?.customer || typeof body.customer!=="object") throw new AuthError("Customer details required.",400);
      if(session) {
        const profile=await customerProfile(req);
        body.customer={...body.customer,customerId:profile.id,email:profile.email,isGuest:false};
      } else {
        let id=guestId(req);
        if(!id) {
          const response=NextResponse.json({success:false,error:"Initialize the checkout session before submitting. Retry after loading checkout."},{status:409});
          response.cookies.set(guestCookie,randomBytes(32).toString("base64url"),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:2592000});
          response.headers.set("Cache-Control","no-store");return response;
        }
        body.customer={...body.customer,customerId:id,isGuest:true};
      }
      if(typeof body.customer.email==="string") body.customer.email=body.customer.email.trim().toLowerCase();
      // Validate capability signing configuration before checkout has any side effects.
      generateGuestTrackingToken("configuration-check","nobody@example.invalid");
      changed=true;
    }
    if(path==="/api/checkout/payment-success" || path==="/api/checkout/midtrans/charge" || path==="/api/checkout/midtrans/status") {
      if(path==="/api/checkout/payment-success" && !isDemoMode()) throw new AuthError("Browser payment confirmation is disabled.",503);
      const order=body?.orderId?await db.orders.findById(body.orderId):body?.orderNumber?await db.orders.findByOrderNumber(body.orderNumber):null;
      await assertOrderOwner(req,order);
    }
    if(path==="/api/orders/invoice" && method==="GET") {
      const id=url.searchParams.get("orderId"),number=url.searchParams.get("orderNumber");
      const order=id?await db.orders.findById(id):number?await db.orders.findByOrderNumber(number):null;
      await assertOrderOwner(req,order);url.searchParams.set("orderId",order!.id);changed=true;
    }
    if(path==="/api/orders/invoice/send") {
      const order=body?.orderId?await db.orders.findById(body.orderId):body?.orderNumber?await db.orders.findByOrderNumber(body.orderNumber):null;
      await assertOrderOwner(req,order);
      body={orderId:order!.id}; changed=true; // recipient and invoice fields are server-owned
    }
    if(path==="/api/orders/track" && method==="POST") {
      const order=body?.orderNumber?await db.orders.findByOrderNumber(String(body.orderNumber).trim().toUpperCase()):null;
      await assertOrderOwner(req,order);
      body={...body,email:order!.customer_email};changed=true;
    }
    if(path==="/api/orders/rma") {
      if(method==="GET") {
        const number=url.searchParams.get("orderNumber"),rma=url.searchParams.get("rmaNumber");
        const returnRecord=rma&&!number?await db.rma.returnRequests.findOne({rma_number:rma.trim()}):null;
        const matching=number?await db.orders.findByOrderNumber(number.trim().toUpperCase()):returnRecord?await db.orders.findById(returnRecord.order_id):null;
        await assertOrderOwner(req,matching);
        url.searchParams.set("email",matching!.customer_email);url.searchParams.set("_ownedOrderId",matching!.id);changed=true;
      } else {
        const order=body?.orderNumber?await db.orders.findByOrderNumber(String(body.orderNumber).trim().toUpperCase()):null;
        await assertOrderOwner(req,order);body={...body,email:order!.customer_email};changed=true;
      }
    }
    const response=await handler(changed?rebuild(req,url,body):req,context);
    response.headers.set("Cache-Control","no-store");
    if(path==="/api/checkout/create-order" && response.ok) {
      const data=await response.json();
      data.trackingToken ||= generateGuestTrackingToken(data.orderNumber,body.customer.email);
      const updated=NextResponse.json(data,{status:response.status});
      updated.headers.set("Cache-Control","no-store");return updated;
    }
    if(/\/products\/[^/]+\/reviews$/.test(path) && method==="GET" && response.ok) {
      const data=await response.json();
      if(data.summary?.reviews) data.summary.reviews=data.summary.reviews.map((r:any)=>({id:r.id,rating:r.rating,title:r.title,content:r.content,customer_name:r.customer_name,verified_purchase:r.verified_purchase,created_at:r.created_at,helpful_votes:r.helpful_votes}));
      return NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
    }
    return response;
  } catch(error) { return databaseFailureResponse(error) || authResponse(error); }
 };
}
