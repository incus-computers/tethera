import { DynamicBannerSlide } from "../db/types";

export interface PromoSlide {
  id: string;
  type?: "content" | "image";
  title: string;
  ctaLink: string;
  imageUrl?: string;
  hideOverlay?: boolean;
  badge?: string;
  badgeType?: "hot" | "flagship" | "event" | "bundle" | "partner";
  tagColor?: string;
  highlight?: string;
  description?: string;
  perk?: string;
  ctaText?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  bgGradient?: string;
}

/**
 * Canonical 6 promotional banner slides for Tethera.
 * Used across the storefront carousel, database initial fallbacks,
 * and remote database seeding to prevent text-switching flashes.
 */
export const CANONICAL_PROMO_BANNERS: DynamicBannerSlide[] = [
  {
    id: "banner-1",
    type: "content",
    badge: "Limited Time Event",
    badge_type: "event",
    title: "Incus White Edition Build Festival",
    highlight: "Free 72-Hour Rig Stress Test & Cable Combs",
    description:
      "Design an all-white custom rig in our Configurator Studio this month. All white builds receive complimentary 72-hour burn-in calibration, custom white braided cables, and Windows 11 Pro setup.",
    cta_text: "Configure White Rig",
    cta_link: "/builder",
    secondary_cta_text: "Browse Pre-Builts",
    secondary_cta_link: "/prebuilts",
    perk: "Hemat hingga Rp 3.500.000 untuk sasis putih & komponen premium",
    bg_gradient: "from-slate-50 via-white to-slate-100",
    tag_color: "bg-[#37baf2] text-[#0A0B0E]",
    is_active: true,
    display_order: 1,
  },
  {
    id: "banner-2",
    type: "image",
    badge: "Official Brand Partner",
    badge_type: "partner",
    title: "ASUS ROG GeForce RTX 4080 SUPER Matrix",
    highlight: "Direct Factory Sealed Inventory • In Stock",
    description:
      "Flagship allocation from ASUS Indonesia. Integrated liquid cooling loop with 360mm radiator ready for 60-minute pickup or express dispatch.",
    cta_text: "Explore ROG Hardware",
    cta_link: "/components/gpu",
    image_url:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1400&auto=format&fit=crop&q=80",
    perk: "Full 3-Year Official Manufacturer Replacement Warranty",
    tag_color: "bg-red-600 text-white",
    is_active: true,
    display_order: 2,
  },
  {
    id: "banner-3",
    type: "content",
    badge: "Flagship In Stock",
    badge_type: "hot",
    title: "RTX 4070 Ti SUPER & 4080 SUPER Drop",
    highlight: "Ready for Pickup at Mangga Dua in 60 Minutes",
    description:
      "Direct factory-sealed stock from ASUS ROG, MSI, and Gigabyte. Reserve online with instant post-payment stock lock, or have your custom GPU setup assembled same-day.",
    cta_text: "Shop Graphics Cards",
    cta_link: "/components/gpu",
    secondary_cta_text: "View Stock",
    secondary_cta_link: "/components",
    perk: "Zero price gouging • Full 3-Year Official replacement warranty",
    bg_gradient: "from-emerald-50/40 via-white to-slate-50",
    tag_color: "bg-emerald-600 text-white",
    is_active: true,
    display_order: 3,
  },
  {
    id: "banner-4",
    type: "image",
    badge: "Supplier Spotlight",
    badge_type: "partner",
    title: "Corsair Dominator Titanium & iCUE LINK Ecosystem",
    highlight: "Smart Cable Architecture & High Frequency DDR5",
    description:
      "Eliminate cable clutter with magnetic daisy-chaining. Precision-tuned DDR5-6000MHz memory profiles certified for Tethera gaming rigs.",
    cta_text: "View Memory & Cooling",
    cta_link: "/components/ram",
    image_url:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1400&auto=format&fit=crop&q=80",
    perk: "Genuine Corsair Direct Factory Warranty",
    tag_color: "bg-amber-500 text-zinc-950",
    is_active: true,
    display_order: 4,
  },
  {
    id: "banner-5",
    type: "content",
    badge: "Bundle & Save",
    badge_type: "bundle",
    title: "AMD Ryzen 7800X3D + X670E / B650",
    highlight: "Diskon Langsung Rp 1.500.000 In-Cart",
    description:
      "Experience the pinnacle of gaming frame rates. Pair the Ryzen 7 7800X3D with any qualifying Socket AM5 motherboard and receive an instant Rp 1.500.000 price deduction at checkout.",
    cta_text: "View Processor Deals",
    cta_link: "/components/cpu",
    secondary_cta_text: "Matching Motherboards",
    secondary_cta_link: "/components/motherboards",
    perk: "Eligible for in-store pickup & express shipping",
    bg_gradient: "from-sky-50/40 via-white to-slate-50",
    tag_color: "bg-[#37baf2] text-[#0A0B0E]",
    is_active: true,
    display_order: 5,
  },
  {
    id: "banner-6",
    type: "content",
    badge: "Omnichannel Service",
    badge_type: "flagship",
    title: "60-Minute In-Store Click & Collect",
    highlight: "Order Online • Collect in Mangga Dua Mall",
    description:
      "Need parts right away? Order before 4:00 PM for 60-minute pickup from our Mangga Dua Mall Store (Lt. 3 No. 36). Secure 4-digit pickup PIN sent straight to your WhatsApp and Email upon payment.",
    cta_text: "Browse All Inventory",
    cta_link: "/components",
    secondary_cta_text: "Store Details",
    secondary_cta_link: "#",
    perk: "Free in-store counter pickup • Dedicated collection bay",
    bg_gradient: "from-sky-50/40 via-white to-slate-50",
    tag_color: "bg-sky-700 text-white",
    is_active: true,
    display_order: 6,
  },
];

