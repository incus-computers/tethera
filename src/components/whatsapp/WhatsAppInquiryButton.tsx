"use client";

import React from "react";
import { WhatsAppNotificationService, ProductInquiryParams, PCBuildInquiryParams } from "@/lib/notifications/whatsapp";

interface ProductInquiryButtonProps {
  mode: "product";
  product: ProductInquiryParams;
  className?: string;
}

interface BuilderInquiryButtonProps {
  mode: "builder";
  build: PCBuildInquiryParams;
  className?: string;
}

type WhatsAppInquiryButtonProps = ProductInquiryButtonProps | BuilderInquiryButtonProps;

export function WhatsAppInquiryButton(props: WhatsAppInquiryButtonProps) {
  const service = new WhatsAppNotificationService();

  const handleInquiry = () => {
    let url = "";
    if (props.mode === "product") {
      url = service.generateProductInquiryUrl(props.product);
    } else {
      url = service.generateBuilderInquiryUrl(props.build);
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (props.mode === "builder") {
    return (
      <button
        onClick={handleInquiry}
        className={props.className || "flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition-all border border-emerald-500/50 shadow-md"}
      >
        <span className="text-lg">💬</span>
        <span>Consult Tech via WhatsApp (With This Build)</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleInquiry}
      className={props.className || "flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-emerald-950/80 text-emerald-400 hover:text-emerald-300 font-semibold rounded-lg text-xs border border-emerald-800 transition-colors"}
    >
      <span className="text-sm">💬</span>
      <span>Inquire on WhatsApp</span>
    </button>
  );
}
