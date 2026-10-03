"use client";

import React, { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image as ImageIcon,
  Eye,
  Edit3,
  Upload,
  Link as LinkIcon,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import { RichTextRenderer } from "./RichTextRenderer";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  availableImages?: string[];
  token?: string | null;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  availableImages = [],
  token = null,
  placeholder = "Write detailed product overview, architectural breakdown, and insert high-res pictures...",
  minHeight = "220px",
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageSourceMode, setImageSourceMode] = useState<"upload" | "gallery" | "url">("upload");
  const [captionInput, setCaptionInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedGalleryImg, setSelectedGalleryImg] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to insert or wrap text at the current cursor position
  const insertTextAtCursor = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end);

    let replacement = "";
    if (selectedText) {
      replacement = `${prefix}${selectedText}${suffix}`;
    } else {
      replacement = `${prefix}${suffix}`;
    }

    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
    onChange(newText);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      const cursorOffset = selectedText ? start + replacement.length : start + prefix.length;
      textarea.setSelectionRange(cursorOffset, cursorOffset);
    }, 10);
  };

  // Insert line prefix (e.g. for headings or lists)
  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const currentText = textarea.value;

    // Find start of current line
    const lastNewline = currentText.lastIndexOf("\n", start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const newText = currentText.substring(0, lineStart) + prefix + currentText.substring(lineStart);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + prefix.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  // Handle uploading picture directly into description
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to upload image.");
        setUploading(false);
        return;
      }

      const finalUrl = data.url || data.publicUrl || data.dataUrl;
      const altText = captionInput.trim() || file.name.replace(/\.[^/.]+$/, "");
      const markdownImage = `\n![${altText}](${finalUrl})\n`;

      insertTextAtCursor(markdownImage);
      setImageModalOpen(false);
      setCaptionInput("");
      setUrlInput("");
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Confirm image insertion
  const handleConfirmInsertImage = () => {
    let finalUrl = "";
    if (imageSourceMode === "gallery") {
      finalUrl = selectedGalleryImg;
    } else if (imageSourceMode === "url") {
      finalUrl = urlInput.trim();
    }

    if (!finalUrl) {
      alert("Please choose or provide an image URL.");
      return;
    }

    const altText = captionInput.trim() || "Hardware Illustration";
    const markdownImage = `\n![${altText}](${finalUrl})\n`;
    insertTextAtCursor(markdownImage);

    setImageModalOpen(false);
    setCaptionInput("");
    setUrlInput("");
    setSelectedGalleryImg("");
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden text-xs">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-slate-900 border-b border-slate-800">
        {/* Formatting Actions */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Bold */}
          <button
            type="button"
            onClick={() => insertTextAtCursor("**", "**")}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => insertTextAtCursor("*", "*")}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Italic (*text*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => insertLinePrefix("# ")}
            className="px-1.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Heading 1 (# Title)"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix("## ")}
            className="px-1.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Heading 2 (## Subheading)"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix("### ")}
            className="px-1.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Heading 3 (### Section)"
          >
            H3
          </button>

          <span className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => insertLinePrefix("- ")}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Bullet List (- item)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix("1. ")}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Numbered List (1. item)"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          {/* Quote */}
          <button
            type="button"
            onClick={() => insertLinePrefix("> ")}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Quote / Callout (> text)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          {/* Divider */}
          <button
            type="button"
            onClick={() => insertTextAtCursor("\n---\n")}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Horizontal Divider"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* Insert Picture Button */}
          <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700 hover:bg-emerald-900 text-emerald-300 font-bold transition shadow-2xs"
            title="Insert Picture at cursor location"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Insert Picture</span>
          </button>
        </div>

        {/* Mode Switcher: Write vs Preview */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              activeTab === "write"
                ? "bg-slate-800 text-cyan-300 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              activeTab === "preview"
                ? "bg-slate-800 text-emerald-300 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      {activeTab === "write" ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full bg-slate-950 p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-sans focus:outline-none resize-y leading-relaxed"
          />
          <div className="px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Markdown supported: **bold**, *italic*, # H1, ## H2, - lists, &amp; pictures</span>
            <span>{value.length} characters</span>
          </div>
        </div>
      ) : (
        <div style={{ minHeight }} className="p-4 bg-slate-900/30 overflow-y-auto max-h-[400px]">
          {value.trim() ? (
            <RichTextRenderer content={value} />
          ) : (
            <p className="text-slate-500 italic text-xs">Nothing to preview yet. Switch to Editor to start writing.</p>
          )}
        </div>
      )}

      {/* Insert Picture Modal */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Insert Picture Into Description</span>
              </div>
              <button
                type="button"
                onClick={() => setImageModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source Tab Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setImageSourceMode("upload")}
                className={`py-1.5 rounded-lg transition ${
                  imageSourceMode === "upload" ? "bg-slate-800 text-cyan-400 shadow-xs" : "text-slate-400"
                }`}
              >
                Upload from PC
              </button>
              <button
                type="button"
                onClick={() => setImageSourceMode("gallery")}
                className={`py-1.5 rounded-lg transition ${
                  imageSourceMode === "gallery" ? "bg-slate-800 text-emerald-400 shadow-xs" : "text-slate-400"
                }`}
              >
                Product Gallery ({availableImages.length})
              </button>
              <button
                type="button"
                onClick={() => setImageSourceMode("url")}
                className={`py-1.5 rounded-lg transition ${
                  imageSourceMode === "url" ? "bg-slate-800 text-purple-400 shadow-xs" : "text-slate-400"
                }`}
              >
                Direct Image URL
              </button>
            </div>

            {/* Tab 1: Upload from PC */}
            {imageSourceMode === "upload" && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400">
                  Select an image file from your computer. It will upload and automatically be placed right where your cursor is in the text.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleFileUpload(f);
                      e.target.value = "";
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl bg-slate-950 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-2 transition cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                      <span className="font-semibold text-emerald-400">Uploading and embedding...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-emerald-400" />
                      <span className="font-bold">Choose File from Computer</span>
                      <span className="text-[10px] text-slate-500">Supports PNG, JPG, WEBP, GIF, SVG</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab 2: Gallery Picker */}
            {imageSourceMode === "gallery" && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400">
                  Pick any picture already uploaded to this product to embed inside the description text:
                </p>
                {availableImages.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                    No pictures in this product gallery yet. Upload one via the Upload tab.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {availableImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedGalleryImg(img)}
                        className={`relative rounded-xl overflow-hidden aspect-square border-2 transition ${
                          selectedGalleryImg === img
                            ? "border-emerald-500 ring-2 ring-emerald-500/30"
                            : "border-slate-800 hover:border-slate-600"
                        }`}
                      >
                        <img src={img} alt={`Gallery item ${idx}`} className="w-full h-full object-cover" />
                        {selectedGalleryImg === img && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Direct URL */}
            {imageSourceMode === "url" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Image URL</label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            )}

            {/* Caption / Alt Text Input */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Picture Caption / Description (Optional)
              </label>
              <input
                type="text"
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                placeholder="e.g. Copper heatpipe architecture or Internal clearance"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setImageModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              {imageSourceMode !== "upload" && (
                <button
                  type="button"
                  onClick={handleConfirmInsertImage}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Insert Picture at Cursor
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
