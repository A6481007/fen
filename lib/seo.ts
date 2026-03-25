import { Metadata } from "next";
import { Product, Category } from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";
import { buildCategoryUrl, buildProductPath } from "@/lib/paths";

type InsightSeoMetadata = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[] | null;
  canonicalUrl?: string | null;
  noIndex?: boolean | null;
  ogImage?: unknown;
};

type InsightCategory = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  categoryType?: string | null;
};

export interface InsightAuthor {
  _id?: string | null;
  name?: string | null;
  slug?: { current?: string | null } | null;
  title?: string | null;
  image?: unknown;
  bio?: string | null;
  credentials?: string[] | null;
  credentialVerified?: boolean | null;
  expertise?: string[] | null;
  socialLinks?: {
    linkedin?: string | null;
    twitter?: string | null;
    website?: string | null;
  } | null;
}

export interface InsightData {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  summary?: string | null;
  insightType?: string | null;
  mainImage?: unknown;
  publishedAt?: string | null;
  updatedAt?: string | null;
  _updatedAt?: string | null;
  localeCode?: string | null;
  author?: InsightAuthor | null;
  primaryCategory?: InsightCategory | null;
  categories?: InsightCategory[] | null;
  seoMetadata?: InsightSeoMetadata | null;
  primaryKeyword?: string | null;
  primaryKeywordTh?: string | null;
  secondaryKeywords?: Array<{ keyword?: string | null } | null> | null;
  tags?: string[] | null;
}

export interface InsightWithSolution extends InsightData {
  solutionMaturity?: string | null;
  solutionComplexity?: string | null;
  implementationTimeline?: string | null;
  clientContext?: {
    clientName?: string | null;
    industry?: string | null;
    challengeDescription?: string | null;
    solutionDescription?: string | null;
  } | null;
  metrics?: Array<{
    metricLabel?: string | null;
    metricValue?: string | null;
    metricDescription?: string | null;
  }> | null;
  solutionProducts?: Array<{
    product?: Product | null;
    quantity?: number | null;
    isRequired?: boolean | null;
    notes?: string | null;
  }> | null;
}

export type BreadcrumbItem = { name: string; url: string };

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const DEFAULT_CURRENCY = (
  process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ||
  process.env.NEXT_PUBLIC_CURRENCY ||
  "THB"
).toUpperCase();

const getBrandName = (brand: any) => {
  if (Array.isArray(brand)) {
    const candidate = brand[0];
    return candidate?.brandName || candidate?.title || candidate?.name || "";
  }

  if (brand && typeof brand === "object") {
    return brand.brandName || brand.title || brand.name || "";
  }

  return "";
};

const truncateMeta = (value: string, max: number = 300) =>
  typeof value === "string" && value.length > max
    ? `${value.slice(0, Math.max(0, max - 3)).trim()}...`
    : value;

const resolveCurrency = (value?: string | null) => {
  const normalized =
    typeof value === "string" && value.trim().length > 0
      ? value.trim().toUpperCase()
      : "";
  return normalized || DEFAULT_CURRENCY;
};

const resolveAvailability = (stock?: number | null) => {
  if (typeof stock !== "number") return "https://schema.org/InStock";
  if (stock <= 0) return "https://schema.org/OutOfStock";
  if (stock < 10) return "https://schema.org/LimitedAvailability";
  return "https://schema.org/InStock";
};

const getPrimaryImageUrl = (images?: unknown) => {
  if (Array.isArray(images)) {
    const first = images.find(Boolean);
    return first ? urlFor(first).width(1200).height(1200).url() : undefined;
  }

  return images ? urlFor(images).width(1200).height(1200).url() : undefined;
};

const deriveVisiblePricing = (product: any) => {
  const price = typeof product?.price === "number" ? product.price : null;
  const discount =
    typeof product?.discount === "number" && product.discount > 0
      ? product.discount
      : null;
  const listPrice =
    price !== null && discount
      ? Number((price * (1 + discount / 100)).toFixed(2))
      : price;

  return { price, listPrice, discount };
};

