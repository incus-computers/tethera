import crypto from "crypto";
import { isDemoMode } from "@/lib/runtime/environment";
const state=globalThis as typeof globalThis & {__demoTrackingKey?:string};
function signingKey(explicit?:string) {
 if(explicit)return explicit;
 if(isDemoMode())return state.__demoTrackingKey ||= crypto.randomBytes(32).toString("hex");
 const key=process.env.TRACKING_TOKEN_SECRET;
 if(!key || key.length<32)throw new Error("TRACKING_TOKEN_SECRET must contain at least 32 random characters.");
 return key;
}
export function generateGuestTrackingToken(orderNumber:string,customerEmail:string,secretKey?:string,expiresAt=Math.floor(Date.now()/1000)+2592000):string {
 const number=orderNumber.trim().toUpperCase();
 const signature=crypto.createHmac("sha256",signingKey(secretKey)).update(number+":"+customerEmail.trim().toLowerCase()+":"+expiresAt).digest("hex");
 return number+"."+expiresAt+"."+signature;
}
export function verifyGuestTrackingToken(token:string,orderNumber:string,customerEmail:string,secretKey?:string):boolean {
 try {
  if(!token || token.length>512)return false;
  const parts=token.split(".");
  if(parts.length!==3 || parts[0]!==orderNumber.trim().toUpperCase() || !/^\d+$/.test(parts[1]) || Number(parts[1])<=Date.now()/1000 || !/^[a-f0-9]{64}$/.test(parts[2]))return false;
  const expected=generateGuestTrackingToken(orderNumber,customerEmail,secretKey,Number(parts[1]));
  return crypto.timingSafeEqual(Buffer.from(token),Buffer.from(expected));
 }catch{return false;}
}
