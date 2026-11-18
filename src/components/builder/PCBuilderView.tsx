"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Box, ChevronDown, Cpu, Disc, Fan, HardDrive, Headphones, Keyboard, Layers, Monitor, Mouse, Network, Plus, RectangleHorizontal, RotateCcw, Share2, ShieldCheck, ShoppingCart, Trash2, Wrench, X, Zap, type LucideIcon } from "lucide-react";
import { useBuilderStore, type BuilderSlotKey } from "../../lib/store/useBuilderStore";
import { ComponentItem, SERVICE_TIERS } from "../../lib/data/mockHardware";
import { builderDisplayName, prebuiltModelName } from "../../lib/data/prebuiltNames";
import { BUILDER_SLOTS, REQUIRED_SLOTS, replacementIssues, resolveBuilderParts } from "../../lib/builder/configuration";
import { useCartStore } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";
import { WhatsAppInquiryButton } from "../whatsapp/WhatsAppInquiryButton";
import { InlineComponentPicker } from "./InlineComponentPicker";
import { BuildCodeControls } from "./BuildCodeControls";
import { customizedCartSlots, prebuiltCartBaseline } from "../../lib/builder/cartParts";
import { type BuildSnapshot, snapshotParts, snapshotUrl } from "../../lib/builder/snapshots";
import styles from "./PCBuilderView.module.css";

const definitions: Record<BuilderSlotKey, { name: string; icon: LucideIcon }> = {
  cpu: { name: "CPU", icon: Cpu }, gpu: { name: "Graphics card", icon: Monitor }, ram: { name: "RAM", icon: HardDrive },
  storage_primary: { name: "Primary storage", icon: HardDrive }, storage_secondary: { name: "Secondary storage", icon: HardDrive }, storage_tertiary: { name: "Tertiary storage", icon: HardDrive }, motherboard: { name: "Motherboard", icon: Layers }, cooler: { name: "CPU cooler", icon: Fan },
  case: { name: "Case", icon: Box }, psu: { name: "Power supply", icon: Zap }, os: { name: "Operating system", icon: Disc },
  mouse: { name: "Mouse", icon: Mouse }, keyboard: { name: "Keyboard", icon: Keyboard }, headphones: { name: "Headphones", icon: Headphones },
  mousepad: { name: "Mousepad", icon: RectangleHorizontal }, other_peripherals: { name: "Accessories", icon: Network },
};
const partGroups: { name: string; keys: BuilderSlotKey[] }[] = [
  { name: "Main Components", keys: ["cpu", "motherboard", "ram", "gpu", "storage_primary", "case", "psu"] },
  { name: "Additional Components", keys: ["storage_secondary", "storage_tertiary", "cooler", "os", "other_peripherals", "mouse", "keyboard", "headphones", "mousepad"] },
];
const orderedSlots = partGroups.flatMap(group => group.keys);
function priceDifference(value: number) { return value ? `${value < 0 ? "−" : "+"}${formatRupiah(Math.abs(value))}` : "No price change"; }

