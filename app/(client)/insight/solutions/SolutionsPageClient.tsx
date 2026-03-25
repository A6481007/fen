"use client";

import Link from "next/link";
import Container from "@/components/Container";
import InsightCard, { type InsightCardProps } from "@/components/insight/InsightCard";
import InsightTypeFilterClient from "@/components/insight/InsightTypeFilterClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ShieldCheck, TrendingUp, Wrench } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type InsightCategory = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  description?: string | null;
  categoryType?: string | null;
  insightCount?: number | null;
};

type SolutionInsight = Partial<InsightCardProps["insight"]> & {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  insightType?: string | null;
  summary?: string | null;
  mainImage?: unknown;
  heroImage?: unknown;
  featuredImage?: unknown;
  cardImage?: unknown;
  solutionMaturity?: string | null;
  solutionComplexity?: string | null;
  implementationTimeline?: string | null;
  metrics?: Array<{ metricLabel?: string | null; metricValue?: string | null }> | null;
  clientContext?: { industry?: string | null } | null;
  categories?: Array<{ slug?: { current?: string | null } | null }> | null;
  solutionProducts?: Array<unknown> | null;
};

type SolutionsPageClientProps = {
  insights: SolutionInsight[];
  categories: InsightCategory[];
  activeType: string | null;
  activeComplexity: string | null;
  activeIndustry: string | null;
  activeCategory: string | null;
  showHeroCard?: boolean;
  rootHref?: string;
  listPath?: string;
  cardHrefBase?: {
    knowledge: string;
    solutions: string;
  };
};

type SolutionTypeKey = "caseStudy" | "validatedSolution" | "theoreticalSolution";
type SolutionComplexityKey = "quickWin" | "standard" | "enterprise";

