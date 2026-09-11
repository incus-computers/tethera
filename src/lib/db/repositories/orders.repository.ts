import "server-only";
import { BaseRepository } from "./base.repository";
import { Order, OrderItem } from "../types";
import { inventoryRepository } from "./inventory.repository";

export class OrdersRepository extends BaseRepository<Order> {
  private itemsRepository: BaseRepository<OrderItem>;

  constructor() {
    super("orders", []);
    this.itemsRepository = new BaseRepository<OrderItem>("order_items", []);
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.findOne({ order_number: orderNumber });
  }

  async getOrderWithItems(orderId: string): Promise<{ order: Order | null; items: OrderItem[] }> {
    const order = await this.findById(orderId);
    if (!order) return { order: null, items: [] };

    const client = this.getClient();
    if (!client) {
      const items = await this.itemsRepository.findMany({ order_id: orderId });
      return { order, items };
    }

    const { data: items } = await client
      .from("order_items")
      .select("*, products(sku, name, retail_price)")
      .eq("order_id", orderId);

    return { order, items: (items as OrderItem[]) || [] };
  }

  async createOrderWithItems(
    orderData: Partial<Order>,
    items: Partial<OrderItem>[]
  ): Promise<{ order: Order; items: OrderItem[] }> {
    const order = await this.create(orderData);
    const createdItems: OrderItem[] = [];

    for (const item of items) {
      const created = await this.itemsRepository.create({
        ...item,
        order_id: order.id,
      });
      createdItems.push(created);
    }

    return { order, items: createdItems };
  }

  /**
   * Transition order to payment_received / ready_for_pickup and lock inventory.
   */
  async processPaymentSuccess(
    orderId: string,
    paymentReference: string = "PAY-SUCCESS"
  ): Promise<{ success: boolean; status?: string; error?: string; reservedItems?: any[] }> {
    const client = this.getClient();

    // If real Supabase is connected, call the atomic PostgreSQL procedure
    if (client) {
      const { data: rpcResult, error: rpcError } = await client.rpc(
        "process_order_payment_success",
        {
          p_order_id: orderId,
          p_payment_reference: paymentReference,
        }
      );

      if (rpcError || !rpcResult?.success) {
        return {
          success: false,
          error: rpcResult?.error || rpcError?.message || "Payment processing failed.",
        };
      }

      return {
        success: true,
        status: rpcResult.status,
        reservedItems: rpcResult.reserved_items,
      };
    }

    // Local in-memory fallback execution
    const order = await this.findById(orderId);
    if (!order) return { success: false, error: "Order not found." };
    if (order.status !== "pending_payment") {
      return { success: false, error: "Order is not pending payment." };
    }

    const items = await this.itemsRepository.findMany({ order_id: orderId });
    const reservedItems: any[] = [];

    for (const item of items) {
      if (item.product_id) {
        const res = await inventoryRepository.reserveStock(item.product_id, item.quantity);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        reservedItems.push({ product_id: item.product_id, quantity: item.quantity });
      }
    }

    const isCustomPc = items.some((i) => i.is_custom_build || i.custom_build_id);
    const nextStatus = isCustomPc
      ? "assembly_in_progress"
      : order.fulfillment_type === "click_and_collect"
      ? "ready_for_pickup"
      : "payment_received";

    const pickupCode =
      order.fulfillment_type === "click_and_collect"
        ? Math.floor(1000 + Math.random() * 9000).toString()
        : null;

    const updated = await this.update(orderId, {
      status: nextStatus,
      payment_reference: paymentReference,
      pickup_code: pickupCode,
      paid_at: new Date().toISOString(),
    });

    return {
      success: true,
      status: updated?.status || nextStatus,
      reservedItems,
    };
  }
}

export const ordersRepository = new OrdersRepository();
