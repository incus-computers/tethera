import { DemoEnvironmentBanner } from "@/components/navigation/DemoEnvironmentBanner";
import { StorefrontProvider } from "@/components/storefront/StorefrontProvider";
import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import { PersistentHeader } from "../components/navigation/PersistentHeader";
import { StorefrontFooter } from "../components/navigation/StorefrontFooter";
import { FloatingWhatsAppWidget } from "../components/whatsapp/FloatingWhatsAppWidget";
import { IncusLogo } from "../components/navigation/IncusLogo";
import Link from "next/link";
import { MapPin, Phone, Mail, ShieldCheck, Store, Clock } from "lucide-react";

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Incus Computers | High-Performance Computing & Custom PC Systems",
  description:
    "Precision-engineered custom desktop PCs, workstations, and high-performance hardware by Incus Computers. Real-time compatibility checking and in-store Click & Collect.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html
      lang="en"
      className={`h-full bg-slate-50 dark:bg-[#0A0B0E] ${inter.variable} ${jetbrainsMono.variable} font-sans`}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var storedTheme = null;
                try { storedTheme = localStorage.getItem('incus_theme') || localStorage.getItem('tethera_theme'); } catch(e) {}
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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
      <body
        className={`min-h-full flex flex-col bg-slate-50 dark:bg-[#0A0B0E] text-zinc-900 dark:text-white selection:bg-[#52E394] selection:text-[#0A0B0E] w-full max-w-full ${inter.className}`}
        suppressHydrationWarning
      >
        <StorefrontProvider>
        {/* Persistent Navigation Header */}
        <DemoEnvironmentBanner />
        <PersistentHeader />

        {/* Page Main Content */}
        <main className="flex-1 w-full max-w-full">{children}</main>

        {/* Global Floating WhatsApp Tech Consultation Widget */}
        <FloatingWhatsAppWidget />

        {/* Footer (Dark Mode Responsive) */}
        <StorefrontFooter />
        </StorefrontProvider>
      </body>
    </html>
  );
}