const INSIGHT_SOLUTION_TYPES = new Set([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);

const getInsightSection = (insightType?: string | null) =>
  INSIGHT_SOLUTION_TYPES.has(insightType || "") ? "solutions" : "knowledge";

const buildInsightAuthorSchema = (author?: InsightAuthor | null) => {
  if (!author) return undefined;

  const sameAs = [
    author.socialLinks?.linkedin,
    author.socialLinks?.twitter,
  ].filter(Boolean);
  const authorUrl = author.slug?.current
    ? `${BASE_URL}/insight/author/${author.slug.current}`
    : undefined;

  return {
    "@type": "Person",
    name: author.name,
    jobTitle: author.title,
    url: authorUrl,
    ...(sameAs.length ? { sameAs } : {}),
  };
};

type PortableTextSpan = {
  _type?: string;
  text?: string;
};

type PortableTextBlock = {
  _type?: string;
  children?: PortableTextSpan[];
};

type NewsDocument = {
  _id?: string;
  title?: string;
  summary?: string;
  body?: PortableTextBlock[];
  slug?: { current?: string };
  mainImage?: unknown;
  publishedAt?: string;
  _updatedAt?: string;
  author?: {
    name?: string;
  };
  contentType?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventLocation?: string;
  eventRsvpUrl?: string;
  eventStatus?: string;
  eventAttendanceMode?: string;
  eventDetails?: {
    date?: string;
    location?: string;
  };
  seasonTitle?: string;
  seasonNumber?: number;
  seasonStartDate?: string;
  seasonEndDate?: string;
  language?: string;
  episodes?: unknown[];
};

/**
 * Generate metadata for product pages
 */
export function generateProductMetadata(
  product: any,
  options?: { parentCategory?: Category | null; childCategory?: Category | null }
): Metadata {
  const title = product.name
    ? `${product.name} | Products in Bangkok, Thailand | NCS Network`
    : "Product | NCS Network";
  const brandName = getBrandName(product.brand);
  const description =
    product.description ||
    `Buy ${product.name || "network products"} from a Bangkok, Thailand distributor. Brands: ${brandName || "leading OEMs"}.`;
  const metaDescription = truncateMeta(description, 280);
  const imageUrl = product.images?.[0]
    ? urlFor(product.images[0]).url()
    : "/og-image.jpg";
  const url = `${BASE_URL}${buildProductPath(product)}`;

  const parent = options?.parentCategory;
  const child = options?.childCategory;
  const keywords = [
    product.name || "",
    brandName || "",
    parent?.title || "",
    child?.title || "",
    "Bangkok",
    "Thailand",
    "distributor",
    "network products",
  ].filter(Boolean);

  return {
    title,
    description: metaDescription,
    keywords,
    openGraph: {
      type: "website",
      url,
      title,
      description: metaDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      siteName: "ShopCart",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: [imageUrl],
    },
    alternates: { canonical: url },
  };
}

/**
 * Generate metadata for category pages
 */
export function generateCategoryMetadata(
  category: Category,
  productCount: number = 0,
  options?: { parentCategory?: Category | null }
): Metadata {
  const titleBase = category.title || "Category";
  const title = `${titleBase} Distributor in Bangkok | NCS Network`;
  const description =
    category.description ||
    `Browse ${productCount} ${titleBase} products from a Bangkok, Thailand distributor. Brands: Furukawa, BELDEN, CommScope, Schneider.`;
  const metaDescription = truncateMeta(description, 280);
  const imageUrl = category.image
    ? urlFor(category.image).url()
    : "/og-image.jpg";
  const url = `${BASE_URL}${buildCategoryUrl(category.slug?.current)}`;
  const parentTitle = options?.parentCategory?.title;

  return {
    title,
    description: metaDescription,
    keywords: [
      category.title || "",
      parentTitle || "",
      "Bangkok",
      "Thailand",
      "distributor",
      "network products",
      "Furukawa",
      "BELDEN",
      "CommScope",
      "Schneider",
    ].filter(Boolean),
    openGraph: {
      type: "website",
      url,
      title,
      description: metaDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      siteName: "ShopCart",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: [imageUrl],
    },
    alternates: { canonical: url },
  };
}

/**
 * Generate metadata for insight articles
 */
export function generateInsightMetadata(
  insight: InsightData,
  options?: { parentCategory?: InsightCategory | null; locale?: string | null }
): Metadata {
  const seo = insight?.seoMetadata;
  const section = getInsightSection(insight?.insightType);
  const sectionLabel = section === "solutions" ? "Solutions" : "Knowledge";
  const insightTitle = insight?.title || "Insight";
  const metaTitle =
    seo?.metaTitle ||
    `${insightTitle} | ${sectionLabel} | Insight Hub | ShopCart`;
  const description =
    seo?.metaDescription ||
    insight?.summary ||
    (section === "solutions"
      ? "Explore proven solutions and case studies from ShopCart."
      : "Explore expert knowledge and insight from ShopCart.");
  const metaDescription = truncateMeta(description, 280);
  const slug = insight?.slug?.current;
  const canonicalPath = slug
    ? `/insight/${section}/${slug}`
    : `/insight/${section}`;
  const canonical = seo?.canonicalUrl || `${BASE_URL}${canonicalPath}`;
  const imageSource = seo?.ogImage || insight?.mainImage;
  const imageUrl = imageSource
    ? urlFor(imageSource).width(1200).height(630).url()
    : undefined;
  const keywordSet = new Set<string>();
  const locale = options?.locale || insight?.localeCode || "en";
  const addKeyword = (value?: string | null) => {
    if (value) keywordSet.add(value);
  };

  (seo?.keywords || []).forEach((keyword) => addKeyword(keyword));
  const localizedPrimaryKeyword =
    locale === "th"
      ? insight?.primaryKeywordTh || insight?.primaryKeyword
      : insight?.primaryKeyword || insight?.primaryKeywordTh;
  addKeyword(localizedPrimaryKeyword);
  (insight?.secondaryKeywords || []).forEach((entry) =>
    addKeyword(entry?.keyword || null)
  );
  (insight?.tags || []).forEach((tag) => addKeyword(tag));
  addKeyword(insight?.title);
  addKeyword(insight?.primaryCategory?.title || null);
  addKeyword(options?.parentCategory?.title || null);

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: keywordSet.size ? Array.from(keywordSet) : undefined,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: metaTitle,
      description: metaDescription,
      siteName: "ShopCart",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: metaTitle,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: seo?.noIndex ? "noindex" : "index",
  };
}

