import "server-only";
import { BaseRepository } from "./base.repository";
import { ReturnRequestRow, RefundRow } from "../types";
import { ordersRepository } from "./orders.repository";
import { RefundError } from "@/lib/refunds/contracts";

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
      throw new RefundError(`Order '${params.orderNumber}' not found.`);
    }

    if (order.customer_email.trim().toLowerCase() !== params.customerEmail.trim().toLowerCase()) {
      throw new RefundError("Customer email address does not match order record.");
    }

    const { createReturn } = await import("@/lib/refunds/service");
    return createReturn(order.id,params.reason,params.customerNotes,params.photos);
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
    const { transitionReturn } = await import("@/lib/refunds/service");
    return transitionReturn(rmaId,params.status,params.adminNotes,params.handledBy||"staff");
  }

  /**
   * Requests a verified financial refund; physical recovery uses inspected receipts.
   */
  async processRefund(params: {
    orderId: string;
    returnRequestId?: string | null;
    amount: number;
    requestKey: string;
    reason: string;
    restockInventory: boolean;
    processedBy: string;
  }): Promise<any> {
    const { issueRefund } = await import("@/lib/refunds/service");
    return issueRefund(params,params.processedBy);
  }

}

export const rmaRepository = new RmaRepository();
export const returnRequestsRepository = rmaRepository.returnRequests;
export const refundsRepository = rmaRepository.refunds;
