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
  RESOURCES_QUERY,
  DOWNLOADS_QUERY,
  CATEGORY_BY_SLUG_QUERY,
  PRICING_SETTINGS_QUERY,
} from "./query";
import {
  NEWS_ARTICLES_QUERY,
  NEWS_ARTICLES_QUERY_BY_SORT,
  NEWS_ARTICLE_BY_SLUG_QUERY,
  NEWS_RESOURCES_BY_ARTICLE_QUERY,
  NEWS_LINKED_EVENT_META_BY_SLUG_QUERY,
  NEWS_LINKED_EVENT_META_BY_ID_QUERY,
  type NewsArticlesSort,
} from "./news";
import { getOrderById } from "./userQueries";
import { getAllResources, getResourcesBySource } from "./resources";
import { getEventBySlug, getEvents, getUserEventRegistrations } from "./events";
import { getCatalogCoverImage, getCatalogItemBySlug, getCatalogItems } from "./catalog";
import { DEALS_BY_TYPE_QUERY, DEAL_BY_ID_QUERY, DEALS_LIST_QUERY, HOMEPAGE_DEALS_QUERY } from "./deals";
import { client as sanityClient } from "../lib/client";
import {
  ACTIVE_FLASH_SALES_QUERY,
  PROMOTIONS_LIST_QUERY,
  PROMOTION_BY_CAMPAIGN_ID_QUERY,
  PROMOTION_BY_SLUG_QUERY,
  PROMOTIONS_BY_SEGMENT_QUERY,
  PROMOTIONS_BY_TYPE_QUERY,
  PROMOTIONS_FOR_CATEGORY_QUERY,
  PROMOTIONS_FOR_PRODUCT_QUERY,
} from "./promotions";
import type {
  ACTIVE_FLASH_SALES_QUERYResult,
  PROMOTIONS_LIST_QUERYResult,
  PROMOTION_BY_CAMPAIGN_ID_QUERYResult,
  PROMOTION_BY_SLUG_QUERYResult,
  PROMOTIONS_BY_SEGMENT_QUERYResult,
  PROMOTIONS_BY_TYPE_QUERYResult,
  PROMOTIONS_FOR_CATEGORY_QUERYResult,
  PROMOTIONS_FOR_PRODUCT_QUERYResult,
} from "../../sanity.types";

// ============================================================================
// CACHED DATA FETCHERS - Next.js 16 Caching Revolution
// ============================================================================

// ============================================================================
// CACHED DATA FETCHERS - Next.js 16 Caching Revolution
// ============================================================================

const applyLimit = <T>(items: T[], limit?: number) =>
  typeof limit === "number" ? items.slice(0, Math.max(0, limit)) : items;

const NEWS_CACHE_REVALIDATE_SECONDS = 360;
const NEWS_DEFAULT_LIMIT = 12;
const NEWS_MAX_LIMIT = 50;

const normalizeNewsLimit = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return NEWS_DEFAULT_LIMIT;
  }

  const integer = Math.floor(value);
  if (integer <= 0) {
    return NEWS_DEFAULT_LIMIT;
  }

  return Math.min(integer, NEWS_MAX_LIMIT);
};

const normalizeNewsOffset = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  const integer = Math.floor(value);
  return integer > 0 ? integer : 0;
};

const normalizeNewsSort = (value?: string | null): NewsArticlesSort => {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase().replace(/-/g, "_") : "";

  if (normalized === "oldest") return "oldest";
  if (normalized === "most_viewed") return "most_viewed";
  if (normalized === "mostviewed") return "most_viewed";

  return "newest";
};

const buildNewsSearchTerm = (value?: string | null) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return "";
  }

  return `*${normalized.replace(/\s+/g, " ")}*`;
};

const buildNewsPaginationMeta = (
  totalCount: number,
  limit: number,
  offset: number,
  itemCount: number
) => {
  const safeTotal = Number.isFinite(totalCount) ? Math.max(0, totalCount) : 0;
  const totalPages = safeTotal > 0 ? Math.ceil(safeTotal / limit) : 0;
  const currentPage = safeTotal > 0 ? Math.floor(offset / limit) + 1 : 1;
  const hasNextPage = offset + itemCount < safeTotal;
  const hasPrevPage = offset > 0 && safeTotal > 0;

  return { totalPages, currentPage, hasNextPage, hasPrevPage };
};

