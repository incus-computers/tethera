// @ts-ignore
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  ROLE_PERMISSIONS,
  normalizeAdminRole,
  hasPermission,
  requireAdminPermission,
} from "@/lib/auth/rbac";
import { PUT as productsPUT, DELETE as productsDELETE } from "@/app/api/admin/products/route";
import { POST as dispatchPOST } from "@/app/api/admin/courier/dispatch/route";
import { GET as auditLogsGET } from "@/app/api/admin/audit-logs/route";

describe("Phase 3 Milestone 2: Staff RBAC & Immutable Audit Logs (ADMIN-06)", () => {
  describe("Granular Role-to-Permissions Mapping", () => {
    it("ensures SUPER_ADMIN possesses all system permissions", () => {
      const superRole = normalizeAdminRole("SUPER_ADMIN");
      expect(hasPermission(superRole, "products:write")).toBe(true);
      expect(hasPermission(superRole, "orders:dispatch")).toBe(true);
      expect(hasPermission(superRole, "admin_users:manage")).toBe(true);
      expect(hasPermission(superRole, "audit_logs:read")).toBe(true);
    });

    it("restricts CATALOG_MANAGER from courier dispatch and staff user management", () => {
      const catalogRole = normalizeAdminRole("CATALOG_MANAGER");
      expect(hasPermission(catalogRole, "products:write")).toBe(true);
      expect(hasPermission(catalogRole, "promotions:write")).toBe(true);
      expect(hasPermission(catalogRole, "orders:dispatch")).toBe(false);
      expect(hasPermission(catalogRole, "admin_users:manage")).toBe(false);
    });

    it("restricts FULFILLMENT_OPERATOR from mutating product prices", () => {
      const fulfillRole = normalizeAdminRole("FULFILLMENT_OPERATOR");
      expect(hasPermission(fulfillRole, "orders:dispatch")).toBe(true);
      expect(hasPermission(fulfillRole, "inventory:adjust")).toBe(true);
      expect(hasPermission(fulfillRole, "products:write")).toBe(false);
      expect(hasPermission(fulfillRole, "products:delete")).toBe(false);
    });

    it("restricts SUPPORT_AGENT to read-only customer and order actions", () => {
      const supportRole = normalizeAdminRole("SUPPORT_AGENT");
      expect(hasPermission(supportRole, "orders:read")).toBe(true);
      expect(hasPermission(supportRole, "customers:read")).toBe(true);
      expect(hasPermission(supportRole, "products:write")).toBe(false);
      expect(hasPermission(supportRole, "orders:dispatch")).toBe(false);
      expect(hasPermission(supportRole, "audit_logs:read")).toBe(false);
    });
  });

  describe("API Route Authorization Enforcement", () => {
    it("blocks unauthenticated requests to product mutations with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "PUT",
        body: JSON.stringify({ id: "cpu-1", retail_price: 7500000 }),
      });

      const res = await productsPUT(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/clearance required/i);
    });

    it("blocks SUPPORT_AGENT from updating product prices with 403 Forbidden", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "PUT",
        headers: { authorization: "Bearer support" },
        body: JSON.stringify({ id: "cpu-1", retail_price: 7500000 }),
      });

      const res = await productsPUT(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/lacks permission 'products:write'/i);
    });

    it("blocks CATALOG_MANAGER from dispatching couriers with 403 Forbidden", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/courier/dispatch", {
        method: "POST",
        headers: { authorization: "Bearer catalog" },
        body: JSON.stringify({ orderId: "ord-1001", courierProvider: "jne" }),
      });

      const res = await dispatchPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/lacks permission 'orders:dispatch'/i);
    });

    it("allows FULFILLMENT_OPERATOR to dispatch courier logistics", async () => {
      // First ensure ord-1001 is set to ready_for_dispatch
      await db.orders.update("ord-1001", { status: "ready_for_dispatch" });

      const req = new NextRequest("http://localhost:3000/api/admin/courier/dispatch", {
        method: "POST",
        headers: { authorization: "Bearer dispatch" },
        body: JSON.stringify({
          orderId: "ord-1001",
          courierProvider: "jne",
          serviceCode: "reg",
          serviceName: "JNE Regular Express",
        }),
      });

      const res = await dispatchPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.status).toBe("dispatched");
    });

    it("allows CATALOG_MANAGER to update product pricing", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "PUT",
        headers: { authorization: "Bearer catalog" },
        body: JSON.stringify({
          id: "cpu-1",
          retail_price: 7299000,
        }),
      });

      const res = await productsPUT(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.product.retail_price).toBe(7299000);
    });
  });

  describe("Immutable Staff Audit Logging", () => {
    it("automatically writes audit log on product price update", async () => {
      const initialLogs = await db.auditLogs.getRecentLogs(10, "product");
      const initialCount = initialLogs.length;

      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "PUT",
        headers: {
          authorization: "Bearer catalog",
          "x-forwarded-for": "10.0.0.45",
          "user-agent": "StaffAdminBrowser/1.0",
        },
        body: JSON.stringify({
          id: "cpu-2",
          retail_price: 9499000,
        }),
      });

      const res = await productsPUT(req);
      expect(res.status).toBe(200);

      // Verify audit log entry was created
      const logsAfter = await db.auditLogs.getRecentLogs(10, "product");
      expect(logsAfter.length).toBeGreaterThan(initialCount);

      const latestLog = logsAfter.find((l) => l.entity_id === "cpu-2")!;
      expect(latestLog).toBeDefined();
      expect(latestLog.action).toBe("PRODUCT_UPDATED");
      expect(latestLog.entity_type).toBe("product");
      expect(latestLog.entity_id).toBe("cpu-2");
      expect(latestLog.role).toBe("CATALOG_MANAGER");
      expect(latestLog.actor_name).toBe("Catalog Lead");
      expect(latestLog.ip_address).toBe("10.0.0.45");
      expect(latestLog.after_state?.retail_price).toBe(9499000);
    });

    it("blocks unauthorized roles from viewing audit logs", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs", {
        method: "GET",
        headers: { authorization: "Bearer support" },
      });

      const res = await auditLogsGET(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/lacks permission 'audit_logs:read'/i);
    });

    it("allows SUPER_ADMIN to inspect audit logs descending by timestamp", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/audit-logs?limit=5", {
        method: "GET",
        headers: { authorization: "Bearer superadmin" },
      });

      const res = await auditLogsGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.logs)).toBe(true);
      expect(json.logs.length).toBeGreaterThan(0);
      expect(json.logs[0].created_at).toBeDefined();
    });
  });
});
