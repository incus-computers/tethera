"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { HardwareSpecIcon, HardwarePartType } from "./HardwareSpecIcon";
import { PrebuiltSystem, PREBUILT_SYSTEMS } from "../../lib/data/mockHardware";
import { useCartStore } from "../../lib/store/useCartStore";
import { formatRupiah } from "../../lib/utils/currency";

export interface PrebuiltSystemCardProps {
  rig: PrebuiltSystem | (typeof PREBUILT_SYSTEMS)[0];
  isThirdCard?: boolean;
  isDesktopOnly?: boolean;
  onAddToCart?: (rig: PrebuiltSystem) => void;
}

export function PrebuiltSystemCard({
  rig,
  isThirdCard = false,
  isDesktopOnly = false,
  onAddToCart,
}: PrebuiltSystemCardProps): JSX.Element {
  const isHiddenBelowDesktop = isDesktopOnly || isThirdCard;
  const rawSale = (rig as any).sale_price;
  const hasDiscount = Boolean(rawSale && rawSale < rig.price);
  const activePrice = hasDiscount ? rawSale : rig.price;

  const primaryImage = rig.image || rig.images?.[0] || "";
  const secondaryImage =
    rig.images && rig.images[1] ? rig.images[1] : primaryImage;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onAddToCart) {
      onAddToCart(rig as PrebuiltSystem);
      return;
    }

    useCartStore.getState().addCustomPC({
      id: `pb-${rig.id}-${Date.now()}`,
      name: rig.name,
      parts: {
        cpu: { name: rig.cpu } as any,
        gpu: { name: rig.gpu } as any,
        motherboard: { name: rig.motherboard } as any,
        ram: { name: rig.ram } as any,
        storage_primary: { name: rig.storage } as any,
        cooler: { name: rig.cooling } as any,
        case: { name: rig.chassis } as any,
        psu: { name: rig.psu } as any,
        os: { name: rig.os } as any,
      },
      serviceTier: {
        name: "Standard 24h Burn-In Verification",
        price: 0,
        leadTime: "Ready in 60 Mins",
      },
      totalPrice: activePrice,
      originalPrice: hasDiscount ? rig.price : undefined,
      wattage: 750,
      isPrebuilt: true,
      image: primaryImage,
    });
    useCartStore.getState().openCart();
  };

  const specs: { part: HardwarePartType; value: string }[] = [
    { part: "cpu", value: rig.cpu },
    { part: "gpu", value: rig.gpu },
    { part: "motherboard", value: rig.motherboard },
    { part: "ram", value: rig.ram },
    { part: "storage", value: rig.storage },
    { part: "psu", value: rig.psu },
    { part: "tower", value: rig.chassis },
    { part: "cooling", value: rig.cooling },
  ];

  return React.createElement(
    "article",
    {
      className: `group flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden transition-shadow hover:shadow-lg dark:hover:shadow-zinc-900/50 ${
        isHiddenBelowDesktop ? "hidden lg:flex" : "flex"
      }`,
    },
    // 1. Full-sized uncropped PC tower showcase balanced in height with the spec sheet
    React.createElement(
      Link,
      {
        href: `/products/${rig.id}`,
        className:
          "w-full aspect-[4/3.2] max-h-64 sm:max-h-72 relative overflow-hidden bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200/80 dark:border-white/10 block group/frame",
      },
      React.createElement(Image, {
        src: primaryImage,
        alt: rig.name,
        fill: true,
        sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw",
        className:
          "object-contain p-2 sm:p-2.5 transition-opacity duration-500 group-hover:opacity-0",
      }),
      React.createElement(Image, {
        src: secondaryImage,
        alt: `${rig.name} alternate view`,
        fill: true,
        sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw",
        className:
          "object-contain p-2 sm:p-2.5 opacity-0 transition-opacity duration-500 group-hover:opacity-100",
      })
    ),
    // Card Body Container
    React.createElement(
      "div",
      { className: "p-4 sm:p-5 flex-1 flex flex-col justify-between" },
      // 2. Model Name centered directly below picture, larger than specs, zero SKU
      React.createElement(
        "div",
        { className: "text-center mb-3 sm:mb-4" },
        React.createElement(
          Link,
          {
            href: `/products/${rig.id}`,
            className:
              "inline-block text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors leading-snug",
          },
          rig.name
        )
      ),
      // 3. Invisible 8-spec checklist
      React.createElement(
        "div",
        { className: "space-y-2 sm:space-y-2.5 my-2 sm:my-3 flex-1" },
        specs.map((spec) =>
          React.createElement(
            "div",
            {
              key: spec.part,
              className:
                "flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-zinc-300 font-normal leading-normal",
            },
            React.createElement(HardwareSpecIcon, {
              part: spec.part,
              className:
                "w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5",
            }),
            React.createElement(
              "span",
              { className: "flex-1 break-words" },
              spec.value
            )
          )
        )
      ),
      // 4. Responsive footer
      React.createElement(
        "footer",
        {
          className:
            "pt-3 sm:pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 py-1 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:whitespace-nowrap lg:flex-nowrap",
        },
        React.createElement(
          "div",
          {
            className:
              "text-sm sm:text-base lg:text-lg font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap",
          },
          formatRupiah(activePrice)
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleAddToCart,
            className:
              "min-h-[44px] px-3 py-2 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
            "aria-label": `Add ${rig.name} to Cart`,
          },
          React.createElement(Plus, {
            className: "w-4 h-4 shrink-0",
            "aria-hidden": true,
          }),
          React.createElement("span", null, "Add to Cart")
        )
      )
    )
  );
}

export default PrebuiltSystemCard;
