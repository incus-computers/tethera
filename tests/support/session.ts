import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { authHandler } from "@/lib/auth/handlers";
import { DEMO_PASSWORD, demoAuth } from "@/lib/auth/demo";
export async function loginCookie(roleOrEmail="SUPER_ADMIN") {
 const admin=["SUPER_ADMIN","CATALOG_MANAGER","FULFILLMENT_OPERATOR","SUPPORT_AGENT"].includes(roleOrEmail);
 const response=await authHandler(admin?"admin-login":"login")(new NextRequest("http://localhost:3000/api/"+(admin?"admin/auth":"auth/login"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifier:admin?roleOrEmail.toLowerCase()+"@demo.example":roleOrEmail,password:DEMO_PASSWORD})}));
 if(response.status!==200)throw new Error("Fixture sign-in failed: "+await response.text());
 return response.cookies.getAll().map(c=>c.name+"="+c.value).join("; ");
}

// Issue an opaque server-side fixture session, never a magic token or mocked guard.
export function fixtureCustomer(email: string) {
 let account=Array.from(demoAuth().accounts.values()).find(a=>!a.role && a.contact===email);
 if(!account){const code=demoAuth().otp(email);account=demoAuth().verify(email,code);account.profile.fullName="Fixture Buyer";}
 return account;
}
export function fixtureCookie(identity = "SUPER_ADMIN") {
 const admin=["SUPER_ADMIN","CATALOG_MANAGER","FULFILLMENT_OPERATOR","SUPPORT_AGENT"].includes(identity);
 const account=admin?Array.from(demoAuth().accounts.values()).find(a=>a.role===identity):fixtureCustomer(identity);
 if(!account)throw new Error("Unknown fixture identity: "+identity);
 const token=randomBytes(32).toString("base64url");
 const hash=require("node:crypto").createHash("sha256").update(token).digest("hex");
 demoAuth().sessions.set(hash,{id:account.id,contact:account.contact,kind:admin?"admin":"customer",expires:Date.now()+3600000});
 return (admin?"tethera_admin_token":"tethera_customer_token")+"="+token;
}
