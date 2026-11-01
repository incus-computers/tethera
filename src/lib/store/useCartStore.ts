"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ComponentItem } from "../data/mockHardware";

export interface CartCustomPC {
  id: string;
  name: string;
  parts: Record<string, Partial<ComponentItem> | ComponentItem>;
  serviceTier: {
    name: string;
    price: number;
    leadTime: string;
  };
  totalPrice: number;
  originalPrice?: number;
  wattage: number;
  isPrebuilt?: boolean;
  image?: string;
}

export interface CartStandardItem {
  id: string;
  item: ComponentItem;
  quantity: number;
  originalPrice?: number;
}

export const CART_STORAGE_KEY = "tethera_cart_storage";

export interface CartState {
  items: CartStandardItem[];
  customPCs: CartCustomPC[];
  fulfillmentMethod: "click_and_collect" | "delivery";
  isCartOpen: boolean;

  // Primary Helper Functions requested by user
  addItem: (item: ComponentItem, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  initCart: () => void;

  // Backwards-compatible methods
  addStandardItem: (item: ComponentItem, quantity?: number) => void;
  addCustomPC: (customPC: CartCustomPC) => void;
  removeStandardItem: (id: string) => void;
  removeCustomPC: (id: string) => void;
  clearCart: () => void;
  setFulfillmentMethod: (method: "click_and_collect" | "delivery") => void;
  openCart: () => void;
  closeCart: () => void;
  getSubtotal: () => number;
  getTotalItemsCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customPCs: [],
      fulfillmentMethod: "click_and_collect",
      isCartOpen: false,

      // Initialize / rehydrate cart from localStorage on client
      initCart: () => {
        if (typeof window === "undefined") return;
        try {
          useCartStore.persist.rehydrate();
        } catch {
          const raw = localStorage.getItem(CART_STORAGE_KEY);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const data = parsed.state || parsed;
              set({
                items: Array.isArray(data.items) ? data.items : [],
                customPCs: Array.isArray(data.customPCs) ? data.customPCs : [],
                fulfillmentMethod: data.fulfillmentMethod || "click_and_collect",
              });
            } catch {
              // ignore json parse error
            }
          }
        }
      },

      // Universal addItem helper (increments quantity if already in cart)
      addItem: (item: ComponentItem, quantity = 1) => {
        const qty = Math.max(1, quantity);

        // Normalize sale price and original regular price
        const rawSale = item.sale_price ?? item.salePrice;
        let activePrice = item.price;
        let origPrice = item.originalPrice ?? item.retail_price;

        if (!origPrice && rawSale && rawSale > 0 && rawSale < item.price) {
          origPrice = item.price;
          activePrice = rawSale;
        }

        const normalizedItem: ComponentItem = {
          ...item,
          price: activePrice,
          ...(origPrice && origPrice > activePrice ? { originalPrice: origPrice } : {}),
        };

        const resolvedOriginalPrice =
          origPrice && origPrice > activePrice ? origPrice : undefined;

        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.item.id === item.id || i.id === item.id
          );

          if (existingIndex > -1) {
            const nextItems = [...state.items];
            const existing = nextItems[existingIndex];
            const finalOriginalPrice =
              resolvedOriginalPrice ??
              existing.originalPrice ??
              (existing.item.originalPrice ?? undefined);

            nextItems[existingIndex] = {
              ...existing,
              item: {
                ...normalizedItem,
                originalPrice: finalOriginalPrice,
              },
              originalPrice: finalOriginalPrice,
              quantity: existing.quantity + qty,
            };
            return { items: nextItems, isCartOpen: true };
          }

          return {
            items: [
              ...state.items,
              {
                id: `cart-${Date.now()}-${item.id}`,
                item: normalizedItem,
                originalPrice: resolvedOriginalPrice,
                quantity: qty,
              },
            ],
            isCartOpen: true,
          };
        });
      },

      // Universal removeItem helper (removes from items or customPCs)
      removeItem: (id: string) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id && i.item.id !== id),
          customPCs: state.customPCs.filter((p) => p.id !== id),
        }));
      },

      // Universal updateQuantity helper (minimum quantity is 1; use removeItem to delete)
      updateQuantity: (id: string, quantity: number) => {
        const safeQty = Math.max(1, Math.floor(quantity));
        set((state) => ({
          items: state.items.map((i) => {
            if (i.id === id || i.item.id === id) {
              const maxStock =
                i.item.stockCount !== undefined && i.item.stockCount > 0 ? i.item.stockCount : 99;
              return { ...i, quantity: Math.min(maxStock, safeQty) };
            }
            return i;
          }),
        }));
      },

      // Backwards-compatible aliases
      addStandardItem: (item, quantity = 1) => {
        get().addItem(item, quantity);
      },

      removeStandardItem: (id) => {
        get().removeItem(id);
      },

      addCustomPC: (customPC) => {
        set((state) => ({
          customPCs: [...state.customPCs, customPC],
          isCartOpen: true,
        }));
      },

      removeCustomPC: (id) => {
        get().removeItem(id);
      },

      setFulfillmentMethod: (method) => set({ fulfillmentMethod: method }),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      clearCart: () => {
        set({ items: [], customPCs: [] });
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(CART_STORAGE_KEY);
          } catch {
            // ignore
          }
        }
      },

      getSubtotal: () => {
        const { items, customPCs } = get();
        const itemsTotal = items.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
        const pcsTotal = customPCs.reduce((acc, curr) => acc + curr.totalPrice, 0);
        return itemsTotal + pcsTotal;
      },

      getTotalItemsCount: () => {
        const { items, customPCs } = get();
        const itemsCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
        return itemsCount + customPCs.length;
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      skipHydration: true,
      partialize: (state) => ({
        items: state.items,
        customPCs: state.customPCs,
        fulfillmentMethod: state.fulfillmentMethod,
      }),
    }
  )
);

/**
 * Standalone cart helper functions for programmatic access and external consumption
 */
export const cartHelpers = {
  addItem: (item: ComponentItem, quantity = 1) => {
    useCartStore.getState().addItem(item, quantity);
  },
  removeItem: (id: string) => {
    useCartStore.getState().removeItem(id);
  },
  updateQuantity: (id: string, quantity: number) => {
    useCartStore.getState().updateQuantity(id, quantity);
  },
  clearCart: () => {
    useCartStore.getState().clearCart();
  },
  getCart: () => {
    const state = useCartStore.getState();
    return {
      items: state.items,
      customPCs: state.customPCs,
      subtotal: state.getSubtotal(),
      totalCount: state.getTotalItemsCount(),
      fulfillmentMethod: state.fulfillmentMethod,
    };
  },
  loadFromLocalStorage: () => {
    useCartStore.getState().initCart();
  },
  saveToLocalStorage: () => {
    if (typeof window === "undefined") return;
    const state = useCartStore.getState();
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          state: {
            items: state.items,
            customPCs: state.customPCs,
            fulfillmentMethod: state.fulfillmentMethod,
          },
          version: 0,
        })
      );
    } catch {
      // ignore
    }
  },
};

// Expose cart helpers to window for easy browser console interaction / debugging
if (typeof window !== "undefined") {
  (window as any).__tetheraCart = cartHelpers;
}
