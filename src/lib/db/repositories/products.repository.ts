import "server-only";
import { BaseRepository, QueryOptions } from "./base.repository";
import { Product, PcBuilderSlot, ProductVariation } from "../types";
import { MOCK_COMPONENTS } from "../../data/mockHardware";

// Normalizes a product record so variations, images, categories, and slots are consistently linked
export function normalizeProduct(raw: any): Product {
  if (!raw) return raw;
  const mockMatch = MOCK_COMPONENTS.find((m) => m.id === raw.id || m.sku === raw.sku);

  let variations: ProductVariation[] = [];
  if (Array.isArray(raw.variations) && raw.variations.length > 0) {
    variations = raw.variations;
  } else if (raw.specs?.variations && Array.isArray(raw.specs.variations) && raw.specs.variations.length > 0) {
    variations = raw.specs.variations;
  } else if (mockMatch?.variations && Array.isArray(mockMatch.variations) && mockMatch.variations.length > 0) {
    variations = mockMatch.variations;
  }

  const category_slug =
    raw.category_slug ||
    (mockMatch?.category
      ? mockMatch.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : "components");

  const pc_builder_slot =
    raw.pc_builder_slot || (mockMatch?.slot ? (mockMatch.slot as PcBuilderSlot) : null);

  const images =
    Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images
      : raw.image
      ? [raw.image]
      : mockMatch?.image
      ? [mockMatch.image]
      : [];

  return {
    ...raw,
    images,
    category_slug,
    pc_builder_slot,
    variations,
  };
}

// Seed data from mock hardware for instant local functionality
const INITIAL_PRODUCTS: Product[] = MOCK_COMPONENTS.map((item) => ({
  id: item.id,
  sku: item.sku,
  name: item.name,
  slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  brand: item.brand,
  description: item.description || null,
  category_slug: item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  retail_price: item.price,
  sale_price: item.sale_price ?? item.salePrice ?? null,
  cost_price: Math.round(item.price * 0.8),
  images: item.images && item.images.length > 0 ? item.images : [item.image],
  specs: item.variations && item.variations.length > 0 ? { ...item.specs, variations: item.variations } : (item.specs || {}),
  warranty_months: 24,
  is_active: true,
  pc_builder_slot: item.slot as PcBuilderSlot,
  variations: item.variations ? [...item.variations] : [],
}));

export class ProductsRepository extends BaseRepository<Product> {
  constructor() {
    super("products", INITIAL_PRODUCTS);
  }

  override async findById(id: string): Promise<Product | null> {
    const raw = await super.findById(id);
    return raw ? normalizeProduct(raw) : null;
  }

  override async findOne(filter: Partial<Record<keyof Product, any>>): Promise<Product | null> {
    const raw = await super.findOne(filter);
    return raw ? normalizeProduct(raw) : null;
  }

  override async findMany(
    filter?: Partial<Record<keyof Product, any>>,
    options?: QueryOptions<Product>
  ): Promise<Product[]> {
    const list = await super.findMany(filter, options);
    return list.map(normalizeProduct);
  }

  override async create(data: Partial<Product>): Promise<Product> {
    const variations = data.variations || [];
    const specs = { ...(data.specs || {}) };
    if (variations.length > 0) {
      specs.variations = variations;
    }

    const payloadToDb: any = {
      ...data,
      specs,
    };
    // Supabase products table doesn't have a variations column; remove from DB payload
    delete payloadToDb.variations;

    const created = await super.create(payloadToDb);
    const normalized = normalizeProduct({ ...created, variations });
    this.localFallbackStore.set(normalized.id, normalized);
    return normalized;
  }

  override async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const variations = data.variations;
    const payloadToDb: any = { ...data };

    if (variations !== undefined) {
      // Fetch existing specs if needed to merge
      const current = await this.findById(id);
      const updatedSpecs = {
        ...(current?.specs || {}),
        ...(data.specs || {}),
        variations,
      };
      payloadToDb.specs = updatedSpecs;
      delete payloadToDb.variations;
    }

    const updated = await super.update(id, payloadToDb);
    if (!updated) return null;

    const normalized = normalizeProduct({
      ...updated,
      ...(variations !== undefined ? { variations } : {}),
    });
    this.localFallbackStore.set(id, normalized);
    return normalized;
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

    const { data } = await client
      .from(this.tableName)
      .select("*, categories!inner(slug)")
      .eq("categories.slug", categorySlug);

    if (data && data.length > 0) return (data as Product[]).map(normalizeProduct);
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

    return (data as Product[]).map(normalizeProduct);
  }
}

export const productsRepository = new ProductsRepository();
