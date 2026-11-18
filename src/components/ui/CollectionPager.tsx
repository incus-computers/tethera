"use client";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Pagination } from "@/lib/db/pagination";

export interface CollectionQuery { page: number; search: string; sort: string; status?: string; }
export function usePagedCollection<T = any>(endpoint: string, field: string, enabled: boolean) {
  const [rows, setRows] = useState<T[]>([]), [stats, setStats] = useState<any>(null);
  const [query, setQuery] = useState<CollectionQuery>({ page: 1, search: "", sort: "date-desc" });
  const [meta, setMeta] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    current.current?.abort(); const controller = new AbortController(); current.current = controller;
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(query.page), limit: "50", search: query.search, sort: query.sort, ...(query.status ? { status: query.status } : {}) });
      const response = await fetch(`${endpoint}${endpoint.includes("?")?"&":"?"}${params}`, { signal: controller.signal, cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success || !data.pagination) throw new Error(data.error || "Could not load this page.");
      if (!controller.signal.aborted) { setRows(data[field] || []); setMeta(data.pagination); setStats(data.stats || null); }
    } catch (error) { if (!controller.signal.aborted) { setRows([]); setError(error instanceof Error ? error.message : "Could not load this page."); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [endpoint, field, enabled, query]);
  useEffect(() => { void reload(); return () => current.current?.abort(); }, [reload]);
  useEffect(() => { if (!enabled) { setRows([]); setStats(null); setLoading(false); setMeta({page:1,limit:50,total:0,totalPages:1}); } }, [enabled]);
  return { rows, setRows, stats, query, setQuery, meta, loading, error, reload };
}

export function PageButtons({ meta, loading, onPage }: { meta: Pagination; loading?: boolean; onPage: (page: number) => void }) {
  const {t}=useTranslation();
  return <nav aria-label="Result pages" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-500/30 p-3 text-sm">
    <span role="status">Page {meta.page} of {meta.totalPages} · {meta.total} results</span>
    <div className="flex gap-2">
      <button type="button" className="min-h-[44px] rounded-lg border border-zinc-500/40 px-4 disabled:opacity-40" disabled={loading || meta.page <= 1} onClick={() => onPage(meta.page - 1)}>{t("Previous page")}</button>
      <button type="button" className="min-h-[44px] rounded-lg border border-zinc-500/40 px-4 disabled:opacity-40" disabled={loading || meta.page >= meta.totalPages || meta.page >= 10000} onClick={() => onPage(meta.page + 1)}>{t("Next page")}</button>
    </div>
  </nav>;
}

export function CollectionControls({ meta, query, onQuery, loading, error, orders = false, refine = false }: {
  meta: Pagination; query: CollectionQuery; onQuery: (query: CollectionQuery) => void; loading?: boolean; error?: string | null; orders?: boolean; refine?: boolean;
}) {
  const {t}=useTranslation();
  const [draft, setDraft] = useState(query.search);
  useEffect(() => setDraft(query.search), [query.search]);
  return <div className="space-y-3 mb-4">
    <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); onQuery({ ...query, page: 1, search: draft.trim() }); }}>
      <input aria-label={t("Search all records")} placeholder={t("Search all records")} maxLength={120} value={draft} onChange={e => setDraft(e.target.value)} className="min-h-[44px] rounded-lg border border-zinc-500/40 bg-transparent px-3" />
      <button type="submit" disabled={loading} className="min-h-[44px] rounded-lg border border-zinc-500/40 px-4 disabled:opacity-40">{t("Search records")}</button>
      {orders && <select aria-label="Order status across all pages" value={query.status || "all"} onChange={e => onQuery({ ...query, status: e.target.value, page: 1 })} className="min-h-[44px] rounded-lg bg-zinc-900 px-3 text-white">
        {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map(v => <option key={v} value={v}>{v === "all" ? "All statuses" : v}</option>)}
      </select>}
      <select aria-label={t("Sort all records")} value={query.sort} onChange={e => onQuery({ ...query, sort: e.target.value, page: 1 })} className="min-h-[44px] rounded-lg bg-zinc-900 px-3 text-white">
        <option value="date-desc">{t("Newest first")}</option><option value="date-asc">{t("Oldest first")}</option><option value="total-desc">{t("Highest value first")}</option><option value="total-asc">{t("Lowest value first")}</option>
      </select>
    </form>
    {error && <p role="alert">{error}</p>}
    <PageButtons meta={meta} loading={loading} onPage={page => onQuery({ ...query, page })} />
    {refine && <p className="text-xs opacity-70">Use the table filters below to refine the results on this page.</p>}
  </div>;
}
