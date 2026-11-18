"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Copy, Eye, Link2, LoaderCircle, Save } from "lucide-react";
import { useBuilderStore } from "../../lib/store/useBuilderStore";
import { BUILDER_SLOTS } from "../../lib/builder/configuration";
import { type BuildSnapshot, normalizeBuildCode } from "../../lib/builder/snapshots";
import styles from "./PCBuilderView.module.css";

export function BuildCodeControls({ onLoad, disabled = false, initialCode = "" }: {
  onLoad: (build: BuildSnapshot, code: string) => void; disabled?: boolean; initialCode?: string;
}) {
  const { slots, buildName, sourceProductId, selectedService } = useBuilderStore();
  const [code, setCode] = useState(initialCode);
  const [confirmedCode, setConfirmedCode] = useState(initialCode);
  const [busy, setBusy] = useState<"save" | "preview" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const controller = useRef<AbortController | null>(null);
  const fieldId = useId();
  const feedbackId = useId();
  const copyableCode = confirmedCode && normalizeBuildCode(code) === confirmedCode ? confirmedCode : "";

  useEffect(() => { setCode(initialCode); setConfirmedCode(initialCode); }, [initialCode]);
  useEffect(() => () => controller.current?.abort(), []);

  async function save() {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setBusy("save"); setError(""); setStatus("");
    const parts: BuildSnapshot["parts"] = {};
    for (const slot of BUILDER_SLOTS) if (slots[slot]) parts[slot] = slots[slot]!.id;
    try {
      const response = await fetch("/api/builder/builds", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts, name: buildName, sourceProductId, serviceId: selectedService.id }), signal: request.signal });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save this build. Please try again.");
      if (!request.signal.aborted) { setCode(result.code); setConfirmedCode(result.code); setStatus("Simulation saved. Copy the code or link to share it."); }
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not save this build. Please try again.");
    } finally { if (!request.signal.aborted) setBusy(null); }
  }
  async function preview() {
    const normalized = normalizeBuildCode(code);
    if (!normalized) { setError("Enter a valid simulation code, such as INC-ABCD-EFGH-JKLM."); setStatus(""); return; }
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setBusy("preview"); setError(""); setStatus("");
    try {
      const response = await fetch(`/api/builder/builds/${encodeURIComponent(normalized)}`, { signal: request.signal, cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not load this build. Please try again.");
      if (!request.signal.aborted) { setCode(result.code); setConfirmedCode(result.code); onLoad(result.build, result.code); }
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load this build. Please try again.");
    } finally { if (!request.signal.aborted) setBusy(null); }
  }
  async function copy(link = false) {
    setError(""); setStatus("");
    try {
      await navigator.clipboard.writeText(link ? `${window.location.origin}/builder?code=${encodeURIComponent(copyableCode)}` : copyableCode);
      setStatus(link ? "Build link copied." : "Build code copied.");
    } catch { setError("Select and copy the simulation code from the field above."); }
  }

  return <form className={styles.simulationPanel} aria-label="Simulation code" aria-busy={!!busy} onSubmit={event => { event.preventDefault(); void preview(); }}>
    <label htmlFor={fieldId} className={styles.simulationLabel}>Simulation Code</label>
    <div className={styles.simulationField}>
      <input id={fieldId} value={code} maxLength={80} placeholder="Enter a code" autoComplete="off" spellCheck={false}
        disabled={disabled || !!busy} aria-invalid={!!error} aria-describedby={error || status ? feedbackId : undefined}
        onChange={event => { setCode(event.target.value); setError(""); setStatus(""); }} />
      {copyableCode && <>
        <button type="button" className={styles.simulationCopy} aria-label="Copy code" title="Copy code" disabled={disabled || !!busy} onClick={() => copy()}><Copy size={15} /></button>
        <button type="button" className={styles.simulationCopy} aria-label="Copy link" title="Copy link" disabled={disabled || !!busy} onClick={() => copy(true)}><Link2 size={15} /></button>
      </>}
    </div>
    <div className={styles.simulationActions}>
      <button type="submit" className={styles.secondary} disabled={disabled || !!busy || !code.trim()}>{busy === "preview" ? <LoaderCircle size={14} className={styles.codeSpinner} /> : <Eye size={14} />}Preview build</button>
      <button type="button" className={styles.primary} disabled={disabled || !!busy || !Object.values(slots).some(Boolean)} onClick={() => save()}>{busy === "save" ? <LoaderCircle size={14} className={styles.codeSpinner} /> : <Save size={14} />}Save build</button>
    </div>
    {error ? <p id={feedbackId} role="alert" className={styles.simulationError}>{error}</p> : status ? <p id={feedbackId} role="status" className={styles.simulationStatus}>{status}</p> : null}
  </form>;
}
