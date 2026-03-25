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
import { getInsightCategories, getKnowledgeInsights } from "@/sanity/queries";
import {
  BookOpen,
  ChevronDown,
} from "lucide-react";

const siteName = "ShopCart";

type KnowledgeSearchParams = {
  type?: string | string[];
};

type KnowledgePageProps = {
  searchParams?: KnowledgeSearchParams | Promise<KnowledgeSearchParams>;
};

type InsightTypeKey =
  | "productKnowledge"
  | "generalKnowledge"
  | "problemKnowledge"
  | "comparison";

const INSIGHT_TYPE_KEYS = new Set<InsightTypeKey>([
  "productKnowledge",
  "generalKnowledge",
  "problemKnowledge",
  "comparison",
]);

const parseParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value || "";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Knowledge Base | Insight Hub | ${siteName}`,
    description:
      "Explore expert knowledge with product guidance, industry insights, comparisons, and problem-solving playbooks tailored for your team.",
  };
}

const KnowledgePage = async ({ searchParams }: KnowledgePageProps) => {
  const resolvedSearchParams = await searchParams;
  const typeParam = parseParam(resolvedSearchParams?.type);
  const activeType: InsightTypeKey | null = INSIGHT_TYPE_KEYS.has(
    typeParam as InsightTypeKey
  )
    ? (typeParam as InsightTypeKey)
    : null;

  const [insights, categories] = await Promise.all([
    getKnowledgeInsights(20),
    getInsightCategories(),
  ]);

  const knowledgeInsights = Array.isArray(insights) ? insights : [];
  const knowledgeCategories = (categories || []).filter(
    (category) => category.categoryType === "knowledge"
  );

  const filteredInsights = activeType
    ? knowledgeInsights.filter((insight) => insight?.insightType === activeType)
    : knowledgeInsights;

  const typeCounts = knowledgeInsights.reduce(
    (acc: Record<string, number>, insight) => {
      const type = insight?.insightType;
      if (type && INSIGHT_TYPE_KEYS.has(type as InsightTypeKey)) {
        acc[type] = (acc[type] ?? 0) + 1;
      }
      return acc;
    },
    {}
  );

  const categoriesList =
    knowledgeCategories.length > 0 ? (
      <div className="space-y-3">
        {knowledgeCategories.map((category) => (
          <Link
            key={category._id}
            href={`/insight/category/${category.slug?.current ?? ""}`}
            className="block rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-shop_dark_green line-clamp-1">
                {category.title}
              </p>
              <Badge
                variant="secondary"
                className="bg-shop_light_bg text-shop_dark_green"
              >
                {category.insightCount ?? 0}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2 mt-2">
              {category.description ||
                "Curated knowledge to build product confidence."}
            </p>
          </Link>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-600">Knowledge categories coming soon.</p>
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
              <BreadcrumbPage>Knowledge</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Container>

      <Container className="py-8 sm:py-12">
        <Card className="border-0 shadow-xl bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white">
          <CardContent className="p-6 sm:p-8 lg:p-12">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                <BookOpen className="h-4 w-4" />
                <span className="font-medium">Knowledge Base</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                Knowledge Base
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-white/90">
                Build product expertise and stay ahead with industry insights,
                comparisons, and problem-solving guidance from our specialists.
              </p>
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
                  Knowledge Insights
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
                  Explore the knowledge library
                </h2>
              </div>
              <InsightTypeFilterClient
                section="knowledge"
                activeType={activeType}
                counts={typeCounts}
                showCounts
              />
            </div>

            <div className="lg:hidden">
              <details className="group rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-shop_dark_green">
                  Browse categories
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-4">{categoriesList}</div>
              </details>
            </div>

            {filteredInsights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredInsights.map((insight, index) => (
                  <InsightCard
                    key={insight?._id || index}
                    insight={insight}
                    variant="default"
                    showProductCount
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-shop_light_bg text-shop_dark_green">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-shop_dark_green mb-2">
                      No knowledge insights yet
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      We are preparing new knowledge articles. Check back soon.
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
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-sm text-shop_dark_green/70">
                    Categories
                  </p>
                  <h3 className="text-lg font-semibold text-shop_dark_green">
                    Knowledge categories
                  </h3>
                </div>
                {categoriesList}
              </CardContent>
            </Card>
          </aside>
        </div>
      </Container>
    </div>
  );
};

export default KnowledgePage;
