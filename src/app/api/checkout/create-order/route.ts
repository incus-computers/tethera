import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer,
      shippingAddress,
      fulfillmentType,
      items,
      customPCs,
      selectedRate,
      subtotal,
      shippingFee,
      total,
      notes,
    } = body;

    if (!customer?.name || !customer?.phone || !customer?.email) {
      return NextResponse.json(
        { error: "Customer name, phone, and email are required." },
        { status: 400 }
      );
    }

    if (fulfillmentType === "delivery" && (!shippingAddress?.street || !shippingAddress?.subdistrict)) {
      return NextResponse.json(
        { error: "Complete street and sub-district address are required for courier delivery." },
        { status: 400 }
      );
    }

    const orderNumber = `TET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const pickupCode = fulfillmentType === "click_and_collect" ? `${Math.floor(1000 + Math.random() * 9000)}` : null;

    const orderData: any = {
      order_number: orderNumber,
      customer_id: customer.customerId || null,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      fulfillment_type: fulfillmentType,
      pickup_store_id: fulfillmentType === "click_and_collect" ? "store-mangga-dua" : null,
      pickup_code: pickupCode,
      shipping_address: fulfillmentType === "delivery" ? {
        street: shippingAddress.street,
        unit: shippingAddress.unit || "",
        subdistrict: shippingAddress.subdistrict,
        city: shippingAddress.city || "Jakarta Pusat",
        province: shippingAddress.province || "DKI Jakarta",
        postalCode: shippingAddress.postalCode || "10730",
        country: "Indonesia",
        deliveryNotes: shippingAddress.deliveryNotes || "",
      } : null,
      courier_info: fulfillmentType === "delivery" && selectedRate ? {
        provider: selectedRate.courierName?.toLowerCase().includes("grab") ? "grab" : selectedRate.courierName?.toLowerCase().includes("gojek") ? "gojek" : "biteship",
        service_code: selectedRate.serviceCode || "instant",
        service_name: `${selectedRate.courierName} ${selectedRate.serviceName}`,
        status: "finding_courier",
        estimated_arrival: selectedRate.etd || "1-2 Hours",
      } : null,
      subtotal: subtotal || 0,
      shipping_fee: shippingFee || 0,
      assembly_fee: 0,
      total: total || 0,
      status: "order_received",
      payment_method: null,
      payment_reference: null,
      notes: notes || "Order placed via online checkout.",
      created_at: new Date().toISOString(),
    };

    // Prepare order items
    const orderItems: any[] = [];
    if (Array.isArray(items)) {
      for (const it of items) {
        orderItems.push({
          product_id: it.item?.id || it.id,
          quantity: it.quantity || 1,
          unit_price: it.item?.price || it.price || 0,
          is_custom_build: false,
        });
      }
    }
    if (Array.isArray(customPCs)) {
      for (const pc of customPCs) {
        orderItems.push({
          custom_build_id: pc.id,
          quantity: 1,
          unit_price: pc.totalPrice,
          is_custom_build: true,
        });
      }
    }

    const { order, items: createdItems } = await db.orders.createOrderWithItems(
      orderData,
      orderItems
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      total: order.total,
      pickupCode: order.pickup_code,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
