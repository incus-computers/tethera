import "server-only";
import { createHash } from "crypto";
import { db, BaseRepository, ProductVariantRow, Product, OrderItem } from "@/lib/db";
import { MOCK_COMPONENTS, SERVICE_TIERS } from "@/lib/data/mockHardware";
import { isDemoMode } from "@/lib/runtime/environment";
import { ShippableItem } from "@/lib/shipping/types";
import { CheckoutError } from "./errors";
import { catalogParcel } from "@/lib/shipping/packages";
import { normalizeIndonesianPhone } from "@/lib/i18n/indonesia";
import type { PolicyAcceptance } from "@/lib/storefront/types";

export const MAX_QUANTITY = 100;
export function integer(value: unknown, label: string, min = 0, max = 9_999_999_999): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new CheckoutError(`Invalid ${label}.`);
  return value;
}
export function money(value: unknown, label = "catalog price"): number {
  const n = typeof value === "string" && /^\d+(\.0+)?$/.test(value) ? Number(value) : value;
  return integer(n, label);
}
function text(value: unknown, label: string, max = 250): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new CheckoutError(`Invalid ${label}.`);
  return value.trim();
}
export const checkoutProducts = new BaseRepository<Product>("products");
export const checkoutVariants = new BaseRepository<ProductVariantRow>("product_variants");
export interface Selection { productId: string; variantId: string | null; quantity: number }
export interface CheckoutInput {
  customer: { name: string; email: string; phone: string; customerId: string };
  fulfillmentType: "delivery" | "click_and_collect";
  items: Selection[];
  builds: { name: string; parts: Record<string, Selection>; serviceId: string }[];
  address: Record<string, any> | null;
  rate: { courierId: string; serviceCode: string } | null;
  promoCode: string | null;
  notes: string;
  expectedTotal: number | null;
  policyAcceptance?: PolicyAcceptance;
}
function selection(item: any): Selection {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new CheckoutError("Invalid cart item.");
  const raw=item.item || item;
  const selected=item.variantId || item.variationId || item.variant_id || raw.variantId || raw.variationId;
  const variantId=selected?text(selected,"variant identifier",100):null;
  let productId=text(raw.parentProductId ?? item.product_id ?? raw.id,"product identifier",250);
  // Existing storefront variation tiles carry a composite display ID.
  if(variantId && productId.endsWith(`-var-${variantId}`)) productId=productId.slice(0,-(`-var-${variantId}`).length);
  return { productId:text(productId,"product identifier",100), variantId,
    quantity: integer(item.quantity === undefined ? 1 : item.quantity, "quantity", 1, MAX_QUANTITY) };
}
export function normalizeCheckout(body: any, ratesOnly=false): CheckoutInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new CheckoutError("Invalid checkout request.");
  const c = body.customer;
  if (!c?.name || !c?.email || !c?.phone) throw new CheckoutError("Customer name, phone, and email are required.");
  const email = text(c.email, "email").toLowerCase();
  let phone:string;
  try { phone=normalizeIndonesianPhone(c.phone); } catch(error) { throw new CheckoutError((error as Error).message); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[\d\s()-]{8,30}$/.test(phone)) throw new CheckoutError("Invalid email or phone.");
  if (!["delivery", "click_and_collect"].includes(body.fulfillmentType)) throw new CheckoutError("Invalid fulfillment type.");
  if ((body.items !== undefined && !Array.isArray(body.items)) || (body.customPCs !== undefined && !Array.isArray(body.customPCs))) throw new CheckoutError("Invalid basket.");
  const items = (body.items || []).map(selection);
  const builds = (body.customPCs || []).filter((pc: any) => !pc?.isPrebuilt).map((pc: any) => {
    if (!pc?.parts || typeof pc.parts !== "object" || Array.isArray(pc.parts) || Object.keys(pc.parts).length > 20) throw new CheckoutError("Invalid build parts.");
    const parts: Record<string, Selection> = Object.create(null);
    for (const key of Object.keys(pc.parts).sort()) if (pc.parts[key]) {
      if (!["cpu","cooler","motherboard","ram","gpu","storage_primary","storage_secondary","storage_tertiary","case","psu","os","mouse","keyboard","headphones","mousepad","other_peripherals"].includes(key)) throw new CheckoutError("Unknown build slot.");
      parts[key] = selection({ ...pc.parts[key], quantity: 1 });
    }
    const tier = SERVICE_TIERS.find(t => pc.serviceTier?.id ? t.id === pc.serviceTier.id : t.name === pc.serviceTier?.name);
    if (!tier) throw new CheckoutError("Unknown assembly service.");
    return { name: text(pc.name || "Custom PC", "build name", 100), parts, serviceId: tier.id };
  });
  for (const pc of (body.customPCs || []).filter((pc: any) => pc?.isPrebuilt)) items.push(selection({id:pc.catalogProductId,quantity:1}));
  if (!items.length && !builds.length) throw new CheckoutError("Your basket is empty.");
  if (items.length > 100 || builds.length > 10 || items.length + builds.reduce((n: number, b: any) => n + Object.keys(b.parts).length, 0) > 100) throw new CheckoutError("Basket is too large.");
  let address: Record<string, any> | null = null, rate: CheckoutInput["rate"] = null;
  if (body.fulfillmentType === "delivery") {
    const a = body.shippingAddress;
    if (!a || typeof a !== "object") throw new CheckoutError("Delivery address required.");
    if (a.country !== undefined && a.country !== "Indonesia" && a.country !== "ID") throw new CheckoutError("Delivery is available only within Indonesia.");
    address = {};
    for (const key of ["street", "subdistrict", "city", "province", "postalCode"]) address[key] = text(a[key], `delivery ${key}`);
    if (!/^\d{5}$/.test(address.postalCode)) throw new CheckoutError("Invalid Indonesian postal code.");
    for (const key of ["unit", "deliveryNotes"]) address[key] = a[key] ? text(a[key], key, 1000) : "";
    address.country = "Indonesia";
    // Rate and booking use this same saved destination, rather than a previous browser location.
    // Postal routing is saved and reused; stale area IDs/coordinates from browser location state are ignored.
    if(!ratesOnly)rate = { courierId: text(body.selectedRate?.courierId, "courier", 40), serviceCode: text(body.selectedRate?.serviceCode, "courier service", 80) };
  }
  let policy:PolicyAcceptance|undefined;
  if (body.policyAcceptance !== undefined) {
    const a=body.policyAcceptance;
    if(!a || a.accepted!==true || !["id","en"].includes(a.locale) || typeof a.version!=="string" || a.version.length>60 || typeof a.hash!=="string" || !/^[a-f0-9]{64}$/.test(a.hash)) throw new CheckoutError("Please read and accept the purchase terms and warranty policy.");
    policy={accepted:true,version:a.version,hash:a.hash,locale:a.locale};
  }
  return { customer: { name: text(c.name, "customer name", 120), email, phone, customerId: text(c.customerId, "verified owner", 150) }, fulfillmentType: body.fulfillmentType,
    items, builds, address, rate, promoCode: body.promoCode ? text(body.promoCode, "promotion code", 80).toUpperCase() : null,
    notes: body.notes ? text(body.notes, "notes", 2000) : "", expectedTotal: body.expectedTotal === undefined ? null : integer(body.expectedTotal, "expected total"), ...(policy?{policyAcceptance:policy}:{}) };
}
export function checkoutFingerprint(input: CheckoutInput) { return createHash("sha256").update(JSON.stringify(input)).digest("hex"); }
export function catalogSnapshot(p: Product) { return { id: p.id, is_active: p.is_active, retail_price: p.retail_price, sale_price: p.sale_price ?? null, specs: p.specs || {}, sku: p.sku, name: p.name, category_id: p.category_id ?? null, category_slug: p.category_slug ?? null, pc_builder_slot: p.pc_builder_slot ?? null }; }
export function variantSnapshot(v: ProductVariantRow) { return { id: v.id, product_id: v.product_id, is_active: v.is_active, price: v.price, sale_price: v.sale_price ?? null, sku: v.sku, name: v.name, weight_grams: v.weight_grams ?? null, shipping:v.shipping??null }; }

