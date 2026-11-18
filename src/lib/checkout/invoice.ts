import "server-only";
import { db } from "@/lib/db";
import { assertFinancialSnapshot } from "./financials";
import type { InvoiceDownloadData } from "@/lib/utils/invoiceDownload";
export async function orderInvoiceDocument(orderId:string):Promise<InvoiceDownloadData>{
 const {order,items}=await db.orders.getOrderWithItems(orderId);
 if(!order)throw new Error("Order not found.");
 const f=order.financial_snapshot;if(f)assertFinancialSnapshot(f);
 return {orderId:order.id,orderNumber:order.order_number,status:order.status,paidAt:order.paid_at,paymentId:order.payment_reference||undefined,paymentChannel:order.payment_method||undefined,createdAt:order.created_at,
 customer:{name:order.customer_name,email:order.customer_email,phone:order.customer_phone},fulfillmentMethod:order.fulfillment_type,shippingAddress:order.shipping_address||undefined,
 items:f?f.lines.map(l=>({id:`${order.id}-${l.index}`,name:l.name,sku:l.sku||undefined,price:l.unitPrice,quantity:l.quantity})):items.map(i=>({id:i.id,name:i.product_title_snapshot||"Historical order item",sku:i.sku_snapshot||undefined,price:i.unit_price,quantity:i.quantity})),
 financialSnapshot:f,subtotal:order.subtotal,assemblyFee:order.assembly_fee,discountAmount:order.discount_amount||0,shippingFee:order.shipping_fee,grandTotal:order.total};
}
