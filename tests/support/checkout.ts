import { randomBytes, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { POST as create } from "@/app/api/checkout/create-order/route";
import { POST as quote } from "@/app/api/checkout/quote/route";
import { getStorefrontProfile, policyAcceptance } from "@/lib/storefront/profile";

/** Existing feature tests follow the new quote/confirm contract with one browser cookie. */
export async function createOrderPOST(req: NextRequest) {
  const body = await req.json();
  body.policyAcceptance ??= policyAcceptance(getStorefrontProfile(),"en");
  const guest = randomBytes(32).toString("base64url");
  const headers = new Headers(req.headers);
  if (!headers.has("cookie")) headers.set("cookie",`tethera_guest_token=${guest}`);
  const request = (path:string,payload:any) => new NextRequest(new URL(path,req.url),{method:"POST",headers,body:JSON.stringify(payload)});
  if (body.expectedTotal === undefined) {
    const quoted = await quote(request("/api/checkout/quote",body));
    if (!quoted.ok) return quoted;
    body.expectedTotal = (await quoted.json()).total;
  }
  headers.set("Idempotency-Key",randomUUID());
  const response = await create(request("/api/checkout/create-order",body));
  // Return the simulated browser's cookie for subsequent owner-bound charge tests.
  if (response.ok) (response as NextResponse).cookies.set("tethera_guest_token",guest);
  return response;
}
