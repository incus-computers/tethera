// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  GET as fulfillmentsGET,
  POST as fulfillmentsPOST,
} from "@/app/api/admin/fulfillments/route";
import {
  GET as customerRmaGET,
  POST as customerRmaPOST,
} from "@/app/api/orders/rma/route";
import {
  GET as adminRmaGET,
  PUT as adminRmaPUT,
  POST as adminRmaPOST,
} from "@/app/api/admin/rma/route";

describe("Phase 3 Milestone 3: Split Fulfillment & RMA Return / Refund Engine", () => {
  describe("Multi-Carrier Split Fulfillment (/api/admin/fulfillments)", () => {
    it("blocks SUPPORT_AGENT lacking orders:dispatch with 403 Forbidden", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/fulfillments", {
        method: "POST",
        headers: { authorization: "Bearer support" },
        body: JSON.stringify({
          orderId: "ord-1002",
          carrier: "sicepat",
          items: [{ orderItemId: "item-3", quantity: 1 }],
        }),
      });

      const res = await fulfillmentsPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/lacks permission 'orders:dispatch'/i);
    });

    it("allows FULFILLMENT_OPERATOR to create split fulfillment and records audit log", async () => {
      const initialLogs = await db.auditLogs.getRecentLogs(10, "fulfillment");
      const initialCount = initialLogs.length;

      const req = new NextRequest("http://localhost:3000/api/admin/fulfillments", {
        method: "POST",
        headers: {
          authorization: "Bearer dispatch",
          "x-forwarded-for": "192.168.1.100",
        },
        body: JSON.stringify({
          orderId: "ord-1002",
          carrier: "jne",
          serviceCode: "reg",
          waybillId: "JNE-WAYBILL-889900",
          trackingUrl: "https://tracking.jne.co.id/JNE-WAYBILL-889900",
          items: [{ orderItemId: "item-3", quantity: 1 }],
          notes: "First box shipped with GPU.",
        }),
      });

      const res = await fulfillmentsPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.fulfillment.waybill_id).toBe("JNE-WAYBILL-889900");
      expect(json.fulfillment.carrier).toBe("jne");

      // Verify audit log entry was created
      const logsAfter = await db.auditLogs.getRecentLogs(10, "fulfillment");
      expect(logsAfter.length).toBeGreaterThan(initialCount);
      expect(logsAfter[0].action).toBe("FULFILLMENT_CREATED");
      expect(logsAfter[0].role).toBe("FULFILLMENT_OPERATOR");
    });

    it("retrieves fulfillments and line-item allocations via GET", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/admin/fulfillments?orderId=ord-1002",
        {
          method: "GET",
          headers: { authorization: "Bearer dispatch" },
        }
      );

      const res = await fulfillmentsGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.fulfillments)).toBe(true);
      expect(json.fulfillments.length).toBeGreaterThan(0);
      expect(json.fulfillments[0].items.length).toBeGreaterThan(0);
    });
  });

  describe("Customer Return Request RMA Submission (/api/orders/rma)", () => {
    it("rejects RMA submission when customer email does not match order record", async () => {
      const req = new NextRequest("http://localhost:3000/api/orders/rma", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: "TET-2026-0901",
          email: "wrong.email@domain.com",
          reason: "defective_hardware",
        }),
      });

      const res = await customerRmaPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/does not match/i);
    });

    it("creates RMA return request for authentic customer order", async () => {
      const order = await db.orders.findById("ord-1001");
      expect(order).toBeDefined();

      const req = new NextRequest("http://localhost:3000/api/orders/rma", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: order!.order_number,
          email: order!.customer_email,
          reason: "defective_hardware",
          customerNotes: "GPU artifacting during 3D gaming load.",
        }),
      });

      const res = await customerRmaPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.returnRequest.rma_number).toMatch(/^RMA-/);
      expect(json.returnRequest.status).toBe("requested");

      // Verify customer can query their active return request
      const getReq = new NextRequest(
        `http://localhost:3000/api/orders/rma?orderNumber=${order!.order_number}&email=${order!.customer_email}`,
        { method: "GET" }
      );
      const getRes = await customerRmaGET(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.returnRequests.length).toBeGreaterThan(0);
    });
  });

  describe("Staff RMA Management & Financial Refund Processing (/api/admin/rma)", () => {
    let createdRmaId: string;

    it("allows staff to list and update RMA status to approved", async () => {
      const listReq = new NextRequest("http://localhost:3000/api/admin/rma", {
        method: "GET",
        headers: { authorization: "Bearer support" },
      });

      const listRes = await adminRmaGET(listReq);
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson.returnRequests.length).toBeGreaterThan(0);

      const targetRma = listJson.returnRequests[0];
      createdRmaId = targetRma.id;

      // Staff transitions RMA status to approved
      const putReq = new NextRequest("http://localhost:3000/api/admin/rma", {
        method: "PUT",
        headers: { authorization: "Bearer superadmin" },
        body: JSON.stringify({
          rmaId: createdRmaId,
          status: "approved",
          adminNotes: "Return authorized. Customer instructed to ship item to Flagship Store.",
        }),
      });

      const putRes = await adminRmaPUT(putReq);
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.success).toBe(true);
      expect(putJson.returnRequest.status).toBe("approved");
    });

    it("processes refund with inventory restocking and marks order refunded", async () => {
      // Find order to refund (e.g. ord-1001)
      const order = await db.orders.findById("ord-1001");
      expect(order).toBeDefined();

      const initialInv = await db.inventory.getByProductAndStore("cpu-1");
      const initialStock = initialInv?.stock_on_hand || 0;

      const refundReq = new NextRequest("http://localhost:3000/api/admin/rma", {
        method: "POST",
        headers: {
          authorization: "Bearer superadmin",
          "x-forwarded-for": "10.0.0.8",
        },
        body: JSON.stringify({
          orderId: order!.id,
          returnRequestId: createdRmaId,
          amount: order!.total,
          reason: "Approved RMA replacement credit",
          restockInventory: true,
        }),
      });

      const refundRes = await adminRmaPOST(refundReq);
      expect(refundRes.status).toBe(200);
      const refundJson = await refundRes.json();
      expect(refundJson.success).toBe(true);
      expect(refundJson.refund.amount).toBe(order!.total);
      expect(refundJson.orderStatus).toBe("refunded");

      // Verify order status is updated to refunded
      const updatedOrder = await db.orders.findById(order!.id);
      expect(updatedOrder?.status).toBe("refunded");

      // Verify inventory was restocked (on hand increased)
      const afterInv = await db.inventory.getByProductAndStore("cpu-1");
      expect(afterInv?.stock_on_hand).toBeGreaterThan(initialStock);

      // Verify linked RMA was completed
      const updatedRma = await db.rma.returnRequests.findById(createdRmaId);
      expect(updatedRma?.status).toBe("completed");

      // Verify audit log recorded REFUND_PROCESSED
      const auditLogs = await db.auditLogs.getRecentLogs(5, "refund");
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe("REFUND_PROCESSED");
    });
  });
});
