import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  Clock,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import Container from "@/components/Container";
import InsightCard, { type InsightCardProps } from "@/components/insight/InsightCard";
import InsightAuthorCard from "@/components/insight/InsightAuthorCard";
import InsightAnalytics from "@/components/insight/InsightAnalytics";
import SolutionProductBundle from "@/components/insight/SolutionProductBundle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import PortableTextRenderer, {
  getPortableTextPlainText,
} from "@/components/portable/PortableTextRenderer";
import InsightCTA from "@/components/insight/InsightCTA";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  generateBreadcrumbSchema,
  generateSolutionBundleSchema,
  type InsightWithSolution,
} from "@/lib/seo";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/requestLocale";
import { getInsightRouteConfig, type InsightRouteConfig } from "@/lib/insight/routes";
import { sanityClient } from "@/lib/sanity/client";
import { sanityPreviewClient } from "@/lib/sanity/previewClient";
import { insightsListGroq, relatedInsightsGroq } from "@/lib/sanity/queries";
import { trackInsightView as trackInsightViewRedis } from "@/lib/redis";
import { urlFor } from "@/sanity/lib/image";
import { getInsightBySlugWithLocale, getRelatedInsights } from "@/sanity/queries";
import { INSIGHT_BY_SLUG_WITH_LOCALE_QUERY } from "@/sanity/queries/insight";
import type { Product } from "@/sanity.types";
import type { PortableTextContent } from "@/types/portableText";
import {
  INSIGHT_TYPE_LABELS,
  KNOWLEDGE_TYPES,
  SOLUTION_TYPES,
  type InsightTypeKey,
} from "@/constants/insightTypes";

const siteName = "ShopCart";

const localeLabels: Record<Locale, string> = {
  en: "English",
  th: "Thai",
};

type SolutionTypeKey = Extract<InsightTypeKey, "caseStudy" | "validatedSolution" | "theoreticalSolution">;
type SolutionComplexityKey = "quickWin" | "standard" | "enterprise";
type MaturityKey = "proven" | "tested" | "emerging";

type KnowledgePackAsset = {
  label?: string | null;
  file?: {
    asset?: {
      url?: string | null;
      mimeType?: string | null;
      originalFilename?: string | null;
    } | null;
  } | null;
};

type SolutionInsight = InsightWithSolution & {
  titleTh?: string | null;
  localeCode?: string | null;
  body?: PortableTextContent | null;
  bodyTh?: PortableTextContent | null;
  summary?: string | null;
  summaryTh?: string | null;
  gated?: boolean | null;
  knowledgePack?: {
    assets?: KnowledgePackAsset[] | null;
  } | null;
  linkedInsights?: Array<{
    _id?: string;
    title?: string | null;
    slug?: { current?: string | null };
    insightType?: InsightTypeKey | null;
    summary?: string | null;
    mainImage?: unknown;
  }> | null;
  linkedProducts?: Product[] | null;
  estimatedTime?: string | number | null;
  timeToCompleteMinutes?: number | null;
  difficulty?: string | null;
  level?: string | null;
  learningObjectives?: string[] | null;
  prerequisites?: Array<
    | string
    | {
        _id?: string;
        title?: string | null;
        name?: string | null;
        slug?: { current?: string | null } | null;
      }
  > | null;
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
  secondaryKeywords?: Array<{ keyword?: string | null }> | null;
  primaryKeywordTh?: string | null;
};

type RelatedInsight = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null };
  insightType?: InsightTypeKey | null;
  summary?: string | null;
  mainImage?: unknown;
  readingTime?: number | null;
  author?: { name?: string | null; image?: unknown } | null;
};

type InsightCtaConfig = {
  ctaType: "contact" | "rfq" | "product" | "pdf";
  label: string;
  href?: string;
  variant?: "default" | "outline" | "secondary";
  solutionId?: string;
  products?: SolutionInsight["solutionProducts"];
};

