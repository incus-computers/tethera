import { withApiProtection } from "@/lib/operations/apiProtection";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { expireReservations } from "@/lib/inventory/lifecycle";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
 async function protectedPOST(req:NextRequest){
 const secret=process.env.INVENTORY_JOB_SECRET || "",provided=req.headers.get("authorization") || "";
 const expected="Bearer "+secret;
 if(secret.length<32)return NextResponse.json({success:false,error:"Inventory job is not configured."},{status:503});
 if(Buffer.byteLength(provided)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return NextResponse.json({success:false},{status:401});
 try {const results=await expireReservations();const success=Array.isArray(results)&&results.every((r:any)=>r.success);return NextResponse.json({success,results},{status:success?200:503});}
 catch(error){return databaseFailureResponse(error)||NextResponse.json({success:false},{status:503});}
}
export const POST = withApiProtection(protectedPOST);
