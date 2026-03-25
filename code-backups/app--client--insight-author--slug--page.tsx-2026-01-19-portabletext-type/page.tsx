import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PortableText } from "next-sanity";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Globe,
  Linkedin,
  Twitter,
  User2,
} from "lucide-react";
import Container from "@/components/Container";
import InsightCard, { type InsightCardProps } from "@/components/insight/InsightCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getInsightAuthorBySlug } from "@/sanity/queries";

const siteName = "ShopCart";

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

type InsightSummary = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null };
  insightType?: string | null;
  summary?: string | null;
  mainImage?: unknown;
  readingTime?: number | null;
  publishedAt?: string | null;
};

type InsightAuthor = {
  name?: string | null;
  title?: string | null;
  image?: unknown;
  bio?: string | null;
  extendedBio?: PortableTextBlock[] | null;
  credentials?: string[] | null;
  credentialVerified?: boolean | null;
  expertise?: string[] | null;
  socialLinks?: {
    linkedin?: string | null;
    twitter?: string | null;
    website?: string | null;
  } | null;
  insights?: InsightSummary[] | null;
};

type AuthorSearchParams = {
  type?: string | string[];
  sort?: string | string[];
};

type AuthorPageProps = {
  params: { slug: string };
  searchParams?: AuthorSearchParams | Promise<AuthorSearchParams>;
};

type InsightTypeKey =
  | "productKnowledge"
  | "generalKnowledge"
  | "problemKnowledge"
  | "comparison"
  | "caseStudy"
  | "validatedSolution"
  | "theoreticalSolution";

const INSIGHT_TYPE_CONFIG: Record<
  InsightTypeKey,
  { label: string; className: string }
