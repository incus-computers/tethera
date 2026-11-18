"use client";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
import { Suspense,useEffect,useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { downloadInvoiceFile,fetchInvoiceDocument,type InvoiceDownloadData } from "@/lib/utils/invoiceDownload";
import { FinancialSummary } from "@/components/orders/FinancialSummary";
import { formatRupiah } from "@/lib/utils/currency";
function OrderSuccessContent(){
  const {t}=useTranslation();
 const params=useSearchParams(),number=params?.get("orderNumber")||"";
 const [order,setOrder]=useState<InvoiceDownloadData|null>(null),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;setOrder(null);setError("");if(!number){setError("Choose an order from your transactions to view its details.");return;}
 fetchInvoiceDocument(number).then(data=>{if(active)setOrder(data);}).catch(err=>{if(active)setError(err.message);});return()=>{active=false;};},[number]);
 async function download(){setBusy(true);setError("");try{downloadInvoiceFile(await fetchInvoiceDocument(number));}catch(err){setError(err instanceof Error?err.message:"Invoice unavailable.");}finally{setBusy(false);}}
 async function resend(){setBusy(true);setError("");setMessage("");try{const r=await fetch("/api/orders/invoice/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber:number})});const data=await r.json();if(!r.ok||!data.success)throw new Error(data.error||data.detail||"Email dispatch failed.");setMessage("Invoice email queued.");}catch(err){setError(err instanceof Error?err.message:"Email unavailable.");}finally{setBusy(false);}}
 return <main className="min-h-screen bg-slate-50 dark:bg-zinc-950 px-4 py-12 text-slate-900 dark:text-zinc-100"><div className="max-w-3xl mx-auto space-y-6">
 {error&&<p role="alert" className="p-4 border border-red-400 rounded-xl">{t(error)}</p>}
 {!order&&!error&&<p>{t("Loading your order...")}</p>}
 {order&&<>
 <section className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 space-y-4">
 <h1 className="text-2xl font-bold">{order.paidAt?t("Payment received"):t("Order received")}</h1>
 <p className="font-mono">{order.orderNumber}</p><p>{t("Order status:")}{order.status?.replaceAll("_"," ")}</p>
 <p>{order.paidAt?t("Your payment has been recorded. Track your order for fulfillment and refund updates."):t("Your payment is not confirmed yet. Check your payment page or order tracking before paying again.")}</p>
 {order.paymentId&&<p>{t("Payment reference:")}{order.paymentId}</p>}
 <p>{order.customer?.name}<br/>{order.customer?.email}</p>
 <p>{order.fulfillmentMethod==="click_and_collect"?t("Click & collect"):`${order.shippingAddress?.street||""}, ${order.shippingAddress?.city||""}`}</p>
 <div className="flex flex-wrap gap-3 print:hidden">
 <button onClick={download} disabled={busy} className="rounded-lg bg-emerald-700 text-white px-4 py-3 disabled:opacity-50">{t("Download invoice")}</button>
 <button onClick={resend} disabled={busy} className="rounded-lg border px-4 py-3 disabled:opacity-50">{t("Resend invoice email")}</button>
 <button onClick={()=>window.print()} className="rounded-lg border px-4 py-3">{t("Print")}</button>
 <button onClick={()=>navigator.clipboard.writeText(order.orderNumber).then(()=>setMessage("Order number copied."))} className="rounded-lg border px-4 py-3">{t("Copy order number")}</button>
 </div>{message&&<p role="status">{t(message)}</p>}
 </section>
 <section className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 space-y-6">
 <h2 className="font-bold">{t("Commercial order breakdown")}</h2><div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead><tr><th className="py-3">{t("Item / service")}</th><th>{t("Qty")}</th><th>{t("Unit price")}</th><th>{t("Discount")}</th><th>{t("After discount")}</th><th>{t("Before included tax")}</th><th>{t("Included tax")}</th></tr></thead><tbody>
 {order.financialSnapshot?order.financialSnapshot.lines.map(l=><tr key={l.index} className="border-t border-slate-200 dark:border-zinc-800"><td className="py-3 pr-3">{l.name}<small className="block">{l.sku}</small></td><td>{l.quantity}</td><td>{formatRupiah(l.unitPrice)}</td><td>{formatRupiah(l.discount)}</td><td>{formatRupiah(l.gross)}</td><td>{formatRupiah(l.net)}</td><td>{formatRupiah(l.tax)}</td></tr>):order.items?.map(l=><tr key={l.id}><td className="py-3">{l.name}</td><td>{l.quantity}</td><td>{formatRupiah(l.price)}</td><td>{t("Unavailable")}</td><td>{formatRupiah(l.price*l.quantity)}</td><td>{t("Unavailable")}</td><td>{t("Unavailable")}</td></tr>)}
 {order.financialSnapshot&&<tr className="border-t"><td className="py-3">{t("Shipping")}</td><td>1</td><td>{formatRupiah(order.financialSnapshot.shipping.beforeDiscount)}</td><td>{formatRupiah(order.financialSnapshot.shipping.discount)}</td><td>{formatRupiah(order.financialSnapshot.shipping.gross)}</td><td>{formatRupiah(order.financialSnapshot.shipping.net)}</td><td>{formatRupiah(order.financialSnapshot.shipping.tax)}</td></tr>}
 </tbody></table></div><FinancialSummary order={order}/><p className="text-xs text-slate-500">{t("Commercial order record. Any legally required tax invoice is issued separately.")}</p>
 </section></>}
 <div className="flex gap-6 print:hidden"><Link href="/transactions" className="underline">{t("My transactions")}</Link><Link href={`/orders/track?orderNumber=${encodeURIComponent(number)}`} className="underline">{t("Track order")}</Link><Link href="/" className="underline">{t("Continue shopping")}</Link></div>
 </div></main>;
}
export default function OrderSuccessPage(){
  const {t}=useTranslation();return <Suspense fallback={<p>{t("Loading order...")}</p>}><OrderSuccessContent/></Suspense>;}
