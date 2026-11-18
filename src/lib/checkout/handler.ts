import { safeFailure } from "@/lib/operations/telemetry";
import { TETHERA_WAREHOUSE_ORIGIN } from "@/lib/shipping/biteship";
import { randomUUID, randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { generateGuestTrackingToken } from "@/lib/utils/orderTracking";
import { CheckoutError } from "./errors";
import { normalizeCheckout, checkoutFingerprint } from "./catalog";
import { priceCheckout, checkoutSummary } from "./pricing";
import { checkoutRepository } from "./repository";
import { getStorefrontProfile, validatePolicyAcceptance } from "@/lib/storefront/profile";

function response(result: any) {
  const o = result.order;
  return NextResponse.json({ success:true, orderId:o.id, orderNumber:o.order_number, subtotal:o.subtotal, assemblyFee:o.assembly_fee,
    trackingToken:generateGuestTrackingToken(o.order_number,o.customer_email,undefined,Math.floor(new Date(o.created_at).getTime()/1000)+2592000),
    shippingFee:o.shipping_fee, discountAmount:o.discount_amount, total:o.total, pickupCode:o.pickup_code,
    tax:{dpp:o.dpp_amount,taxAmount:o.tax_amount,taxRate:o.tax_rate},financialSnapshot:o.financial_snapshot,
    items:result.items.map((i:any)=>({id:i.id,productId:i.product_id,name:i.product_title_snapshot,sku:i.sku_snapshot,price:i.unit_price,quantity:i.quantity,taxAmount:i.tax_amount_snapshot,discount:i.discount_snapshot,grossTotal:i.gross_total_snapshot,build:i.checkout_metadata?.build})) });
}
export function checkoutHandler(quote = false) {
  return async (req: NextRequest) => {
    try {
      if (Number(req.headers.get("content-length") || 0) > 200000) throw new CheckoutError("Checkout request too large.",413);
      let body;
      try { const raw=await req.text();if(raw.length>200000)throw new CheckoutError("Checkout request too large.",413);body=JSON.parse(raw); }
      catch (error) { if(error instanceof CheckoutError)throw error;throw new CheckoutError("Invalid JSON body."); }
      const input = normalizeCheckout(body);
      const key = req.headers.get("Idempotency-Key") || "";
      if (!quote && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new CheckoutError("A UUID v4 Idempotency-Key is required.");
      const fingerprint = checkoutFingerprint(input), owner = input.customer.customerId;
      if (!quote) { const replay=await checkoutRepository.replay(owner,key.toLowerCase(),fingerprint);if(replay)return response(replay); }
      const p = await priceCheckout(input);
      const storefront=getStorefrontProfile();
      if (quote) return NextResponse.json({success:true,...checkoutSummary(p),policy:{version:storefront.policyVersion,hash:storefront.policyHash,status:storefront.status}});
      if (input.expectedTotal === null || input.expectedTotal !== p.total) return NextResponse.json({success:false,error:"Prices or shipping changed. Review the current quote before placing the order.",quote:checkoutSummary(p)},{status:409});
      const receipt=validatePolicyAcceptance(input.policyAcceptance,storefront,input.fulfillmentType==="click_and_collect");
      p.lines[0].checkout_metadata={...p.lines[0].checkout_metadata,policyReceipt:receipt};
      const order:any = { id:randomUUID(), order_number:`TET-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${randomUUID().toUpperCase()}`,
        created_at:new Date().toISOString(), customer_id:owner, customer_name:input.customer.name,customer_email:input.customer.email,customer_phone:input.customer.phone,
        fulfillment_type:input.fulfillmentType,pickup_store_id:input.address?null:"00000000-0000-0000-0000-000000000001",pickup_code:input.address?null:String(randomInt(1000,10000)),
        shipping_address:input.address,courier_info:p.rate?{provider:"biteship",courier_company:p.rate.courierId,service_code:p.rate.serviceCode,service_name:p.rate.serviceName,estimated_arrival:p.rate.etd,status:"pending",quote_items:p.packages,quote_insurance:{value:p.rate.insuranceValue??0,fee:p.rate.insuranceFee??0,policy:"full_goods_value"},quote_origin:TETHERA_WAREHOUSE_ORIGIN,quoted_at:new Date().toISOString(),destination_routing:"postal_code"}:null,
        subtotal:p.subtotal,assembly_fee:p.assemblyFee,shipping_fee:p.shippingFee,discount_amount:p.discount,promo_code:p.promotion?.code || null,total:p.total,
        dpp_amount:p.dpp,tax_amount:p.taxAmount,tax_rate:p.financial.taxPolicy.rateBps/10000,financial_snapshot:p.financial,shipping_tax_amount:p.shippingTax,status:"pending_payment",payment_method:null,payment_reference:null,notes:input.notes || null };
      const result=await checkoutRepository.commit(owner,key.toLowerCase(),fingerprint,order,p);
      return response(result);
    } catch(error) {
      if(error instanceof CheckoutError)return NextResponse.json({success:false,error:error.message},{status:error.status,headers:{"Cache-Control":"no-store",...(error.status===503?{"Retry-After":"5"}:{})}});
      const failure=databaseFailureResponse(error);if(failure)return failure;
      safeFailure();
      return NextResponse.json({success:false,error:"Checkout could not be completed. Retry with the same checkout key."},{status:500});
    }
  };
}
