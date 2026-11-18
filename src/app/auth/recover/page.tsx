"use client";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
import { useState } from "react";
import Link from "next/link";
export default function RecoverPassword() {
  const {t}=useTranslation();
 const [identifier,setIdentifier]=useState(""),[code,setCode]=useState(""),[password,setPassword]=useState("");
 const [sent,setSent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[demoCode,setDemoCode]=useState("");
 async function post(path:string,body:unknown) {
  const response=await fetch("/api/auth/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new Error(data.error);return data;
 }
 async function submit(event:React.FormEvent) {
  event.preventDefault();setBusy(true);setMessage("");
  try {
   if(!sent){const data=await post("send-otp",{identifier,purpose:"recovery"});setDemoCode(data.demoCode||"");setSent(true);setMessage("Enter the code sent to your verified contact.");}
   else {await post("verify-otp",{identifier,code});await post("reset-password",{password});setMessage("Password reset. Sign in with your new password.");setSent(false);setCode("");setPassword("");setDemoCode("");}
  }catch(error){setMessage(error instanceof Error?error.message:"Recovery failed.");}finally{setBusy(false);}
 }
 return <main className="mx-auto w-full max-w-md space-y-5 px-5 py-12">
  <h1 className="text-2xl font-bold">Reset your password</h1>
  <form onSubmit={submit} className="space-y-4">
   <label className="block">Email or Indonesian phone number<input required value={identifier} disabled={sent} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" className="mt-2 w-full rounded border p-3 text-zinc-950"/></label>
   {sent && <><label className="block">Verification code<input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} className="mt-2 w-full rounded border p-3 text-zinc-950"/></label>
   <label className="block">New password (12–128 characters)<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded border p-3 text-zinc-950"/></label></>}
   {demoCode && <p className="text-amber-700">Demo verification code: {demoCode}</p>}
   <button disabled={busy} className="rounded bg-emerald-500 px-5 py-3 font-semibold text-zinc-950">{busy?"Please wait...":sent?"Verify and reset password":t("Send verification code")}</button>
  </form>
  {message && <p role="status">{message}</p>}
  <Link href="/auth" className="block underline">{t("Back to sign in")}</Link>
 </main>;
}
