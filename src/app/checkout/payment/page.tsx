"use client";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
import { Suspense,useState,useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/lib/store/useCartStore";
function PaymentStatus(){
  const {t}=useTranslation();
 const query=useSearchParams(),orderId=query.get("orderId");const [state,setState]=useState("checking"),[error,setError]=useState("");
 async function check(){
  if(!orderId){setError("Missing order reference.");return;}setError("");setState("checking");
  try{const r=await fetch("/api/checkout/midtrans/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId})});const d=await r.json();if(!r.ok)throw new Error(d.error||d.detail||"Payment verification is unavailable.");setState(d.state);
   if(d.state==="settled"){
    try{const attempt=JSON.parse(sessionStorage.getItem("tethera_pending_checkout")||"null"),cart=useCartStore.getState();
     if(attempt?.orderId===orderId){if(JSON.stringify(cart.items)===JSON.stringify(attempt.payload.items)&&JSON.stringify(cart.customPCs)===JSON.stringify(attempt.payload.customPCs))cart.clearCart();sessionStorage.removeItem("tethera_pending_checkout");}
    }catch{/* Server payment state remains authoritative even if local storage is unavailable. */}
   }
  }catch(e){setState("unknown");setError(e instanceof Error?e.message:"Payment verification is unavailable.");}
 }
 useEffect(()=>{void check();},[orderId]);
 return <main className="mx-auto max-w-xl p-8 space-y-5"><h1 className="text-2xl font-bold">{t("Payment status")}</h1><p role="status">{state==="settled"?"Payment verified. Your order is confirmed.":state==="review"?"Payment needs review. Please contact support and do not pay again.":state==="cancelled"?"This payment is cancelled or expired. Review your order before starting again.":state==="checking"?"Checking payment…":"Payment has not been confirmed. You can safely check again."}</p>{error&&<p role="alert">{t(error)}</p>}<button className="rounded border px-4 py-2" disabled={state==="checking"} onClick={()=>void check()}>Check payment</button><p><Link href="/transactions">View orders</Link></p><p><Link href="/checkout">Return to checkout</Link></p></main>;
}
export default function PaymentPage(){return <Suspense fallback={<p>Loading payment status…</p>}><PaymentStatus/></Suspense>;}
