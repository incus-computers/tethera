import { withApiProtection } from "@/lib/operations/apiProtection";
import { safeFailure } from "@/lib/operations/telemetry";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
import { withAccess } from "@/lib/auth/routeGuard";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit-logs
 * Retrieves immutable staff activity logs (ADMIN-06)
 */
async function handleGET(req: NextRequest) {
  try {
    const perm = await requireAdminPermission(req, "audit_logs:read");
    if (!perm.authorized) {
      return NextResponse.json(
        { success: false, error: perm.error },
        { status: perm.status || 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
    const entityType = searchParams.get("entity_type") || undefined;

    const logs = await db.auditLogs.getRecentLogs(limit, entityType);

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    const databaseFailure = databaseFailureResponse(error);
    if (databaseFailure) return databaseFailure;
    safeFailure();
    return NextResponse.json(
      { success: false, error: "Failed to retrieve audit logs." },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(withAccess(handleGET));
