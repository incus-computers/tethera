import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authHandler } from "@/lib/auth/handlers";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";
import { tokenHash } from "@/lib/auth/session";

const uid="11111111-1111-4111-8111-111111111111";
const token=(aal:string)=>Buffer.from("{}").toString("base64url")+"."+Buffer.from(JSON.stringify({sub:uid,aal,exp:Math.floor(Date.now()/1000)+3600})).toString("base64url")+".fixture";
const user={id:uid,email:"staff@example.com",email_confirmed_at:"2026-01-01T00:00:00Z",aud:"authenticated",role:"authenticated",app_metadata:{},user_metadata:{},created_at:"2026-01-01T00:00:00Z"};
function request(path:string,method="GET",body?:unknown,cookie="") {
 return new NextRequest("http://localhost:3000/api/"+path,{method,headers:{"Content-Type":"application/json",cookie},...(body?{body:JSON.stringify(body)}:{})});
}
let active=true,scope="admin",storageFailure=false,revocationFailure=false,freshVerification=false;
let credentialChanged=false;
let credentialEvents:string[]=[];
let staffReads=0,userReads=0;
beforeEach(()=>{
 process.env.APP_ENV="staging";process.env.NEXT_PUBLIC_SUPABASE_URL="https://fixture.supabase.invalid";process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY="fixture-anon";process.env.SUPABASE_SERVICE_ROLE_KEY="fixture-service";
 active=true;scope="admin";storageFailure=false;revocationFailure=false;freshVerification=false;
 credentialChanged=false;credentialEvents=[];staffReads=0;userReads=0;
 vi.stubGlobal("fetch",vi.fn(async(input:any,init?:RequestInit)=>{
  const url=String(input instanceof Request?input.url:input),method=init?.method||"GET";
  const response=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
  if(url.includes("/rpc/consume_auth_rate_limit"))return response(true);
  if(url.includes("/auth/v1/otp"))return response({});
  if(url.includes("/auth/v1/admin/users/")){credentialChanged=true;credentialEvents.push("password");return response({user});}
  if(url.includes("/auth/v1/token"))return response({access_token:token("aal1"),refresh_token:"fixture-refresh",expires_in:3600,token_type:"bearer",user});
  if(url.includes("/auth/v1/factors") && url.includes("/challenge"))return response({id:"factor",expires_at:Math.floor(Date.now()/1000)+300});
  if(url.includes("/auth/v1/factors") && url.includes("/verify"))return response({access_token:token("aal2"),refresh_token:"fixture-refresh",expires_in:3600,token_type:"bearer",user});
  if(url.includes("/auth/v1/user")){userReads++;return response({...user,factors:[{id:"factor",factor_type:"totp",status:"verified",friendly_name:"test",created_at:"2026-01-01",updated_at:"2026-01-01"}]});}
  if(url.includes("/rest/v1/admin_users")){staffReads++;return response(active?{id:"staff-id",email:user.email,name:"Fixture Staff",role:"SUPER_ADMIN",is_active:true}:null);}
  if(url.includes("/rest/v1/auth_sessions")) {
   if(storageFailure)return response({message:"database unavailable"},503);
   if(method==="GET")return response(scope==="admin"?{user_id:uid,expires_at:new Date(Date.now()+3600000).toISOString(),verification_expires_at:freshVerification?new Date(Date.now()+600000).toISOString():null}:null);
   if(method==="PATCH"){freshVerification=false;return response({user_id:uid});}
   if(method==="DELETE"){credentialEvents.push("revoke");return revocationFailure?response({message:"unavailable"},503):response(null);}
   return response(null);
  }
  if(url.includes("/rest/v1/customer_profiles"))return response({id:uid,user_id:uid,email:user.email,full_name:"Fixture",phone:"",address_line1:"",subdistrict:"",city:"",province:"",postal_code:""});
  throw new Error("Unexpected fixture request: "+url);
 }));
});
describe("live provider adapter with offline HTTP fixtures",()=>{
 it("does not change credentials if session revocation cannot commit",async()=>{
  freshVerification=true;revocationFailure=true;
  const response=await authHandler("reset-password")(request("auth/reset-password","POST",{password:"ChangedFixturePassword!"},"tethera_customer_token="+token("aal1")));
  expect(response.status).toBe(503);expect(credentialChanged).toBe(false);
 });
 it("revokes existing sessions before changing the provider password",async()=>{
  freshVerification=true;
  const response=await authHandler("reset-password")(request("auth/reset-password","POST",{password:"ChangedFixturePassword!"},"tethera_customer_token="+token("aal1")));
  expect(response.status).toBe(200);expect(credentialEvents).toEqual(["revoke","password"]);
 });
 it("issues a staff cookie only after provider password, MFA and role checks",async()=>{
  const response=await authHandler("admin-login")(request("admin/auth","POST",{identifier:user.email,password:"CorrectFixturePassword!",totpCode:"123456"}));
  expect(response.status).toBe(200);
  expect(response.cookies.get("tethera_admin_token")?.value).toBe(token("aal2"));
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(await response.json()).not.toHaveProperty("token");
 });
 it("verifies each staff request with provider and current server-side role",async()=>{
  const req=request("admin/orders","GET",undefined,"tethera_admin_token="+token("aal2"));
  expect((await verifyAdminClearance(req)).authorized).toBe(true);
  active=false;
  expect((await verifyAdminClearance(req)).authorized).toBe(false);
  expect(staffReads).toBe(2);expect(userReads).toBe(2);
 });
 it("rejects a provider-valid AAL1 session for staff",async()=>{
  expect((await verifyAdminClearance(request("admin/orders","GET",undefined,"tethera_admin_token="+token("aal1")))).authorized).toBe(false);
 });
 it("requires a revocation registry entry and never accepts provider token alone",async()=>{
  scope="missing";
  expect((await verifyAdminClearance(request("admin/orders","GET",undefined,"tethera_admin_token="+token("aal2")))).authorized).toBe(false);
  expect(userReads).toBe(0);
 });
 it("fails closed on session storage errors",async()=>{
  storageFailure=true;
  const response=await authHandler("admin-me")(request("admin/auth","GET",undefined,"tethera_admin_token="+token("aal2")));
  expect(response.status).toBe(503);
 });
 it("does not expose verification codes from the live OTP adapter",async()=>{
  const response=await authHandler("send-otp")(request("auth/send-otp","POST",{identifier:"buyer@example.com"}));
  expect(response.status).toBe(200);
  const data=await response.json();expect(data).not.toHaveProperty("demoCode");expect(data).not.toHaveProperty("code");
 });
 it("rejects password-only staff login before issuing a cookie",async()=>{
  const response=await authHandler("admin-login")(request("admin/auth","POST",{identifier:user.email,password:"CorrectFixturePassword!"}));
  expect(response.status).toBe(403);expect(response.headers.get("set-cookie")).toBeNull();
 });
});