export function PCBuilderView() {
  const [activeSlot, setActiveSlot] = useState<BuilderSlotKey | null>("gpu");
  const [notice, setNotice] = useState("");
  const [entryWarning, setEntryWarning] = useState("");
  const [shareFallback, setShareFallback] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);
  const [simulationCode, setSimulationCode] = useState("");
  const router = useRouter();
  const search = useSearchParams().toString();
  const lastLoaded = useRef<string | null>(null);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const reviewTrigger = useRef<HTMLElement | null>(null);
  const { slots, originalSlots, selectedService, originalService, buildName, sourceProductId, loadBuild, restoreBuild, selectSlotItem, removeSlotItem, setServiceTier, getWattage, getTotalPrice, getCompatibility, getBuildShareUrl } = useBuilderStore();
  const displayBuildName = buildName ? builderDisplayName(buildName) : null;

  const applySavedBuild = useCallback((snapshot: BuildSnapshot, code: string) => {
    const resolved = resolveBuilderParts(snapshotParts(snapshot));
    loadBuild(resolved.slots, { name: snapshot.name || undefined, sourceProductId: snapshot.sourceProductId || undefined, serviceId: snapshot.serviceId });
    setEntryWarning(resolved.rejected.length ? "Some saved parts are no longer available. Choose replacements for the missing parts below." : "");
    setShareFallback(""); setSimulationCode(code); setNotice(`Build ${code} loaded.`);
  }, [loadBuild]);

  function loadSavedBuild(snapshot: BuildSnapshot, code: string) {
    applySavedBuild(snapshot, code);
    const url = snapshotUrl(snapshot);
    lastLoaded.current = url.slice(url.indexOf("?") + 1);
    router.replace(url, { scroll: false });
  }

  useEffect(() => {
    if (lastLoaded.current === search) return;
    const params = new URLSearchParams(search);
    if (!params.has("parts") && params.has("code")) {
      const request = new AbortController();
      setLoadingCode(true); setEntryWarning(""); setNotice("");
      void (async () => {
        try {
          const response = await fetch(`/api/builder/builds/${encodeURIComponent(params.get("code") || "")}`, { signal: request.signal, cache: "no-store" });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.error || "Could not load this build. Please try again.");
          if (!request.signal.aborted) { lastLoaded.current = search; applySavedBuild(result.build, result.code); }
        } catch (failure) {
          if (!request.signal.aborted) setEntryWarning(failure instanceof Error ? failure.message : "Could not load this build. Please try again.");
        } finally { if (!request.signal.aborted) setLoadingCode(false); }
      })();
      return () => request.abort();
    }
    lastLoaded.current = search;
    setLoadingCode(false);
    setSimulationCode("");
    if (!params.has("parts")) { setEntryWarning(""); return; }
    const resolved = resolveBuilderParts(params.get("parts") || "");
    loadBuild(resolved.slots, { name: prebuiltModelName(params.get("name") || "") || undefined, sourceProductId: params.get("source") || undefined, serviceId: params.get("service") || undefined });
    setEntryWarning(resolved.rejected.length ? "Some linked parts could not be loaded. Choose replacements for the missing parts below." : "");
    setNotice(""); setShareFallback("");
  }, [search, loadBuild, applySavedBuild]);

  const compatibility = getCompatibility();
  const { estimated, recommendedPsu } = getWattage();
  const partsTotal = Object.values(slots).reduce((sum, item) => sum + (item?.price || 0), 0);
  const total = getTotalPrice();
  const originalTotal = Object.values(originalSlots).reduce((sum, item) => sum + (item?.price || 0), 0) + originalService.price;
  const changed = BUILDER_SLOTS.filter(key => slots[key]?.id !== originalSlots[key]?.id);
  const serviceChanged = selectedService.id !== originalService.id;
  const hasChanges = !!changed.length || serviceChanged;
  const hasOriginal = Object.values(originalSlots).some(Boolean);
  const missing = REQUIRED_SLOTS.filter(key => !slots[key]);
  const outOfStock = BUILDER_SLOTS.filter(key => slots[key] && (!slots[key]!.inStock || slots[key]!.stockCount <= 0));
  const canAdd = !missing.length && compatibility.isCompatible && !compatibility.warnings.length && !outOfStock.length;
  const fitIssues = [...compatibility.issues, ...compatibility.warnings];

  function choose(slot: BuilderSlotKey, item: ComponentItem) {
    const problems = replacementIssues(slot, item, slots);
    if (problems.length) { setNotice(problems[0]); return; }
    if (!item.inStock || item.stockCount <= 0) return;
    selectSlotItem(slot, item);
    setNotice("");
  }
  function undo(slot: BuilderSlotKey) {
    const original = originalSlots[slot];
    if (original) {
      const problems = replacementIssues(slot, original, slots);
      if (problems.length) { setNotice("This original part conflicts with your current choices. Use Reset changes to restore the linked parts together."); return; }
      selectSlotItem(slot, original);
    } else removeSlotItem(slot);
    setNotice(`${definitions[slot].name} restored.`);
  }
  function resetChanges() { restoreBuild(); setNotice(hasOriginal ? "Original configuration restored." : "Build cleared."); }
  async function share() {
    const url = getBuildShareUrl();
    try { await navigator.clipboard.writeText(url); setNotice("Build link copied."); setShareFallback(""); }
    catch { setShareFallback(url); setNotice("Copy the build link below."); }
  }
  function showReview() { reviewTrigger.current = document.activeElement as HTMLElement; reviewDialog.current?.showModal(); }
  function addToCart() {
    if (!canAdd) return;
    const parts: Record<string, ComponentItem> = {};
    for (const key of BUILDER_SLOTS) if (slots[key]) parts[key] = slots[key]!;
    const customizedSlots = sourceProductId
      ? customizedCartSlots(parts, prebuiltCartBaseline(sourceProductId) ?? originalSlots)
      : undefined;
    // Let the cart drawer own focus after this dialog closes.
    reviewTrigger.current = null;
    reviewDialog.current?.close();
    useCartStore.getState().addCustomPC({ id: `custom-pc-${Date.now()}`, name: buildName ? `${buildName.slice(0, 85)} - Customized` : "Custom configured PC", parts, customizedSlots,
      serviceTier: { id: selectedService.id, name: selectedService.name, price: selectedService.price, leadTime: selectedService.leadTime }, totalPrice: total, wattage: estimated });
  }
  function openPart(key: BuilderSlotKey) {
    reviewDialog.current?.close();
    setActiveSlot(key);
    requestAnimationFrame(() => { const part = document.getElementById(`builder-part-${key}`); part?.scrollIntoView({ block: "start", behavior: "smooth" }); part?.querySelector("button")?.focus({ preventScroll: true }); });
  }
  function renderPart(key: BuilderSlotKey) {
    const def = definitions[key], Icon = def.icon, item = slots[key], original = originalSlots[key], expanded = activeSlot === key;
    const isChanged = item?.id !== original?.id;
    return <article key={key} id={`builder-part-${key}`} className={`${styles.part} ${expanded ? styles.openPart : ""}`}>
      <div className={styles.partHeader}>
        <button className={styles.partToggle} aria-expanded={expanded} aria-controls={`builder-options-${key}`} aria-label={`${item ? "Change" : "Select"} ${def.name.toLowerCase()}`} aria-describedby={isChanged ? `builder-change-${key}` : undefined} onClick={() => setActiveSlot(expanded ? null : key)}>
          <span className={styles.partIcon}><Icon size={22} /></span><span className={styles.partName}><small>{def.name}{isChanged && <><span className={styles.changedDot} aria-hidden="true" /><span id={`builder-change-${key}`} className={styles.srOnly}>Changed component</span></>}</small><strong>{item?.name || "Choose a component"}</strong></span>
          <span className={styles.partPricing}>{sourceProductId && isChanged && <span className={styles.originalComponent}>(Original component: {original?.name || "None"})</span>}<span className={styles.partPrice}>{item ? formatRupiah(item.price) : "Not selected"}</span></span><span className={styles.partAction}>{expanded ? "Close" : item ? "Change" : "Select"}{expanded ? <X size={14} /> : <Plus size={14} />}</span>
        </button>
        {item && <button className={styles.removePart} aria-label={`Remove ${def.name.toLowerCase()}`} onClick={() => { removeSlotItem(key); setNotice(`${def.name} removed.`); }}><Trash2 size={14} /></button>}
      </div>
      <div id={`builder-options-${key}`} hidden={!expanded}>{expanded && <InlineComponentPicker key={key} slot={key} name={def.name} slots={slots} onSelect={item => choose(key, item)} />}</div>
    </article>;
  }
  function renderReadiness(showMissingParts = false) {
    return <div className={styles.readiness}>
      {showMissingParts && missing.length > 0 && <><strong><Plus size={15} /> Complete your configuration</strong><div className={styles.missingParts}>{missing.map(key => <button key={key} onClick={() => openPart(key)}>{definitions[key].name}<ArrowRight size={12} /></button>)}</div></>}
      {fitIssues.length > 0 ? <div className={styles.fitWarnings}>{fitIssues.map(issue => <p key={issue}><AlertTriangle size={13} />{issue}</p>)}</div> : missing.length > 0 ? <p><ShieldCheck size={15} />Fit checks update as you choose parts.</p> : null}
      {outOfStock.length > 0 && <p className={styles.warningText}>Unavailable: {outOfStock.map(key => definitions[key].name).join(", ")}.</p>}
      <small>Final physical fit, BIOS and cooling capacity need review.</small>
    </div>;
  }

  return <div className={styles.builder}>
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">PC Builder</span></nav>
        <div className={styles.headingContent}>
          <div className={styles.headingMain}>
            <div className={styles.headingIntro}><h1>{buildName ? "Customize your PC" : "Build your PC"}</h1><p>{buildName ? "Change the parts you want. Keep the rest of your configuration." : "Choose your components. Open a row to compare parts and pricing."}</p><div className={styles.headingActions}><button className={styles.secondary} onClick={share}><Share2 size={14} />Share build</button><button className={styles.secondary} onClick={resetChanges} disabled={!hasChanges}><RotateCcw size={14} />Reset changes</button></div></div>
            {buildName && <div className={styles.buildNameCard}><h2 className={styles.buildTitle}>{sourceProductId ? <Link href={`/products/${encodeURIComponent(sourceProductId)}`}>{displayBuildName}</Link> : displayBuildName}</h2></div>}
          </div>
        </div>
        <BuildCodeControls onLoad={loadSavedBuild} disabled={loadingCode} initialCode={simulationCode} />
      </header>
      {entryWarning && <p className={styles.entryWarning}><AlertTriangle size={16} />{entryWarning}</p>}
      {loadingCode && <p role="status" className={styles.notice}>Loading saved build...</p>}
      {notice && <p role="status" aria-live="polite" className={styles.notice}>{notice}</p>}
      {shareFallback && <label className={styles.shareFallback}>Build link<input readOnly value={shareFallback} onFocus={event => event.currentTarget.select()} /></label>}
      <div className={styles.layout}>
        <div className={styles.components}>
          {partGroups.map((group, index) => <section key={group.name} className={styles.group} aria-labelledby={`builder-group-${index}`}><div className={styles.groupHeading}><h2 id={`builder-group-${index}`}>{group.name}</h2><span>{group.keys.filter(key => slots[key]).length} / {group.keys.length} selected</span></div><div className={styles.partList}>{group.keys.map(renderPart)}</div></section>)}
          <section className={styles.services}><div className={styles.groupHeading}><h2><Wrench size={17} /> Assembly & testing</h2><span>Choose a service</span></div><div className={styles.serviceGrid}>{SERVICE_TIERS.map(tier => <label key={tier.id} className={`${styles.service} ${selectedService.id === tier.id ? styles.selectedService : ""}`}><input type="radio" name="builder-service" value={tier.id} checked={selectedService.id === tier.id} onChange={() => setServiceTier(tier)} /><span><strong>{tier.name}</strong><small>{tier.leadTime}</small><b>{tier.price ? formatRupiah(tier.price) : "No assembly fee"}</b></span></label>)}</div></section>
        </div>
        <aside className={styles.summary} aria-label="Your configuration">
          <div className={styles.summaryTitle}><h2>Your configuration</h2></div>
          <span className={styles.totalLabel}>Estimated total</span><strong className={styles.total} data-builder-total>{formatRupiah(total)}</strong><p className={styles.totalNote}>Shipping calculated at checkout.</p>
          <dl className={styles.breakdown}><div><dt>Components</dt><dd>{formatRupiah(partsTotal)}</dd></div><div><dt>Assembly & testing</dt><dd>{formatRupiah(selectedService.price)}</dd></div></dl>
          {hasOriginal && <p className={styles.pricingNote}>Custom configurations use individual component pricing. Prebuilt package offers may differ.</p>}
          {sourceProductId && <div className={styles.changes}>
            {hasChanges ? <details>
              <summary className={styles.changesToggle}>
                <span className={styles.changesHeading}><strong>{changed.length + Number(serviceChanged)} {changed.length + Number(serviceChanged) === 1 ? "change" : "changes"}</strong><span>{priceDifference(total - originalTotal)}</span></span>
                <ChevronDown size={18} className={styles.changesChevron} aria-hidden="true" />
              </summary>
              <div className={styles.changeList}>
                {changed.map(key => <div key={key}><span><small>{definitions[key].name} · {priceDifference((slots[key]?.price || 0) - (originalSlots[key]?.price || 0))}</small><strong>{slots[key]?.name || "Removed"}</strong></span><button onClick={() => undo(key)} aria-label={`Undo ${definitions[key].name.toLowerCase()} change`}>Undo</button></div>)}
                {serviceChanged && <div><span><small>Assembly & testing</small><strong>{selectedService.name}</strong></span><button onClick={() => setServiceTier(originalService)}>Undo</button></div>}
              </div>
            </details> : <><div className={styles.changesHeading}><strong>Original configuration</strong><span>{priceDifference(total - originalTotal)}</span></div><p>{hasOriginal ? "Your original parts are unchanged." : "Choose a component to begin."}</p></>}
          </div>}
          {renderReadiness()}
          <div className={styles.power}><span><Zap size={14} />Estimated power</span><strong>{estimated} W</strong><small>Recommended PSU: {recommendedPsu} W+{slots.psu ? ` · selected ${slots.psu.specs.wattage || "unknown"} W` : ""}</small></div>
          <button className={styles.primary} onClick={showReview}>Review build<ArrowRight size={15} /></button>
          <WhatsAppInquiryButton mode="builder" className={styles.consult} label="Ask about this build" build={{ buildSlug: "custom", buildUrl: getBuildShareUrl(), estimatedWattage: estimated, totalPrice: formatRupiah(total) }} />
        </aside>
      </div>
    </div>
    <div className={styles.mobileBar}><div><span>Estimated total</span><strong>{formatRupiah(total)}</strong></div><button className={styles.primary} onClick={showReview}>Review build<ArrowRight size={14} /></button></div>
    <dialog ref={reviewDialog} className={styles.review} aria-labelledby="builder-review-title" onClose={() => reviewTrigger.current?.focus({ preventScroll: true })} onClick={event => { if (event.target === event.currentTarget) reviewDialog.current?.close(); }}>
      <div className={styles.reviewHeading}><div><span className={styles.eyebrow}>YOUR CONFIGURATION</span><h2 id="builder-review-title">Review your build</h2></div><button className={styles.iconButton} aria-label="Close build review" onClick={() => reviewDialog.current?.close()}><X size={20} /></button></div>
      {displayBuildName && <p className={styles.reviewName}>{displayBuildName}</p>}
      <div className={styles.reviewParts}>{orderedSlots.filter(key => slots[key]).map(key => { const item = slots[key]!, Icon = definitions[key].icon; return <div key={key}><Icon size={18} /><span><small>{definitions[key].name}</small><strong>{item.name}</strong></span><b>{formatRupiah(item.price)}</b></div>; })}</div>
      <dl className={styles.reviewTotals}><div><dt>Components</dt><dd>{formatRupiah(partsTotal)}</dd></div><div><dt>{selectedService.name}</dt><dd>{formatRupiah(selectedService.price)}</dd></div><div><dt>Estimated total</dt><dd>{formatRupiah(total)}</dd></div></dl>
      <p className={styles.totalNote}>Shipping calculated at checkout. Final prices and availability are verified at checkout.</p>
      <div className={styles.reviewReadiness}>{renderReadiness(true)}</div>
      <button className={styles.primary} disabled={!canAdd} onClick={addToCart}><ShoppingCart size={16} />Add configured PC to cart</button>
      <button className={styles.reviewBack} onClick={() => reviewDialog.current?.close()}>Continue editing</button>
    </dialog>
  </div>;
}