const normalizeLinkedEvent = (value?: string | null) =>
  typeof value === "string" ? value.trim() : "";

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

type PricingSettings = {
  userMarkupPercent: number;
  vatPercent?: number;
};

const DEFAULT_PRICING: PricingSettings = {
  userMarkupPercent: 30,
  vatPercent: 0,
};

const getPricingSettings = unstable_cache(
  async (): Promise<PricingSettings> => {
    try {
      const { data } = await sanityFetch({ query: PRICING_SETTINGS_QUERY });
      const markup = Number(
        (data as { userMarkupPercent?: number } | null)?.userMarkupPercent
      );
      const vat = Number((data as { vatPercent?: number } | null)?.vatPercent);

      return {
        userMarkupPercent: Number.isFinite(markup)
          ? markup
          : DEFAULT_PRICING.userMarkupPercent,
        vatPercent: Number.isFinite(vat) ? vat : DEFAULT_PRICING.vatPercent,
      };
    } catch (error) {
      console.error("Error fetching pricing settings:", error);
      return DEFAULT_PRICING;
    }
  },
  ["pricing-settings"],
  { revalidate: 300, tags: ["pricing-settings"] }
);

const asNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const applyPricingToProduct = (
  product: Record<string, any>,
  settings: PricingSettings
) => {
  const markup = settings?.userMarkupPercent ?? DEFAULT_PRICING.userMarkupPercent;
  const markupMultiplier = 1 + markup / 100;

  const dealerFromDoc = asNumber((product as any)?.dealerPrice);
  const userFromDoc = asNumber((product as any)?.price);

  const dealerPrice =
    dealerFromDoc ??
    (userFromDoc && markupMultiplier > 0
      ? userFromDoc / markupMultiplier
      : undefined);

  const userPrice =
    userFromDoc ??
    (dealerFromDoc !== undefined ? dealerFromDoc * markupMultiplier : undefined);

  return {
    ...product,
    dealerPrice: dealerPrice ?? 0,
    price: userPrice ?? 0,
    userPrice: userPrice ?? 0,
    userMarkupPercent: markup,
  };
};

const applyPricingToProducts = (
  products: Array<Record<string, any>>,
  settings: PricingSettings
) => products.map((product) => applyPricingToProduct(product, settings));

const resolveNewsTagsByArticleId = async (articleId?: string | null) => {
  const normalizedArticleId = typeof articleId === "string" ? articleId.trim() : "";
  const baseTags = ["news"];

  if (normalizedArticleId) {
    baseTags.push(`news:${normalizedArticleId}`);
  }

  if (!normalizedArticleId) {
    return { tags: baseTags, linkedEventSlug: null };
  }

  const getNewsMetaById = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: NEWS_LINKED_EVENT_META_BY_ID_QUERY,
          params: { articleId: normalizedArticleId },
        });

        const articleSlug =
          typeof (data as { slug?: string | null } | null)?.slug === "string"
            ? (data as { slug: string }).slug
            : null;

        const linkedEventSlug =
          (data as { linkedEvent?: { slug?: string | null } } | null)?.linkedEvent?.slug || null;

        return {
          articleSlug: typeof articleSlug === "string" ? articleSlug : null,
          linkedEventSlug: typeof linkedEventSlug === "string" ? linkedEventSlug : null,
        };
      } catch (error) {
        console.error("Error resolving linked event slug for news article ID:", {
          articleId: normalizedArticleId,
          error,
        });
        return { articleSlug: null, linkedEventSlug: null };
      }
    },
    ["news-linked-event-article-id", normalizedArticleId],
    { revalidate: NEWS_CACHE_REVALIDATE_SECONDS, tags: baseTags }
  );

  const { articleSlug, linkedEventSlug } = await getNewsMetaById();

  const tagsSet = new Set(baseTags);

  if (articleSlug) {
    tagsSet.add(`news:${articleSlug}`);
  }

  if (linkedEventSlug) {
    tagsSet.add("events");
    tagsSet.add(`event:${linkedEventSlug}`);
  }

  const tags = Array.from(tagsSet);

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
      const [pricingSettings, response] = await Promise.all([
        getPricingSettings(),
        sanityFetch({ query: ALL_PRODUCTS_QUERY }),
      ]);
      const products = (response?.data as Array<Record<string, any>>) ?? [];
      return applyPricingToProducts(products, pricingSettings);
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
      const [pricingSettings, response] = await Promise.all([
        getPricingSettings(),
        sanityFetch({ query: DEAL_PRODUCTS }),
      ]);
      const products = (response?.data as Array<Record<string, any>>) ?? [];
      return applyPricingToProducts(products, pricingSettings);
    } catch (error) {
      console.log("Error fetching deal products:", error);
      return [];
    }
  },
  ["deal-products"],
  { revalidate: 300, tags: ["products", "deals", "homepage"] }
);

