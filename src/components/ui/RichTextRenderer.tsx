"use client";

import React from "react";
import Image from "next/image";

interface RichTextRendererProps {
  content?: string | null;
  className?: string;
}

export function RichTextRenderer({ content, className = "" }: RichTextRendererProps) {
  if (!content || !content.trim()) {
    return null;
  }

  // Helper to parse inline styles: bold, italic, code
  const renderInlineFormattedText = (text: string) => {
    // Regex to detect bold (**text**), italic (*text*), strike (~~text~~), code (`code`)
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const matchStr = match[0];
      if (matchStr.startsWith("**") && matchStr.endsWith("**")) {
        parts.push(
          <strong key={match.index} className="font-bold text-zinc-900 dark:text-zinc-100">
            {matchStr.slice(2, -2)}
          </strong>
        );
      } else if (matchStr.startsWith("*") && matchStr.endsWith("*")) {
        parts.push(
          <em key={match.index} className="italic text-zinc-800 dark:text-zinc-200">
            {matchStr.slice(1, -1)}
          </em>
        );
      } else if (matchStr.startsWith("~~") && matchStr.endsWith("~~")) {
        parts.push(
          <span key={match.index} className="line-through text-slate-400 dark:text-zinc-500">
            {matchStr.slice(2, -2)}
          </span>
        );
      } else if (matchStr.startsWith("`") && matchStr.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-zinc-700"
          >
            {matchStr.slice(1, -1)}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // Split lines and group into structured blocks
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let currentListItems: { type: "bullet" | "number"; text: string }[] = [];

  const flushList = (keyPrefix: number) => {
    if (currentListItems.length === 0) return;
    const isBullet = currentListItems[0].type === "bullet";

    if (isBullet) {
      blocks.push(
        <ul key={`ul-${keyPrefix}`} className="space-y-1.5 my-3 pl-2">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-2 shrink-0" />
              <span className="leading-relaxed">{renderInlineFormattedText(item.text)}</span>
            </li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`ol-${keyPrefix}`} className="space-y-1.5 my-3 pl-2">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
              <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 min-w-[18px]">
                {idx + 1}.
              </span>
              <span className="leading-relaxed">{renderInlineFormattedText(item.text)}</span>
            </li>
          ))}
        </ol>
      );
    }

    currentListItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList(i);
      continue;
    }

    // Check for Image: ![Alt text](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      flushList(i);
      const altText = imgMatch[1] || "Product Illustration";
      const imgUrl = imgMatch[2];

      blocks.push(
        <figure key={`img-${i}`} className="my-5 space-y-2">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 p-2 sm:p-3 flex items-center justify-center">
            <img
              src={imgUrl}
              alt={altText}
              loading="lazy"
              className="max-h-[420px] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
          {altText && altText !== "image" && altText !== "Product Illustration" && (
            <figcaption className="text-center text-[11px] text-slate-500 dark:text-zinc-400 italic">
              {altText}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    // Check for Headings
    if (trimmed.startsWith("### ")) {
      flushList(i);
      blocks.push(
        <h3 key={`h3-${i}`} className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 mt-4 mb-2">
          {renderInlineFormattedText(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList(i);
      blocks.push(
        <h2 key={`h2-${i}`} className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight mt-5 mb-2 pb-1 border-b border-slate-200 dark:border-zinc-800">
          {renderInlineFormattedText(trimmed.slice(3))}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList(i);
      blocks.push(
        <h1 key={`h1-${i}`} className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mt-6 mb-2 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
          {renderInlineFormattedText(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    // Check for Horizontal Rule
    if (trimmed === "---" || trimmed === "***") {
      flushList(i);
      blocks.push(<hr key={`hr-${i}`} className="my-5 border-slate-200 dark:border-zinc-800" />);
      continue;
    }

    // Check for Blockquote
    if (trimmed.startsWith("> ")) {
      flushList(i);
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="my-3 pl-4 py-2 border-l-3 border-emerald-500 bg-slate-50/80 dark:bg-zinc-800/40 rounded-r-xl text-xs sm:text-sm text-slate-700 dark:text-zinc-300 italic"
        >
          {renderInlineFormattedText(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Check for Bullet Lists (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      currentListItems.push({ type: "bullet", text: trimmed.slice(2) });
      continue;
    }

    // Check for Numbered Lists (1. )
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      currentListItems.push({ type: "number", text: numberedMatch[2] });
      continue;
    }

    // Standard Paragraph
    flushList(i);
    blocks.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed my-2">
        {renderInlineFormattedText(trimmed)}
      </p>
    );
  }

  flushList(lines.length);

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
}
