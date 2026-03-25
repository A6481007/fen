import { unstable_cache } from "next/cache";
import { sanityFetch } from "../lib/live";
import { checkResourceAccess, isUserEventAttendee } from "../helpers";
import {
  ADDRESS_QUERY,
  ALL_PRODUCTS_QUERY,
  ALLCATEGORIES_QUERY,
  ADMIN_CATEGORIES_QUERY,
  BANNER_QUERY,
  BLOG_CATEGORIES,
  BRAND_QUERY,
  BRANDS_QUERY,
  DEAL_PRODUCTS,
  FEATURE_PRODUCTS,
  FEATURED_CATEGORY_QUERY,
  GET_ALL_BLOG,
  LATEST_BLOG_QUERY,
  OTHERS_BLOG_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  RELATED_PRODUCTS_QUERY,
  SINGLE_BLOG_QUERY,
  GET_ALL_NEWS,
  NEWS_DOWNLOADS_QUERY,
  NEWS_EVENTS_QUERY,
  NEWS_RESOURCES_QUERY,
  SINGLE_NEWS_QUERY,
  NEWS_ARTICLES_QUERY,
  RESOURCES_QUERY,
  DOWNLOADS_QUERY,
} from "./query";
import {
  NEWS_ARTICLE_BY_SLUG_QUERY,
  NEWS_RESOURCES_BY_ARTICLE_QUERY,
  NEWS_LINKED_EVENT_META_BY_SLUG_QUERY,
  NEWS_LINKED_EVENT_META_BY_ID_QUERY,
} from "./news";
import { getOrderById } from "./userQueries";
import { getAllResources, getResourcesBySource } from "./resources";
import { getEventBySlug, getEvents, getUserEventRegistrations } from "./events";
import { getCatalogCoverImage, getCatalogItemBySlug, getCatalogItems } from "./catalog";

// ============================================================================
// CACHED DATA FETCHERS - Next.js 16 Caching Revolution
// ============================================================================

// ============================================================================
// CACHED DATA FETCHERS - Next.js 16 Caching Revolution
// ============================================================================

const applyLimit = <T>(items: T[], limit?: number) =>
  typeof limit === "number" ? items.slice(0, Math.max(0, limit)) : items;

const NEWS_CACHE_REVALIDATE_SECONDS = 360;

const resolveNewsTagsBySlug = async (slug?: string | null) => {
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  const baseTags = ["news"];

  if (normalizedSlug) {
    baseTags.push(`news:${normalizedSlug}`);
  }

  if (!normalizedSlug) {
    return { tags: baseTags, linkedEventSlug: null };
  }

  const getLinkedEventSlug = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: NEWS_LINKED_EVENT_META_BY_SLUG_QUERY,
          params: { slug: normalizedSlug },
        });

        const linkedEventSlug =
          (data as { linkedEvent?: { slug?: string | null } } | null)?.linkedEvent?.slug || null;

        return typeof linkedEventSlug === "string" ? linkedEventSlug : null;
      } catch (error) {
        console.error("Error resolving linked event slug for news article:", {
          slug: normalizedSlug,
          error,
        });
        return null;
      }
    },
    ["news-linked-event-slug", normalizedSlug],
    { revalidate: NEWS_CACHE_REVALIDATE_SECONDS, tags: baseTags }
  );

  const linkedEventSlug = await getLinkedEventSlug();
  const tags = linkedEventSlug
    ? [...baseTags, "events", `event:${linkedEventSlug}`]
    : baseTags;

  return { tags, linkedEventSlug: linkedEventSlug || null };
};

