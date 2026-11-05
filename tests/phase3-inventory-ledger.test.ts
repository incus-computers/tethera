// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  GET as inventoryGET,
  POST as inventoryPOST,
} from "@/app/api/admin/inventory/route";

describe("Phase 3 Milestone 4: Stock Movement & Inventory Ledger (INV-01, INV-02)", () => {
  describe("InventoryAdjustmentLedgerRepository Unit Operations", () => {
    it("records stock adjustments with all valid reason codes", async () => {
      const testProductId = "cpu-1";

      const saleRow = await db.inventoryLedger.recordAdjustment({
        productId: testProductId,
        deltaQuantity: -2,
        previousStock: 10,
        newStock: 8,
        reasonCode: "SALE",
        referenceOrderId: "ord-test-sale-1",
        actorId: "test-webhook",
        notes: "Test sale deduction",
      });

      expect(saleRow.id).toBeDefined();
      expect(saleRow.reason_code).toBe("SALE");
      expect(saleRow.delta_quantity).toBe(-2);
      expect(saleRow.previous_stock).toBe(10);
      expect(saleRow.new_stock).toBe(8);
      expect(saleRow.reference_order_id).toBe("ord-test-sale-1");

      const restockRow = await db.inventoryLedger.recordAdjustment({
        productId: testProductId,
        deltaQuantity: 15,
        previousStock: 8,
        newStock: 23,
        reasonCode: "RESTOCK",
        actorId: "staff-catalog",
        notes: "Supplier restock shipment batch #441",
      });
      expect(restockRow.reason_code).toBe("RESTOCK");
      expect(restockRow.delta_quantity).toBe(15);

      const damageRow = await db.inventoryLedger.recordAdjustment({
        productId: testProductId,
        deltaQuantity: -1,
        previousStock: 23,
        newStock: 22,
        reasonCode: "DAMAGE",
        actorId: "staff-fulfillment",
        notes: "Bent pins during warehouse inspection write-off",
      });
      expect(damageRow.reason_code).toBe("DAMAGE");
      expect(damageRow.delta_quantity).toBe(-1);

      const auditRow = await db.inventoryLedger.recordAdjustment({
        productId: testProductId,
        deltaQuantity: -2,
        previousStock: 22,
        newStock: 20,
        reasonCode: "MANUAL_AUDIT",
        actorId: "staff-superadmin",
        notes: "Quarterly stock cycle reconciliation",
      });
      expect(auditRow.reason_code).toBe("MANUAL_AUDIT");
      expect(auditRow.new_stock).toBe(20);
    });

    it("filters movements by product ID and reference order ID", async () => {
      const orderId = `ord-ref-${Date.now()}`;
      await db.inventoryLedger.recordAdjustment({
        productId: "gpu-1",
        deltaQuantity: -1,
        previousStock: 5,
        newStock: 4,
        reasonCode: "SALE",
        referenceOrderId: orderId,
        actorId: "midtrans",
      });

      const movementsByProduct = await db.inventoryLedger.getMovementsByProduct("gpu-1");
      expect(movementsByProduct.length).toBeGreaterThan(0);
      expect(movementsByProduct.every((m) => m.product_id === "gpu-1")).toBe(true);

      const movementsByOrder = await db.inventoryLedger.getMovementsByOrder(orderId);
      expect(movementsByOrder.length).toBe(1);
      expect(movementsByOrder[0].reference_order_id).toBe(orderId);
      expect(movementsByOrder[0].product_id).toBe("gpu-1");
    });

    it("calculates summary statistics across reasons", async () => {
      const summary = await db.inventoryLedger.getLedgerSummary();
      expect(summary.totalMovements).toBeGreaterThan(0);
      expect(typeof summary.byReason.SALE).toBe("number");
      expect(typeof summary.byReason.RESTOCK).toBe("number");
      expect(typeof summary.byReason.DAMAGE).toBe("number");
      expect(typeof summary.byReason.MANUAL_AUDIT).toBe("number");
    });
  });

  describe("Lifecycle Event Ledger Integration", () => {
    it("automatically logs SALE ledger entry when order payment succeeds", async () => {
      // Create a test order with an item
      const { order } = await db.orders.createOrderWithItems(
        {
          order_number: `TET-LEDGER-${Date.now()}`,
          customer_name: "Ledger Sale Customer",
          customer_email: "ledger-sale@example.com",
          customer_phone: "+62 812-9999-0001",
          fulfillment_type: "delivery",
          payment_method: "BCA Virtual Account",
          status: "pending_payment",
          subtotal: 5000000,
          tax: 550000,
          delivery_fee: 30000,
          total: 5580000,
        },
        [
          {
            product_id: "ram-1",
            name: "Corsair Vengeance 32GB DDR5",
            quantity: 2,
            price: 2500000,
            subtotal: 5000000,
          },
        ]
      );

      // Reserve stock initially
      await db.inventory.reserveStock("ram-1", 2);

      // Process payment success (e.g. from Midtrans webhook)
      const res = await db.orders.processPaymentSuccess(order.id, `PAY-${Date.now()}`);
      expect(res.success).toBe(true);

      // Verify that inventory_adjustment_ledger recorded a SALE entry with reference_order_id
      const orderMovements = await db.inventoryLedger.getMovementsByOrder(order.id);
      expect(orderMovements.length).toBeGreaterThan(0);

      const saleMovement = orderMovements.find((m) => m.product_id === "ram-1");
      expect(saleMovement).toBeDefined();
      expect(saleMovement?.reason_code).toBe("SALE");
      expect(saleMovement?.delta_quantity).toBe(-2);
      expect(saleMovement?.reference_order_id).toBe(order.id);
    });

    it("automatically logs RETURN ledger entry when RMA refund with restock is processed", async () => {
      // Create paid order
      const { order } = await db.orders.createOrderWithItems(
        {
          order_number: `TET-RMA-${Date.now()}`,
          customer_name: "RMA Restock Customer",
          customer_email: "rma-restock@example.com",
          customer_phone: "+62 812-9999-0002",
          fulfillment_type: "delivery",
          payment_method: "QRIS",
          status: "delivered",
          subtotal: 3000000,
          tax: 330000,
          delivery_fee: 25000,
          total: 3355000,
        },
        [
          {
            product_id: "psu-1",
            name: "Corsair RM750e 750W",
            quantity: 1,
            price: 3000000,
            subtotal: 3000000,
          },
        ]
      );

      // Create RMA request
      const rma = await db.rma.createReturnRequest({
        orderNumber: order.order_number,
        customerEmail: "rma-restock@example.com",
        reason: "Ordered wrong wattage specification",
      });

      // Staff processes refund with restockInventory: true
      const refundRes = await db.rma.processRefund({
        orderId: order.id,
        returnRequestId: rma.id,
        amount: 3355000,
        reason: "Item returned unopened in mint condition",
        restockInventory: true,
        processedBy: "staff-lead",
      });

      expect(refundRes.refund.status).toBe("completed");
      expect(refundRes.refund.restock_inventory).toBe(true);

      // Verify RETURN entry in inventory ledger
      const orderMovements = await db.inventoryLedger.getMovementsByOrder(order.id);
      const returnMovement = orderMovements.find((m) => m.product_id === "psu-1");
      expect(returnMovement).toBeDefined();
      expect(returnMovement?.reason_code).toBe("RETURN");
      expect(returnMovement?.delta_quantity).toBeGreaterThan(0);
      expect(returnMovement?.actor_id).toBe("staff-lead");
    });

    it("automatically logs CANCELLED_ORDER ledger entry when paid order is cancelled", async () => {
      const { order } = await db.orders.createOrderWithItems(
        {
          order_number: `TET-CANCEL-${Date.now()}`,
          customer_name: "Cancelled Order Customer",
          customer_email: "cancel-customer@example.com",
          customer_phone: "+62 812-9999-0003",
          fulfillment_type: "delivery",
          payment_method: "GoPay",
          status: "paid",
          paid_at: new Date().toISOString(),
          subtotal: 4000000,
          tax: 440000,
          delivery_fee: 20000,
          total: 4460000,
        },
        [
          {
            product_id: "cas-1",
            name: "NZXT H5 Flow Case",
            quantity: 1,
            price: 4000000,
            subtotal: 4000000,
          },
        ]
      );

      // Cancel the paid order
      const cancelRes = await db.orders.cancelOrder(
        order.id,
        "Customer requested cancellation before assembly"
      );
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.order?.status).toBe("cancelled");

      // Verify CANCELLED_ORDER entry in inventory ledger
      const orderMovements = await db.inventoryLedger.getMovementsByOrder(order.id);
      const cancelMovement = orderMovements.find((m) => m.product_id === "cas-1");
      expect(cancelMovement).toBeDefined();
      expect(cancelMovement?.reason_code).toBe("CANCELLED_ORDER");
      expect(cancelMovement?.delta_quantity).toBe(1);
    });
  });

  describe("Admin Inventory API Endpoint (/api/admin/inventory)", () => {
    it("blocks unauthenticated requests with 401 Unauthorized", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/inventory", {
        method: "GET",
      });
      const res = await inventoryGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("allows CATALOG_MANAGER to query inventory and view low-stock summary", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/inventory", {
        method: "GET",
        headers: { authorization: "Bearer catalog" },
      });

      const res = await inventoryGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.items)).toBe(true);
      expect(json.items.length).toBeGreaterThan(0);
      expect(json.summary).toBeDefined();
      expect(typeof json.summary.lowStockAlerts).toBe("number");
      expect(typeof json.summary.totalStockOnHand).toBe("number");
    });

    it("filters inventory when lowStockOnly=true is requested", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/inventory?lowStockOnly=true", {
        method: "GET",
        headers: { authorization: "Bearer dispatch" },
      });

      const res = await inventoryGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.items.every((item: any) => item.is_low_stock)).toBe(true);
    });

    it("blocks SUPPORT_AGENT from adjusting inventory with 403 Forbidden", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/inventory", {
        method: "POST",
        headers: { authorization: "Bearer support" },
        body: JSON.stringify({
          productId: "cpu-1",
          deltaQuantity: 5,
          reasonCode: "RESTOCK",
        }),
      });

      const res = await inventoryPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/inventory:adjust/i);
    });

    it("rejects inventory adjustment with invalid reasonCode with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/inventory", {
        method: "POST",
        headers: { authorization: "Bearer catalog" },
        body: JSON.stringify({
          productId: "cpu-1",
          deltaQuantity: 5,
          reasonCode: "STOLEN_BY_ALIENS",
        }),
      });

      const res = await inventoryPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Invalid or missing 'reasonCode'/i);
    });

    it("allows FULFILLMENT_OPERATOR to restock hardware and logs audit trail", async () => {
      const initialLogs = await db.auditLogs.getRecentLogs(20, "inventory");
      const initialLogCount = initialLogs.length;

      const req = new NextRequest("http://localhost:3000/api/admin/inventory", {
        method: "POST",
        headers: {
          authorization: "Bearer dispatch",
          "x-forwarded-for": "10.0.1.50",
          "user-agent": "StaffInventoryScanner/1.0",
        },
        body: JSON.stringify({
          productId: "cpu-2",
          deltaQuantity: 8,
          reasonCode: "RESTOCK",
          notes: "Received new distributor pallet from PT Synnex Metrodata",
          lowStockThreshold: 4,
        }),
      });

      const res = await inventoryPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.inventory).toBeDefined();
      expect(json.inventory.low_stock_threshold).toBe(4);
      expect(json.ledgerEntry).toBeDefined();
      expect(json.ledgerEntry.reason_code).toBe("RESTOCK");
      expect(json.ledgerEntry.delta_quantity).toBe(8);

      // Verify audit log entry was written
      const logsAfter = await db.auditLogs.getRecentLogs(20, "inventory");
      expect(logsAfter.length).toBeGreaterThan(initialLogCount);
      const latestAudit = logsAfter.find((l) => l.entity_id === "cpu-2");
      expect(latestAudit).toBeDefined();
      expect(latestAudit?.action).toBe("INVENTORY_ADJUSTED");
      expect(latestAudit?.role).toBe("FULFILLMENT_OPERATOR");
      expect(latestAudit?.after_state?.reason_code).toBe("RESTOCK");
    });

    it("allows staff to record DAMAGE write-off reducing stock", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/inventory", {
        method: "POST",
        headers: { authorization: "Bearer catalog" },
        body: JSON.stringify({
          productId: "clr-1",
          deltaQuantity: -2,
          reasonCode: "DAMAGE",
          notes: "Radiator fin damage in transit",
        }),
      });

      const res = await inventoryPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.ledgerEntry.reason_code).toBe("DAMAGE");
      expect(json.ledgerEntry.delta_quantity).toBe(-2);
    });
  });
});
