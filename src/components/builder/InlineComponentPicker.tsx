"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Check, Info, Search, X } from "lucide-react";
import { BUILDER_CATALOG, BuilderSlots, builderCatalogSlot, componentDetails, replacementIssues } from "../../lib/builder/configuration";
import type { BuilderSlotKey } from "../../lib/store/useBuilderStore";
import type { ComponentItem } from "../../lib/data/mockHardware";
import { formatRupiah } from "../../lib/utils/currency";
import styles from "./PCBuilderView.module.css";

export function InlineComponentPicker({ slot, name, slots, onSelect }: {
  slot: BuilderSlotKey; name: string; slots: BuilderSlots; onSelect: (item: ComponentItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [compatibleOnly, setCompatibleOnly] = useState(true);
  const [sort, setSort] = useState("catalog");
  const [detailItem, setDetailItem] = useState<ComponentItem | null>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const detailHeadingId = useId();
  const selected = slots[slot];
  const candidates = useMemo(() => BUILDER_CATALOG.filter(item => item.slot === builderCatalogSlot(slot)).map(item => ({ item, issues: replacementIssues(slot, item, slots) })), [slot, slots]);
  const matching = candidates.filter(({ item, issues }) => (!compatibleOnly || !issues.length) && `${item.name} ${item.brand} ${item.sku}`.toLowerCase().includes(search.trim().toLowerCase()));
  matching.sort((a, b) => sort === "low" ? a.item.price - b.item.price : sort === "high" ? b.item.price - a.item.price : 0);
  const unavailable = candidates.filter(candidate => candidate.issues.length).length;
  const detailIssues = detailItem ? replacementIssues(slot, detailItem, slots) : [];
  const detailInStock = !!detailItem?.inStock && detailItem.stockCount > 0;
  const detailSelected = detailItem?.id === selected?.id;
  const detailDifference = (detailItem?.price || 0) - (selected?.price || 0);

  useEffect(() => {
    if (detailItem && !detailDialog.current?.open) detailDialog.current?.showModal();
  }, [detailItem]);

  function showDetails(item: ComponentItem, trigger: HTMLButtonElement) {
    detailTrigger.current = trigger;
    setDetailItem(item);
  }
  function closeDetails() { detailDialog.current?.close(); }
  function stockLabel(inStock: boolean) {
    return <span className={`${styles.tileStock} ${inStock ? "" : styles.tileOutOfStock}`}><span aria-hidden="true" />{inStock ? "In stock" : "Out of stock"}</span>;
  }
  function differenceLabel(difference: number) {
    return difference === 0 ? "Same price" : `${difference < 0 ? "−" : "+"}${formatRupiah(Math.abs(difference))}`;
  }

  return <div className={styles.picker} role="region" aria-label={`${name} options`}>
    <div className={styles.pickerHeading}><strong>{selected ? "Choose a replacement" : `Choose ${name.toLowerCase()}`}</strong><span>{selected ? "Price difference from your selected part" : "Price added to your build"}</span></div>
    <div className={styles.filters}>
      <label className={styles.search}><Search size={15} /><input aria-label={`Search ${name.toLowerCase()}`} value={search} placeholder="Search by brand, model or SKU" onChange={event => setSearch(event.target.value)} /></label>
      <label className={styles.sort}><span className={styles.srOnly}>Sort {name.toLowerCase()}</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="catalog">Default order</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
    </div>
    <div className={styles.filterMeta}><span>{matching.length} options{compatibleOnly && unavailable ? ` · ${unavailable} incompatible hidden` : ""}</span><label><input type="checkbox" checked={compatibleOnly} onChange={event => setCompatibleOnly(event.target.checked)} /> Compatible only</label></div>
    {!matching.length ? <div className={styles.emptyResults}><Search size={24} /><strong>No matching parts</strong><p>Try a different search or show incompatible options to see why they do not fit.</p><button className={styles.secondary} onClick={() => { setSearch(""); setCompatibleOnly(false); }}>Clear filters</button></div> : <div className={styles.optionViewport}><div className={styles.optionGrid}>{matching.map(({ item, issues }) => {
      const isSelected = selected?.id === item.id;
      const difference = item.price - (selected?.price || 0);
      const inStock = item.inStock && item.stockCount > 0;
      const warningId = `picker-${slot}-${item.id}-warning`;
      return <article key={item.id} className={`${styles.option} ${isSelected ? styles.selectedOption : ""}`}>
        <div className={styles.optionImage}><Image src={item.image || "/incus-logo.png"} alt={item.name} fill sizes="(max-width: 1440px) 140px, (max-width: 1920px) 12vw, 240px" /></div>
        <h4 title={item.name}>{item.name}</h4>
        {stockLabel(inStock)}
        <div className={styles.optionPrice}><strong className={isSelected ? styles.tileSelected : difference < 0 ? styles.priceSaving : difference === 0 ? styles.samePrice : undefined}>{isSelected ? <><Check size={14} /> Selected</> : differenceLabel(difference)}</strong></div>
        {!!issues.length && <p id={warningId} className={styles.optionWarning}><AlertTriangle size={13} />{issues[0]}</p>}
        <button type="button" className={styles.optionSelect} disabled={!!issues.length || !inStock} aria-label={`${isSelected ? "Selected" : selected ? "Swap to" : "Select"} ${item.name}`} aria-pressed={isSelected} aria-describedby={issues.length ? warningId : undefined} title={item.name} onClick={() => { if (!isSelected) onSelect(item); }} />
        <button type="button" className={styles.tileInfo} aria-label={`View details for ${item.name}`} onClick={event => showDetails(item, event.currentTarget)}><Info size={18} /></button>
      </article>;
    })}</div></div>}
    <dialog ref={detailDialog} className={styles.productDetails} aria-labelledby={detailHeadingId} onClose={() => { setDetailItem(null); detailTrigger.current?.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) closeDetails(); }}>
      {detailItem && <>
        <div className={styles.productDetailsHeading}><h3 id={detailHeadingId}>{detailItem.name}</h3><button type="button" className={styles.iconButton} aria-label="Close product details" onClick={closeDetails}><X size={20} /></button></div>
        <div className={styles.productDetailsImage}><Image src={detailItem.image || "/incus-logo.png"} alt={detailItem.name} fill sizes="480px" /></div>
        {stockLabel(detailInStock)}
        <dl className={styles.specs}>{componentDetails(detailItem).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {detailIssues.map(issue => <p className={styles.optionWarning} key={issue}><AlertTriangle size={14} />{issue}</p>)}
        <div className={styles.productDetailsPrice}><span>{selected ? "Price difference" : "Price added to your build"}</span><strong>{differenceLabel(detailDifference)}</strong></div>
        <button type="button" className={detailSelected ? styles.secondary : styles.primary} disabled={detailSelected || !detailInStock || !!detailIssues.length} onClick={() => { onSelect(detailItem); closeDetails(); }}>{detailSelected ? "Selected" : selected ? "Choose this replacement" : "Choose this part"}</button>
      </>}
    </dialog>
  </div>;
}
