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
import { BookOpen, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type InsightSummary = Partial<InsightCardProps["insight"]> & {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  insightType?: string | null;
  summary?: string | null;
  mainImage?: unknown;
  heroImage?: unknown;
  featuredImage?: unknown;
  cardImage?: unknown;
  linkedProducts?: Array<unknown> | null;
};

type InsightCategory = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  description?: string | null;
  categoryType?: string | null;
  insightCount?: number | null;
};

type KnowledgePageClientProps = {
  insights: InsightSummary[];
  categories: InsightCategory[];
  activeType: string | null;
  showHeroCard?: boolean;
  rootHref?: string;
  cardHrefBase?: {
    knowledge: string;
    solutions: string;
  };
};

type KnowledgeTypeKey =
  | "productKnowledge"
  | "generalKnowledge"
  | "problemKnowledge"
  | "comparison";

const KNOWLEDGE_TYPE_KEYS = new Set<KnowledgeTypeKey>([
  "productKnowledge",
  "generalKnowledge",
  "problemKnowledge",
  "comparison",
]);

const KnowledgePageClient = ({
  insights,
  categories,
  activeType,
  showHeroCard = true,
  rootHref,
  cardHrefBase,
}: KnowledgePageClientProps) => {
  const { t } = useTranslation();
  const resolvedRootHref = rootHref || "/insights";
  const resolvedCardHrefBase = cardHrefBase || {
    knowledge: "/insight/knowledge",
    solutions: "/insight/solutions",
  };
  const knowledgeInsights = Array.isArray(insights) ? insights : [];
  const knowledgeCategories = (Array.isArray(categories) ? categories : []).filter(
    (category) => category.categoryType === "knowledge"
  );

  const resolvedType = KNOWLEDGE_TYPE_KEYS.has(activeType as KnowledgeTypeKey)
    ? (activeType as KnowledgeTypeKey)
    : null;

  const filteredInsights = resolvedType
    ? knowledgeInsights.filter((insight) => insight?.insightType === resolvedType)
    : knowledgeInsights;

  const typeCounts = knowledgeInsights.reduce(
    (acc: Record<string, number>, insight) => {
      const type = insight?.insightType;
      if (type && KNOWLEDGE_TYPE_KEYS.has(type as KnowledgeTypeKey)) {
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
                t("client.insight.knowledge.categories.fallback")}
            </p>
          </Link>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-600">
        {t("client.insight.knowledge.categories.empty")}
      </p>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
      <Container className="pt-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">{t("client.insight.knowledge.breadcrumb.home")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={resolvedRootHref}>
                  {t("client.insight.knowledge.breadcrumb.insight")}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {t("client.insight.knowledge.breadcrumb.knowledge")}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

      </Container>

      {showHeroCard ? (
        <Container className="py-8 sm:py-12">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">
                    {t("client.insight.knowledge.hero.badge")}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                  {t("client.insight.knowledge.hero.title")}
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-white/90">
                  {t("client.insight.knowledge.hero.subtitle")}
                </p>
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
                  {t("client.insight.knowledge.section.kicker")}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
                  {t("client.insight.knowledge.section.title")}
                </h2>
              </div>
              <InsightTypeFilterClient
                section="knowledge"
                activeType={resolvedType}
                counts={typeCounts}
                showCounts
              />
            </div>

            <div className="lg:hidden">
              <details className="group rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-shop_dark_green">
                  {t("client.insight.knowledge.categories.browse")}
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
                    insight={insight as InsightCardProps["insight"]}
                    variant="default"
                    showProductCount
                    linkBase={resolvedCardHrefBase}
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
                      {t("client.insight.knowledge.empty.title")}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t("client.insight.knowledge.empty.subtitle")}
                    </p>
                    <Button asChild>
                      <Link href={resolvedRootHref}>
                        {t("client.insight.knowledge.empty.cta")}
                      </Link>
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
                    {t("client.insight.knowledge.sidebar.kicker")}
                  </p>
                  <h3 className="text-lg font-semibold text-shop_dark_green">
                    {t("client.insight.knowledge.sidebar.title")}
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

export default KnowledgePageClient;
