/**
 * Indonesian Tax Calculation Engine (PPN / VAT)
 * Complies with Indonesian Law on Harmonization of Tax Regulations (UU HPP).
 * Default PPN rate is 11% (0.11), with support for 12% (0.12).
 */

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
  const safeGross = Math.max(0, Math.round(grossAmount));
  const safeRate = rate > 0 ? rate : DEFAULT_PPN_RATE;

  const dpp = Math.round(safeGross / (1 + safeRate));
  const taxAmount = safeGross - dpp;

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
  const safeNet = Math.max(0, Math.round(netAmount));
  const safeRate = rate > 0 ? rate : DEFAULT_PPN_RATE;

  const taxAmount = Math.round(safeNet * safeRate);
  const grossAmount = safeNet + taxAmount;

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
  const rate = params.taxRate !== undefined && params.taxRate > 0 ? params.taxRate : DEFAULT_PPN_RATE;
  const isInclusive = params.isInclusive ?? true;
  const shippingFee = Math.max(0, Math.round(params.shippingFee || 0));
  const assemblyFee = Math.max(0, Math.round(params.assemblyFee || 0));
  const discountAmount = Math.max(0, Math.round(params.discountAmount || 0));

  let itemsGross = 0;
  const lineItems: OrderTaxLineItem[] = [];

  for (const it of params.items) {
    const qty = Math.max(1, Math.round(it.quantity || 1));
    const unitPrice = Math.max(0, Math.round(it.unitPrice || 0));
    const lineTotal = unitPrice * qty;
    itemsGross += lineTotal;

    if (isInclusive) {
      const unitTaxRes = calculateInclusiveTax(unitPrice, rate);
      const lineTaxRes = calculateInclusiveTax(lineTotal, rate);
      lineItems.push({
        id: it.id,
        name: it.name,
        unitPrice,
        quantity: qty,
        lineTotal,
        unitDpp: unitTaxRes.dpp,
        lineDpp: lineTaxRes.dpp,
        lineTax: lineTaxRes.taxAmount,
        taxRate: rate,
      });
    } else {
      const unitTaxRes = calculateExclusiveTax(unitPrice, rate);
      const lineTaxRes = calculateExclusiveTax(lineTotal, rate);
      lineItems.push({
        id: it.id,
        name: it.name,
        unitPrice,
        quantity: qty,
        lineTotal: lineTaxRes.grossAmount,
        unitDpp: unitTaxRes.dpp,
        lineDpp: lineTaxRes.dpp,
        lineTax: lineTaxRes.taxAmount,
        taxRate: rate,
      });
    }
  }

  // Subtotal includes hardware items plus custom assembly fees
  const grossSubtotal = itemsGross + assemblyFee;
  const subtotalTaxRes = isInclusive
    ? calculateInclusiveTax(grossSubtotal, rate)
    : calculateExclusiveTax(grossSubtotal, rate);

  const grandTotal = Math.max(0, grossSubtotal + shippingFee - discountAmount);

  return {
    grossSubtotal,
    dpp: subtotalTaxRes.dpp,
    taxAmount: subtotalTaxRes.taxAmount,
    taxRate: rate,
    shippingFee,
    assemblyFee,
    discountAmount,
    grandTotal,
    lineItems,
  };
}
