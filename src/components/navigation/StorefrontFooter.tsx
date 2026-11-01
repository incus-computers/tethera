"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Phone, Mail, ShieldCheck, Store, Clock } from "lucide-react";
import { IncusLogo } from "./IncusLogo";

export function StorefrontFooter() {
  const pathname = usePathname();

  // Hide customer storefront footer when in administrative dashboard
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-white dark:bg-[#0A0B0E] border-t border-slate-200 dark:border-white/10 mt-16 w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200 dark:border-white/10">
          {/* Brand Col */}
          <div className="space-y-3">
            <Link href="/" className="inline-block group py-0.5">
              <IncusLogo className="h-8 sm:h-9 w-auto" />
            </Link>
            <p className="text-xs text-slate-500 dark:text-[#8B949E] leading-relaxed">
              Precision-engineered computer hardware, high-performance custom desktop workstations, and enthusiast systems.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0B0E] dark:text-[#52E394] bg-[#52E394]/15 px-2.5 py-1 rounded-md w-fit border border-[#52E394]/30">
              <Store className="w-3.5 h-3.5 text-[#52E394]" />
              <span>Click &amp; Collect Counter Active</span>
            </div>
          </div>

          {/* Omnichannel Flagship Store */}
          <div className="space-y-2 text-xs text-slate-600 dark:text-[#8B949E]">
            <h4 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
              Flagship Store &amp; Hub
            </h4>
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>Mangga Dua Mall Lt. 3 No. 36, Jl. Mangga Dua Raya, Jakarta Pusat 10730</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Direct: (021) 612-8836</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>support@incuscomputers.com</span>
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2 text-xs text-slate-600 dark:text-[#8B949E]">
            <h4 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
              Shop &amp; Tools
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/builder"
                  className="hover:text-[#37baf2] dark:hover:text-[#37baf2] transition-colors"
                >
                  Custom PC Builder
                </Link>
              </li>
              <li>
                <Link
                  href="/prebuilt-systems"
                  className="hover:text-[#37baf2] dark:hover:text-[#37baf2] transition-colors"
                >
                  Pre-Built Systems
                </Link>
              </li>
              <li>
                <Link
                  href="/components"
                  className="hover:text-[#37baf2] dark:hover:text-[#37baf2] transition-colors"
                >
                  PC Hardware &amp; Parts
                </Link>
              </li>
            </ul>
          </div>

          {/* Omnichannel Policy */}
          <div className="space-y-2 text-xs text-slate-600 dark:text-[#8B949E]">
            <h4 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
              Incus Guarantees
            </h4>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#52E394]" />
                <span>2-Year Comprehensive Warranty</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#52E394]" />
                <span>In-Store 60-Min Click &amp; Collect</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#52E394]" />
                <span>24-Hour Prime95 Stress Testing</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 dark:text-[#555D68] gap-3">
          <p>© {new Date().getFullYear()} Incus Computers. All rights reserved.</p>
          <div className="flex gap-4 items-center">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Warranty &amp; Returns</span>
            <span>•</span>
            <Link
              href="/admin"
              className="hover:text-[#37baf2] transition-colors"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
