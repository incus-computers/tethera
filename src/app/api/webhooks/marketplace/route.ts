import { withApiProtection } from "@/lib/operations/apiProtection";
import { NextRequest,NextResponse } from "next/server";
import { isDemoMode } from "@/lib/runtime/environment";
import { MarketplaceSyncService } from "@/lib/integrations/marketplace";
 async function protectedPOST(req:NextRequest){
 // A real provider adapter/authentication and stock authority must be selected first.
 if(!isDemoMode())return NextResponse.json({success:false,error:"Marketplace connection is not enabled."},{status:503});
 if(req.headers.get("x-marketplace-token")!=="demo-webhook-only")return NextResponse.json({success:false},{status:401});
 try{const b=await req.json(),stock=b.available_stock??b.qty;
  if(!["ginee","jubelio"].includes(b.provider)||!["tokopedia","shopee","lazada"].includes(b.channel)||typeof b.eventId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(b.eventId)||typeof (b.sku??b.item_code)!=="string"||!Number.isSafeInteger(stock)||stock<0)throw new Error("Invalid event.");
  const job=await new MarketplaceSyncService().handleInboundMarketplaceWebhook({provider:b.provider,channel:b.channel,externalSku:b.sku??b.item_code,newStockOnHand:stock,timestamp:b.timestamp||"",eventId:b.eventId});
  return NextResponse.json({success:true,queued:true,jobId:job.id},{status:202});
 }catch{return NextResponse.json({success:false,error:"Invalid or conflicting marketplace event."},{status:400});}
}
export const POST = withApiProtection(protectedPOST);
