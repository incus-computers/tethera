// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { db } from "@/lib/db";
import {
  GET as getReviewsRoute,
  POST as postReviewRoute,
} from "@/app/api/products/[id]/reviews/route";
import {
  GET as getWishlistRoute,
  POST as postWishlistRoute,
  DELETE as deleteWishlistRoute,
} from "@/app/api/wishlist/route";
import { POST as mergeWishlistRoute } from "@/app/api/wishlist/merge/route";

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

  describe("API Route: /api/products/[id]/reviews", () => {
    it("blocks unverified customer with 403 Forbidden", async () => {
      const req = new NextRequest("http://localhost:3000/api/products/cpu-1/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerEmail: "fraudulent-reviewer@example.com",
          customerName: "Imposter",
          rating: 5,
          title: "Fake review",
          content: "Did not buy but leaving review anyway",
        }),
      });

      const res = await postReviewRoute(req, { params: { id: "cpu-1" } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/only verified buyers/i);
    });

    it("accepts review from verified delivered customer with 201 Created and updates GET histogram", async () => {
      const email = `buyer-${Date.now()}@example.com`;
      await db.orders.createOrderWithItems(
        {
          order_number: `TET-REV-API-${Date.now()}`,
          customer_name: "Delivered Customer",
          customer_email: email,
          customer_phone: "+62 811-9999-8888",
          fulfillment_type: "delivery",
          payment_method: "BCA Virtual Account",
          status: "collected",
          subtotal: 3500000,
          shipping_fee: 0,
          assembly_fee: 0,
          total: 3500000,
        },
        [
          {
            product_id: "psu-1",
            product_title_snapshot: "Corsair RM750e",
            quantity: 1,
            unit_price: 3500000,
            is_custom_build: false,
          },
        ]
      );

      const postReq = new NextRequest("http://localhost:3000/api/products/psu-1/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerEmail: email,
          customerName: "Delivered Customer",
          rating: 5,
          title: "Dead silent ATX 3.0 PSU",
          content: "Powers my RTX 4080 Super without any coil whine.",
        }),
      });

      const postRes = await postReviewRoute(postReq, { params: { id: "psu-1" } });
      expect(postRes.status).toBe(201);
      const postData = await postRes.json();
      expect(postData.success).toBe(true);
      expect(postData.review.verified_purchase).toBe(true);

      const getReq = new NextRequest(`http://localhost:3000/api/products/psu-1/reviews?checkEmail=${encodeURIComponent(email)}`);
      const getRes = await getReviewsRoute(getReq, { params: { id: "psu-1" } });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.success).toBe(true);
      expect(getData.summary.totalCount).toBeGreaterThanOrEqual(1);
      expect(getData.summary.distribution[5]).toBeGreaterThanOrEqual(1);
      expect(getData.eligibility.allowed).toBe(false); // already reviewed
    });
  });

  describe("API Route: /api/wishlist and /api/wishlist/merge", () => {
    it("handles adding, retrieving hydrated items, and deleting from wishlist", async () => {
      const sessionToken = `test-sess-${Date.now()}`;

      // POST add item
      const addReq = new NextRequest("http://localhost:3000/api/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: "gpu-1",
          sessionToken,
        }),
      });

      const addRes = await postWishlistRoute(addReq);
      expect(addRes.status).toBe(200);
      const addData = await addRes.json();
      expect(addData.success).toBe(true);

      // GET wishlist hydrated
      const getReq = new NextRequest(`http://localhost:3000/api/wishlist?sessionToken=${sessionToken}`);
      const getRes = await getWishlistRoute(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.success).toBe(true);
      expect(getData.items.length).toBe(1);
      expect(getData.items[0].product).toBeDefined();
      expect(getData.items[0].product.id).toBe("gpu-1");

      // DELETE item
      const delReq = new NextRequest("http://localhost:3000/api/wishlist", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: "gpu-1",
          sessionToken,
        }),
      });

      const delRes = await deleteWishlistRoute(delReq);
      expect(delRes.status).toBe(200);

      const verifyReq = new NextRequest(`http://localhost:3000/api/wishlist?sessionToken=${sessionToken}`);
      const verifyRes = await getWishlistRoute(verifyReq);
      const verifyData = await verifyRes.json();
      expect(verifyData.items.length).toBe(0);
    });

    it("merges guest session wishlist into customer account via /api/wishlist/merge", async () => {
      const sessionToken = `merge-sess-${Date.now()}`;
      const userId = `merge-user-${Date.now()}`;

      // Add to session
      const addReq = new NextRequest("http://localhost:3000/api/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: "cpu-1",
          sessionToken,
        }),
      });
      await postWishlistRoute(addReq);

      // Merge
      const mergeReq = new NextRequest("http://localhost:3000/api/wishlist/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          userId,
        }),
      });

      const mergeRes = await mergeWishlistRoute(mergeReq);
      expect(mergeRes.status).toBe(200);
      const mergeData = await mergeRes.json();
      expect(mergeData.success).toBe(true);
      expect(mergeData.items.some((i: any) => i.product_id === "cpu-1")).toBe(true);
    });
  });
});
