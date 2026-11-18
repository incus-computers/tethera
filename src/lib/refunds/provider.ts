import "server-only";
import { PaymentAttempt } from "@/lib/payment/attempts";
import { gatewayConfig, verifiedEvidence } from "@/lib/payment/gateway";
import { RefundError } from "./contracts";

export function refundConfig(requireEnabled = false) {
  const config = gatewayConfig();
  if (requireEnabled && process.env.MIDTRANS_REFUNDS_ENABLED !== "true") throw new RefundError("Provider refunds are not enabled. Configure sandbox acceptance first.", 503);
  return config;
}
function rupiah(value: unknown): number {
  if (!/^\d+(\.00)?$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new RefundError("Invalid provider refund amount.");
  return Number(value);
}
export function refundStatus(attempt: PaymentAttempt, data: any) {
  const base = verifiedEvidence(attempt, data);
  const total = data.refund_amount == null ? 0 : rupiah(data.refund_amount);
  const records = data.refunds == null ? [] : data.refunds;
  if (!Array.isArray(records) || records.length > 1000 || total > attempt.amount) throw new RefundError("Invalid provider refund history.");
  const ids = new Set<string>(), keys = new Set<string>();
  const refunds = records.map((record: any) => {
    const id = String(record?.refund_chargeback_id ?? record?.refund_chargeback_uuid ?? "");
    const key = record?.refund_key;
    if (!id || id.length > 200 || typeof key !== "string" || !key || key.length > 200 || ids.has(id) || keys.has(key)) throw new RefundError("Ambiguous provider refund history.");
    ids.add(id); keys.add(key);
    const amount = rupiah(record.refund_amount);
    if (!amount) throw new RefundError("Invalid provider refund amount.");
    let bank_confirmed_at: string | null = null;
    if (record.bank_confirmed_at != null && record.bank_confirmed_at !== "") {
      if (typeof record.bank_confirmed_at !== "string" || record.bank_confirmed_at.length > 60 || !Number.isFinite(Date.parse(record.bank_confirmed_at))) throw new RefundError("Invalid refund confirmation.");
      bank_confirmed_at = record.bank_confirmed_at;
    }
    return {id, key, amount, method: record.refund_method === "online" ? "online" : record.refund_method === "offline" ? "offline" : null, bank_confirmed_at};
  });
  if (refunds.reduce((sum, record) => sum + record.amount, 0) !== total || (total > 0 && !["refund", "partial_refund"].includes(base.transaction_status))) throw new RefundError("Provider refund history does not reconcile.");
  return {...base, refund_total: total, payment_type: data.payment_type, refunds};
}
export function refundablePayment(status: ReturnType<typeof refundStatus>, amount: number) {
  if (!["settlement", "partial_refund"].includes(status.transaction_status)) throw new RefundError("The provider payment must be settled before refunding.");
  if (!["credit_card", "gopay", "shopeepay", "dana", "ovo", "qris", "kredivo", "akulaku"].includes(status.payment_type)) throw new RefundError("This payment method needs a separately verified manual refund workflow.");
  if (["shopeepay", "ovo"].includes(status.payment_type) && amount !== status.gross_amount) throw new RefundError("This payment method requires a full refund.");
}
