"use client";

import React, { useState } from "react";

interface FloatingWhatsAppWidgetProps {
  storePhone?: string;
  storeName?: string;
}

export function FloatingWhatsAppWidget({
  storePhone = "6281234567890",
  storeName = "Flagship Store Tech Team"
}: FloatingWhatsAppWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Popover Card */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-5">
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
                className="text-white/80 hover:text-white text-lg font-bold p-1"
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
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span>💬 Open Direct WhatsApp Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-3 rounded-full shadow-lg hover:shadow-emerald-500/20 font-bold transition-all duration-300 active:scale-95"
        aria-label="Chat on WhatsApp"
      >
        <span className="text-2xl leading-none">💬</span>
        <span className="hidden sm:inline-block text-sm font-extrabold tracking-tight">Chat with Tech Support</span>
      </button>
    </div>
  );
}
