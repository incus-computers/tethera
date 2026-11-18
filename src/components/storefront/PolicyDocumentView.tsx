"use client";
import Link from "next/link";
import { useTranslation } from "./StorefrontProvider";
import type { PolicyKey, StorefrontProfile } from "@/lib/storefront/types";
export function PolicyDocumentView({profile,policy}:{profile:StorefrontProfile;policy:PolicyKey}) {
  const {locale}=useTranslation(), id=locale==="id", doc=profile.documents[policy][locale];
  return <article className="mx-auto max-w-3xl space-y-6 px-5 py-10 text-zinc-900 dark:text-zinc-100">
    <nav className="flex flex-wrap gap-4 text-sm underline" aria-label={id?"Informasi toko":"Store information"}>
      <Link href="/privacy">{id?"Privasi":"Privacy"}</Link><Link href="/terms">{id?"Syarat pembelian":"Purchase terms"}</Link><Link href="/warranty">{id?"Garansi & pengembalian":"Warranty & returns"}</Link><Link href="/shipping">{id?"Pengiriman":"Delivery"}</Link><Link href="/contact">{id?"Kontak":"Contact"}</Link>
    </nav>
    <h1 className="text-3xl font-bold">{doc.title}</h1>
    {profile.status!=="published" && <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-100 p-4 text-amber-950">{profile.status==="demo"?(id?"Contoh kebijakan untuk pengujian demo. Ini bukan ketentuan toko yang berlaku untuk transaksi nyata.":"Sample policies for demo testing. These are not binding store terms for real transactions."):(id?"Draf kebijakan: ketentuan final belum disetujui pengelola. Pesanan nyata belum tersedia.":"Draft policies: final terms await merchant review. Real ordering is unavailable.")}</p>}
    <p className="text-sm opacity-70">{id?"Versi":"Version"}: {profile.policyVersion}{profile.effectiveDate?` · ${id?"Berlaku mulai":"Effective"} ${profile.effectiveDate}`:""}</p>
    {doc.sections.map((section,i)=><section key={i} className="space-y-2"><h2 className="text-xl font-semibold">{section.heading}</h2><p className="whitespace-pre-line leading-relaxed">{section.text}</p></section>)}
    {policy==="warranty" && <Link className="inline-block rounded-lg border px-4 py-3" href="/returns/request">{id?"Ajukan atau periksa pengembalian":"Submit or check a return request"}</Link>}
    {policy==="privacy" && <Link className="inline-block rounded-lg border px-4 py-3" href="/privacy/requests">{id?"Kelola permintaan data pribadi":"Manage personal data requests"}</Link>}
    <p><Link href="/contact" className="underline">{id?"Hubungi pengelola toko melalui kontak yang terverifikasi.":"Contact the merchant through verified support details."}</Link></p>
  </article>;
}