/**
 * Get deals - cached for 2 minutes
 * Supports optional type filtering
 */
const getDeals = unstable_cache(
  async (options?: { type?: string }) => {
    const normalizedType = typeof options?.type === "string" ? options.type.trim() : "";

    try {
      const { data } = await sanityFetch({
        query: normalizedType ? DEALS_BY_TYPE_QUERY : DEALS_LIST_QUERY,
        ...(normalizedType ? { params: { dealType: normalizedType } } : {}),
      });

      return (data as Array<Record<string, any>>) ?? [];
    } catch (error) {
      console.error("Error fetching deals:", { type: normalizedType || undefined, error });
      return [];
    }
  },
  ["deals"],
  { revalidate: 120, tags: ["deals"] }
);

/**
 * Get single deal by ID - cached for 2 minutes
 */
const getDealById = unstable_cache(
  async (dealId: string) => {
    const normalizedDealId = typeof dealId === "string" ? dealId.trim() : "";

    if (!normalizedDealId) {
      return null;
    }

    try {
      const { data } = await sanityFetch({
        query: DEAL_BY_ID_QUERY,
        params: { dealId: normalizedDealId },
      });

      return data ?? null;
    } catch (error) {
      console.error("Error fetching deal by ID:", { dealId: normalizedDealId, error });
      return null;
    }
  },
  ["deal-by-id"],
  { revalidate: 120, tags: ["deals"] }
);

/**
 * Get homepage deals - cached for 1 minute
 */
const getHomepageDeals = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({ query: HOMEPAGE_DEALS_QUERY });
      return data ?? [];
    } catch (error) {
      console.error("Error fetching homepage deals:", error);
      return [];
    }
  },
  ["homepage-deals"],
  { revalidate: 60, tags: ["deals", "homepage"] }
);

/**
 * Transition helper: merge new deals with legacy hot products.
 * Deals take precedence when product IDs overlap.
 */
const getDealsAndLegacyHotProducts = unstable_cache(
  async () => {
    try {
      const [deals, legacyHotProducts] = await Promise.all([getDeals(), getDealProducts()]);
      const seenProductIds = new Set<string>();
      const merged: Array<Record<string, any>> = [];

      (deals ?? []).forEach((deal) => {
        const productId =
          typeof (deal as any)?.product?._id === "string" ? (deal as any).product._id : null;

        if (productId) {
          seenProductIds.add(productId);
        }

        merged.push({ ...deal, source: "deal" as const });
      });

      (legacyHotProducts ?? []).forEach((product) => {
        const productId = typeof (product as any)?._id === "string" ? (product as any)._id : null;

        if (productId && seenProductIds.has(productId)) {
          return;
        }

        if (productId) {
          seenProductIds.add(productId);
        }

        merged.push({ product, source: "legacy" as const });
      });

      return merged;
    } catch (error) {
      console.error("Error merging deals with legacy hot products:", error);
      return [];
    }
  },
  ["deals-with-legacy-hot-products"],
  { revalidate: 120, tags: ["deals", "products", "homepage"] }
);

/**
 * Get featured products - cached for 10 minutes
 * Featured products are manually curated
 */
