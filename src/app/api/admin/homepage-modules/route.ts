import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_HOMEPAGE_MODULES,
  DEFAULT_CUSTOM_PC_HERO,
  HomepageModuleItem,
  CustomPcHeroConfig,
} from "@/lib/data/homepageConfig";

export const dynamic = "force-dynamic";

// Global singleton for server-side persistence across API calls
const globalForHomepage = globalThis as unknown as {
  homepageModules?: HomepageModuleItem[];
  customPcHeroConfig?: CustomPcHeroConfig;
};

if (!globalForHomepage.homepageModules) {
  globalForHomepage.homepageModules = [...DEFAULT_HOMEPAGE_MODULES];
}

if (!globalForHomepage.customPcHeroConfig) {
  globalForHomepage.customPcHeroConfig = { ...DEFAULT_CUSTOM_PC_HERO };
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      modules: globalForHomepage.homepageModules,
      customPcHero: globalForHomepage.customPcHeroConfig,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to retrieve homepage layout." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body.modules)) {
      globalForHomepage.homepageModules = body.modules;
    }

    if (body.customPcHero && typeof body.customPcHero === "object") {
      globalForHomepage.customPcHeroConfig = {
        ...globalForHomepage.customPcHeroConfig,
        ...body.customPcHero,
      };
    }

    return NextResponse.json({
      success: true,
      message: "Homepage layout and Custom PC banner updated successfully.",
      modules: globalForHomepage.homepageModules,
      customPcHero: globalForHomepage.customPcHeroConfig,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update homepage layout." },
      { status: 500 }
    );
  }
}
