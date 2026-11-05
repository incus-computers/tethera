import "server-only";
import { BaseRepository } from "./base.repository";
import { Cart, CartItemRow } from "../types";
import { productsRepository } from "./products.repository";
import { inventoryRepository } from "./inventory.repository";

export interface HydratedCartItem extends CartItemRow {
  product?: {
    id: string;
    name: string;
    sku: string;
    brand: string;
    images: string[];
    retailPrice: number;
    salePrice?: number | null;
    currentPrice: number;
    stockOnHand: number;
    stockAvailable: number;
  } | null;
  priceChanged?: boolean;
  previousPrice?: number;
  outOfStock?: boolean;
  quantityCapped?: boolean;
}

export interface HydratedCart {
  cart: Cart;
  items: HydratedCartItem[];
  subtotal: number;
  totalItemsCount: number;
  hasPriceChanges: boolean;
  hasStockAlerts: boolean;
}

export class CartRepository extends BaseRepository<Cart> {
  private itemsRepository: BaseRepository<CartItemRow>;

  constructor() {
    super("carts", []);
    this.itemsRepository = new BaseRepository<CartItemRow>("cart_items", []);
  }

  /**
   * Locates or initializes an active cart by user ID or anonymous session token
   */
  async getOrCreateCart(params: {
    userId?: string | null;
    anonymousToken?: string | null;
  }): Promise<Cart> {
    const { userId, anonymousToken } = params;

    // 1. Try finding active user cart
    if (userId) {
      const existingUserCart = await this.findOne({
        user_id: userId,
        status: "active",
      });
      if (existingUserCart) return existingUserCart;
    }

    // 2. Try finding active anonymous cart
    if (anonymousToken) {
      const existingGuestCart = await this.findOne({
        anonymous_session_token: anonymousToken,
        status: "active",
      });
      if (existingGuestCart) return existingGuestCart;
    }

    // 3. Create fresh cart
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return this.create({
      user_id: userId || null,
      anonymous_session_token: anonymousToken || null,
      status: "active",
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Retrieves a cart and hydrates items against live catalog prices and real-time inventory
   */
  async getCartWithItems(cartId: string): Promise<HydratedCart | null> {
    const cart = await this.findById(cartId);
    if (!cart) return null;

    const items = await this.itemsRepository.findMany({ cart_id: cartId });
    const hydratedItems: HydratedCartItem[] = [];

    let subtotal = 0;
    let totalItemsCount = 0;
    let hasPriceChanges = false;
    let hasStockAlerts = false;

    for (const item of items) {
      let productInfo: HydratedCartItem["product"] = null;
      let priceChanged = false;
      let previousPrice: number | undefined;
      let outOfStock = false;
      let quantityCapped = false;
      let effectivePrice = 0;

      if (item.product_id) {
        const prod = await productsRepository.findById(item.product_id);
        const inv = await inventoryRepository.getByProductAndStore(item.product_id);

        if (prod) {
          const livePrice = Number(prod.sale_price ?? prod.retail_price) || 0;
          const stockOnHand = inv?.stock_on_hand ?? 0;
          const stockReserved = inv?.stock_reserved ?? 0;
          const available = Math.max(0, stockOnHand - stockReserved);

          outOfStock = available <= 0;
          if (item.quantity > available && available > 0) {
            quantityCapped = true;
            hasStockAlerts = true;
          }
          if (outOfStock) {
            hasStockAlerts = true;
          }

          effectivePrice = livePrice;
          productInfo = {
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            brand: prod.brand,
            images: prod.images || [],
            retailPrice: prod.retail_price,
            salePrice: prod.sale_price,
            currentPrice: livePrice,
            stockOnHand,
            stockAvailable: available,
          };
        }
      }

      const activeQty = quantityCapped
        ? Math.min(item.quantity, productInfo?.stockAvailable || 1)
        : item.quantity;

      subtotal += effectivePrice * activeQty;
      totalItemsCount += activeQty;

      hydratedItems.push({
        ...item,
        quantity: activeQty,
        product: productInfo,
        priceChanged,
        previousPrice,
        outOfStock,
        quantityCapped,
      });
    }

    return {
      cart,
      items: hydratedItems,
      subtotal,
      totalItemsCount,
      hasPriceChanges,
      hasStockAlerts,
    };
  }

  /**
   * Adds an item to the cart or increments quantity if item already exists
   */
  async addItem(
    cartId: string,
    itemData: {
      productId?: string | null;
      variantId?: string | null;
      customBuildId?: string | null;
      quantity?: number;
    }
  ): Promise<CartItemRow> {
    const qty = Math.max(1, Number(itemData.quantity || 1));

    // Find existing item in cart
    const existingItems = await this.itemsRepository.findMany({ cart_id: cartId });
    const existing = existingItems.find((it) => {
      if (itemData.productId && it.product_id === itemData.productId) {
        if (itemData.variantId) return it.variant_id === itemData.variantId;
        return !it.variant_id;
      }
      if (itemData.customBuildId && it.custom_build_id === itemData.customBuildId) {
        return true;
      }
      return false;
    });

    if (existing) {
      const updated = await this.itemsRepository.update(existing.id, {
        quantity: existing.quantity + qty,
        updated_at: new Date().toISOString(),
      });
      await this.update(cartId, { updated_at: new Date().toISOString() });
      return updated!;
    }

    const created = await this.itemsRepository.create({
      cart_id: cartId,
      product_id: itemData.productId || null,
      variant_id: itemData.variantId || null,
      custom_build_id: itemData.customBuildId || null,
      quantity: qty,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await this.update(cartId, { updated_at: new Date().toISOString() });
    return created;
  }

  /**
   * Updates quantity of a specific cart item
   */
  async updateQuantity(
    cartId: string,
    cartItemId: string,
    quantity: number
  ): Promise<CartItemRow | null> {
    const safeQty = Math.floor(quantity);
    if (safeQty <= 0) {
      await this.removeItem(cartId, cartItemId);
      return null;
    }

    const updated = await this.itemsRepository.update(cartItemId, {
      quantity: safeQty,
      updated_at: new Date().toISOString(),
    });

    await this.update(cartId, { updated_at: new Date().toISOString() });
    return updated;
  }

  /**
   * Removes a single item from the cart
   */
  async removeItem(cartId: string, cartItemId: string): Promise<boolean> {
    const success = await this.itemsRepository.delete(cartItemId);
    await this.update(cartId, { updated_at: new Date().toISOString() });
    return success;
  }

  /**
   * Removes all items from a cart
   */
  async clearCart(cartId: string): Promise<boolean> {
    const items = await this.itemsRepository.findMany({ cart_id: cartId });
    for (const item of items) {
      await this.itemsRepository.delete(item.id);
    }
    await this.update(cartId, { updated_at: new Date().toISOString() });
    return true;
  }

  /**
   * Merges an anonymous guest cart into an authenticated user cart upon login/registration.
   * Sums quantities for matching SKUs, caps at available inventory, and invalidates guest cart.
   */
  async mergeCarts(
    anonymousToken: string,
    userId: string
  ): Promise<HydratedCart | null> {
    const guestCart = await this.findOne({
      anonymous_session_token: anonymousToken,
      status: "active",
    });

    const userCart = await this.getOrCreateCart({ userId });

    if (!guestCart || guestCart.id === userCart.id) {
      return this.getCartWithItems(userCart.id);
    }

    const guestItems = await this.itemsRepository.findMany({ cart_id: guestCart.id });

    for (const gItem of guestItems) {
      await this.addItem(userCart.id, {
        productId: gItem.product_id,
        variantId: gItem.variant_id,
        customBuildId: gItem.custom_build_id,
        quantity: gItem.quantity,
      });
      // Delete from guest cart
      await this.itemsRepository.delete(gItem.id);
    }

    // Invalidate anonymous cart
    await this.update(guestCart.id, {
      status: "merged",
      updated_at: new Date().toISOString(),
    });

    return this.getCartWithItems(userCart.id);
  }
}

export const cartRepository = new CartRepository();
