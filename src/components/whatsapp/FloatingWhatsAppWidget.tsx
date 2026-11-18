"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
import { useCartStore } from "@/lib/store/useCartStore";
import { isPaymentFlowRoute } from "@/lib/storefront/routes";
export function FloatingWhatsAppWidget(){
 const {profile,locale}=useTranslation(),path=usePathname(),openCart=useCartStore(s=>s.isCartOpen),[simulated,setSimulated]=useState(false);const id=locale==="id";
 if(path?.startsWith("/admin")||path?.startsWith("/builder")||isPaymentFlowRoute(path)||openCart)return null;
 const label=id?"Hubungi toko":"Contact the store";
 return <aside className="fixed bottom-5 right-5 z-40 space-y-2 print:hidden">
  {simulated&&<p role="status" className="max-w-xs rounded-xl bg-zinc-900 p-4 text-sm text-white">{id?"Demo: percakapan disimulasikan. Tidak ada pesan yang dikirim.":"Demo: simulated conversation. No message was sent."}</p>}
  {profile?.status==="demo"?<button aria-label={label} onClick={()=>setSimulated(!simulated)} className="min-h-[44px] rounded-full bg-emerald-400 px-5 text-sm font-bold text-zinc-950">{label} ? DEMO</button>:
   (profile?.status==="published"||profile?.status==="draft")&&profile.whatsapp?<a className="inline-flex min-h-[44px] items-center rounded-full bg-emerald-400 px-5 text-sm font-bold text-zinc-950" aria-label={label} target="_blank" rel="noopener noreferrer" href={`https://wa.me/${profile.whatsapp}?text=${encodeURIComponent(id?"Halo, saya ingin bertanya tentang pesanan atau produk.":"Hello, I have a question about an order or product.")}`}>{label}</a>:
   <Link href="/contact" className="inline-flex min-h-[44px] items-center rounded-full bg-zinc-200 px-5 text-sm text-zinc-950">{label}</Link>}
 </aside>;
}
