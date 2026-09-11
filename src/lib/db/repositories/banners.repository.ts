import "server-only";
import { BaseRepository } from "./base.repository";
import { DynamicBannerSlide } from "../types";

const INITIAL_BANNERS: DynamicBannerSlide[] = [
  {
    id: "banner-1",
    type: "content",
    badge: "Limited Time Event",
    badge_type: "event",
    title: "Tethera White Edition Build Festival",
    highlight: "Free 72-Hour Rig Stress Test & Cable Combs",
    description:
      "Design an all-white custom rig in our Configurator Studio this month. All white builds receive complimentary 72-hour burn-in calibration, custom white braided cables, and Windows 11 Pro setup.",
    cta_text: "Configure White Rig",
    cta_link: "/builder",
    secondary_cta_text: "Browse Pre-Builts",
    secondary_cta_link: "/prebuilts",
    perk: "Hemat hingga Rp 3.500.000 untuk sasis putih & komponen premium",
    bg_gradient: "from-slate-50 via-white to-slate-100",
    tag_color: "bg-zinc-900 text-white",
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
    image_url: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1400&auto=format&fit=crop&q=80",
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
    perk: "Guaranteed Indonesian Official Distributor Unit (Synnex Metrodata / EMD)",
    bg_gradient: "from-emerald-950/20 via-zinc-900 to-black",
    tag_color: "bg-emerald-500 text-black",
    is_active: true,
    display_order: 3,
  },
];

export class BannersRepository extends BaseRepository<DynamicBannerSlide> {
  constructor() {
    super("promotional_banners", INITIAL_BANNERS);
  }

  async getActiveBanners(): Promise<DynamicBannerSlide[]> {
    return this.findMany(
      { is_active: true },
      { orderBy: "display_order", orderDirection: "asc" }
    );
  }
}

export const bannersRepository = new BannersRepository();
