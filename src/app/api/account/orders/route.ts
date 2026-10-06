import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.toLowerCase().trim();
    const customerId = searchParams.get("customerId")?.trim();

    if (!email && !customerId) {
      return NextResponse.json(
        { success: false, error: "Customer email or ID is required to fetch orders." },
        { status: 400 }
      );
    }

    // Retrieve all orders from database
    const allOrders = await db.orders.findMany(undefined, {
      orderBy: "created_at",
      orderDirection: "desc",
    });

    // Filter by customer email or customer id
    const userOrders = allOrders.filter((ord) => {
      const matchEmail = email && ord.customer_email?.toLowerCase() === email;
      const matchId = customerId && ord.customer_id === customerId;
      return matchEmail || matchId;
    });

    // Enrich each order with detailed items and product data
    const enrichedOrders = await Promise.all(
      userOrders.map(async (ord) => {
        const { items } = await db.orders.getOrderWithItems(ord.id);
        const enrichedItems = await Promise.all(
          items.map(async (it) => {
            let product = null;
            if (it.product_id) {
              product = await db.products.findById(it.product_id);
            }

            let customBuild = null;
            if (it.custom_build_id) {
              customBuild = await db.customBuilds.findById(it.custom_build_id);
            }

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
                    pc_builder_slot: product.pc_builder_slot,
                  }
                : null,
              customBuild: customBuild
                ? {
                    id: customBuild.id,
                    build_name: customBuild.build_name,
                    platform: customBuild.platform,
                    total_price: customBuild.total_price,
                    share_slug: customBuild.share_slug,
                    configuration: customBuild.configuration,
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
    console.error("[ACCOUNT ORDERS API ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve account orders." },
      { status: 500 }
    );
  }
}
