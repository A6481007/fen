"use client";

import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import InsightCard, { type InsightCardProps } from "@/components/insight/InsightCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { urlFor } from "@/sanity/lib/image";
import { SOLUTION_TYPES, type InsightTypeKey } from "@/constants/insightTypes";
import {
  ArrowRight,
  BookOpen,
  Layers,
  Lightbulb,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
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
  publishedAt?: string | null;
  author?: { name?: string | null; image?: unknown } | null;
  solutionMaturity?: string | null;
  solutionComplexity?: string | null;
  implementationTimeline?: string | null;
  metrics?: Array<{ metricLabel?: string | null; metricValue?: string | null }> | null;
};

type InsightCategory = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  description?: string | null;
  categoryType?: string | null;
  insightCount?: number | null;
};

type InsightPageClientProps = {
  featuredInsights: InsightSummary[];
  latestKnowledge: InsightSummary[];
  latestSolutions: InsightSummary[];
  categories: InsightCategory[];
  showHeroCard?: boolean;
};

const buildInsightHref = (slug?: string | null, type?: string | null) => {
  const isSolutionType = SOLUTION_TYPES.has((type ?? "") as InsightTypeKey);
  if (!slug) return isSolutionType ? "/insight/solutions" : "/insight/knowledge";
  return isSolutionType ? `/insight/solutions/${slug}` : `/insight/knowledge/${slug}`;
};

