import { NextRequest, NextResponse } from "next/server";
import { authClient, authResponse, checkOrigin, issueSession, limitAuth, revokeSession, clearSessionCookie, readSession, consumeVerification, authDatabase } from "./session";
import { authenticateAdminCredentials, verifyAdminClearance } from "./adminAuth";
import { customerProfile, finishRegistration, updateCustomer } from "./customer";
import { demoAuth, normaliseIdentifier } from "./demo";
import { isDemoMode } from "@/lib/runtime/environment";
import { AuthError } from "./errors";

type Action = "login" | "register" | "me" | "logout" | "send-otp" | "verify-otp" | "update" | "admin-login" | "admin-me" | "admin-logout" | "reset-password";
export function authHandler(action: Action) {
  return async (req: NextRequest) => {
    try {
      checkOrigin(req);
      if (action === "me") return NextResponse.json({ success:true, user:await customerProfile(req) }, { headers: { "Cache-Control":"no-store" } });
      if (action === "admin-me") {
        const result=await verifyAdminClearance(req);
        if (!result.authorized) throw new AuthError(result.error);
        return NextResponse.json({success:true,user:result.user,demo:isDemoMode()}, {headers:{"Cache-Control":"no-store"}});
      }
      if (action.endsWith("logout")) {
        const kind=action==="admin-logout"?"admin":"customer";
        await revokeSession(req,kind);
        const response=NextResponse.json({success:true}); clearSessionCookie(response,kind); return response;
      }
      let body: any;
      try { body=await req.json(); } catch { throw new AuthError("Invalid JSON body.",400); }
      if (action==="reset-password") {
        if(typeof body.password!=="string" || body.password.length<12 || body.password.length>128)throw new AuthError("Use a password of 12-128 characters.",400);
        await customerProfile(req);
        const session=await consumeVerification(req);
        if(isDemoMode()) {
          demoAuth().setPassword(session.id,body.password);
          for(const [key,value] of Array.from(demoAuth().sessions))if(value.id===session.id)demoAuth().sessions.delete(key);
        } else {
          const database=authDatabase();
          // Revoke local access first: a storage failure must never leave old sessions
          // active after the provider password has already changed.
          const {error:revokeError}=await database.from("auth_sessions").delete().eq("user_id",session.id);
          if(revokeError)throw new AuthError("Could not revoke existing sessions. Contact support.",503);
          const {error}=await database.auth.admin.updateUserById(session.id,{password:body.password});
          if(error)throw new AuthError("Could not reset password. Request a fresh code and retry.",503);
        }
        const response=NextResponse.json({success:true,message:"Password reset. Sign in again."});
        clearSessionCookie(response,"customer");clearSessionCookie(response,"admin");return response;
      }
      if (action==="update") return NextResponse.json({success:true,user:await updateCustomer(req,body.updates)}, {headers:{"Cache-Control":"no-store"}});
      if (action==="register") return NextResponse.json({success:true,user:await finishRegistration(req,body)});
      const contact=normaliseIdentifier(body.identifier || body.email || body.phone || "");
      if (action==="admin-login") {
        const result=await authenticateAdminCredentials(contact,body.password,body.totpCode);
        const response=NextResponse.json({success:true,user:result.user,demo:isDemoMode()});
        await issueSession(response,"admin",result.providerId,result.contact,result.token,result.expiresAt);
        return response;
      }
      await limitAuth(action,contact,action==="send-otp"?5:10);
      if (action==="send-otp") {
        let demoCode: string | undefined;
        if (isDemoMode()) demoCode=demoAuth().otp(contact);
        else {
          const {error}=await authClient().auth.signInWithOtp(contact.includes("@")?{email:contact,options:{shouldCreateUser:body.purpose!=="recovery"}}:{phone:contact,options:{shouldCreateUser:body.purpose!=="recovery"}});
          if(error) throw new AuthError("Could not send verification. Try again later.",400);
        }
        return NextResponse.json({success:true,channel:contact.includes("@")?"email":"phone",destination:contact.includes("@")?contact.replace(/^(.).*(@.*)$/,"$1***$2"):contact.slice(0,3)+"****"+contact.slice(-3),...(demoCode?{demoCode,demo:true}:{}),expiresAt:Date.now()+600000}, {headers:{"Cache-Control":"no-store"}});
      }
      if(action==="login" && (typeof body.password!=="string" || !body.password || body.password.length>256))throw new AuthError("Invalid credentials.");
      let id: string, token: string | undefined, expires: number | undefined;
      if (isDemoMode()) {
        const account=action==="verify-otp"?demoAuth().verify(contact,String(body.code||"")):demoAuth().login(contact,body.password||"",false);
        id=account.id;
      } else {
        const client=authClient();
        const result=action==="verify-otp"
          ? await client.auth.verifyOtp(contact.includes("@")?{email:contact,token:String(body.code||""),type:"email"}:{phone:contact,token:String(body.code||""),type:"sms"})
          : await client.auth.signInWithPassword(contact.includes("@")?{email:contact,password:body.password||""}:{phone:contact,password:body.password||""});
        if(result.error || !result.data.session || !result.data.user) throw new AuthError("Invalid credentials or verification code.");
        const user=result.data.user;
        if(!user.email_confirmed_at && !user.phone_confirmed_at) throw new AuthError("Verify your contact before signing in.");
        id=user.id; token=result.data.session.access_token; expires=result.data.session.expires_at;
      }
      const response=NextResponse.json({success:true});
      await issueSession(response,"customer",id,contact,token,expires,action==="verify-otp");
      if(action==="verify-otp") return response;
      // Resolve the profile from the new cookie, never a browser-supplied identifier.
      const headers=new Headers(req.headers);
      const cookie=response.cookies.get("tethera_customer_token")!;
      headers.set("cookie",cookie.name+"="+cookie.value);
      const user=await customerProfile(new NextRequest(req.url,{headers}));
      return withCookies(NextResponse.json({success:true,user,demo:isDemoMode()}),response);
    } catch(error) { return authResponse(error); }
  };
}
function withCookies(target:NextResponse, source:NextResponse) {
  for(const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  target.headers.set("Cache-Control","no-store"); return target;
}
