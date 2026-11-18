import "server-only";
import { createHash } from "crypto";

export class RefundError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export function requestKey(key: unknown): string {
  if (typeof key !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key))
    throw new RefundError("Use a UUID v4 Idempotency-Key and keep it when retrying.", 400);
  return key.toLowerCase();
}
export function amountIdr(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 9999999999)
    throw new RefundError("Refund amount must be a positive whole rupiah amount.", 400);
  return value;
}
export function text(value: unknown, label: string, max = 255): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new RefundError(`Invalid ${label}.`, 400);
  return value.trim();
}
export function fingerprint(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
export interface RefundOperation {
  id: string; order_id: string; attempt_id?: string | null; request_key: string; fingerprint: string;
  amount: number; reason: string; return_request_id?: string | null; actor: string; environment: string;
  state: "creating" | "pending" | "completed" | "review"; provider_refund_id?: string | null; evidence?: any; updated_at: string;
}
export function refundInput(params: any) {
  if (params.restockInventory !== undefined && params.restockInventory !== false)
    throw new RefundError("Refunds do not restock items. Record inspected return quantities separately.");
  return {order_id: text(params.orderId, "order ID", 150), amount: amountIdr(params.amount),
    return_request_id: params.returnRequestId == null || params.returnRequestId === "" ? null : text(params.returnRequestId, "return ID", 150),
    reason: text(params.reason, "refund reason")};
}
export function receiptInput(params: any) {
  const rma_id = text(params.rmaId, "return ID", 150);
  if (!Array.isArray(params.items) || !params.items.length || params.items.length > 100) throw new RefundError("Select returned item quantities.", 400);
  const seen = new Set<string>();
  const items = params.items.map((item: any) => {
    const order_item_id = text(item?.orderItemId, "order item", 150);
    if (seen.has(order_item_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 || !["restock", "quarantine"].includes(item.disposition))
      throw new RefundError("Use one positive quantity and a disposition per order item.", 400);
    seen.add(order_item_id); return {order_item_id, quantity: item.quantity, disposition: item.disposition};
  }).sort((a: any, b: any) => a.order_item_id.localeCompare(b.order_item_id));
  return {rma_id, items};
}
