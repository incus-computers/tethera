// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  generateMidtransSignature,
  verifyMidtransSignature,
} from "@/lib/payment/midtrans";
import { POST as createOrderPOST } from "@/app/api/checkout/create-order/route";
import { POST as webhookPOST } from "@/app/api/webhooks/midtrans/route";
import { POST as chargePOST } from "@/app/api/checkout/midtrans/charge/route";

describe("Phase 1 Security & Webhook Architecture", () => {
  const TEST_SERVER_KEY = "SB-Mid-server-test-tethera";

  describe("Cryptographic SHA512 Midtrans Signature", () => {
    it("generates deterministic SHA512 signature matching Midtrans specification", () => {
      const orderId = "TET-20261105-9999";
      const statusCode = "200";
      const grossAmount = "15000000.00";

      const signature = generateMidtransSignature(
        orderId,
        statusCode,
        grossAmount,
        TEST_SERVER_KEY
      );

      expect(typeof signature).toBe("string");
      expect(signature.length).toBe(128); // SHA-512 hex string length is 128 characters
    });

    it("verifies valid signature with exact amount and with decimal variations", () => {
      const orderId = "TET-20261105-8888";
      const statusCode = "200";
      const amountNumber = 7199000;
      const signature = generateMidtransSignature(
        orderId,
        statusCode,
        amountNumber,
        TEST_SERVER_KEY
      );

      // Verifies when gross_amount is numeric
      expect(
        verifyMidtransSignature(
          orderId,
          statusCode,
          amountNumber,
          signature,
          TEST_SERVER_KEY
        )
      ).toBe(true);

      // Verifies when gross_amount is string integer
      expect(
        verifyMidtransSignature(
          orderId,
          statusCode,
          "7199000",
          signature,
          TEST_SERVER_KEY
        )
      ).toBe(true);

      // Verifies when gross_amount is formatted with cents string
      expect(
        verifyMidtransSignature(
          orderId,
          statusCode,
          "7199000.00",
          signature,
          TEST_SERVER_KEY
        )
      ).toBe(true);
    });

    it("rejects invalid, mismatched, or tampered signatures", () => {
      const orderId = "TET-20261105-7777";
      const statusCode = "200";
      const signature = generateMidtransSignature(
        orderId,
        statusCode,
        1000000,
        TEST_SERVER_KEY
      );

      // Tampered amount
      expect(
        verifyMidtransSignature(
          orderId,
          statusCode,
          9999999,
          signature,
          TEST_SERVER_KEY
        )
      ).toBe(false);

      // Tampered orderId
      expect(
        verifyMidtransSignature(
          "TET-FAKE-ORDER",
          statusCode,
          1000000,
          signature,
          TEST_SERVER_KEY
        )
      ).toBe(false);

      // Wrong server key
      expect(
        verifyMidtransSignature(
          orderId,
          statusCode,
          1000000,
          signature,
          "SB-Wrong-Key"
        )
      ).toBe(false);
    });
  });

  describe("Server-Side Price Recalculation & Tamper Resistance (/api/checkout/create-order)", () => {
    it("rejects orders without required customer details", async () => {
      const req = new NextRequest("http://localhost:3000/api/checkout/create-order", {
        method: "POST",
        body: JSON.stringify({
          customer: { name: "John Doe" }, // missing phone and email
          fulfillmentType: "click_and_collect",
          items: [],
        }),
      });

      const res = await createOrderPOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/phone, and email are required/i);
    });

    it("recalculates hardware item prices from the database, ignoring client price spoofing", async () => {
      // Find a real product in the catalog (e.g. cpu-1: Intel Core i7-14700K priced at 7199000)
      const targetProduct = await db.products.findById("cpu-1");
      expect(targetProduct).toBeDefined();
      const authenticPrice = targetProduct!.sale_price ?? targetProduct!.retail_price;

      const req = new NextRequest("http://localhost:3000/api/checkout/create-order", {
        method: "POST",
        body: JSON.stringify({
          customer: {
            name: "Audit Customer",
            phone: "081299998888",
            email: "audit@tethera.com",
          },
          fulfillmentType: "click_and_collect",
          items: [
            {
              id: "cpu-1",
              quantity: 2,
              price: 1000, // Spoofed client price: Rp 1.000 instead of authentic price
            },
          ],
          subtotal: 2000, // Spoofed subtotal
          total: 2000, // Spoofed total
          shippingFee: 0,
        }),
      });

      const res = await createOrderPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Server must calculate 2 * authenticPrice
      const expectedSubtotal = authenticPrice * 2;
      expect(json.subtotal).toBe(expectedSubtotal);
      expect(json.total).toBe(expectedSubtotal);
      expect(json.shippingFee).toBe(0);

      // Check stored order in DB
      const savedOrder = await db.orders.findById(json.orderId);
      expect(savedOrder).toBeDefined();
      expect(savedOrder!.subtotal).toBe(expectedSubtotal);
      expect(savedOrder!.total).toBe(expectedSubtotal);
    });

    it("enforces zero shipping fee for click and collect fulfillment", async () => {
      const req = new NextRequest("http://localhost:3000/api/checkout/create-order", {
        method: "POST",
        body: JSON.stringify({
          customer: {
            name: "Pickup Customer",
            phone: "081211112222",
            email: "pickup@tethera.com",
          },
          fulfillmentType: "click_and_collect",
          items: [{ id: "cpu-1", quantity: 1 }],
          shippingFee: 50000, // Client attempts to add fake shipping fee
        }),
      });

      const res = await createOrderPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.shippingFee).toBe(0);
      expect(json.pickupCode).toBeDefined();
      expect(json.pickupCode.length).toBe(4);
    });

    it("atomically increments reserved inventory count when order is placed", async () => {
      const initialInv = await db.inventory.getByProductAndStore("cpu-2");
      const initialReserved = initialInv?.stock_reserved || 0;

      const req = new NextRequest("http://localhost:3000/api/checkout/create-order", {
        method: "POST",
        body: JSON.stringify({
          customer: {
            name: "Inventory Tester",
            phone: "081234567890",
            email: "tester@tethera.com",
          },
          fulfillmentType: "click_and_collect",
          items: [{ id: "cpu-2", quantity: 1 }],
        }),
      });

      const res = await createOrderPOST(req);
      const json = await res.json();
      expect(json.success).toBe(true);

      const afterInv = await db.inventory.getByProductAndStore("cpu-2");
      expect(afterInv?.stock_reserved).toBe(initialReserved + 1);
    });
  });

  describe("Midtrans Webhook Processing (/api/webhooks/midtrans)", () => {
    it("returns 401 when signature verification fails", async () => {
      const req = new NextRequest("http://localhost:3000/api/webhooks/midtrans", {
        method: "POST",
        body: JSON.stringify({
          order_id: "TET-FAKE-9999",
          status_code: "200",
          gross_amount: "5000000.00",
          signature_key: "bad-invalid-signature",
          transaction_status: "settlement",
        }),
      });

      const res = await webhookPOST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid cryptographic signature/i);
    });

    it("returns 404 when target order does not exist", async () => {
      const orderId = "TET-NONEXISTENT-0001";
      const statusCode = "200";
      const grossAmount = "1000000.00";
      const signature = generateMidtransSignature(
        orderId,
        statusCode,
        grossAmount,
        TEST_SERVER_KEY
      );

      const req = new NextRequest("http://localhost:3000/api/webhooks/midtrans", {
        method: "POST",
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signature,
          transaction_status: "settlement",
        }),
      });

      const res = await webhookPOST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/Order not found/i);
    });

    it("processes settlement event: marks order paid, settles inventory, and is idempotent", async () => {
      // 1. Create a fresh order through create-order
      const createReq = new NextRequest("http://localhost:3000/api/checkout/create-order", {
        method: "POST",
        body: JSON.stringify({
          customer: {
            name: "Webhook Settlement Customer",
            phone: "081277778888",
            email: "settlement@tethera.com",
          },
          fulfillmentType: "click_and_collect",
          items: [{ id: "cpu-3", quantity: 1 }],
        }),
      });

      const createRes = await createOrderPOST(createReq);
      const createJson = await createRes.json();
      expect(createJson.success).toBe(true);
      const orderNumber = createJson.orderNumber;
      const orderId = createJson.orderId;
      const totalAmount = createJson.total;

      const orderBefore = await db.orders.findById(orderId);
      expect(orderBefore?.status).toBe("order_received");

      // Check inventory has 1 reserved
      const invBefore = await db.inventory.getByProductAndStore("cpu-3");
      const reservedBefore = invBefore?.stock_reserved || 0;
      const onHandBefore = invBefore?.stock_on_hand || 0;

      // 2. Midtrans sends settlement notification
      const statusCode = "200";
      const signature = generateMidtransSignature(
        orderNumber,
        statusCode,
        totalAmount,
        TEST_SERVER_KEY
      );

      const webhookReq = new NextRequest("http://localhost:3000/api/webhooks/midtrans", {
        method: "POST",
        body: JSON.stringify({
          order_id: orderNumber,
          status_code: statusCode,
          gross_amount: totalAmount,
          signature_key: signature,
          transaction_status: "settlement",
          transaction_id: "trx-midtrans-settle-01",
          payment_type: "qris",
        }),
      });

      const webhookRes = await webhookPOST(webhookReq);
      expect(webhookRes.status).toBe(200);
      const webhookJson = await webhookRes.json();
      expect(webhookJson.success).toBe(true);

      // Verify order is transitioned to paid state (ready_for_pickup for click & collect)
      const orderAfter = await db.orders.findById(orderId);
      expect(orderAfter?.status).toBe("ready_for_pickup");
      expect(orderAfter?.payment_reference).toBe("trx-midtrans-settle-01");
      expect(orderAfter?.payment_method).toContain("QRIS");

      // Verify stock was permanently deducted: reserved stock decreases and on-hand decreases
      const invAfter = await db.inventory.getByProductAndStore("cpu-3");
      expect(invAfter?.stock_reserved).toBe(reservedBefore - 1);
      expect(invAfter?.stock_on_hand).toBe(onHandBefore - 1);

      // 3. Test Idempotency: Duplicate settlement notification must return 200 without double deductions
      const duplicateReq = new NextRequest("http://localhost:3000/api/webhooks/midtrans", {
        method: "POST",
        body: JSON.stringify({
          order_id: orderNumber,
          status_code: statusCode,
          gross_amount: totalAmount,
          signature_key: signature,
          transaction_status: "settlement",
          transaction_id: "trx-midtrans-settle-01",
          payment_type: "qris",
        }),
      });

      const duplicateRes = await webhookPOST(duplicateReq);
      expect(duplicateRes.status).toBe(200);
      const duplicateJson = await duplicateRes.json();
      expect(duplicateJson.success).toBe(true);
      expect(duplicateJson.message).toMatch(/previously processed|already|idempotent/i);

      // Verify inventory was NOT deducted again
      const invAfterDuplicate = await db.inventory.getByProductAndStore("cpu-3");
      expect(invAfterDuplicate?.stock_reserved).toBe(invAfter?.stock_reserved);
      expect(invAfterDuplicate?.stock_on_hand).toBe(invAfter?.stock_on_hand);
    });

    it("processes cancellation/expiration: transitions order to cancelled and releases reserved inventory", async () => {
      // 1. Create an order with reserved stock
      const createReq = new NextRequest("http://localhost:3000/api/checkout/create-order", {
        method: "POST",
        body: JSON.stringify({
          customer: {
            name: "Expired Order Customer",
            phone: "081244445555",
            email: "expired@tethera.com",
          },
          fulfillmentType: "click_and_collect",
          items: [{ id: "cpu-4", quantity: 1 }],
        }),
      });

      const createRes = await createOrderPOST(createReq);
      const createJson = await createRes.json();
      const orderNumber = createJson.orderNumber;
      const orderId = createJson.orderId;
      const totalAmount = createJson.total;

      const invBefore = await db.inventory.getByProductAndStore("cpu-4");
      const reservedBefore = invBefore?.stock_reserved || 0;
      const onHandBefore = invBefore?.stock_on_hand || 0;

      // 2. Midtrans sends expire webhook notification
      const statusCode = "202";
      const signature = generateMidtransSignature(
        orderNumber,
        statusCode,
        totalAmount,
        TEST_SERVER_KEY
      );

      const expireReq = new NextRequest("http://localhost:3000/api/webhooks/midtrans", {
        method: "POST",
        body: JSON.stringify({
          order_id: orderNumber,
          status_code: statusCode,
          gross_amount: totalAmount,
          signature_key: signature,
          transaction_status: "expire",
          transaction_id: "trx-midtrans-expire-99",
        }),
      });

      const expireRes = await webhookPOST(expireReq);
      expect(expireRes.status).toBe(200);
      const expireJson = await expireRes.json();
      expect(expireJson.success).toBe(true);
      expect(expireJson.orderStatus).toBe("cancelled");

      // Verify order status is cancelled
      const orderAfter = await db.orders.findById(orderId);
      expect(orderAfter?.status).toBe("cancelled");

      // Verify reserved stock was released back (reserved decreased, on-hand unchanged)
      const invAfter = await db.inventory.getByProductAndStore("cpu-4");
      expect(invAfter?.stock_reserved).toBe(reservedBefore - 1);
      expect(invAfter?.stock_on_hand).toBe(onHandBefore);
    });
  });

  describe("Charge Endpoint Security (/api/checkout/midtrans/charge)", () => {
    it("returns 404 when charging non-existent order", async () => {
      const req = new NextRequest("http://localhost:3000/api/checkout/midtrans/charge", {
        method: "POST",
        body: JSON.stringify({
          orderId: "nonexistent-id",
          orderNumber: "TET-NONEXISTENT",
          paymentChannel: "qris",
        }),
      });

      const res = await chargePOST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/Order not found/i);
    });

    it("derives charged amount from database order total, ignoring client tampering", async () => {
      // Create an order
      const createReq = new NextRequest("http://localhost:3000/api/checkout/create-order", {
        method: "POST",
        body: JSON.stringify({
          customer: {
            name: "Charge Verification User",
            phone: "081200001111",
            email: "charge@tethera.com",
          },
          fulfillmentType: "click_and_collect",
          items: [{ id: "cpu-1", quantity: 1 }],
        }),
      });

      const createRes = await createOrderPOST(createReq);
      const createJson = await createRes.json();
      const orderId = createJson.orderId;
      const verifiedTotal = createJson.total;

      // Client sends charge request with tampered amount (e.g. 500 rupiah)
      const chargeReq = new NextRequest("http://localhost:3000/api/checkout/midtrans/charge", {
        method: "POST",
        body: JSON.stringify({
          orderId: orderId,
          orderNumber: createJson.orderNumber,
          paymentChannel: "bca_va",
          amount: 500, // Tampered client amount
        }),
      });

      const chargeRes = await chargePOST(chargeReq);
      expect(chargeRes.status).toBe(200);
      const chargeJson = await chargeRes.json();
      expect(chargeJson.success).toBe(true);

      // Verify payment details uses authentic order total from DB
      expect(chargeJson.details.amount).toBe(verifiedTotal);
      expect(chargeJson.details.vaNumber).toBeDefined();
    });
  });
});
