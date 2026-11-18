import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { normalizeIndonesianPhone, formatIndonesiaDate } from "@/lib/i18n/indonesia";
import { translate } from "@/lib/i18n/messages";
import { businessConfig } from "@/lib/storefront/businessConfig";
import { getStorefrontProfile, parseStorefrontProfile, policyAcceptance, policySnapshot, validatePolicyAcceptance } from "@/lib/storefront/profile";
import { GET as storefrontGET } from "@/app/api/storefront/route";
import { POST as quote } from "@/app/api/checkout/quote/route";
import { POST as create } from "@/app/api/checkout/create-order/route";
import { db } from "@/lib/db";
import { useLocationStore } from "@/lib/store/useLocationStore";
import { validCustomerLocation } from "@/lib/shipping/locationValidation";
import { profilePatch } from "@/lib/auth/customer";
import { GET as geocode } from "@/app/api/shipping/google/geocode/route";

beforeEach(()=>{process.env.APP_ENV="demo";});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("Indonesian contact, locale and date behavior",()=>{
 it.each(["0817 0815555","+62 817 0815555","628170815555"])("normalizes %s without inventing a contact",phone=>{
  expect(normalizeIndonesianPhone(phone)).toBe("+628170815555");
 });
 it.each(["+1 2125550100","12345","+6208170815555","phone@example.test","00000000000","0817<script>"])("rejects invalid/non-Indonesian contact %s",phone=>{
  expect(()=>normalizeIndonesianPhone(phone)).toThrow();
 });
 it("normalizes profile updates and rejects a foreign checkout contact",()=>{
  expect(profilePatch({phone:"0817 0815555"})).toMatchObject({phone:"+628170815555"});
  expect(()=>profilePatch({phone:"+1 2125550100"})).toThrow();
 });
 it("formats dates in an explicit Indonesian time zone, including UTC day rollover",()=>{
  expect(formatIndonesiaDate("2026-11-08T18:30:00Z","id")).toContain("9 Nov 2026");
  expect(formatIndonesiaDate("2026-11-08T18:30:00Z","id")).toContain("01.30 WIB");
  expect(formatIndonesiaDate("2026-11-08T18:30:00Z","en","Asia/Makassar")).toContain("02:30 WITA");
  expect(formatIndonesiaDate("invalid","id")).toBe("Belum tersedia");
 });
 it("has reviewed checkout translations and an unchanged English option",()=>{
  expect(translate("Review current total","id")).toBe("Periksa total terkini");
  expect(translate("Add to Shopping Cart","id")).toBe("Tambahkan ke Keranjang");
  expect(translate("Review current total","en")).toBe("Review current total");
  expect(translate("Corsair Vengeance RGB","id")).toBe("Corsair Vengeance RGB");
 });
 it("starts without a fabricated destination and ignores old unconfirmed cached locations",()=>{
  useLocationStore.setState({userLocation:null,recentLocations:[],selectedRate:null});
  const storage=new Map([["tethera_user_location",JSON.stringify({address:"SCBD",city:"Jakarta"})]]);
  vi.stubGlobal("window",{});vi.stubGlobal("localStorage",{getItem:(k:string)=>storage.get(k)||null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});
  useLocationStore.getState().initLocation();expect(useLocationStore.getState().userLocation).toBeNull();
  expect(()=>useLocationStore.getState().setLocation({address:"SCBD"})).toThrow();
  const location={address:"Alamat yang dipilih pelanggan",subdistrict:"Senayan",city:"Jakarta Selatan",province:"DKI Jakarta",postalCode:"12190"};
  expect(validCustomerLocation(location)).toBe(true);useLocationStore.getState().setLocation(location);
  expect(useLocationStore.getState().userLocation).not.toHaveProperty("latitude");
  expect(JSON.parse(storage.get("tethera_user_location_v2")!).confirmed).toBe(true);
  useLocationStore.getState().clearLocation();expect(useLocationStore.getState().userLocation).toBeNull();
 });
 it("returns an honest lookup failure instead of inventing a Jakarta address or coordinates",async()=>{
  vi.stubEnv("APP_ENV","staging");vi.stubGlobal("fetch",vi.fn(async()=>new Response("{}",{status:503})));
  const result=await geocode(new NextRequest("http://localhost:3000/api/shipping/google/geocode?lat=-6.2&lng=106.8"));
  expect(result.status).toBe(503);expect(await result.json()).not.toHaveProperty("location");
  const invalid=await geocode(new NextRequest("http://localhost:3000/api/shipping/google/geocode?lat=90&lng=180"));expect(invalid.status).toBe(400);
 });
 it("rejects a provider result outside Indonesia instead of relabelling it as an Indonesian destination",async()=>{
  vi.stubEnv("APP_ENV","staging");vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({display_name:"Foreign address",address:{country_code:"my",city:"Foreign city"}}),{headers:{"Content-Type":"application/json"}})));
  expect((await geocode(new NextRequest("http://localhost:3000/api/shipping/google/geocode?lat=3&lng=101"))).status).toBe(400);
 });
});

