import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/runtime/environment";
import { DEMO_PASSWORD, DEMO_ROLES, demoAuth } from "@/lib/auth/demo";
 async function protectedGET() {
 try {
  if(!isDemoMode()) return NextResponse.json({demo:false},{headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({demo:true,password:DEMO_PASSWORD,admins:DEMO_ROLES.map(role=>({role,email:role.toLowerCase()+"@demo.example"})),customers:Array.from(demoAuth().accounts.values()).filter(a=>!a.role).map(a=>({email:a.contact,name:a.profile.fullName}))},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({demo:false,error:"Demo mode is not permitted in a production process."},{status:503});}
}
export const GET = withApiProtection(protectedGET);
