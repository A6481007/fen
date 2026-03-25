import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PortableText } from "next-sanity";
import type { ComponentProps, ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  Clock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import Container from "@/components/Container";
import InsightCard, { type InsightCardProps } from "@/components/insight/InsightCard";
import InsightAuthorCard from "@/components/insight/InsightAuthorCard";
import SolutionProductBundle from "@/components/insight/SolutionProductBundle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { urlFor } from "@/sanity/lib/image";
import { getInsightBySlug, getRelatedInsights } from "@/sanity/queries";
import type { Product } from "@/sanity.types";

const siteName = "ShopCart";

const KNOWLEDGE_TYPES = new Set([
  "productKnowledge",
  "generalKnowledge",
  "problemKnowledge",
  "comparison",
]);

const SOLUTION_TYPES = new Set([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);

type SolutionTypeKey = "caseStudy" | "validatedSolution" | "theoreticalSolution";
type SolutionComplexityKey = "quickWin" | "standard" | "enterprise";
type MaturityKey = "proven" | "tested" | "emerging";

type PortableTextSpan = {
  _type: string;
  text?: string;
};

type PortableTextBlock = {
  _type: string;
  style?: string;
  _key?: string;
  children?: PortableTextSpan[];
};

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

type InsightDocument = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null };
  summary?: string | null;
  insightType?: string | null;
  body?: PortableTextBlock[] | null;
  mainImage?: unknown;
  publishedAt?: string | null;
  updatedAt?: string | null;
  _updatedAt?: string | null;
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
  linkedInsights?: Array<{
    _id?: string;
    title?: string | null;
    slug?: { current?: string | null };
    insightType?: string | null;
    summary?: string | null;
    mainImage?: unknown;
  }> | null;
  linkedProducts?: Product[] | null;
  seoMetadata?: SeoMetadata | null;
  primaryKeyword?: string | null;
  secondaryKeywords?: Array<{ keyword?: string | null }> | null;
  tags?: string[] | null;
};

type RelatedInsight = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null };
  insightType?: string | null;
  summary?: string | null;
  mainImage?: unknown;
  readingTime?: number | null;
  author?: { name?: string | null; image?: unknown } | null;
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
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: ShieldCheck,
  },
  tested: {
    label: "Tested",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    icon: BadgeCheck,
  },
  emerging: {
    label: "Emerging",
    className: "bg-amber-100 text-amber-800 border-amber-200",
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
    className: "bg-white text-shop_dark_green border border-gray-200",
  },
  standard: {
    label: "Standard",
    icon: BarChart3,
    className: "bg-white text-shop_dark_green border border-gray-200",
  },
  enterprise: {
    label: "Enterprise",
    icon: Building2,
    className: "bg-white text-shop_dark_green border border-gray-200",
  },
};

const SOLUTION_TYPE_LABELS: Record<SolutionTypeKey, string> = {
  caseStudy: "Case Study",
  validatedSolution: "Validated Solution",
  theoreticalSolution: "Theoretical Solution",
};

const METRIC_STYLES = [
  {
    match: /roi|return|savings|cost|margin|profit/i,
    cardClass: "border-emerald-100 bg-emerald-50/70",
    labelClass: "text-emerald-700",
    iconClass: "text-emerald-700",
    iconBg: "bg-emerald-100",
    icon: TrendingUp,
  },
  {
    match: /time|timeline|speed|delivery|duration/i,
    cardClass: "border-blue-100 bg-blue-50/70",
    labelClass: "text-blue-700",
    iconClass: "text-blue-700",
    iconBg: "bg-blue-100",
    icon: Clock,
  },
  {
    match: /uptime|reliability|security|risk|availability/i,
    cardClass: "border-purple-100 bg-purple-50/70",
    labelClass: "text-purple-700",
    iconClass: "text-purple-700",
    iconBg: "bg-purple-100",
    icon: ShieldCheck,
  },
  {
    match: /adoption|users|engagement|satisfaction|growth/i,
    cardClass: "border-amber-100 bg-amber-50/70",
    labelClass: "text-amber-700",
    iconClass: "text-amber-700",
    iconBg: "bg-amber-100",
    icon: Sparkles,
  },
];

const DEFAULT_METRIC_STYLE = {
  cardClass: "border-gray-100 bg-white",
  labelClass: "text-shop_dark_green",
  iconClass: "text-shop_dark_green",
  iconBg: "bg-shop_light_bg",
  icon: Sparkles,
};

