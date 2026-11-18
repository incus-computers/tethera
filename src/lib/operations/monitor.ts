import "server-only";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
import { checkDatabaseReadiness } from "@/lib/db/health";
import { jobs } from "@/lib/jobs/store";
import { privacyRequests } from "./privacy";
import { getStorefrontProfile } from "@/lib/storefront/profile";
import { isDemoMode } from "@/lib/runtime/environment";
import { getServerSupabase } from "@/lib/db/client";
import { databaseError } from "@/lib/db/errors";

export async function operationalHygiene() {
  const client = getServerSupabase();
  if (!client) return { expiredBudgets: 0, expiredSessions: 0, simulated: true };
  const { data, error } = await client.rpc("run_operational_hygiene");
  if (error) databaseError("hygiene", "operations", error);
  return data;
}
export async function operationsSnapshot() {
  const database = await checkDatabaseReadiness();
  const [latest, blocked, review, dead, pending, inReview, oldest, duePending, dueRetry, running] = await Promise.all([
    new BaseRepository<any>("worker_runs").findMany(undefined, { orderBy: "started_at", orderDirection: "desc", limit: 1 }),
    jobs.count({ status: "blocked" }), jobs.count({ status: "review" }), jobs.count({ status: "dead" }),
    privacyRequests.count({ status: "requested" }), privacyRequests.count({ status: "in_review" }),
    privacyRequests.findMany({ status: "requested" }, { orderBy: "created_at", orderDirection: "asc", limit: 1 }),
    jobs.findMany({ status: "pending" }, { orderBy: "available_at", orderDirection: "asc", limit: 1 }),
    jobs.findMany({ status: "retry" }, { orderBy: "available_at", orderDirection: "asc", limit: 1 }),
    jobs.findMany({ status: "running" }, { orderBy: "lease_until", orderDirection: "asc", limit: 1 }),
  ]);
  const run = latest[0], finished = Date.parse(run?.finished_at || ""), workerStale = !Number.isFinite(finished) || run.status !== "completed" || Date.now() - finished > 180000;
  const lastRunAgeSeconds = run?.finished_at ? Math.max(0, Math.floor((Date.now() - Date.parse(run.finished_at)) / 1000)) : null;
  const oldestRequestAgeHours = oldest[0] ? Math.max(0, Math.floor((Date.now() - Date.parse(oldest[0].created_at)) / 3600000)) : 0;
  const overduePending = [...duePending, ...dueRetry].some(job => Date.parse(job.available_at) < Date.now() - 600000);
  const expiredLease = running.some(job => !Number.isFinite(Date.parse(job.lease_until || "")) || Date.parse(job.lease_until!) < Date.now());
  const needsAttention = workerStale || blocked + review + dead > 0 || overduePending || expiredLease;
  return { generatedAt: new Date().toISOString(), environment: isDemoMode() ? "demo" : "connected", database,
    healthy: !needsAttention, worker: { stale: workerStale, lastRunAgeSeconds }, queue: { blocked, review, dead, overduePending, expiredLease }, privacy: { open: pending + inReview, oldestUnreviewedAgeHours: oldestRequestAgeHours },
    release: { policiesPublished: getStorefrontProfile().status === "published", taxConfirmed: process.env.TAX_POLICY_CONFIRMED === "true", marketplaceEnabled: false, hostedRestoreVerified: false } };
}
