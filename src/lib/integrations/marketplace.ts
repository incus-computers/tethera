import "server-only";
import {randomUUID} from "node:crypto";
import { enqueue } from "@/lib/jobs/store";
import { BaseRepository } from "@/lib/db/repositories/base.repository";
export type MarketplaceProvider="ginee"|"jubelio";
export interface StockUpdatePayload {sku:string;availableStock:number;bufferStock?:number}
export interface InboundStockWebhook {provider:MarketplaceProvider;channel:"tokopedia"|"shopee"|"lazada";externalSku:string;newStockOnHand:number;timestamp:string;eventId?:string}
/** Provider choice and stock authority are pending; no relative stock writes are performed. */
export class MarketplaceSyncService {
 async pullStockFromGinee(_skus:string[]):Promise<Map<string,number>>{throw new Error("Live marketplace connection has not been selected.");}
 async pullStockFromJubelio(_skus:string[]):Promise<Map<string,number>>{throw new Error("Live marketplace connection has not been selected.");}
 async pushStockDeductionToMarketplace(provider:MarketplaceProvider,items:{sku:string;quantity:number}[]):Promise<boolean>{
  const mappings=await new BaseRepository<any>("marketplace_product_mappings").findMany({external_provider:provider});
  const selected=mappings.filter(m=>items.some(i=>i.sku===m.external_sku));if(!selected.length)return false;
  for(const mapping of selected)await enqueue("marketplace_sync",`manual-stock:${mapping.id}:${randomUUID()}`,{mappingId:mapping.id},`marketplace:${mapping.id}`);return true;
 }
 async handleInboundMarketplaceWebhook(webhook:InboundStockWebhook){
  if(!webhook.eventId)throw new Error("Durable provider event ID required.");
  return enqueue("marketplace_inbound",`marketplace-in:${webhook.provider}:${webhook.eventId}`,webhook,`marketplace-in:${webhook.provider}:${webhook.externalSku}`);
 }
}