const TRUST_SIGNALS = [
  { icon: ShieldCheck, label: "Verified outcomes" },
  { icon: BadgeCheck, label: "Reviewed by experts" },
  { icon: Sparkles, label: "Trusted deployment playbook" },
];

const portableTextComponents: ComponentProps<typeof PortableText>["components"] =
  {
    block: {
      normal: ({ children }: { children?: ReactNode }) => (
        <p className="my-6 text-base leading-relaxed text-gray-700 first:mt-0 last:mb-0">
          {children}
        </p>
      ),
      h2: ({ children }: { children?: ReactNode }) => (
        <h2 className="my-8 text-2xl sm:text-3xl font-bold text-shop_dark_green">
          {children}
        </h2>
      ),
      h3: ({ children }: { children?: ReactNode }) => (
        <h3 className="my-6 text-xl sm:text-2xl font-semibold text-shop_dark_green">
          {children}
        </h3>
      ),
      blockquote: ({ children }: { children?: ReactNode }) => (
        <blockquote className="my-8 border-l-4 border-shop_light_green bg-shop_light_bg pl-6 py-4 text-base italic text-gray-700">
          {children}
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }: { children?: ReactNode }) => (
        <ul className="my-6 list-disc pl-6 space-y-2 text-gray-700">
          {children}
        </ul>
      ),
      number: ({ children }: { children?: ReactNode }) => (
        <ol className="my-6 list-decimal pl-6 space-y-2 text-gray-700">
          {children}
        </ol>
      ),
    },
    listItem: {
      bullet: ({ children }: { children?: ReactNode }) => (
        <li className="pl-2">{children}</li>
      ),
      number: ({ children }: { children?: ReactNode }) => (
        <li className="pl-2">{children}</li>
      ),
    },
    marks: {
      strong: ({ children }: { children?: ReactNode }) => (
        <strong className="font-semibold text-shop_dark_green">{children}</strong>
      ),
      code: ({ children }: { children?: ReactNode }) => (
        <code className="bg-shop_light_bg px-2 py-1 rounded text-sm font-mono text-shop_dark_green">
          {children}
        </code>
      ),
      link: ({
        value,
        children,
      }: {
        value?: { href?: string };
        children?: ReactNode;
      }) => (
        <Link
          href={value?.href || "#"}
          className="font-medium text-shop_light_green underline decoration-shop_light_green underline-offset-4 transition-colors hover:text-shop_dark_green hover:decoration-shop_dark_green"
        >
          {children}
        </Link>
      ),
    },
  };

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

const getBlockText = (block?: PortableTextBlock) =>
  block?.children?.map((child) => child?.text || "").join(" ").trim() || "";

const getPlainText = (blocks?: PortableTextBlock[] | null) =>
  Array.isArray(blocks)
    ? blocks
        .map((block) => (block?._type === "block" ? getBlockText(block) : ""))
        .filter(Boolean)
        .join(" ")
        .trim()
    : "";

const getMetricStyle = (label?: string | null) => {
  const value = label?.toLowerCase() || "";
  const match = METRIC_STYLES.find((style) => style.match.test(value));
  return match ?? DEFAULT_METRIC_STYLE;
};

const getSolutionTypeLabel = (type?: string | null) =>
  SOLUTION_TYPE_LABELS[type as SolutionTypeKey] ?? "Solution";

const buildHowToSteps = (
  body: PortableTextBlock[] | null | undefined,
  products: InsightDocument["solutionProducts"] | null | undefined,
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
          .map((block) => getBlockText(block))
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

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const insight = (await getInsightBySlug(params.slug)) as InsightDocument | null;

  if (!insight || !SOLUTION_TYPES.has(insight.insightType || "")) {
    return {
      title: "Solution Not Found",
      description: "The requested solution could not be found.",
    };
  }

  const insightTitle = insight.title || "Solution";
  const seo = insight.seoMetadata;
  const metaTitle =
    seo?.metaTitle || `${insightTitle} | Solutions | Insight Hub | ${siteName}`;
  const description =
    seo?.metaDescription ||
    insight.summary ||
    getPlainText(insight.body) ||
    "Explore proven solutions and case studies from ShopCart.";
  const baseUrl = getBaseUrl();
  const canonical =
    seo?.canonicalUrl || `${baseUrl}/insight/solutions/${params.slug}`;
  const imageSource = seo?.ogImage || insight.mainImage;
  const imageUrl = imageSource
    ? urlFor(imageSource).width(1200).height(630).url()
    : undefined;
  const keywordSet = new Set<string>();
  (seo?.keywords || []).forEach((keyword) => {
    if (keyword) keywordSet.add(keyword);
  });
  if (insight.primaryKeyword) keywordSet.add(insight.primaryKeyword);
  (insight.secondaryKeywords || []).forEach((entry) => {
    if (entry?.keyword) keywordSet.add(entry.keyword);
  });

  return {
    title: metaTitle,
    description,
    keywords: keywordSet.size ? Array.from(keywordSet) : undefined,
    alternates: {
      canonical,
    },
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
    robots: seo?.noIndex ? "noindex" : "index",
  };
}