const TYPE_MATURITY_MAP: Record<SolutionTypeKey, MaturityKey> = {
  caseStudy: "proven",
  validatedSolution: "tested",
  theoreticalSolution: "emerging",
};

const MATURITY_CONFIG: Record<
  MaturityKey,
  { label: string; className: string; icon: LucideIcon }
> = {
  proven: {
    label: "Proven",
    className: "border border-ink/20 bg-surface-0 text-ink",
    icon: ShieldCheck,
  },
  tested: {
    label: "Tested",
    className: "border border-ink/20 bg-surface-0 text-ink",
    icon: BadgeCheck,
  },
  emerging: {
    label: "Emerging",
    className: "border border-ink/20 bg-surface-0 text-ink",
    icon: Sparkles,
  },
};

const COMPLEXITY_CONFIG: Record<
  SolutionComplexityKey,
  { label: string; icon: LucideIcon; className: string }
> = {
  quickWin: {
    label: "Quick Win",
    icon: Zap,
    className: "border border-ink/20 bg-surface-0 text-ink",
  },
  standard: {
    label: "Standard",
    icon: BarChart3,
    className: "border border-ink/20 bg-surface-0 text-ink",
  },
  enterprise: {
    label: "Enterprise",
    icon: Building2,
    className: "border border-ink/20 bg-surface-0 text-ink",
  },
};

const METRIC_STYLES = [
  {
    match: /roi|return|savings|cost|margin|profit/i,
    cardClass: "border border-border bg-surface-1",
    labelClass: "text-ink-strong",
    iconClass: "text-ink",
    iconBg: "bg-surface-0",
    icon: TrendingUp,
  },
  {
    match: /time|timeline|speed|delivery|duration/i,
    cardClass: "border border-border bg-surface-1",
    labelClass: "text-ink-strong",
    iconClass: "text-ink",
    iconBg: "bg-surface-0",
    icon: Clock,
  },
  {
    match: /uptime|reliability|security|risk|availability/i,
    cardClass: "border border-border bg-surface-1",
    labelClass: "text-ink-strong",
    iconClass: "text-ink",
    iconBg: "bg-surface-0",
    icon: ShieldCheck,
  },
  {
    match: /adoption|users|engagement|satisfaction|growth/i,
    cardClass: "border border-border bg-surface-1",
    labelClass: "text-ink-strong",
    iconClass: "text-ink",
    iconBg: "bg-surface-0",
    icon: Sparkles,
  },
];

const DEFAULT_METRIC_STYLE = {
  cardClass: "border border-border bg-surface-1",
  labelClass: "text-ink-strong",
  iconClass: "text-ink",
  iconBg: "bg-surface-0",
  icon: Sparkles,
};

const TRUST_SIGNALS = [
  { icon: ShieldCheck, label: "Verified outcomes" },
  { icon: BadgeCheck, label: "Reviewed by experts" },
  { icon: Sparkles, label: "Trusted deployment playbook" },
];

type PortableChild = { text?: string };
type PortableBlock = { children?: PortableChild[] };

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

const getHeadingText = (block?: PortableBlock) =>
  Array.isArray(block?.children)
    ? block.children
        .map((child) => (typeof child?.text === "string" ? child.text : ""))
        .join(" ")
        .trim()
    : "";

const getMetricStyle = (label?: string | null) => {
  const value = label?.toLowerCase() || "";
  const match = METRIC_STYLES.find((style) => style.match.test(value));
  return match ?? DEFAULT_METRIC_STYLE;
};

const getSolutionTypeLabel = (type?: string | null) =>
  type ? INSIGHT_TYPE_LABELS[type as InsightTypeKey] ?? "Solution" : "Solution";

