import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { MOCK_COMPONENTS, CATEGORY_SLUG_MAP } from "../src/lib/data/mockHardware";

function loadEnvFile() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

async function seedSupabase() {
  loadEnvFile();

  console.log("\n========================================================");
  console.log(" 🚀 SEEDING TETHERA CATALOG INTO SUPABASE CLOUD");
  console.log("========================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ ERROR: Missing Supabase credentials in .env.local.");
    console.log("👉 Please make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.\n");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const FLAGSHIP_STORE_ID = "00000000-0000-0000-0000-000000000001";

  // 1. Seed Flagship Store
  console.log("📍 Seeding Flagship Store...");
  const { error: storeError } = await supabase.from("stores").upsert({
    id: FLAGSHIP_STORE_ID,
    name: "Flagship Retail & Experience Center",
    slug: "flagship-store",
    address: "Mangga Dua Mall Lt. 3 No. 36",
    city: "Jakarta Pusat",
    province: "DKI Jakarta",
    postal_code: "10730",
    phone: "+62 21 555 0199",
    whatsapp: "+62 812 3456 7890",
    email: "flagship@tethera.com",
    latitude: -6.1352,
    longitude: 106.8294,
    is_active: true,
    is_click_and_collect: true,
    pickup_lead_time_minutes: 60,
  }, { onConflict: "slug" });

  if (storeError) {
    console.error("  ❌ Store seed error:", storeError.message);
  } else {
    console.log("  ✅ Flagship Store ready.");
  }

  // 2. Seed Categories
  console.log("\n📂 Seeding Hardware Categories...");
  const categoriesData = Object.entries(CATEGORY_SLUG_MAP).map(([slug, item], idx) => ({
    id: `cat-${slug}`,
    name: item.name,
    slug: slug,
    sort_order: idx + 1,
    pc_builder_slot: item.slot || null,
  }));

  const { error: catError } = await supabase
    .from("categories")
    .upsert(categoriesData, { onConflict: "slug" });

  if (catError) {
    console.error("  ❌ Categories seed error:", catError.message);
  } else {
    console.log(`  ✅ ${categoriesData.length} Categories seeded.`);
  }

  // 3. Seed Products (54 Hardware items)
  console.log("\n💻 Seeding Products Catalog...");
  const productsData = MOCK_COMPONENTS.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    brand: item.brand,
    description: item.description || `${item.brand} ${item.name} high performance PC hardware.`,
    category_slug: item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    retail_price: item.price,
    sale_price: item.sale_price || item.salePrice || null,
    cost_price: Math.round(item.price * 0.8),
    images: item.images && item.images.length > 0 ? item.images : [item.image],
    specs: item.specs || {},
    warranty_months: 24,
    is_active: true,
    pc_builder_slot: item.slot || null,
  }));

  const { error: prodError } = await supabase
    .from("products")
    .upsert(productsData, { onConflict: "sku" });

  if (prodError) {
    console.error("  ❌ Products seed error:", prodError.message);
  } else {
    console.log(`  ✅ ${productsData.length} Hardware products seeded into public.products.`);
  }

  // 4. Seed Inventory for each product
  console.log("\n📦 Seeding Store Inventory...");
  const inventoryData = MOCK_COMPONENTS.map((item) => ({
    id: `inv-${item.id}`,
    store_id: FLAGSHIP_STORE_ID,
    product_id: item.id,
    stock_on_hand: item.stockCount || 10,
    stock_reserved: 0,
    low_stock_threshold: 2,
    aisle_bin: "A-01",
  }));

  const { error: invError } = await supabase
    .from("store_inventory")
    .upsert(inventoryData, { onConflict: "store_id,product_id" });

  if (invError) {
    console.error("  ❌ Inventory seed error:", invError.message);
  } else {
    console.log(`  ✅ Inventory initialized for ${inventoryData.length} products.`);
  }

  // 5. Seed Promotional Banners
  console.log("\n🎨 Seeding Promotional Banners...");
  const bannersData = [
    {
      id: "banner-1",
      type: "content",
      badge: "Limited Time Event",
      badge_type: "event",
      title: "Tethera White Edition Build Festival",
      highlight: "Free 72-Hour Rig Stress Test & Cable Combs",
      description:
        "Design an all-white custom rig in our Configurator Studio this month. All white builds receive complimentary 72-hour burn-in calibration and Windows 11 Pro setup.",
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
        "Direct factory-sealed stock from ASUS ROG, MSI, and Gigabyte. Reserve online with instant post-payment stock lock.",
      cta_text: "Shop Graphics Cards",
      cta_link: "/components/gpu",
      secondary_cta_text: "View Stock",
      secondary_cta_link: "/components",
      perk: "Guaranteed Indonesian Official Distributor Unit",
      bg_gradient: "from-emerald-950/20 via-zinc-900 to-black",
      tag_color: "bg-emerald-500 text-black",
      is_active: true,
      display_order: 3,
    },
  ];

  const { error: banError } = await supabase
    .from("promotional_banners")
    .upsert(bannersData, { onConflict: "id" });

  if (banError) {
    console.error("  ❌ Banners seed error:", banError.message);
  } else {
    console.log(`  ✅ ${bannersData.length} Promotional banners seeded.`);
  }

  // 6. Seed Promotions
  console.log("\n🏷️ Seeding Promo Codes...");
  const promosData = [
    {
      id: "promo-fest2026",
      code: "WHITEFEST2026",
      title: "White Edition Build Festival",
      description: "Discount of Rp 500.000 for full custom rigs with all-white aesthetic chassis.",
      discount_type: "fixed_amount",
      discount_value: 500000,
      min_spend: 15000000,
      max_discount: 500000,
      is_active: true,
      usage_limit: 100,
    },
    {
      id: "promo-rtxsuper",
      code: "RTXSUPER10",
      title: "GeForce RTX 40-Super Deal",
      description: "10% off selected GeForce RTX 4070 Ti SUPER & 4080 SUPER standalone cards.",
      discount_type: "percentage",
      discount_value: 10,
      min_spend: 10000000,
      max_discount: 1500000,
      is_active: true,
      usage_limit: 250,
    },
    {
      id: "promo-clickcollect",
      code: "FLAGSHIPFREE",
      title: "Flagship Click & Collect Bonus",
      description: "Instant Rp 150.000 store voucher for picking up your custom rig at our Mangga Dua Flagship.",
      discount_type: "fixed_amount",
      discount_value: 150000,
      min_spend: 5000000,
      is_active: true,
      usage_limit: 500,
    },
  ];

  const { error: promoError } = await supabase
    .from("promotions")
    .upsert(promosData, { onConflict: "code" });

  if (promoError) {
    console.error("  ❌ Promotions seed error:", promoError.message);
  } else {
    console.log(`  ✅ ${promosData.length} Promo codes seeded.`);
  }

  console.log("\n========================================================");
  console.log(" ✨ DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log(" Your cloud Supabase database is fully loaded with Tethera data.");
  console.log("========================================================\n");
}

seedSupabase().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
