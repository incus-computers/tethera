import "server-only";
import { isDemoMode } from "@/lib/runtime/environment";
import { CheckoutError } from "@/lib/checkout/errors";
import type { CommercialTaxPolicy } from "@/lib/checkout/financials";
export function commercialTaxPolicy():CommercialTaxPolicy{
 if(isDemoMode()){
  const raw=process.env.DEMO_TAX_EFFECTIVE_RATE_BPS??"1100",rateBps=Number(raw);
  if(!/^\d+$/.test(raw)||!Number.isInteger(rateBps)||rateBps<0||rateBps>10000)throw new CheckoutError("Invalid demo effective tax rate.",503);
  return {code:rateBps===1100?"demo-effective-11":`demo-effective-${rateBps}`,rateBps,mode:rateBps===0?"not_collected":"inclusive"};
 }
 const code=process.env.TAX_POLICY_ID||"",mode=process.env.TAX_COLLECTION_MODE,bps=Number(process.env.TAX_EFFECTIVE_RATE_BPS);
 if(process.env.TAX_POLICY_CONFIRMED!=="true"||!/^\w[\w.-]{0,79}$/.test(code)||!["inclusive","not_collected"].includes(mode||"")||!/^\d+$/.test(process.env.TAX_EFFECTIVE_RATE_BPS||"")||!Number.isInteger(bps)||bps<0||bps>10000||(mode==="not_collected"&&bps!==0))throw new CheckoutError("The store's tax setup needs confirmation before checkout is enabled.",503);
 return {code,rateBps:bps,mode:mode as CommercialTaxPolicy["mode"]};
}
