import "server-only";
import { isDemoMode } from "@/lib/runtime/environment";
export class ShippingError extends Error{constructor(message:string,public status=503){super(message);}}
export function shippingConfig(){
 if(isDemoMode())throw new ShippingError("Demo does not contact shipping providers.");
 const key=process.env.BITESHIP_API_KEY||"",mode=process.env.BITESHIP_ENV;
 if(!["test","production"].includes(mode||"") || !key.startsWith(mode==="test"?"biteship_test.":"biteship_live."))throw new ShippingError("Shipping credentials do not match the configured environment.");
 if(process.env.BITESHIP_BASE_URL && process.env.BITESHIP_BASE_URL!=="https://api.biteship.com/v1")throw new ShippingError("Shipping API origin is invalid.");
 if((mode==="production" && (process.env.BITESHIP_PRODUCTION_ENABLED!=="true" || process.env.APP_ENV!=="production" || process.env.NODE_ENV!=="production")) || (process.env.APP_ENV==="production" && mode!=="production"))throw new ShippingError("Production shipping is not enabled.");
 return {key,mode:mode!,url:"https://api.biteship.com/v1"};
}
export async function shippingRequest(path:string,body?:unknown){
 const c=shippingConfig();let r:Response;
 try{r=await fetch(c.url+path,{method:body?"POST":"GET",headers:{Authorization:c.key,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000)});}catch{throw new ShippingError("Shipping provider outcome is unknown. Reconcile the existing dispatch before retrying.");}
 let data:any;try{const text=await r.text();if(text.length>200000)throw new Error();data=JSON.parse(text);}catch{throw new ShippingError("Invalid shipping provider response. Reconciliation required.");}
 if(!r.ok || !data?.success)throw new ShippingError("Shipping provider did not confirm the request. Reconciliation may be required.");return data;
}
export const SHIPMENT_STATUSES=["confirmed","scheduled","allocated","picking_up","picked","in_transit","dropping_off","delivered","cancelled","rejected","failed","returned"];
export function safeShippingUrl(value:unknown){try{const u=new URL(String(value));return u.protocol==="https:"&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function shipmentEvidence(data:any,reference:string,expectedId?:string){
 if(!data || data.success!==true || typeof data.id!=="string" || !data.id || data.id.length>100 || (expectedId&&data.id!==expectedId) || data.reference_id!==reference || !SHIPMENT_STATUSES.includes(data.status))throw new ShippingError("Shipment identity or status does not match this dispatch.",409);
 if(data.currency!=null&&data.currency!=="IDR")throw new ShippingError("Invalid carrier currency.",409);
 const c=data.courier||{},price=data.price??c.shipment_fee;
 const insurance=c.insurance,insured=insurance?.amount,fee=insurance?.fee;
 for(const value of [insured,fee])if(value!=null&&(typeof value!=="number"||!Number.isSafeInteger(value)||value<0))throw new ShippingError("Invalid provider insurance evidence.",409);
 if(price!=null && (typeof price!=="number" || !Number.isSafeInteger(price)||price<0))throw new ShippingError("Invalid carrier charge.",409);
 const text=(v:unknown)=>typeof v==="string"&&v.length<=300?v:null;
 return {provider_id:data.id,reference_id:reference,status:data.status,waybill_id:text(c.waybill_id),tracking_id:text(c.tracking_id),tracking_url:safeShippingUrl(c.link),driver_name:text(c.driver_name),driver_phone:text(c.driver_phone),vehicle_plate:text(c.driver_plate_number),carrier_cost:price??null,insured_value:insured??null,insurance_fee:fee??null};
}
export async function retrieveShipment(id:string,reference:string){if(!id||id.length>100)throw new ShippingError("Provider shipment ID is required.",409);return shipmentEvidence(await shippingRequest("/orders/"+encodeURIComponent(id)),reference,id);}
