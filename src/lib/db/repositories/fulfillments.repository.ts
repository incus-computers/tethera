import "server-only";
import { BaseRepository } from "./base.repository";
import { FulfillmentRow, FulfillmentItemRow } from "../types";
import { ordersRepository } from "./orders.repository";

export interface HydratedFulfillment extends FulfillmentRow {
  items: FulfillmentItemRow[];
}

export class FulfillmentsRepository extends BaseRepository<FulfillmentRow> {
  private itemsRepository: BaseRepository<FulfillmentItemRow>;

  constructor() {
    super("fulfillments", []);
    this.itemsRepository = new BaseRepository<FulfillmentItemRow>("fulfillment_items", []);
  }

  /**
   * Creates a partial or full fulfillment shipment record for an order (ADMIN-01)
   */
  async createFulfillment(
    orderId: string,
    params: {
      carrier: string;
      serviceCode: string;
      waybillId?: string | null;
      trackingUrl?: string | null;
      items: Array<{ orderItemId: string; quantity: number }>;
      dispatchedBy?: string | null;
      notes?: string | null;
    }
  ): Promise<{
    fulfillment: FulfillmentRow;
    items: FulfillmentItemRow[];
    orderStatus: string;
  }> {
    const order = await ordersRepository.findById(orderId);
    if (!order) {
      throw new Error(`Order '${orderId}' not found for fulfillment.`);
    }

    const { items: orderItems } = await ordersRepository.getOrderWithItems(orderId);
    if (!orderItems || orderItems.length === 0) {
      throw new Error(`Order '${orderId}' has no line items to fulfill.`);
    }

    const count = (await this.findMany({ order_id: orderId })).length + 1;
    const fulfillmentNumber = `FUL-${order.order_number}-${count}`;

    // 1. Create fulfillment row
    const fulfillment = await this.create({
      id: `ful-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      order_id: orderId,
      fulfillment_number: fulfillmentNumber,
      carrier: params.carrier,
      service_code: params.serviceCode,
      waybill_id: params.waybillId || null,
      tracking_url: params.trackingUrl || null,
      status: "shipped",
      shipped_at: new Date().toISOString(),
      delivered_at: null,
      dispatched_by: params.dispatchedBy || "staff",
      notes: params.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 2. Create fulfillment line-item allocations
    const createdItems: FulfillmentItemRow[] = [];
    for (const item of params.items) {
      const createdItem = await this.itemsRepository.create({
        id: `fulitem-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        fulfillment_id: fulfillment.id,
        order_item_id: item.orderItemId,
        quantity: Math.max(1, item.quantity),
      });
      createdItems.push(createdItem);
    }

    // 3. Calculate total fulfilled quantity across all fulfillments for this order
    const allOrderFulfillments = await this.findMany({ order_id: orderId });
    let totalFulfilledQty = 0;
    for (const ful of allOrderFulfillments) {
      const fulItems = await this.itemsRepository.findMany({ fulfillment_id: ful.id });
      totalFulfilledQty += fulItems.reduce((acc, curr) => acc + curr.quantity, 0);
    }

    const totalOrderedQty = orderItems.reduce((acc, curr) => acc + curr.quantity, 0);

    // 4. Update order state based on full vs partial fulfillment
    const nextOrderStatus =
      totalFulfilledQty >= totalOrderedQty ? "shipped" : "partially_fulfilled";

    await ordersRepository.update(orderId, {
      status: nextOrderStatus as any,
      updated_at: new Date().toISOString(),
    });

    return {
      fulfillment,
      items: createdItems,
      orderStatus: nextOrderStatus,
    };
  }

  /**
   * Retrieves all fulfillments with associated line-items for an order
   */
  async getByOrderId(orderId: string): Promise<HydratedFulfillment[]> {
    const fulfillments = await this.findMany({ order_id: orderId });
    const hydrated: HydratedFulfillment[] = [];

    for (const ful of fulfillments) {
      const items = await this.itemsRepository.findMany({ fulfillment_id: ful.id });
      hydrated.push({
        ...ful,
        items,
      });
    }

    return hydrated;
  }

  /**
   * Updates fulfillment status (e.g. marked as delivered by courier webhook)
   */
  async updateStatus(
    fulfillmentId: string,
    status: FulfillmentRow["status"],
    deliveredAt?: string
  ): Promise<FulfillmentRow | null> {
    return this.update(fulfillmentId, {
      status,
      delivered_at: status === "delivered" ? (deliveredAt || new Date().toISOString()) : undefined,
      updated_at: new Date().toISOString(),
    });
  }
}

export const fulfillmentsRepository = new FulfillmentsRepository();
