"use client";

import React from "react";
import Link from "next/link";
import { PREBUILT_SYSTEMS } from "../../lib/data/mockHardware";
import { useCartStore } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";
import { WhatsAppInquiryButton } from "../../components/whatsapp/WhatsAppInquiryButton";
import { Zap, ShieldCheck, ChevronRight, Store, ArrowRight } from "lucide-react";

export default function PrebuiltsPage() {
  const { addCustomPC } = useCartStore();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-2">
            <Link href="/" className="hover:text-zinc-900 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-zinc-900 font-bold">Pre-Built Systems</span>
          </nav>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
            Turnkey Pre-Built Performance Systems
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Factory-calibrated gaming desktops and workstations. Every system undergoes 24 to 48 hours of Prime95 and thermal chamber stress tests before leaving our lab.
          </p>
        </div>

        <Link
          href="/builder"
          className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto shrink-0 uppercase tracking-tight"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Custom PC Builder</span>
        </Link>
      </div>

      {/* Grid of Prebuilt Rigs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PREBUILT_SYSTEMS.map((pb, idx) => (
          <div
            key={pb.id}
            style={{ animationDelay: `${idx * 70}ms` }}
            className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs tethera-card-hover flex flex-col justify-between group animate-pop-in"
          >
            <div>
              <Link href={`/products/${pb.id}`} className="relative h-56 bg-slate-100 overflow-hidden block">
                <img
                  src={pb.image}
                  alt={pb.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-zinc-900/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
                  24h Stress Tested
                </span>
              </Link>

              <div className="p-6 space-y-4">
                <div>
                  <span className="text-[11px] font-mono text-slate-400">{pb.sku}</span>
                  <Link href={`/products/${pb.id}`} className="block mt-0.5">
                    <h3 className="text-lg font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                      {pb.name}
                    </h3>
                  </Link>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Processor:</span>
                    <strong className="text-zinc-800">{pb.cpu}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Graphics:</span>
                    <strong className="text-zinc-800">{pb.gpu}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Memory:</span>
                    <strong className="text-zinc-800">{pb.ram}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Storage:</span>
                    <strong className="text-zinc-800">{pb.storage}</strong>
                  </div>
                </div>

                <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{pb.status}</span>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0">
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-zinc-900">{formatRupiah(pb.price)}</div>
                  <span className="text-[10px] text-slate-400 block -mt-1">Tax Included</span>
                </div>

                <div className="flex items-center gap-2">
                  <WhatsAppInquiryButton
                    mode="product"
                    product={{
                      productName: pb.name,
                      sku: pb.sku,
                      price: formatRupiah(pb.price),
                      productUrl: typeof window !== "undefined" ? window.location.href : "https://tethera.com",
                    }}
                  />
                  <Link
                    href={`/products/${pb.id}`}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs tactile-btn active:scale-95"
                  >
                    View Specs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
