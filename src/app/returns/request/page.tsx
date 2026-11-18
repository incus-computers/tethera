"use client";
import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/storefront/StorefrontProvider";
export default function ReturnRequestPage(){
  const {locale,formatDate}=useTranslation(),id=locale==="id";
  const [order,setOrder]=useState(""),[reason,setReason]=useState("defective"),[serial,setSerial]=useState(""),[notes,setNotes]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[requests,setRequests]=useState<any[]>([]),[submitted,setSubmitted]=useState(false);
  async function send(method:"GET"|"POST"){
    setBusy(true);setError("");setSubmitted(false);
    try{
      const number=order.trim();if(!number)throw new Error(id?"Masukkan nomor pesanan.":"Enter the order number.");
      const response=await fetch(method==="GET"?`/api/orders/rma?orderNumber=${encodeURIComponent(number)}`:"/api/orders/rma",method==="GET"?{cache:"no-store"}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber:number,reason,customerNotes:[serial?`Serial: ${serial}`:"",notes].filter(Boolean).join("\n")})});
      const data=await response.json();if(!response.ok)throw new Error(id?(response.status===404||response.status===401?"Pesanan tidak ditemukan untuk sesi ini. Masuk dengan akun pemilik pesanan atau gunakan perangkat saat memesan.":"Permintaan belum dapat diproses. Pastikan pesanan sudah dibayar dan coba lagi."):(data.error||"The request could not be processed."));
      setRequests(method==="POST"?[data.returnRequest]:data.returnRequests);setSubmitted(method==="POST");
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <article className="mx-auto max-w-2xl space-y-6 px-5 py-10">
    <h1 className="text-2xl font-bold">{id?"Garansi dan pengajuan pengembalian":"Warranty and return requests"}</h1>
    <p>{id?"Gunakan akun atau sesi tamu pemilik pesanan. Pengajuan memerlukan pesanan yang telah dibayar; keputusan dan pengembalian dana menunggu pemeriksaan.":"Use the order owner's account or guest session. Submission requires a paid order; decisions and refunds depend on assessment."}</p>
    <p><Link className="underline" href="/auth">{id?"Masuk ke akun":"Sign in"}</Link> · <Link className="underline" href="/warranty">{id?"Baca kebijakan garansi":"Read warranty policy"}</Link></p>
    <form className="space-y-4" onSubmit={e=>{e.preventDefault();void send("POST");}}>
      <label className="block">{id?"Nomor pesanan":"Order number"}<input required maxLength={100} value={order} onChange={e=>setOrder(e.target.value)} className="mt-1 block min-h-[44px] w-full rounded-lg border bg-transparent px-3"/></label>
      <label className="block">{id?"Alasan":"Reason"}<select value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 block min-h-[44px] w-full rounded-lg border bg-zinc-900 px-3 text-white"><option value="defective">{id?"Produk bermasalah":"Product fault"}</option><option value="wrong_item">{id?"Produk tidak sesuai pesanan":"Incorrect item"}</option><option value="damaged">{id?"Kerusakan yang perlu diperiksa":"Damage for assessment"}</option><option value="other">{id?"Lainnya":"Other"}</option></select></label>
      <label className="block">{id?"Nomor seri (bila tersedia)":"Serial number (if available)"}<input maxLength={120} value={serial} onChange={e=>setSerial(e.target.value)} className="mt-1 block min-h-[44px] w-full rounded-lg border bg-transparent px-3"/></label>
      <label className="block">{id?"Uraian masalah":"Describe the issue"}<textarea required minLength={5} maxLength={1800} value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 block min-h-[120px] w-full rounded-lg border bg-transparent p-3"/></label>
      <div className="flex flex-wrap gap-3"><button disabled={busy} className="min-h-[44px] rounded-lg bg-emerald-400 px-4 text-zinc-950" type="submit">{id?"Kirim pengajuan":"Submit request"}</button><button disabled={busy||!order.trim()} className="min-h-[44px] rounded-lg border px-4" type="button" onClick={()=>void send("GET")}>{id?"Periksa status":"Check status"}</button></div>
    </form>
    {error&&<p role="alert">{error}</p>}
    {submitted&&<p role="status">{id?"Pengajuan diterima untuk diperiksa. Ini belum merupakan persetujuan garansi atau pengembalian dana.":"Request received for assessment. This is not yet a warranty or refund approval."}</p>}
    <ul className="space-y-3">{requests.map(r=><li key={r.id} className="rounded-lg border p-4"><p className="font-semibold">{r.rma_number}</p><p>{id?"Status":"Status"}: {r.status}</p><p>{formatDate(r.requested_at)}</p></li>)}</ul>
  </article>;
}
