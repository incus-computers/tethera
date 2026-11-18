"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/storefront/StorefrontProvider";

export default function PrivacyRequestsPage() {
  const { locale, formatDate } = useTranslation(), id = locale === "id";
  const [requests, setRequests] = useState<any[]>([]), [kind, setKind] = useState("access"), [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [code, setCode] = useState(""), [demoCode, setDemoCode] = useState(""), [contact, setContact] = useState(""), [verified, setVerified] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/account/privacy", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(id ? "Masuk ke akun Anda untuk mengelola permintaan data." : "Sign in to manage your data requests.");
    setRequests(data.requests);
  }, [id]);
  useEffect(() => { load().catch(e => setError(e.message)); }, [load]);
  async function act(action: "send-code" | "verify" | "submit" | "download") {
    setBusy(true); setError(""); setMessage("");
    try {
      if (action === "send-code") {
        const me = await fetch("/api/account/privacy", { cache: "no-store" }); const data = await me.json();
        if (!me.ok) throw new Error(id ? "Masuk terlebih dahulu." : "Sign in first.");
        const identifier = data.verificationContact;
        if (typeof identifier !== "string" || !identifier) throw new Error(id ? "Kontak akun terverifikasi belum tersedia." : "The verified account contact is unavailable.");
        const sent = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, purpose: "recovery" }) });
        const receipt = await sent.json(); if (!sent.ok) throw new Error(id ? "Kode belum dapat dikirim. Coba lagi nanti." : "Could not send a code. Try again later.");
        setContact(identifier); setVerified(false); setDemoCode(receipt.demo === true ? receipt.demoCode : "");
        setMessage(id ? "Masukkan kode verifikasi terbaru dari saluran akun Anda." : "Enter the fresh verification code from your account channel.");
      } else if (action === "verify") {
        const response = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: contact, code }) });
        const receipt = await response.json();
        if (!response.ok || receipt.success !== true) throw new Error(id ? "Kode tidak valid atau kedaluwarsa." : "Invalid or expired code.");
        setVerified(true); setDemoCode(""); setCode(""); setMessage(id ? "Identitas diverifikasi sementara. Server akan memeriksa masa berlaku setiap tindakan." : "Identity temporarily verified. The server checks expiry for every action.");
      } else if (action === "submit") {
        const response = await fetch("/api/account/privacy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, notes }) });
        const receipt = await response.json();
        if (!response.ok || receipt.success !== true) throw new Error(id ? "Permintaan belum dapat disimpan. Verifikasi kode baru bila perlu." : "Request could not be saved. Verify a fresh code if needed.");
        await load(); setNotes(""); setMessage(id ? "Permintaan diterima untuk ditinjau. Data belum otomatis dihapus atau diubah." : "Request received for review. Data has not been automatically erased or changed.");
      } else {
        const response = await fetch("/api/account/privacy?download=1", { cache: "no-store" });
        if (!response.ok) throw new Error(id ? "Unduhan belum tersedia. Verifikasi kode baru atau ajukan permintaan akses untuk bantuan." : "Download unavailable. Verify a fresh code or submit an access request for assistance.");
        const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
        link.href = url; link.download = "incus-account-data.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <article className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <h1 className="text-3xl font-bold">{id ? "Permintaan data pribadi" : "Personal data requests"}</h1>
    <p>{id ? "Minta akses, koreksi atau penghapusan melalui akun Anda. Pengelola meninjau identitas, data terkait dan kewajiban penyimpanan sebelum menanggapi. Permintaan ini tidak menghapus pesanan secara otomatis." : "Request access, correction or erasure through your account. Staff review identity, related data and retention obligations before responding. A request does not automatically delete orders."}</p>
    <p><Link className="underline" href="/auth">{id ? "Masuk" : "Sign in"}</Link> · <Link className="underline" href="/privacy">{id ? "Kebijakan privasi" : "Privacy policy"}</Link> · <Link className="underline" href="/contact">{id ? "Hubungi toko untuk pesanan tamu atau bantuan" : "Contact the store for guest orders or assistance"}</Link></p>
    <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">{id ? "Verifikasi identitas" : "Verify identity"}</h2>
      <button className="min-h-[44px] rounded border px-4" disabled={busy} onClick={() => void act("send-code")}>{id ? "Kirim kode baru" : "Send fresh code"}</button>
      {contact && <><label className="block">{id ? "Kode verifikasi" : "Verification code"}<input inputMode="numeric" maxLength={10} value={code} onChange={e => setCode(e.target.value)} className="ml-3 rounded border bg-transparent p-3" /></label><button className="min-h-[44px] rounded border px-4" disabled={busy || !code} onClick={() => void act("verify")}>{id ? "Verifikasi kode" : "Verify code"}</button></>}
      {demoCode && <p role="status">{id ? "Kode simulasi (tidak ada pesan nyata)" : "Simulated code (no real message)"}: {demoCode}</p>}
    </section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">{id ? "Unduh data akun" : "Download account data"}</h2><p>{id ? "Unduhan mencakup profil, ringkasan pesanan dan data akun terkait. Ini bukan jawaban akses data yang lengkap. Ajukan permintaan akses untuk rincian pesanan, retur, komunikasi atau catatan penyedia. Unduhan besar memerlukan bantuan pengelola." : "The download covers your profile, order summaries and related account data. It is not a complete access response. Submit an access request for order lines, returns, correspondence or provider records. Larger downloads require staff assistance."}</p><button disabled={busy || !verified} onClick={() => void act("download")} className="min-h-[44px] rounded border px-4">{id ? "Unduh JSON akun" : "Download account JSON"}</button></section>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); void act("submit"); }}><h2 className="text-xl font-semibold">{id ? "Ajukan permintaan" : "Submit a request"}</h2>
      <label className="block">{id ? "Jenis permintaan" : "Request type"}<select className="ml-3 rounded border bg-white p-3 text-zinc-900" value={kind} onChange={e => setKind(e.target.value)}><option value="access">{id ? "Akses data" : "Data access"}</option><option value="correction">{id ? "Koreksi data" : "Correction"}</option><option value="erasure">{id ? "Penghapusan untuk ditinjau" : "Erasure for review"}</option></select></label>
      <label className="block">{id ? "Rincian (opsional; jangan kirim kata sandi atau dokumen identitas)" : "Details (optional; do not send passwords or identity documents)"}<textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} className="mt-2 block min-h-[100px] w-full rounded border bg-transparent p-3" /></label>
      <button type="submit" disabled={busy || !verified} className="min-h-[44px] rounded bg-emerald-400 px-4 text-zinc-950">{id ? "Kirim permintaan data" : "Submit data request"}</button>
    </form>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <section className="space-y-3"><h2 className="text-xl font-semibold">{id ? "Permintaan terbaru" : "Recent requests"}</h2><button disabled={busy} className="underline" onClick={() => load().catch(e => setError(e.message))}>{id ? "Muat ulang status" : "Refresh status"}</button>{requests.map(r => <div key={r.id} className="rounded border p-4"><p>{r.kind} / {r.status}</p><p className="break-all text-xs">{r.id}</p><p>{formatDate(r.updated_at)}</p><p>{r.response_notes}</p></div>)}</section>
  </article>;
}
