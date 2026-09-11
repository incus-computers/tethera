import { create } from "zustand";

export type AdminRole = "admin" | "superadmin";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: AdminRole;
  clearanceLevel: number;
}

interface AdminState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: string | null;

  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  initSession: () => void;
  clearError: () => void;
}

const STORAGE_KEY = "tethera_admin_clearance_session";

export const useAdminStore = create<AdminState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isSuperAdmin: false,
  isLoading: false,
  error: null,

  initSession: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data?.user && data?.token) {
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isSuperAdmin: data.user.role === "superadmin",
          });
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  login: async (identifier: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const err = data.error || "Administrative authentication failed.";
        set({ isLoading: false, error: err });
        return { success: false, error: err };
      }

      const user: AdminUser = data.user;
      const token: string = data.token;

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
      }

      set({
        user,
        token,
        isAuthenticated: true,
        isSuperAdmin: user.role === "superadmin",
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || "Network error while connecting to admin gateway.";
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
