import { NextRequest, NextResponse } from "next/server";
import { db, OrderStatus } from "@/lib/db";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

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
    const { orderId, nextStatus, notes } = body;

    if (!orderId || !nextStatus) {
      return NextResponse.json(
        { success: false, error: "Order ID and target status are required." },
        { status: 400 }
      );
    }

    // Validate valid status transitions
    const validManualTransitions: OrderStatus[] = [
      "order_received",
      "order_accepted",
      "finding_stock",
      "finding_courier",
      "ready_for_pickup",
      "collected",
      "cancelled",
    ];

    if (!validManualTransitions.includes(nextStatus) && nextStatus !== "on_delivery" && nextStatus !== "delivery_arrived") {
      return NextResponse.json(
        { success: false, error: `Invalid status transition: '${nextStatus}'` },
        { status: 400 }
      );
    }

    const updated = await db.orders.update(orderId, {
      status: nextStatus,
      notes: notes !== undefined ? notes : undefined,
      updated_at: new Date().toISOString(),
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Order #${updated.order_number} transitioned to '${nextStatus.replace(/_/g, " ").toUpperCase()}'.`,
      order: updated,
    });
  } catch (error: any) {
    console.error("[ADMIN ORDERS PUT ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
