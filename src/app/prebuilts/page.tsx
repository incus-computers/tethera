"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PREBUILT_SYSTEMS } from "../../lib/data/mockHardware";
import { ChevronRight, Cpu } from "lucide-react";
import { Pagination } from "../../components/ui/Pagination";
import { PrebuiltSystemCard } from "../../components/products/PrebuiltSystemCard";

export default function PrebuiltsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const totalPrebuilts = PREBUILT_SYSTEMS.length;
  const paginatedPrebuilts = PREBUILT_SYSTEMS.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-slate-300 dark:border-white/40 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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
          className="min-h-[44px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-white border border-transparent dark:border-zinc-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto shrink-0 uppercase tracking-tight"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Custom PC Builder</span>
        </Link>
      </div>

      {/* Grid of Prebuilt Rigs */}
      <div className="space-y-8" id="prebuilts-list">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {paginatedPrebuilts.map((pb) => (
            <PrebuiltSystemCard
              key={pb.id}
              rig={pb}
            />
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
