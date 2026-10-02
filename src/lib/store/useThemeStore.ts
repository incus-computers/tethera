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
    try {
      const stored = localStorage.getItem("tethera_theme") as ThemeMode | null;
      let effectiveTheme: ThemeMode = "light";

      if (stored === "dark" || stored === "light") {
        effectiveTheme = stored;
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        effectiveTheme = "dark";
      }

      if (effectiveTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      set({ theme: effectiveTheme, isMounted: true });
    } catch {
      set({ isMounted: true });
    }
  },

  toggleTheme: () => {
    const current = get().theme;
    const next: ThemeMode = current === "dark" ? "light" : "dark";
    get().setTheme(next);
  },

  setTheme: (newTheme: ThemeMode) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tethera_theme", newTheme);
        if (newTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch {
        // ignore storage errors
      }
    }
    set({ theme: newTheme });
  },
}));
