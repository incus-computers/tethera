"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PREBUILT_SYSTEMS } from "../../lib/data/mockHardware";
import { useCartStore } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";
import { WhatsAppInquiryButton } from "../../components/whatsapp/WhatsAppInquiryButton";
import { ShieldCheck, ChevronRight, Store, ArrowRight, Cpu, Plus } from "lucide-react";
import { Pagination } from "../../components/ui/Pagination";

export default function PrebuiltsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { addCustomPC, openCart } = useCartStore();

  const totalPrebuilts = PREBUILT_SYSTEMS.length;
  const paginatedPrebuilts = PREBUILT_SYSTEMS.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddToCart = (pb: (typeof PREBUILT_SYSTEMS)[0]) => {
    addCustomPC({
      id: `pb-${pb.id}-${Date.now()}`,
      name: pb.name,
      parts: {
        cpu: { name: pb.cpu } as any,
        gpu: { name: pb.gpu } as any,
        ram: { name: pb.ram } as any,
        storage_primary: { name: pb.storage } as any,
        cooler: { name: pb.cooling } as any,
        case: { name: pb.chassis } as any,
        psu: { name: pb.psu } as any,
        os: { name: pb.os } as any,
      },
      serviceTier: {
        name: "Standard 24h Burn-In Verification",
        price: 0,
        leadTime: "Ready in 60 Mins",
      },
      totalPrice: (pb as any).sale_price && (pb as any).sale_price < pb.price ? (pb as any).sale_price : pb.price,
      wattage: 750,
      isPrebuilt: true,
      image: pb.image,
    });
    openCart();
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-400 font-medium mb-2">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-zinc-900 dark:text-zinc-100 font-bold">Pre-Built Systems</span>
          </nav>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
            Turnkey Pre-Built Performance Systems
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Factory-calibrated gaming desktops and workstations. Every system undergoes 24 to 48 hours of Prime95 and thermal chamber stress tests before leaving our lab.
          </p>
        </div>

        <Link
          href="/builder"
          className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto shrink-0 uppercase tracking-tight"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Custom PC Builder</span>
        </Link>
      </div>

      {/* Grid of Prebuilt Rigs */}
      <div className="space-y-8" id="prebuilts-list">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          {paginatedPrebuilts.map((pb) => (
            <div
              key={pb.id}
              className="rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs tethera-card-hover flex flex-col justify-between group"
            >
              <div>
                <Link href={`/products/${pb.id}`} className="relative h-32 xs:h-40 sm:h-56 bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-200/50 dark:border-zinc-700/60 overflow-hidden block item-frame">
                  <Image
                    src={pb.image}
                    alt={pb.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-200 border border-transparent dark:border-zinc-700 text-[8px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider z-10">
                    Stress Tested
                  </span>
                </Link>

                <div className="p-3 sm:p-6 space-y-2.5 sm:space-y-4">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 dark:text-zinc-500 truncate block">{pb.sku}</span>
                    <Link href={`/products/${pb.id}`} className="block mt-0.5">
                      <h3 className="text-xs xs:text-sm sm:text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors line-clamp-2">
                        {pb.name}
                      </h3>
                    </Link>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-950/60 p-2.5 sm:p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-400">CPU:</span>
                      <strong className="text-zinc-800 dark:text-zinc-100 truncate ml-1">{pb.cpu}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-400">GPU:</span>
                      <strong className="text-zinc-800 dark:text-zinc-100 truncate ml-1">{pb.gpu}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-400">RAM:</span>
                      <strong className="text-zinc-800 dark:text-zinc-100 truncate ml-1">{pb.ram}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-400">Storage:</span>
                      <strong className="text-zinc-800 dark:text-zinc-100 truncate ml-1">{pb.storage}</strong>
                    </div>
                  </div>

                  <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1 sm:gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                    <span className="truncate">{pb.status}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-6 pt-0">
                <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col xs:flex-row xs:items-center justify-between gap-2 sm:gap-3">
                  <div>
                    {(pb as any).sale_price && (pb as any).sale_price < pb.price ? (
                      <div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <span className="text-sm sm:text-xl font-black text-zinc-900 dark:text-zinc-100">
                            {formatRupiah((pb as any).sale_price)}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 sm:px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60">
                            -{Math.round(((pb.price - (pb as any).sale_price) / pb.price) * 100)}%
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 line-through block">
                          {formatRupiah(pb.price)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm sm:text-xl font-black text-zinc-900 dark:text-zinc-100">{formatRupiah(pb.price)}</div>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500 block -mt-0.5">Tax Included</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <button
                      onClick={() => handleAddToCart(pb)}
                      className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-2xs flex items-center gap-1 sm:gap-1.5 tactile-btn active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                    <Link
                      href={`/products/${pb.id}`}
                      className="px-2 py-1.5 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-colors tactile-btn active:scale-95"
                    >
                      Specs
                    </Link>
                    <WhatsAppInquiryButton
                      mode="product"
                      product={{
                        productName: pb.name,
                        sku: pb.sku,
                        price: formatRupiah((pb as any).sale_price && (pb as any).sale_price < pb.price ? (pb as any).sale_price : pb.price),
                        productUrl: typeof window !== "undefined" ? window.location.href : "https://tethera.com",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prebuilts Pagination with 10, 20, 50 settings */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalPrebuilts}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          scrollToId="prebuilts-list"
          itemLabel="systems"
        />
      </div>
    </div>
  );
}
