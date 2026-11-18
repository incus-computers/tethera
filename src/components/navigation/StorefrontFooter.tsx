"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IncusLogo } from "./IncusLogo";
import { BusinessDetails } from "@/components/storefront/BusinessDetails";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
import { isPaymentFlowRoute } from "@/lib/storefront/routes";
export function StorefrontFooter(){
 const path=usePathname(),{locale}=useTranslation(),id=locale==="id";
 if(path?.startsWith("/admin")||isPaymentFlowRoute(path))return null;
 return <footer className="mt-16 border-t border-zinc-500/20 bg-white text-zinc-700 dark:bg-[#0A0B0E] dark:text-zinc-300">
  <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-3">
   <div className="space-y-3"><Link href="/"><IncusLogo className="h-9 w-auto"/></Link><p className="text-sm">{id?"Komponen komputer, PC rakitan dan layanan purnajual untuk pelanggan Indonesia.":"Computer components, custom PCs and after-sales service for customers in Indonesia."}</p></div>
   <section className="space-y-3"><h2 className="font-semibold">{id?"Identitas dan kontak toko":"Store identity and contact"}</h2><BusinessDetails/></section>
   <nav className="space-y-3 text-sm" aria-label={id?"Bantuan dan kebijakan":"Help and policies"}>
    <Link className="block underline" href="/builder">{id?"Rakit PC":"Custom PC Builder"}</Link><Link className="block underline" href="/components">{id?"Belanja komponen":"Shop components"}</Link>
    <Link className="block underline" href="/privacy">{id?"Kebijakan privasi":"Privacy policy"}</Link><Link className="block underline" href="/terms">{id?"Syarat pembelian":"Purchase terms"}</Link><Link className="block underline" href="/warranty">{id?"Garansi dan pengembalian":"Warranty and returns"}</Link><Link className="block underline" href="/shipping">{id?"Pengiriman dan pengambilan":"Delivery and collection"}</Link><Link className="block underline" href="/contact">{id?"Kontak":"Contact"}</Link><Link className="block underline" href="/admin">Admin</Link>
   </nav>
  </div>
  <p className="px-5 pb-6 text-center text-xs">© {new Date().getFullYear()} Incus Computers.</p>
 </footer>;
}