describe("merchant configuration and reviewed policy boundary",()=>{
 it("uses merchant-supplied contact details, leaves opening hours unset and keeps starter policies in draft",()=>{
  vi.stubEnv("APP_ENV","staging");vi.stubEnv("STOREFRONT_BUSINESS_JSON","");
  expect(getStorefrontProfile()).toMatchObject({status:"draft",legalName:"Incus Computers",supportEmail:"incuscomputers@gmail.com",whatsapp:"628170815555",pickupAddress:"Mangga Dua Mall Lt. 3 No. 36, 10730",openingHours:null});
  expect(()=>validatePolicyAcceptance(null,getStorefrontProfile(),false)).toThrow("not yet published");
 });
 it("publishes only explicitly reviewed, versioned documents and does not expose reviewer/configuration fields",()=>{
  const input={...businessConfig,policiesReviewed:true,reviewedBy:"Merchant fixture",effectiveDate:"2026-11-08",openingHours:"Fixture hours"};
  const profile=parseStorefrontProfile(JSON.stringify(input));
  expect(profile.status).toBe("published");expect(profile).not.toHaveProperty("reviewedBy");
  expect(validatePolicyAcceptance(policyAcceptance(profile),profile,true).snapshot.documents.terms.id.sections.length).toBeGreaterThan(0);
 });
 it("fails closed for corrupt config, unsafe contact links and incomplete policy translations",()=>{
  for(const config of [{...businessConfig,supportEmail:"bad\r\nvalue"},{...businessConfig,whatsapp:"javascript:alert(1)"},{...businessConfig,documents:{}},{...businessConfig,timeZone:"arbitrary"}])expect(()=>parseStorefrontProfile(JSON.stringify(config))).toThrow();
  vi.stubEnv("APP_ENV","staging");vi.stubEnv("STOREFRONT_BUSINESS_JSON","{broken");expect(getStorefrontProfile().status).toBe("unconfigured");
 });
 it("uses non-binding demo policies and requires an explicit, current acknowledgement",async()=>{
  const profile=await (await storefrontGET(new NextRequest("http://localhost:3000/api/storefront"))).json();expect(profile.status).toBe("demo");
  expect(()=>validatePolicyAcceptance(null,profile,true)).toThrow("read and accept");
  expect(()=>validatePolicyAcceptance({...policyAcceptance(profile),accepted:false},profile,true)).toThrow();
  expect(()=>validatePolicyAcceptance({...policyAcceptance(profile),hash:"0".repeat(64)},profile,true)).toThrow("changed");
  const receipt=validatePolicyAcceptance(policyAcceptance(profile,"id"),profile,true);
  expect(createHash("sha256").update(JSON.stringify(receipt.snapshot)).digest("hex")).toBe(profile.policyHash);
 });
});

describe("checkout acknowledgement is stored with the transactional order",()=>{
 it("rejects missing or stale acknowledgement before reservations, stores the accepted text and replays the original receipt",async()=>{
  const cookie=`tethera_guest_token=${Buffer.alloc(32,7).toString("base64url")}`;
  const body={customer:{name:"Sukarno",email:"policy-fixture@example.test",phone:"08170815555"},fulfillmentType:"click_and_collect",items:[{id:"cpu-1",quantity:1}]};
  const req=(path:string,data:any,key?:string)=>new NextRequest("http://localhost:3000"+path,{method:"POST",headers:{cookie,"Content-Type":"application/json",...(key?{"Idempotency-Key":key}:{})},body:JSON.stringify(data)});
  const quoted=await quote(req("/api/checkout/quote",body));expect(quoted.status).toBe(200);const q=await quoted.json();
  const before=await db.orders.count();
  expect((await create(req("/api/checkout/create-order",{...body,expectedTotal:q.total},randomUUID()))).status).toBe(400);
  const stale={accepted:true,locale:"id",version:q.policy.version,hash:"0".repeat(64)};
  expect((await create(req("/api/checkout/create-order",{...body,expectedTotal:q.total,policyAcceptance:stale},randomUUID()))).status).toBe(409);
  expect(await db.orders.count()).toBe(before);
  const key=randomUUID(),confirmed={...body,expectedTotal:q.total,policyAcceptance:policyAcceptance(getStorefrontProfile(),"id")};
  const created=await create(req("/api/checkout/create-order",confirmed,key));expect(created.status).toBe(200);const result=await created.json();
  const detail=await db.orders.getOrderWithItems(result.orderId),receipt=detail.items[0].checkout_metadata!.policyReceipt;
  expect(detail.order!.customer_phone).toBe("+628170815555");expect(receipt.locale).toBe("id");expect(receipt.environment).toBe("demo");expect(receipt.snapshot).toEqual(policySnapshot(getStorefrontProfile()));
  expect((await create(req("/api/checkout/create-order",confirmed,key))).status).toBe(200);
  expect((await db.orders.getOrderWithItems(result.orderId)).items[0].checkout_metadata!.policyReceipt).toEqual(receipt);
 });
});
