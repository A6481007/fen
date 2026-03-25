import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import dayjs from "dayjs";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import Container from "@/components/Container";
import InsightCard, { type InsightCardProps } from "@/components/insight/InsightCard";
import InsightAuthorCard from "@/components/insight/InsightAuthorCard";
import LearningOutline, { type OutlineEntry } from "@/components/insight/LearningOutline";
import InsightActions from "@/components/insight/InsightActions";
import InsightAnalytics from "@/components/insight/InsightAnalytics";
import InsightHero from "@/components/insight/InsightHero";
import RecommendedKit, { type RecommendedKitProduct } from "@/components/insight/RecommendedKit";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PageShell from "@/components/layout/PageShell";
import Section from "@/components/layout/Section";
import Prose from "@/components/layout/Prose";
import PortableTextRenderer, {
  buildPortableTextToc,
  estimateReadingTime,
  getPortableTextPlainText,
} from "@/components/portable/PortableTextRenderer";
import {
  FALLBACK_INSIGHT_TYPE,
  INSIGHT_TYPE_CONFIG,
  KNOWLEDGE_TYPES,
  SOLUTION_TYPES,
  type InsightTypeKey,
} from "@/constants/insightTypes";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/requestLocale";
import { getInsightRouteConfig, type InsightRouteConfig } from "@/lib/insight/routes";
import { sanityClient } from "@/lib/sanity/client";
import { sanityPreviewClient } from "@/lib/sanity/previewClient";
import { insightsListGroq, relatedInsightsGroq } from "@/lib/sanity/queries";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { trackInsightView as trackInsightViewRedis } from "@/lib/redis";
import { CATEGORY_BASE_PATH } from "@/lib/paths";
import { urlFor } from "@/sanity/lib/image";
import { getInsightBySlugWithLocale, getRelatedInsights } from "@/sanity/queries";
import { INSIGHT_BY_SLUG_WITH_LOCALE_QUERY } from "@/sanity/queries/insight";
import type { Product } from "@/sanity.types";
import type { PortableTextContent } from "@/types/portableText";

const siteName = "ShopCart";

const localeLabels: Record<Locale, string> = {
  en: "English",
  th: "Thai",
};

const ContinueLearningTracker = dynamic(
  () => import("@/components/insight/ContinueLearningTracker"),
  { loading: () => null }
);

const ReadingProgressBar = dynamic(
  () => import("@/components/insight/ReadingProgressBar"),
  { loading: () => null }
);

type SeoMetadata = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[] | null;
  canonicalUrl?: string | null;
  noIndex?: boolean | null;
  ogImage?: unknown;
};

type InsightAuthor = {
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
};

type InsightProduct = Product & {
  brand?: { title?: string | null; slug?: { current?: string | null } | null } | null;
  description?: string | null;
  dealerPrice?: number | null;
  discount?: number | null;
  stock?: number | null;
};

type SolutionProduct = {
  product?: InsightProduct | null;
  quantity?: number | null;
  isRequired?: boolean | null;
  notes?: string | null;
};

type InsightDocument = {
  _id?: string;
  title?: string | null;
  titleTh?: string | null;
  slug?: { current?: string | null };
  summary?: string | null;
  summaryTh?: string | null;
  insightType?: string | null;
  localeCode?: string | null;
  heroImage?: unknown;
  heroLayout?: string | null;
  heroTheme?: string | null;
  body?: PortableTextContent | null;
  bodyTh?: PortableTextContent | null;
  mainImage?: unknown;
  publishedAt?: string | null;
  updatedAt?: string | null;
  _updatedAt?: string | null;
  readingTime?: number | null;
  estimatedTime?: string | number | null;
  timeToCompleteMinutes?: number | null;
  difficulty?: string | null;
  level?: string | null;
  learningObjectives?: string[] | null;
  prerequisites?:
    | Array<
        | string
        | {
            _id?: string;
            title?: string | null;
            name?: string | null;
            slug?: { current?: string | null } | null;
          }
      >
    | null;
  keyTakeaways?: string[] | null;
  whyItMatters?: string | null;
  companionPack?: {
    _id?: string;
    title?: string | null;
    slug?: { current?: string | null } | null;
    description?: string | null;
    requiresAccess?: boolean | null;
    accessType?: string | null;
    availability?: string | null;
    price?: number | null;
  } | null;
  author?: InsightAuthor | null;
  primaryCategory?: {
    _id?: string;
    title?: string | null;
    slug?: { current?: string | null };
    categoryType?: string | null;
  } | null;
  categories?: Array<{
    _id?: string;
    title?: string | null;
    slug?: { current?: string | null };
    categoryType?: string | null;
  }> | null;
  linkedProducts?: InsightProduct[] | null;
  solutionProducts?: SolutionProduct[] | null;
  linkedInsights?: Array<{
    _id?: string;
    title?: string | null;
    titleTh?: string | null;
    slug?: { current?: string | null };
    insightType?: string | null;
    summary?: string | null;
    summaryTh?: string | null;
    mainImage?: unknown;
  }> | null;
  pillarPage?: { _id?: string; title?: string | null; slug?: { current?: string | null } } | null;
  clusterContent?: Array<{
    _id?: string;
    title?: string | null;
    titleTh?: string | null;
    slug?: { current?: string | null };
    insightType?: string | null;
    summary?: string | null;
    summaryTh?: string | null;
  }> | null;
  seoMetadata?: SeoMetadata | null;
  primaryKeyword?: string | null;
  primaryKeywordTh?: string | null;
  secondaryKeywords?: Array<{ keyword?: string | null }> | null;
  tags?: string[] | null;
};

