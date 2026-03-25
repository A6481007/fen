import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import { PortableText } from "next-sanity";
import type { ComponentProps, ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Facebook,
  Linkedin,
  Lightbulb,
  Package,
  RefreshCw,
  Scale,
  Share2,
  Twitter,
  Wrench,
} from "lucide-react";
import Container from "@/components/Container";
import InsightCard, { type InsightCardProps } from "@/components/insight/InsightCard";
import InsightAuthorCard from "@/components/insight/InsightAuthorCard";
import LinkedProducts from "@/components/insight/LinkedProducts";
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

type PortableTextSpan = {
  _type?: string;
  text?: string;
};

type PortableTextBlock = {
  _type?: string;
  style?: string;
  _key?: string;
  children?: PortableTextSpan[];
};

type TocItem = {
  id: string;
  text: string;
  level: "h2" | "h3";
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
  readingTime?: number | null;
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
  linkedProducts?: Product[] | null;
  linkedInsights?: Array<{
    _id?: string;
    title?: string | null;
    slug?: { current?: string | null };
    insightType?: string | null;
    summary?: string | null;
    mainImage?: unknown;
  }> | null;
  pillarPage?: { _id?: string; title?: string | null; slug?: { current?: string | null } } | null;
  clusterContent?: Array<{
    _id?: string;
    title?: string | null;
    slug?: { current?: string | null };
    insightType?: string | null;
    summary?: string | null;
  }> | null;
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

const INSIGHT_TYPE_CONFIG: Record<
  string,
  { label: string; className: string; icon: LucideIcon }
> = {
  productKnowledge: {
    label: "Product Knowledge",
    icon: Package,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  generalKnowledge: {
    label: "General Knowledge",
    icon: Lightbulb,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  problemKnowledge: {
    label: "Problem Knowledge",
    icon: AlertTriangle,
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  comparison: {
    label: "Comparison",
    icon: Scale,
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  caseStudy: {
    label: "Case Study",
    icon: BookOpen,
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  validatedSolution: {
    label: "Validated Solution",
    icon: Wrench,
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  theoreticalSolution: {
    label: "Theoretical Solution",
    icon: Wrench,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
};

const FALLBACK_INSIGHT_TYPE = {
  label: "Insight",
  icon: BookOpen,
  className: "bg-gray-100 text-gray-700 border-gray-200",
};

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format("MMM D, YYYY") : "Coming soon";

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 96);

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

const calculateReadingTime = (blocks?: PortableTextBlock[] | null) => {
  const text = getPlainText(blocks);
  if (!text) return 2;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

const buildTableOfContents = (blocks?: PortableTextBlock[] | null) => {
  const items: TocItem[] = [];
  const idByKey = new Map<string, string>();
  const slugCounts = new Map<string, number>();

  if (!Array.isArray(blocks)) {
    return { items, idByKey };
  }

  blocks.forEach((block) => {
    if (!block || block._type !== "block") return;
    if (block.style !== "h2" && block.style !== "h3") return;
    const text = getBlockText(block);
    if (!text) return;

    const slugBase = slugify(text);
    const base = slugBase || block._key || `section-${items.length + 1}`;
    const count = (slugCounts.get(base) ?? 0) + 1;
    slugCounts.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;

    if (block._key) idByKey.set(block._key, id);
    items.push({ id, text, level: block.style as TocItem["level"] });
  });

  return { items, idByKey };
};

const buildPortableTextComponents = (
  headingIdMap: Map<string, string>
): ComponentProps<typeof PortableText>["components"] => {
  const getHeadingId = (block?: PortableTextBlock) => {
    if (!block) return undefined;
    if (block._key && headingIdMap.has(block._key)) {
      return headingIdMap.get(block._key);
    }
    const text = getBlockText(block);
    return slugify(text) || block._key;
  };

  return {
    block: {
      normal: ({ children }: { children?: ReactNode }) => (
        <p className="my-6 text-base leading-relaxed text-gray-700 first:mt-0 last:mb-0">
          {children}
        </p>
      ),
      h2: ({ children, value }: { children?: ReactNode; value?: PortableTextBlock }) => (
        <h2
          id={getHeadingId(value)}
          className="my-8 text-2xl sm:text-3xl font-bold text-shop_dark_green scroll-mt-24 first:mt-0 last:mb-0"
        >
          {children}
        </h2>
      ),
      h3: ({ children, value }: { children?: ReactNode; value?: PortableTextBlock }) => (
        <h3
          id={getHeadingId(value)}
          className="my-6 text-xl sm:text-2xl font-semibold text-shop_dark_green scroll-mt-24 first:mt-0 last:mb-0"
        >
          {children}
        </h3>
      ),
      blockquote: ({ children }: { children?: ReactNode }) => (
        <blockquote className="my-8 border-l-4 border-shop_light_green bg-shop_light_bg pl-6 py-4 text-base italic text-gray-700 first:mt-0 last:mb-0">
          {children}
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }: { children?: ReactNode }) => (
        <ul className="my-6 list-disc pl-6 space-y-2 text-gray-700">{children}</ul>
      ),
      number: ({ children }: { children?: ReactNode }) => (
        <ol className="my-6 list-decimal pl-6 space-y-2 text-gray-700">{children}</ol>
      ),
    },
    listItem: {
      bullet: ({ children }: { children?: ReactNode }) => <li className="pl-2">{children}</li>,
      number: ({ children }: { children?: ReactNode }) => <li className="pl-2">{children}</li>,
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
};

const buildShareLinks = (title: string, url: string) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return [
    {
      label: "Twitter",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <Twitter className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
      icon: <Linkedin className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <Facebook className="h-4 w-4" aria-hidden="true" />,
    },
  ];
};

const getInsightTypeConfig = (type?: string | null) =>
  INSIGHT_TYPE_CONFIG[type ?? ""] ?? FALLBACK_INSIGHT_TYPE;

const getInsightHref = (slug?: string | null, type?: string | null) => {
  if (!slug) return "/insight/knowledge";
  if (SOLUTION_TYPES.has(type ?? "")) {
    return `/insight/solutions/${slug}`;
  }
  return `/insight/knowledge/${slug}`;
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const insight = (await getInsightBySlug(params.slug)) as InsightDocument | null;

  if (!insight) {
    return {
      title: "Insight Not Found",
      description: "The requested insight could not be found.",
    };
  }

  const insightTitle = insight.title || "Insight";
  const seo = insight.seoMetadata;
  const metaTitle =
    seo?.metaTitle || `${insightTitle} | Knowledge | Insight Hub | ${siteName}`;
  const description =
    seo?.metaDescription ||
    insight.summary ||
    "Explore expert knowledge and insight from ShopCart.";
  const baseUrl = getBaseUrl();
  const canonical =
    seo?.canonicalUrl || `${baseUrl}/insight/knowledge/${params.slug}`;
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

const KnowledgeInsightPage = async ({ params }: { params: { slug: string } }) => {
  const insight = (await getInsightBySlug(params.slug)) as InsightDocument | null;

  if (!insight) return notFound();

  const insightType = insight.insightType || "";
  if (SOLUTION_TYPES.has(insightType)) {
    redirect(`/insight/solutions/${params.slug}`);
  }

  if (!KNOWLEDGE_TYPES.has(insightType)) {
    return notFound();
  }

  const baseUrl = getBaseUrl();
  const canonicalUrl =
    insight.seoMetadata?.canonicalUrl ||
    `${baseUrl}/insight/knowledge/${params.slug}`;
  const heroImage = insight.mainImage;
  const heroImageUrl = heroImage
    ? urlFor(heroImage).width(1600).height(900).url()
    : null;
  const metaDescription =
    insight.seoMetadata?.metaDescription ||
    insight.summary ||
    "Explore expert knowledge and insight from ShopCart.";
  const author = insight.author;
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
    socialLinks: author?.socialLinks ?? undefined,
  };
  const publishedAt = insight.publishedAt;
  const updatedAt = insight.updatedAt || insight._updatedAt;
  const showUpdated = Boolean(updatedAt && updatedAt !== publishedAt);
  const readingTime =
    insight.readingTime ?? calculateReadingTime(insight.body);
  const category = insight.primaryCategory || insight.categories?.[0] || null;
  const categoryTitle = category?.title || "Knowledge";
  const categorySlug = category?.slug?.current || "";
  const insightTypeConfig = getInsightTypeConfig(insightType);
  const shareUrl = `${baseUrl}/insight/knowledge/${params.slug}`;
  const shareLinks = buildShareLinks(insight.title || "Insight", shareUrl);
  const linkedProducts = Array.isArray(insight.linkedProducts)
    ? insight.linkedProducts
    : [];
  const linkedProductsDisplay = linkedProducts
    .filter((product) => Boolean(product?._id))
    .map((product) => {
      const brand = (product as { brand?: { title?: string; slug?: { current?: string } } })
        .brand;

      return {
        _id: product._id,
        name: product.name || "Product",
        slug: { current: product.slug?.current || "" },
        images: product.images ?? [],
        price: product.price ?? 0,
        dealerPrice: product.dealerPrice ?? undefined,
        discount: product.discount ?? undefined,
        stock: product.stock ?? 0,
        description: product.description ?? undefined,
        brand: brand?.title
          ? { title: brand.title, slug: brand.slug ?? undefined }
          : undefined,
      };
    });
  const productIds = linkedProducts
    .map((product) => product?._id)
    .filter(Boolean) as string[];
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
  const clusterContent = Array.isArray(insight.clusterContent)
    ? insight.clusterContent
    : [];
  const tocInfo = buildTableOfContents(insight.body);
  const portableTextComponents = buildPortableTextComponents(tocInfo.idByKey);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Insight", url: "/insight" },
    { name: "Knowledge", url: "/insight/knowledge" },
    ...(categorySlug
      ? [{ name: categoryTitle, url: `/insight/category/${categorySlug}` }]
      : []),
    { name: insight.title || "Insight", url: `/insight/knowledge/${params.slug}` },
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
    articleSchema.image = [
      urlFor(heroImage).width(1200).height(630).url(),
    ];
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

  const structuredData = [breadcrumbSchema, articleSchema].filter(Boolean);

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
                  <Link href="/insight/knowledge">Knowledge</Link>
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
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{categoryTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{insight.title || "Insight"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Container>

        <Container className="py-8 sm:py-12 space-y-10">
          <section className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`gap-2 ${insightTypeConfig.className}`}>
                <insightTypeConfig.icon className="h-3.5 w-3.5" />
                {insightTypeConfig.label}
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

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-shop_dark_green leading-tight">
                {insight.title || "Insight"}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-3xl">
                {insight.summary ||
                  "Explore expert analysis and practical knowledge from our specialists."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
              <InsightAuthorCard author={authorCardData} variant="compact" />

              {publishedAt ? (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
                </div>
              ) : null}

              {showUpdated ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={updatedAt || undefined}>
                    Updated {formatDate(updatedAt)}
                  </time>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{readingTime} min read</span>
              </div>
            </div>

            {shareLinks.length ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-shop_dark_green flex items-center gap-2">
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  Share:
                </span>
                {shareLinks.map((link) => (
                  <Button
                    key={link.label}
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Link
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Share on ${link.label}`}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </div>
            ) : null}
          </section>

          {heroImageUrl ? (
            <div className="relative overflow-hidden rounded-2xl shadow-xl">
              <Image
                src={heroImageUrl}
                alt={insight.title || "Insight hero"}
                width={1600}
                height={900}
                className="h-auto w-full object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
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
                  <p>Additional details for this knowledge article are coming soon.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {tocInfo.items.length ? (
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-shop_dark_green">
                  Table of contents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tocInfo.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-sm text-gray-700 hover:text-shop_dark_green ${
                      item.level === "h3" ? "pl-4" : ""
                    }`}
                  >
                    {item.text}
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {author ? (
            <InsightAuthorCard author={authorCardData} variant="full" />
          ) : null}
        </Container>

        {linkedProductsDisplay.length ? (
          <section className="py-10 sm:py-12 bg-white">
            <Container className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-shop_dark_green/70">
                    Products Mentioned in This Article
                  </p>
                  <h2 className="text-2xl font-bold text-shop_dark_green">
                    Products Mentioned in This Article
                  </h2>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
                >
                  <Link href="/shop">View all products</Link>
                </Button>
              </div>
              <LinkedProducts products={linkedProductsDisplay} variant="grid" />
            </Container>
          </section>
        ) : null}

        {relatedInsights.length ? (
          <section className="py-10 sm:py-12 bg-gradient-to-b from-shop_light_bg/40 to-white">
            <Container className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-shop_dark_green/70">Related Insights</p>
                  <h2 className="text-2xl font-bold text-shop_dark_green">
                    Related insights
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
                {relatedInsights.map((item, index) => (
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

        {clusterContent.length || insight.pillarPage ? (
          <section className="py-10 sm:py-12">
            <Container className="space-y-6">
              {clusterContent.length ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-shop_dark_green/70">Deep Dives</p>
                    <h2 className="text-2xl font-bold text-shop_dark_green">
                      Deep Dives
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {clusterContent.map((item) => {
                      const clusterSlug = item?.slug?.current || "";
                      const clusterHref = getInsightHref(
                        clusterSlug,
                        item?.insightType
                      );

                      return (
                        <Card
                          key={item?._id}
                          className="border border-gray-100 shadow-sm hover:shadow-md transition"
                        >
                          <CardContent className="p-5 space-y-3">
                            <Link href={clusterHref} className="block">
                              <h3 className="text-lg font-semibold text-shop_dark_green hover:text-shop_light_green line-clamp-2">
                                {item?.title || "Deep dive"}
                              </h3>
                            </Link>
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {item?.summary ||
                                "Explore the next chapter in this knowledge series."}
                            </p>
                            <Link
                              href={clusterHref}
                              className="inline-flex items-center gap-2 text-sm font-medium text-shop_light_green hover:text-shop_dark_green"
                            >
                              Explore deep dive
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {insight.pillarPage?.title ? (
                <Card className="border border-shop_light_green/30 bg-shop_light_bg/60 shadow-sm">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-shop_dark_green/70">
                        Part of a pillar page
                      </p>
                      <h3 className="text-lg font-semibold text-shop_dark_green">
                        Part of {insight.pillarPage.title}
                      </h3>
                    </div>
                    <Button asChild variant="outline">
                      <Link
                        href={getInsightHref(
                          insight.pillarPage.slug?.current,
                          null
                        )}
                      >
                        View pillar page
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </Container>
          </section>
        ) : null}
      </div>
    </>
  );
};

export default KnowledgeInsightPage;
