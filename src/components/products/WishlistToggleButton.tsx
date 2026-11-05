"use client";

import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";

interface WishlistToggleButtonProps {
  productId: string;
  className?: string;
  onToggle?: (isInWishlist: boolean) => void;
}

export function WishlistToggleButton({
  productId,
  className = "",
  onToggle,
}: WishlistToggleButtonProps) {
  const [isInWishlist, setIsInWishlist] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuthStore();

  // Check initial wishlist status
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const query = user?.id ? `?userId=${encodeURIComponent(user.id)}` : "";
        const res = await fetch(`/api/wishlist${query}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.items) && isMounted) {
          const found = data.items.some((item: any) => item.product_id === productId);
          setIsInWishlist(found);
        }
      } catch (err) {
        // Silently tolerate initial check failure
      }
    }

    if (productId) {
      checkStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [productId, user?.id]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    const previousState = isInWishlist;
    const nextState = !previousState;
    setIsInWishlist(nextState);
    if (onToggle) onToggle(nextState);

    setIsLoading(true);
    try {
      if (previousState) {
        // Remove from wishlist
        const res = await fetch("/api/wishlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            userId: user?.id || undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed to remove item.");
      } else {
        // Add to wishlist
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            userId: user?.id || undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed to add item.");
      }
    } catch (err) {
      // Revert optimistic update
      setIsInWishlist(previousState);
      if (onToggle) onToggle(previousState);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={isInWishlist ? "Remove from wishlist" : "Save to wishlist"}
      title={isInWishlist ? "Saved in wishlist" : "Add to wishlist"}
      className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg border flex items-center justify-center transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-60 ${
        isInWishlist
          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400"
          : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      } ${className}`}
    >
      <Heart
        className={`w-5 h-5 transition-transform duration-150 ${
          isInWishlist ? "fill-rose-500 text-rose-500 scale-105" : "text-current"
        }`}
      />
    </button>
  );
}