const resolveNewsTagsByArticleId = async (articleId?: string | null) => {
  const normalizedArticleId = typeof articleId === "string" ? articleId.trim() : "";
  const baseTags = ["news"];

  if (normalizedArticleId) {
    baseTags.push(`news:${normalizedArticleId}`);
  }

  if (!normalizedArticleId) {
    return { tags: baseTags, linkedEventSlug: null };
  }

  const getLinkedEventSlug = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: NEWS_LINKED_EVENT_META_BY_ID_QUERY,
          params: { articleId: normalizedArticleId },
        });

        const linkedEventSlug =
          (data as { linkedEvent?: { slug?: string | null } } | null)?.linkedEvent?.slug || null;

        return typeof linkedEventSlug === "string" ? linkedEventSlug : null;
      } catch (error) {
        console.error("Error resolving linked event slug for news article ID:", {
          articleId: normalizedArticleId,
          error,
        });
        return null;
      }
    },
    ["news-linked-event-article-id", normalizedArticleId],
    { revalidate: NEWS_CACHE_REVALIDATE_SECONDS, tags: baseTags }
  );

  const linkedEventSlug = await getLinkedEventSlug();
  const tags = linkedEventSlug
    ? [...baseTags, "events", `event:${linkedEventSlug}`]
    : baseTags;

  return { tags, linkedEventSlug: linkedEventSlug || null };
};

/**
 * Get banner data - cached for 5 minutes
 * Banners change infrequently, safe to cache
 */
const getBanner = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({ query: BANNER_QUERY });
      return data ?? [];
    } catch (error) {
      console.error("Error fetching sale banner:", error);
      return [];
    }
  },
  ["banner"],
  { revalidate: 300, tags: ["homepage", "banners"] }
);

/**
 * Get featured categories - cached for 15 minutes
 * Featured categories are relatively static
 */
const getFeaturedCategory = unstable_cache(
  async (quantity: number) => {
    try {
      const { data } = await sanityFetch({
        query: FEATURED_CATEGORY_QUERY,
        params: { quantity },
      });
      return data ?? [];
    } catch (error) {
      console.error("Error fetching featured category:", error);
      return [];
    }
  },
  ["featured-categories"],
  { revalidate: 900, tags: ["categories", "featured", "homepage"] }
);

/**
 * Get all products - cached for 10 minutes
 * Product list updates moderately often
 */
const getAllProducts = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({ query: ALL_PRODUCTS_QUERY });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching all products:", error);
      return [];
    }
  },
  ["all-products"],
  { revalidate: 600, tags: ["products"] }
);

/**
 * Get deal products - cached for 5 minutes
 * Deals may change frequently
 */
const getDealProducts = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({ query: DEAL_PRODUCTS });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching deal products:", error);
      return [];
    }
  },
  ["deal-products"],
  { revalidate: 300, tags: ["products", "deals", "homepage"] }
);

/**
 * Get featured products - cached for 10 minutes
 * Featured products are manually curated
 */
const getFeaturedProducts = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({ query: FEATURE_PRODUCTS });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching featured products:", error);
      return [];
    }
  },
  ["featured-products"],
  { revalidate: 600, tags: ["products", "featured", "homepage"] }
);

/**
 * Get all brands - cached for 1 hour
 * Brand list rarely changes
 */
const getAllBrands = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({ query: BRANDS_QUERY });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching all brands:", error);
      return [];
    }
  },
  ["all-brands"],
  { revalidate: 3600, tags: ["brands"] }
);

/**
 * Get latest blogs - cached for 5 minutes
 * Blog content updates regularly
 */
const getLatestBlogs = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({ query: LATEST_BLOG_QUERY });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching latest blogs:", error);
      return [];
    }
  },
  ["latest-blogs"],
  { revalidate: 300, tags: ["blogs", "homepage"] }
);

/**
 * Get all blogs with limit - cached for 10 minutes
 */
const getAllBlogs = unstable_cache(
  async (quantity: number) => {
    try {
      const { data } = await sanityFetch({
        query: GET_ALL_BLOG,
        params: { quantity },
      });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching all blogs:", error);
      return [];
    }
  },
  ["all-blogs"],
  { revalidate: 600, tags: ["blogs"] }
);

/**
 * Get single blog by slug - cached for 30 minutes
 * Individual blog posts don't change often
 */
const getSingleBlog = unstable_cache(
  async (slug: string) => {
    try {
      const { data } = await sanityFetch({
        query: SINGLE_BLOG_QUERY,
        params: { slug },
      });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching blog:", error);
      return [];
    }
  },
  ["single-blog"],
  { revalidate: 1800, tags: ["blogs"] }
);