const getFeaturedProducts = unstable_cache(
  async () => {
    try {
      const [pricingSettings, response] = await Promise.all([
        getPricingSettings(),
        sanityFetch({ query: FEATURE_PRODUCTS }),
      ]);
      const products = (response?.data as Array<Record<string, any>>) ?? [];
      return applyPricingToProducts(products, pricingSettings);
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
 * Get News hub articles - cached for ~6 minutes with pagination metadata.
 */
type GetNewsArticlesOptions = {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: string | null;
  linkedEvent?: string | null;
};

const getNewsArticles = async (
  categoryOrOptions?: string | GetNewsArticlesOptions,
  search?: string,
  limit?: number,
  offset?: number,
  sort?: string | null
) => {
  const options: GetNewsArticlesOptions =
    typeof categoryOrOptions === "object" && categoryOrOptions !== null
      ? categoryOrOptions
      : {
          category: categoryOrOptions as string | undefined,
          search,
          limit,
          offset,
          sort,
        };

  const normalizedCategory = typeof options.category === "string" ? options.category.trim() : "";
  const searchTerm = buildNewsSearchTerm(options.search);
  const normalizedLimit = normalizeNewsLimit(options.limit);
  const normalizedOffset = normalizeNewsOffset(options.offset);
  const normalizedSort = normalizeNewsSort(options.sort);
  const normalizedLinkedEvent = normalizeLinkedEvent(options.linkedEvent);
  const rangeEnd = normalizedOffset + normalizedLimit;

  const cacheKey = [
    "news-articles",
    normalizedCategory || "all",
    searchTerm || "all",
    `limit:${normalizedLimit}`,
    `offset:${normalizedOffset}`,
    normalizedSort,
    normalizedLinkedEvent || "no-event",
  ];

  const newsQuery = NEWS_ARTICLES_QUERY_BY_SORT[normalizedSort] ?? NEWS_ARTICLES_QUERY;

  const fetchNewsArticles = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: newsQuery,
          params: {
            category: normalizedCategory,
            searchTerm,
            offset: normalizedOffset,
            rangeEnd,
            linkedEvent: normalizedLinkedEvent,
          },
        });

        const items = Array.isArray((data as { items?: unknown[] } | null)?.items)
          ? ((data as { items: unknown[] }).items ?? [])
          : [];

        const totalCount =
          typeof (data as { totalCount?: number } | null)?.totalCount === "number"
            ? (data as { totalCount: number }).totalCount
            : 0;

        const pagination = buildNewsPaginationMeta(
          totalCount,
          normalizedLimit,
          normalizedOffset,
          items.length
        );

        return {
          items,
          totalCount,
          limit: normalizedLimit,
          offset: normalizedOffset,
          sort: normalizedSort,
          ...pagination,
        };
      } catch (error) {
        console.error("Error fetching news hub articles:", {
          category: normalizedCategory,
          search: options.search,
          sort: normalizedSort,
          linkedEvent: normalizedLinkedEvent,
          error,
        });
        return {
          items: [],
          totalCount: 0,
          limit: normalizedLimit,
          offset: normalizedOffset,
          sort: normalizedSort,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPrevPage: false,
        };
      }
    },
    cacheKey,
    { revalidate: NEWS_CACHE_REVALIDATE_SECONDS, tags: ["news"] }
  );

  return fetchNewsArticles();
};

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

            const attachmentRecord = (attachment || {}) as Record<string, unknown>;

            return { ...attachmentRecord, access };
          })
        );

        return {
          ...data,
          linkedEvent,
          attachments: attachmentsWithAccess,
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

            const attachmentRecord = (attachment || {}) as Record<string, unknown>;

            return { ...attachmentRecord, access };
          })
        );

        return {
          ...data,
          linkedEvent,
          attachments: attachmentsWithAccess,
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
/** @deprecated Use catalog queries (e.g., getCatalogItems); downloads now live under /catalog. */
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
        ? `*[_type == 'category' && isActive != false] | order(coalesce(displayOrder, 0) asc, title asc) [0...$quantity] {
            ...,
            isParentCategory,
            parentCategory->{_id,title,slug,isParentCategory,depth},
            depth,
            "productCount": count(*[_type == "product" && ^._id in categories[]._ref]),
            "subCategoryCount": count(*[_type == "category" && parentCategory._ref == ^._id])
          }`
        : `*[_type == 'category' && isActive != false] | order(coalesce(displayOrder, 0) asc, title asc) {
            ...,
            isParentCategory,
            parentCategory->{_id,title,slug,isParentCategory,depth},
            depth,
            "productCount": count(*[_type == "product" && ^._id in categories[]._ref]),
            "subCategoryCount": count(*[_type == "category" && parentCategory._ref == ^._id])
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
 * Get root/parent categories for navigation - cached for 15 minutes
 */
const getRootCategoriesForNav = unstable_cache(
  async () => {
    try {
      const { data } = await sanityFetch({
        query: `*[_type == 'category' && isActive != false && (isParentCategory == true || !defined(parentCategory))] | order(coalesce(displayOrder, 0) asc, title asc) {
          _id,
          title,
          slug,
          isParentCategory,
          depth,
          description,
          image,
          "productCount": count(*[_type == "product" && ^._id in categories[]._ref]),
          "subCategoryCount": count(*[_type == "category" && parentCategory._ref == ^._id])
        }`,
      });

      return data ?? [];
    } catch (error) {
      console.error("Error fetching root categories for navigation:", error);
      return [];
    }
  },
  ["root-categories-nav"],
  { revalidate: 900, tags: ["categories", "navigation"] }
);

/**
 * Get category by slug - cached for 15 minutes
 */
const getCategoryBySlug = unstable_cache(
  async (slug: string) => {
    try {
      const { data } = await sanityFetch({
        query: CATEGORY_BY_SLUG_QUERY,
        params: { slug },
      });
      return data ?? null;
    } catch (error) {
      console.error("Error fetching category by slug:", { slug, error });
      return null;
    }
  },
  ["category-by-slug"],
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
      const [pricingSettings, response] = await Promise.all([
        getPricingSettings(),
        sanityFetch({
          query: PRODUCT_BY_SLUG_QUERY,
          params: {
            slug,
          },
        }),
      ]);
      const product = response?.data || null;
      return product ? applyPricingToProduct(product as Record<string, any>, pricingSettings) : null;
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
      const [pricingSettings, response] = await Promise.all([
        getPricingSettings(),
        sanityFetch({
          query: RELATED_PRODUCTS_QUERY,
          params: {
            categoryIds,
            currentSlug,
            limit,
          },
        }),
      ]);
      const products = (response?.data as Array<Record<string, any>>) ?? [];
      return applyPricingToProducts(products, pricingSettings);
    } catch (error) {
      console.error("Error fetching related products:", error);
      return [];
    }
  },
  ["related-products"],
  { revalidate: 900, tags: ["products"] }
);

const CACHE_TAGS = {
  promotions: "promotions",
  promotion: (id: string) => `promotion:${id}`,
  promotionsByType: (type: string) => `promotions:type:${type}`,
  promotionsBySegment: (segment: string) => `promotions:segment:${segment}`,
};

interface FetcherOptions {
  preview?: boolean;
  revalidate?: number | false;
  tags?: string[];
}

const DEFAULT_PROMOTION_REVALIDATE_SECONDS = 120;

const normalizeInput = (value?: string | null) => (typeof value === "string" ? value.trim() : "");

const mergeTags = (...tagGroups: (string[] | undefined)[]) =>
  Array.from(
    new Set(
      tagGroups
        .flatMap((group) => group ?? [])
        .filter((tag): tag is string => typeof tag === "string" && Boolean(tag))
    )
  );

const getPromotionsClient = (preview?: boolean) => {
  if (!preview) {
    return sanityClient;
  }

  return sanityClient.withConfig({
    token: process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN,
    useCdn: false,
    perspective: "previewDrafts",
  });
};

const buildPromotionFetchOptions = (options: FetcherOptions | undefined, baseTags: string[]) => {
  const tags = mergeTags(baseTags, options?.tags);
  const skipCache = Boolean(options?.preview || options?.revalidate === false);
  const revalidate =
    typeof options?.revalidate === "number" && !Number.isNaN(options.revalidate)
      ? options.revalidate
      : DEFAULT_PROMOTION_REVALIDATE_SECONDS;

  if (skipCache) {
    return tags.length ? { cache: "no-store", next: { tags } } : { cache: "no-store" };
  }

  return {
    next: {
      revalidate,
      tags,
    },
  };
};

const fetchPromotionQuery = async <T>(
  query: string,
  params: Record<string, unknown>,
  options?: FetcherOptions,
  baseTags: string[] = [CACHE_TAGS.promotions]
): Promise<T> => {
  const client = getPromotionsClient(options?.preview);
  const fetchOptions = buildPromotionFetchOptions(options, baseTags);

  return client.fetch<T>(query, params, fetchOptions);
};

const dedupePromotions = <T extends { campaignId?: string | null; _id?: string | null }>(
  promotions: T[] | null | undefined
): T[] => {
  const seen = new Set<string>();
  return (promotions ?? []).filter((promo) => {
    const key = promo?.campaignId || promo?._id;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getPromotions = async (
  options?: FetcherOptions
): Promise<PROMOTIONS_LIST_QUERYResult> => {
  try {
    const promotions = await fetchPromotionQuery<PROMOTIONS_LIST_QUERYResult>(
      PROMOTIONS_LIST_QUERY,
      {},
      options,
      [CACHE_TAGS.promotions]
    );
    return dedupePromotions(promotions);
  } catch (error) {
    console.error("Error fetching promotions:", error);
    return [];
  }
};

const getActivePromotions = async (
  options?: FetcherOptions
): Promise<PROMOTIONS_LIST_QUERYResult> => {
  const promotions = await getPromotions(options);
  return dedupePromotions(promotions.filter((promotion) => Boolean(promotion.isActive)));
};

const getPromotionByCampaignId = async (
  campaignId: string,
  options?: FetcherOptions
): Promise<PROMOTION_BY_CAMPAIGN_ID_QUERYResult | null> => {
  const normalizedCampaignId = normalizeInput(campaignId);
  if (!normalizedCampaignId) {
    return null;
  }

  try {
    const promotion = await fetchPromotionQuery<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>(
      PROMOTION_BY_CAMPAIGN_ID_QUERY,
      { campaignId: normalizedCampaignId },
      options,
      [CACHE_TAGS.promotions, CACHE_TAGS.promotion(normalizedCampaignId)]
    );
    return promotion || null;
  } catch (error) {
    console.error("Error fetching promotion by campaign ID:", {
      campaignId: normalizedCampaignId,
      error,
    });
    return null;
  }
};

const getPromotionBySlug = async (
  slug: string,
  options?: FetcherOptions
): Promise<PROMOTION_BY_SLUG_QUERYResult | null> => {
  const normalizedSlug = normalizeInput(slug);
  if (!normalizedSlug) {
    return null;
  }

  try {
    const promotion = await fetchPromotionQuery<PROMOTION_BY_SLUG_QUERYResult>(
      PROMOTION_BY_SLUG_QUERY,
      { slug: normalizedSlug },
      options,
      [CACHE_TAGS.promotions, CACHE_TAGS.promotion(normalizedSlug)]
    );
    return promotion || null;
  } catch (error) {
    console.error("Error fetching promotion by slug:", { slug: normalizedSlug, error });
    return null;
  }
};

const getPromotionsByType = async (
  type: string,
  options?: FetcherOptions
): Promise<PROMOTIONS_BY_TYPE_QUERYResult> => {
  const normalizedType = normalizeInput(type);
  if (!normalizedType) {
    return [];
  }

  try {
    const promotions = await fetchPromotionQuery<PROMOTIONS_BY_TYPE_QUERYResult>(
      PROMOTIONS_BY_TYPE_QUERY,
      { type: normalizedType },
      options,
      [CACHE_TAGS.promotions, CACHE_TAGS.promotionsByType(normalizedType)]
    );
    return dedupePromotions(promotions);
  } catch (error) {
    console.error("Error fetching promotions by type:", { type: normalizedType, error });
    return [];
  }
};

const getPromotionsBySegment = async (
  segment: string,
  options?: FetcherOptions
): Promise<PROMOTIONS_BY_SEGMENT_QUERYResult> => {
  const normalizedSegment = normalizeInput(segment);
  if (!normalizedSegment) {
    return [];
  }

  try {
    const promotions = await fetchPromotionQuery<PROMOTIONS_BY_SEGMENT_QUERYResult>(
      PROMOTIONS_BY_SEGMENT_QUERY,
      { segment: normalizedSegment },
      options,
      [CACHE_TAGS.promotions, CACHE_TAGS.promotionsBySegment(normalizedSegment)]
    );
    return dedupePromotions(promotions);
  } catch (error) {
    console.error("Error fetching promotions by segment:", {
      segment: normalizedSegment,
      error,
    });
    return [];
  }
};

const getPromotionsForProduct = async (
  productId: string,
  options?: FetcherOptions
): Promise<PROMOTIONS_FOR_PRODUCT_QUERYResult> => {
  const normalizedProductId = normalizeInput(productId);
  if (!normalizedProductId) {
    return [];
  }

  try {
    const promotions = await fetchPromotionQuery<PROMOTIONS_FOR_PRODUCT_QUERYResult>(
      PROMOTIONS_FOR_PRODUCT_QUERY,
      { productId: normalizedProductId },
      options
    );
    return dedupePromotions(promotions);
  } catch (error) {
    console.error("Error fetching promotions for product:", {
      productId: normalizedProductId,
      error,
    });
    return [];
  }
};

const getPromotionsForCategory = async (
  categoryId: string,
  options?: FetcherOptions
): Promise<PROMOTIONS_FOR_CATEGORY_QUERYResult> => {
  const normalizedCategoryId = normalizeInput(categoryId);
  if (!normalizedCategoryId) {
    return [];
  }

  try {
    const promotions = await fetchPromotionQuery<PROMOTIONS_FOR_CATEGORY_QUERYResult>(
      PROMOTIONS_FOR_CATEGORY_QUERY,
      { categoryId: normalizedCategoryId },
      options
    );
    return dedupePromotions(promotions);
  } catch (error) {
    console.error("Error fetching promotions for category:", {
      categoryId: normalizedCategoryId,
      error,
    });
    return [];
  }
};

const getActiveFlashSales = async (
  options?: FetcherOptions
): Promise<ACTIVE_FLASH_SALES_QUERYResult> => {
  try {
    const promotions = await fetchPromotionQuery<ACTIVE_FLASH_SALES_QUERYResult>(
      ACTIVE_FLASH_SALES_QUERY,
      {},
      options,
      [CACHE_TAGS.promotions, CACHE_TAGS.promotionsByType("flashSale")]
    );
    return dedupePromotions(promotions);
  } catch (error) {
    console.error("Error fetching active flash sales:", error);
    return [];
  }
};

export {
  getBanner,
  getFeaturedCategory,
  getAllProducts,
  getDealProducts,
  getDeals,
  getDealById,
  getHomepageDeals,
  getDealsAndLegacyHotProducts,
  getFeaturedProducts,
  getAllBrands,
  getLatestBlogs,
  getSingleBlog,
  getAllBlogs,
  getBlogCategories,
  getOthersBlog,
  getAddresses,
  getCategories,
  getRootCategoriesForNav,
  getCategoryBySlug,
  getAdminCategories,
  getProductBySlug,
  getBrand,
  getRelatedProducts,
  getOrderById,
  getAllNews,
  getNewsArticles,
  getNewsArticleBySlug,
  getNewsResourcesByArticle,
  getAllResources,
  getResourcesBySource,
  getEventBySlug,
  getEvents,
  getUserEventRegistrations,
  getCatalogItems,
  getCatalogItemBySlug,
  getCatalogCoverImage,
  getNewsDownloads,
  getNewsEvents,
  getNewsResources,
  getSingleNews,
  getResources,
  getDownloads,
  getActivePromotions,
  getPromotions,
  getPromotionByCampaignId,
  getPromotionBySlug,
  getPromotionsByType,
  getPromotionsBySegment,
  getPromotionsForProduct,
  getPromotionsForCategory,
  getActiveFlashSales,
  getPricingSettings,
};