/**
 * Generate Product Schema (JSON-LD) for rich snippets
 */
export function generateProductSchema(product: any) {
  if (!product) return null;

  const imageUrls = Array.isArray(product.images)
    ? product.images
        .filter(Boolean)
        .slice(0, 3)
        .map((image) => urlFor(image).width(1200).height(1200).url())
    : [];

  const brandName = getBrandName(product.brand) || "NCS Network";
  const { price, listPrice } = deriveVisiblePricing(product);
  const priceValue =
    typeof price === "number" && !Number.isNaN(price)
      ? Number(price.toFixed(2))
      : undefined;
  const listPriceValue =
    typeof listPrice === "number" && !Number.isNaN(listPrice)
      ? Number(listPrice.toFixed(2))
      : undefined;
  if (priceValue === undefined) return null;
  const currency = resolveCurrency(
    (product as { currency?: string; priceCurrency?: string })?.currency ||
      (product as { priceCurrency?: string })?.priceCurrency
  );
  const availability = resolveAvailability(product.stock);
  const url = `${BASE_URL}${buildProductPath(product)}`;

  const offers: Record<string, any> = {
    "@type": "Offer",
    url,
    priceCurrency: currency,
    price: priceValue,
    availability,
    itemCondition: "https://schema.org/NewCondition",
  };

  if (
    listPriceValue !== undefined &&
    listPriceValue > priceValue
  ) {
    offers.priceSpecification = {
      "@type": "UnitPriceSpecification",
      name: "List price",
      price: listPriceValue,
      priceCurrency: currency,
    };
  }

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.name,
    image: imageUrls.length ? imageUrls : getPrimaryImageUrl(product.images),
    sku: product.sku || product._id,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    offers,
  };

  if (typeof product.averageRating === "number" && product.averageRating > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.averageRating,
      reviewCount: product.totalReviews || 0,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

/**
 * Generate BreadcrumbList Schema (JSON-LD)
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate Event Schema (JSON-LD)
 */
export function generateEventSchema(input: {
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  timezone?: string | null;
  mode?: string | null;
  status?: string | null;
  url: string;
  image?: string | null;
  locationName?: string | null;
  address?: string | null;
  onlineUrl?: string | null;
  price?: number | null;
  priceCurrency?: string | null;
}) {
  const attendanceMode =
    input.mode === "online"
      ? "https://schema.org/OnlineEventAttendanceMode"
      : input.mode === "hybrid"
      ? "https://schema.org/MixedEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode";

  const eventStatus =
    input.status === "ongoing"
      ? "https://schema.org/EventInProgress"
      : input.status === "ended"
      ? "https://schema.org/EventCompleted"
      : "https://schema.org/EventScheduled";

  const location =
    input.mode === "online"
      ? {
          "@type": "VirtualLocation",
          url: input.onlineUrl || input.url,
        }
      : {
          "@type": "Place",
          name: input.locationName || "Venue",
          address: input.address,
        };

  const offers =
    typeof input.price === "number"
      ? [
          {
            "@type": "Offer",
            price: input.price,
            priceCurrency: input.priceCurrency || "USD",
            availability: "https://schema.org/InStock",
          },
        ]
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.name,
    description: truncateMeta(input.description || ""),
    startDate: input.startDate,
    endDate: input.endDate,
    eventAttendanceMode: attendanceMode,
    eventStatus,
    location,
    ...(input.image ? { image: input.image } : {}),
    ...(offers ? { offers } : {}),
    organizer: {
      "@type": "Organization",
      name: "ShopCart",
      url: BASE_URL,
    },
    url: input.url,
  };
}

