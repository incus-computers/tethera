"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { translate } from "@/lib/i18n/messages";
import { formatIndonesiaDate } from "@/lib/i18n/indonesia";
import type { StoreLocale, StorefrontProfile } from "@/lib/storefront/types";
const Context = createContext({ locale: "en" as StoreLocale, profile: null as StorefrontProfile | null, refreshProfile:async():Promise<StorefrontProfile|null>=>null });
export function StorefrontProvider({ children }: { children: ReactNode }) {
  const locale: StoreLocale = "en";
  const [profile, setProfile] = useState<StorefrontProfile | null>(null);
  useEffect(() => {
    // The merchant chose English only. Discard the retired selector preference.
    document.cookie = "tethera_locale=; Path=/; Max-Age=0; SameSite=Lax";
    const controller = new AbortController();
    fetch("/api/storefront", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error(); return response.json();
    }).then(data => { if (!controller.signal.aborted) setProfile(data); }).catch(()=>{});
    return () => controller.abort();
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const refreshProfile=useCallback(async()=>{
    try{const response=await fetch("/api/storefront",{cache:"no-store"});if(!response.ok)throw new Error();const data:StorefrontProfile=await response.json();setProfile(data);return data;}
    catch{setProfile(null);return null;}
  },[]);
  return <Context.Provider value={{locale,profile,refreshProfile}}>{children}</Context.Provider>;
}
export function useStorefront() { return useContext(Context); }
export function useTranslation() {
  const context = useStorefront();
  const t = useCallback((text: string | null | undefined) => translate(text || "", context.locale), [context.locale]);
  const formatDate = (value: string | number | Date | null | undefined) => formatIndonesiaDate(value, context.locale, context.profile?.timeZone);
  return { ...context, t, formatDate };
}
