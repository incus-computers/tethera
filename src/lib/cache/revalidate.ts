import { revalidatePath, revalidateTag } from "next/cache";

export type RevalidationEntity =
  | "product"
  | "banner"
  | "promotion"
  | "inventory"
  | "category";

export interface RevalidationOptions {
  productId?: string;
  productSlug?: string;
  categorySlug?: string;
}

export interface RevalidationResult {
  revalidated: boolean;
  paths: string[];
  tags: string[];
  error?: string;
}

/**
 * Programmatic cache invalidation helper (OPT-BE-02)
 * Triggers Next.js revalidatePath and revalidateTag for catalog, banner, promotion, and stock mutations.
 * Catches and tolerates environments without an active Next.js static generation store (e.g. Vitest test runner).
 */
export function safeRevalidate(
  entity: RevalidationEntity,
  options?: RevalidationOptions
): RevalidationResult {
  const paths: string[] = [];
  const tags: string[] = [];

  switch (entity) {
    case "product":
      paths.push("/", "/components", "/builder");
      if (options?.categorySlug) {
        paths.push(`/components/${options.categorySlug}`);
      }
      if (options?.productId) {
        paths.push(`/products/${options.productId}`);
        tags.push(`product-${options.productId}`);
      }
      if (options?.productSlug && options.productSlug !== options?.productId) {
        paths.push(`/products/${options.productSlug}`);
      }
      tags.push("products");
      break;

    case "banner":
      paths.push("/");
      tags.push("banners");
      break;

    case "promotion":
      paths.push("/", "/components");
      tags.push("promotions");
      break;

    case "inventory":
      if (options?.productId) {
        paths.push(`/products/${options.productId}`);
        tags.push(`product-${options.productId}`);
      }
      tags.push("inventory");
      break;

    case "category":
      paths.push("/", "/components");
      if (options?.categorySlug) {
        paths.push(`/components/${options.categorySlug}`);
      }
      tags.push("categories");
      break;
  }

  try {
    for (const tag of tags) {
      revalidateTag(tag);
    }
    for (const p of paths) {
      revalidatePath(p);
    }
    return {
      revalidated: true,
      paths,
      tags,
    };
  } catch (err: any) {
    // In unit test runners or static build environments without an active Next.js
    // static generation store, safely report the intended paths and tags.
    return {
      revalidated: false,
      paths,
      tags,
      error: err.message || "Cache revalidation not available in current execution context.",
    };
  }
}