/**
 * Get blog categories - cached for 1 hour
 * Blog categories rarely change
 */
const getBlogCategories = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({
        query: BLOG_CATEGORIES,
      });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching blog categories:", error);
      return [];
    }
  },
  ["blog-categories"],
  { revalidate: 3600, tags: ["blogs"] }
);

/**
 * Get all news articles - cached for 5 minutes
 */
// Legacy blog/download pipeline retained during News/Catalog transition.
const getAllNews = unstable_cache(
  async (quantity: number = 12) => {
    try {
      const { data } = await sanityFetch({
        query: GET_ALL_NEWS,
        params: { quantity },
      });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching news articles:", error);
      return [];
    }
  },
  ["all-news"],
  { revalidate: 300, tags: ["news"] }
);

/**
 * Get news downloads - cached for 10 minutes
 */
// Legacy blog/download pipeline retained during News/Catalog transition.
const getNewsDownloads = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({
        query: NEWS_DOWNLOADS_QUERY,
      });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching news downloads:", error);
      return [];
    }
  },
  ["news-downloads"],
  { revalidate: 600, tags: ["news", "downloads"] }
);

/**
 * Get news events - cached for 5 minutes
 */
// Legacy blog/download pipeline retained during News/Catalog transition.
const getNewsEvents = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({
        query: NEWS_EVENTS_QUERY,
      });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching news events:", error);
      return [];
    }
  },
  ["news-events"],
  { revalidate: 300, tags: ["news", "events"] }
);

/**
 * Get news resources - cached for 10 minutes
 */
// Legacy blog/download pipeline retained during News/Catalog transition.
const getNewsResources = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({
        query: NEWS_RESOURCES_QUERY,
      });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching news resources:", error);
      return [];
    }
  },
  ["news-resources"],
  { revalidate: 600, tags: ["news", "resources"] }
);

/**
 * Get single news article by slug - cached for 30 minutes
 */
// Legacy blog/download pipeline retained during News/Catalog transition.
const getSingleNews = async (slug: string) => {
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  const cacheKey = ["single-news", normalizedSlug || slug || ""];
  const tags = normalizedSlug ? ["news", `news:${normalizedSlug}`] : ["news"];

  const fetchSingleNews = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: SINGLE_NEWS_QUERY,
          params: { slug: normalizedSlug || slug },
        });
        return data ?? null;
      } catch (error) {
        console.log("Error fetching news article:", error);
        return null;
      }
    },
    cacheKey,
    { revalidate: 1800, tags }
  );

  return fetchSingleNews();
};

/**
 * Get News hub articles - cached for 5 minutes
 */
// Legacy blog/download pipeline retained during News/Catalog transition.
const getNewsArticles = unstable_cache(
  async (limit?: number) => {
    try {
      const { data } = await sanityFetch({
        query: NEWS_ARTICLES_QUERY,
      });
      const articles = data ?? [];
      return applyLimit(articles, limit);
    } catch (error) {
      console.log("Error fetching news hub articles:", error);
      return [];
    }
  },
  ["news-hub-articles"],
  { revalidate: 300, tags: ["news", "articles"] }
);

/**
 * Get a news article from the new `news` schema with gated attachments.
 */
const getNewsArticleBySlug = async (slug: string, userId?: string | null) => {
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  if (!normalizedSlug) {
    return null;
  }

  const { tags } = await resolveNewsTagsBySlug(normalizedSlug);

  const fetchArticle = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: NEWS_ARTICLE_BY_SLUG_QUERY,
          params: { slug: normalizedSlug },
        });

        if (!data) {
          return null;
        }

        const linkedEvent = (data as { linkedEvent?: unknown } | null)?.linkedEvent || null;
        const isAttendee = linkedEvent && (await isUserEventAttendee(userId, linkedEvent as any));

        const attachments = Array.isArray((data as { attachments?: unknown[] }).attachments)
          ? ((data as { attachments: unknown[] }).attachments as unknown[])
          : [];

        const attachmentsWithAccess = await Promise.all(
          attachments.map(async (attachment) => {
            const access = await checkResourceAccess(
              attachment as any,
              linkedEvent as any,
              userId,
              { attendanceOverride: Boolean(isAttendee) }
            );

            if (!access.isVisible) {
              return null;
            }

            return { ...(attachment as Record<string, unknown>), access };
          })
        );

        return {
          ...data,
          linkedEvent,
          attachments: attachmentsWithAccess.filter(Boolean),
        };
      } catch (error) {
        console.error("Error fetching news article:", {
          slug: normalizedSlug,
          userId,
          error,
        });
        return null;
      }
    },
    ["news-article-by-slug", normalizedSlug, userId ?? ""],
    { revalidate: NEWS_CACHE_REVALIDATE_SECONDS, tags }
  );

  return fetchArticle();
};

