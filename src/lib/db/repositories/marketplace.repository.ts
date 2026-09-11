import "server-only";
import { BaseRepository } from "./base.repository";
import {
  MarketplaceIntegration,
  MarketplaceProductMapping,
  MarketplaceSyncLog,
  MarketplaceProvider,
} from "../types";

export class MarketplaceMappingsRepository extends BaseRepository<MarketplaceProductMapping> {
  constructor() {
    super("marketplace_product_mappings", []);
  }

  async findByExternalSku(
    provider: MarketplaceProvider,
    externalSku: string
  ): Promise<MarketplaceProductMapping | null> {
    return this.findOne({
      external_provider: provider,
      external_sku: externalSku,
    });
  }
}

export class MarketplaceSyncLogsRepository extends BaseRepository<MarketplaceSyncLog> {
  constructor() {
    super("marketplace_sync_logs", []);
  }
}

export class MarketplaceIntegrationsRepository extends BaseRepository<MarketplaceIntegration> {
  constructor() {
    super("marketplace_integrations", []);
  }
}

export const marketplaceMappingsRepository = new MarketplaceMappingsRepository();
export const marketplaceSyncLogsRepository = new MarketplaceSyncLogsRepository();
export const marketplaceIntegrationsRepository = new MarketplaceIntegrationsRepository();
