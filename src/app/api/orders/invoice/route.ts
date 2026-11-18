import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest,NextResponse } from "next/server";
import { withAccess } from "@/lib/auth/routeGuard";
import { orderInvoiceDocument } from "@/lib/checkout/invoice";
export const dynamic="force-dynamic";
export const GET=withApiProtection(withAccess(async(req:NextRequest)=>NextResponse.json({success:true,document:await orderInvoiceDocument(req.nextUrl.searchParams.get("orderId")!)})));
