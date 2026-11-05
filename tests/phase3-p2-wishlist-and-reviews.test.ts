// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "@/lib/db";

describe("P2.2 Customer Wishlist & Verified Buyer Reviews", () => {
  describe("ReviewsRepository: Delivered Purchase Verification & Rating Aggregation", () => {
    it("blocks review submission when customer has not purchased or received the product", async () => {
      const eligibility = await db.reviews.canUserReview(
        "cpu-1",
        "random-unverified@example.com"
      );
      expect(eligibility.allowed).toBe(false);
      expect(eligibility.reason).toMatch(/only verified buyers/i);
    });

    it("allows review submission when customer has an order with delivered/collected status", async () => {
      const email = "verified-buyer-1@example.com";
      const { order } = await db.orders.createOrderWithItems(
        {
          order_number: `TET-VERIFIED-${Date.now()}`,
          customer_name: "Verified Buyer One",
          customer_email: email,
          customer_phone: "+62 812-1111-2222",
          fulfillment_type: "delivery",
          payment_method: "QRIS",
          status: "delivery_arrived",
          subtotal: 5000000,
          shipping_fee: 30000,
          assembly_fee: 0,
          total: 5030000,
        },
        [
          {
            product_id: "mb-1",
            product_title_snapshot: "ASUS ROG STRIX B650E-F",
            quantity: 1,
            unit_price: 5000000,
            is_custom_build: false,
          },
        ]
      );

      expect(order).toBeDefined();

      const eligibility = await db.reviews.canUserReview("mb-1", email);
      expect(eligibility.allowed).toBe(true);

      const review = await db.reviews.createVerifiedReview({
        productId: "mb-1",
        customerEmail: email,
        customerName: "Verified Buyer One",
        rating: 5,
        title: "Phenomenal AM5 motherboard",
        content: "Outstanding VRM thermals and clean PCIe 5.0 layout. Flawless boot.",
      });

      expect(review.id).toBeDefined();
      expect(review.verified_purchase).toBe(true);
      expect(review.rating).toBe(5);

      // Verify customer cannot submit duplicate review for same product
      const secondCheck = await db.reviews.canUserReview("mb-1", email);
      expect(secondCheck.allowed).toBe(false);
      expect(secondCheck.reason).toMatch(/already reviewed/i);
    });

    it("aggregates star ratings and 1-5 histogram distribution accurately", async () => {
      // Add multiple reviews for a product
      await db.reviews.create({
        id: `rev-test-${Date.now()}-1`,
        product_id: "ram-1",
        customer_email: "reviewer1@example.com",
        customer_name: "Gamer A",
        rating: 5,
        title: "Super fast",
        content: "DDR5 6000MHz works great with EXPO.",
        verified_purchase: true,
        created_at: new Date().toISOString(),
      });

      await db.reviews.create({
        id: `rev-test-${Date.now()}-2`,
        product_id: "ram-1",
        customer_email: "reviewer2@example.com",
        customer_name: "Gamer B",
        rating: 4,
        title: "Solid kit",
        content: "Runs cool, low profile fits under large air coolers.",
        verified_purchase: true,
        created_at: new Date().toISOString(),
      });

      const summary = await db.reviews.getByProductId("ram-1");
      expect(summary.totalCount).toBeGreaterThanOrEqual(2);
      expect(summary.averageRating).toBeGreaterThanOrEqual(4);
      expect(summary.distribution[5]).toBeGreaterThanOrEqual(1);
      expect(summary.distribution[4]).toBeGreaterThanOrEqual(1);
    });
  });

  describe("WishlistRepository: Hybrid Session & Account Merging", () => {
    it("persists and removes items for anonymous session token", async () => {
      const sessionToken = `anon-session-${Date.now()}`;

      await db.wishlist.addItem({ sessionToken }, "gpu-1");
      await db.wishlist.addItem({ sessionToken }, "gpu-2");

      let items = await db.wishlist.getWishlist({ sessionToken });
      expect(items.length).toBe(2);
      expect(items.some((i) => i.product_id === "gpu-1")).toBe(true);

      const inWishlist = await db.wishlist.isInWishlist("gpu-1", { sessionToken });
      expect(inWishlist).toBe(true);

      await db.wishlist.removeItem({ sessionToken }, "gpu-1");
      items = await db.wishlist.getWishlist({ sessionToken });
      expect(items.length).toBe(1);
      expect(items.some((i) => i.product_id === "gpu-1")).toBe(false);
    });

    it("merges guest session wishlist into authenticated user account on login", async () => {
      const sessionToken = `anon-merge-${Date.now()}`;
      const userId = `user-account-${Date.now()}`;

      // Guest adds items
      await db.wishlist.addItem({ sessionToken }, "cpu-1");
      await db.wishlist.addItem({ sessionToken }, "cpu-2");

      // User already had an item
      await db.wishlist.addItem({ userId }, "cpu-3");

      // Login merge
      await db.wishlist.mergeSessionWishlist(sessionToken, userId);

      // Verify user has all 3 items
      const userItems = await db.wishlist.getWishlist({ userId });
      expect(userItems.length).toBe(3);
      expect(userItems.some((i) => i.product_id === "cpu-1")).toBe(true);
      expect(userItems.some((i) => i.product_id === "cpu-2")).toBe(true);
      expect(userItems.some((i) => i.product_id === "cpu-3")).toBe(true);

      // Verify anonymous items are cleared
      const guestItems = await db.wishlist.getWishlist({ sessionToken });
      expect(guestItems.length).toBe(0);
    });
  });
});