const buildHowToSteps = (
  body: PortableTextContent | null | undefined,
  products: SolutionInsight["solutionProducts"] | null | undefined,
  summary?: string | null
) => {
  const productSteps =
    products
      ?.filter((item) => item?.product?._id)
      .map((item, index) => {
        const productName = item?.product?.name;
        const name = productName
          ? `Deploy ${productName}`
          : `Configure solution component ${index + 1}`;
        const text =
          item?.notes ||
          (item?.quantity
            ? `Use ${item.quantity} unit(s) as specified.`
            : "Follow the implementation guidance in the solution.");
        return {
          "@type": "HowToStep",
          name,
          text,
        };
      }) ?? [];

  const headingSteps =
    Array.isArray(body)
      ? body
          .filter(
            (block) =>
              block?._type === "block" &&
              (block.style === "h2" || block.style === "h3")
          )
          .map((block) => getHeadingText(block as any))
          .filter(Boolean)
          .slice(0, 6)
          .map((text) => ({
            "@type": "HowToStep",
            name: text,
            text,
          }))
      : [];

  if (productSteps.length) return productSteps;
  if (headingSteps.length) return headingSteps;

  return [
    {
      "@type": "HowToStep",
      name: "Implement the solution",
      text:
        summary ||
        "Follow the implementation guidance outlined in the solution details.",
    },
  ];
};

const getSolutionInsightCached = cache(
  async (slug: string, locale: Locale, fallback: Locale) =>
    (await getInsightBySlugWithLocale(slug, locale, fallback)) as SolutionInsight | null
);

const getSolutionInsightPreview = async (slug: string, locale: Locale, fallback: Locale) =>
  (await sanityPreviewClient.fetch(INSIGHT_BY_SLUG_WITH_LOCALE_QUERY, {
    slug,
    locale,
    fallback,
    preview: true,
  })) as SolutionInsight | null;

type SolutionMetadataOptions = {
  slug: string;
  locale: Locale;
  routeConfig: InsightRouteConfig;
};

