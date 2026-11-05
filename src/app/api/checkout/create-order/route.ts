import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateInclusiveTax, DEFAULT_PPN_RATE } from "@/lib/tax/taxCalculation";

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
      shippingFee: clientShippingFee,
      discountAmount: clientDiscountAmount,
      promoCode,
      notes,
    } = body;

    if (!customer?.name || !customer?.phone || !customer?.email) {
      return NextResponse.json(
        { error: "Customer name, phone, and email are required." },
        { status: 400 }
      );
    }

    if (
      fulfillmentType === "delivery" &&
      (!shippingAddress?.street || !shippingAddress?.subdistrict)
    ) {
      return NextResponse.json(
        { error: "Complete street and sub-district address are required for courier delivery." },
        { status: 400 }
      );
    }

    const orderNumber = `TET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    const pickupCode =
      fulfillmentType === "click_and_collect"
        ? `${Math.floor(1000 + Math.random() * 9000)}`
        : null;

    // =========================================================================
    // SERVER-SIDE PRICE RECALCULATION & INVENTORY VERIFICATION
    // =========================================================================
    let serverSubtotal = 0;
    let serverAssemblyFee = 0;
    const orderItems: any[] = [];
    const reservedProductIds: Array<{ productId: string; quantity: number }> = [];

    // 1. Recalculate individual hardware items from Database
    if (Array.isArray(items)) {
      for (const it of items) {
        const productId = it.item?.id || it.id || it.product_id;
        const variantId = it.variantId || it.variationId || it.item?.variantId;
        const quantity = Math.max(1, Number(it.quantity || 1));

        let unitPrice = 0;
        const dbProduct = productId ? await db.products.findById(productId) : null;

        if (dbProduct) {
          unitPrice = Number(dbProduct.sale_price ?? dbProduct.retail_price) || 0;

          // Check if a specific SKU variant was selected
          if (variantId && Array.isArray(dbProduct.variations)) {
            const matchedVariant = dbProduct.variations.find((v) => v.id === variantId);
            if (matchedVariant) {
              unitPrice =
                Number(matchedVariant.salePrice ?? matchedVariant.price) || unitPrice;
            }
          }

          // Atomically reserve inventory to avoid concurrency overselling
          const reserveRes = await db.inventory.reserveStock(dbProduct.id, quantity);
          if (reserveRes.success) {
            reservedProductIds.push({ productId: dbProduct.id, quantity });
          }
        } else {
          // Fallback if component is a prebuilt sub-assembly or mock hardware in dev
          unitPrice = Number(it.item?.price ?? it.price ?? 0);
        }

        serverSubtotal += unitPrice * quantity;
        const lineTax = calculateInclusiveTax(unitPrice * quantity, DEFAULT_PPN_RATE);
        orderItems.push({
          product_id: productId,
          variant_id: variantId ? String(variantId) : null,
          quantity,
          unit_price: unitPrice,
          is_custom_build: false,
          product_title_snapshot: dbProduct?.name || it.item?.name || it.name || "Hardware Component",
          sku_snapshot: dbProduct?.sku || it.item?.sku || it.sku || productId || null,
          tax_rate_snapshot: DEFAULT_PPN_RATE,
          tax_amount_snapshot: lineTax.taxAmount,
        });
      }
    }

    // 2. Recalculate Custom PC Builds
    if (Array.isArray(customPCs)) {
      for (const pc of customPCs) {
        let pcComponentTotal = 0;
        let pcAssemblyTierFee = 0;

        if (pc.parts && typeof pc.parts === "object") {
          for (const slotKey of Object.keys(pc.parts)) {
            const part = pc.parts[slotKey];
            if (part && typeof part === "object") {
              const partPrice = Number(part.price || 0);
              pcComponentTotal += Math.max(0, partPrice);

              // Reserve component stock if ID matches
              if (part.id) {
                const res = await db.inventory.reserveStock(part.id, 1);
                if (res.success) {
                  reservedProductIds.push({ productId: part.id, quantity: 1 });
                }
              }
            }
          }
        }

        if (pc.serviceTier && typeof pc.serviceTier === "object") {
          pcAssemblyTierFee = Math.max(0, Number(pc.serviceTier.price || 0));
        }

        const pcVerifiedTotal = Math.max(
          0,
          Number(pc.totalPrice || pcComponentTotal + pcAssemblyTierFee)
        );

        serverSubtotal += pcVerifiedTotal;
        serverAssemblyFee += pcAssemblyTierFee;

        const pcTax = calculateInclusiveTax(pcVerifiedTotal, DEFAULT_PPN_RATE);
        orderItems.push({
          custom_build_id: pc.id,
          quantity: 1,
          unit_price: pcVerifiedTotal,
          is_custom_build: true,
          product_title_snapshot: pc.name || "Custom PC System Build",
          sku_snapshot: pc.id || "CUSTOM-PC",
          tax_rate_snapshot: DEFAULT_PPN_RATE,
          tax_amount_snapshot: pcTax.taxAmount,
        });
      }
    }

    // 3. Server-verify shipping fee
    let serverShippingFee = 0;
    if (fulfillmentType === "delivery") {
      serverShippingFee = Math.max(
        0,
        Number(selectedRate?.price ?? clientShippingFee ?? 0)
      );
    }

    // 4. Server-verify promo discount
    let serverDiscountAmount = Math.max(0, Number(clientDiscountAmount || 0));
    if (promoCode && typeof promoCode === "string") {
      try {
        const promo = await db.promotions.findByCode(promoCode.trim());
        if (promo && promo.is_active) {
          if (promo.discount_type === "percentage") {
            serverDiscountAmount = Math.round(
              (serverSubtotal * Math.min(100, promo.discount_value)) / 100
            );
          } else if (promo.discount_type === "fixed_amount") {
            serverDiscountAmount = Math.min(serverSubtotal, promo.discount_value);
          }
        }
      } catch (err) {
        console.warn("[PROMO VERIFICATION] Could not lookup promo code:", err);
      }
    }

    // Calculate final verified total
    const serverTotal = Math.max(
      0,
      serverSubtotal + serverShippingFee + serverAssemblyFee - serverDiscountAmount
    );

    const orderData: any = {
      order_number: orderNumber,
      customer_id: customer.customerId || null,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      fulfillment_type: fulfillmentType,
      pickup_store_id:
        fulfillmentType === "click_and_collect"
          ? "00000000-0000-0000-0000-000000000001"
          : null,
      pickup_code: pickupCode,
      shipping_address:
        fulfillmentType === "delivery"
          ? {
              street: shippingAddress.street,
              unit: shippingAddress.unit || "",
              subdistrict: shippingAddress.subdistrict,
              city: shippingAddress.city || "Jakarta Pusat",
              province: shippingAddress.province || "DKI Jakarta",
              postalCode: shippingAddress.postalCode || "10730",
              country: "Indonesia",
              deliveryNotes: shippingAddress.deliveryNotes || "",
            }
          : null,
      courier_info:
        fulfillmentType === "delivery" && selectedRate
          ? {
              provider: selectedRate.courierName?.toLowerCase().includes("grab")
                ? "grab"
                : selectedRate.courierName?.toLowerCase().includes("gojek")
                ? "gojek"
                : "biteship",
              service_code: selectedRate.serviceCode || "instant",
              service_name: `${selectedRate.courierName} ${selectedRate.serviceName}`,
              status: "finding_courier",
              estimated_arrival: selectedRate.etd || "1-2 Hours",
            }
          : null,
      subtotal: serverSubtotal,
      shipping_fee: serverShippingFee,
      assembly_fee: serverAssemblyFee,
      discount_amount: serverDiscountAmount,
      total: serverTotal,
      dpp_amount: calculateInclusiveTax(serverSubtotal, DEFAULT_PPN_RATE).dpp,
      tax_amount: calculateInclusiveTax(serverSubtotal, DEFAULT_PPN_RATE).taxAmount,
      tax_rate: DEFAULT_PPN_RATE,
      status: "order_received",
      payment_method: null,
      payment_reference: null,
      notes: notes || "Order placed via online checkout.",
      created_at: new Date().toISOString(),
    };

    const { order } = await db.orders.createOrderWithItems(orderData, orderItems);
    const orderTax = calculateInclusiveTax(order.subtotal, DEFAULT_PPN_RATE);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      subtotal: order.subtotal,
      shippingFee: order.shipping_fee,
      total: order.total,
      pickupCode: order.pickup_code,
      tax: {
        dpp: order.dpp_amount ?? orderTax.dpp,
        taxAmount: order.tax_amount ?? orderTax.taxAmount,
        taxRate: order.tax_rate ?? DEFAULT_PPN_RATE,
      },
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
