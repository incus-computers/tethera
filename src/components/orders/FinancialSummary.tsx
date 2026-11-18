"use client";
import React from "react";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
import { invoiceAmounts, type InvoiceDownloadData } from "@/lib/utils/invoiceDownload";
import { formatRupiah } from "@/lib/utils/currency";
/** Shared order totals, preserving the committed line-level rounding. */
export function FinancialSummary({order}:{order:any}){
 const {t,locale}=useTranslation();
 const document:InvoiceDownloadData={orderNumber:order.orderNumber||order.order_number,subtotal:order.subtotal??0,assemblyFee:order.assemblyFee??order.assembly_fee??0,shippingFee:order.shippingFee??order.shipping_fee??0,discountAmount:order.discountAmount??order.discount_amount??0,grandTotal:order.grandTotal??order.total??0,financialSnapshot:order.financialSnapshot??order.financial_snapshot};
 let a;try{a=invoiceAmounts(document);}catch{return <p role="alert">{t("Financial breakdown unavailable. Please contact support.")}</p>;}
 const row=(label:string,value:number)=><div className="flex justify-between gap-4"><span>{t(label)}</span><span>{formatRupiah(value)}</span></div>;
 return <div className="space-y-2 text-xs">
 {row("Merchandise",a.subtotal)}{row("Assembly",a.assemblyFee)}{row("Shipping",a.shippingFee)}{row("Discount",-a.discountAmount)}
 {a.taxPolicy?<>{row("Amount before included tax",a.net!)}{row(a.taxPolicy.mode==="not_collected"?t("Tax not collected"):`${locale==="id"?"Pajak termasuk":t("Included tax")} (${a.taxPolicy.rateBps/100}% ${locale==="id"?"efektif":"effective"})`,a.tax!)}</>:<p>{t("Historical tax breakdown unavailable.")}</p>}
 <div className="pt-2 border-t border-current font-bold">{row("Order total",a.grandTotal)}</div>
 </div>;
}
