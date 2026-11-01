"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  scrollToId?: string;
  itemLabel?: string;
  className?: string;
  options?: number[];
  columns?: number;
  containerInvisible?: boolean;
  controlsOnly?: boolean;
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
  containerInvisible = false,
  controlsOnly = false,
}: PaginationProps) {
  const [isShowOpen, setIsShowOpen] = useState(false);
  const showDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdownRef.current && !showDropdownRef.current.contains(event.target as Node)) {
        setIsShowOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsShowOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newCount);
    }
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

  const renderPageControls = () => (
    <div
      className={`flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto py-1 ${
        controlsOnly ? className : "w-full sm:w-auto"
      }`}
      role="navigation"
      aria-label="Pagination Navigation"
    >
      {/* Previous Page Button */}
      <button
        type="button"
        onClick={() => handlePageClick(validCurrentPage - 1)}
        disabled={validCurrentPage <= 1}
        className={`min-w-[44px] min-h-[44px] px-2.5 sm:px-3 py-2 flex items-center justify-center gap-1 rounded-xl font-bold transition-all active:scale-95 shrink-0 ${
          containerInvisible
            ? "bg-transparent border-0 shadow-none text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[#37baf2] dark:hover:text-[#37baf2] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-700 dark:disabled:hover:text-zinc-300"
            : "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
        }`}
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
                  : containerInvisible
                  ? "bg-transparent border-0 shadow-none text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white active:scale-95"
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
        className={`min-w-[44px] min-h-[44px] px-2.5 sm:px-3 py-2 flex items-center justify-center gap-1 rounded-xl font-bold transition-all active:scale-95 shrink-0 ${
          containerInvisible
            ? "bg-transparent border-0 shadow-none text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[#37baf2] dark:hover:text-[#37baf2] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-700 dark:disabled:hover:text-zinc-300"
            : "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
        }`}
        aria-label="Go to next page"
      >
        <span className="hidden xs:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  if (controlsOnly) {
    return renderPageControls();
  }

  return (
    <div
      className={`pt-6 pb-2 ${
        containerInvisible ? "border-t-0" : "border-t border-slate-200 dark:border-zinc-800"
      } flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${className}`}
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

        {/* Per-Page Selector (Invisible container trigger matching Sort dropdown) */}
        {onItemsPerPageChange && (
          <div className="relative" ref={showDropdownRef}>
            <button
              type="button"
              onClick={() => setIsShowOpen((prev) => !prev)}
              aria-expanded={isShowOpen}
              aria-haspopup="true"
              aria-label="Items per page selector"
              className="min-h-[44px] inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-100 hover:text-[#37baf2] dark:hover:text-[#37baf2] transition-colors focus-visible:outline-2 focus-visible:outline-[#37baf2] cursor-pointer"
            >
              <span className="text-slate-500 dark:text-zinc-400 font-bold">Show:</span>
              <span>
                {columns && itemsPerPage % columns === 0
                  ? `${itemsPerPage} items (${Math.round(itemsPerPage / columns)} rows)`
                  : `${itemsPerPage} per page`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  isShowOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Floating Dropdown Menu (No container around trigger, clean floating popover) */}
            {isShowOpen && (
              <div className="absolute left-0 bottom-full mb-2 z-40 w-48 sm:w-56 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/30 rounded-2xl shadow-xl p-1.5 flex flex-col space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                {(options.includes(itemsPerPage) ? options : [...options, itemsPerPage].sort((a, b) => a - b)).map((opt) => {
                  const isSelected = opt === itemsPerPage;
                  const label =
                    columns && opt % columns === 0
                      ? `${opt} items (${Math.round(opt / columns)} rows)`
                      : `${opt} per page`;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        handleItemsPerPageChange(opt);
                        setIsShowOpen(false);
                      }}
                      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? "text-zinc-950 dark:text-white bg-slate-100 dark:bg-zinc-800"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <span>{label}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#37baf2] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      {renderPageControls()}
    </div>
  );
}