const SOLUTION_TYPE_KEYS = new Set<SolutionTypeKey>([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);

const COMPLEXITY_KEYS = new Set<SolutionComplexityKey>([
  "quickWin",
  "standard",
  "enterprise",
]);

const SolutionsPageClient = ({
  insights,
  categories,
  activeType,
  activeComplexity,
  activeIndustry,
  activeCategory,
  showHeroCard = true,
  rootHref,
  listPath,
  cardHrefBase,
}: SolutionsPageClientProps) => {
  const { t } = useTranslation();
  const resolvedRootHref = rootHref || "/insights";
  const resolvedListPath = listPath || "/insight/solutions";
  const resolvedCardHrefBase = cardHrefBase || {
    knowledge: "/insight/knowledge",
    solutions: "/insight/solutions",
  };
  const solutionInsights = Array.isArray(insights) ? insights : [];
  const solutionCategories = (Array.isArray(categories) ? categories : []).filter(
    (category) => category.categoryType === "solution"
  );

  const categorySlugs = new Set(
    solutionCategories
      .map((category) => category.slug?.current)
      .filter((value): value is string => Boolean(value))
  );

  const industryCounts = solutionInsights.reduce(
    (acc: Record<string, number>, insight) => {
      const industry = insight?.clientContext?.industry?.trim();
      if (industry) {
        acc[industry] = (acc[industry] ?? 0) + 1;
      }
      return acc;
    },
    {}
  );

  const industries = Object.keys(industryCounts).sort((a, b) =>
    a.localeCompare(b)
  );

  const resolvedType = SOLUTION_TYPE_KEYS.has(activeType as SolutionTypeKey)
    ? (activeType as SolutionTypeKey)
    : null;

  const resolvedComplexity: SolutionComplexityKey | "all" = COMPLEXITY_KEYS.has(
    activeComplexity as SolutionComplexityKey
  )
    ? (activeComplexity as SolutionComplexityKey)
    : "all";

  const resolvedIndustry = industries.includes(activeIndustry ?? "")
    ? (activeIndustry as string)
    : "all";

  const resolvedCategory = categorySlugs.has(activeCategory ?? "")
    ? (activeCategory as string)
    : "all";

  const complexityConfig = useMemo(
    () => ({
      quickWin: { label: t("client.insight.solutions.complexity.quickWin") },
      standard: { label: t("client.insight.solutions.complexity.standard") },
      enterprise: { label: t("client.insight.solutions.complexity.enterprise") },
    }),
    [t]
  );

  const filteredSolutions = solutionInsights.filter((insight) => {
    if (resolvedType && insight?.insightType !== resolvedType) {
      return false;
    }
    if (
      resolvedComplexity !== "all" &&
      insight?.solutionComplexity !== resolvedComplexity
    ) {
      return false;
    }
    if (
      resolvedIndustry !== "all" &&
      insight?.clientContext?.industry !== resolvedIndustry
    ) {
      return false;
    }
    if (resolvedCategory !== "all") {
      const hasCategory = insight?.categories?.some(
        (category) => category?.slug?.current === resolvedCategory
      );
      if (!hasCategory) return false;
    }
    return true;
  });

  const categoryCounts = solutionInsights.reduce(
    (acc: Record<string, number>, insight) => {
      (insight?.categories || []).forEach((category) => {
        const slug = category?.slug?.current;
        if (!slug) return;
        acc[slug] = (acc[slug] ?? 0) + 1;
      });
      return acc;
    },
    {}
  );

  const typeCounts = solutionInsights.reduce(
    (acc: Record<string, number>, insight) => {
      const type = insight?.insightType;
      if (type && SOLUTION_TYPE_KEYS.has(type as SolutionTypeKey)) {
        acc[type] = (acc[type] ?? 0) + 1;
      }
      return acc;
    },
    {}
  );

  const buildFilterHref = (
    overrides: Partial<{
      type: SolutionTypeKey | null;
      complexity: SolutionComplexityKey | "all";
      industry: string | "all";
      category: string | "all";
    }>
  ) => {
    const params = new URLSearchParams();
    const merged = {
      type: resolvedType,
      complexity: resolvedComplexity,
      industry: resolvedIndustry,
      category: resolvedCategory,
      ...overrides,
    };

    if (merged.type) params.set("type", merged.type);
    if (merged.complexity !== "all") params.set("complexity", merged.complexity);
    if (merged.industry !== "all") params.set("industry", merged.industry);
    if (merged.category !== "all") params.set("category", merged.category);

    const query = params.toString();
    return query ? `${resolvedListPath}?${query}` : resolvedListPath;
  };

  const renderCategoryFilters = solutionCategories.length ? (
    <div className="space-y-2">
      <Link
        href={buildFilterHref({ category: "all" })}
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
          resolvedCategory === "all"
            ? "border-shop_dark_green bg-shop_light_bg text-shop_dark_green"
            : "border-gray-200 bg-white text-gray-600 hover:border-shop_light_green"
        }`}
      >
        <span>{t("client.insight.solutions.filters.categories.all")}</span>
        <Badge variant="secondary" className="bg-white text-shop_dark_green">
          {solutionCategories.reduce((count, category) => {
            const slug = category.slug?.current;
            return count + (slug ? categoryCounts[slug] ?? 0 : 0);
          }, 0)}
        </Badge>
      </Link>
      {solutionCategories.map((category) => {
        const slug = category.slug?.current;
        if (!slug) return null;
        const count = categoryCounts[slug] ?? category.insightCount ?? 0;
        const isActive = resolvedCategory === slug;

        return (
          <Link
            key={category._id}
            href={buildFilterHref({ category: slug })}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
              isActive
                ? "border-shop_dark_green bg-shop_light_bg text-shop_dark_green"
                : "border-gray-200 bg-white text-gray-600 hover:border-shop_light_green"
            }`}
          >
            <span className="line-clamp-1">{category.title}</span>
            <Badge variant="secondary" className="bg-white text-shop_dark_green">
              {count}
            </Badge>
          </Link>
        );
      })}
    </div>
  ) : (
    <p className="text-sm text-gray-600">
      {t("client.insight.solutions.filters.categories.empty")}
    </p>
  );

  const renderIndustryFilters = industries.length ? (
    <div className="space-y-2">
      <Link
        href={buildFilterHref({ industry: "all" })}
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
          resolvedIndustry === "all"
            ? "border-shop_dark_green bg-shop_light_bg text-shop_dark_green"
            : "border-gray-200 bg-white text-gray-600 hover:border-shop_light_green"
        }`}
      >
        <span>{t("client.insight.solutions.filters.industries.all")}</span>
        <Badge variant="secondary" className="bg-white text-shop_dark_green">
          {industries.reduce(
            (count, industry) => count + industryCounts[industry],
            0
          )}
        </Badge>
      </Link>
      {industries.map((industry) => {
        const count = industryCounts[industry] ?? 0;
        const isActive = resolvedIndustry === industry;

        return (
          <Link
            key={industry}
            href={buildFilterHref({ industry })}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
              isActive
                ? "border-shop_dark_green bg-shop_light_bg text-shop_dark_green"
                : "border-gray-200 bg-white text-gray-600 hover:border-shop_light_green"
            }`}
          >
            <span className="line-clamp-1">{industry}</span>
            <Badge variant="secondary" className="bg-white text-shop_dark_green">
              {count}
            </Badge>
          </Link>
        );
      })}
    </div>
  ) : (
    <p className="text-sm text-gray-600">
      {t("client.insight.solutions.filters.industries.empty")}
    </p>
  );

  const showingLabel =
    filteredSolutions.length === 1
      ? t("client.insight.solutions.showing.single", {
          count: filteredSolutions.length,
        })
      : t("client.insight.solutions.showing.plural", {
          count: filteredSolutions.length,
        });

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
      <Container className="pt-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">{t("client.insight.breadcrumb.home")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={resolvedRootHref}>
                  {t("client.insight.breadcrumb.insight")}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("client.insight.breadcrumb.solutions")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

      </Container>

      {showHeroCard ? (
        <Container className="py-8 sm:py-12">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-700 via-shop_dark_green to-shop_light_green text-white">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-medium">
                    {t("client.insight.solutions.hero.badge")}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                  {t("client.insight.solutions.hero.title")}
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-white/90">
                  {t("client.insight.solutions.hero.subtitle")}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {t("client.insight.solutions.hero.feature.provenOutcomes")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    {t("client.insight.solutions.hero.feature.implementationReady")}
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {t("client.insight.solutions.hero.feature.trusted")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Container>
      ) : null}

      <Container className="pb-12 sm:pb-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-shop_dark_green/70">
                  {t("client.insight.solutions.section.label")}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
                  {t("client.insight.solutions.section.title")}
                </h2>
              </div>
              <InsightTypeFilterClient
                section="solutions"
                activeType={resolvedType}
                counts={typeCounts}
                showCounts
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-shop_dark_green/70">
                {t("client.insight.solutions.complexity.label")}
              </span>
              {Object.entries(complexityConfig).map(([value, config]) => {
                const key = value as SolutionComplexityKey;
                const isActive = resolvedComplexity === key;

                return (
                  <Link
                    key={value}
                    href={buildFilterHref({ complexity: key })}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
                      isActive
                        ? "border-shop_dark_green bg-shop_dark_green text-white"
                        : "border-gray-200 bg-white text-shop_dark_green hover:border-shop_light_green"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {config.label}
                  </Link>
                );
              })}
              <Link
                href={buildFilterHref({ complexity: "all" })}
                className="text-sm text-shop_dark_green/70 hover:text-shop_light_green"
              >
                {t("client.insight.solutions.complexity.clear")}
              </Link>
            </div>

            <div className="lg:hidden">
              <details className="group rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-shop_dark_green">
                  {t("client.insight.solutions.filters.mobile.title")}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-shop_dark_green/70 mb-2">
                      {t("client.insight.solutions.filters.categories.label")}
                    </p>
                    {renderCategoryFilters}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-shop_dark_green/70 mb-2">
                      {t("client.insight.solutions.filters.industries.label")}
                    </p>
                    {renderIndustryFilters}
                  </div>
                </div>
              </details>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span>{showingLabel}</span>
              {(resolvedComplexity !== "all" ||
                resolvedIndustry !== "all" ||
                resolvedCategory !== "all") && (
                <Link
                  href={buildFilterHref({
                    complexity: "all",
                    industry: "all",
                    category: "all",
                  })}
                  className="text-shop_light_green hover:text-shop_dark_green"
                >
                  {t("client.insight.solutions.filters.reset")}
                </Link>
              )}
            </div>

            {filteredSolutions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredSolutions.map((insight, index) => (
                  <InsightCard
                    key={insight?._id || index}
                    insight={insight as InsightCardProps["insight"]}
                    variant="solution"
                    showMetrics
                    showProductCount
                    linkBase={resolvedCardHrefBase}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-shop_light_bg text-shop_dark_green">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-shop_dark_green mb-2">
                      {t("client.insight.solutions.empty.title")}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t("client.insight.solutions.empty.subtitle")}
                    </p>
                    <Button asChild>
                      <Link href={resolvedRootHref}>
                        {t("client.insight.solutions.empty.back")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <aside className="hidden lg:block">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5 space-y-5">
                <div>
                  <p className="text-sm text-shop_dark_green/70">
                    {t("client.insight.solutions.sidebar.categories.label")}
                  </p>
                  <h3 className="text-lg font-semibold text-shop_dark_green">
                    {t("client.insight.solutions.sidebar.categories.title")}
                  </h3>
                </div>
                {renderCategoryFilters}
                <Separator />
                <div>
                  <p className="text-sm text-shop_dark_green/70">
                    {t("client.insight.solutions.sidebar.industries.label")}
                  </p>
                  <h3 className="text-lg font-semibold text-shop_dark_green">
                    {t("client.insight.solutions.sidebar.industries.title")}
                  </h3>
                </div>
                {renderIndustryFilters}
              </CardContent>
            </Card>
          </aside>
        </div>
      </Container>
    </div>
  );
};

export default SolutionsPageClient;