/**
 * Maps database DynamicBannerSlide format to storefront PromoSlide format.
 */
export function mapBannerToPromoSlide(b: DynamicBannerSlide | any): PromoSlide {
  return {
    id: b.id,
    type: b.type || (b.image_url ? "image" : "content"),
    title: b.title,
    highlight: b.highlight,
    description: b.description,
    badge: b.badge,
    badgeType: b.badge_type || "event",
    ctaText: b.cta_text || "Explore Now",
    ctaLink: b.cta_link || "/components",
    secondaryCtaText: b.secondary_cta_text,
    secondaryCtaLink: b.secondary_cta_link,
    imageUrl: b.image_url,
    hideOverlay: b.hide_overlay,
    perk: b.perk,
    bgGradient: b.bg_gradient || "from-slate-50 via-white to-slate-100",
    tagColor: b.tag_color || "bg-zinc-900 text-white",
  };
}

export const CANONICAL_PROMO_SLIDES: PromoSlide[] = CANONICAL_PROMO_BANNERS.map(mapBannerToPromoSlide);

/**
 * Compares two PromoSlide arrays to determine if content has changed.
 * Prevents redundant React state updates and visual layout flashes when
 * freshly fetched API data is identical to current data.
 */
export function areSlidesEqual(a: PromoSlide[], b: PromoSlide[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const sA = a[i];
    const sB = b[i];
    if (
      sA.id !== sB.id ||
      sA.type !== sB.type ||
      sA.title !== sB.title ||
      sA.highlight !== sB.highlight ||
      sA.description !== sB.description ||
      sA.badge !== sB.badge ||
      sA.badgeType !== sB.badgeType ||
      sA.ctaText !== sB.ctaText ||
      sA.ctaLink !== sB.ctaLink ||
      sA.secondaryCtaText !== sB.secondaryCtaText ||
      sA.secondaryCtaLink !== sB.secondaryCtaLink ||
      sA.imageUrl !== sB.imageUrl ||
      sA.hideOverlay !== sB.hideOverlay ||
      sA.perk !== sB.perk ||
      sA.bgGradient !== sB.bgGradient ||
      sA.tagColor !== sB.tagColor
    ) {
      return false;
    }
  }
  return true;
}

