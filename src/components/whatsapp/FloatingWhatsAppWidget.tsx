"use client";

import React, { useState } from "react";
import { useCartStore } from "../../lib/store/useCartStore";

interface FloatingWhatsAppWidgetProps {
  storePhone?: string;
  storeName?: string;
}

export function FloatingWhatsAppWidget({
  storePhone = "6281234567890",
  storeName = "Tethera Tech Support Desk"
}: FloatingWhatsAppWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isCartOpen = useCartStore((state) => state.isCartOpen);

  const quickOptions = [
    {
      title: "🖥️ Custom PC Builder Help",
      desc: "Get tech advice on your custom specs & cooling",
      msg: "Hi! I'm configuring a custom PC and would like technical advice on part compatibility."
    },
    {
      title: "📦 Click & Collect Pickup Check",
      desc: "Check if an item is ready for pickup today",
      msg: "Hi! I want to check if an item is available for immediate Click & Collect today."
    },
    {
      title: "💬 General Product Inquiry",
      desc: "Ask about warranty, brands, or availability",
      msg: "Hi! I have a question about a product on your website."
    }
  ];

  const handleOpenWhatsApp = (customText: string) => {
    const url = `https://wa.me/${storePhone}?text=${encodeURIComponent(customText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  // Completely hide when cart drawer is open to never obstruct Confirm & Checkout button
  if (isCartOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end print:hidden">
      {/* Popover Card */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                  💬
                </div>
                <div>
                  <div className="font-bold text-sm leading-tight">{storeName}</div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    <span>Online & Ready to Help</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick options list */}
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            <p className="text-xs text-slate-400 px-2 py-1">
              Select a topic to chat with our store tech experts:
            </p>
            {quickOptions.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleOpenWhatsApp(opt.msg)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 hover:border-emerald-500 transition-all flex flex-col gap-0.5 group"
              >
                <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {opt.title}
                </span>
                <span className="text-xs text-slate-400">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>

          {/* Footer Direct Message */}
          <div className="p-3 bg-slate-950 border-t border-slate-800">
            <button
              onClick={() => handleOpenWhatsApp("Hi, I would like to chat with customer support.")}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span>💬 Open Direct WhatsApp Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Compact Floating Trigger Button: Icon-only by default, expands on hover */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center h-12 w-12 hover:w-auto hover:px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg hover:shadow-emerald-500/30 font-bold transition-all duration-300 active:scale-95"
        aria-label="Chat with Tech Support"
        title="Chat with Tech Support"
      >
        {/* WhatsApp Icon */}
        <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
          <svg className="w-5 h-5 fill-current text-slate-950" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          {/* Active online pulse dot */}
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-900 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-900"></span>
          </span>
        </div>

        {/* Text label that ONLY appears on hover */}
        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 text-xs font-black tracking-tight transition-all duration-300 ease-in-out">
          Chat with Tech Support
        </span>
      </button>
    </div>
  );
}