type RelatedInsight = {
  _id?: string;
  title?: string | null;
  titleTh?: string | null;
  slug?: { current?: string | null };
  insightType?: string | null;
  summary?: string | null;
  summaryTh?: string | null;
  mainImage?: unknown;
  readingTime?: number | null;
  author?: { name?: string | null; image?: unknown } | null;
};

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format("MMM D, YYYY") : "Coming soon";

const getInsightBySlugCached = cache(
  async (slug: string, locale: Locale, fallback: Locale) =>
    (await getInsightBySlugWithLocale(slug, locale, fallback)) as InsightDocument | null
);

const getInsightPreview = async (slug: string, locale: Locale, fallback: Locale) =>
  (await sanityPreviewClient.fetch(INSIGHT_BY_SLUG_WITH_LOCALE_QUERY, {
    slug,
    locale,
    fallback,
    preview: true,
  })) as InsightDocument | null;

const getBaseUrl = () =>
  (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

const formatDuration = (
  readingTime?: number | null,
  estimatedTime?: string | number | null,
  timeToCompleteMinutes?: number | null
) => {
  if (typeof timeToCompleteMinutes === "number" && timeToCompleteMinutes > 0) {
    return `${timeToCompleteMinutes} min`;
  }
  if (typeof estimatedTime === "number" && estimatedTime > 0) {
    return `${estimatedTime} min`;
  }
  if (typeof estimatedTime === "string" && estimatedTime.trim().length > 0) {
    return estimatedTime.trim();
  }
  if (typeof readingTime === "number" && readingTime > 0) {
    return `${readingTime} min read`;
  }
  return null;
};

const getInsightTypeConfig = (type?: string | null) =>
  INSIGHT_TYPE_CONFIG[(type ?? "") as InsightTypeKey] ?? FALLBACK_INSIGHT_TYPE;

const getInsightHref = (
  slug: string | null | undefined,
  type: string | null | undefined,
  routeConfig: InsightRouteConfig
) => {
  if (!slug) return routeConfig.knowledge;
  if (SOLUTION_TYPES.has((type ?? "") as any)) {
    return `${routeConfig.solutions}/${slug}`;
  }
  return `${routeConfig.knowledge}/${slug}`;
};

const truncateDescription = (value: string, limit = 160) => {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trimEnd()}…`;
};

const mapLinkedProductsToRecommendedKit = (
  linkedProducts: InsightProduct[],
  solutionProducts: SolutionProduct[] | null | undefined,
  fallbackReason: string | null
): { products: RecommendedKitProduct[]; hasKitProducts: boolean; notesById: Map<string, string> } => {
  const solutionNotesById = new Map<string, string>();
  (solutionProducts || []).forEach((item) => {
    const productId = item?.product?._id;
    if (productId && item?.notes) {
      solutionNotesById.set(productId, item.notes);
    }
  });

  const mapped = linkedProducts
    .filter((product): product is InsightProduct & { _id: string } => Boolean(product?._id))
    .map((product) => ({
      id: product._id,
      name: product.name || "Product",
      slug: product.slug?.current || "",
      price: product.price ?? 0,
      dealerPrice: product.dealerPrice ?? undefined,
      discount: product.discount ?? undefined,
      stock: product.stock ?? 0,
      image: product.images?.[0],
      brand: product.brand?.title ?? null,
      reason:
        solutionNotesById.get(product._id) ||
        product.description ||
        fallbackReason ||
        "Chosen to match the steps in this lesson.",
    }));

  return { products: mapped, hasKitProducts: mapped.length > 0, notesById: solutionNotesById };
};

const buildOutline = ({
  tocInfo,
  learningObjectives,
  quizSections,
  referenceSections,
  hasReferencesSection,
}: {
  tocInfo: ReturnType<typeof buildPortableTextToc>;
  learningObjectives: string[];
  quizSections: { id: string; label: string }[];
  referenceSections: { id: string; label: string }[];
  hasReferencesSection: boolean;
}): OutlineEntry[] => {
  return [
    ...(learningObjectives.length
      ? [
          {
            id: "learning-objectives",
            label: "Learning objectives",
            kind: "objective" as const,
          },
        ]
      : []),
    ...tocInfo.items.map((item) => ({
      id: item.id,
      label: item.text,
      kind: "section" as const,
      level: item.level === "h3" ? 2 : 1,
    })),
    ...quizSections.map((item) => ({ ...item, kind: "quiz" as const })),
    ...(referenceSections.length
      ? referenceSections.map((item) => ({ ...item, kind: "reference" as const }))
      : hasReferencesSection
        ? [
            {
              id: "references",
              label: "References & resources",
              kind: "reference" as const,
            },
          ]
        : []),
  ];
};

const buildSchemas = ({
  insight,
  canonicalUrl,
  baseUrl,
  metaDescription,
  heroImage,
  publishedAt,
  updatedAt,
  author,
  recommendedKitProducts,
  hasKitProducts,
  categoryTitle,
  categorySlug,
  routeConfig,
}: {
  insight: InsightDocument;
  canonicalUrl: string;
  baseUrl: string;
  metaDescription: string;
  heroImage: unknown;
  publishedAt?: string | null;
  updatedAt?: string | null;
  author?: InsightAuthor | null;
  recommendedKitProducts: RecommendedKitProduct[];
  hasKitProducts: boolean;
  categoryTitle?: string | null;
  categorySlug?: string | null;
  routeConfig: InsightRouteConfig;
}) => {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Insight", url: routeConfig.root },
    { name: "Knowledge", url: routeConfig.knowledge },
    ...(categorySlug
      ? [
          {
            name: categoryTitle || "Category",
            url: `${routeConfig.category}/${categorySlug}`,
          },
        ]
      : []),
    { name: insight.title || "Insight", url: canonicalUrl },
  ]);

  const authorSchema =
    author?.name &&
    ({
      "@type": "Person",
      name: author.name,
      jobTitle: author.title,
      sameAs: [author.socialLinks?.linkedin, author.socialLinks?.twitter, author.socialLinks?.website].filter(Boolean),
    } as Record<string, unknown>);

  const articleSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: insight.title || "Insight",
    description: metaDescription,
    mainEntityOfPage: canonicalUrl,
  };

  if (publishedAt) {
    articleSchema.datePublished = publishedAt;
  }
  if (updatedAt || publishedAt) {
    articleSchema.dateModified = updatedAt || publishedAt;
  }
  if (heroImage) {
    articleSchema.image = [urlFor(heroImage).width(1200).height(630).url()];
  }
  if (authorSchema) {
    articleSchema.author = authorSchema;
  }
  articleSchema.publisher = {
    "@type": "Organization",
    name: siteName,
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}/logo.png`,
    },
  };

  const productSchema =
    hasKitProducts &&
    recommendedKitProducts.length > 0 && {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${insight.title || "Insight"} - Recommended kit`,
      itemListElement: recommendedKitProducts.map((product, index) => ({
        "@type": "Product",
        position: index + 1,
        name: product.name,
        url: product.slug ? `${baseUrl}/products/${product.slug}` : `${baseUrl}/products`,
        offers: {
          "@type": "Offer",
          priceCurrency: "THB",
          price: product.price ?? 0,
          availability:
            typeof product.stock === "number" && product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      })),
    };

  return [breadcrumbSchema, articleSchema, productSchema].filter(Boolean);
};

type KnowledgeMetadataOptions = {
  slug: string;
  locale: Locale;
  routeConfig: InsightRouteConfig;
};

export const buildKnowledgeMetadata = async ({
  slug,
  locale,
  routeConfig,
}: KnowledgeMetadataOptions): Promise<Metadata> => {
  const insight = await getInsightBySlugCached(slug, locale, defaultLocale);

  if (!insight) {
    return {
      title: "Insight Not Found",
      description: "The requested insight could not be found.",
    };
  }

  const localizedTitle =
    locale === "th" && (insight.titleTh?.trim()?.length || 0)
      ? insight.titleTh
      : insight.title;
  const localizedSummary =
    locale === "th" && (insight.summaryTh?.trim()?.length || 0)
      ? insight.summaryTh
      : insight.summary;

  const insightTitle = localizedTitle || "Insight";
  const seo = insight.seoMetadata;
  const metaTitle = seo?.metaTitle || `${insightTitle} | Knowledge | Insight Hub | ${siteName}`;
  const description = truncateDescription(
    seo?.metaDescription ||
      localizedSummary ||
      "Explore expert knowledge and insight from ShopCart."
  );
  const baseUrl = getBaseUrl();
  const canonical = seo?.canonicalUrl || `${baseUrl}${routeConfig.knowledge}/${slug}`;
  const imageSource = seo?.ogImage || insight.mainImage;
  const imageUrl = imageSource ? urlFor(imageSource).width(1200).height(630).url() : undefined;
  const keywordSet = new Set<string>();
  (seo?.keywords || []).forEach((keyword) => {
    if (keyword) keywordSet.add(keyword);
  });
  const localizedPrimaryKeyword =
    locale === "th"
      ? insight.primaryKeywordTh || insight.primaryKeyword
      : insight.primaryKeyword || insight.primaryKeywordTh;
  if (localizedPrimaryKeyword) keywordSet.add(localizedPrimaryKeyword);
  (insight.secondaryKeywords || []).forEach((entry) => {
    if (entry?.keyword) keywordSet.add(entry.keyword);
  });

  return {
    title: metaTitle,
    description,
    keywords: keywordSet.size ? Array.from(keywordSet) : undefined,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: metaTitle,
      description,
      url: canonical,
      siteName,
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
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: seo?.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const routeConfig = getInsightRouteConfig(null);
  return buildKnowledgeMetadata({
    slug,
    locale,
    routeConfig,
  });
}

type KnowledgeInsightPageOptions = {
  slug: string;
  locale: Locale;
  routeConfig: InsightRouteConfig;
};

export const renderKnowledgeInsightPage = async ({
  slug,
  locale,
  routeConfig,
}: KnowledgeInsightPageOptions) => {
  const { isEnabled: isPreview } = await draftMode();
  const insight = isPreview
    ? await getInsightPreview(slug, locale, defaultLocale)
    : await getInsightBySlugCached(slug, locale, defaultLocale);

  if (!insight) return notFound();

  const insightType = insight.insightType || "";
  if (SOLUTION_TYPES.has(insightType as any)) {
    redirect(`${routeConfig.solutions}/${slug}`);
  }

  if (!KNOWLEDGE_TYPES.has(insightType as any)) {
    return notFound();
  }

  const resolvedLocale = isLocale(locale) ? locale : defaultLocale;
  const title =
    resolvedLocale === "th" && (insight.titleTh?.trim()?.length || 0)
      ? insight.titleTh
      : insight.title;
  const summary =
    resolvedLocale === "th" && (insight.summaryTh?.trim()?.length || 0)
      ? insight.summaryTh
      : insight.summary;
  const body =
    resolvedLocale === "th" &&
    Array.isArray(insight.bodyTh) &&
    insight.bodyTh.length > 0
      ? insight.bodyTh
      : insight.body;

  if (!isPreview && insight._id) {
    await trackInsightViewRedis(insight._id);
  }

  const baseUrl = getBaseUrl();
  const canonicalUrl = insight.seoMetadata?.canonicalUrl || `${baseUrl}${routeConfig.knowledge}/${slug}`;
  const heroImage = insight.heroImage || insight.mainImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1600).height(900).url() : null;
  const heroLayout = (insight.heroLayout as string) || "standard";
  const heroTheme = (insight.heroTheme as string) || "light";
  const heroCaption = (heroImage as { caption?: string })?.caption || null;
  const plainBodyText = getPortableTextPlainText(body as PortableTextContent | null) || "";
  const metaDescription = truncateDescription(
    insight.seoMetadata?.metaDescription ||
      summary ||
      plainBodyText ||
      "Explore expert knowledge and insight from ShopCart."
  );
  const author = insight.author;
  const socialLinks =
    author?.socialLinks
      ? {
          linkedin: author.socialLinks.linkedin ?? undefined,
          twitter: author.socialLinks.twitter ?? undefined,
          website: author.socialLinks.website ?? undefined,
        }
      : undefined;
  const authorCardData = {
    _id: author?._id || "insight-author",
    name: author?.name || "ShopCart Team",
    slug: { current: author?.slug?.current || "" },
    title: author?.title || "Insight Specialist",
    image: author?.image,
    bio: author?.bio ?? undefined,
    credentials: author?.credentials ?? undefined,
    credentialVerified: author?.credentialVerified ?? false,
    expertise: author?.expertise ?? undefined,
    socialLinks,
  };
  const publishedAt = insight.publishedAt;
  const updatedAt = insight.updatedAt || insight._updatedAt;
  const showUpdated = Boolean(updatedAt && updatedAt !== publishedAt);
  const readingTime = insight.readingTime ?? estimateReadingTime(body as PortableTextContent | null);
  const summaryText = summary || plainBodyText;
  const insightId = insight._id || slug;
  const timeToCompleteLabel = formatDuration(
    readingTime,
    insight.estimatedTime,
    insight.timeToCompleteMinutes
  );
  const levelLabel = insight.level || insight.difficulty || null;
  const learningObjectives = Array.isArray(insight.learningObjectives)
    ? insight.learningObjectives.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const keyTakeaways = Array.isArray(insight.keyTakeaways)
    ? insight.keyTakeaways.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const prerequisiteLabels = Array.isArray(insight.prerequisites)
    ? insight.prerequisites
        .map((item) => {
          if (!item) return null;
          if (typeof item === "string") return item;
          if (typeof item === "object") {
            const title = (item as { title?: string; name?: string }).title;
            const name = (item as { name?: string }).name;
            return title || name || null;
          }
          return null;
        })
        .filter((item): item is string => Boolean(item && item.trim()))
    : [];
  const whyItMatters = insight.whyItMatters?.trim()
    ? insight.whyItMatters.trim()
    : null;
  const companionPack = insight.companionPack;
  const category = insight.primaryCategory || insight.categories?.[0] || null;
  const categoryTitle = category?.title || "Knowledge";
  const categorySlug = category?.slug?.current || "";
  const insightTypeConfig = getInsightTypeConfig(insightType);
  const shareUrl = canonicalUrl;
  const linkedProducts = Array.isArray(insight.linkedProducts) ? insight.linkedProducts : [];
  const { products: recommendedKitProducts, hasKitProducts } = mapLinkedProductsToRecommendedKit(
    linkedProducts,
    insight.solutionProducts,
    whyItMatters
  );
  const productIds = linkedProducts
    .map((product) => product?._id)
    .filter(Boolean) as string[];
  const tagPool = Array.isArray(insight.tags)
    ? insight.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];
  const manualRelated = Array.isArray(insight.linkedInsights)
    ? (insight.linkedInsights.filter((item) =>
        KNOWLEDGE_TYPES.has((item?.insightType ?? "") as any)
      ) as RelatedInsight[])
    : [];
  const relatedByTags = insight._id
    ? ((await sanityClient.fetch(relatedInsightsGroq, {
        currentId: insight._id,
        lang: resolvedLocale,
        kind: "knowledge",
        tags: tagPool,
        category: categorySlug || null,
        limit: 6,
      })) as RelatedInsight[])
    : [];
  const shouldFetchRelated = Boolean(insight._id && (category?._id || productIds.length));
  const relatedByCategory = shouldFetchRelated
    ? ((await getRelatedInsights(insight._id || "", category?._id || "", productIds, 6)) as RelatedInsight[])
    : [];
  const dedupeRelated = (items: RelatedInsight[]) => {
    const map = new Map<string, RelatedInsight>();
    items.forEach((item) => {
      const id = item?._id;
      if (!id || id === insight._id) return;
      if (!map.has(id)) {
        map.set(id, item);
      }
    });
    return Array.from(map.values());
  };
  const localizeCard = <T extends { title?: string | null; summary?: string | null; titleTh?: string | null; summaryTh?: string | null }>(
    item: T
  ): T => {
    if (!item) return item;
    const next: T & { title?: string | null; summary?: string | null } = { ...item };
    if (resolvedLocale === "th") {
      next.title = (item as any).titleTh || item.title || null;
      next.summary = (item as any).summaryTh || item.summary || null;
    }
    return next;
  };
  let relatedInsights = dedupeRelated([
    ...manualRelated,
    ...relatedByTags,
    ...relatedByCategory,
  ]);
  if (relatedInsights.length < 3 && insight._id) {
    const fallback = (await sanityClient.fetch(insightsListGroq, {
      lang: resolvedLocale,
      kind: "knowledge",
      category: "",
      tag: "",
      sort: "",
      limit: 6,
    })) as RelatedInsight[];
    relatedInsights = dedupeRelated([...relatedInsights, ...(fallback || [])]);
  }
  relatedInsights = relatedInsights.slice(0, 6).map(localizeCard);
  const clusterContent = Array.isArray(insight.clusterContent)
    ? insight.clusterContent.map(localizeCard)
    : [];
  const tocInfo = buildPortableTextToc(body as PortableTextContent | null);

  const blockIdMap = new Map<string, string>();
  const quizSections: { id: string; label: string }[] = [];
  const referenceSections: { id: string; label: string }[] = [];

  if (Array.isArray(body)) {
    body.forEach((block, index) => {
      if ((block as { _type?: string })?._type === "quiz") {
        const id = `quiz-${(block as { _key?: string })._key || index + 1}`;
        blockIdMap.set((block as { _key?: string })._key || `quiz-${index}`, id);
        const question = (block as { question?: string }).question;
        quizSections.push({ id, label: question ? `Quiz: ${question}` : `Quiz ${quizSections.length + 1}` });
      }
      if ((block as { _type?: string })?._type === "resourcePackEmbed") {
        const id = `references-${(block as { _key?: string })._key || index + 1}`;
        blockIdMap.set((block as { _key?: string })._key || `references-${index}`, id);
        const label =
          referenceSections.length === 0
            ? "References & resources"
            : `References (${referenceSections.length + 1})`;
        referenceSections.push({ id, label });
      }
    });
  }

  const hasReferencesSection =
    referenceSections.length > 0 || Boolean(companionPack) || Boolean(prerequisiteLabels.length);

  const outlineSections = buildOutline({
    tocInfo,
    learningObjectives,
    quizSections,
    referenceSections,
    hasReferencesSection,
  });

  const companionPackHref = companionPack?.slug?.current
    ? `/resources/${companionPack.slug.current}`
    : companionPack
      ? "/contact?subject=Knowledge%20Pack"
      : null;

  const primaryCta = companionPack
    ? {
        label: companionPack.requiresAccess ? "Request companion pack" : "Download companion pack",
        href: companionPackHref || "/contact",
        helper: companionPack.requiresAccess ? "Access may require approval" : undefined,
      }
    : hasKitProducts
      ? {
          label: "View recommended kit",
          href: "#recommended-kit",
        }
      : {
          label: "Talk to an expert",
          href: "/contact",
        };

  const primaryCtaVariant: "accent" | "default" = hasKitProducts ? "default" : "accent";

  const recommendedKitHref = hasKitProducts ? "#recommended-kit" : companionPackHref;

  const localizedInsight = { ...insight, title, summary, body };
  const structuredData = buildSchemas({
    insight: localizedInsight,
    canonicalUrl,
    baseUrl,
    metaDescription,
    heroImage,
    publishedAt,
    updatedAt,
    author,
    recommendedKitProducts,
    hasKitProducts,
    categoryTitle,
    categorySlug,
    routeConfig,
  });

  const headerMeta = [
    { label: "Category", value: categoryTitle },
    { label: "Level", value: levelLabel ? levelLabel.charAt(0).toUpperCase() + levelLabel.slice(1) : null },
    { label: "Time", value: timeToCompleteLabel || `${readingTime} min read` },
    {
      label: showUpdated ? "Updated" : "Published",
      value: showUpdated ? formatDate(updatedAt) : publishedAt ? formatDate(publishedAt) : null,
    },
  ].filter((item) => item.value);

  return (
    <>
      {structuredData.map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <InsightAnalytics insightId={insightId} kind="knowledge" locale={locale} />

      <ContinueLearningTracker
        slug={slug}
        title={title || "Insight"}
        summary={summaryText}
        category={categoryTitle}
        readingTime={readingTime}
        updatedAt={updatedAt || publishedAt || undefined}
        heroImageUrl={heroImageUrl || undefined}
      />

      <PageShell anchorOffset={128}>
        <header className="border-b border-border bg-surface-0">
          <Container className="py-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={routeConfig.root}>Insight</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={routeConfig.knowledge}>Knowledge</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {categorySlug ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href={`${routeConfig.category}/${categorySlug}`}>{categoryTitle}</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                ) : null}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{title || "Insight"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Container>
        </header>

        <InsightHero
          title={title || "Insight"}
          summary={
            whyItMatters ||
            summary ||
            "Explore expert analysis and practical knowledge from our specialists."
          }
          categoryLabel={categoryTitle}
          typeLabel={insightTypeConfig.label}
          metaItems={headerMeta as { label: string; value: string }[]}
          primaryCta={
            <Button
              asChild
              variant={primaryCtaVariant}
              className="h-11 w-full rounded-full text-base font-semibold"
            >
              <Link href={primaryCta.href}>{primaryCta.label}</Link>
            </Button>
          }
          helperText={primaryCta.helper ? <span>{primaryCta.helper}</span> : null}
          actions={
            <InsightActions
              slug={slug}
              title={title || "Insight"}
              shareUrl={shareUrl}
              recommendedHref={recommendedKitHref || undefined}
            />
          }
          heroImage={heroImage}
          heroLayout={heroLayout as any}
          heroTheme={heroTheme as any}
          caption={heroCaption}
        />
        <ReadingProgressBar targetId="article-body" />

        <Section spacing="lg" className="pb-12">
          <Container className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <LearningOutline
                slug={slug}
                sections={outlineSections}
                objectives={learningObjectives}
              />
            </aside>

            <div className="space-y-12">
              <div className="lg:hidden">
                <LearningOutline
                  slug={slug}
                  sections={outlineSections}
                  objectives={learningObjectives}
                  condensed
                />
              </div>

              <div id="article-body" className="space-y-12">
                {learningObjectives.length ? (
                  <section
                    id="learning-objectives"
                    data-outline-id="learning-objectives"
                    className="rounded-2xl border border-border bg-surface-0 p-5"
                    aria-labelledby="learning-objectives-title"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p
                          id="learning-objectives-title"
                          className="text-xs uppercase tracking-[0.12em] text-ink-muted"
                        >
                          Learning objectives
                        </p>
                        <p className="text-sm text-ink-muted">What you'll be able to do after this lesson</p>
                      </div>
                      {timeToCompleteLabel ? (
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink">
                          {timeToCompleteLabel}
                        </span>
                      ) : null}
                    </div>
                    <ol className="mt-4 space-y-2 text-sm text-ink">
                      {learningObjectives.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex gap-3">
                          <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full border border-border bg-surface-1 text-[11px] font-semibold text-ink-strong">
                            {index + 1}
                          </span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null}

                {(keyTakeaways.length || prerequisiteLabels.length) ? (
                  <section className="grid gap-4 rounded-2xl border border-border bg-surface-0 p-5 sm:grid-cols-2">
                    {keyTakeaways.length ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Key takeaways</p>
                        <ul className="space-y-1.5 text-sm text-ink">
                          {keyTakeaways.map((item, index) => (
                            <li key={`${item}-${index}`} className="flex gap-2">
                              <span className="mt-1 inline-flex size-1.5 rounded-full bg-ink" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {prerequisiteLabels.length ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Prerequisites</p>
                        <ul className="space-y-1.5 text-sm text-ink">
                          {prerequisiteLabels.map((item, index) => (
                            <li key={`${item}-${index}`} className="flex gap-2">
                              <span className="mt-1 inline-flex size-1.5 rounded-full bg-ink" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <Prose as="article">
                  {Array.isArray(body) && body.length > 0 ? (
                    <PortableTextRenderer
                      value={body as PortableTextContent}
                      options={{ headingIdMap: tocInfo.idByKey, blockIdMap, accentCtaStrategy: "none" }}
                    />
                  ) : (
                    <p>Additional details for this knowledge article are coming soon.</p>
                  )}
                </Prose>

                {author ? (
                  <InsightAuthorCard
                    author={authorCardData}
                    variant="full"
                    authorBasePath={routeConfig.authors}
                  />
                ) : null}

                {hasReferencesSection ? (
                  <section
                    id="references"
                    data-outline-id="references"
                    className="rounded-2xl border border-border bg-surface-1 p-5"
                    aria-label="References and resources"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-ink-strong">References & resources</h2>
                      {showUpdated ? (
                        <span className="text-xs uppercase tracking-[0.1em] text-ink-muted">
                          Updated {formatDate(updatedAt)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {companionPack ? (
                        <div className="rounded-xl border border-border bg-surface-0 p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Companion pack</p>
                          <p className="mt-1 text-sm font-semibold text-ink-strong">
                            {companionPack.title || "Knowledge pack"}
                          </p>
                          {companionPack.description ? (
                            <p className="text-sm text-ink-muted">{companionPack.description}</p>
                          ) : null}
                          <Button asChild variant="outline" size="sm" className="mt-3 rounded-full">
                            <Link href={companionPackHref || "#"}>Access pack</Link>
                          </Button>
                        </div>
                      ) : null}

                      {referenceSections.length ? (
                        <div className="rounded-xl border border-border bg-surface-0 p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Embedded references</p>
                          <p className="text-sm text-ink-muted">See in-line resource blocks above.</p>
                        </div>
                      ) : null}

                      {prerequisiteLabels.length ? (
                        <div className="rounded-xl border border-border bg-surface-0 p-4">
                          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Prerequisites</p>
                          <ul className="mt-2 space-y-1 text-sm text-ink">
                            {prerequisiteLabels.map((item, index) => (
                              <li key={`${item}-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </div>

              {hasKitProducts ? (
                <Section spacing="md" id="recommended-kit" className="scroll-mt-28 pt-0">
                  <Container className="px-0">
                    <RecommendedKit
                      insightSlug={slug}
                      products={recommendedKitProducts}
                      explicitReference={true}
                      headline="Recommended kit"
                      summary={
                        whyItMatters ||
                        "Components called out in this lesson, with plain-language reasons before you buy."
                      }
                      alternativesHref={categorySlug ? `/catalog?category=${categorySlug}` : CATEGORY_BASE_PATH}
                    />
                  </Container>
                </Section>
              ) : null}

              {relatedInsights.length ? (
                <Section spacing="md" className="pt-0">
                  <Container className="space-y-4 px-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Related reading</p>
                        <h2 className="text-2xl font-semibold text-ink-strong">Related insights</h2>
                      </div>
                      <Button asChild variant="outline" className="text-ink border-border rounded-full">
                        <Link href={routeConfig.knowledge}>View all knowledge</Link>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {relatedInsights.map((item, index) => (
                        <InsightCard
                          key={item?._id || index}
                          insight={item as InsightCardProps["insight"]}
                          variant="default"
                          linkBase={{ knowledge: routeConfig.knowledge, solutions: routeConfig.solutions }}
                        />
                      ))}
                    </div>
                  </Container>
                </Section>
              ) : null}

              {clusterContent.length || insight.pillarPage ? (
                <Section spacing="md" className="pt-0">
                  <Container className="space-y-6 px-0">
                    {clusterContent.length ? (
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Deep dives</p>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          {clusterContent.map((item) => {
                            const clusterSlug = item?.slug?.current || "";
                            const clusterHref = getInsightHref(
                              clusterSlug,
                              item?.insightType,
                              routeConfig
                            );

                            return (
                              <div
                                key={item?._id}
                                className="rounded-xl border border-border bg-surface-0 p-5 transition hover:border-ink"
                              >
                                <Link href={clusterHref} className="block">
                                  <h3 className="text-lg font-semibold text-ink-strong hover:underline">
                                    {item?.title || "Deep dive"}
                                  </h3>
                                </Link>
                                <p className="text-sm text-ink-muted line-clamp-3">
                                  {item?.summary || "Explore the next chapter in this knowledge series."}
                                </p>
                                <Link
                                  href={clusterHref}
                                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-ink"
                                >
                                  Explore
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {insight.pillarPage?.title ? (
                      <div className="rounded-xl border border-border bg-surface-0 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Part of a pillar page</p>
                          <h3 className="text-lg font-semibold text-ink-strong">{insight.pillarPage.title}</h3>
                        </div>
                        <Button asChild variant="outline" className="rounded-full text-ink border-border">
                          <Link
                            href={getInsightHref(
                              insight.pillarPage.slug?.current,
                              null,
                              routeConfig
                            )}
                          >
                            View pillar page
                          </Link>
                        </Button>
                      </div>
                    ) : null}
                  </Container>
                </Section>
              ) : null}
            </div>
          </Container>
        </Section>
      </PageShell>
    </>
  );
};

const KnowledgeInsightPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const routeConfig = getInsightRouteConfig(null);
  return renderKnowledgeInsightPage({
    slug,
    locale,
    routeConfig,
  });
};

export default KnowledgeInsightPage;
