"use client";
import { BusinessDetails } from "@/components/storefront/BusinessDetails";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
export function FlagshipStoreModal({isOpen,onClose}:{isOpen:boolean;onClose:()=>void}){
 const {locale}=useTranslation();if(!isOpen)return null;
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><section role="dialog" aria-modal="true" aria-labelledby="store-details-title" className="max-w-xl space-y-5 rounded-2xl bg-white p-6 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100">
 <h2 id="store-details-title" className="text-xl font-bold">{locale==="id"?"Informasi toko dan pengambilan":"Store and collection details"}</h2><BusinessDetails/><button type="button" onClick={onClose} className="min-h-[44px] rounded-lg border px-5">{locale==="id"?"Tutup":"Close"}</button></section></div>;
}
