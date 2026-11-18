"use client";
import { useCallback, useEffect, useState } from "react";
export function OperationsPanel() {
  const [data, setData] = useState<any>(null), [requests, setRequests] = useState<any[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [monitor, privacy] = await Promise.all([fetch("/api/admin/operations", { cache: "no-store" }), fetch("/api/admin/privacy", { cache: "no-store" })]);
    if (!monitor.ok || !privacy.ok) throw new Error("Operations data unavailable. Check staff permissions and database readiness.");
    setData(await monitor.json()); setRequests((await privacy.json()).requests); setError("");
  }, []);
  useEffect(() => { load().catch(e => setError(e.message)); }, [load]);
  async function review(id: string, status: string) {
    const response = window.prompt("Customer-visible response (5-2000 characters). State any retained records and reasons; do not include internal notes:");
    if (!response) return;
    const evidence = window.prompt(status === "in_review" ? "Internal reviewer/case reference (no passwords or identity documents):" : "Reference to the completed manual action or documented refusal. This button records a decision; it does not erase data, contact providers or deliver an export:");
    if (!evidence) return;
    setBusy(true);
    try {
      const result = await fetch("/api/admin/privacy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, response, evidence }) });
      const receipt = await result.json();
      if (!result.ok || receipt.success !== true) throw new Error("The decision could not be recorded. Review the request and required evidence.");
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="my-5 space-y-4 rounded-2xl border border-white/10 bg-[#12141A] p-5 text-slate-200">
    <div className="flex justify-between gap-4"><h2 className="font-bold">Operations &amp; privacy review</h2><button className="underline" disabled={busy} onClick={() => load().catch(e => setError(e.message))}>Refresh operations</button></div>
    {error && <p role="alert">{error}</p>}
    {data && <><p>Database: {data.database}. Worker: {data.worker.stale ? "needs attention" : "recent completed run"}.</p><p>Blocked jobs: {data.queue.blocked}; review: {data.queue.review}; dead: {data.queue.dead}. Open privacy requests: {data.privacy.open}.</p><p className="text-xs">A healthy worker does not establish deployment readiness. Hosted backup restoration, monitoring delivery and final retention rules still require operator evidence.</p></>}
    <h3 className="font-semibold">Oldest open privacy requests (up to 100)</h3><p className="text-xs">Only record completion after carrying out and documenting the actual response/action. Financial records and legal holds require retention review. No automatic account deletion or provider request is triggered.</p>
    {requests.map(r => <article className="space-y-2 rounded border border-white/10 p-3" key={r.id}><p>{r.kind} / {r.status}</p><p className="break-all text-xs">Request: {r.id}; customer: {r.customer_id}</p><p className="whitespace-pre-wrap">{r.requester_notes}</p><div className="flex flex-wrap gap-4"><button className="underline" disabled={busy} onClick={() => review(r.id, "in_review")}>Start review</button>{r.status === "in_review" && <><button className="underline" disabled={busy} onClick={() => review(r.id, "completed")}>Record completed action</button><button className="underline" disabled={busy} onClick={() => review(r.id, "declined")}>Record refusal and reason</button></>}</div></article>)}
  </section>;
}
