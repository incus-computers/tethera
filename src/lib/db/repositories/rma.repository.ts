import "server-only";
import { BaseRepository } from "./base.repository";
import { ReturnRequestRow, RefundRow } from "../types";
import { ordersRepository } from "./orders.repository";
import { inventoryRepository } from "./inventory.repository";
import { FLAGSHIP_STORE_ID } from "./stores.repository";

export class RmaRepository {
  public returnRequests: BaseRepository<ReturnRequestRow>;
  public refunds: BaseRepository<RefundRow>;

  constructor() {
    this.returnRequests = new BaseRepository<ReturnRequestRow>("return_requests", []);
    this.refunds = new BaseRepository<RefundRow>("refunds", []);
  }

  /**
   * Submits a customer Return Merchandise Authorization (RMA) request (ADMIN-02, CUST-05)
   */
  async createReturnRequest(params: {
    orderNumber: string;
    customerEmail: string;
    reason: string;
    customerNotes?: string | null;
    photos?: string[];
  }): Promise<ReturnRequestRow> {
    const order = await ordersRepository.findByOrderNumber(params.orderNumber.trim().toUpperCase());
    if (!order) {
      throw new Error(`Order '${params.orderNumber}' not found.`);
    }

    if (order.customer_email.trim().toLowerCase() !== params.customerEmail.trim().toLowerCase()) {
      throw new Error("Customer email address does not match order record.");
    }

    const rmaNumber = `RMA-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const rma = await this.returnRequests.create({
      id: `rma-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      rma_number: rmaNumber,
      order_id: order.id,
      customer_id: order.customer_id || null,
      customer_email: order.customer_email,
      status: "requested",
      reason: params.reason,
      customer_notes: params.customerNotes || null,
      admin_notes: null,
      photos: params.photos || [],
      requested_at: new Date().toISOString(),
      inspected_at: null,
      resolved_at: null,
      handled_by: null,
    });

    return rma;
  }

  /**
   * Retrieves RMA return requests with optional filtering
   */
  async getReturnRequests(filter: {
    orderId?: string;
    customerEmail?: string;
    status?: ReturnRequestRow["status"];
  } = {}): Promise<ReturnRequestRow[]> {
    const query: Record<string, any> = {};
    if (filter.orderId) query.order_id = filter.orderId;
    if (filter.customerEmail) query.customer_email = filter.customerEmail;
    if (filter.status) query.status = filter.status;

    const results = await this.returnRequests.findMany(query);
    return results.sort(
      (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
    );
  }

  /**
   * Updates RMA status by staff (e.g. approved, item received, inspected, rejected, completed)
   */
  async updateRmaStatus(
    rmaId: string,
    params: {
      status: ReturnRequestRow["status"];
      adminNotes?: string | null;
      handledBy?: string | null;
    }
  ): Promise<ReturnRequestRow | null> {
    const patch: Partial<ReturnRequestRow> = {
      status: params.status,
    };
    if (params.adminNotes !== undefined) patch.admin_notes = params.adminNotes;
    if (params.handledBy !== undefined) patch.handled_by = params.handledBy;
    if (params.status === "inspected") patch.inspected_at = new Date().toISOString();
    if (params.status === "completed" || params.status === "rejected") {
      patch.resolved_at = new Date().toISOString();
    }

    return this.returnRequests.update(rmaId, patch);
  }

  /**
   * Processes financial refund with optional inventory restocking (ADMIN-02)
   */
  async processRefund(params: {
    orderId: string;
    returnRequestId?: string | null;
    amount?: number;
    reason: string;
    restockInventory: boolean;
    processedBy: string;
  }): Promise<{ refund: RefundRow; orderStatus: string }> {
    const order = await ordersRepository.findById(params.orderId);
    if (!order) {
      throw new Error(`Order '${params.orderId}' not found for refund processing.`);
    }

    const refundAmount = Math.max(1, Number(params.amount || order.total));
    const refundNumber = `REF-${order.order_number}-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Create immutable refund record
    const refund = await this.refunds.create({
      id: `refund-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      refund_number: refundNumber,
      order_id: order.id,
      return_request_id: params.returnRequestId || null,
      amount: refundAmount,
      currency: "IDR",
      gateway_refund_id: `GW-REF-${Date.now()}`,
      restock_inventory: params.restockInventory,
      reason: params.reason,
      processed_by: params.processedBy,
      status: "completed",
      created_at: new Date().toISOString(),
    });

    // 2. Restock inventory if items are verified as returnable (not damaged write-off)
    if (params.restockInventory) {
      const { items } = await ordersRepository.getOrderWithItems(order.id);
      for (const item of items) {
        if (item.product_id) {
          const inv = await inventoryRepository.getByProductAndStore(item.product_id);
          const currentOnHand = inv ? inv.stock_on_hand : 0;
          await inventoryRepository.updateOnHandStock(
            item.product_id,
            currentOnHand + (item.quantity || 1),
            FLAGSHIP_STORE_ID,
            {
              reasonCode: "RETURN",
              referenceOrderId: order.id,
              actorId: params.processedBy,
              notes: `RMA Restock for order #${order.order_number}`,
            }
          );
        }
      }
    }

    // 3. Transition order status
    const isFullRefund = refundAmount >= order.total;
    const nextOrderStatus = isFullRefund ? "refunded" : "partially_refunded";

    await ordersRepository.update(order.id, {
      status: nextOrderStatus as any,
      notes: order.notes
        ? `${order.notes} | Refund #${refundNumber} processed: Rp ${refundAmount.toLocaleString("id-ID")}`
        : `Refund #${refundNumber} processed: Rp ${refundAmount.toLocaleString("id-ID")}`,
      updated_at: new Date().toISOString(),
    });

    // 4. If linked to an RMA return request, mark RMA completed
    if (params.returnRequestId) {
      await this.updateRmaStatus(params.returnRequestId, {
        status: "completed",
        adminNotes: `Refund #${refundNumber} completed.`,
        handledBy: params.processedBy,
      });
    }

    return {
      refund,
      orderStatus: nextOrderStatus,
    };
  }
}

export const rmaRepository = new RmaRepository();
export const returnRequestsRepository = rmaRepository.returnRequests;
export const refundsRepository = rmaRepository.refunds;