const InsightPageClient = ({
  featuredInsights,
  latestKnowledge,
  latestSolutions,
  categories,
  showHeroCard = true,
}: InsightPageClientProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const safeFeatured = Array.isArray(featuredInsights) ? featuredInsights : [];
  const safeKnowledge = Array.isArray(latestKnowledge) ? latestKnowledge : [];
  const safeSolutions = Array.isArray(latestSolutions) ? latestSolutions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const formatInsightType = (type?: string | null) => {
    if (!type) return t("client.insight.type.default");
    const key = `client.insight.type.${type}`;
    const resolved = t(key);
    return resolved === key ? t("client.insight.type.default") : resolved;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return t("client.insight.dateFallback");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t("client.insight.dateFallback");
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  };

  const knowledgeCategories = safeCategories.filter(
    (category) => category.categoryType === "knowledge"
  );
  const solutionCategories = safeCategories.filter(
    (category) => category.categoryType === "solution"
  );

  const stats = useMemo(
    () => [
      { label: t("client.insight.stats.featured"), value: safeFeatured.length, icon: Sparkles },
      { label: t("client.insight.stats.knowledge"), value: safeKnowledge.length, icon: BookOpen },
      { label: t("client.insight.stats.solutions"), value: safeSolutions.length, icon: Wrench },
      { label: t("client.insight.stats.categories"), value: safeCategories.length, icon: Layers },
    ],
    [safeFeatured.length, safeKnowledge.length, safeSolutions.length, safeCategories.length, t]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
      <Container className="pt-6">
        <DynamicBreadcrumb />
      </Container>

      {showHeroCard ? (
        <section className="py-8 sm:py-12">
          <Container>
            <Card className="border-0 overflow-hidden shadow-xl bg-gradient-to-r from-shop_dark_green via-shop_dark_green to-shop_light_green text-white">
              <CardContent className="p-6 sm:p-8 lg:p-12">
                <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
                  <div className="space-y-4 sm:space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                      <Lightbulb className="h-4 w-4" />
                      <span className="font-medium">{t("client.insight.hero.badge")}</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                      {t("client.insight.hero.title")}
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-2xl">
                      {t("client.insight.hero.subtitle")}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        asChild
                        size="lg"
                        className="bg-white text-shop_dark_green hover:bg-white/90"
                      >
                        <Link href="/insight/knowledge">
                          {t("client.insight.hero.ctaKnowledge")}
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="bg-transparent text-white border-white hover:bg-white/10"
                      >
                        <Link href="/insight/solutions">
                          {t("client.insight.hero.ctaSolutions")}
                        </Link>
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2 text-sm text-white/80">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        {t("client.insight.hero.feature.verified")}
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        {t("client.insight.hero.feature.dataBacked")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        {t("client.insight.hero.feature.actionable")}
                      </div>
                    </div>
                  </div>
                  <Card className="border-0 bg-white/10 backdrop-blur-sm text-white">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        <p className="text-sm uppercase tracking-wide text-white/80">
                          {t("client.insight.highlights.title")}
                        </p>
                      </div>
                      <Separator className="bg-white/20" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-white/10 p-4">
                          <p className="text-xs uppercase text-white/70">
                            {t("client.insight.highlights.knowledge")}
                          </p>
                          <p className="text-2xl font-bold">{safeKnowledge.length}</p>
                        </div>
                        <div className="rounded-lg bg-white/10 p-4">
                          <p className="text-xs uppercase text-white/70">
                            {t("client.insight.highlights.solutions")}
                          </p>
                          <p className="text-2xl font-bold">{safeSolutions.length}</p>
                        </div>
                        <div className="rounded-lg bg-white/10 p-4">
                          <p className="text-xs uppercase text-white/70">
                            {t("client.insight.highlights.featured")}
                          </p>
                          <p className="text-2xl font-bold">{safeFeatured.length}</p>
                        </div>
                        <div className="rounded-lg bg-white/10 p-4">
                          <p className="text-xs uppercase text-white/70">
                            {t("client.insight.highlights.categories")}
                          </p>
                          <p className="text-2xl font-bold">{safeCategories.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </Container>
        </section>
      ) : null}

      <Container className="pb-8 sm:pb-12">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-shop_dark_green/80">
                  {t("client.insight.metrics.kicker")}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-shop_dark_green">
                  {t("client.insight.metrics.title")}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border bg-white px-4 py-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-shop_light_green/20 p-2 text-shop_dark_green">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                      <p className="text-xl sm:text-2xl font-bold text-shop_dark_green">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Container>

      <Container className="py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green mb-2">
              {t("client.insight.featured.title")}
            </h2>
            <p className="text-gray-600">
              {t("client.insight.featured.subtitle")}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="hidden sm:inline-flex border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
          >
            <Link href="/insight/knowledge">{t("client.insight.featured.cta")}</Link>
          </Button>
        </div>

        {safeFeatured.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeFeatured.map((insight, index) => (
              <InsightCard
                key={insight?._id || index}
                insight={insight as InsightCardProps["insight"]}
                variant="featured"
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-600">{t("client.insight.featured.empty")}</p>
          </Card>
        )}
      </Container>

      <Container className="py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-shop_dark_green/70">
                    {t("client.insight.latest.knowledge.kicker")}
                  </p>
                  <h3 className="text-xl font-bold text-shop_dark_green">
                    {t("client.insight.latest.knowledge.title")}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  asChild
                  className="text-shop_dark_green hover:text-shop_light_green"
                >
                  <Link href="/insight/knowledge">
                    {t("client.insight.latest.viewAll")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                {safeKnowledge.length > 0 ? (
                  safeKnowledge.map((item) => (
                    <div
                      key={item?._id}
                      className="flex gap-4 rounded-lg border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-md">
                        {item?.mainImage ? (
                          <Image
                            src={urlFor(item.mainImage).url()}
                            alt={item?.title || t("client.insight.latest.knowledge.imageAlt")}
                            fill
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-shop_light_green/20" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-shop_light_green/20 text-shop_dark_green">
                            {formatInsightType(item?.insightType ?? null)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(item?.publishedAt)}
                          </span>
                        </div>
                        <Link
                          href={buildInsightHref(
                            item?.slug?.current ?? null,
                            item?.insightType ?? null
                          )}
                          className="group/title block"
                        >
                          <p className="font-semibold text-shop_dark_green group-hover/title:text-shop_light_green line-clamp-2">
                            {item?.title}
                          </p>
                        </Link>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item?.summary ||
                            t("client.insight.latest.knowledge.summaryFallback")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">
                    {t("client.insight.latest.knowledge.empty")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-shop_dark_green/70">
                    {t("client.insight.latest.solutions.kicker")}
                  </p>
                  <h3 className="text-xl font-bold text-shop_dark_green">
                    {t("client.insight.latest.solutions.title")}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  asChild
                  className="text-shop_dark_green hover:text-shop_light_green"
                >
                  <Link href="/insight/solutions">
                    {t("client.insight.latest.viewAll")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                {safeSolutions.length > 0 ? (
                  safeSolutions.map((item) => (
                    <div
                      key={item?._id}
                      className="flex gap-4 rounded-lg border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-md">
                        {item?.mainImage ? (
                          <Image
                            src={urlFor(item.mainImage).url()}
                            alt={item?.title || t("client.insight.latest.solutions.imageAlt")}
                            fill
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-shop_dark_green/15" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-shop_dark_green text-white">
                            {formatInsightType(item?.insightType ?? null)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(item?.publishedAt)}
                          </span>
                        </div>
                        <Link
                          href={buildInsightHref(
                            item?.slug?.current ?? null,
                            item?.insightType ?? null
                          )}
                          className="group/title block"
                        >
                          <p className="font-semibold text-shop_dark_green group-hover/title:text-shop_light_green line-clamp-2">
                            {item?.title}
                          </p>
                        </Link>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item?.summary ||
                            t("client.insight.latest.solutions.summaryFallback")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">
                    {t("client.insight.latest.solutions.empty")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>

      <Container className="py-8 sm:py-12">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-shop_dark_green/70">
                  {t("client.insight.categories.kicker")}
                </p>
                <h3 className="text-2xl font-bold text-shop_dark_green">
                  {t("client.insight.categories.title")}
                </h3>
                <p className="text-gray-600">
                  {t("client.insight.categories.subtitle")}
                </p>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-shop_light_green/20 text-shop_dark_green">
                    {t("client.insight.categories.knowledge.label")}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {t("client.insight.categories.knowledge.subtitle")}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {knowledgeCategories.length > 0 ? (
                    knowledgeCategories.map((category) => (
                      <Link
                        key={category._id}
                        href={`/insight/category/${category.slug?.current ?? ""}`}
                        className="block rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
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
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {category.description ||
                            t("client.insight.categories.knowledge.fallback")}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">
                      {t("client.insight.categories.knowledge.empty")}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-shop_dark_green text-white">
                    {t("client.insight.categories.solutions.label")}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {t("client.insight.categories.solutions.subtitle")}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {solutionCategories.length > 0 ? (
                    solutionCategories.map((category) => (
                      <Link
                        key={category._id}
                        href={`/insight/category/${category.slug?.current ?? ""}`}
                        className="block rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
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
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {category.description ||
                            t("client.insight.categories.solutions.fallback")}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">
                      {t("client.insight.categories.solutions.empty")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>

      <Container className="pb-12 sm:pb-16">
        <Card className="border-0 bg-gradient-to-r from-shop_light_green/20 to-shop_dark_green/15">
          <CardContent className="p-6 sm:p-10 lg:p-12 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
              <Mail className="h-6 w-6 text-shop_dark_green" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
              {t("client.insight.newsletter.title")}
            </h3>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto">
              {t("client.insight.newsletter.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="bg-shop_dark_green text-white hover:bg-shop_light_green">
                {t("client.insight.newsletter.primary")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
                asChild
              >
                <Link href="/insight/knowledge">
                  {t("client.insight.newsletter.secondary")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
};

export default InsightPageClient;
