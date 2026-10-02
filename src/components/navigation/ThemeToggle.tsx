"use client";

import React, { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../lib/store/useThemeStore";

interface ThemeToggleProps {
  variant?: "header" | "mobile";
  className?: string;
}

export function ThemeToggle({ variant = "header", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme, initTheme, isMounted } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const isDark = isMounted && theme === "dark";

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full min-h-[44px] flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 transition-colors text-left tactile-btn ${className}`}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-2xs">
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
              Appearance
            </span>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400">
              {isDark ? "Dark theme active" : "Light theme active"}
            </span>
          </div>
        </div>

        {/* Tactile pill switch indicator */}
        <div className="flex items-center bg-slate-200 dark:bg-zinc-700 p-0.5 rounded-full w-12 h-6.5 transition-colors">
          <div
            className={`w-5 h-5 rounded-full bg-white dark:bg-zinc-950 shadow-xs flex items-center justify-center transform transition-transform duration-200 ease-in-out ${
              isDark ? "translate-x-5.5" : "translate-x-0.5"
            }`}
          >
            {isDark ? (
              <Sun className="w-3 h-3 text-amber-500" />
            ) : (
              <Moon className="w-3 h-3 text-slate-700" />
            )}
          </div>
        </div>
      </button>
    );
  }

  // Header compact variant (min 44px tap target for accessibility)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white bg-slate-100/90 dark:bg-zinc-800/80 hover:bg-slate-200/80 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700/80 transition-all shadow-2xs active:scale-95 tactile-btn ${className}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform duration-200 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}
