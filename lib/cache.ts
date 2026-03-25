/**
 * Next.js 16 Caching Revolution - Cache Utilities
 *
 * This module provides cache tag management and invalidation utilities
 * for the entire application using Next.js 16's new caching features.
 *
 * Key Features:
 * - Centralized cache tag definitions
 * - Type-safe cache invalidation helpers
 * - Granular cache control for products, categories, orders, reviews
 * - Optimized revalidation strategies
 */

import { revalidatePath } from "next/cache";
import { buildCategoryUrl, CATEGORY_BASE_PATH } from "@/lib/paths";

// ============================================================================
// CACHE TAG DEFINITIONS
// ============================================================================

/**
 * Cache tag constants for consistent invalidation across the app
 */
export const CACHE_TAGS = {
  // Product-related tags
  PRODUCTS: "products",
  PRODUCT: (id: string) => `product-${id}`,
  PRODUCT_REVIEWS: (productId: string) => `product-reviews-${productId}`,
  RELATED_PRODUCTS: (productId: string) => `related-products-${productId}`,

  // Category-related tags
  CATEGORIES: "categories",
  CATEGORY: (slug: string) => `category-${slug}`,
  CATEGORY_PRODUCTS: (slug: string) => `category-products-${slug}`,

  // Brand-related tags
  BRANDS: "brands",
  BRAND: (slug: string) => `brand-${slug}`,
  BRAND_PRODUCTS: (slug: string) => `brand-products-${slug}`,

  // User-related tags
  USER: (userId: string) => `user-${userId}`,
  USER_ORDERS: (userId: string) => `user-orders-${userId}`,
  USER_WISHLIST: (userId: string) => `user-wishlist-${userId}`,
  USER_CART: (userId: string) => `user-cart-${userId}`,
  USER_REVIEWS: (userId: string) => `user-reviews-${userId}`,

  // Order-related tags
  ORDERS: "orders",
  ORDER: (orderId: string) => `order-${orderId}`,

  // Review-related tags
  REVIEWS: "reviews",
  REVIEW: (reviewId: string) => `review-${reviewId}`,

  // Blog-related tags
  BLOGS: "blogs",
  BLOG: (slug: string) => `blog-${slug}`,
  BLOG_CATEGORY: (slug: string) => `blog-category-${slug}`,

  // Static content tags (rarely change)
  HOMEPAGE: "homepage",
  NAVIGATION: "navigation",
  FOOTER: "footer",
  BANNERS: "banners",
  FEATURED: "featured",
  DEALS: "deals",
} as const;

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

/**
 * Invalidate all product-related caches
 * Use when products are added, updated, or deleted
 */
export async function invalidateProducts() {
  revalidatePath("/", "layout");
  revalidatePath("/shop", "page");
  revalidatePath(`${CATEGORY_BASE_PATH}/[slug]`, "page");
}

/**
 * Invalidate a specific product's cache
 * Use when a single product is updated
 */
export async function invalidateProduct(
  productId: string,
  productSlug?: string
) {
  if (productSlug) {
    revalidatePath(`/product/${productSlug}`, "page");
  }
  revalidatePath("/shop", "page");
  revalidatePath("/", "layout");
}

/**
 * Invalidate product reviews cache
 * Use when reviews are added, updated, or deleted
 */
export async function invalidateProductReviews(
  productId: string,
  productSlug?: string
) {
  if (productSlug) {
    revalidatePath(`/product/${productSlug}`, "page");
  }
  revalidatePath("/shop", "page");
}

/**
 * Invalidate category-related caches
 * Use when categories are updated
 */
export async function invalidateCategory(categorySlug: string) {
  revalidatePath(buildCategoryUrl(categorySlug), "page");
  revalidatePath("/shop", "page");
  revalidatePath("/", "layout");
}

/**
 * Invalidate all categories cache
 * Use when category structure changes
 */
export async function invalidateAllCategories() {
  revalidatePath(`${CATEGORY_BASE_PATH}/[slug]`, "page");
  revalidatePath("/shop", "page");
  revalidatePath("/", "layout");
}

/**
 * Invalidate brand-related caches
 * Use when brands are updated
 */