/**
 * Get gated attachments for a news article by ID (new `news` schema).
 */
const getNewsResourcesByArticle = async (articleId: string, userId?: string | null) => {
  const normalizedArticleId = typeof articleId === "string" ? articleId.trim() : "";
  if (!normalizedArticleId) {
    return null;
  }

  const { tags } = await resolveNewsTagsByArticleId(normalizedArticleId);

  const fetchResources = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: NEWS_RESOURCES_BY_ARTICLE_QUERY,
          params: { articleId: normalizedArticleId },
        });

        if (!data) {
          return null;
        }

        const linkedEvent = (data as { linkedEvent?: unknown } | null)?.linkedEvent || null;
        const isAttendee = linkedEvent && (await isUserEventAttendee(userId, linkedEvent as any));

        const attachments = Array.isArray((data as { attachments?: unknown[] }).attachments)
          ? ((data as { attachments: unknown[] }).attachments as unknown[])
          : [];

        const attachmentsWithAccess = await Promise.all(
          attachments.map(async (attachment) => {
            const access = await checkResourceAccess(
              attachment as any,
              linkedEvent as any,
              userId,
              { attendanceOverride: Boolean(isAttendee) }
            );

            if (!access.isVisible) {
              return null;
            }

            return { ...(attachment as Record<string, unknown>), access };
          })
        );

        return {
          ...data,
          linkedEvent,
          attachments: attachmentsWithAccess.filter(Boolean),
        };
      } catch (error) {
        console.error("Error fetching news resources by article:", {
          articleId: normalizedArticleId,
          userId,
          error,
        });
        return null;
      }
    },
    ["news-resources-by-article", normalizedArticleId, userId ?? ""],
    { revalidate: NEWS_CACHE_REVALIDATE_SECONDS, tags }
  );

  return fetchResources();
};

/**
 * Get resources for News hub - cached for 10 minutes
 */
// Legacy blog/download pipeline retained during News/Catalog transition.
const getResources = unstable_cache(
  async (limit?: number) => {
    try {
      const { data } = await sanityFetch({
        query: RESOURCES_QUERY,
      });
      const resources = data ?? [];
      return applyLimit(resources, limit);
    } catch (error) {
      console.log("Error fetching news hub resources:", error);
      return [];
    }
  },
  ["news-hub-resources"],
  { revalidate: 600, tags: ["news", "resources"] }
);

/**
 * Get downloads for News hub - cached for 10 minutes
 */
// Legacy blog/download pipeline retained during News/Catalog transition.
const getDownloads = unstable_cache(
  async (limit?: number) => {
    try {
      const { data } = await sanityFetch({
        query: DOWNLOADS_QUERY,
      });
      const downloads = data ?? [];
      return applyLimit(downloads, limit);
    } catch (error) {
      console.log("Error fetching news hub downloads:", error);
      return [];
    }
  },
  ["news-hub-downloads"],
  { revalidate: 600, tags: ["news", "downloads"] }
);

/**
 * Get other blogs (excluding current) - cached for 10 minutes
 */
const getOthersBlog = unstable_cache(
  async (slug: string, quantity: number) => {
    try {
      const { data } = await sanityFetch({
        query: OTHERS_BLOG_QUERY,
        params: { slug, quantity },
      });
      return data ?? [];
    } catch (error) {
      console.log("Error fetching other blogs:", error);
      return [];
    }
  },
  ["others-blog"],
  { revalidate: 600, tags: ["blogs"] }
);

