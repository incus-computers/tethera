import "server-only";
import { BaseRepository } from "./base.repository";
import { WishlistItemRow } from "../types";

export class WishlistRepository extends BaseRepository<WishlistItemRow> {
  constructor() {
    super("customer_wishlist", []);
  }

  /**
   * Retrieves wishlist items for either a logged-in user or an anonymous session
   */
  async getWishlist(filter: {
    userId?: string | null;
    sessionToken?: string | null;
  }): Promise<WishlistItemRow[]> {
    if (!filter.userId && !filter.sessionToken) {
      return [];
    }

    const all = await this.findMany({});
    return all.filter((item) => {
      if (filter.userId && item.user_id === filter.userId) return true;
      if (filter.sessionToken && item.anonymous_session_token === filter.sessionToken) {
        return true;
      }
      return false;
    }).sort(
      (a, b) =>
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
    );
  }

  /**
   * Checks if a product is in the user's or session's wishlist
   */
  async isInWishlist(
    productId: string,
    filter: { userId?: string | null; sessionToken?: string | null }
  ): Promise<boolean> {
    const items = await this.getWishlist(filter);
    return items.some((i) => i.product_id === productId);
  }

  /**
   * Adds a product to the user's or anonymous session's wishlist
   */
  async addItem(
    filter: { userId?: string | null; sessionToken?: string | null },
    productId: string
  ): Promise<WishlistItemRow> {
    const existing = await this.isInWishlist(productId, filter);
    if (existing) {
      const current = await this.getWishlist(filter);
      return current.find((i) => i.product_id === productId)!;
    }

    return this.create({
      id: `wish-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      user_id: filter.userId || null,
      anonymous_session_token: filter.sessionToken || null,
      product_id: productId,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Removes a product from the wishlist
   */
  async removeItem(
    filter: { userId?: string | null; sessionToken?: string | null },
    productId: string
  ): Promise<boolean> {
    const items = await this.getWishlist(filter);
    const target = items.find((i) => i.product_id === productId);
    if (!target) return false;

    return this.delete(target.id);
  }

  /**
   * Merges an anonymous guest session wishlist into the authenticated user's account
   */
  async mergeSessionWishlist(
    sessionToken: string,
    userId: string
  ): Promise<WishlistItemRow[]> {
    if (!sessionToken || !userId) return [];

    const guestItems = await this.getWishlist({ sessionToken });
    const userItems = await this.getWishlist({ userId });
    const userProductIds = new Set(userItems.map((i) => i.product_id));

    for (const item of guestItems) {
      if (!userProductIds.has(item.product_id)) {
        await this.create({
          id: `wish-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          user_id: userId,
          anonymous_session_token: null,
          product_id: item.product_id,
          created_at: new Date().toISOString(),
        });
        userProductIds.add(item.product_id);
      }
      // Delete guest row
      await this.delete(item.id);
    }

    return this.getWishlist({ userId });
  }
}

export const wishlistRepository = new WishlistRepository();
