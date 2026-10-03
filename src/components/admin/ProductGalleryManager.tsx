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
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3.5 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div>
          <div className="flex items-center gap-1.5 font-bold text-white">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>Product Pictures Gallery</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-cyan-300 font-mono">
              {images.length} photos
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Drag to rearrange or use arrow buttons. The first picture is the main cover shown on the store catalog.
          </p>
        </div>
      </div>

      {/* Pictures Grid with Rearranging Controls */}
      {images.length === 0 ? (
        <div className="py-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 p-4 space-y-2">
          <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-slate-400 font-medium">No pictures added for this product yet.</p>
          <p className="text-[11px] text-slate-500">Upload pictures below or paste a direct image URL.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
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
                className={`relative group rounded-xl border overflow-hidden flex flex-col justify-between bg-slate-950 transition-all ${
                  isCover
                    ? "border-cyan-500 ring-2 ring-cyan-500/20 shadow-md"
                    : "border-slate-700 hover:border-slate-500 shadow-2xs"
                } ${isDragging ? "opacity-40 scale-95 border-dashed border-cyan-400" : ""}`}
              >
                {/* Photo Top Badge */}
                <div className="absolute top-1.5 left-1.5 right-1.5 z-10 flex items-center justify-between pointer-events-none">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs ${
                      isCover
                        ? "bg-cyan-500 text-slate-950 font-black"
                        : "bg-slate-900/90 text-slate-300 border border-slate-700 font-mono"
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

                  <span className="p-1 rounded bg-slate-900/80 text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    <GripVertical className="w-3 h-3 cursor-grab" />
                  </span>
                </div>

                {/* Picture Image Thumbnail */}
                <div className="relative aspect-square w-full bg-slate-900 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={imgUrl}
                    alt={`Product photo ${idx + 1}`}
                    className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-200 group-hover:scale-105"
                  />
                </div>

                {/* Action Controls Bar */}
                <div className="p-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-1">
                  {/* Left / Up button */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed"
                    title="Move Earlier (Left)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Make Cover Button */}
                  {!isCover && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(idx)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 text-slate-400 text-[10px] font-semibold flex items-center gap-1 transition"
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
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed"
                    title="Move Later (Right)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1 rounded hover:bg-red-950/80 text-red-400 hover:text-red-300 transition"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload and URL input row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
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
            className="w-full h-9 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading Picture(s)...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Picture from Computer</span>
              </>
            )}
          </button>
        </div>

        {/* Add from URL */}
        <div className="flex items-center gap-1.5">
          <input
            type="url"
            placeholder="Or paste external image URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 h-9"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition whitespace-nowrap"
          >
            Add URL
          </button>
        </div>
      </div>
    </div>
  );
}
