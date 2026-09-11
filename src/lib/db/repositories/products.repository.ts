import "server-only";
import { BaseRepository } from "./base.repository";
import { Product, PcBuilderSlot } from "../types";
import { MOCK_COMPONENTS } from "../../data/mockHardware";

// Seed data from mock hardware for instant local functionality
const INITIAL_PRODUCTS: Product[] = MOCK_COMPONENTS.map((item) => ({
  id: item.id,
  sku: item.sku,
  name: item.name,
  slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  brand: item.brand,
  description: `${item.brand} ${item.name} high performance PC hardware.`,
  category_slug: item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  retail_price: item.price,
  sale_price: null,
  cost_price: Math.round(item.price * 0.8),
  images: [item.image],
  specs: item.specs,
  warranty_months: 24,
  is_active: true,
  pc_builder_slot: item.slot as PcBuilderSlot,
}));

export class ProductsRepository extends BaseRepository<Product> {
  constructor() {
    super("products", INITIAL_PRODUCTS);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const direct = await this.findOne({ slug });
    if (direct) return direct;
    return this.findById(slug);
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.findOne({ sku });
  }

  async findByCategory(categorySlug: string): Promise<Product[]> {
    const client = this.getClient();
    if (!client) {
      const all = await this.findMany();
      return all.filter(
        (p) =>
          p.category_slug === categorySlug ||
          p.category_slug?.includes(categorySlug) ||
          p.pc_builder_slot === categorySlug
      );
    }

    // Attempt direct match or join with category
    const { data } = await client
      .from(this.tableName)
      .select("*, categories!inner(slug)")
      .eq("categories.slug", categorySlug);

    if (data && data.length > 0) return data as Product[];
    return this.findMany({ category_slug: categorySlug });
  }

  async findBySlot(slot: PcBuilderSlot): Promise<Product[]> {
    return this.findMany({ pc_builder_slot: slot });
  }

  async search(searchTerm: string): Promise<Product[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findMany({ is_active: true });

    const client = this.getClient();
    if (!client) {
      const all = await this.findMany();
      return all.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term)
      );
    }

    const { data, error } = await client
      .from(this.tableName)
      .select("*")
      .or(`name.ilike.%${term}%,brand.ilike.%${term}%,sku.ilike.%${term}%`)
      .limit(30);

    if (error || !data) {
      return (await this.findMany()).filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term)
      );
    }

    return data as Product[];
  }
}

export const productsRepository = new ProductsRepository();
