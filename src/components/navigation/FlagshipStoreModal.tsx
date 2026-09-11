"use client";

import React from "react";
import { MapPin, Clock, Phone, MessageSquare, CheckCircle, Navigation, X } from "lucide-react";

interface FlagshipStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlagshipStoreModal({ isOpen, onClose }: FlagshipStoreModalProps) {
  if (!isOpen) return null;

  const hours = [
    { days: "Monday – Friday", time: "9:00 AM – 6:00 PM", status: "Open" },
    { days: "Saturday", time: "9:00 AM – 5:00 PM", status: "Open" },
    { days: "Sunday & Public Holidays", time: "10:00 AM – 3:00 PM", status: "Open" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with clean Tethera branding */}
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Tethera Flagship Experience Store</h2>
              <p className="text-xs text-slate-500">Retail Showroom, Tech Lab & Click-n-Collect Hub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-zinc-800 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Omnichannel Click & Collect Banner */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-900">In-Store Click & Collect Service</h4>
              <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                Order online and pick up at our dedicated collection counter. Component orders ready in <strong>60 minutes</strong>. Custom assembled PCs ready in <strong>2-3 days</strong> following 24h burn-in stress testing.
              </p>
            </div>
          </div>

          {/* Store Location & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Navigation className="w-3.5 h-3.5" />
                <span>Showroom Location</span>
              </div>
              <p className="text-sm font-medium text-zinc-800">
                Mangga Dua Mall Lt. 3 No. 36<br />
                Jl. Mangga Dua Raya, Sawah Besar<br />
                Jakarta Pusat 10730
              </p>
              <p className="text-xs text-slate-400 mt-2">Mall parking & escalators directly in front of store</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Phone className="w-3.5 h-3.5" />
                <span>Contact Desk</span>
              </div>
              <p className="text-sm font-medium text-zinc-800">
                Direct Desk: (021) 555-0199<br />
                WhatsApp: +62 812-3456-7890<br />
                Email: support@tethera.com
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-2">● Technicians on duty today</p>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Trading Hours</span>
            </div>
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-200 bg-white">
              {hours.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 px-4 text-xs">
                  <span className="font-medium text-zinc-800">{row.days}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">{row.time}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <a
            href="https://wa.me/6281234567890?text=Hi%20Tethera%20team,%20I'm%20asking%20about%20store%20hours%20and%20stock."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat via WhatsApp</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