const SolutionInsightPage = async ({ params }: { params: { slug: string } }) => {
  const insight = (await getInsightBySlug(params.slug)) as InsightDocument | null;

  if (!insight) return notFound();

  const insightType = insight.insightType || "";
  if (KNOWLEDGE_TYPES.has(insightType)) {
    redirect(`/insight/knowledge/${params.slug}`);
  }
  if (!SOLUTION_TYPES.has(insightType)) {
    return notFound();
  }

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
  const linkedProducts = Array.isArray(insight.linkedProducts)
    ? insight.linkedProducts
    : [];
  const productIds = [
    ...solutionProducts.map((item) => item?.product?._id),
    ...linkedProducts.map((product) => product?._id),
  ].filter(Boolean) as string[];

  const shouldFetchRelated = Boolean(
    insight._id && (category?._id || productIds.length)
  );
  const relatedInsights = shouldFetchRelated
    ? ((await getRelatedInsights(
        insight._id || "",
        category?._id || "",
        productIds,
        6
      )) as RelatedInsight[])
    : [];
  const relatedSolutions = relatedInsights.filter((item) =>
    SOLUTION_TYPES.has(item?.insightType ?? "")
  );

  const linkedKnowledge = Array.isArray(insight.linkedInsights)
    ? insight.linkedInsights.filter((item) =>
        KNOWLEDGE_TYPES.has(item?.insightType ?? "")
      )
    : [];

  const baseUrl = getBaseUrl();
  const canonicalUrl =
    insight.seoMetadata?.canonicalUrl ||
    `${baseUrl}/insight/solutions/${params.slug}`;
  const metaDescription =
    insight.seoMetadata?.metaDescription ||
    insight.summary ||
    getPlainText(insight.body) ||
    "Explore proven solutions and case studies from ShopCart.";

  const author = insight.author;
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
    socialLinks: author?.socialLinks ?? undefined,
  };

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Insight", url: "/insight" },
    { name: "Solutions", url: "/insight/solutions" },
    ...(categorySlug
      ? [{ name: categoryTitle, url: `/insight/category/${categorySlug}` }]
      : []),
    { name: insight.title || "Solution", url: `/insight/solutions/${params.slug}` },
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
        name: insight.title || "Case Study",
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
    insight.body,
    insight.solutionProducts,
    insight.summary
  );
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: insight.title || "Solution playbook",
    description: metaDescription,
    step: howToSteps,
  };

  const bundleTotal = bundleProducts.reduce((sum, item) => {
    const quantity = item.quantity ?? 1;
    const price = item.product.price ?? 0;
    return sum + price * quantity;
  }, 0);
  const bundleSchema =
    bundleProducts.length > 0
      ? ({
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${insight.title || "Solution"} Bundle`,
          description: metaDescription,
          sku: `solution-${params.slug}`,
          image: heroImageUrl ? [heroImageUrl] : undefined,
          brand: { "@type": "Organization", name: siteName },
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: bundleTotal,
            availability: "https://schema.org/InStock",
            url: canonicalUrl,
          },
        } as Record<string, unknown>)
      : null;

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

      <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
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
                  <Link href="/insight">Insight</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/insight/solutions">Solutions</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {categorySlug ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={`/insight/category/${categorySlug}`}>
                        {categoryTitle}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              ) : null}
              <BreadcrumbItem>
                <BreadcrumbPage>{insight.title || "Solution"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Container>

        <Container className="py-8 sm:py-12 space-y-10">
          <section className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`gap-2 ${maturity.className}`}>
                <maturity.icon className="h-3.5 w-3.5" />
                {maturity.label}
              </Badge>
              <Badge
                variant="secondary"
                className="bg-white text-shop_dark_green border border-gray-200"
              >
                {solutionTypeLabel}
              </Badge>
              {categoryTitle ? (
                <Badge
                  variant="secondary"
                  className="bg-white text-shop_dark_green border border-gray-200"
                >
                  {categoryTitle}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
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
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-shop_dark_green leading-tight">
                {insight.title || "Solution"}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-3xl">
                {insight.summary ||
                  "Explore a proven solution playbook with clear outcomes and execution guidance."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`gap-2 ${complexity.className}`}>
                <complexity.icon className="h-3.5 w-3.5" />
                {complexity.label}
              </Badge>
              <Badge className="gap-2 bg-white text-shop_dark_green border border-gray-200">
                <Clock className="h-3.5 w-3.5" />
                {timeline}
              </Badge>
            </div>

            {isCaseStudy && metrics.length ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-shop_dark_green">
                  Key metrics
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.map((metric, index) => {
                    const style = getMetricStyle(metric.metricLabel);
                    const MetricIcon = style.icon;

                    return (
                      <Card
                        key={`${metric.metricLabel ?? "metric"}-${index}`}
                        className={`border ${style.cardClass}`}
                      >
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
                              <p className="text-lg font-semibold text-shop_dark_green">
                                {metric.metricValue || "TBD"}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">
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
            <div className="relative overflow-hidden rounded-2xl shadow-xl">
              <Image
                src={heroImageUrl}
                alt={insight.title || "Solution hero"}
                width={1600}
                height={900}
                className="h-auto w-full object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          ) : null}

          {isCaseStudy ? (
            <Card className="border border-gray-100 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-shop_dark_green">
                  Client context
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-shop_dark_green">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    Client
                  </div>
                  <p className="text-sm text-gray-600">
                    {insight.clientContext?.clientName ||
                      "Confidential client"}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-shop_dark_green">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Industry
                  </div>
                  <p className="text-sm text-gray-600">
                    {insight.clientContext?.industry || "Industry not disclosed"}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-shop_dark_green">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    Challenge
                  </div>
                  <p className="text-sm text-gray-600">
                    {insight.clientContext?.challengeDescription ||
                      "Challenge details coming soon."}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-shop_dark_green">
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                    Solution overview
                  </div>
                  <p className="text-sm text-gray-600">
                    {insight.clientContext?.solutionDescription ||
                      "Solution overview coming soon."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <div className="prose prose-lg max-w-none text-gray-800 prose-headings:text-shop_dark_green prose-a:text-shop_light_green hover:prose-a:text-shop_dark_green">
                {Array.isArray(insight.body) && insight.body.length > 0 ? (
                  <PortableText
                    value={insight.body}
                    components={portableTextComponents}
                  />
                ) : (
                  <p>Detailed guidance for this solution is coming soon.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {author ? (
            <InsightAuthorCard author={authorCardData} variant="full" />
          ) : null}
        </Container>
      </div>

      <section className="py-10 sm:py-12 bg-white">
        <Container className="space-y-6">
          <div>
            <p className="text-sm text-shop_dark_green/70">Solution products</p>
            <h2 className="text-2xl font-bold text-shop_dark_green">
              Build the full solution
            </h2>
            <p className="text-sm text-gray-600">
              Bundle the recommended products and add them to your cart in one
              step.
            </p>
          </div>
          <SolutionProductBundle
            solutionTitle={insight.title || "Solution bundle"}
            solutionProducts={bundleProducts}
          />
        </Container>
      </section>

      {relatedSolutions.length ? (
        <section className="py-10 sm:py-12 bg-gradient-to-b from-shop_light_bg/40 to-white">
          <Container className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-shop_dark_green/70">
                  Related solutions
                </p>
                <h2 className="text-2xl font-bold text-shop_dark_green">
                  Related solutions
                </h2>
              </div>
              <Button
                asChild
                variant="outline"
                className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
              >
                <Link href="/insight/solutions">View all solutions</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedSolutions.map((item, index) => (
                <InsightCard
                  key={item?._id || index}
                  insight={item as InsightCardProps["insight"]}
                  variant="solution"
                  showMetrics
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {linkedKnowledge.length ? (
        <section className="py-10 sm:py-12">
          <Container className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-shop_dark_green/70">
                  Linked knowledge articles
                </p>
                <h2 className="text-2xl font-bold text-shop_dark_green">
                  Linked knowledge articles
                </h2>
              </div>
              <Button
                asChild
                variant="outline"
                className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
              >
                <Link href="/insight/knowledge">View all knowledge</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {linkedKnowledge.map((item, index) => (
                <InsightCard
                  key={item?._id || index}
                  insight={item as InsightCardProps["insight"]}
                  variant="default"
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </>
  );
};

export default SolutionInsightPage;