> = {
  productKnowledge: {
    label: "Product Knowledge",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  generalKnowledge: {
    label: "General Knowledge",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  problemKnowledge: {
    label: "Problem Knowledge",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  comparison: {
    label: "Comparison Article",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  caseStudy: {
    label: "Case Study (Proven)",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  validatedSolution: {
    label: "Validated Solution",
    className: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
  theoreticalSolution: {
    label: "Theoretical Solution",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

const INSIGHT_TYPE_ORDER: InsightTypeKey[] = [
  "productKnowledge",
  "generalKnowledge",
  "problemKnowledge",
  "comparison",
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
];

const parseParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value || "";

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const author = (await getInsightAuthorBySlug(params.slug)) as InsightAuthor | null;

  if (!author) {
    return {
      title: "Author Not Found",
      description: "The requested author profile could not be found.",
    };
  }

  const name = author.name || "Insight Author";
  const expertise = (author.expertise || []).filter(Boolean);
  const description =
    author.bio ||
    (expertise.length
      ? `Explore insights on ${expertise.slice(0, 2).join(", ")} by ${name}.`
      : `Read expert insights by ${name}.`);
  const baseUrl = getBaseUrl();
  const canonical = `${baseUrl}/insight/author/${params.slug}`;
  const imageUrl = author.image
    ? urlFor(author.image).width(1200).height(630).url()
    : undefined;

  return {
    title: `${name} | Insight Author | ${siteName}`,
    description,
    keywords: [name, ...expertise].filter(Boolean),
    alternates: {
      canonical,
    },
    openGraph: {
      type: "profile",
      title: `${name} | Insight Author | ${siteName}`,
      description,
      url: canonical,
      siteName,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | Insight Author | ${siteName}`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

const AuthorPage = async ({ params, searchParams }: AuthorPageProps) => {
  const resolvedSearchParams = await searchParams;
  const author = (await getInsightAuthorBySlug(params.slug)) as InsightAuthor | null;

  if (!author) return notFound();

  const authorName = author.name || "Insight Author";
  const authorTitle = author.title || "Insight Contributor";
  const authorImageUrl = author.image
    ? urlFor(author.image).width(320).height(320).url()
    : null;
  const authorBio =
    author.bio ||
    "An expert contributor sharing practical insight and industry guidance.";
  const credentials = (author.credentials || []).filter(Boolean);
  const expertise = (author.expertise || []).filter(Boolean);
  const insights = Array.isArray(author.insights) ? author.insights : [];

  const typeParam = parseParam(resolvedSearchParams?.type);
  const activeType =
    typeParam && INSIGHT_TYPE_CONFIG[typeParam as InsightTypeKey]
      ? (typeParam as InsightTypeKey)
      : "all";
  const sortParam = parseParam(resolvedSearchParams?.sort);
  const activeSort = sortParam === "oldest" ? "oldest" : "latest";

  const filteredInsights =
    activeType === "all"
      ? insights
      : insights.filter((insight) => insight?.insightType === activeType);

  const sortedInsights = [...filteredInsights].sort((a, b) => {
    const aTime = a?.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b?.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return activeSort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  const typeCounts = insights.reduce(
    (acc, insight) => {
      const type = insight?.insightType as InsightTypeKey | undefined;
      if (type && INSIGHT_TYPE_CONFIG[type]) {
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    },
    {} as Record<InsightTypeKey, number>
  );

  const filterOptions = [
    { value: "all" as const, label: "All Articles", count: insights.length },
    ...INSIGHT_TYPE_ORDER.map((type) => ({
      value: type,
      label: INSIGHT_TYPE_CONFIG[type].label,
      count: typeCounts[type] || 0,
    })).filter((option) => option.count > 0),
  ];

  const buildAuthorLink = (
    nextType: "all" | InsightTypeKey,
    nextSort: "latest" | "oldest"
  ) => {
    const query = new URLSearchParams();
    if (nextType !== "all") {
      query.set("type", nextType);
    }
    if (nextSort !== "latest") {
      query.set("sort", nextSort);
    }
    const queryString = query.toString();
    return `/insight/author/${params.slug}${queryString ? `?${queryString}` : ""}`;
  };

  const baseUrl = getBaseUrl();
  const canonicalUrl = `${baseUrl}/insight/author/${params.slug}`;
  const sameAs = [
    author.socialLinks?.linkedin,
    author.socialLinks?.twitter,
    author.socialLinks?.website,
  ].filter(Boolean) as string[];

  const personSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: authorName,
    jobTitle: authorTitle,
    description: author.bio || undefined,
    url: canonicalUrl,
    image: author.image
      ? urlFor(author.image).width(800).height(800).url()
      : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    knowsAbout: expertise.length ? expertise : undefined,
  };

  const profileSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${authorName} | Insight Author`,
    url: canonicalUrl,
    mainEntity: {
      "@type": "Person",
      name: authorName,
      jobTitle: authorTitle,
      sameAs: sameAs.length ? sameAs : undefined,
    },
    about: expertise.length ? expertise : undefined,
  };

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Insight", url: "/insight" },
    { name: "Authors", url: "/insight/authors" },
    { name: authorName, url: `/insight/author/${params.slug}` },
  ]);

  const structuredData = [breadcrumbSchema, personSchema, profileSchema];

  const authorLinks = [
    {
      label: "LinkedIn",
      href: author.socialLinks?.linkedin,
      icon: <Linkedin className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Twitter",
      href: author.socialLinks?.twitter,
      icon: <Twitter className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Website",
      href: author.socialLinks?.website,
      icon: <Globe className="h-4 w-4" aria-hidden="true" />,
    },
  ].filter((link) => Boolean(link.href));

  const experienceHighlights = [
    authorTitle ? `Current role: ${authorTitle}` : null,
    insights.length ? `${insights.length} published insights` : null,
    expertise.length
      ? `Focus areas: ${expertise.slice(0, 3).join(", ")}`
      : null,
  ].filter(Boolean) as string[];

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
                  <Link href="/insight/authors">Authors</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{authorName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Container>

        <Container className="py-8 sm:py-12 space-y-10">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[260px_1fr] items-center">
                <div className="flex justify-center lg:justify-start">
                  {authorImageUrl ? (
                    <Image
                      src={authorImageUrl}
                      alt={authorName}
                      width={260}
                      height={260}
                      className="rounded-3xl object-cover shadow-lg"
                      sizes="(max-width: 1024px) 220px, 260px"
                      priority
                    />
                  ) : (
                    <div className="flex h-56 w-56 items-center justify-center rounded-3xl bg-shop_light_bg text-shop_dark_green shadow-lg">
                      <User2 className="h-16 w-16" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-shop_dark_green/70">
                      Insight Author
                    </p>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-shop_dark_green">
                      {authorName}
                    </h1>
                    <p className="text-base sm:text-lg text-gray-600">
                      {authorTitle}
                    </p>
                  </div>

                  <p className="text-sm sm:text-base text-gray-600">
                    {authorBio}
                  </p>

                  {credentials.length ? (
                    <div className="flex flex-wrap gap-2">
                      {credentials.map((credential) => (
                        <Badge
                          key={credential}
                          variant="secondary"
                          className="bg-shop_light_bg text-shop_dark_green"
                        >
                          {credential}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {authorLinks.length ? (
                    <div className="flex flex-wrap gap-2">
                      {authorLinks.map((link) => (
                        <Button
                          key={link.label}
                          asChild
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Link
                            href={link.href as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={link.label}
                          >
                            {link.icon}
                            {link.label}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div>
              <p className="text-sm text-shop_dark_green/70">Expertise</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
                Areas of expertise
              </h2>
            </div>
            {expertise.length ? (
              <div className="flex flex-wrap gap-2">
                {expertise.map((area) => (
                  <Badge
                    key={area}
                    variant="secondary"
                    className="bg-white text-shop_dark_green border border-gray-200"
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Expertise details are being updated.
              </p>
            )}
          </section>

          {author.extendedBio && author.extendedBio.length ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 sm:p-8 lg:p-10 space-y-4">
                <div>
                  <p className="text-sm text-shop_dark_green/70">Biography</p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
                    Extended bio
                  </h2>
                </div>
                <div className="prose prose-lg max-w-none text-gray-700 prose-headings:text-shop_dark_green prose-a:text-shop_light_green hover:prose-a:text-shop_dark_green">
                  <PortableText value={author.extendedBio} />
                </div>
              </CardContent>
            </Card>
          ) : null}

          <section className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-shop_dark_green/70">
                  Insight library
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
                  Articles by {authorName}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  Sort by date
                </span>
                {(["latest", "oldest"] as const).map((sortValue) => {
                  const isActive = activeSort === sortValue;
                  return (
                    <Link
                      key={sortValue}
                      href={buildAuthorLink(activeType, sortValue)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? "border-shop_dark_green bg-shop_dark_green text-white"
                          : "border-gray-200 bg-white text-shop_dark_green hover:border-shop_light_green hover:text-shop_light_green"
                      }`}
                    >
                      {sortValue === "latest" ? "Latest" : "Oldest"}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const isActive = activeType === option.value;
                return (
                  <Link
                    key={option.value}
                    href={buildAuthorLink(option.value, activeSort)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-shop_dark_green bg-shop_dark_green text-white"
                        : "border-gray-200 bg-white text-shop_dark_green hover:border-shop_light_green hover:text-shop_light_green"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span>{option.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-shop_light_bg text-shop_dark_green"
                      }`}
                    >
                      {option.count}
                    </span>
                  </Link>
                );
              })}
            </div>

            {sortedInsights.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedInsights.map((insight, index) => {
                  const cardInsight = {
                    ...insight,
                    author: {
                      name: authorName,
                      image: author?.image,
                    },
                  } as InsightCardProps["insight"];

                  return (
                    <InsightCard
                      key={insight?._id || index}
                      insight={cardInsight}
                      variant="default"
                    />
                  );
                })}
              </div>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center space-y-3">
                  <p className="text-sm text-gray-600">
                    No articles match this filter yet.
                  </p>
                  <Button asChild variant="outline">
                    <Link href={buildAuthorLink("all", activeSort)}>
                      View all articles
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-6">
            <div>
              <p className="text-sm text-shop_dark_green/70">E-E-A-T</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
                Trust signals
              </h2>
              <p className="text-sm text-gray-600">
                Verified credentials and hands-on expertise that support author
                credibility.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border-0 shadow-md">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-shop_dark_green">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    Verified Expert
                  </div>
                  {author.credentialVerified ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Verified Expert
                    </Badge>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Verification in progress.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-shop_dark_green">
                    Credentials
                  </p>
                  {credentials.length ? (
                    <ul className="space-y-2 text-sm text-gray-600">
                      {credentials.map((credential) => (
                        <li key={credential} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-shop_dark_green" />
                          <span>{credential}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Credentials will be added soon.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-shop_dark_green">
                    Experience highlights
                  </p>
                  {experienceHighlights.length ? (
                    <ul className="space-y-2 text-sm text-gray-600">
                      {experienceHighlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-shop_dark_green" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Experience highlights are being curated.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </Container>
      </div>
    </>
  );
};

export default AuthorPage;
