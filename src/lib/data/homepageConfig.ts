export interface HomepageModuleItem {
  id: "promotional_banners" | "brand_marquee" | "custom_pc_hero" | "prebuilt_systems" | "component_catalog";
  name: string;
  description: string;
  enabled: boolean;
}

export interface CustomPcHeroConfig {
  topBadge: string;
  badgeHighlight: string;
  title: string;
  subtitle: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  guarantee1: string;
  guarantee2: string;
  guarantee3: string;
  imageUrl: string;
  imageBadge: string;
  imageSubBadge: string;
  imageTitle: string;
  imageDescription: string;
}

export interface HomepageLayoutConfig {
  modules: HomepageModuleItem[];
  customPcHero: CustomPcHeroConfig;
}

export const DEFAULT_CUSTOM_PC_HERO: CustomPcHeroConfig = {
  topBadge: "Jakarta Flagship Store",
  badgeHighlight: "Same-Day Click & Collect",
  title: "Custom Desktop PCs.",
  subtitle: "Built & Benchmarked in Jakarta.",
  description:
    "Configure high-performance desktop computers with real-time socket matching, dynamic TDP calculation, and component clearance validation. Pick up at our Mangga Dua Flagship Store or have your build shipped in reinforced wooden crates with internal foam cushioning.",
  primaryCtaText: "Open PC Builder",
  primaryCtaLink: "/builder",
  secondaryCtaText: "Chat with Technician",
  secondaryCtaLink:
    "https://wa.me/6281234567890?text=Hi%20Tethera%20technician,%20I'd%20like%20guidance%20on%20building%20a%20custom%20PC.",
  guarantee1: "2-Yr Return-to-Base Warranty",
  guarantee2: "24h Prime95 Burn-In Test",
  guarantee3: "Flagship Counter Pickup",
  imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=900&auto=format&fit=crop&q=80",
  imageBadge: "Flagship Hub",
  imageSubBadge: "Click & Collect Ready",
  imageTitle: "Tethera Custom Architecture",
  imageDescription: "Individually stress-tested workstations & enthusiast gaming rigs",
};

export const DEFAULT_HOMEPAGE_MODULES: HomepageModuleItem[] = [
  {
    id: "brand_marquee",
    name: "Brand Partners Marquee",
    description: "Animated logo ticker of official manufacturer partners (Intel, AMD, ASUS, etc.)",
    enabled: true,
  },
  {
    id: "promotional_banners",
    name: "Hero Banner (Top Carousel Slider)",
    description: "High-impact promotional campaign slides and distributor drops (double height)",
    enabled: true,
  },
  {
    id: "custom_pc_hero",
    name: "Custom Desktop PCs Showcase Banner",
    description: "Main value proposition, configurator CTA, guarantees, and rig visual showcase",
    enabled: true,
  },
  {
    id: "prebuilt_systems",
    name: "Pre-Configured Performance Rigs",
    description: "Turnkey assembled rigs ready for 60-minute in-store Click & Collect pickup",
    enabled: true,
  },
  {
    id: "component_catalog",
    name: "Certified Hardware Component Catalog",
    description: "Individual processors, GPUs, motherboards, cooling, and memory with live stock",
    enabled: true,
  },
];
