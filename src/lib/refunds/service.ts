import "server-only";
import { randomUUID } from "crypto";
import { db, BaseRepository, InventoryReservationRow, ProductVariantRow, ReturnRequestRow } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/client";
import { DatabaseError } from "@/lib/db/errors";
import { demoTransaction } from "@/lib/inventory/demoTransaction";
import { isDemoMode } from "@/lib/runtime/environment";
import { paymentAttempts, PaymentAttempt } from "@/lib/payment/attempts";
import { getGatewayStatus, requestGatewayRefund } from "@/lib/payment/gateway";
import { refundConfig, refundStatus, refundablePayment } from "./provider";
import { RefundError, RefundOperation, requestKey, refundInput, receiptInput, fingerprint, text } from "./contracts";

export const refundOperations = new BaseRepository<RefundOperation>("refund_operations");
const events = new BaseRepository<any>("refund_events");
export const returnReceipts = new BaseRepository<any>("return_receipts");
export const returnReceiptItems = new BaseRepository<any>("return_receipt_items");
const holds = new BaseRepository<InventoryReservationRow>("inventory_reservations");
const variants = new BaseRepository<ProductVariantRow>("product_variants");
async function rpc(name: string, args: Record<string, unknown>) {
  const client = getServerSupabase();
  if (!client) throw new RefundError("Persistent refund storage is required.", 503);
  try {
    const {data, error} = await client.rpc(name, args);
    if (error) {
      if (["PT409", "PT404"].includes(error.code)) throw new RefundError(error.message, error.code === "PT404" ? 404 : 409);
      throw new DatabaseError(name, "refund_operations", error.code);
    }
    if (!data) throw new DatabaseError(name, "refund_operations");
    return data;
  } catch (error) {
    if (error instanceof RefundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(name, "refund_operations");
  }
}
async function audit(actor: string, action: string, entity: string, id: string, after: any) {
  await db.auditLogs.log({actor_id: actor, actor_name: actor, role: "ADMIN", action, entity_type: entity, entity_id: id, after_state: after});
}
async function completedTotal(orderId: string) {
  return (await db.rma.refunds.findMany({order_id: orderId, status: "completed"})).reduce((sum, row) => sum + Number(row.amount), 0);
}
async function operationResult(operation: RefundOperation) {
  const order = await db.orders.findById(operation.order_id);
  return {operation, refund: await db.rma.refunds.findOne({operation_id: operation.id} as any), orderStatus: order?.status, pending: operation.state !== "completed"};
}

export async function prepareRefund(params: any, actor: string, verified?: any) {
  const input = refundInput(params), key = requestKey(params.requestKey), hash = fingerprint(input);
  const environment = isDemoMode() ? "demo" : refundConfig(true).environment;
  if (!isDemoMode()) return rpc("prepare_refund", {p_key: key, p_fingerprint: hash, p_input: input, p_environment: environment, p_actor: actor, p_verified: verified});
  return demoTransaction(async () => {
    const order = await db.orders.findById(input.order_id);
    if (!order) throw new RefundError("Order not found.", 404);
    const prior = await refundOperations.findOne({request_key: key});
    if (prior) {
      if (prior.order_id !== order.id || prior.fingerprint !== hash || prior.environment !== environment) throw new RefundError("Refund key conflicts with its existing request.");
      return {may_create: false, operation: prior};
    }
    if (!order.paid_at || order.status === "cancelled") throw new RefundError("Paid order required.");
    if (input.return_request_id) {
      const rma = await db.rma.returnRequests.findById(input.return_request_id);
      if (!rma || rma.order_id !== order.id || ["requested", "rejected"].includes(rma.status)) throw new RefundError("Approved return must belong to this order.");
    }
    const previous = await db.rma.refunds.findMany({order_id: order.id});
    if (previous.some(row => !(row as any).operation_id)) throw new RefundError("Historical refund records need reconciliation.");
    if ((await refundOperations.findMany({order_id: order.id})).some(row => row.state !== "completed")) throw new RefundError("Reconcile the unresolved refund first.");
    if (await completedTotal(order.id) + input.amount > order.total) throw new RefundError("Refund exceeds the remaining paid amount.");
    const operation = await refundOperations.create({id: randomUUID(), ...input, request_key: key, fingerprint: hash, actor, environment, state: "creating", updated_at: new Date().toISOString()});
    await audit(actor, "REFUND_PREPARED", "refund", operation.id, {order_id: order.id, amount: input.amount});
    return {may_create: true, operation};
  });
}
export async function applyRefundEvidence(operation: RefundOperation, evidence: any) {
  if (!isDemoMode()) return rpc("apply_refund_evidence", {p_operation_id: operation.id, p_evidence: evidence});
  return demoTransaction(async () => {
    const fresh = await refundOperations.findById(operation.id);
    if (!fresh) throw new RefundError("Refund operation not found.", 404);
    const record = evidence.refund;
    if (record && (record.key !== fresh.request_key || record.amount !== fresh.amount || typeof record.id !== "string" || !record.id)) throw new RefundError("Refund identity or amount mismatch.");
    const key = fingerprint(evidence);
    if (!await events.findOne({operation_id: fresh.id, event_key: key})) await events.create({operation_id: fresh.id, event_key: key, evidence});
    if (fresh.state === "completed") return {...await operationResult(fresh), replayed: true};
    if (!record || !(record.method === "online" || record.bank_confirmed_at)) {
      const updated = await refundOperations.update(fresh.id, {state: record ? "pending" : "review", evidence, updated_at: new Date().toISOString()});
      return operationResult(updated!);
    }
    const order = (await db.orders.findById(fresh.order_id))!, total = await completedTotal(order.id) + fresh.amount;
    if (total > order.total || evidence.refund_total !== total) throw new RefundError("Cumulative refund needs reconciliation.");
    const refund = await db.rma.refunds.create({id: fresh.id, operation_id: fresh.id, refund_number: "REF-" + fresh.id, order_id: order.id, return_request_id: fresh.return_request_id,
      amount: fresh.amount, currency: "IDR", gateway_refund_id: record.id, restock_inventory: false, reason: fresh.reason, processed_by: fresh.actor, status: "completed", created_at: new Date().toISOString()} as any);
    const updated = await refundOperations.update(fresh.id, {state: "completed", provider_refund_id: record.id, evidence, updated_at: new Date().toISOString()});
    const orderStatus = total === order.total ? "refunded" : "partially_refunded";
    await db.orders.update(order.id, {status: orderStatus});
    await audit(fresh.actor, "REFUND_CONFIRMED", "refund", fresh.id, {order_id: order.id, amount: fresh.amount, order_status: orderStatus});
    return {operation: updated, refund, orderStatus, pending: false};
  });
}
async function attemptFor(operation: RefundOperation): Promise<PaymentAttempt> {
  const attempt = await paymentAttempts.findById(operation.attempt_id!);
  const config = refundConfig();
  if (!attempt || attempt.environment !== config.environment || attempt.merchant_id !== config.merchant || operation.environment !== config.environment) throw new RefundError("Refund payment environment mismatch.");
  return attempt;
}
export async function reconcileRefund(operation: RefundOperation) {
  if (isDemoMode()) return operationResult(operation);
  const attempt = await attemptFor(operation);
  const status = refundStatus(attempt, await getGatewayStatus(attempt.provider_order_id));
  return applyRefundEvidence(operation, {...status, refunds: undefined, refund: status.refunds.find(record => record.key === operation.request_key) ?? null});
}
export async function issueRefund(params: any, actor: string) {
  const input = refundInput(params), key = requestKey(params.requestKey);
  const existing = await refundOperations.findOne({request_key: key});
  if (existing) {
    if (existing.order_id !== input.order_id || existing.fingerprint !== fingerprint(input)) throw new RefundError("Refund key conflicts with its existing request.");
    return reconcileRefund(existing);
  }
  let verified: any;
  if (!isDemoMode()) {
    const config = refundConfig(true), attempt = await paymentAttempts.findOne({order_id: input.order_id});
    if (!attempt || attempt.environment !== config.environment || attempt.merchant_id !== config.merchant || !attempt.transaction_id) throw new RefundError("A verified provider payment is required for refunding.");
    verified = refundStatus(attempt, await getGatewayStatus(attempt.provider_order_id));
    refundablePayment(verified, input.amount);
  }
  const prepared = await prepareRefund({...params, requestKey: key}, actor, verified), operation = prepared.operation as RefundOperation;
  if (!prepared.may_create) return reconcileRefund(operation);
  if (isDemoMode()) return applyRefundEvidence(operation, {refund_total: await completedTotal(operation.order_id) + operation.amount,
    refund: {id: "DEMO-REFUND-" + operation.id, key: operation.request_key, amount: operation.amount, method: "online", bank_confirmed_at: new Date().toISOString()}});
  const attempt = await attemptFor(operation);
  await requestGatewayRefund(attempt.transaction_id!, operation.request_key, operation.amount, operation.reason);
  return reconcileRefund(operation);
}
export async function reconcileRefunds(orderId?: string,limit=50) {
  let operations: RefundOperation[];
  if (isDemoMode()) operations = await refundOperations.findMany(orderId ? {order_id: orderId} : undefined);
  else {
    refundConfig(); const client = getServerSupabase()!;
    let query = client.from("refund_operations").select("*").in("state", ["creating", "pending", "review"]).order("updated_at", {ascending: true}).limit(limit);
    if (orderId) query = query.eq("order_id", orderId);
    const {data, error} = await query;
    if (error) throw new DatabaseError("reconcileRefunds", "refund_operations", error.code);
    operations = data || [];
  }
  const results = [];
  for (const operation of operations) {
    try { const result = await reconcileRefund(operation); results.push({id: operation.id, success: result.operation.state !== "review", state: result.operation.state}); }
    catch { results.push({id: operation.id, success: false}); }
    if (!isDemoMode()) {
      const {error} = await getServerSupabase()!.from("refund_operations").update({updated_at: new Date().toISOString()}).eq("id", operation.id);
      if (error) throw new DatabaseError("refundCheckpoint", "refund_operations", error.code);
    }
  }
  return results;
}

export async function createReturn(orderId: string, reason: string, notes?: string | null, photos: string[] = []) {
  reason = text(reason, "return reason");
  if ((notes && notes.length > 2000) || !Array.isArray(photos) || photos.length > 10 || photos.some(photo => typeof photo !== "string" || photo.length > 2000 || !/^https:\/\//.test(photo))) throw new RefundError("Invalid return details.", 400);
  if (!isDemoMode()) return rpc("create_return_request", {p_order_id: orderId, p_reason: reason, p_notes: notes || null, p_photos: photos});
  return demoTransaction(async () => {
    const order = await db.orders.findById(orderId);
    if (!order?.paid_at) throw new RefundError("A paid order is required for a return.");
    const prior = (await db.rma.returnRequests.findMany({order_id: orderId})).find(row => !["rejected", "completed"].includes(row.status));
    if (prior) return prior;
    const id = randomUUID();
    return db.rma.returnRequests.create({id, rma_number: "RMA-" + id, order_id: orderId, customer_id: order.customer_id, customer_email: order.customer_email, status: "requested", reason,
      customer_notes: notes || null, photos, requested_at: new Date().toISOString()});
  });
}
export async function transitionReturn(id: string, status: ReturnRequestRow["status"], notes: string | null | undefined, actor: string) {
  if (notes && notes.length > 2000) throw new RefundError("Return notes too long.", 400);
  if (!isDemoMode()) return rpc("transition_return_request", {p_rma_id: id, p_status: status, p_notes: notes ?? null, p_actor: actor});
  return demoTransaction(async () => {
    const rma = await db.rma.returnRequests.findById(id);
    if (!rma) throw new RefundError("Return request not found.", 404);
    const next: Record<string, string[]> = {requested: ["approved", "rejected"], approved: ["item_received", "rejected"], item_received: ["inspected"], inspected: ["completed"], completed: [], rejected: []};
    if (status !== rma.status && !next[rma.status]?.includes(status)) throw new RefundError("Invalid return status transition.");
    const updated = await db.rma.returnRequests.update(id, {status, handled_by: actor, ...(notes !== undefined ? {admin_notes: notes} : {}),
      ...(status === "inspected" ? {inspected_at: rma.inspected_at || new Date().toISOString()} : {}), ...(["completed", "rejected"].includes(status) ? {resolved_at: rma.resolved_at || new Date().toISOString()} : {})});
    await audit(actor, "RMA_STATUS_UPDATED", "rma", id, {status}); return updated;
  });
}

export async function receiveReturn(params: any, actor: string) {
  const input = receiptInput(params), key = requestKey(params.requestKey), hash = fingerprint(input);
  if (!isDemoMode()) return rpc("receive_return_items", {p_key: key, p_fingerprint: hash, p_input: input, p_actor: actor});
  return demoTransaction(async () => {
    const rma = await db.rma.returnRequests.findById(input.rma_id);
    if (!rma) throw new RefundError("Return request not found.", 404);
    const order = await db.orders.findById(rma.order_id), prior = await returnReceipts.findOne({request_key: key});
    if (prior) {
      if (prior.rma_id !== rma.id || prior.fingerprint !== hash) throw new RefundError("Receipt key conflicts with previous request.");
      return {receipt: prior, replayed: true};
    }
    if (!order?.paid_at || rma.status !== "inspected") throw new RefundError("Inspect this paid return before inventory recovery.");
    const lines = (await db.orders.getOrderWithItems(order.id)).items, receipts = await returnReceiptItems.findMany();
    const sold = await holds.findMany({order_id: order.id, status: "settled"});
    const receipt = await returnReceipts.create({id: randomUUID(), request_key: key, fingerprint: hash, order_id: order.id, rma_id: rma.id, actor});
    for (const item of input.items) {
      const line = lines.find(row => row.id === item.order_item_id);
      if (!line?.product_id) throw new RefundError("Returned item does not belong to this order.", 400);
      const used = receipts.filter(row => row.order_item_id === line.id).reduce((sum, row) => sum + row.quantity, 0);
      if (used + item.quantity > line.quantity) throw new RefundError("Return exceeds ordered quantity.");
      const matching = sold.filter(row => row.product_id === line.product_id && (row.variant_id || null) === (line.variant_id || null));
      const sameLines = new Set(lines.filter(row => row.product_id === line.product_id && (row.variant_id || null) === (line.variant_id || null)).map(row => row.id));
      const consumed = receipts.filter(row => sameLines.has(row.order_item_id)).reduce((sum, row) => sum + row.quantity, 0);
      if (new Set(matching.map(row => row.store_id)).size !== 1 || consumed + item.quantity > matching.reduce((sum, row) => sum + row.quantity, 0)) throw new RefundError("Return has no remaining settled inventory coverage.");
      const saved = await returnReceiptItems.create({receipt_id: receipt.id, ...item}); receipts.push(saved);
      if (item.disposition === "quarantine") continue;
      const store = matching[0].store_id;
      let previous: number;
      if (line.variant_id) {
        const variant = await variants.findById(line.variant_id);
        if (!variant || variant.product_id !== line.product_id) throw new RefundError("Return variant inventory needs reconciliation.");
        previous = variant.stock_quantity; await variants.update(variant.id, {stock_quantity: previous + item.quantity});
      } else {
        const inventory = await db.inventory.getByProductAndStore(line.product_id, store);
        if (!inventory) throw new RefundError("Return inventory needs reconciliation.");
        previous = inventory.stock_on_hand; await db.inventory.update(inventory.id, {stock_on_hand: previous + item.quantity});
      }
      await db.inventoryLedger.recordAdjustment({productId: line.product_id, variantId: line.variant_id, storeId: store, deltaQuantity: item.quantity, previousStock: previous, newStock: previous + item.quantity, reasonCode: "RETURN", referenceOrderId: order.id, actorId: actor, notes: "Inspected receipt " + receipt.id});
    }
    await audit(actor, "RETURN_RECEIVED", "rma", rma.id, {receipt_id: receipt.id, items: input.items});
    return {receipt, replayed: false};
  });
}