export const buildSolutionMetadata = async ({
  slug,
  locale,
  routeConfig,
}: SolutionMetadataOptions): Promise<Metadata> => {
  const insight = await getSolutionInsightCached(slug, locale, defaultLocale);

  if (!insight) {
    return {
      title: "Solution Not Found",
      description: "The requested solution could not be found.",
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
  const localizedBody =
    locale === "th" &&
    Array.isArray(insight.bodyTh) &&
    insight.bodyTh.length > 0
      ? insight.bodyTh
      : insight.body;

  const insightType = insight.insightType || "";
  const baseUrl = getBaseUrl();

  if (KNOWLEDGE_TYPES.has(insightType as InsightTypeKey)) {
    const targetUrl = `${baseUrl}${routeConfig.knowledge}/${slug}`;
    const title = localizedTitle || "Insight";
    const description =
      localizedSummary ||
      getPortableTextPlainText(localizedBody as PortableTextContent | null) ||
      "Explore insights from ShopCart.";
    return {
      title,
      description,
      alternates: { canonical: targetUrl },
      robots: { index: true, follow: true },
    };
  }

  if (!SOLUTION_TYPES.has(insightType as InsightTypeKey)) {
    return {
      title: "Solution Not Found",
      description: "The requested solution could not be found.",
    };
  }

  const insightTitle = localizedTitle || "Solution";
  const seo = insight.seoMetadata;
  const metaTitle =
    seo?.metaTitle || `${insightTitle} | Solutions | Insight Hub | ${siteName}`;
  const description =
    seo?.metaDescription ||
    localizedSummary ||
    getPortableTextPlainText(localizedBody as PortableTextContent | null) ||
    "Explore proven solutions and case studies from ShopCart.";
  const canonical =
    seo?.canonicalUrl || `${baseUrl}${routeConfig.solutions}/${slug}`;
  const imageSource = seo?.ogImage || insight.mainImage;
  const imageUrl = imageSource
    ? urlFor(imageSource).width(1200).height(630).url()
    : undefined;
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

  const publishedTime = insight.publishedAt || undefined;
  const modifiedTime = insight.updatedAt || insight._updatedAt || undefined;
  const authorName = insight.author?.name || undefined;
  const authorUrl = insight.author?.slug?.current
    ? `${baseUrl}${routeConfig.authors}/${insight.author.slug.current}`
    : undefined;
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
      publishedTime,
      modifiedTime,
      authors: authorUrl ? [authorUrl] : authorName ? [authorName] : undefined,
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
    robots: {
      index: !seo?.noIndex,
      follow: !seo?.noIndex,
    },
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
  return buildSolutionMetadata({
    slug,
    locale,
    routeConfig,
  });
}

type SolutionInsightPageOptions = {
  slug: string;
  locale: Locale;
  routeConfig: InsightRouteConfig;
};

export const renderSolutionInsightPage = async ({
  slug,
  locale,
  routeConfig,
}: SolutionInsightPageOptions) => {
  const { isEnabled: isPreview } = await draftMode();
  const insight = isPreview
    ? await getSolutionInsightPreview(slug, locale, defaultLocale)
    : await getSolutionInsightCached(slug, locale, defaultLocale);

  if (!insight) return notFound();

  const insightType = insight.insightType || "";
  if (KNOWLEDGE_TYPES.has(insightType as InsightTypeKey)) {
    redirect(`${routeConfig.knowledge}/${slug}`);
  }
  if (!SOLUTION_TYPES.has(insightType as InsightTypeKey)) {
    return notFound();
  }

  if (!isPreview && insight._id) {
    await trackInsightViewRedis(insight._id);
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

  const { userId } = await auth().catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[insight][solutions] Clerk auth unavailable", error);
    }
    return { userId: null };
  });
  const isGated = Boolean(insight.gated);
  const isSignedIn = Boolean(userId);

  const category =
    insight.primaryCategory?.categoryType === "solution"
      ? insight.primaryCategory
      : insight.categories?.find((item) => item?.categoryType === "solution") ||
        insight.primaryCategory ||
        insight.categories?.[0] ||
        null;
  const categoryTitle = category?.title || "Solutions";
  const categorySlug = category?.slug?.current || "";
  const solutionTypeLabel = getSolutionTypeLabel(insightType);

  const maturityKey =
    (insight.solutionMaturity as MaturityKey) ||
    TYPE_MATURITY_MAP[insightType as SolutionTypeKey] ||
    "proven";
  const maturity = MATURITY_CONFIG[maturityKey] ?? MATURITY_CONFIG.proven;

  const complexityKey = (insight.solutionComplexity as SolutionComplexityKey) ||
    "standard";
  const complexity = COMPLEXITY_CONFIG[complexityKey] ?? COMPLEXITY_CONFIG.standard;

  const timeline = insight.implementationTimeline || "Timeline TBD";
  const isCaseStudy = insightType === "caseStudy";
  const metrics = Array.isArray(insight.metrics) ? insight.metrics : [];

  const heroImage = insight.mainImage;
  const heroImageUrl = heroImage
    ? urlFor(heroImage).width(1600).height(900).url()
    : null;

  if (isGated && !isSignedIn) {
    const signInHref = `/sign-in?redirectTo=${encodeURIComponent(
      `${routeConfig.solutions}/${slug}`
    )}`;

    return (
      <div className="min-h-screen bg-surface-0 text-ink">
        <InsightAnalytics insightId={insight._id || slug} kind="solutions" locale={locale} />
        <Container className="py-8 sm:py-12 space-y-8">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn("gap-2", maturity.className)}>
                <maturity.icon className="h-3.5 w-3.5" />
                {maturity.label}
              </Badge>
              <Badge
                variant="secondary"
                className="border border-border bg-surface-0 text-ink"
              >
                {solutionTypeLabel}
              </Badge>
              {categoryTitle ? (
                <Badge
                  variant="secondary"
                  className="border border-border bg-surface-0 text-ink"
                >
                  {categoryTitle}
                </Badge>
              ) : null}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-strong leading-tight">
              {title || "Solution"}
            </h1>
            {summary ? (
              <p className="text-base sm:text-lg text-ink-muted max-w-3xl">
                {summary}
              </p>
            ) : null}
          </section>

          {heroImageUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-0">
              <Image
                src={heroImageUrl}
                alt={title || "Solution hero"}
                width={1600}
                height={900}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          ) : null}

          <Card className="border border-border bg-surface-1">
            <CardContent className="p-6 sm:p-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-0">
                <LockKeyhole className="h-6 w-6 text-ink" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                  Gated content
                </p>
                <h2 className="text-xl font-semibold text-ink-strong">
                  Sign in to access this solution
                </h2>
                <p className="text-sm text-ink-muted">
                  This solution playbook is available to signed-in customers and partners.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild className="h-11 px-6">
                  <Link href={signInHref}>Sign in to access</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 px-6">
                  <Link href="/contact">Request access</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  const solutionProducts = Array.isArray(insight.solutionProducts)
    ? insight.solutionProducts
    : [];
  const bundleProducts = solutionProducts
    .map((item) => {
      const product = item?.product;
      const slug = product?.slug?.current;
      if (!product || !product._id || !product.name || !slug) return null;

      return {
        product: {
          _id: product._id,
          name: product.name,
          slug: { current: slug },
          images: product.images ?? [],
          price: product.price ?? 0,
          dealerPrice: product.dealerPrice ?? undefined,
          stock: product.stock ?? 0,
          discount: product.discount ?? undefined,
          description: product.description ?? undefined,
        },
        quantity:
          typeof item?.quantity === "number" && item.quantity > 0
            ? item.quantity
            : 1,
        isRequired: item?.isRequired !== false,
        notes: item?.notes ?? undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const solutionId = insight._id ?? slug;
  const insightId = insight._id || slug;
  const productSkus = Array.from(
    new Set(
      solutionProducts
        .map((item) => item?.product?.sku || item?.product?._id)
        .filter(Boolean) as string[]
    )
  );
  const knowledgeAssets = Array.isArray(insight.knowledgePack?.assets)
    ? insight.knowledgePack?.assets
    : [];
  const pdfAsset = knowledgeAssets.find((asset) => {
    const mime = asset?.file?.asset?.mimeType?.toLowerCase() || "";
    const filename = asset?.file?.asset?.originalFilename?.toLowerCase() || "";
    return mime.includes("pdf") || filename.endsWith(".pdf");
  });
  const pdfUrl = pdfAsset?.file?.asset?.url ?? null;

  const ctaItems = [
    {
      ctaType: "contact",
      label: "Talk to an expert",
      href: "/contact",
      variant: "default",
    },
    solutionProducts.length
      ? {
          ctaType: "rfq",
          label: "Request a quote",
          variant: "outline",
          solutionId,
          products: solutionProducts,
        }
      : null,
    bundleProducts.length
      ? {
          ctaType: "product",
          label: "View bundle",
          href: `${routeConfig.solutions}/${slug}#solution-bundle`,
          variant: "secondary",
        }
      : null,
    pdfUrl
      ? {
          ctaType: "pdf",
          label: "Download PDF",
          href: pdfUrl,
          variant: "outline",
        }
      : null,
  ].filter(Boolean) as InsightCtaConfig[];
  const linkedProducts = Array.isArray(insight.linkedProducts)
    ? insight.linkedProducts
    : [];
  const productIds = Array.from(
    new Set(
      [
        ...solutionProducts.map((item) => item?.product?._id),
        ...linkedProducts.map((product) => product?._id),
      ].filter(Boolean) as string[],
    ),
  );

  const shouldFetchRelated = Boolean(
    insight._id && (category?._id || productIds.length)
  );
  const tagPool = Array.isArray(insight.tags)
    ? insight.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];
  const manualRelatedSolutions = Array.isArray(insight.linkedInsights)
    ? (insight.linkedInsights.filter((item) =>
        SOLUTION_TYPES.has((item?.insightType ?? "") as InsightTypeKey)
      ) as RelatedInsight[])
    : [];
  const relatedByTags = insight._id
    ? ((await sanityClient.fetch(relatedInsightsGroq, {
        currentId: insight._id,
        lang: resolvedLocale,
        kind: "solutions",
        tags: tagPool,
        category: categorySlug || null,
        limit: 6,
      })) as RelatedInsight[])
    : [];
  const relatedByCategory = shouldFetchRelated
    ? ((await getRelatedInsights(
        insight._id || "",
        category?._id || "",
        productIds,
        6
      )) as RelatedInsight[])
    : [];
  const dedupeRelated = (items: RelatedInsight[]) => {
    const map = new Map<string, RelatedInsight>();
    items.forEach((item) => {
      const id = item?._id;
      if (!id || id === insight._id) return;
      if (!SOLUTION_TYPES.has((item?.insightType ?? "") as InsightTypeKey)) return;
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
  let relatedSolutions = dedupeRelated([
    ...manualRelatedSolutions,
    ...relatedByTags,
    ...relatedByCategory,
  ]);
  if (relatedSolutions.length < 3 && insight._id) {
    const fallback = (await sanityClient.fetch(insightsListGroq, {
      lang: resolvedLocale,
      kind: "solutions",
      category: "",
      tag: "",
      sort: "",
      limit: 6,
    })) as RelatedInsight[];
    relatedSolutions = dedupeRelated([...relatedSolutions, ...(fallback || [])]);
  }
  relatedSolutions = relatedSolutions.slice(0, 6).map(localizeCard);

  const linkedKnowledge = Array.isArray(insight.linkedInsights)
    ? insight.linkedInsights
        .filter((item) => KNOWLEDGE_TYPES.has((item?.insightType ?? "") as InsightTypeKey))
        .map(localizeCard)
    : [];
  const relatedSolutionsWithId = relatedSolutions.filter(
    (item): item is RelatedInsight & { _id: string } => Boolean(item?._id)
  );
  const linkedKnowledgeWithId = linkedKnowledge.filter(
    (item): item is NonNullable<typeof linkedKnowledge[number]> & { _id: string } =>
      Boolean(item?._id)
  );

  const baseUrl = getBaseUrl();
  const canonicalUrl =
    insight.seoMetadata?.canonicalUrl ||
    `${baseUrl}${routeConfig.solutions}/${slug}`;
  const metaDescription =
    insight.seoMetadata?.metaDescription ||
    summary ||
    getPortableTextPlainText(body as PortableTextContent | null) ||
    "Explore proven solutions and case studies from ShopCart.";

  const author = insight.author;
  const authorSocialLinks = author?.socialLinks
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
    title: author?.title || "Solution Strategist",
    image: author?.image,
    bio: author?.bio ?? undefined,
    credentials: author?.credentials ?? undefined,
    credentialVerified: author?.credentialVerified ?? false,
    expertise: author?.expertise ?? undefined,
    socialLinks: authorSocialLinks,
  };

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Insight", url: routeConfig.root },
    { name: "Solutions", url: routeConfig.solutions },
    ...(categorySlug
      ? [{ name: categoryTitle, url: `${routeConfig.category}/${categorySlug}` }]
      : []),
    { name: title || "Solution", url: canonicalUrl },
  ]);

  const authorSchema =
    author?.name &&
    ({
      "@type": "Person",
      name: author.name,
      jobTitle: author.title,
      sameAs: [
        author.socialLinks?.linkedin,
        author.socialLinks?.twitter,
        author.socialLinks?.website,
      ].filter(Boolean),
    } as Record<string, unknown>);

  const caseStudySchema = isCaseStudy
    ? ({
        "@context": "https://schema.org",
        "@type": "CaseStudy",
        name: title || "Case Study",
        description: metaDescription,
        url: canonicalUrl,
        about: [
          categoryTitle ? { "@type": "Thing", name: categoryTitle } : null,
          insight.clientContext?.industry
            ? { "@type": "Thing", name: insight.clientContext.industry }
            : null,
        ].filter(Boolean),
        image: heroImageUrl ? [heroImageUrl] : undefined,
        datePublished: insight.publishedAt || undefined,
        dateModified: insight.updatedAt || insight._updatedAt || undefined,
        author: authorSchema,
        publisher: {
          "@type": "Organization",
          name: siteName,
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/logo.png`,
          },
        },
      } as Record<string, unknown>)
    : null;

  const howToSteps = buildHowToSteps(
    body,
    insight.solutionProducts,
    summary
  );
  const howToSchema = !isCaseStudy
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: title || "Solution playbook",
        description: metaDescription,
        step: howToSteps,
      }
    : null;

  const bundleSchema = generateSolutionBundleSchema(
    insight as InsightWithSolution,
    {
      canonicalUrl,
      imageUrl: heroImageUrl,
      currency: "THB",
    }
  );

  const structuredData = [
    breadcrumbSchema,
    caseStudySchema,
    howToSchema,
    bundleSchema,
  ].filter(Boolean);

  return (
    <>
      {structuredData.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <InsightAnalytics insightId={insightId} kind="solutions" locale={locale} />

      <div className="min-h-screen bg-surface-0 text-ink">
        <Container className="pt-6">
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
                  <Link href={routeConfig.solutions}>Solutions</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {categorySlug ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={`${routeConfig.category}/${categorySlug}`}>
                        {categoryTitle}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              ) : null}
              <BreadcrumbItem>
                <BreadcrumbPage>{title || "Solution"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Container>

        <Container className="py-8 sm:py-12 space-y-10">
          <section className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn("gap-2", maturity.className)}>
                <maturity.icon className="h-3.5 w-3.5" />
                {maturity.label}
              </Badge>
              <Badge
                variant="secondary"
                className="border border-border bg-surface-0 text-ink"
              >
                {solutionTypeLabel}
              </Badge>
              {categoryTitle ? (
                <Badge
                  variant="secondary"
                  className="border border-border bg-surface-0 text-ink"
                >
                  {categoryTitle}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
              {TRUST_SIGNALS.map((signal) => (
                <span
                  key={signal.label}
                  className="inline-flex items-center gap-2"
                >
                  <signal.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {signal.label}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-strong leading-tight">
                {title || "Solution"}
              </h1>
              <p className="text-base sm:text-lg text-ink-muted max-w-3xl">
                {summary ||
                  "Explore a proven solution playbook with clear outcomes and execution guidance."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn("gap-2", complexity.className)}>
                <complexity.icon className="h-3.5 w-3.5" />
                {complexity.label}
              </Badge>
              <Badge variant="secondary" className="gap-2 border border-border bg-surface-0 text-ink">
                <Clock className="h-3.5 w-3.5" />
                {timeline}
              </Badge>
            </div>

            {ctaItems.length ? (
              <div className="flex flex-wrap items-center gap-3">
                {ctaItems.map((cta, index) => (
                  <InsightCTA
                    key={`${cta.ctaType}-${index}`}
                    {...cta}
                    insightId={insight._id}
                    insightSlug={slug}
                    insightTitle={title || "Solution"}
                    locale={locale}
                    kind="solutions"
                    productSkus={productSkus.length ? productSkus : undefined}
                  />
                ))}
              </div>
            ) : null}

            {isCaseStudy && metrics.length ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-ink-strong">
                  Key metrics
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.map((metric, index) => {
                    const style = getMetricStyle(metric.metricLabel);
                    const MetricIcon = style.icon;

                    return (
                      <Card key={`${metric.metricLabel ?? "metric"}-${index}`} className={style.cardClass}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full ${style.iconBg}`}
                            >
                              <MetricIcon
                                className={`h-4 w-4 ${style.iconClass}`}
                                aria-hidden="true"
                              />
                            </div>
                            <div>
                              <p
                                className={`text-xs uppercase tracking-wide ${style.labelClass}`}
                              >
                                {metric.metricLabel || "Metric"}
                              </p>
                              <p className="text-lg font-semibold text-ink-strong">
                                {metric.metricValue || "TBD"}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-ink-soft">
                            {metric.metricDescription ||
                              "Outcome metrics for this solution."}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          {heroImageUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-0">
              <Image
                src={heroImageUrl}
                alt={title || "Solution hero"}
                width={1600}
                height={900}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          ) : null}

          {isCaseStudy ? (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-ink-strong">
                  Client context
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink-strong">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    Client
                  </div>
                  <p className="text-sm text-ink-muted">
                    {insight.clientContext?.clientName ||
                      "Confidential client"}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink-strong">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Industry
                  </div>
                  <p className="text-sm text-ink-muted">
                    {insight.clientContext?.industry || "Industry not disclosed"}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink-strong">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    Challenge
                  </div>
                  <p className="text-sm text-ink-muted">
                    {insight.clientContext?.challengeDescription ||
                      "Challenge details coming soon."}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink-strong">
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                    Solution overview
                  </div>
                  <p className="text-sm text-ink-muted">
                    {insight.clientContext?.solutionDescription ||
                      "Solution overview coming soon."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border border-border">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <div className="prose prose-lg max-w-none text-ink prose-headings:text-ink-strong prose-a:text-ink-strong hover:prose-a:text-ink">
                {Array.isArray(body) && body.length > 0 ? (
                  <PortableTextRenderer
                    value={body as PortableTextContent}
                    options={{ accentCtaStrategy: "none" }}
                  />
                ) : (
                  <p>Detailed guidance for this solution is coming soon.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {author ? (
            <InsightAuthorCard
              author={authorCardData}
              variant="full"
              authorBasePath={routeConfig.authors}
            />
          ) : null}
        </Container>
      </div>

      <section id="solution-bundle" className="py-10 sm:py-12 bg-surface-0">
        <Container className="space-y-6">
          <div>
            <p className="text-sm text-ink-soft">Solution products</p>
            <h2 className="text-2xl font-bold text-ink-strong">
              Build the full solution
            </h2>
            <p className="text-sm text-ink-muted">
              Bundle the recommended products and add them to your cart in one
              step.
            </p>
          </div>
          <SolutionProductBundle
            solutionTitle={title || "Solution bundle"}
            solutionProducts={bundleProducts}
          />
        </Container>
      </section>

      {relatedSolutionsWithId.length ? (
        <section className="py-10 sm:py-12 bg-surface-0">
          <Container className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-ink-soft">
                  Related solutions
                </p>
                <h2 className="text-2xl font-bold text-ink-strong">
                  Related solutions
                </h2>
              </div>
              <Button
                asChild
                variant="outline"
                className="text-ink"
              >
                <Link href={routeConfig.solutions}>View all solutions</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedSolutionsWithId.map((item) => (
                <InsightCard
                  key={item._id}
                  insight={item as InsightCardProps["insight"]}
                  variant="solution"
                  showMetrics
                  linkBase={{ knowledge: routeConfig.knowledge, solutions: routeConfig.solutions }}
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {linkedKnowledgeWithId.length ? (
        <section className="py-10 sm:py-12">
          <Container className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-ink-soft">
                  Linked knowledge articles
                </p>
                <h2 className="text-2xl font-bold text-ink-strong">
                  Linked knowledge articles
                </h2>
              </div>
              <Button
                asChild
                variant="outline"
                className="text-ink"
              >
                <Link href={routeConfig.knowledge}>View all knowledge</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {linkedKnowledgeWithId.map((item) => (
                <InsightCard
                  key={item._id}
                  insight={item as InsightCardProps["insight"]}
                  variant="default"
                  linkBase={{ knowledge: routeConfig.knowledge, solutions: routeConfig.solutions }}
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </>
  );
};

const SolutionInsightPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const routeConfig = getInsightRouteConfig(null);
  return renderSolutionInsightPage({
    slug,
    locale,
    routeConfig,
  });
};

export default SolutionInsightPage;
