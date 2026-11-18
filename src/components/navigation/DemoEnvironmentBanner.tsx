"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
export function DemoEnvironmentBanner() {
 const {locale}=useTranslation();
 const [demo,setDemo]=useState(false);
 useEffect(()=>{fetch("/api/auth/environment").then(r=>r.json()).then(d=>setDemo(d.demo===true)).catch(()=>{});},[]);
 return demo?<div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">{locale==="id"?"Lingkungan demo — data contoh, transaksi dan notifikasi simulasi. Tidak ada pembayaran atau pengiriman nyata.":"Demo environment — seeded data, simulated transactions and notifications. No real payments or shipments."}</div>:null;
}
