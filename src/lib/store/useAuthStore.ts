import { create } from "zustand";
import { CustomerProfile, RegistrationInput } from "../types/customer";
import { useLocationStore } from "./useLocationStore";

interface AuthState {
  user: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegistrationInput) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateProfile: (updates: Partial<CustomerProfile>) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  clearError: () => void;
  initSession: () => void;
}

const STORAGE_KEY = "tethera_customer_session";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initSession: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const user: CustomerProfile = JSON.parse(stored);
        set({ user, isAuthenticated: true });

        // Synchronize customer location with useLocationStore for instant shipping
        if (user.address) {
          const locStore = useLocationStore.getState();
          locStore.setLocation({
            address: `${user.address.street}, ${user.address.subdistrict}`,
            city: user.address.city,
            subdistrict: user.address.subdistrict,
            postalCode: user.address.postalCode,
            latitude: -6.2088, // Standard Jakarta coordinates
            longitude: 106.8456,
          });
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  login: async (email: string, password?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        set({ isLoading: false, error: data.error || "Login failed" });
        return { success: false, error: data.error || "Login failed" };
      }

      const user: CustomerProfile = data.user;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      }

      set({ user, isAuthenticated: true, isLoading: false, error: null });

      // Automatically sync customer's primary address to shipping delivery selector
      if (user.address) {
        useLocationStore.getState().setLocation({
          address: `${user.address.street}, ${user.address.subdistrict}`,
          city: user.address.city,
          subdistrict: user.address.subdistrict,
          postalCode: user.address.postalCode,
          latitude: -6.2088,
          longitude: 106.8456,
        });
      }

      return { success: true };
    } catch (err: any) {
      set({ isLoading: false, error: err.message || "Network error during sign in" });
      return { success: false, error: err.message };
    }
  },

  register: async (input: RegistrationInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        set({ isLoading: false, error: data.error || "Registration failed" });
        return { success: false, error: data.error || "Registration failed" };
      }

      const user: CustomerProfile = data.user;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      }

      set({ user, isAuthenticated: true, isLoading: false, error: null });

      // Automatically sync customer's newly registered address with shipping selector
      if (user.address) {
        useLocationStore.getState().setLocation({
          address: `${user.address.street}, ${user.address.subdistrict}`,
          city: user.address.city,
          subdistrict: user.address.subdistrict,
          postalCode: user.address.postalCode,
          latitude: -6.2088,
          longitude: 106.8456,
        });
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      set({ isLoading: false, error: err.message || "Network error during registration" });
      return { success: false, error: err.message };
    }
  },

  updateProfile: async (updates: Partial<CustomerProfile>) => {
    const current = get().user;
    if (!current) return { success: false, error: "Not authenticated" };

    set({ isLoading: true });
    try {
      const res = await fetch("/api/account/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, updates }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        set({ isLoading: false, error: data.error || "Update failed" });
        return { success: false, error: data.error };
      }

      const updated: CustomerProfile = data.user;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }

      set({ user: updated, isLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, error: err.message };
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
