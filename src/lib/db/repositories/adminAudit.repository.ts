import "server-only";
import { BaseRepository } from "./base.repository";
import { AdminUserRow, AdminAuditLogRow, AdminRole } from "../types";

const INITIAL_ADMIN_USERS: AdminUserRow[] = [
  {
    id: "admin-super-01",
    email: "admin@tethera.com",
    name: "Master Superadmin",
    role: "SUPER_ADMIN",
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "admin-catalog-01",
    email: "catalog@tethera.com",
    name: "Catalog Lead",
    role: "CATALOG_MANAGER",
    is_active: true,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "admin-fulfill-01",
    email: "dispatch@tethera.com",
    name: "Logistics Lead",
    role: "FULFILLMENT_OPERATOR",
    is_active: true,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "admin-support-01",
    email: "support@tethera.com",
    name: "Customer Support Specialist",
    role: "SUPPORT_AGENT",
    is_active: true,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export class AdminUsersRepository extends BaseRepository<AdminUserRow> {
  constructor() {
    super("admin_users", INITIAL_ADMIN_USERS);
  }

  async findByEmail(email: string): Promise<AdminUserRow | null> {
    return this.findOne({ email: email.trim().toLowerCase() });
  }

  async getActiveRole(emailOrId: string): Promise<AdminRole | null> {
    const user =
      (await this.findByEmail(emailOrId)) || (await this.findById(emailOrId));
    if (!user || !user.is_active) return null;
    return user.role;
  }
}

export class AdminAuditLogsRepository extends BaseRepository<AdminAuditLogRow> {
  constructor() {
    super("admin_audit_logs", []);
  }

  /**
   * Appends an immutable audit log entry for staff actions
   */
  async logAction(entry: {
    actorId: string;
    actorName: string;
    role: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeState?: Record<string, any> | null;
    afterState?: Record<string, any> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AdminAuditLogRow> {
    return this.create({
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      role: entry.role,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      before_state: entry.beforeState || null,
      after_state: entry.afterState || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      created_at: new Date().toISOString(),
    });
  }

  async getRecentLogs(limit: number = 50): Promise<AdminAuditLogRow[]> {
    const all = await this.findMany({});
    return all
      .sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
      )
      .slice(0, limit);
  }
}

export const adminUsersRepository = new AdminUsersRepository();
export const adminAuditLogsRepository = new AdminAuditLogsRepository();
