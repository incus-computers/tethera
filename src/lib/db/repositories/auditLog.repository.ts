import "server-only";
import { BaseRepository } from "./base.repository";
import { AdminAuditLogRow } from "../types";

const INITIAL_SAMPLE_AUDIT_LOGS: AdminAuditLogRow[] = [
  {
    id: "log-sys-001",
    actor_id: "admin-super",
    actor_name: "Master Superadmin",
    role: "SUPER_ADMIN",
    action: "SYSTEM_INITIALIZED",
    entity_type: "system",
    entity_id: "sys-01",
    before_state: null,
    after_state: { version: "1.0.0", status: "online" },
    ip_address: "127.0.0.1",
    user_agent: "Tethera System Kernel/1.0",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "log-catalog-002",
    actor_id: "admin-catalog",
    actor_name: "Catalog Lead",
    role: "CATALOG_MANAGER",
    action: "CATALOG_PROMOTION_SYNCED",
    entity_type: "promotion",
    entity_id: "promo-fest2026",
    before_state: { is_active: false },
    after_state: { is_active: true, code: "WHITEFEST2026" },
    ip_address: "103.14.22.8",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
];

export class AuditLogRepository extends BaseRepository<AdminAuditLogRow> {
  constructor() {
    super("admin_audit_logs", INITIAL_SAMPLE_AUDIT_LOGS);
  }

  /**
   * Appends an immutable audit log entry capturing a staff administrative mutation (ADMIN-06)
   */
  async log(
    entry: Omit<AdminAuditLogRow, "id" | "created_at">
  ): Promise<AdminAuditLogRow> {
    const logId = `audit-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const created = await this.create({
      ...entry,
      id: logId,
      created_at: new Date().toISOString(),
    });
    return created;
  }

  /**
   * Retrieves recent audit log entries, optionally filtered by entity type
   */
  async getRecentLogs(
    limit: number = 50,
    entityType?: string
  ): Promise<AdminAuditLogRow[]> {
    const all = await this.findMany(entityType ? { entity_type: entityType } : {});
    return all
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, limit);
  }
}

export const auditLogRepository = new AuditLogRepository();
