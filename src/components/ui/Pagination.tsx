"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  scrollToId?: string;
  itemLabel?: string;
  className?: string;
  options?: number[];
  columns?: number;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  scrollToId,
  itemLabel = "products",
  className = "",
  options = [20, 40, 60],
  columns,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(validCurrentPage * itemsPerPage, totalItems);

  const handlePageClick = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === validCurrentPage) return;
    onPageChange(newPage);

    if (scrollToId && typeof window !== "undefined") {
      const target = document.getElementById(scrollToId);
      if (target) {
        const navOffset = 90;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - navOffset;
        window.scrollTo({
          top: Math.max(0, targetPos),
          behavior: "smooth",
        });
      }
    }
  };

  const handleItemsPerPageChange = (newCount: number) => {
    onItemsPerPageChange(newCount);
    onPageChange(1);

    if (scrollToId && typeof window !== "undefined") {
      const target = document.getElementById(scrollToId);
      if (target) {
        const navOffset = 90;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - navOffset;
        window.scrollTo({
          top: Math.max(0, targetPos),
          behavior: "smooth",
        });
      }
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(totalPages - 1, validCurrentPage + 1);

      if (start > 2) {
        pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={`pt-6 pb-2 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${className}`}
      role="navigation"
      aria-label="Pagination Navigation"
    >
      {/* Left: Results Info and Per Page Selector */}
      <div className="flex flex-wrap items-center justify-between sm:justify-start w-full sm:w-auto gap-3 sm:gap-4">
        <span className="text-slate-600 dark:text-zinc-400 font-medium whitespace-nowrap">
          Showing <span className="font-bold text-zinc-900 dark:text-zinc-100">{startItem}</span> to{" "}
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{endItem}</span> of{" "}
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalItems}</span> {itemLabel}
        </span>

        {/* Per-Page Selector (dynamic multiples based on column count) */}
        <div className="flex items-center gap-2">
          <label htmlFor={`items-per-page-${scrollToId || "default"}`} className="text-slate-500 dark:text-zinc-400 font-bold whitespace-nowrap">
            Show:
          </label>
          <select
            id={`items-per-page-${scrollToId || "default"}`}
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg px-2.5 py-1.5 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-600 shadow-2xs min-h-[44px] cursor-pointer"
            aria-label="Products per page"
          >
            {(options.includes(itemsPerPage) ? options : [...options, itemsPerPage].sort((a, b) => a - b)).map((opt) => (
              <option key={opt} value={opt}>
                {columns && opt % columns === 0
                  ? `${opt} items (${Math.round(opt / columns)} rows)`
                  : `${opt} per page`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full sm:w-auto overflow-x-auto py-1">
        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(validCurrentPage - 1)}
          disabled={validCurrentPage <= 1}
          className="min-w-[44px] min-h-[44px] px-3 py-2 flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold shadow-2xs active:scale-95 shrink-0"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Prev</span>
        </button>

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((item, idx) => {
            if (typeof item === "string") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 text-center text-slate-400 dark:text-zinc-500 font-bold select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = item === validCurrentPage;
            return (
              <button
                key={`page-${item}`}
                type="button"
                onClick={() => handlePageClick(item)}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`Page ${item}`}
                className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center ${
                  isCurrent
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs border border-transparent"
                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 shadow-2xs active:scale-95"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(validCurrentPage + 1)}
          disabled={validCurrentPage >= totalPages}
          className="min-w-[44px] min-h-[44px] px-3 py-2 flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold shadow-2xs active:scale-95 shrink-0"
          aria-label="Go to next page"
        >
          <span className="hidden xs:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
