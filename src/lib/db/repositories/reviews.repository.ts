import "server-only";
import { BaseRepository } from "./base.repository";
import { ProductReviewRow } from "../types";
import { ordersRepository } from "./orders.repository";

export interface ReviewSummary {
  reviews: ProductReviewRow[];
  totalCount: number;
  averageRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export class ReviewsRepository extends BaseRepository<ProductReviewRow> {
  constructor() {
    super("product_reviews", []);
  }

  /**
   * Retrieves all reviews and rating breakdown for a product
   */
  async getByProductId(productId: string): Promise<ReviewSummary> {
    const list = await this.findMany({ product_id: productId });
    const sorted = list.sort(
      (a, b) =>
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
    );

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let totalScore = 0;

    for (const r of sorted) {
      const score = Math.min(5, Math.max(1, Math.round(r.rating || 5))) as 1 | 2 | 3 | 4 | 5;
      distribution[score] = (distribution[score] || 0) + 1;
      totalScore += score;
    }

    const totalCount = sorted.length;
    const averageRating = totalCount > 0 ? Number((totalScore / totalCount).toFixed(1)) : 0;

    return {
      reviews: sorted,
      totalCount,
      averageRating,
      distribution,
    };
  }

  /**
   * Verifies whether customer has a delivered order for this product and hasn't reviewed yet (CUST-06)
   */
  async canUserReview(
    productId: string,
    customerEmail?: string | null,
    userId?: string | null
  ): Promise<{ allowed: boolean; reason?: string; orderId?: string }> {
    if (!customerEmail && !userId) {
      return {
        allowed: false,
        reason: "Customer email or account authentication is required to verify purchase.",
      };
    }

    const cleanEmail = customerEmail ? customerEmail.trim().toLowerCase() : "";

    // 1. Check if user already reviewed this product
    const existingReviews = await this.findMany({ product_id: productId });
    const hasAlreadyReviewed = existingReviews.some((r) => {
      if (cleanEmail && r.customer_email.trim().toLowerCase() === cleanEmail) return true;
      if (userId && r.user_id === userId) return true;
      return false;
    });

    if (hasAlreadyReviewed) {
      return {
        allowed: false,
        reason: "You have already reviewed this product. Only one review per customer is allowed.",
      };
    }

    // 2. Query delivered orders containing this product
    const deliveredStatuses = ["collected", "delivery_arrived", "finished"];
    const allOrders = await ordersRepository.findMany({});

    const matchingCustomerOrders = allOrders.filter((o) => {
      const emailMatch = cleanEmail && o.customer_email.trim().toLowerCase() === cleanEmail;
      const userMatch = userId && o.customer_id === userId;
      const statusMatch = deliveredStatuses.includes(o.status);
      return (emailMatch || userMatch) && statusMatch;
    });

    for (const order of matchingCustomerOrders) {
      const { items } = await ordersRepository.getOrderWithItems(order.id);
      const hasPurchasedProduct = items.some((item) => item.product_id === productId);

      if (hasPurchasedProduct) {
        return {
          allowed: true,
          orderId: order.id,
        };
      }
    }

    return {
      allowed: false,
      reason: "Only verified buyers with a confirmed delivered order can submit a review.",
    };
  }

  /**
   * Creates a verified buyer review after running delivered purchase verification
   */
  async createVerifiedReview(params: {
    productId: string;
    customerEmail: string;
    customerName: string;
    rating: number;
    title: string;
    content: string;
    userId?: string | null;
  }): Promise<ProductReviewRow> {
    const check = await this.canUserReview(
      params.productId,
      params.customerEmail,
      params.userId
    );

    if (!check.allowed) {
      throw new Error(check.reason || "Review submission not permitted.");
    }

    const clampedRating = Math.min(5, Math.max(1, Math.round(Number(params.rating) || 5)));

    return this.create({
      id: `rev-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      product_id: params.productId,
      user_id: params.userId || null,
      customer_email: params.customerEmail.trim().toLowerCase(),
      customer_name: params.customerName.trim(),
      rating: clampedRating,
      title: params.title.trim(),
      content: params.content.trim(),
      verified_purchase: true,
      helpful_votes: 0,
      created_at: new Date().toISOString(),
    });
  }
}

export const reviewsRepository = new ReviewsRepository();