/**
 * Generate VideoObject Schema (JSON-LD) for event recordings
 */
export function generateVideoObjectSchema(input: {
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  uploadDate?: string | null;
  duration?: string | null;
  contentUrl?: string | null;
  embedUrl?: string | null;
  transcript?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: input.name,
    description: truncateMeta(input.description || ""),
    ...(input.thumbnailUrl ? { thumbnailUrl: input.thumbnailUrl } : {}),
    ...(input.uploadDate ? { uploadDate: input.uploadDate } : {}),
    ...(input.duration ? { duration: input.duration } : {}),
    ...(input.contentUrl ? { contentUrl: input.contentUrl } : {}),
    ...(input.embedUrl ? { embedUrl: input.embedUrl } : {}),
    ...(input.transcript ? { transcript: input.transcript } : {}),
    publisher: {
      "@type": "Organization",
      name: "ShopCart",
    },
  };
}

/**
 * Generate Organization Schema (JSON-LD)
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ShopCart",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      "Your trusted online shopping destination for quality items and exceptional customer service.",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+1-555-123-4567",
      contactType: "customer service",
      areaServed: "US",
      availableLanguage: "en",
    },
    sameAs: [
      "https://facebook.com/shopcart",
      "https://twitter.com/shopcart",
      "https://instagram.com/shopcart",
      "https://linkedin.com/company/shopcart",
    ],
  };
}

/**
 * Generate WebSite Schema (JSON-LD) with search action
 */
export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ShopCart",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/shop?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate ItemList Schema for list pages
 */