export async function invalidateBrand(brandSlug: string) {
  revalidatePath(`/brand/${brandSlug}`, "page");
  revalidatePath("/shop", "page");
  revalidatePath("/", "layout");
}

/**
 * Invalidate user-specific caches
 * Use when user data changes (profile, preferences)
 */
export async function invalidateUser(userId: string) {
  revalidatePath("/user", "layout");
}

/**
 * Invalidate user's orders cache
 * Use when orders are created or updated
 */
export async function invalidateUserOrders(userId: string) {
  revalidatePath("/user/orders", "page");
  revalidatePath("/user", "layout");
}

/**
 * Invalidate specific order cache
 * Use when order status changes
 */
export async function invalidateOrder(orderId: string, userId?: string) {
  revalidatePath("/user/orders", "page");
  if (userId) {
    revalidatePath("/user", "layout");
  }
  // Invalidate admin/employee order views
  revalidatePath("/admin", "layout");
  revalidatePath("/employee", "layout");
}

/**
 * Invalidate user's wishlist cache
 * Use when items are added/removed from wishlist
 */
export async function invalidateUserWishlist(userId: string) {
  revalidatePath("/wishlist", "page");
  revalidatePath("/user", "layout");
}

/**
 * Invalidate user's cart cache
 * Use when cart items change
 */
export async function invalidateUserCart(userId: string) {
  revalidatePath("/cart", "page");
  revalidatePath("/", "layout"); // Header shows cart count
}

/**
 * Invalidate homepage cache
 * Use sparingly - only for major content updates
 */
export async function invalidateHomepage() {
  revalidatePath("/", "page");
}

/**
 * Invalidate blog-related caches
 * Use when blog posts are added or updated
 */
export async function invalidateBlog(blogSlug: string) {
  revalidatePath(`/blog/${blogSlug}`, "page");
  revalidatePath("/blog", "page");
  revalidatePath("/", "layout");
}

/**
 * Invalidate navigation cache
 * Use when menu structure changes
 */
export async function invalidateNavigation() {
  revalidatePath("/", "layout");
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/**
 * Get cache configuration for different content types
 * Returns optimized cache settings based on content volatility
 */
export const CACHE_CONFIG = {
  // Static content - cache for 1 hour
  STATIC: {
    revalidate: 3600,
  },

  // Homepage - cache for 5 minutes (dynamic content)
  HOMEPAGE: {
    revalidate: 300,
  },

  // Product listings - cache for 10 minutes
  PRODUCT_LIST: {
    revalidate: 600,
  },

  // Product details - cache for 30 minutes
  PRODUCT_DETAIL: {
    revalidate: 1800,
  },

  // Category pages - cache for 15 minutes
  CATEGORY: {
    revalidate: 900,
  },

  // Reviews - cache for 5 minutes (frequently updated)
  REVIEWS: {
    revalidate: 300,
  },

  // User-specific data - don't cache (always fresh)
  USER_DATA: {
    revalidate: 0,
  },

  // Orders - cache for 1 minute (near real-time)
  ORDERS: {
    revalidate: 60,
  },
} as const;

// ============================================================================
// COMPREHENSIVE INVALIDATION HELPERS
// ============================================================================

/**
 * Invalidate everything related to a product update
 * Comprehensive invalidation for product changes
 */
export async function invalidateProductUpdate(
  productSlug?: string,
  categorySlug?: string
) {
  if (productSlug) {
    revalidatePath(`/product/${productSlug}`, "page");
  }
  if (categorySlug) {
    revalidatePath(buildCategoryUrl(categorySlug), "page");
  }
  revalidatePath("/shop", "page");
  revalidatePath("/", "layout");
}

/**
 * Invalidate everything related to an order update
 * Comprehensive invalidation for order changes
 */
export async function invalidateOrderUpdate(
  userId: string,
  productSlugs?: string[]
) {
  revalidatePath("/user/orders", "page");
  revalidatePath("/admin", "layout");
  revalidatePath("/employee", "layout");

  // If products involved, invalidate their pages
  if (productSlugs && productSlugs.length > 0) {
    productSlugs.forEach((slug) => {
      revalidatePath(`/product/${slug}`, "page");
    });
  }
}
