"use client";

import React, { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../lib/store/useThemeStore";

interface ThemeToggleProps {
  variant?: "header" | "mobile";
  className?: string;
}

export function ThemeToggle({ variant = "header", className = "" }: ThemeToggleProps) {
  const { theme, setTheme, initTheme, isMounted } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const isDark = isMounted && theme === "dark";

  const renderSegmentedControls = (alwaysShowLabels: boolean = false) => (
    <div
      className={`inline-flex rounded-lg bg-slate-200/80 dark:bg-zinc-800 border border-slate-300/80 dark:border-zinc-700 shadow-2xs shrink-0 ${alwaysShowLabels ? "p-1 rounded-xl" : "p-0.5"}`}
      role="group"
      aria-label="Theme mode selection"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`${alwaysShowLabels ? "min-h-[34px] px-2 sm:px-3 text-xs" : "h-7 sm:h-7.5 px-1.5 sm:px-2 text-[10px] sm:text-[11px]"} rounded-md font-bold flex items-center gap-1 transition-all tactile-btn ${
          !isDark
            ? "bg-white text-zinc-900 shadow-xs border border-slate-200/80"
            : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        }`}
        aria-label="Switch to light theme"
        title="Light theme"
      >
        <Sun className="w-3 h-3 text-amber-500 shrink-0" />
        <span className={`font-bold ${alwaysShowLabels ? "inline" : "hidden sm:inline"}`}>Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`${alwaysShowLabels ? "min-h-[34px] px-2 sm:px-3 text-xs" : "h-7 sm:h-7.5 px-1.5 sm:px-2 text-[10px] sm:text-[11px]"} rounded-md font-bold flex items-center gap-1 transition-all tactile-btn ${
          isDark
            ? "bg-zinc-700 text-emerald-400 shadow-xs border border-zinc-600"
            : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        }`}
        aria-label="Switch to dark theme"
        title="Dark theme"
      >
        <Moon className="w-3 h-3 text-emerald-400 shrink-0" />
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

  // Header variant: clean segmented control guaranteeing identical visual behavior on PC and mobile
  return (
    <div className={`shrink-0 ${className}`}>
      {renderSegmentedControls()}
    </div>
  );
}
