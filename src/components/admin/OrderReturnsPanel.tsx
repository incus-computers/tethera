"use client";
import { useEffect, useRef, useState } from "react";
import { formatRupiah } from "@/lib/utils/currency";

export function OrderReturnsPanel({order, canWrite, onChanged}: {order: any; canWrite: boolean; onChanged?: (status: string) => void}) {
  const [data, setData] = useState<any>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(""), [reason, setReason] = useState(""), [rmaId, setRmaId] = useState("");
  const [returnReason,setReturnReason]=useState("");
  const [itemId, setItemId] = useState(""), [quantity, setQuantity] = useState("1"), [disposition, setDisposition] = useState("quarantine");
  const refundDraft = useRef<any>(null), receiptDraft = useRef<any>(null);
  const storageKey = "refund-draft:" + order.id;
  const receiptStorageKey = "return-receipt-draft:" + order.id;
  const load = async () => {
    const response = await fetch("/api/admin/rma?orderId=" + encodeURIComponent(order.id), {cache: "no-store"});
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Could not load return and refund history.");
    if(receiptDraft.current && result.receipts.some((receipt:any)=>receipt.request_key===receiptDraft.current.key)){localStorage.removeItem(receiptStorageKey);receiptDraft.current=null;}
    setData(result);
    return result;
  };
  useEffect(() => {
    let active = true;
    setData(null); setError(""); setNotice(""); setAmount(""); setReason(""); setReturnReason(""); setRmaId(""); setItemId(""); refundDraft.current = null; receiptDraft.current = null;
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null"); if (saved) {refundDraft.current = saved; setAmount(String(saved.body.amount)); setReason(saved.body.reason);} } catch { /* unavailable storage does not authorise a refund */ }
    try { const saved=JSON.parse(localStorage.getItem(receiptStorageKey)||"null");if(saved){receiptDraft.current=saved;setRmaId(saved.body.rmaId);setItemId(saved.body.items[0].orderItemId);setQuantity(String(saved.body.items[0].quantity));setDisposition(saved.body.items[0].disposition);} }catch{ /* unavailable storage does not authorise a receipt */ }
    load().catch(e => { if (active) setError(e.message); });
    return () => {active = false;};
  }, [order.id]); // order is a server-authorised admin record
  const send = async (body: any, method = "POST", key?: string) => {
    const response = await fetch("/api/admin/rma", {method, headers: {"Content-Type": "application/json", ...(key ? {"Idempotency-Key": key} : {})}, body: JSON.stringify(body)});
    const result = await response.json();
    if (!response.ok || !result.success) throw Object.assign(new Error(result.error || "Request failed. Retry the same operation."),{status:response.status});
    if (result.orderStatus) onChanged?.(result.orderStatus);
    return result;
  };
  const run = async (work: () => Promise<any>) => {
    setBusy(true); setError(""); setNotice("");
    try { const result = await work(); setNotice(result.message || "Saved."); await load(); }
    catch (e: any) {
      setError(e.message);
      try {
        const history=await load();
        if([400,404,409].includes(e.status)){
          if(refundDraft.current && !history.operations.some((operation:any)=>operation.request_key===refundDraft.current.key)){localStorage.removeItem(storageKey);refundDraft.current=null;}
          if(receiptDraft.current && !history.receipts.some((receipt:any)=>receipt.request_key===receiptDraft.current.key)){localStorage.removeItem(receiptStorageKey);receiptDraft.current=null;}
        }
      } catch { /* retain the same request after an ambiguous outcome */ }
    }
    finally {setBusy(false);}
  };
  const refund = () => run(async () => {
    let draft = refundDraft.current;
    if (!draft) {
      draft = {key: crypto.randomUUID(), body: {orderId: order.id, amount: Number(amount), reason, returnRequestId: rmaId || undefined}};
      // Persist the exact request before starting it; a failed persistence does not send money.
      localStorage.setItem(storageKey, JSON.stringify(draft)); refundDraft.current = draft;
    }
    const result = await send(draft.body, "POST", draft.key);
    if (!result.pending) {localStorage.removeItem(storageKey); refundDraft.current = null; setAmount(""); setReason("");}
    return result;
  });
  const receive = () => run(async () => {
    const draft = receiptDraft.current || {key: crypto.randomUUID(), body: {action: "receive_items", rmaId, items: [{orderItemId: itemId, quantity: Number(quantity), disposition}]}};
    localStorage.setItem(receiptStorageKey,JSON.stringify(draft));receiptDraft.current=draft;
    const result = await send(draft.body, "POST", draft.key);localStorage.removeItem(receiptStorageKey);receiptDraft.current = null; return result;
  });
  const next: Record<string, string> = {requested: "approved", approved: "item_received", item_received: "inspected", inspected: "completed"};
  const unresolved = data?.operations?.some((operation: any) => operation.state !== "completed");
  const selectedRma = data?.returnRequests?.find((rma: any) => rma.id === rmaId);
  const inputClass = "min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 w-full text-xs";
  const buttonClass = "min-h-[44px] rounded-lg px-3 py-2 border border-cyan-800 text-cyan-300 text-xs disabled:opacity-40";
  return <details className="rounded-xl border border-white/10 p-4 text-xs space-y-3">
    <summary className="cursor-pointer font-semibold min-h-[44px]">Returns and refunds</summary>
    <p>Refunds move money. Inspected return receipts control inventory separately.</p>
    {error && <p role="alert" className="text-rose-300">{error}</p>}{notice && <p role="status" className="text-emerald-300">{notice}</p>}
    {!data ? <button className={buttonClass} onClick={() => run(async () => {await load(); return {};})}>Reload history</button> : <>
      {data.operations.map((operation: any) => <div key={operation.id} className="rounded-lg bg-white/5 p-3 space-y-2">
        <div>{formatRupiah(Number(operation.amount))} · {operation.state}</div><div className="break-all text-slate-400">Refund {operation.id}</div>
        {canWrite && operation.state !== "completed" && <button disabled={busy} className={buttonClass} onClick={() => run(async () => {
          const result = await send({action: "reconcile", orderId: order.id, operationId: operation.id});
          if (!result.pending && refundDraft.current?.key === operation.request_key) {localStorage.removeItem(storageKey); refundDraft.current = null; setAmount(""); setReason("");}
          return result;
        })}>Check provider confirmation</button>}
      </div>)}
      {data.returnRequests.map((rma: any) => <div key={rma.id} className="rounded-lg bg-white/5 p-3 space-y-2">
        <div>{rma.rma_number} · {rma.status}</div>
        {canWrite && next[rma.status] && <button className={buttonClass} disabled={busy} onClick={() => run(() => send({rmaId: rma.id, status: next[rma.status]}, "PUT"))}>Mark {next[rma.status].replace(/_/g, " ")}</button>}
        {canWrite && ["requested","approved"].includes(rma.status) && <button className={buttonClass} disabled={busy} onClick={()=>run(()=>send({rmaId:rma.id,status:"rejected"},"PUT"))}>Reject return</button>}
      </div>)}
      {canWrite && <>
        <label className="block space-y-1">Return case (optional for refunds)<select className={inputClass} value={rmaId} disabled={busy || Boolean(receiptDraft.current)} onChange={e => setRmaId(e.target.value)}><option value="">No linked return</option>{data.returnRequests.map((rma: any) => <option value={rma.id} key={rma.id}>{rma.rma_number} · {rma.status}</option>)}</select></label>
        <label className="block space-y-1">New return case reason<input className={inputClass} maxLength={255} value={returnReason} disabled={busy} onChange={e=>setReturnReason(e.target.value)} /></label>
        <button className={buttonClass} disabled={busy || !order.paid_at || !returnReason.trim()} onClick={()=>run(()=>send({action:"create_return",orderId:order.id,reason:returnReason}))}>Create return case</button>
        <label className="block space-y-1">Reason<input className={inputClass} maxLength={255} value={reason} disabled={busy || Boolean(refundDraft.current)} onChange={e => setReason(e.target.value)} /></label>
        <label className="block space-y-1">Refund amount (IDR)<input className={inputClass} inputMode="numeric" value={amount} disabled={busy || Boolean(refundDraft.current)} onChange={e => setAmount(e.target.value)} /></label>
        <button className={buttonClass} disabled={busy || !order.paid_at || unresolved || (!refundDraft.current && (!reason.trim() || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0))} onClick={refund}>{refundDraft.current ? "Retry same refund request" : "Request refund"}</button>
        <div className="border-t border-white/10 pt-3 space-y-2">
          <p>Record physically inspected items. Quarantine records their receipt without adding sellable stock.</p>
          <select aria-label="Returned item" className={inputClass} value={itemId} disabled={busy || Boolean(receiptDraft.current)} onChange={e => setItemId(e.target.value)}><option value="">Select item</option>{(order.items || order.order_items || []).filter((item: any) => item.product_id).map((item: any) => <option key={item.id} value={item.id}>{item.product_title_snapshot || item.product?.name || item.product_id} · ordered {item.quantity}</option>)}</select>
          <input aria-label="Returned quantity" className={inputClass} inputMode="numeric" value={quantity} disabled={busy || Boolean(receiptDraft.current)} onChange={e => setQuantity(e.target.value)} />
          <select aria-label="Return disposition" className={inputClass} value={disposition} disabled={busy || Boolean(receiptDraft.current)} onChange={e => setDisposition(e.target.value)}><option value="quarantine">Quarantine / not sellable</option><option value="restock">Inspected and sellable</option></select>
          <button className={buttonClass} disabled={busy || (!receiptDraft.current && (selectedRma?.status !== "inspected" || !itemId))} onClick={receive}>{receiptDraft.current?"Retry same receipt":"Record inspected receipt"}</button>
          <p>{data.receiptItems.reduce((sum: number, item: any) => sum + item.quantity, 0)} item units recorded as returned.</p>
        </div>
      </>}
    </>}
  </details>;
}
