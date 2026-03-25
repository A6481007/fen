import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import InsightCard from "@/components/insight/InsightCard";
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
import { getInsightCategories, getSolutionInsights } from "@/sanity/queries";
import {
  ChevronDown,
  ShieldCheck,
  TrendingUp,
  Wrench,
} from "lucide-react";

const siteName = "ShopCart";

type SolutionSearchParams = {
  type?: string | string[];
  complexity?: string | string[];
  industry?: string | string[];
  category?: string | string[];
};

type SolutionsPageProps = {
  searchParams?: SolutionSearchParams | Promise<SolutionSearchParams>;
};

type SolutionTypeKey = "caseStudy" | "validatedSolution" | "theoreticalSolution";
type SolutionComplexityKey = "quickWin" | "standard" | "enterprise";

const COMPLEXITY_CONFIG: Record<
  SolutionComplexityKey,
  { label: string; icon: string }
> = {
  quickWin: { label: "Quick Win", icon: "⚡" },
  standard: { label: "Standard", icon: "⚙️" },
  enterprise: { label: "Enterprise", icon: "🏢" },
};

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

const parseParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value || "";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Solutions | Insight Hub | ${siteName}`,
    description:
      "Discover proven solutions, validated playbooks, and implementation-ready frameworks backed by real-world results.",
  };
}

const SolutionsPage = async ({ searchParams }: SolutionsPageProps) => {
  const resolvedSearchParams = await searchParams;
  const typeParam = parseParam(resolvedSearchParams?.type);
  const complexityParam = parseParam(resolvedSearchParams?.complexity);
  const industryParam = parseParam(resolvedSearchParams?.industry);
  const categoryParam = parseParam(resolvedSearchParams?.category);

  const [insights, categories] = await Promise.all([
    getSolutionInsights(20),
    getInsightCategories(),
  ]);

  const solutionInsights = Array.isArray(insights) ? insights : [];
  const solutionCategories = (categories || []).filter(
    (category) => category.categoryType === "solution"
  );

  const categorySlugs = new Set(
    solutionCategories
      .map((category) => category.slug?.current)
      .filter(Boolean)
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

  const activeType: SolutionTypeKey | null = SOLUTION_TYPE_KEYS.has(
    typeParam as SolutionTypeKey
  )
    ? (typeParam as SolutionTypeKey)
    : null;

  const activeComplexity: SolutionComplexityKey | "all" = COMPLEXITY_KEYS.has(
    complexityParam as SolutionComplexityKey
  )
    ? (complexityParam as SolutionComplexityKey)
    : "all";

  const activeIndustry = industries.includes(industryParam)
    ? industryParam
    : "all";
  const activeCategory = categorySlugs.has(categoryParam)
    ? categoryParam
    : "all";

  const filteredSolutions = solutionInsights.filter((insight) => {
    if (activeType && insight?.insightType !== activeType) {
      return false;
    }
    if (
      activeComplexity !== "all" &&
      insight?.solutionComplexity !== activeComplexity
    ) {
      return false;
    }
    if (
      activeIndustry !== "all" &&
      insight?.clientContext?.industry !== activeIndustry
    ) {
      return false;
    }
    if (activeCategory !== "all") {
      const hasCategory = insight?.categories?.some(
        (category: { slug?: { current?: string | null } }) =>
          category?.slug?.current === activeCategory
      );
      if (!hasCategory) return false;
    }
    return true;
  });

  const categoryCounts = solutionInsights.reduce(
    (acc: Record<string, number>, insight) => {
      (insight?.categories || []).forEach(
        (category: { slug?: { current?: string | null } }) => {
          const slug = category?.slug?.current;
          if (!slug) return;
          acc[slug] = (acc[slug] ?? 0) + 1;
        }
      );
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
      type: activeType,
      complexity: activeComplexity,
      industry: activeIndustry,
      category: activeCategory,
      ...overrides,
    };

    if (merged.type) params.set("type", merged.type);
    if (merged.complexity !== "all") {
      params.set("complexity", merged.complexity);
    }
    if (merged.industry !== "all") {
      params.set("industry", merged.industry);
    }
    if (merged.category !== "all") {
      params.set("category", merged.category);
    }

    const query = params.toString();
    return query ? `/insight/solutions?${query}` : "/insight/solutions";
  };

  const renderCategoryFilters = solutionCategories.length ? (
    <div className="space-y-2">
      <Link
        href={buildFilterHref({ category: "all" })}
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
          activeCategory === "all"
            ? "border-shop_dark_green bg-shop_light_bg text-shop_dark_green"
            : "border-gray-200 bg-white text-gray-600 hover:border-shop_light_green"
        }`}
      >
        <span>All categories</span>
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
        const isActive = activeCategory === slug;

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
    <p className="text-sm text-gray-600">Solution categories coming soon.</p>
  );

  const renderIndustryFilters = industries.length ? (
    <div className="space-y-2">
      <Link
        href={buildFilterHref({ industry: "all" })}
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
          activeIndustry === "all"
            ? "border-shop_dark_green bg-shop_light_bg text-shop_dark_green"
            : "border-gray-200 bg-white text-gray-600 hover:border-shop_light_green"
        }`}
      >
        <span>All industries</span>
        <Badge variant="secondary" className="bg-white text-shop_dark_green">
          {industries.reduce(
            (count, industry) => count + industryCounts[industry],
            0
          )}
        </Badge>
      </Link>
      {industries.map((industry) => {
        const count = industryCounts[industry] ?? 0;
        const isActive = activeIndustry === industry;

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
    <p className="text-sm text-gray-600">Industry filters coming soon.</p>
  );

  return (
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
              <BreadcrumbPage>Solutions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Container>

      <Container className="py-8 sm:py-12">
        <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-700 via-shop_dark_green to-shop_light_green text-white">
          <CardContent className="p-6 sm:p-8 lg:p-12">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium">Solutions Library</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                Proven Solutions
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-white/90">
                Implementation Ready playbooks and validated solution blueprints
                designed to deliver measurable impact across industries.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Proven outcomes
                </div>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Implementation Ready
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Trusted by experts
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>

      <Container className="pb-12 sm:pb-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-shop_dark_green/70">
                  Solutions Catalog
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
                  Explore implementation-ready solutions
                </h2>
              </div>
              <InsightTypeFilterClient
                section="solutions"
                activeType={activeType}
                counts={typeCounts}
                showCounts
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-shop_dark_green/70">
                Complexity filter
              </span>
              {Object.entries(COMPLEXITY_CONFIG).map(([value, config]) => {
                const key = value as SolutionComplexityKey;
                const isActive = activeComplexity === key;

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
                    <span>{config.icon}</span>
                    {config.label}
                  </Link>
                );
              })}
              <Link
                href={buildFilterHref({ complexity: "all" })}
                className="text-sm text-shop_dark_green/70 hover:text-shop_light_green"
              >
                Clear
              </Link>
            </div>

            <div className="lg:hidden">
              <details className="group rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-shop_dark_green">
                  Filter solutions
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-shop_dark_green/70 mb-2">
                      Categories
                    </p>
                    {renderCategoryFilters}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-shop_dark_green/70 mb-2">
                      Industries
                    </p>
                    {renderIndustryFilters}
                  </div>
                </div>
              </details>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span>
                Showing {filteredSolutions.length} solution
                {filteredSolutions.length === 1 ? "" : "s"}
              </span>
              {(activeComplexity !== "all" ||
                activeIndustry !== "all" ||
                activeCategory !== "all") && (
                <Link
                  href={buildFilterHref({
                    complexity: "all",
                    industry: "all",
                    category: "all",
                  })}
                  className="text-shop_light_green hover:text-shop_dark_green"
                >
                  Reset filters
                </Link>
              )}
            </div>

            {filteredSolutions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredSolutions.map((insight, index) => (
                  <InsightCard
                    key={insight?._id || index}
                    insight={insight}
                    variant="solution"
                    showMetrics
                    showProductCount
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
                      No solutions yet
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      We are preparing new solutions. Check back soon.
                    </p>
                    <Button asChild>
                      <Link href="/insight">Back to Insight Hub</Link>
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
                  <p className="text-sm text-shop_dark_green/70">Categories</p>
                  <h3 className="text-lg font-semibold text-shop_dark_green">
                    Solution categories
                  </h3>
                </div>
                {renderCategoryFilters}
                <Separator />
                <div>
                  <p className="text-sm text-shop_dark_green/70">Industries</p>
                  <h3 className="text-lg font-semibold text-shop_dark_green">
                    Filter by industry
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

export default SolutionsPage;