export function generateItemListSchema(
  items: any[],
  listName: string,
  options?: { basePath?: string }
) {
  const normalizedBasePath = options?.basePath
    ? options.basePath.startsWith("/")
      ? options.basePath.replace(/\/$/, "")
      : `/${options.basePath.replace(/\/$/, "")}`
    : "/products";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}${normalizedBasePath}/${item.slug?.current}`,
      name: item.name ?? item.title,
    })),
  };
}

export function generateCategoryCollectionSchema(
  category: Category,
  products: any[],
  breadcrumbItems?: Array<{ name: string; url: string }>
) {
  const prices = products
    .map((product) => (typeof product.price === "number" ? product.price : null))
    .filter((price): price is number => price !== null);
  const lowPrice = prices.length ? Math.min(...prices) : undefined;
  const highPrice = prices.length ? Math.max(...prices) : undefined;

  const brandNames = Array.from(
    new Set(
      products
        .map((product) => {
          return getBrandName(product.brand);
        })
        .filter(Boolean)
    )
  );

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.title || "Products"} in Bangkok`,
    description:
      category.description ||
      `Network products from a Bangkok, Thailand distributor across brands: Furukawa, BELDEN, CommScope, Schneider.`,
    url: `${BASE_URL}${buildCategoryUrl(category.slug?.current)}`,
    breadcrumb: breadcrumbItems?.map((item) => `${BASE_URL}${item.url}`),
    ...(brandNames.length
      ? { brand: brandNames.map((name) => ({ "@type": "Brand", name })) }
      : {}),
    ...(prices.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            lowPrice,
            highPrice,
            priceCurrency: DEFAULT_CURRENCY,
            offerCount: prices.length,
          },
        }
      : {}),
    hasPart: products
      .filter((product) => product?.slug?.current)
      .slice(0, 20)
      .map((product) => ({
        "@type": "Product",
        name: product.name,
        url: `${BASE_URL}${buildProductPath(product)}`,
        brand:
          getBrandName(product.brand) !== ""
            ? { "@type": "Brand", name: getBrandName(product.brand) }
            : undefined,
        offers:
          typeof product.price === "number"
            ? {
                "@type": "Offer",
                price: product.price,
                priceCurrency: DEFAULT_CURRENCY,
                availability: resolveAvailability(product.stock),
              }
            : undefined,
      })),
  };
}

/**
 * Generate Article schema for knowledge content
 */
export function generateInsightArticleSchema(insight: InsightData) {
  const imageUrl = insight.mainImage ? urlFor(insight.mainImage).url() : undefined;
  const section = getInsightSection(insight.insightType);
  const slug = insight.slug?.current;
  const pageId = slug
    ? `${BASE_URL}/insight/${section}/${slug}`
    : `${BASE_URL}/insight/${section}`;
  const author = buildInsightAuthorSchema(insight.author);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: insight.title || "Insight",
    description: insight.summary,
    ...(imageUrl ? { image: imageUrl } : {}),
    datePublished: insight.publishedAt,
    dateModified:
      insight.updatedAt || insight._updatedAt || insight.publishedAt,
    ...(author ? { author } : {}),
    publisher: {
      "@type": "Organization",
      name: "ShopCart",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageId,
    },
  };
}

/**
 * Generate Case Study schema (for solutions)
 */
export function generateCaseStudySchema(insight: InsightWithSolution) {
  const author = buildInsightAuthorSchema(insight.author);
  const result = (insight.metrics || [])
    .map((metric) => {
      if (!metric?.metricLabel && !metric?.metricValue) return null;
      if (metric.metricLabel && metric.metricValue) {
        return `${metric.metricLabel}: ${metric.metricValue}`;
      }
      return metric.metricLabel || metric.metricValue || null;
    })
    .filter(Boolean)
    .join(", ");

  return {
    "@context": "https://schema.org",
    "@type": "CaseStudy",
    name: insight.title,
    description: insight.summary,
    about: insight.clientContext?.industry,
    abstract: insight.clientContext?.challengeDescription,
    ...(result ? { result } : {}),
    ...(author ? { author } : {}),
    datePublished: insight.publishedAt,
  };
}

/**
 * Generate HowTo schema for solutions with steps
 */
export function generateSolutionHowToSchema(insight: InsightWithSolution) {
  const supply = (insight.solutionProducts || [])
    .map((solutionProduct) => {
      const name = solutionProduct?.product?.name;
      if (!name) return null;
      const payload: Record<string, unknown> = {
        "@type": "HowToSupply",
        name,
      };
      if (typeof solutionProduct.quantity === "number") {
        payload.requiredQuantity = solutionProduct.quantity;
      }
      return payload;
    })
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: insight.title,
    description: insight.summary,
    totalTime: insight.implementationTimeline,
    supply: supply.length ? supply : undefined,
  };
}

/**
 * Generate Product bundle schema
 */