/**
 * Get addresses - not cached (user-specific data)
 */
const getAddresses = async () => {
  try {
    const { data } = await sanityFetch({
      query: ADDRESS_QUERY,
    });
    return data ?? [];
  } catch (error) {
    console.log("Error fetching address:", error);
    return [];
  }
};

/**
 * Get categories - cached for 15 minutes
 * Category structure is relatively static
 */
const getCategories = unstable_cache(
  async (quantity?: number) => {
    try {
      const query = quantity
        ? `*[_type == 'category'] | order(name asc) [0...$quantity] {
            ...,
            "productCount": count(*[_type == "product" && references(^._id)])
          }`
        : `*[_type == 'category'] | order(name asc) {
            ...,
            "productCount": count(*[_type == "product" && references(^._id)])
          }`;

      const { data } = await sanityFetch({
        query,
        params: quantity ? { quantity } : {},
      });

      return data ?? [];
    } catch (error) {
      console.log("Error fetching categories with product count:", error);
      return [];
    }
  },
  ["categories-list"],
  { revalidate: 900, tags: ["categories", "navigation"] }
);

/**
 * Get admin categories - not cached (admin data needs to be fresh)
 */
const getAdminCategories = async () => {
  try {
    const { data } = await sanityFetch({ query: ADMIN_CATEGORIES_QUERY });
    return data ?? [];
  } catch (error) {
    console.error("Error fetching admin categories:", error);
    return [];
  }
};

/**
 * Get product by slug - cached for 30 minutes
 * Product details don't change frequently
 */
const getProductBySlug = unstable_cache(
  async (slug: string) => {
    try {
      const product = await sanityFetch({
        query: PRODUCT_BY_SLUG_QUERY,
        params: {
          slug,
        },
      });
      return product?.data || null;
    } catch (error) {
      console.error("Error fetching product by slug:", error);
      return null;
    }
  },
  ["product-by-slug"],
  { revalidate: 1800, tags: ["products", "reviews"] }
);

/**
 * Get brand by slug - cached for 30 minutes
 * Brand info rarely changes
 */
const getBrand = unstable_cache(
  async (slug: string) => {
    try {
      const product = await sanityFetch({
        query: BRAND_QUERY,
        params: {
          slug,
        },
      });
      return product?.data || null;
    } catch (error) {
      console.error("Error fetching brand by slug:", error);
      return null;
    }
  },
  ["brand-by-slug"],
  { revalidate: 1800, tags: ["brands"] }
);

/**
 * Get related products - cached for 15 minutes
 * Related products are dynamic but can be cached briefly
 */
const getRelatedProducts = unstable_cache(
  async (categoryIds: string[], currentSlug: string, limit: number = 4) => {
    try {
      const { data } = await sanityFetch({
        query: RELATED_PRODUCTS_QUERY,
        params: {
          categoryIds,
          currentSlug,
          limit,
        },
      });
      return data ?? [];
    } catch (error) {
      console.error("Error fetching related products:", error);
      return [];
    }
  },
  ["related-products"],
  { revalidate: 900, tags: ["products"] }
);

export {
  getBanner,
  getFeaturedCategory,
  getAllProducts,
  getDealProducts,
  getFeaturedProducts,
  getAllBrands,
  getLatestBlogs,
  getSingleBlog,
  getAllBlogs,
  getBlogCategories,
  getOthersBlog,
  getAddresses,
  getCategories,
  getAdminCategories,
  getProductBySlug,
  getBrand,
  getRelatedProducts,
  getOrderById,
  getAllNews,
  getNewsDownloads,
  getNewsEvents,
  getNewsResources,
  getSingleNews,
  getNewsArticleBySlug,
  getNewsResourcesByArticle,
  getAllResources,
  getResourcesBySource,
  getNewsArticles,
  getEventBySlug,
  getEvents,
  getUserEventRegistrations,
  getResources,
  getDownloads,
  getCatalogItems,
  getCatalogItemBySlug,
  getCatalogCoverImage,
};
