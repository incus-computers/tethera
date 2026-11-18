import { DatabaseError } from "../errors";
import { FLAGSHIP_STORE_ID } from "./stores.repository";
import { ProductVariantRow } from "../types";
import { connectedPage } from "../collectionPage";
import { pageInput, queryText } from "../pagination";
import "server-only";
import { isDemoMode } from "@/lib/runtime/environment";
import { BaseRepository, QueryOptions } from "./base.repository";
import {
  Product,
  PcBuilderSlot,
  ProductVariation,
  FacetedCatalogParams,
  FacetedCatalogResult,
  CatalogFacetAggregations,
} from "../types";
import { MOCK_COMPONENTS, PREBUILT_SYSTEMS } from "../../data/mockHardware";
import { inventoryRepository } from "./inventory.repository";

// Normalizes a product record so variations, images, categories, and slots are consistently linked
export function normalizeProduct(raw: any): Product {
  if (!raw) return raw;
  const mockMatch = isDemoMode() ? MOCK_COMPONENTS.find((m) => m.id === raw.id || m.sku === raw.sku) : undefined;

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
const INITIAL_PRODUCTS: Product[] = MOCK_COMPONENTS.map<Product>((item) => ({
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
})).concat(PREBUILT_SYSTEMS.map(p => ({ id:p.id,sku:p.sku,name:p.name,slug:p.id,brand:p.brand,category_slug:"pre-built-systems",retail_price:p.price,sale_price:p.sale_price ?? null,cost_price:null,images:p.images || [p.image],specs:{prebuilt:true},warranty_months:24,is_active:true,pc_builder_slot:null } as Product)));

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
    if (isDemoMode()) this.localFallbackStore.set(normalized.id, normalized);
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
    if (isDemoMode()) this.localFallbackStore.set(id, normalized);
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

    const data = await this.execute<Product[]>("findByCategory", client
      .from(this.tableName)
      .select("*, categories!inner(slug)")
      .eq("categories.slug", categorySlug));

    if (data && data.length > 0) return (data || []).map(normalizeProduct);
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

    const data = await this.execute<Product[]>("search", client
      .from(this.tableName)
      .select("*")
      .or(`name.ilike.%${term}%,brand.ilike.%${term}%,sku.ilike.%${term}%`)
      .limit(30));

    return (data || []).map(normalizeProduct);
  }

  /**
   * Faceted catalog query engine with multi-brand, price bounds, stock status, sorting and facet counts (CUST-01)
   */
  async getFacetedCatalog(params: FacetedCatalogParams = {}): Promise<FacetedCatalogResult> {
    const {page,limit}=pageInput(params.page,params.limit);
    params={...params,page,limit,search:queryText(params.search),categorySlug:queryText(params.categorySlug,80),pcBuilderSlot:queryText(params.pcBuilderSlot,40)};
    if(params.brands && (!Array.isArray(params.brands)||params.brands.length>20||params.brands.some(b=>typeof b!=="string"||b.length>80))) throw new DatabaseError("filter","catalog","INVALID_ARGUMENT");
    for(const price of [params.minPrice,params.maxPrice])if(price!==undefined&&(!Number.isSafeInteger(price)||price<0||price>1_000_000_000_000))throw new DatabaseError("price","catalog","INVALID_ARGUMENT");
    if(params.minPrice!==undefined&&params.maxPrice!==undefined&&params.minPrice>params.maxPrice)throw new DatabaseError("price","catalog","INVALID_ARGUMENT");
    if(params.sort && !["featured","price-asc","price-desc","newest","rating"].includes(params.sort))throw new DatabaseError("sort","catalog","INVALID_ARGUMENT");
    if(params.brands)params.brands=params.brands.map(b=>b.trim()).filter(Boolean);
    const connected=await connectedPage<Product>("catalog",params,page,limit);
    if(connected)return {products:connected.rows.map(normalizeProduct),pagination:connected.pagination,facets:connected.facets};
    const all = await this.findMany();
    const inventory = await inventoryRepository.findMany({store_id:FLAGSHIP_STORE_ID});
    const variants=await new BaseRepository<ProductVariantRow>("product_variants").findMany({is_active:true});
    const availability=(id:string)=>{
      const active=variants.filter(v=>v.product_id===id);
      if(active.length)return active.reduce((n,v)=>n+Math.max(0,v.stock_quantity-v.reserved_quantity),0);
      const inv=inventory.find(i=>i.product_id===id);return inv?Math.max(0,inv.stock_on_hand-inv.stock_reserved):0;
    };

    const cleanSearch = params.search ? params.search.toLowerCase().trim() : "";
    const cleanCategory = params.categorySlug ? params.categorySlug.toLowerCase().trim() : "";
    const selectedBrands = params.brands?.map((b) => b.toLowerCase().trim()).filter(Boolean) || [];

    // Filter pipeline
    const filtered = all.filter((prod) => {
      if (!prod.is_active) return false;
      // 1. Search term match
      if (cleanSearch) {
        const matchesName = prod.name.toLowerCase().includes(cleanSearch);
        const matchesBrand = prod.brand.toLowerCase().includes(cleanSearch);
        const matchesSku = prod.sku.toLowerCase().includes(cleanSearch);
        const matchesCat = prod.category_slug?.toLowerCase().includes(cleanSearch);
        if (!matchesName && !matchesBrand && !matchesSku && !matchesCat) {
          return false;
        }
      }

      // 2. Category slug match
      if (cleanCategory && cleanCategory !== "all") {
        const pCat = (prod.category_slug || "").toLowerCase();
        const pSlot = (prod.pc_builder_slot || "").toLowerCase();

        const exactMatch = pCat === cleanCategory;
        const containsMatch = pCat.includes(cleanCategory) || cleanCategory.includes(pCat);
        const slotMatch = pSlot === cleanCategory;
        const aliasMatch =
          (cleanCategory === "processors" && (pCat === "cpu" || pSlot === "cpu")) ||
          (cleanCategory === "cpu" && (pCat === "processors" || pCat.includes("processor"))) ||
          (cleanCategory === "graphics-cards" && (pCat === "gpu" || pSlot === "gpu")) ||
          (cleanCategory === "gpu" && (pCat === "graphics-cards" || pCat.includes("graphic"))) ||
          (cleanCategory === "motherboards" && (pCat === "motherboard" || pSlot === "motherboard")) ||
          (cleanCategory === "memory" && (pCat === "ram" || pSlot === "ram")) ||
          (cleanCategory === "chassis" && (pCat === "cases" || pSlot === "case"));

        if (!exactMatch && !containsMatch && !slotMatch && !aliasMatch) {
          return false;
        }
      }

      // 3. Multi-brand match
      if (selectedBrands.length > 0) {
        const prodBrand = prod.brand.toLowerCase();
        if (!selectedBrands.includes(prodBrand)) {
          return false;
        }
      }

      // 4. Effective price range
      const effectivePrice =
        prod.sale_price && prod.sale_price < prod.retail_price
          ? prod.sale_price
          : prod.retail_price;

      if (params.minPrice !== undefined && effectivePrice < params.minPrice) {
        return false;
      }
      if (params.maxPrice !== undefined && effectivePrice > params.maxPrice) {
        return false;
      }

      // 5. In-stock only
      if (params.inStockOnly) {
        const inStock = availability(prod.id)>0;
        if (!inStock) return false;
      }

      // 6. PC builder slot
      if (params.pcBuilderSlot) {
        if (prod.pc_builder_slot !== params.pcBuilderSlot) {
          return false;
        }
      }

      return true;
    });

    // Compute dynamic facet aggregations over the matched set
    const brandCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    let minPriceFound = Number.POSITIVE_INFINITY;
    let maxPriceFound = 0;
    let inStockCount = 0;

    for (const p of filtered) {
      // Brands
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;

      // Categories
      const cSlug = p.category_slug || "components";
      categoryCounts[cSlug] = (categoryCounts[cSlug] || 0) + 1;

      // Price range
      const pPrice = p.sale_price && p.sale_price < p.retail_price ? p.sale_price : p.retail_price;
      if (pPrice < minPriceFound) minPriceFound = pPrice;
      if (pPrice > maxPriceFound) maxPriceFound = pPrice;

      // In stock
      const isAvailable = availability(p.id)>0;
      if (isAvailable) inStockCount++;
    }

    const facets: CatalogFacetAggregations = {
      brands: Object.entries(brandCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      categories: Object.entries(categoryCounts)
        .map(([slug, count]) => ({ slug, name: slug, count }))
        .sort((a, b) => b.count - a.count),
      priceRange: {
        min: minPriceFound === Number.POSITIVE_INFINITY ? 0 : minPriceFound,
        max: maxPriceFound,
      },
      inStockCount,
      totalMatching: filtered.length,
    };

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      const priceA = a.sale_price && a.sale_price < a.retail_price ? a.sale_price : a.retail_price;
      const priceB = b.sale_price && b.sale_price < b.retail_price ? b.sale_price : b.retail_price;

      switch (params.sort) {
        case "price-asc":
          return priceA - priceB || a.id.localeCompare(b.id);
        case "price-desc":
          return priceB - priceA || a.id.localeCompare(b.id);
        case "newest":
          return (b.created_at || "").localeCompare(a.created_at || "") || a.id.localeCompare(b.id);
        default:
          return (b.created_at || "").localeCompare(a.created_at || "") || a.id.localeCompare(b.id);
      }
    });

    // Pagination
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedProducts = sorted.slice((page - 1) * limit, page * limit);

    return {
      products: paginatedProducts.map(p=>({...p,stockCount:availability(p.id),inStock:availability(p.id)>0})),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      facets,
    };
  }
}

export const productsRepository = new ProductsRepository();
