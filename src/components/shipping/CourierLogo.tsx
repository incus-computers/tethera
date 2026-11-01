import React from "react";
import { ShippingRateOption } from "../../lib/shipping/types";

export function isExpressRate(rate: ShippingRateOption): boolean {
  const code = (rate.serviceCode || "").toLowerCase();
  const courier = (rate.courierId || "").toLowerCase();
  const name = (rate.serviceName || "").toLowerCase();

  return (
    courier === "gojek" ||
    courier === "grab" ||
    code.includes("instant") ||
    code.includes("sameday") ||
    name.includes("instant") ||
    name.includes("same day") ||
    name.includes("sameday") ||
    code.includes("yes") ||
    code.includes("best") ||
    code.includes("nextday") ||
    code.includes("next-day") ||
    name.includes("yes") ||
    name.includes("best") ||
    name.includes("next day")
  );
}

export function CourierLogo({ courierId }: { courierId: string }) {
  const id = (courierId || "").toLowerCase();
  switch (id) {
    case "jne":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#003399] flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[11px] italic tracking-tight">
          JNE
        </div>
      );
    case "jnt":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#ED1C24] flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[11px] italic tracking-tight">
          J&amp;T
        </div>
      );
    case "sicepat":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#D31515] flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[8px] uppercase tracking-tighter">
          SICEPAT
        </div>
      );
    case "anteraja":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#E91E63] flex flex-col items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[8px] leading-tight lowercase">
          <span>anter</span>
          <span>aja</span>
        </div>
      );
    case "gojek":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#00AA13] flex items-center justify-center text-white shrink-0 select-none shadow-2xs" title="Gojek GoSend">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="12" cy="12" r="2.8" fill="currentColor" />
          </svg>
        </div>
      );
    case "grab":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#00B14F] flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-black text-[10px] tracking-tight">
          Grab
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-lg bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center text-white shrink-0 select-none shadow-2xs font-bold text-[10px]">
          EXP
        </div>
      );
  }
}

export const DEFAULT_STANDARD_PROVIDERS: ShippingRateOption[] = [
  {
    courierId: "jne",
    courierName: "JNE Express",
    courierBadge: "Official Carrier",
    brandColor: "#003399",
    brandBg: "bg-blue-50 text-blue-800 border-blue-200",
    serviceCode: "jne-reg",
    serviceName: "JNE REG (Reguler)",
    serviceDescription: "Standard nationwide courier service with pickup from warehouse.",
    vehicleType: "van",
    etd: "1 to 2 Days",
    distanceKm: 12.5,
    price: 11000,
    priceFormatted: "Rp 11.000",
    isAvailable: true,
  },
  {
    courierId: "jnt",
    courierName: "J&T Express",
    courierBadge: "Fast Freight",
    brandColor: "#ED1C24",
    brandBg: "bg-red-50 text-red-800 border-red-200",
    serviceCode: "jnt-ez",
    serviceName: "J&T EZ",
    serviceDescription: "Fast 365-day operation with automated shop pickup.",
    vehicleType: "van",
    etd: "1 to 2 Days",
    distanceKm: 12.5,
    price: 12000,
    priceFormatted: "Rp 12.000",
    isAvailable: true,
  },
  {
    courierId: "sicepat",
    courierName: "SiCepat Ekspres",
    courierBadge: "E-Commerce Choice",
    brandColor: "#D31515",
    brandBg: "bg-rose-50 text-rose-800 border-rose-200",
    serviceCode: "sicepat-reg",
    serviceName: "SiCepat REG (Reguler)",
    serviceDescription: "Standard courier service with real-time tracking.",
    vehicleType: "van",
    etd: "1 to 2 Days",
    distanceKm: 12.5,
    price: 10500,
    priceFormatted: "Rp 10.500",
    isAvailable: true,
  },
  {
    courierId: "anteraja",
    courierName: "AnterAja",
    courierBadge: "Tech Courier",
    brandColor: "#E91E63",
    brandBg: "bg-pink-50 text-pink-800 border-pink-200",
    serviceCode: "anteraja-reg",
    serviceName: "AnterAja Reguler",
    serviceDescription: "Reliable barcode scanning and automated courier assignment.",
    vehicleType: "van",
    etd: "1 to 3 Days",
    distanceKm: 12.5,
    price: 10000,
    priceFormatted: "Rp 10.000",
    isAvailable: true,
  },
];

export const DEFAULT_EXPRESS_PROVIDERS: ShippingRateOption[] = [
  {
    courierId: "gojek",
    courierName: "Gojek",
    courierBadge: "Instant Motorbike",
    brandColor: "#00AA13",
    brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    serviceCode: "gosend-instant",
    serviceName: "GoSend Instant",
    serviceDescription: "Fast point-to-point motorcycle courier dispatch.",
    vehicleType: "bike",
    etd: "1 to 2 Hours",
    distanceKm: 12.5,
    price: 20000,
    priceFormatted: "Rp 20.000",
    isAvailable: true,
  },
  {
    courierId: "grab",
    courierName: "GrabExpress",
    courierBadge: "Instant Delivery",
    brandColor: "#00B14F",
    brandBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    serviceCode: "grab-instant",
    serviceName: "GrabExpress Instant",
    serviceDescription: "Fast point-to-point motorcycle courier dispatch.",
    vehicleType: "bike",
    etd: "1 to 2 Hours",
    distanceKm: 12.5,
    price: 22000,
    priceFormatted: "Rp 22.000",
    isAvailable: true,
  },
  {
    courierId: "jne",
    courierName: "JNE Express",
    courierBadge: "Priority Delivery",
    brandColor: "#003399",
    brandBg: "bg-blue-50 text-blue-800 border-blue-200",
    serviceCode: "jne-yes",
    serviceName: "JNE YES (Yakin Esok Sampai)",
    serviceDescription: "Guaranteed next-day delivery nationwide.",
    vehicleType: "van",
    etd: "Tomorrow by 18:00",
    distanceKm: 12.5,
    price: 24000,
    priceFormatted: "Rp 24.000",
    isAvailable: true,
  },
  {
    courierId: "sicepat",
    courierName: "SiCepat Ekspres",
    courierBadge: "Next Day Express",
    brandColor: "#D31515",
    brandBg: "bg-rose-50 text-rose-800 border-rose-200",
    serviceCode: "sicepat-best",
    serviceName: "SiCepat BEST (Besok Sampai)",
    serviceDescription: "Express delivery arriving tomorrow guaranteed.",
    vehicleType: "van",
    etd: "1 Day (Tomorrow)",
    distanceKm: 12.5,
    price: 22000,
    priceFormatted: "Rp 22.000",
    isAvailable: true,
  },
];
