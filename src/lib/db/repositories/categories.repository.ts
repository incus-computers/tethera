import "server-only";
import { BaseRepository } from "./base.repository";
import { Category, PcBuilderSlot } from "../types";
import { CATEGORY_SLUG_MAP } from "../../data/mockHardware";

const INITIAL_CATEGORIES: Category[] = Object.entries(CATEGORY_SLUG_MAP).map(
  ([slug, data], idx) => ({
    id: `cat-${slug}`,
    name: data.name,
    slug: slug,
    sort_order: idx + 1,
    pc_builder_slot: data.slot as PcBuilderSlot,
  })
);

export class CategoriesRepository extends BaseRepository<Category> {
  constructor() {
    super("categories", INITIAL_CATEGORIES);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.findOne({ slug });
  }

  async findBySlot(slot: PcBuilderSlot): Promise<Category | null> {
    return this.findOne({ pc_builder_slot: slot });
  }
}

export const categoriesRepository = new CategoriesRepository();
