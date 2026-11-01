import "server-only";
import { BaseRepository } from "./base.repository";
import { DynamicBannerSlide } from "../types";
import { CANONICAL_PROMO_BANNERS } from "../../data/promotionalBannersData";

export class BannersRepository extends BaseRepository<DynamicBannerSlide> {
  constructor() {
    super("promotional_banners", CANONICAL_PROMO_BANNERS);
  }

  async getActiveBanners(): Promise<DynamicBannerSlide[]> {
    return this.findMany(
      { is_active: true },
      { orderBy: "display_order", orderDirection: "asc" }
    );
  }
}

export const bannersRepository = new BannersRepository();
