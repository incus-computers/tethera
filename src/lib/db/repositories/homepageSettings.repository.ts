import "server-only";
import { BaseRepository } from "./base.repository";
import { DEFAULT_HOMEPAGE_LAYOUT, HomepageLayoutConfig } from "@/lib/data/homepageConfig";
import { DatabaseError } from "../errors";

interface HomepageSettingsRow {
  id: string;
  modules: HomepageLayoutConfig["modules"];
  custom_pc_hero: HomepageLayoutConfig["customPcHero"];
  featured_prebuilt_ids: string[];
  updated_at?: string;
}
export class HomepageSettingsRepository extends BaseRepository<HomepageSettingsRow> {
  constructor() {
    super("storefront_settings", [{ id: "homepage", modules: DEFAULT_HOMEPAGE_LAYOUT.modules, custom_pc_hero: DEFAULT_HOMEPAGE_LAYOUT.customPcHero, featured_prebuilt_ids: DEFAULT_HOMEPAGE_LAYOUT.featuredPrebuiltIds }]);
  }
  async getLayout(): Promise<HomepageLayoutConfig> {
    const row = await this.findById("homepage");
    // A successful empty settings table means the documented initial layout.
    // Errors are thrown by the repository and never interpreted as "no settings".
    return row ? { modules: row.modules, customPcHero: row.custom_pc_hero, featuredPrebuiltIds: row.featured_prebuilt_ids } : structuredClone(DEFAULT_HOMEPAGE_LAYOUT);
  }
  async saveLayout(input: Partial<HomepageLayoutConfig>): Promise<HomepageLayoutConfig> {
    const current = await this.findById("homepage");
    const previous = current ? { modules: current.modules, customPcHero: current.custom_pc_hero, featuredPrebuiltIds: current.featured_prebuilt_ids } : structuredClone(DEFAULT_HOMEPAGE_LAYOUT);
    const layout = { ...previous, ...input, customPcHero: { ...previous.customPcHero, ...input.customPcHero } };
    const row: HomepageSettingsRow = { id: "homepage", modules: layout.modules, custom_pc_hero: layout.customPcHero, featured_prebuilt_ids: layout.featuredPrebuiltIds, updated_at: new Date().toISOString() };
    const saved = current ? await this.update("homepage", row) : await this.create(row);
    if (!saved) throw new DatabaseError("saveLayout", "storefront_settings");
    return { modules: saved.modules, customPcHero: saved.custom_pc_hero, featuredPrebuiltIds: saved.featured_prebuilt_ids };
  }
}
export const homepageSettingsRepository = new HomepageSettingsRepository();
