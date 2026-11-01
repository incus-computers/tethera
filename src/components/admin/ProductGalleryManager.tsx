"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Star,
  GripVertical,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

interface ProductGalleryManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  token?: string | null;
  onUploadSuccess?: (msg: string) => void;
}

export function ProductGalleryManager({
  images = [],
  onChange,
  token = null,
  onUploadSuccess,
}: ProductGalleryManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Move image at index by delta (-1 for left/up, +1 for right/down)
  const handleMove = (index: number, delta: number) => {
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= images.length) return;

    const updated = [...images];
    const item = updated.splice(index, 1)[0];
    updated.splice(newIndex, 0, item);
    onChange(updated);
  };

  // Set as primary / cover image (move to index 0)
  const handleSetCover = (index: number) => {
    if (index === 0) return;
    const updated = [...images];
    const item = updated.splice(index, 1)[0];
    updated.unshift(item);
    onChange(updated);
    if (onUploadSuccess) {
      onUploadSuccess("Picture set as main cover photo.");
    }
  };

  // Remove image
  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const updated = [...images];
    const item = updated.splice(draggedIndex, 1)[0];
    updated.splice(targetIndex, 0, item);
    onChange(updated);
    setDraggedIndex(null);
    if (onUploadSuccess) {
      onUploadSuccess("Pictures rearranged.");
    }
  };

  // Handle uploading picture files from PC
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const finalUrl = data.url || data.publicUrl || data.dataUrl;
          newUrls.push(finalUrl);
        } else {
          alert(`Failed to upload ${file.name}: ${data.error || "Upload error"}`);
        }
      }

      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
        if (onUploadSuccess) {
          onUploadSuccess(`${newUrls.length} picture(s) uploaded and added to gallery.`);
        }
      }
    } catch (err: any) {
      alert("Upload error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Add image by URL
  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    onChange([...images, urlInput.trim()]);
    setUrlInput("");
    if (onUploadSuccess) {
      onUploadSuccess("Picture URL added to gallery.");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0A0B0E] p-5 sm:p-6 text-xs font-sans">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 font-semibold text-zinc-200">
            <ImageIcon className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-200">Product Pictures Gallery</span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400">
              {images.length} photos
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Drag to rearrange or use arrow buttons. The first picture is the main cover shown on the store catalog.
          </p>
        </div>
      </div>

      {/* Pictures Grid with Rearranging Controls */}
      {images.length === 0 ? (
        <div className="py-10 text-center bg-[#12141A] rounded-xl border border-dashed border-white/10 p-6 space-y-2">
          <ImageIcon className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-zinc-400 font-medium text-xs">No pictures added for this product yet.</p>
          <p className="text-xs text-zinc-500">Upload pictures below or paste a direct image URL.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {images.map((imgUrl, idx) => {
            const isCover = idx === 0;
            const isDragging = draggedIndex === idx;

            return (
              <div
                key={`${imgUrl}-${idx}`}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                className={`relative group rounded-xl border overflow-hidden flex flex-col justify-between bg-[#12141A] transition-all ${
                  isCover
                    ? "border-zinc-300 ring-1 ring-white/20 shadow-md"
                    : "border-white/10 hover:border-white/25 shadow-xs"
                } ${isDragging ? "opacity-40 scale-95 border-dashed border-zinc-400" : ""}`}
              >
                {/* Photo Top Badge */}
                <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs ${
                      isCover
                        ? "bg-white text-zinc-950 font-bold"
                        : "bg-black/70 text-zinc-300 border border-white/10"
                    }`}
                  >
                    {isCover ? (
                      <>
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>Cover</span>
                      </>
                    ) : (
                      `#${idx + 1}`
                    )}
                  </span>

                  <span className="p-1 rounded bg-black/60 text-zinc-400 opacity-0 group-hover:opacity-100 transition">
                    <GripVertical className="w-3 h-3 cursor-grab" />
                  </span>
                </div>

                {/* Picture Image Thumbnail */}
                <div className="relative aspect-square w-full bg-[#0A0B0E] overflow-hidden flex items-center justify-center p-3">
                  <img
                    src={imgUrl}
                    alt={`Product photo ${idx + 1}`}
                    className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-200 group-hover:scale-105"
                  />
                </div>

                {/* Action Controls Bar */}
                <div className="p-2 bg-[#12141A] border-t border-white/10 flex items-center justify-between gap-1">
                  {/* Left / Up button */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300 disabled:opacity-25 disabled:cursor-not-allowed"
                    title="Move Earlier (Left)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Make Cover Button */}
                  {!isCover && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(idx)}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition"
                      title="Set as Main Cover"
                    >
                      <Star className="w-2.5 h-2.5" />
                      <span>Cover</span>
                    </button>
                  )}

                  {/* Right / Down button */}
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300 disabled:opacity-25 disabled:cursor-not-allowed"
                    title="Move Later (Right)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-rose-400 transition"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload and URL input row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
        {/* Upload from PC */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-zinc-100 font-medium text-xs flex items-center justify-center gap-2 border border-white/15 transition disabled:opacity-50"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-300" />
                <span>Uploading Picture(s)...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-zinc-300" />
                <span>Upload Picture from Computer</span>
              </>
            )}
          </button>
        </div>

        {/* Add from URL */}
        <div className="flex items-center gap-2">
          <input
            type="url"
            placeholder="Or paste external image URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-[#12141A] border border-white/10 rounded-xl px-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 min-h-[44px] focus:outline-none focus:border-zinc-400 transition-colors"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-4 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 font-medium text-xs transition whitespace-nowrap border border-white/15"
          >
            Add URL
          </button>
        </div>
      </div>
    </div>
  );
}
