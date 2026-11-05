import "server-only";
import { BaseRepository } from "./base.repository";
import { StockNotificationRow } from "../types";

export class StockNotificationsRepository extends BaseRepository<StockNotificationRow> {
  constructor() {
    super("stock_notifications", []);
  }

  /**
   * Registers a customer back-in-stock notification request (CUST-01)
   * Deduplicates requests to prevent redundant alerts for the same customer and SKU.
   */
  async requestNotification(params: {
    productId: string;
    variantId?: string | null;
    email: string;
    phone?: string | null;
  }): Promise<StockNotificationRow> {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = params.phone ? params.phone.trim() : null;

    // Check for existing pending notification
    const existing = await this.findMany({ product_id: params.productId });
    const match = existing.find((req) => {
      if (req.notified_at) return false;
      const emailMatches = req.email.toLowerCase() === cleanEmail;
      const phoneMatches = cleanPhone && req.phone === cleanPhone;
      const variantMatches = (req.variant_id || null) === (params.variantId || null);
      return (emailMatches || phoneMatches) && variantMatches;
    });

    if (match) {
      return match;
    }

    return this.create({
      id: `stk-notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      product_id: params.productId,
      variant_id: params.variantId || null,
      email: cleanEmail,
      phone: cleanPhone,
      notified_at: null,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Retrieves pending notifications for a specific product
   */
  async getPendingNotifications(productId: string): Promise<StockNotificationRow[]> {
    const list = await this.findMany({ product_id: productId });
    return list.filter((n) => !n.notified_at);
  }

  /**
   * Marks a notification as fulfilled
   */
  async markNotified(notificationId: string): Promise<StockNotificationRow | null> {
    return this.update(notificationId, {
      notified_at: new Date().toISOString(),
    });
  }
}

export const stockNotificationsRepository = new StockNotificationsRepository();
