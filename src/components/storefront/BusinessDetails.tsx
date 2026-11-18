"use client";
import Link from "next/link";
import { useTranslation } from "./StorefrontProvider";
export function BusinessDetails() {
  const {profile,locale}=useTranslation(); const id=locale==="id";
  return <div className="space-y-3 text-sm">
    {profile?.status==="demo" && <p role="status">{id?"Data toko contoh untuk simulasi. Jangan gunakan untuk kunjungan atau menghubungi pihak nyata.":"Sample store details for simulation. Do not use them to visit or contact a real business."}</p>}
    <p>{profile?.legalName || (id?"Identitas usaha belum dikonfirmasi.":"Business identity has not been confirmed.")}</p>
    <p>{profile?.pickupAddress || (id?"Alamat pengambilan belum tersedia.":"A confirmed collection address is not available.")}</p>
    <p>{profile?.openingHours || (id?"Jam layanan belum tersedia.":"Confirmed opening hours are not available.")}</p>
    {profile?.status==="demo"&&<p>{profile.supportEmail} · +{profile.whatsapp} ({id?"kontak tampilan; tautan komunikasi dinonaktifkan dalam demo":"display only; communication links disabled in demo"})</p>}
    {(profile?.status==="published"||profile?.status==="draft") && profile.supportEmail ? <a className="block underline" href={`mailto:${profile.supportEmail}`}>{profile.supportEmail}</a> : profile?.status!=="demo" && <p>{id?"Email dukungan terverifikasi belum tersedia.":"A verified support email is not available."}</p>}
    {(profile?.status==="published"||profile?.status==="draft") && profile.whatsapp && <a className="block underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${profile.whatsapp}?text=${encodeURIComponent(id?"Halo, saya ingin menghubungi layanan pelanggan.":"Hello, I would like to contact customer support.")}`}>WhatsApp: +{profile.whatsapp}</a>}
    <Link href="/warranty" className="block underline">{id?"Lihat prosedur garansi dan pengembalian":"View warranty and return procedures"}</Link>
  </div>;
}
