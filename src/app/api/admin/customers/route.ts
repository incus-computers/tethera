import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crmService } from "@/lib/crm/crmService";
import { verifyAdminClearance } from "@/lib/auth/adminAuth";
import { CustomerProfileRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const clearance = verifyAdminClearance(req, "admin");
    if (!clearance.authorized) {
      return NextResponse.json({ success: false, error: clearance.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const segment = searchParams.get("segment") || undefined;
    const optInOnly = searchParams.get("optInOnly") === "true";

    // 1. Fetch from repository (Supabase if connected, otherwise local fallback)
    const dbCustomers = await db.customers.searchProfiles({ search, segment, optInOnly });

    // 2. Fetch from CRM service memory
    const crmCustomers = crmService.listCustomers({ search, segment: segment as any, optInOnly });

    // 3. Merge both collections by unique identifier (id and email)
    const customerMap = new Map<string, CustomerProfileRow>();

    dbCustomers.forEach((c) => {
      customerMap.set(c.id, c);
      if (c.email) customerMap.set(c.email.toLowerCase(), c);
    });

    crmCustomers.forEach((c) => {
      const existing = customerMap.get(c.id) || (c.email ? customerMap.get(c.email.toLowerCase()) : undefined);
      if (!existing) {
        const row: CustomerProfileRow = {
          id: c.id,
          email: c.email,
          full_name: c.fullName,
          phone: c.phone,
          address_line1: c.address.street,
          address_line2: c.address.unit || null,
          subdistrict: c.address.subdistrict,
          city: c.address.city,
          province: c.address.province,
          postal_code: c.address.postalCode,
          country: c.address.country,
          address_label: c.address.label,
          delivery_notes: c.address.deliveryNotes || null,
          marketing_opt_in: c.marketing.marketingOptIn,
          newsletter_frequency: c.marketing.newsletterFrequency,
          customer_segment: c.marketing.customerSegment,
          hardware_preference: c.marketing.hardwarePreference,
          crm_status: c.crm.status,
          lead_source: c.crm.leadSource,
          tags: c.crm.tags,
          total_orders: c.crm.totalOrders,
          total_spent: c.crm.totalSpent,
          created_at: c.crm.registeredAt,
        };
        customerMap.set(c.id, row);
      }
    });

    const uniqueCustomers = Array.from(new Set(customerMap.values()));

    // Filter if search/segment/optIn specified
    let filteredCustomers = uniqueCustomers;
    if (optInOnly) {
      filteredCustomers = filteredCustomers.filter((c) => c.marketing_opt_in);
    }
    if (segment && segment !== "all") {
      filteredCustomers = filteredCustomers.filter((c) => c.customer_segment === segment);
    }
    if (search) {
      const q = search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.city.toLowerCase().includes(q) ||
          (c.lead_source && c.lead_source.toLowerCase().includes(q))
      );
    }

    // Sort by registration date descending
    filteredCustomers.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    const totalLeads = uniqueCustomers.length;
    const optedInCount = uniqueCustomers.filter((c) => c.marketing_opt_in).length;
    const optInRate = totalLeads > 0 ? Math.round((optedInCount / totalLeads) * 100) : 0;
    const vipCount = uniqueCustomers.filter((c) => c.crm_status === "vip").length;
    const totalRevenueGenerated = uniqueCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0);

    const segmentBreakdown = {
      gamer: uniqueCustomers.filter((c) => c.customer_segment === "gamer").length,
      pc_builder: uniqueCustomers.filter((c) => c.customer_segment === "pc_builder").length,
      creator: uniqueCustomers.filter((c) => c.customer_segment === "creator").length,
      enterprise: uniqueCustomers.filter((c) => c.customer_segment === "enterprise").length,
      general: uniqueCustomers.filter((c) => c.customer_segment === "general").length,
    };

    return NextResponse.json({
      success: true,
      customers: filteredCustomers,
      stats: {
        totalLeads,
        optedInCount,
        optInRate,
        vipCount,
        totalRevenueGenerated,
        segmentBreakdown,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
