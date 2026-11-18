/** Commercial effective-rate arithmetic. Merchant tax treatment requires separate review. */
import { idr,rateBps,splitIncluded,allocateIdr } from "@/lib/checkout/financials";

export const DEFAULT_PPN_RATE = 0.11;

export interface TaxCalculationResult {
  grossAmount: number;
  dpp: number; // Dasar Pengenaan Pajak (Tax Base)
  taxAmount: number; // Pajak Pertambahan Nilai (PPN)
  taxRate: number;
  isInclusive: boolean;
}

export interface OrderTaxLineItemInput {
  id?: string;
  name?: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderTaxLineItem {
  id?: string;
  name?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  unitDpp: number;
  lineDpp: number;
  lineTax: number;
  taxRate: number;
}

export interface OrderTaxBreakdown {
  grossSubtotal: number;
  dpp: number;
  taxAmount: number;
  taxRate: number;
  shippingFee: number;
  assemblyFee: number;
  discountAmount: number;
  grandTotal: number;
  lineItems: OrderTaxLineItem[];
}

/**
 * Calculates DPP (Tax Base) and PPN from a tax-inclusive gross amount.
 * In Indonesian retail e-commerce, consumer prices are inclusive of PPN by default.
 */
export function calculateInclusiveTax(
  grossAmount: number,
  rate: number = DEFAULT_PPN_RATE
): TaxCalculationResult {
  const safeGross=idr(grossAmount),safeRate=rate;
  const split=splitIncluded(safeGross,rateBps(safeRate)),dpp=split.net,taxAmount=split.tax;

  return {
    grossAmount: safeGross,
    dpp,
    taxAmount,
    taxRate: safeRate,
    isInclusive: true,
  };
}

/**
 * Calculates PPN and gross amount from a tax-exclusive net base.
 */
export function calculateExclusiveTax(
  netAmount: number,
  rate: number = DEFAULT_PPN_RATE
): TaxCalculationResult {
  const safeNet=idr(netAmount),safeRate=rate;
  const taxAmount=Number((BigInt(safeNet)*BigInt(rateBps(rate))+BigInt(5000))/BigInt(10000));
  const grossAmount=idr(safeNet+taxAmount);

  return {
    grossAmount,
    dpp: safeNet,
    taxAmount,
    taxRate: safeRate,
    isInclusive: false,
  };
}

/**
 * Computes a detailed order-level tax breakdown including line-item DPP and PPN snapshots.
 */
export function calculateOrderTaxBreakdown(params: {
  items: OrderTaxLineItemInput[];
  shippingFee?: number;
  assemblyFee?: number;
  discountAmount?: number;
  taxRate?: number;
  isInclusive?: boolean;
}): OrderTaxBreakdown {
  const rate=params.taxRate??DEFAULT_PPN_RATE,bps=rateBps(rate),inclusive=params.isInclusive??true;
  const quantity=(n:number)=>{if(!Number.isInteger(n)||n<1||n>100)throw new Error("Invalid quantity.");return n;};
  const gross=(n:number)=>inclusive?idr(n):calculateExclusiveTax(n,rate).grossAmount;
  const raw=params.items.map(item=>gross(idr(item.unitPrice)*quantity(item.quantity))),assemblyFee=gross(params.assemblyFee??0),shippingFee=gross(params.shippingFee??0),discountAmount=idr(params.discountAmount??0);
  const parts=raw.concat(assemblyFee,shippingFee),discounts=allocateIdr(discountAmount,parts),splits=parts.map((n,i)=>splitIncluded(n-discounts[i],bps));
  const lineItems=params.items.map((item,i)=>({id:item.id,name:item.name,unitPrice:item.unitPrice,quantity:item.quantity,lineTotal:splits[i].gross,unitDpp:splitIncluded(gross(item.unitPrice),bps).net,lineDpp:splits[i].net,lineTax:splits[i].tax,taxRate:rate}));
  return {grossSubtotal:raw.reduce((a,b)=>a+b,0)+assemblyFee,dpp:splits.reduce((sum,l)=>sum+l.net,0),taxAmount:splits.reduce((sum,l)=>sum+l.tax,0),taxRate:rate,shippingFee,assemblyFee,discountAmount,grandTotal:splits.reduce((sum,l)=>sum+l.gross,0),lineItems};
}
