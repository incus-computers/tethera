import { safeFailure } from "@/lib/operations/telemetry";
/** Safe database failures: no SQL, credentials or customer values in messages. */
export class DatabaseError extends Error {
  readonly status: number;
  constructor(public readonly operation: string, public readonly table: string, public readonly code = "DATABASE_UNAVAILABLE") {
    const conflict = code === "23505";
    const invalid = ["23502", "23503", "23514", "22P02", "22003", "22023", "INVALID_ARGUMENT", "P0001"].includes(code);
    super(conflict ? "This record conflicts with existing data." : invalid ? "The record could not be saved because its data is invalid." : "Database temporarily unavailable. Please retry.");
    this.name = "DatabaseError";
    this.status = conflict ? 409 : invalid ? 400 : 503;
  }
}
export function databaseError(operation: string, table: string, error?: { code?: string } | null): never {
  const failure = new DatabaseError(operation, table, error?.code);
  safeFailure();
  throw failure;
}
