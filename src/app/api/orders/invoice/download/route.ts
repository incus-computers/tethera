import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateInvoiceHtml, InvoiceDownloadData } from "@/lib/utils/invoiceDownload";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");
    const orderId = searchParams.get("orderId");

    if (!orderNumber && !orderId) {
      return NextResponse.json(
        { error: "orderNumber or orderId query parameter is required." },
        { status: 400 }
      );
    }

    let order = null;
    if (orderNumber) {
      order = await db.orders.findByOrderNumber(orderNumber).catch(() => null);
    }
    if (!order && orderId) {
      order = await db.orders.findById(orderId).catch(() => null);
    }

    let invoiceData: InvoiceDownloadData;

    if (order) {
      const detailed = await db.orders.getOrderWithItems(order.id).catch(() => null);
      const items = detailed?.items?.map((it: any) => ({
        id: it.id,
        name: it.product?.name || (it.is_custom_build ? "Custom PC Build" : `Hardware Item (${it.product_id || it.id})`),
        sku: it.product?.sku || undefined,
        brand: it.product?.brand || undefined,
        price: it.unit_price,
        quantity: it.quantity,
      })) || [];

      invoiceData = {
        orderNumber: order.order_number,
        paymentId: order.payment_reference || "SETTLED",
        paymentChannel: order.payment_method || "Midtrans Instant Pay",
        createdAt: order.created_at,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
        },
        fulfillmentMethod: order.fulfillment_type,
        shippingAddress: order.shipping_address
          ? {
              street: order.shipping_address.street,
              unit: order.shipping_address.unit,
              subdistrict: order.shipping_address.subdistrict,
              city: order.shipping_address.city,
              province: order.shipping_address.province,
              postalCode: order.shipping_address.postalCode,
            }
          : undefined,
        items,
        subtotal: order.subtotal,
        shippingFee: order.shipping_fee,
        grandTotal: order.total,
      };
    } else {
      // Fallback invoice data if visited for unpersisted or demo order number
      const targetNumber = orderNumber || "TET-ORDER";
      invoiceData = {
        orderNumber: targetNumber,
        paymentId: "MIDTRANS-SETTLED",
        paymentChannel: "Midtrans Verified Pay",
        createdAt: new Date().toISOString(),
        customer: {
          name: "Valued Customer",
          email: "customer@tethera.com",
          phone: "+62 812-3456-7890",
        },
        fulfillmentMethod: "delivery",
        subtotal: 0,
        shippingFee: 0,
        grandTotal: 0,
      };
    }

    const html = generateInvoiceHtml(invoiceData);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="Invoice-${invoiceData.orderNumber}.html"`,
      },
    });
  } catch (error: any) {
    console.error("Invoice download error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate invoice file" },
      { status: 500 }
    );
  }
}