export async function priceBasket(input: Pick<CheckoutInput, "items" | "builds" | "address">) {
  const lines: Partial<OrderItem>[] = [], catalog = new Map<string, any>(), variants = new Map<string, any>();
  const stock = new Map<string, Selection>(), packages: ShippableItem[] = [], eligibleItems: any[] = [];
  let subtotal = 0, assemblyFee = 0;
  async function resolve(s: Selection, build?: string, slot?: string) {
    const p = await checkoutProducts.findById(s.productId);
    if (!p?.is_active) throw new CheckoutError("A selected product is unavailable.", 409);
    catalog.set(p.id, catalogSnapshot(p));
    let v: ProductVariantRow | null = null;
    if (s.variantId) {
      v = await checkoutVariants.findById(s.variantId);
      if (!v?.is_active || v.product_id !== p.id) throw new CheckoutError("The selected variant is unavailable for this product.", 409);
      variants.set(v.id, variantSnapshot(v));
    } else if (((p.variations || p.specs?.variations)?.length || 0) > 0 || (await checkoutVariants.findMany({product_id: p.id, is_active: true}, {limit:1})).length) throw new CheckoutError("Choose an available product variant.", 409);
    if (slot) {
      const expectedSlot = slot === "storage_secondary" || slot === "storage_tertiary" ? "storage_primary" : slot;
      if (!p.pc_builder_slot || (p.pc_builder_slot !== expectedSlot && p.pc_builder_slot !== slot)) throw new CheckoutError(`Invalid product for build slot ${slot}.`);
    }
    const unit = money(v ? v.sale_price ?? v.price : p.sale_price ?? p.retail_price);
    subtotal = integer(subtotal + unit * s.quantity, "basket total");
    const key = JSON.stringify([p.id, v?.id || null]);
    const existing = stock.get(key);
    stock.set(key, { ...s, quantity: integer((existing?.quantity || 0) + s.quantity, "combined quantity", 1, MAX_QUANTITY) });
    lines.push({ product_id: p.id, variant_id: v?.id || null, quantity: s.quantity, unit_price: unit, is_custom_build: !!build,
      product_title_snapshot: p.name, sku_snapshot: v?.sku || p.sku, variant_title_snapshot: v?.name || null,
      checkout_metadata: build ? { build, slot } : null } as any);
    eligibleItems.push({ lineIndex:lines.length-1, product_id: p.id, category_slug: p.category_slug, quantity: s.quantity, unit_price: unit,sku:v?.sku||p.sku });
    return { p, v, unit };
  }
  function parcel(p:Product,v:ProductVariantRow|null,unit:number,quantity:number,assembled=false):ShippableItem {
    try{return catalogParcel(p,v,unit,quantity,assembled);}catch{throw new CheckoutError("Shipping package information is incomplete. Configure this product/variant's packed measurements and handling.",409);}
  }
  for (const s of input.items) { const r = await resolve(s); if (input.address) packages.push(parcel(r.p, r.v, r.unit, s.quantity)); }
  for (const [index, build] of Array.from(input.builds.entries())) {
    const products: Record<string, Product> = {};
    for (const [slot, s] of Object.entries(build.parts)) { const r = await resolve(s, `build-${index + 1}`, slot); products[slot] = r.p; }
    for (const slot of ["cpu", "motherboard", "ram", "storage_primary", "case", "psu"]) if (!products[slot]) throw new CheckoutError(`Build requires ${slot}.`);
    const spec = (p: Product, key: string, camel: string) => p.specs[key] ?? p.specs[camel];
    if (!products.cpu.specs.socket || products.cpu.specs.socket !== products.motherboard.specs.socket) throw new CheckoutError("CPU and motherboard sockets must match.");
    const ram = spec(products.ram, "ram_type", "ramType"), boardRam = spec(products.motherboard, "ram_type", "ramType");
    if (!ram || !boardRam || ram !== boardRam) throw new CheckoutError("Memory and motherboard types must match.");
    const gpuLength = products.gpu && spec(products.gpu, "length_mm", "lengthMm"), clearance = spec(products.case, "max_gpu_length_mm", "maxGpuLengthMm");
    if (products.gpu && (!gpuLength || !clearance || gpuLength > clearance)) throw new CheckoutError("GPU clearance cannot be verified.");
    const power = Object.values(products).reduce((n, p) => n + Number(spec(p, "tdp_watts", "tdpWatts") || 0), 100);
    if (!Number.isFinite(power) || !products.psu.specs.wattage || products.psu.specs.wattage < Math.ceil(power * 1.3)) throw new CheckoutError("Power supply capacity is insufficient or missing.");
    const tier = SERVICE_TIERS.find(t => t.id === build.serviceId)!;
    assemblyFee += money(tier.price, "assembly fee");
    if (tier.price) lines.push({ quantity: 1, unit_price: tier.price, is_custom_build: true, product_title_snapshot: tier.name, sku_snapshot: tier.id, checkout_metadata: { build: `build-${index + 1}`, serviceId: tier.id } } as any);
    if (input.address) {
      const caseVariant=build.parts.case.variantId?await checkoutVariants.findById(build.parts.case.variantId):null;
      packages.push(parcel(products.case,caseVariant,lines.filter((l:any)=>l.product_id && l.checkout_metadata?.build===`build-${index+1}`).reduce((n,l)=>n+l.unit_price!*l.quantity!,0),1,true));
    }
  }
  integer(assemblyFee, "assembly total");
  for (const s of Array.from(stock.values())) {
    if (s.variantId) {
      const v = await checkoutVariants.findById(s.variantId);
      if (!v || v.stock_quantity - v.reserved_quantity < s.quantity) throw new CheckoutError("Insufficient variant stock.",409);
    } else {
      const inv = await db.inventory.getByProductAndStore(s.productId);
      if (!inv || inv.stock_on_hand - inv.stock_reserved < s.quantity) throw new CheckoutError("Insufficient product stock.",409);
    }
  }
  return { lines, catalog: Array.from(catalog.values()), variants: Array.from(variants.values()), stock: Array.from(stock.values()), packages, eligibleItems, subtotal, assemblyFee };
}
