import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

async function testSupabase() {
  loadEnvFile();

  console.log("\n========================================================");
  console.log(" 🔍 TETHERA SUPABASE CONNECTION HEALTH CHECK");
  console.log("========================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    console.error("❌ ERROR: NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");
    console.log("👉 Add NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co to your .env.local file.\n");
    process.exit(1);
  }

  console.log(`🌐 Supabase URL: ${url}`);
  console.log(`🔑 Service Role Key: ${serviceKey ? "✅ Present (Server-Side Admin)" : "⚠️ Missing"}`);
  console.log(`🔑 Anon Public Key:  ${anonKey ? "✅ Present (Client-Side)" : "⚠️ Missing"}`);

  const activeKey = serviceKey || anonKey;
  if (!activeKey) {
    console.error("\n❌ ERROR: Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY found.");
    console.log("👉 Copy your keys from Supabase Dashboard -> Project Settings -> API.\n");
    process.exit(1);
  }

  const supabase = createClient(url, activeKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tablesToCheck = [
    "stores",
    "categories",
    "products",
    "store_inventory",
    "orders",
    "order_items",
    "promotions",
    "promotional_banners",
    "customer_profiles",
    "custom_builds",
  ];

  console.log("\n📊 Testing table accessibility and row counts in Supabase cloud:\n");

  let allOk = true;

  for (const table of tablesToCheck) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });

    if (error) {
      allOk = false;
      console.log(`  ❌ public.${table.padEnd(22)}: Error (${error.message})`);
    } else {
      console.log(`  ✅ public.${table.padEnd(22)}: Ready (${count ?? 0} rows)`);
    }
  }

  console.log("\n--------------------------------------------------------");
  if (allOk) {
    console.log(" 🎉 ALL DATABASE TABLES CONNECTED & READY IN CLOUD SUPABASE!");
    console.log(" Tethera is reading & writing to remote cloud database.");
  } else {
    console.log(" ⚠️  Some tables were not found or not accessible.");
    console.log(" 👉 Run the 'supabase/schema.sql' script in your Supabase SQL Editor.");
  }
  console.log("========================================================\n");
}

testSupabase().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
