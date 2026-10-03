import { create } from "zustand";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  theme: ThemeMode;
  isMounted: boolean;
  initTheme: () => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  isMounted: false,

  initTheme: () => {
    if (typeof window === "undefined") return;
    if (get().isMounted) return;

    let stored: ThemeMode | null = null;
    try {
      stored = localStorage.getItem("tethera_theme") as ThemeMode | null;
    } catch {
      // storage unavailable or restricted (e.g. mobile private mode)
    }

    const isDocDark = document.documentElement.classList.contains("dark");
    let effectiveTheme: ThemeMode = "light";

    if (stored === "dark" || stored === "light") {
      effectiveTheme = stored;
    } else if (isDocDark || (typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      effectiveTheme = "dark";
    }

    if (effectiveTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    set({ theme: effectiveTheme, isMounted: true });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next: ThemeMode = current === "dark" ? "light" : "dark";
    get().setTheme(next);
  },

  setTheme: (newTheme: ThemeMode) => {
    if (typeof window !== "undefined") {
      // Apply DOM class immediately before any storage operations
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      try {
        localStorage.setItem("tethera_theme", newTheme);
      } catch {
        // ignore storage errors in restricted mobile environments
      }
    }
    set({ theme: newTheme });
  },
}));
