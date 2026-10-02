import "./globals.css";
import type { Metadata } from "next";
import { PersistentHeader } from "../components/navigation/PersistentHeader";
import { FloatingWhatsAppWidget } from "../components/whatsapp/FloatingWhatsAppWidget";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Mail, ShieldCheck, Store, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Tethera | Custom PC Builder & High-Performance Hardware",
  description:
    "Precision custom desktop PCs, gaming rigs, and components. Real-time compatibility checking and in-store Click & Collect.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50 dark:bg-zinc-950 overflow-x-hidden" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var storedTheme = localStorage.getItem('tethera_theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 dark:selection:bg-zinc-100 selection:text-white dark:selection:text-zinc-900 overflow-x-hidden w-full max-w-full" suppressHydrationWarning>
        {/* Persistent 3-Tier Navigation Header */}
        <PersistentHeader />

        {/* Page Main Content */}
        <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>

        {/* Global Floating WhatsApp Tech Consultation Widget */}
        <FloatingWhatsAppWidget
          storePhone="6281234567890"
          storeName="Tethera Tech Support Desk"
        />

        {/* Footer (Dark Mode Responsive) */}
        <footer className="bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800/80 mt-16 w-full max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200 dark:border-zinc-800">
              {/* Brand Col */}
              <div className="space-y-3">
                <Link href="/" className="inline-block group py-0.5">
                  <Image
                    src="/tethera-long.png"
                    alt="Tethera"
                    width={160}
                    height={42}
                    className="h-8 sm:h-9 w-auto object-contain transition-all group-hover:opacity-80 tethera-logo dark:brightness-0 dark:invert"
                  />
                </Link>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Precision computer hardware, high-performance custom desktop workstations, and enthusiast gaming systems.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md w-fit border border-emerald-200 dark:border-emerald-800">
                  <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Click &amp; Collect Counter Active</span>
                </div>
              </div>

              {/* Omnichannel Flagship Store */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
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
                  <span>support@tethera.com</span>
                </p>
              </div>

              {/* Navigation Links */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                  Shop &amp; Tools
                </h4>
                <ul className="space-y-1.5">
                  <li><Link href="/builder" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Custom PC Builder</Link></li>
                  <li><Link href="/prebuilts" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Pre-Built Systems</Link></li>
                  <li><Link href="/components" className="hover:text-zinc-900 dark:hover:text-white transition-colors">PC Hardware &amp; Parts</Link></li>
                </ul>
              </div>

              {/* Omnichannel Policy */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                  Tethera Guarantees
                </h4>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2-Year Comprehensive Warranty</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    <span>In-Store 60-Min Click &amp; Collect</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>24-Hour Prime95 Stress Testing</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-3">
              <p>© {new Date().getFullYear()} Tethera Systems. All rights reserved.</p>
              <div className="flex gap-4 items-center">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
                <span>Warranty &amp; Returns</span>
                <span>•</span>
                <Link href="/admin" className="hover:text-slate-600 transition-colors">Admin Portal</Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
