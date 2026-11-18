import { formatIndonesiaDate } from "@/lib/i18n/indonesia";
/** Printable commercial order document using the committed financial snapshot. */
import { assertFinancialSnapshot, type FinancialSnapshot } from "@/lib/checkout/financials";

export interface InvoiceDownloadData {
  orderNumber: string;
  orderId?: string;
  status?: string;
  paidAt?: string | null;
  financialSnapshot?: FinancialSnapshot | null;
  paymentId?: string;
  paymentChannel?: string;
  createdAt?: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
  fulfillmentMethod?: "delivery" | "click_and_collect";
  shippingAddress?: {
    street: string;
    unit?: string;
    subdistrict: string;
    city: string;
    province?: string;
    postalCode: string;
  };
  courier?: {
    courierName: string;
    serviceName: string;
    price: number;
    etd?: string;
  } | null;
  items?: {
    id: string;
    name: string;
    sku?: string;
    brand?: string;
    price: number;
    quantity: number;
  }[];
  customPCs?: {
    id: string;
    name: string;
    totalPrice: number;
    isPrebuilt?: boolean;
    serviceTier?: {
      name: string;
    };
    parts?: Record<string, { name: string }>;
  }[];
  assemblyFee?: number;
  discountAmount?: number;
  tax?: {dpp:number;taxAmount:number;taxRate:number};
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
}


export function escapeHtml(value:unknown):string{return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));}
export function invoiceAmounts(order:InvoiceDownloadData){
 const f=order.financialSnapshot;
 if(f){assertFinancialSnapshot(f);return {subtotal:f.merchandiseSubtotal,assemblyFee:f.assemblyFee,shippingFee:f.shippingFee,discountAmount:f.discountAmount,grandTotal:f.total,net:f.netAmount,tax:f.taxAmount,taxPolicy:f.taxPolicy};}
 return {subtotal:order.subtotal,assemblyFee:order.assemblyFee??0,shippingFee:order.shippingFee,discountAmount:order.discountAmount??0,grandTotal:order.grandTotal,net:null,tax:null,taxPolicy:null};
}
export function generateInvoiceHtml(order:InvoiceDownloadData):string{
 const a=invoiceAmounts(order),h=escapeHtml,m=(n:number)=>`Rp ${n.toLocaleString("id-ID")}`;
 const lines:Array<{name:string;sku?:string|null;quantity:number;price:number;discount:number;total:number;net:number|null;tax:number|null}>=order.financialSnapshot?.lines.map(l=>({name:l.name,sku:l.sku,quantity:l.quantity,price:l.unitPrice,discount:l.discount,total:l.gross,net:l.net,tax:l.tax}))
  ??(order.items||[]).map(l=>({...l,discount:0,total:l.price*l.quantity,net:null,tax:null}));
 if(order.financialSnapshot){const s=order.financialSnapshot.shipping;lines.push({name:"Shipping",sku:null,quantity:1,price:s.beforeDiscount,discount:s.discount,total:s.gross,net:s.net,tax:s.tax});}
 const rows=lines.map(l=>`<tr><td>${h(l.name)}<small>${h(l.sku)}</small></td><td>${l.quantity}</td><td>${m(l.price)}</td><td>${m(l.discount)}</td><td>${m(l.total)}</td><td>${l.net==null?"Unavailable":m(l.net)}</td><td>${l.tax==null?"Unavailable":m(l.tax)}</td></tr>`).join("");
 const address=order.shippingAddress;
 const date=formatIndonesiaDate(order.createdAt,"id");
 const summary=(label:string,value:string)=>`<tr><td>${h(label)}</td><td style="text-align:right">${value}</td></tr>`;
 const tax=a.taxPolicy?summary("Amount before included tax",m(a.net!))+summary(a.taxPolicy.mode==="not_collected"?"Tax not collected":`Included tax (${a.taxPolicy.rateBps/100}% effective)`,m(a.tax!)):'<tr><td colspan="2">Historical tax breakdown unavailable.</td></tr>';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Invoice ${h(order.orderNumber)}</title>
 <style>body{font:14px Arial,sans-serif;color:#172033;margin:32px auto;padding:20px;max-width:900px}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}small{display:block;color:#64748b}.summary{max-width:450px;margin-left:auto}footer{font-size:12px;color:#64748b;margin-top:32px}@media print{button{display:none}body{margin:0;max-width:none}}</style></head><body>
 <button onclick="window.print()">Print or Save as PDF</button><h1>Incus Computers - Commercial invoice</h1><p>Order ${h(order.orderNumber)} | ${h(date)}</p>
 <p>Payment status: ${order.paidAt?"Payment received":"Payment not confirmed"}${order.status?` | Order status: ${h(order.status)}`:""}</p>
 <p>${h(order.customer?.name)}<br>${h(order.customer?.email)}<br>${h(order.customer?.phone)}</p>
 <p>${order.fulfillmentMethod==="click_and_collect"?"Click &amp; collect":h(address?[address.street,address.unit,address.subdistrict,address.city,address.province,address.postalCode].filter(Boolean).join(", "):"Delivery")}</p>
 <p>Payment reference: ${h(order.paymentId||"Unavailable")}<br>Payment method: ${h(order.paymentChannel||"Unavailable")}</p>
 <table><thead><tr><th>Item / service</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>After discount</th><th>Before included tax</th><th>Included tax</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Historical item details unavailable.</td></tr>'}</tbody></table>
 <table class="summary">${summary("Merchandise",m(a.subtotal))}${summary("Assembly",m(a.assemblyFee))}${summary("Shipping",m(a.shippingFee))}${summary("Discount",`-${m(a.discountAmount)}`)}${tax}${summary("Order total",`<strong>${m(a.grandTotal)}</strong>`)}</table>
 <footer>Commercial order record. Any legally required tax invoice must be issued through the applicable tax invoicing process. Refunds and returns are recorded separately from the original order total.</footer></body></html>`;
}
export async function fetchInvoiceDocument(orderNumber:string):Promise<InvoiceDownloadData>{
 const response=await fetch(`/api/orders/invoice?orderNumber=${encodeURIComponent(orderNumber)}`,{cache:"no-store"});
 const result=await response.json();if(!response.ok||!result.success)throw new Error(result.error||result.detail||"Invoice unavailable for this session.");return result.document;
}
export function downloadInvoiceFile(order:InvoiceDownloadData):void{
 if(typeof window==="undefined")return;
 const url=URL.createObjectURL(new Blob([generateInvoiceHtml(order)],{type:"text/html;charset=utf-8"}));
 const anchor=document.createElement("a");anchor.href=url;anchor.download=`Invoice-${order.orderNumber.replace(/[^a-zA-Z0-9_-]/g,"_")}.html`;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}
