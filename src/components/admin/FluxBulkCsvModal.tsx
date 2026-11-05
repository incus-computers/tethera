"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
} from "lucide-react";
import { parseProductCsv, validateBulkCsvRows, CsvRowError, CsvImportPreviewItem } from "@/lib/csv/productCsv";

interface FluxBulkCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingSkus?: string[];
}

export function FluxBulkCsvModal({
  isOpen,
  onClose,
  onSuccess,
  existingSkus = [],
}: FluxBulkCsvModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<CsvRowError[]>([]);
  const [preview, setPreview] = useState<CsvImportPreviewItem[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setApiError("Please select a valid .csv spreadsheet file.");
      return;
    }

    setFile(selectedFile);
    setApiError(null);
    setUploadSuccess(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      setCsvContent(text);

      try {
        const { rows } = parseProductCsv(text);
        if (rows.length === 0) {
          setErrors([
            {
              rowNumber: 1,
              sku: "FILE",
              field: "content",
              message: "The selected CSV file has no product rows.",
            },
          ]);
          setPreview([]);
          setIsParsing(false);
          return;
        }

        const skuSet = new Set(existingSkus.map((s) => s.toUpperCase()));
        const validation = validateBulkCsvRows(rows, skuSet);

        setErrors(validation.errors);
        setPreview(validation.preview);
      } catch (err: any) {
        setApiError(`Failed to parse CSV: ${err.message}`);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setApiError("Could not read the selected file.");
      setIsParsing(false);
    };

    reader.readAsText(selectedFile);
  };

  const handleDownloadTemplate = () => {
    window.open("/api/admin/products/bulk/export?template=true", "_blank");
  };

  const handleExecuteImport = async () => {
    if (!csvContent || errors.length > 0) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("tethera_admin_token") || "superadmin" : "superadmin";

      const res = await fetch("/api/admin/products/bulk/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csvContent }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.errors && Array.isArray(json.errors)) {
          setErrors(json.errors);
          setApiError(json.message || "Validation failed during import.");
        } else {
          setApiError(json.error || json.message || "Failed to process import.");
        }
        return;
      }

      setUploadSuccess(
        `Import completed! ${json.summary.created} products created, ${json.summary.updated} products updated (${json.summary.stockAdjusted} stock adjustments logged).`
      );
      onSuccess();
    } catch (err: any) {
      setApiError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setCsvContent("");
    setErrors([]);
    setPreview([]);
    setUploadSuccess(null);
    setApiError(null);
  };

  const newCount = preview.filter((p) => !p.isExistingProduct).length;
  const updateCount = preview.filter((p) => p.isExistingProduct).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12141A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#37baf2]/10 border border-[#37baf2]/20 flex items-center justify-center text-[#37baf2] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Bulk Catalog CSV Import
              </h2>
              <p className="text-xs text-zinc-400">
                Update prices, restock inventory, or upload new hardware in bulk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Instructions and Template Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-xs text-zinc-300 space-y-1">
              <div className="font-semibold text-white">Need the correct column format?</div>
              <p className="text-zinc-400 text-[11px]">
                Download our sample template with pre-filled hardware examples and spec columns.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white inline-flex items-center gap-2 transition-colors shrink-0"
            >
              <Download className="w-4 h-4 text-[#37baf2]" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-[#37baf2]/40 rounded-2xl p-8 text-center cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03] space-y-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              <div className="w-12 h-12 rounded-full bg-[#37baf2]/10 border border-[#37baf2]/20 flex items-center justify-center text-[#37baf2] mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">
                  Click to select or drag and drop CSV file
                </div>
                <div className="text-xs text-zinc-400">
                  Standard comma-separated format (.csv) up to 10MB
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-6 h-6 text-[#37baf2] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{file.name}</div>
                  <div className="text-xs text-zinc-400">
                    {(file.size / 1024).toFixed(1)} KB &bull; {preview.length} rows detected
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={resetState}
                className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Change File
              </button>
            </div>
          )}

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#37baf2]" />
              <span>Validating spreadsheet rows...</span>
            </div>
          )}

          {/* Validation Errors Callout */}
          {errors.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Validation Failed: {errors.length} issue(s) detected. Upload halted.
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-white/5 text-xs text-zinc-300 pr-1">
                {errors.map((err, idx) => (
                  <div key={idx} className="py-1.5 flex items-start gap-2">
                    <span className="font-mono text-[11px] text-rose-300 font-bold shrink-0">
                      Row {err.rowNumber}:
                    </span>
                    <span className="text-zinc-300">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Error Callout */}
          {apiError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Upload Success Callout */}
          {uploadSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Pre-flight Change Summary */}
          {preview.length > 0 && errors.length === 0 && !uploadSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Pre-flight Check Passed: 100% Valid
                </span>
                <span className="text-zinc-400">{preview.length} total products</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-zinc-400 text-[11px]">New Products to Create</div>
                  <div className="text-base font-bold text-white mt-0.5">{newCount}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-zinc-400 text-[11px]">Existing Products to Update</div>
                  <div className="text-base font-bold text-white mt-0.5">{updateCount}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-[#0E1015]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!file || errors.length > 0 || isSubmitting || Boolean(uploadSuccess)}
            onClick={handleExecuteImport}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#37baf2] hover:bg-[#52c6f5] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0B0E] text-sm font-bold inline-flex items-center gap-2 transition-all shadow-md shadow-[#37baf2]/20 flux-interactive-btn active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Upload...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Confirm &amp; Import</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
