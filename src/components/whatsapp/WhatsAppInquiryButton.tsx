"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import { useStorefront } from "../storefront/StorefrontProvider";
import { WhatsAppNotificationService, ProductInquiryParams, PCBuildInquiryParams } from "@/lib/notifications/whatsapp";

interface ProductInquiryButtonProps {
  mode: "product";
  product: ProductInquiryParams;
  className?: string;
  label?: string;
}

interface BuilderInquiryButtonProps {
  mode: "builder";
  build: PCBuildInquiryParams;
  className?: string;
  label?: string;
}

type WhatsAppInquiryButtonProps = ProductInquiryButtonProps | BuilderInquiryButtonProps;

export function WhatsAppInquiryButton(props: WhatsAppInquiryButtonProps) {
  const service = new WhatsAppNotificationService();
  const { profile } = useStorefront();
  const [status, setStatus] = React.useState("");

  const handleInquiry = () => {
    if (profile?.status === "demo") { setStatus("Demo: inquiry simulated. No message was sent."); return; }
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
      <><button
        onClick={handleInquiry}
        disabled={!profile}
        aria-busy={!profile}
        className={props.className || "flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition-all border border-emerald-500/50 shadow-md"}
      >
        <MessageSquare size={15} />
        <span>{props.label || "Consult Tech via WhatsApp (With This Build)"}</span>
      </button>{status && <p role="status" className="mt-2 text-xs leading-relaxed">{status}</p>}</>
    );
  }

  return (
    <><button
      onClick={handleInquiry}
      disabled={!profile}
      aria-busy={!profile}
      className={props.className || "flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-emerald-950/80 text-emerald-400 hover:text-emerald-300 font-semibold rounded-lg text-xs border border-emerald-800 transition-colors"}
    >
      <MessageSquare size={15} />
      <span>{props.label || "Inquire on WhatsApp"}</span>
    </button>{status && <p role="status" className="mt-2 text-xs leading-relaxed">{status}</p>}</>
  );
}