export function generateSolutionBundleSchema(
  insight: InsightWithSolution,
  options?: { canonicalUrl?: string | null; imageUrl?: string | null; currency?: string | null }
) {
  const solutionProducts = Array.isArray(insight.solutionProducts)
    ? insight.solutionProducts
    : [];

  const items = solutionProducts
    .map((item) => {
      const product = item?.product;
      if (!product || !product._id || !product.name) return null;
      const { price, listPrice } = deriveVisiblePricing(product);
      const quantity =
        typeof item?.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;

      return {
        product,
        quantity,
        price,
        listPrice,
        isRequired: item?.isRequired !== false,
      };
    })
    .filter(Boolean) as Array<{
    product: Product;
    quantity: number;
    price: number | null;
    listPrice: number | null;
    isRequired: boolean;
  }>;

  if (!items.length) return null;

  const requiredItems = items.filter((item) => item.isRequired);
  const optionalItems = items.filter((item) => !item.isRequired);

  const sumTotal = (list: typeof items) =>
    list.reduce((total, item) => {
      if (typeof item.price !== "number") return total;
      return total + item.price * (item.quantity || 1);
    }, 0);

  const requiredTotal = sumTotal(requiredItems);
  const optionalTotal = sumTotal(optionalItems);

  const lowPriceValue =
    requiredTotal > 0 ? Number(requiredTotal.toFixed(2)) : undefined;
  const highPriceCandidate = requiredTotal + optionalTotal;
  const highPriceValue =
    optionalItems.length && highPriceCandidate > 0
      ? Number(highPriceCandidate.toFixed(2))
      : lowPriceValue;

  const hasOutOfStockRequired = requiredItems.some(
    (item) => typeof item.product.stock === "number" && item.product.stock <= 0
  );
  const hasLowStockRequired =
    !hasOutOfStockRequired &&
    requiredItems.some(
      (item) => typeof item.product.stock === "number" && item.product.stock < 10
    );

  const bundleAvailability = hasOutOfStockRequired
    ? "https://schema.org/OutOfStock"
    : hasLowStockRequired
    ? "https://schema.org/LimitedAvailability"
    : "https://schema.org/InStock";

  const canonicalUrl =
    options?.canonicalUrl ||
    (insight.slug?.current
      ? `${BASE_URL}/insight/solutions/${insight.slug.current}`
      : BASE_URL);
  const currency = resolveCurrency(options?.currency || null);

  const bundleImage =
    options?.imageUrl ||
    getPrimaryImageUrl((insight as any).mainImage) ||
    getPrimaryImageUrl(items[0]?.product.images);

  const hasPart = items.map((item) => {
    const availability = resolveAvailability(item.product.stock);
    const price = item.price;
    const listPrice = item.listPrice;
    const imageUrl = getPrimaryImageUrl(item.product.images);
    const priceValue =
      typeof price === "number" && !Number.isNaN(price) ? price : undefined;
    const listPriceValue =
      typeof listPrice === "number" && priceValue !== undefined && listPrice > priceValue
        ? listPrice
        : undefined;

    return {
      "@type": "Product",
      name: item.product.name,
      url: `${BASE_URL}${buildProductPath(item.product)}`,
      image: imageUrl ? [imageUrl] : undefined,
      sku: item.product.sku || item.product._id,
      ...(priceValue !== undefined
        ? {
            offers: {
              "@type": "Offer",
              price: priceValue,
              priceCurrency: currency,
              availability,
              ...(listPriceValue
                ? {
                    priceSpecification: {
                      "@type": "UnitPriceSpecification",
                      name: "List price",
                      price: Number(listPriceValue.toFixed(2)),
                      priceCurrency: currency,
                    },
                  }
                : {}),
            },
          }
        : {}),
      additionalProperty:
        typeof item.quantity === "number"
          ? [
              {
                "@type": "PropertyValue",
                name: "Bundle quantity",
                value: item.quantity,
              },
            ]
          : undefined,
    };
  });

  const offers =
    lowPriceValue !== undefined
      ? optionalItems.length
        ? {
            "@type": "AggregateOffer",
            lowPrice: lowPriceValue,
            highPrice: highPriceValue ?? lowPriceValue,
            priceCurrency: currency,
            availability: bundleAvailability,
            offerCount: items.length,
            url: canonicalUrl,
          }
        : {
            "@type": "Offer",
            price: lowPriceValue,
            priceCurrency: currency,
            availability: bundleAvailability,
            url: canonicalUrl,
          }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${insight.title || "Insight"} - Solution Bundle`,
    description: insight.summary,
    url: canonicalUrl,
    ...(bundleImage ? { image: [bundleImage] } : {}),
    offers,
    hasPart,
  };
}

/**
 * Generate Author Person schema
 */
export function generateAuthorSchema(author: InsightAuthor) {
  const imageUrl = author.image ? urlFor(author.image).url() : undefined;
  const sameAs = [
    author.socialLinks?.linkedin,
    author.socialLinks?.twitter,
    author.socialLinks?.website,
  ].filter(Boolean);
  const credentials = (author.credentials || []).filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    image: imageUrl,
    sameAs: sameAs.length ? sameAs : undefined,
    hasCredential: credentials.length
      ? credentials.map((cred) => ({
          "@type": "EducationalOccupationalCredential",
          credentialCategory: "certification",
          name: cred,
        }))
      : undefined,
    knowsAbout: author.expertise,
  };
}

/**
 * Generate breadcrumb items for insight pages
 */
export function generateInsightBreadcrumbItems(
  insight: InsightData
): BreadcrumbItem[] {
  const section = getInsightSection(insight.insightType);
  const sectionLabel = section === "solutions" ? "Solutions" : "Knowledge";
  const categorySlug = insight.primaryCategory?.slug?.current;
  const insightSlug = insight.slug?.current;
  const items: BreadcrumbItem[] = [
    { name: "Home", url: "/" },
    { name: "Insight", url: "/insight" },
    { name: sectionLabel, url: `/insight/${section}` },
  ];

  if (insight.primaryCategory?.title) {
    items.push({
      name: insight.primaryCategory.title || "Category",
      url: categorySlug
        ? `/insight/${section}/category/${categorySlug}`
        : `/insight/${section}`,
    });
  }

  items.push({
    name: insight.title || "Insight",
    url: insightSlug
      ? `/insight/${section}/${insightSlug}`
      : `/insight/${section}`,
  });

  return items;
}

const getNewsDescription = (doc?: NewsDocument, maxLength: number = 160) => {
  if (!doc) {
    return "Latest announcements and updates from ShopCart.";
  }

  if (doc.summary?.trim()) {
    return doc.summary.trim();
  }

  const body = doc.body;
  if (!Array.isArray(body)) {
    return "Latest announcements and updates from ShopCart.";
  }

  let text = "";
  for (const block of body) {
    if (!block || block._type !== "block") continue;
    for (const child of block.children || []) {
      if (child?._type === "span" && child.text) {
        text += `${child.text} `;
        if (text.length >= maxLength) {
          return `${text.substring(0, maxLength).trim()}...`;
        }
      }
    }
    if (text.length >= maxLength) break;
  }

  return (
    text.trim() || "Latest announcements and updates from ShopCart."
  );
};

const getNewsUrl = (doc?: NewsDocument) => {
  if (doc?.slug?.current) {
    return `${BASE_URL}/news/${doc.slug.current}`;
  }
  return `${BASE_URL}/news`;
};

/**
 * Generate NewsArticle Schema for newsroom items
 */
export function generateNewsArticleSchema(article: NewsDocument) {
  if (!article) return null;

  const imageUrl = article.mainImage ? urlFor(article.mainImage).url() : "";

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: getNewsDescription(article),
    mainEntityOfPage: getNewsUrl(article),
    datePublished: article.publishedAt,
    dateModified: article._updatedAt || article.publishedAt,
  };

  if (imageUrl) {
    schema.image = [imageUrl];
  }

  if (article.author?.name) {
    schema.author = {
      "@type": "Person",
      name: article.author.name,
    };
  }

  return schema;
}

/**
 * Generate Event Schema for newsroom items (launch/webinar entries)
 */
export function generateNewsEventSchema(eventDoc: NewsDocument) {
  if (!eventDoc) return null;

  const startDate =
    eventDoc.eventStartDate ||
    eventDoc.eventDetails?.date ||
    eventDoc.publishedAt;
  const endDate = eventDoc.eventEndDate || eventDoc.eventStartDate;
  const locationName =
    eventDoc.eventLocation || eventDoc.eventDetails?.location;
  const imageUrl = eventDoc.mainImage
    ? urlFor(eventDoc.mainImage).url()
    : "";

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventDoc.title,
    description: getNewsDescription(eventDoc),
    url: getNewsUrl(eventDoc),
    organizer: {
      "@type": "Organization",
      name: "ShopCart",
      url: BASE_URL,
    },
  };

  if (startDate) schema.startDate = startDate;
  if (endDate) schema.endDate = endDate;

  if (eventDoc.eventStatus) {
    schema.eventStatus = eventDoc.eventStatus;
  }

  if (eventDoc.eventAttendanceMode) {
    schema.eventAttendanceMode = eventDoc.eventAttendanceMode;
  }

  if (locationName) {
    schema.location = {
      "@type": "Place",
      name: locationName,
    };
  }

  if (imageUrl) {
    schema.image = [imageUrl];
  }

  if (eventDoc.eventRsvpUrl) {
    if (!schema.eventStatus) {
      schema.eventStatus = "https://schema.org/EventScheduled";
    }
    schema.offers = {
      "@type": "Offer",
      url: eventDoc.eventRsvpUrl,
      availability: "https://schema.org/InStock",
    };
  }

  return schema;
}

/**
 * Generate CreativeWorkSeason Schema for grouped editorial series
 */
export function generateCreativeWorkSeasonSchema(seriesDoc: NewsDocument) {
  if (!seriesDoc) return null;

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeason",
    name:
      seriesDoc.seasonTitle ||
      seriesDoc.title ||
      "ShopCart News Season",
    description: getNewsDescription(seriesDoc),
    url: getNewsUrl(seriesDoc),
    inLanguage: seriesDoc.language || "en",
  };

  if (typeof seriesDoc.seasonNumber === "number") {
    schema.seasonNumber = seriesDoc.seasonNumber;
  }

  if (seriesDoc.seasonStartDate) {
    schema.startDate = seriesDoc.seasonStartDate;
  }

  if (seriesDoc.seasonEndDate) {
    schema.endDate = seriesDoc.seasonEndDate;
  }

  if (Array.isArray(seriesDoc.episodes)) {
    schema.numberOfEpisodes = seriesDoc.episodes.length;
  }

  return schema;
}

/**
 * Generate Review Schema for product reviews
 */
export function generateReviewSchema(reviews: any[], product: Product) {
  if (!reviews || reviews.length === 0) return null;

  const reviewSchemas = reviews.map((review) => ({
    "@type": "Review",
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      "@type": "Person",
      name: review.userName || "Anonymous",
    },
    reviewBody: review.comment,
    datePublished: review._createdAt,
  }));

  return reviewSchemas;
}

/**
 * Generate FAQ Schema
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Helper to create canonical URL
 */
export function getCanonicalUrl(path: string): string {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Generate metadata for homepage
 */
export function generateHomeMetadata(): Metadata {
  return {
    title: "ShopCart - Your Trusted Online Shopping Destination",
    description:
      "Discover amazing products at ShopCart, your trusted online shopping destination for quality items and exceptional customer service. Shop electronics, fashion, home goods and more with fast delivery.",
    keywords: [
      "online shopping",
      "e-commerce",
      "buy online",
      "shop online",
      "best deals",
      "electronics",
      "fashion",
      "home goods",
    ],
    openGraph: {
      type: "website",
      url: BASE_URL,
      title: "ShopCart - Your Trusted Online Shopping Destination",
      description:
        "Discover amazing products at ShopCart. Shop electronics, fashion, home goods and more with fast delivery.",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "ShopCart Online Store",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "ShopCart - Your Trusted Online Shopping Destination",
      description:
        "Discover amazing products at ShopCart. Shop electronics, fashion, home goods and more.",
      images: ["/og-image.jpg"],
    },
    alternates: {
      canonical: BASE_URL,
    },
  };
}
