"use client";

import React, { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../lib/store/useThemeStore";

interface ThemeToggleProps {
  variant?: "header" | "mobile";
  className?: string;
  isCompact?: boolean;
}

export function ThemeToggle({ variant = "header", className = "", isCompact = false }: ThemeToggleProps) {
  const { theme, setTheme, initTheme, isMounted } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const isDark = isMounted && theme === "dark";

  const renderSegmentedControls = (alwaysShowLabels: boolean = false) => (
    <div
      className={`inline-flex rounded-lg bg-slate-200/80 dark:bg-zinc-800 border border-slate-300/80 dark:border-zinc-700 shadow-2xs shrink-0 transition-all ${
        alwaysShowLabels ? "p-1 rounded-xl" : isCompact ? "p-0.5 rounded-lg" : "p-1 rounded-xl"
      }`}
      role="group"
      aria-label="Theme mode selection"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`${
          alwaysShowLabels || !isCompact
            ? "min-h-[34px] px-2 sm:px-3 text-xs"
            : "h-7 sm:h-7.5 px-1.5 sm:px-2 text-[10px] sm:text-[11px]"
        } rounded-md font-bold flex items-center gap-1 transition-all tactile-btn ${
          !isDark
            ? "bg-white text-zinc-900 shadow-xs border border-slate-200/80"
            : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        }`}
        aria-label="Switch to light theme"
        title="Light theme"
      >
        <Sun className={`${isCompact ? "w-3 h-3" : "w-3.5 h-3.5"} text-amber-500 shrink-0`} />
        <span className={`font-bold ${alwaysShowLabels ? "inline" : "hidden sm:inline"}`}>Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`${
          alwaysShowLabels || !isCompact
            ? "min-h-[34px] px-2 sm:px-3 text-xs"
            : "h-7 sm:h-7.5 px-1.5 sm:px-2 text-[10px] sm:text-[11px]"
        } rounded-md font-bold flex items-center gap-1 transition-all tactile-btn ${
          isDark
            ? "bg-zinc-700 text-emerald-400 shadow-xs border border-zinc-600"
            : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        }`}
        aria-label="Switch to dark theme"
        title="Dark theme"
      >
        <Moon className={`${isCompact ? "w-3 h-3" : "w-3.5 h-3.5"} text-emerald-400 shrink-0`} />
        <span className={`font-bold ${alwaysShowLabels ? "inline" : "hidden sm:inline"}`}>Dark</span>
      </button>
    </div>
  );

  if (variant === "mobile") {
    return (
      <div
        className={`w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-100/90 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 transition-colors ${className}`}
      >
        <div>
          <span className="text-xs font-bold text-zinc-900 dark:text-white block">
            Theme Appearance
          </span>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5">
            {isDark ? "Dark theme active" : "Light theme active"}
          </span>
        </div>

        {/* Identical Segmented Light / Dark Toggle Switch */}
        {renderSegmentedControls(true)}
      </div>
    );
  }

  // Header variant: borderless and invisible container, switches theme on click
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`bg-transparent border-0 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0 group ${
        isCompact ? "p-1.5 min-h-[38px] min-w-[38px] rounded-xl" : "p-2 min-h-[44px] min-w-[44px] rounded-xl"
      } ${className}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className={`${isCompact ? "w-4 h-4" : "w-5 h-5"} text-amber-400 group-hover:rotate-45 transition-transform`} />
      ) : (
        <Moon className={`${isCompact ? "w-4 h-4" : "w-5 h-5"} text-zinc-700 dark:text-zinc-300 group-hover:-rotate-12 transition-transform`} />
      )}
    </button>
  );
}
