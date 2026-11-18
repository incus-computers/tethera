import "server-only";
import { db } from "@/lib/db";
import { declaredValue } from "@/lib/shipping/packages";
import { biteship } from "@/lib/shipping/biteship";
import { buildFinancialSnapshot } from "./financials";
import { promotionCustomerUsage } from "./promotionClaims";
import { commercialTaxPolicy } from "@/lib/tax/policy";
import { CheckoutInput, priceBasket, money, integer } from "./catalog";
import { CheckoutError } from "./errors";

export async function priceCheckout(input: CheckoutInput) {
  const basket = await priceBasket(input);
  const store = await db.stores.getFlagshipStore();
  if (!store.is_active || (input.fulfillmentType === "click_and_collect" && !store.is_click_and_collect)) throw new CheckoutError("This fulfillment option is unavailable.",409);
  let rate: any = null, shippingFee = 0;
  if (input.address) {
    let rates;
    try { rates = await biteship.getRates({ requireLive: true, insuranceValue:declaredValue(basket.packages), destination: { ...input.address, address: input.address.street }, items: basket.packages, totalWeightGrams: basket.packages.reduce((n,p)=>n+p.weightGrams*(p.quantity||1),0) }); }
    catch { throw new CheckoutError("Courier quotes are temporarily unavailable. Retry or choose collection.",503); }
    rate = rates.find(r => r.isAvailable && r.courierId === input.rate!.courierId && r.serviceCode === input.rate!.serviceCode);
    if (!rate) throw new CheckoutError("The selected courier service is unavailable. Choose another service.",409);
    shippingFee = money(rate.price, "courier price");
    if (!shippingFee) throw new CheckoutError("Courier returned an invalid price.",503);
  }
  let discount = 0, promotion: any = null,eligibleLineAmounts:number[]=[];
  if (input.promoCode) {
    const result = await db.promotions.validatePromotion(input.promoCode, { subtotal: basket.subtotal, shippingFee, items: basket.eligibleItems, customerEmail: input.customer.email, customerId: input.customer.customerId });
    if (!result.valid) throw new CheckoutError(result.message || "Promotion is not valid.",409);
    promotion = result.promotion;eligibleLineAmounts=result.eligibleLineAmounts||[];
    if(promotion?.max_uses_per_user!=null && input.customer.customerId.startsWith("guest:"))throw new CheckoutError("Sign in to use this customer-limited promotion.",409);
    if (promotion?.max_uses_per_user != null && await promotionCustomerUsage(promotion,input.customer.customerId) >= promotion.max_uses_per_user) throw new CheckoutError("Promotion usage limit reached for this customer.",409);
    discount = integer(result.discountAmount, "promotion amount",0,basket.subtotal+shippingFee);
  }
  const gross = integer(basket.subtotal + basket.assemblyFee + shippingFee, "order total");
  const total = integer(gross - discount, "discounted total", 1);
  // Allocate integer-rupiah discounts across merchandise/service/shipping, preserving the exact total.
  const amounts = basket.lines.map(l=>l.unit_price!*l.quantity!).concat(shippingFee);
  const weights=amounts.map(()=>0);
  if(promotion?.discount_type==="free_shipping")weights[weights.length-1]=shippingFee;
  else if(promotion)basket.eligibleItems.forEach((item,i)=>{weights[item.lineIndex]=eligibleLineAmounts[i]||0;});
  const basis = weights.reduce((a,b)=>a+b,0);
  if (discount>basis) throw new CheckoutError("Promotion exceeds its eligible amount.",409);
  const financial=buildFinancialSnapshot({lines:basket.lines.map((line:any)=>({name:line.product_title_snapshot,sku:line.sku_snapshot,kind:line.product_id?"merchandise":"assembly",unitPrice:line.unit_price,quantity:line.quantity})),shippingFee,discount,discountWeights:weights,taxPolicy:commercialTaxPolicy()});
  basket.lines.forEach((line:any,i)=>{const f=financial.lines[i];line.discount_snapshot=f.discount;line.gross_total_snapshot=f.gross;line.tax_rate_snapshot=financial.taxPolicy.rateBps/10000;line.tax_amount_snapshot=f.tax;line.checkout_metadata={...line.checkout_metadata,financial_line_index:i};});
  return {...basket,rate,shippingFee,promotion,discount,total,dpp:financial.netAmount,taxAmount:financial.taxAmount,shippingTax:financial.shipping.tax,financial};
}
export function checkoutSummary(p: Awaited<ReturnType<typeof priceCheckout>>) {
  return { subtotal: p.subtotal, assemblyFee: p.assemblyFee, shippingFee: p.shippingFee, discountAmount: p.discount, total: p.total,
    tax: { dpp: p.dpp, taxAmount: p.taxAmount, taxRate: p.financial.taxPolicy.rateBps/10000 }, lines: p.lines, rate: p.rate,financialSnapshot:p.financial };
}
