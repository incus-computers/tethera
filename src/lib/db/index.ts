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
export * from "./repositories/promotions.repository";
export * from "./repositories/banners.repository";
export * from "./repositories/cart.repository";
export * from "./repositories/auditLog.repository";
export * from "./repositories/adminAudit.repository";
export * from "./repositories/fulfillment.repository";
export * from "./repositories/rma.repository";
export * from "./repositories/inventoryLedger.repository";
export * from "./repositories/reviews.repository";
export * from "./repositories/wishlist.repository";

// Consolidated `db` Accessor Object
import { productsRepository } from "./repositories/products.repository";
import { categoriesRepository } from "./repositories/categories.repository";
import { storesRepository } from "./repositories/stores.repository";
import { inventoryRepository } from "./repositories/inventory.repository";
import { ordersRepository } from "./repositories/orders.repository";
import { customBuildsRepository } from "./repositories/customBuilds.repository";
import { customersRepository } from "./repositories/customers.repository";
import { promotionsRepository } from "./repositories/promotions.repository";
import { bannersRepository } from "./repositories/banners.repository";
import { cartRepository } from "./repositories/cart.repository";
import { auditLogRepository } from "./repositories/auditLog.repository";
import {
  adminUsersRepository,
  adminAuditLogsRepository,
} from "./repositories/adminAudit.repository";
import { fulfillmentsRepository } from "./repositories/fulfillment.repository";
import {
  rmaRepository,
  returnRequestsRepository,
  refundsRepository,
} from "./repositories/rma.repository";
import { inventoryLedgerRepository } from "./repositories/inventoryLedger.repository";
import { reviewsRepository } from "./repositories/reviews.repository";
import { wishlistRepository } from "./repositories/wishlist.repository";

export const db = {
  products: productsRepository,
  categories: categoriesRepository,
  stores: storesRepository,
  inventory: inventoryRepository,
  orders: ordersRepository,
  customBuilds: customBuildsRepository,
  customers: customersRepository,
  promotions: promotionsRepository,
  banners: bannersRepository,
  cart: cartRepository,
  auditLogs: auditLogRepository,
  adminUsers: adminUsersRepository,
  adminAudit: adminAuditLogsRepository,
  fulfillments: fulfillmentsRepository,
  rma: rmaRepository,
  returnRequests: returnRequestsRepository,
  refunds: refundsRepository,
  inventoryLedger: inventoryLedgerRepository,
  reviews: reviewsRepository,
  wishlist: wishlistRepository,
};

export default db;
