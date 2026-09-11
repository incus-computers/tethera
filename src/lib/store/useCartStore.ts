"use client";

import { create } from "zustand";
import { ComponentItem } from "../data/mockHardware";

export interface CartCustomPC {
  id: string;
  name: string;
  parts: Record<string, ComponentItem>;
  serviceTier: {
    name: string;
    price: number;
    leadTime: string;
  };
  totalPrice: number;
  wattage: number;
}

export interface CartStandardItem {
  id: string;
  item: ComponentItem;
  quantity: number;
}

interface CartState {
  items: CartStandardItem[];
  customPCs: CartCustomPC[];
  fulfillmentMethod: "click_and_collect" | "delivery";
  isCartOpen: boolean;
  setFulfillmentMethod: (method: "click_and_collect" | "delivery") => void;
  openCart: () => void;
  closeCart: () => void;
  addStandardItem: (item: ComponentItem, quantity?: number) => void;
  addCustomPC: (customPC: CartCustomPC) => void;
  removeStandardItem: (id: string) => void;
  removeCustomPC: (id: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalItemsCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customPCs: [],
  fulfillmentMethod: "click_and_collect",
  isCartOpen: false,

  setFulfillmentMethod: (method) => set({ fulfillmentMethod: method }),
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),

  addStandardItem: (item, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.item.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.item.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
          ),
          isCartOpen: true,
        };
      }
      return {
        items: [...state.items, { id: `cart-${Date.now()}-${item.id}`, item, quantity }],
        isCartOpen: true,
      };
    });
  },

  addCustomPC: (customPC) => {
    set((state) => ({
      customPCs: [...state.customPCs, customPC],
      isCartOpen: true,
    }));
  },

  removeStandardItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  removeCustomPC: (id) =>
    set((state) => ({
      customPCs: state.customPCs.filter((p) => p.id !== id),
    })),

  clearCart: () => set({ items: [], customPCs: [] }),

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
}));
