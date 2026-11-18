import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest,NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkoutVariants } from "@/lib/checkout/catalog";
import { withAccess } from "@/lib/auth/routeGuard";
import { requireAdminPermission } from "@/lib/auth/rbac";
import { packageProfile } from "@/lib/shipping/packages";
import { parcelRpc } from "@/lib/shipping/parcels";
import { ShippingError } from "@/lib/shipping/gateway";
import { isDemoMode } from "@/lib/runtime/environment";
import { demoTransaction } from "@/lib/inventory/demoTransaction";
import { databaseFailureResponse } from "@/lib/api/problemDetails";
function failure(error:unknown){return databaseFailureResponse(error)||NextResponse.json({success:false,error:error instanceof ShippingError?error.message:"Package profile is unavailable."},{status:error instanceof ShippingError?error.status:503});}
export const GET=withApiProtection(withAccess(async(req:NextRequest)=>{
 try{const product=await db.products.findById(req.nextUrl.searchParams.get("productId")||"");if(!product)throw new ShippingError("Product not found.",404);return NextResponse.json({success:true,shipping:product.specs?.shipping??null,assembledShipping:product.specs?.assembled_shipping??null,variants:await checkoutVariants.findMany({product_id:product.id})});}catch(e){return failure(e);}
}));
export const PUT=withApiProtection(withAccess(async(req:NextRequest)=>{
 try{
  const access=await requireAdminPermission(req,"products:write");if(!access.authorized)return NextResponse.json({success:false,error:access.error},{status:access.status||403});
  const body=await req.json(),kind=body.kind||"shipping";
  if(typeof body.productId!=="string"||!["shipping","assembled_shipping"].includes(kind))throw new ShippingError("Product and package kind required.",400);
  const validated=packageProfile(body.profile),profile={...validated,...(!body.variantId?{variants_share_package:body.variantsSharePackage===true}:{})};
  if(kind==="assembled_shipping"&&profile.handling!=="fragile")throw new ShippingError("Assembled PCs require fragile packing.",400);
  if(!isDemoMode())await parcelRpc("save_package_profile",{p_product_id:body.productId,p_variant_id:body.variantId||null,p_kind:kind,p_profile:profile,p_actor:access.user!.id});
  else await demoTransaction(async()=>{
   const product=await db.products.findById(body.productId);if(!product)throw new ShippingError("Product not found.",404);
   if(body.variantId){const variant=await checkoutVariants.findById(body.variantId);if(!variant||variant.product_id!==product.id||kind!=="shipping")throw new ShippingError("Canonical product variant required.",404);await checkoutVariants.update(variant.id,{shipping:profile,weight_grams:profile.weight_grams});}
   else await db.products.update(product.id,{specs:{...product.specs,[kind]:profile}});
   await db.auditLogs.log({actor_id:access.user!.id,actor_name:access.user!.name,role:access.user!.role,action:"PACKAGE_PROFILE_SAVED",entity_type:"product",entity_id:product.id,after_state:{kind,variantId:body.variantId||null,profile}});
  });
  return NextResponse.json({success:true,profile});
 }catch(e){return failure(e);}
}));
