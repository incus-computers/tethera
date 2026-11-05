// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  generateGuestTrackingToken,
  verifyGuestTrackingToken,
} from "@/lib/utils/orderTracking";
import { GET as trackGET, POST as trackPOST } from "@/app/api/orders/track/route";
import { GET as cartGET, POST as cartPOST, DELETE as cartDELETE } from "@/app/api/cart/route";
import { POST as mergePOST } from "@/app/api/cart/merge/route";

describe("Phase 3 Milestone 1: Hybrid Cart & Guest Order Tracking", () => {
  describe("High-Entropy Signed Guest Tracking Token", () => {
    const orderNumber = "TET-20261105-7788";
    const customerEmail = "gamer@tethera.com";

    it("generates formatted token with order number and HMAC digest", () => {
      const token = generateGuestTrackingToken(orderNumber, customerEmail);
      expect(typeof token).toBe("string");
      expect(token.startsWith(orderNumber)).toBe(true);
      expect(token.split(".").length).toBe(2);
      expect(token.split(".")[1].length).toBe(32);
    });

    it("validates authentic token successfully", () => {
      const token = generateGuestTrackingToken(orderNumber, customerEmail);
      const isValid = verifyGuestTrackingToken(token, orderNumber, customerEmail);
      expect(isValid).toBe(true);
    });

    it("rejects token when email or order number is mismatched", () => {
      const token = generateGuestTrackingToken(orderNumber, customerEmail);
      // Wrong email
      expect(
        verifyGuestTrackingToken(token, orderNumber, "hacker@domain.com")
      ).toBe(false);
      // Wrong order number
      expect(
        verifyGuestTrackingToken(token, "TET-20261105-0000", customerEmail)
      ).toBe(false);
      // Tampered token hash
      expect(
        verifyGuestTrackingToken(`${orderNumber}.deadbeef1234`, orderNumber, customerEmail)
      ).toBe(false);
    });
  });

  describe("Guest Order Tracking API (/api/orders/track)", () => {
    it("returns 400 when GET is invoked without token", async () => {
      const req = new NextRequest("http://localhost:3000/api/orders/track", {
        method: "GET",
      });
      const res = await trackGET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/token is required/i);
    });

    it("returns 401 when token HMAC verification fails", async () => {
      // Valid order exists in database (e.g. ord-1001 with order_number TET-2026-0901)
      const targetOrder = await db.orders.findById("ord-1001");
      expect(targetOrder).toBeDefined();

      const invalidToken = `${targetOrder!.order_number}.00000000000000000000000000000000`;
      const req = new NextRequest(
        `http://localhost:3000/api/orders/track?token=${encodeURIComponent(invalidToken)}`,
        { method: "GET" }
      );

      const res = await trackGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/invalid or expired/i);
    });

    it("returns tracking data when given a valid signed token", async () => {
      const targetOrder = await db.orders.findById("ord-1001");
      expect(targetOrder).toBeDefined();

      const validToken = generateGuestTrackingToken(
        targetOrder!.order_number,
        targetOrder!.customer_email
      );

      const req = new NextRequest(
        `http://localhost:3000/api/orders/track?token=${encodeURIComponent(validToken)}`,
        { method: "GET" }
      );

      const res = await trackGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.orderNumber).toBe(targetOrder!.order_number);
      expect(json.order.status).toBe(targetOrder!.status);
      expect(Array.isArray(json.order.items)).toBe(true);
      expect(json.order.trackingToken).toBe(validToken);
    });

    it("allows POST lookup with valid orderNumber and email", async () => {
      const targetOrder = await db.orders.findById("ord-1001");
      expect(targetOrder).toBeDefined();

      const req = new NextRequest("http://localhost:3000/api/orders/track", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: targetOrder!.order_number,
          email: targetOrder!.customer_email,
        }),
      });

      const res = await trackPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.orderNumber).toBe(targetOrder!.order_number);
    });

    it("rejects POST lookup when email does not match", async () => {
      const targetOrder = await db.orders.findById("ord-1001");
      expect(targetOrder).toBeDefined();

      const req = new NextRequest("http://localhost:3000/api/orders/track", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: targetOrder!.order_number,
          email: "wrong.email@tethera.com",
        }),
      });

      const res = await trackPOST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/does not match/i);
    });
  });

  describe("Persistent Hybrid Cart Repository & API (/api/cart)", () => {
    const testGuestToken = "gst_test_session_123456";

    it("initializes an active cart and returns hydrated item schema via GET /api/cart", async () => {
      const req = new NextRequest("http://localhost:3000/api/cart", {
        method: "GET",
        headers: { "x-cart-token": testGuestToken },
      });

      const res = await cartGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.cart).toBeDefined();
      expect(json.cart.items).toEqual([]);
      expect(json.cart.subtotal).toBe(0);
    });

    it("adds item and hydrates with real-time catalog price and stock via POST /api/cart", async () => {
      const req = new NextRequest("http://localhost:3000/api/cart", {
        method: "POST",
        headers: { "x-cart-token": testGuestToken },
        body: JSON.stringify({
          productId: "cpu-1",
          quantity: 2,
        }),
      });

      const res = await cartPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.cart.items.length).toBe(1);

      const addedItem = json.cart.items[0];
      expect(addedItem.product_id).toBe("cpu-1");
      expect(addedItem.quantity).toBe(2);
      expect(addedItem.product.name).toBeDefined();
      expect(addedItem.product.currentPrice).toBeGreaterThan(0);
      expect(json.cart.subtotal).toBe(addedItem.product.currentPrice * 2);
    });

    it("updates item quantity and calculates updated subtotal via POST /api/cart", async () => {
      // First fetch to get cart item id
      const getReq = new NextRequest("http://localhost:3000/api/cart", {
        method: "GET",
        headers: { "x-cart-token": testGuestToken },
      });
      const getRes = await cartGET(getReq);
      const getJson = await getRes.json();
      const cartItemId = getJson.cart.items[0].id;

      // Update quantity to 3
      const updateReq = new NextRequest("http://localhost:3000/api/cart", {
        method: "POST",
        headers: { "x-cart-token": testGuestToken },
        body: JSON.stringify({
          cartItemId,
          quantity: 3,
        }),
      });

      const updateRes = await cartPOST(updateReq);
      expect(updateRes.status).toBe(200);
      const updateJson = await updateRes.json();
      expect(updateJson.cart.items[0].quantity).toBe(3);
    });

    it("removes an item via DELETE /api/cart", async () => {
      const getReq = new NextRequest("http://localhost:3000/api/cart", {
        method: "GET",
        headers: { "x-cart-token": testGuestToken },
      });
      const getRes = await cartGET(getReq);
      const getJson = await getRes.json();
      const cartItemId = getJson.cart.items[0].id;

      const deleteReq = new NextRequest("http://localhost:3000/api/cart", {
        method: "DELETE",
        headers: { "x-cart-token": testGuestToken },
        body: JSON.stringify({ cartItemId }),
      });

      const deleteRes = await cartDELETE(deleteReq);
      expect(deleteRes.status).toBe(200);
      const deleteJson = await deleteRes.json();
      expect(deleteJson.cart.items.length).toBe(0);
      expect(deleteJson.cart.subtotal).toBe(0);
    });
  });

  describe("Cart Merging on Customer Login (/api/cart/merge)", () => {
    it("merges anonymous guest items into user account cart", async () => {
      const guestToken = "gst_merge_source_999999";
      const testUserId = "usr_authenticated_customer_777";

      // 1. Add item to guest cart
      const guestAddReq = new NextRequest("http://localhost:3000/api/cart", {
        method: "POST",
        headers: { "x-cart-token": guestToken },
        body: JSON.stringify({
          productId: "cpu-2",
          quantity: 1,
        }),
      });
      await cartPOST(guestAddReq);

      // 2. Add different item to user cart
      const userAddReq = new NextRequest("http://localhost:3000/api/cart", {
        method: "POST",
        headers: { authorization: `Bearer ${testUserId}` },
        body: JSON.stringify({
          productId: "gpu-1",
          quantity: 1,
        }),
      });
      await cartPOST(userAddReq);

      // 3. Trigger cart merge
      const mergeReq = new NextRequest("http://localhost:3000/api/cart/merge", {
        method: "POST",
        body: JSON.stringify({
          anonymousToken: guestToken,
          userId: testUserId,
        }),
      });

      const mergeRes = await mergePOST(mergeReq);
      expect(mergeRes.status).toBe(200);
      const mergeJson = await mergeRes.json();
      expect(mergeJson.success).toBe(true);

      // Merged cart must have both items
      const mergedProductIds = mergeJson.cart.items.map((it: any) => it.product_id);
      expect(mergedProductIds).toContain("cpu-2");
      expect(mergedProductIds).toContain("gpu-1");
      expect(mergeJson.cart.items.length).toBe(2);

      // Guest cart should now be empty and merged
      const guestCheckReq = new NextRequest("http://localhost:3000/api/cart", {
        method: "GET",
        headers: { "x-cart-token": guestToken },
      });
      const guestCheckRes = await cartGET(guestCheckReq);
      const guestCheckJson = await guestCheckRes.json();
      expect(guestCheckJson.cart.items.length).toBe(0);
    });
  });
});
