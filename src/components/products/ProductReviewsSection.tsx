"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star, CheckCircle, MessageSquare, AlertCircle, X, ThumbsUp } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { ProductReviewRow } from "@/lib/db/types";

interface ReviewSummaryData {
  reviews: ProductReviewRow[];
  totalCount: number;
  averageRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
}

export function ProductReviewsSection({
  productId,
  productName,
}: ProductReviewsSectionProps) {
  const { user, isAuthenticated } = useAuthStore();

  const [summary, setSummary] = useState<ReviewSummaryData>({
    reviews: [],
    totalCount: 0,
    averageRating: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Review modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formRating, setFormRating] = useState<number>(5);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Fetch reviews
  const loadReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const email = user?.email || "";
      const query = email ? `?customerEmail=${encodeURIComponent(email)}` : "";
      const res = await fetch(`/api/products/${productId}/reviews${query}`);
      if (!res.ok) {
        throw new Error("Could not load reviews for this product.");
      }
      const data = await res.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      setLoadError(err.message || "Failed to load product reviews.");
    } finally {
      setIsLoading(false);
    }
  }, [productId, user?.email]);

  useEffect(() => {
    if (productId) {
      loadReviews();
    }
  }, [productId, loadReviews]);

  // Sync logged-in user profile with modal inputs
  useEffect(() => {
    if (user?.email) {
      setFormEmail(user.email);
    }
    if (user?.fullName) {
      setFormName(user.fullName);
    }
  }, [user]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const emailToUse = (user?.email || formEmail).trim().toLowerCase();
    const nameToUse = (user?.fullName || formName || "Verified Buyer").trim();

    if (!emailToUse) {
      setSubmitError("Please provide your order email address for purchase verification.");
      return;
    }

    if (!formTitle.trim()) {
      setSubmitError("Please provide a review title.");
      return;
    }

    if (!formContent.trim()) {
      setSubmitError("Please write your review feedback.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          customerEmail: emailToUse,
          customerName: nameToUse,
          rating: formRating,
          title: formTitle,
          content: formContent,
          userId: user?.id || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to submit review. Only verified buyers with a confirmed delivered order can review."
        );
      }

      setSubmitSuccess(true);
      await loadReviews();
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setFormTitle("");
        setFormContent("");
      }, 1600);
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred while submitting your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="reviews"
      aria-label="Customer Reviews"
      className="scroll-mt-32 pt-8 border-t border-slate-200 dark:border-zinc-800 space-y-8"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
            Verified Community Feedback
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Customer Reviews &amp; Ratings
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubmitError(null);
            setSubmitSuccess(false);
            setIsModalOpen(true);
          }}
          className="min-h-[44px] px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-xs sm:text-sm transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400 self-start sm:self-auto"
        >
          Write a Verified Review
        </button>
      </div>

      {/* Aggregate Score & Rating Histogram */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
        {/* Left Column: Big Average & Stars */}
        <div className="md:col-span-5 flex flex-col justify-center items-center text-center p-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-zinc-800">
          <div className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            {summary.totalCount > 0 ? summary.averageRating.toFixed(1) : "0.0"}
          </div>
          <div className="flex items-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((starVal) => {
              const active = summary.totalCount > 0 && starVal <= Math.round(summary.averageRating);
              return (
                <Star
                  key={starVal}
                  className={`w-5 h-5 ${
                    active
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300 dark:text-zinc-700"
                  }`}
                />
              );
            })}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Based on {summary.totalCount} verified buyer{" "}
            {summary.totalCount === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Right Column: 1-5 Star Breakdown Bar Histogram */}
        <div className="md:col-span-7 flex flex-col justify-center gap-2.5">
          {([5, 4, 3, 2, 1] as const).map((starVal) => {
            const count = summary.distribution[starVal] || 0;
            const pct = summary.totalCount > 0 ? Math.round((count / summary.totalCount) * 100) : 0;
            return (
              <div key={starVal} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-medium text-slate-600 dark:text-zinc-300 flex items-center gap-1">
                  <span>{starVal}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" />
                </span>

                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="w-14 text-right text-slate-400 dark:text-zinc-500 font-mono">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading && (
          <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <p className="text-xs text-slate-500 dark:text-zinc-400">Loading verified reviews...</p>
          </div>
        )}

        {loadError && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {!isLoading && !loadError && summary.reviews.length === 0 && (
          <div className="p-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              No reviews yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Be the first verified customer to share real-world performance benchmarks, thermals,
              and build impressions for this product.
            </p>
          </div>
        )}

        {!isLoading &&
          summary.reviews.map((rev) => (
            <article
              key={rev.id}
              className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                    {rev.customer_name}
                  </span>

                  {rev.verified_purchase && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                      <CheckCircle className="w-3 h-3" />
                      Verified Buyer
                    </span>
                  )}
                </div>

                <time
                  dateTime={rev.created_at || new Date().toISOString()}
                  className="text-xs text-slate-400 dark:text-zinc-500"
                >
                  {new Date(rev.created_at || Date.now()).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>

              {/* Stars & Title */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5" aria-label={`${rev.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <Star
                      key={starVal}
                      className={`w-3.5 h-3.5 ${
                        starVal <= rev.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200 dark:text-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {rev.title}
                </h4>
              </div>

              {/* Review Text */}
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {rev.content}
              </p>
            </article>
          ))}
      </div>

      {/* Write a Review Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="review-modal-title"
                  className="text-lg font-bold text-zinc-900 dark:text-zinc-100"
                >
                  Review this Product
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-1">
                  {productName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400"
                aria-label="Close review dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Strict Buyer Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs text-slate-600 dark:text-zinc-300 flex items-start gap-2.5 leading-relaxed">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Strictly Verified Reviews
                </strong>
                Reviews are gated to confirmed buyers with a completed delivered order. This prevents
                sponsored spam and ensures genuine technical feedback.
              </div>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Review verified and published successfully. Thank you for your feedback!</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Your Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setFormRating(starVal)}
                      className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
                      aria-label={`Select ${starVal} out of 5 stars`}
                    >
                      <Star
                        className={`w-6 h-6 transition-transform ${
                          starVal <= formRating
                            ? "fill-amber-400 text-amber-400 scale-105"
                            : "text-slate-300 dark:text-zinc-600"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400 ml-2">
                    {formRating} of 5 Stars
                  </span>
                </div>
              </div>

              {/* Order Verification Email */}
              <div>
                <label
                  htmlFor="review-email"
                  className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1"
                >
                  Order Email Address
                </label>
                <input
                  id="review-email"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="The email used on your delivered order"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-400"
                />
              </div>

              {/* Display Name */}
              <div>
                <label
                  htmlFor="review-name"
                  className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1"
                >
                  Display Name
                </label>
                <input
                  id="review-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Hendra K."
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-400"
                />
              </div>

              {/* Headline */}
              <div>
                <label
                  htmlFor="review-title"
                  className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1"
                >
                  Review Title
                </label>
                <input
                  id="review-title"
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Flawless 1440p gaming and rock solid thermals"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-400"
                />
              </div>

              {/* Content Body */}
              <div>
                <label
                  htmlFor="review-content"
                  className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1"
                >
                  Written Feedback
                </label>
                <textarea
                  id="review-content"
                  required
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Detail your experience with thermals, acoustic noise, build quality, and overclock stability..."
                  className="w-full min-h-[88px] px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-400"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || submitSuccess}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  {isSubmitting ? "Verifying Order..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
