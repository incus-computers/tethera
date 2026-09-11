import "server-only";

// Export Core Types & Client
export * from "./types";
export * from "./client";

// Export Repositories
export * from "./repositories/base.repository";
export * from "./repositories/products.repository";
export * from "./repositories/categories.repository";
export * from "./repositories/stores.repository";
export * from "./repositories/inventory.repository";
export * from "./repositories/orders.repository";
export * from "./repositories/customBuilds.repository";
export * from "./repositories/customers.repository";
export * from "./repositories/marketplace.repository";
export * from "./repositories/promotions.repository";
export * from "./repositories/banners.repository";

// Consolidated `db` Accessor Object
import { productsRepository } from "./repositories/products.repository";
import { categoriesRepository } from "./repositories/categories.repository";
import { storesRepository } from "./repositories/stores.repository";
import { inventoryRepository } from "./repositories/inventory.repository";
import { ordersRepository } from "./repositories/orders.repository";
import { customBuildsRepository } from "./repositories/customBuilds.repository";
import { customersRepository, crmCampaignsRepository } from "./repositories/customers.repository";
import { promotionsRepository } from "./repositories/promotions.repository";
import { bannersRepository } from "./repositories/banners.repository";
import {
  marketplaceMappingsRepository,
  marketplaceSyncLogsRepository,
  marketplaceIntegrationsRepository,
} from "./repositories/marketplace.repository";

export const db = {
  products: productsRepository,
  categories: categoriesRepository,
  stores: storesRepository,
  inventory: inventoryRepository,
  orders: ordersRepository,
  customBuilds: customBuildsRepository,
  customers: customersRepository,
  crmCampaigns: crmCampaignsRepository,
  promotions: promotionsRepository,
  banners: bannersRepository,
  marketplace: {
    mappings: marketplaceMappingsRepository,
    logs: marketplaceSyncLogsRepository,
    integrations: marketplaceIntegrationsRepository,
  },
};

export default db;
