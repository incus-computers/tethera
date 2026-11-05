import { NextRequest, NextResponse } from "next/server";
import { db, OrderStatus } from "@/lib/db";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const orderId = searchParams.get("id");

    if (orderId) {
      const order = await db.orders.findById(orderId);
      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      const { items } = await db.orders.getOrderWithItems(order.id);
      const enrichedItems = await Promise.all(
        items.map(async (it) => {
          const product = it.product_id ? await db.products.findById(it.product_id) : null;
          return {
            ...it,
            product: product
              ? {
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                  brand: product.brand,
                  images: product.images,
                  retail_price: product.retail_price,
                }
              : null,
          };
        })
      );

      return NextResponse.json({
        success: true,
        order: {
          ...order,
          items: enrichedItems,
        },
      });
    }

    const orders = await db.orders.findMany(
      statusFilter ? { status: statusFilter as any } : undefined,
      { orderBy: "created_at", orderDirection: "desc" }
    );

    // Enrich each order with its items
    const enrichedOrders = await Promise.all(
      orders.map(async (ord) => {
        const { items } = await db.orders.getOrderWithItems(ord.id);
        const enrichedItems = await Promise.all(
          items.map(async (it) => {
            const product = it.product_id ? await db.products.findById(it.product_id) : null;
            return {
              ...it,
              product: product
                ? {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    brand: product.brand,
                    images: product.images,
                    retail_price: product.retail_price,
                  }
                : null,
            };
          })
        );

        return {
          ...ord,
          items: enrichedItems,
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: enrichedOrders.length,
      orders: enrichedOrders,
    });
  } catch (error: any) {
    console.error("[ADMIN ORDERS GET ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Advance/Toggle stage manually (order_received -> order_accepted -> finding_stock -> finding_courier)
export async function PUT(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 401 });
    }

    const body = await req.json();
    const {
      orderId,
      nextStatus,
      notes,
      waybill_id,
      tracking_number,
      courier_provider,
      courier_service_code,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required." },
        { status: 400 }
      );
    }

    // Validate valid status transitions if nextStatus is provided
    const validManualTransitions: string[] = [
      "order_received",
      "order_accepted",
      "finding_stock",
      "ready_for_dispatch",
      "finding_courier",
      "dispatched",
      "finished",
      "ready_for_pickup",
      "collected",
      "shipped",
      "delivered",
      "on_delivery",
      "delivery_arrived",
      "processing",
      "pending",
      "pending_payment",
      "payment_received",
      "assembly_in_progress",
      "testing_bench",
      "cancelled",
      "refunded",
    ];

    if (nextStatus && !validManualTransitions.includes(nextStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid status transition: '${nextStatus}'` },
        { status: 400 }
      );
    }

    // If order is rejected/cancelled, release any reserved stock back to available inventory
    if (nextStatus === "cancelled") {
      try {
        const { items } = await db.orders.getOrderWithItems(orderId);
        for (const it of items) {
          if (it.product_id) {
            const inv = await db.inventory.getByProductAndStore(it.product_id);
            if (inv && inv.stock_reserved > 0) {
              await db.inventory.update(inv.id, {
                stock_reserved: Math.max(0, inv.stock_reserved - (it.quantity || 1)),
              });
            }
          }
        }
      } catch (stockErr) {
        console.warn("[ADMIN ORDERS] Could not release reserved stock on rejection:", stockErr);
      }
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (nextStatus) updatePayload.status = nextStatus;
    if (notes !== undefined) updatePayload.notes = notes;
    if (waybill_id !== undefined) updatePayload.waybill_id = waybill_id;
    if (tracking_number !== undefined) updatePayload.tracking_number = tracking_number;
    if (courier_provider !== undefined) updatePayload.courier_provider = courier_provider;
    if (courier_service_code !== undefined) updatePayload.courier_service_code = courier_service_code;

    const updated = await db.orders.update(orderId, updatePayload as any);

    if (!updated) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    const msg =
      nextStatus === "cancelled"
        ? `Order #${updated.order_number} has been rejected / cancelled. Reason logged: ${notes || "Warehouse out of stock"}.`
        : nextStatus
        ? `Order #${updated.order_number} transitioned to '${nextStatus.replace(/_/g, " ").toUpperCase()}'.`
        : `Order #${updated.order_number} details successfully updated.`;

    return NextResponse.json({
      success: true,
      message: msg,
      order: updated,
    });
  } catch (error: any) {
    console.error("[ADMIN ORDERS PUT ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
