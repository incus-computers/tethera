import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest,NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { normalizeCheckout,priceBasket } from "@/lib/checkout/catalog";
import { CheckoutError } from "@/lib/checkout/errors";
import { biteship } from "@/lib/shipping/biteship";
import { declaredValue } from "@/lib/shipping/packages";
import { ShippingError } from "@/lib/shipping/gateway";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
export const POST=withApiProtection(withAccess(async(req:NextRequest)=>{
 try{
  const input=normalizeCheckout(await req.json(),true);if(!input.address)throw new CheckoutError("Delivery address required.");
  const basket=await priceBasket(input),value=declaredValue(basket.packages);
  const rates=await biteship.getRates({destination:{...input.address,address:input.address.street},items:basket.packages,insuranceValue:value,requireLive:true});
  return NextResponse.json({success:true,rates:rates.filter(rate=>rate.isAvailable),insuranceValue:value,packages:basket.packages});
 }catch(error){return databaseFailureResponse(error)||NextResponse.json({success:false,error:error instanceof CheckoutError||error instanceof ShippingError?error.message:"Shipping options are temporarily unavailable."},{status:error instanceof CheckoutError||error instanceof ShippingError?error.status:503});}
}));
