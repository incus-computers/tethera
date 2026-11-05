import "server-only";
import { BaseRepository } from "./base.repository";
import { FulfillmentRow, FulfillmentItemRow } from "../types";

export class FulfillmentsRepository extends BaseRepository<FulfillmentRow> {
  private itemsRepository: BaseRepository<FulfillmentItemRow>;

  constructor() {
    super("fulfillments", []);
    this.itemsRepository = new BaseRepository<FulfillmentItemRow>("fulfillment_items", []);
  }

  async getFulfillmentsByOrder(orderId: string): Promise<
    Array<{
      fulfillment: FulfillmentRow;
      items: FulfillmentItemRow[];
    }>
  > {
    const list = await this.findMany({ order_id: orderId });
    const results = [];

    for (const f of list) {
      const items = await this.itemsRepository.findMany({ fulfillment_id: f.id });
      results.push({ fulfillment: f, items });
    }

    return results;
  }

  async createSplitFulfillment(
    orderId: string,
    data: {
      carrier: string;
      serviceCode: string;
      waybillId?: string | null;
      trackingUrl?: string | null;
      dispatchedBy?: string | null;
      notes?: string | null;
      items: Array<{ orderItemId: string; quantity: number }>;
    }
  ): Promise<{ fulfillment: FulfillmentRow; items: FulfillmentItemRow[] }> {
    const fulfillmentNumber = `FUL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const fulfillment = await this.create({
      order_id: orderId,
      fulfillment_number: fulfillmentNumber,
      carrier: data.carrier,
      service_code: data.serviceCode,
      waybill_id: data.waybillId || null,
      tracking_url: data.trackingUrl || null,
      status: "shipped",
      shipped_at: new Date().toISOString(),
      dispatched_by: data.dispatchedBy || "staff",
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const createdItems: FulfillmentItemRow[] = [];
    for (const it of data.items) {
      const itemRow = await this.itemsRepository.create({
        fulfillment_id: fulfillment.id,
        order_item_id: it.orderItemId,
        quantity: it.quantity,
      });
      createdItems.push(itemRow);
    }

    return { fulfillment, items: createdItems };
  }
}

export const fulfillmentsRepository = new FulfillmentsRepository();
