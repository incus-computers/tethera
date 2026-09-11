import "./globals.css";
import type { Metadata } from "next";
import { PersistentHeader } from "../components/navigation/PersistentHeader";
import { FloatingWhatsAppWidget } from "../components/whatsapp/FloatingWhatsAppWidget";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Mail, ShieldCheck, Zap, Store } from "lucide-react";

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
    <html lang="en" className="h-full bg-slate-50" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 text-zinc-900 selection:bg-zinc-900 selection:text-white" suppressHydrationWarning>
        {/* Persistent 3-Tier Navigation Header */}
        <PersistentHeader />

        {/* Page Main Content */}
        <main className="flex-1">{children}</main>

        {/* Global Floating WhatsApp Tech Consultation Widget */}
        <FloatingWhatsAppWidget
          storePhone="6281234567890"
          storeName="Tethera Tech Support Desk"
        />

        {/* Footer (Light Gray / White Aesthetic) */}
        <footer className="bg-white border-t border-slate-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200">
              {/* Brand Col */}
              <div className="space-y-3">
                <Link href="/" className="inline-block group py-0.5">
                  <Image
                    src="/tethera-long.png"
                    alt="Tethera"
                    width={160}
                    height={42}
                    className="h-8 sm:h-9 w-auto object-contain transition-opacity group-hover:opacity-80"
                  />
                </Link>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Precision computer hardware, high-performance custom desktop workstations, and enthusiast gaming systems.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit border border-emerald-200">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Click & Collect Counter Active</span>
                </div>
              </div>

              {/* Omnichannel Flagship Store */}
              <div className="space-y-2 text-xs text-slate-600">
                <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                  Flagship Store & Hub
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
              <div className="space-y-2 text-xs text-slate-600">
                <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                  Shop & Tools
                </h4>
                <ul className="space-y-1.5">
                  <li><Link href="/builder" className="hover:text-zinc-900">⚡ Custom PC Builder</Link></li>
                  <li><Link href="/#prebuilt" className="hover:text-zinc-900">Pre-Built Systems</Link></li>
                  <li><Link href="/#components" className="hover:text-zinc-900">PC Hardware & Parts</Link></li>
                  <li><Link href="/#deals" className="hover:text-zinc-900">Special Promotions</Link></li>
                </ul>
              </div>

              {/* Omnichannel Policy */}
              <div className="space-y-2 text-xs text-slate-600">
                <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                  Tethera Guarantees
                </h4>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2-Year Comprehensive Warranty</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    <span>In-Store 60-Min Click & Collect</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>24-Hour Prime95 Stress Testing</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-3">
              <p>© {new Date().getFullYear()} Tethera Systems. All rights reserved.</p>
              <div className="flex gap-4">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
                <span>Warranty & Returns</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
