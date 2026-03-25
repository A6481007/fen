"use client";

import "@/app/i18n";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Container from "@/components/Container";
import InsightCard, { type InsightCardProps } from "@/components/insight/InsightCard";
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
import { cn } from "@/lib/utils";
import { KNOWLEDGE_TYPES, SOLUTION_TYPES, type InsightTypeKey } from "@/constants/insightTypes";
import { useTranslation } from "react-i18next";

type InsightCategoryRef = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  categoryType?: string | null;
};

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
  categories?: InsightCategoryRef[] | null;
  primaryCategory?: InsightCategoryRef | null;
  tags?: string[] | null;
};

type InsightsPageClientProps = {
  insights: InsightSummary[];
  categories: InsightCategoryRef[];
  activeSection: "all" | "knowledge" | "solutions";
  activeCategory: string | null;
  activeTag: string | null;
  showHeroSection?: boolean;
};

type SectionKey = "all" | "knowledge" | "solutions";

const normalizeTag = (value: string) => value.trim().toLowerCase();

const InsightsPageClient = ({
  insights,
  categories,
  activeSection,
  activeCategory,
  activeTag,
  showHeroSection = true,
}: InsightsPageClientProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedSection, setSelectedSection] = useState<SectionKey>(activeSection);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(activeCategory);
  const [selectedTag, setSelectedTag] = useState<string | null>(activeTag);

  useEffect(() => {
    setSelectedSection(activeSection);
  }, [activeSection]);

  useEffect(() => {
    setSelectedCategory(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    setSelectedTag(activeTag);
  }, [activeTag]);

  const safeInsights = Array.isArray(insights) ? insights : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const sectionOptions: Array<{ key: SectionKey; label: string; description: string }> = [
    {
      key: "all",
      label: t("client.insights.sections.all.label"),
      description: t("client.insights.sections.all.description"),
    },
    {
      key: "knowledge",
      label: t("client.insights.sections.knowledge.label"),
      description: t("client.insights.sections.knowledge.description"),
    },
    {
      key: "solutions",
      label: t("client.insights.sections.solutions.label"),
      description: t("client.insights.sections.solutions.description"),
    },
  ];

  const sectionInsights = useMemo(() => {
    if (selectedSection === "knowledge") {
      return safeInsights.filter((insight) =>
        KNOWLEDGE_TYPES.has((insight?.insightType ?? "") as InsightTypeKey)
      );
    }
    if (selectedSection === "solutions") {
      return safeInsights.filter((insight) =>
        SOLUTION_TYPES.has((insight?.insightType ?? "") as InsightTypeKey)
      );
    }
    return safeInsights;
  }, [safeInsights, selectedSection]);

  const filteredInsights = useMemo(() => {
    return sectionInsights.filter((insight) => {
      if (selectedCategory) {
        const matchesCategory =
          insight?.primaryCategory?.slug?.current === selectedCategory ||
          (insight?.categories || []).some(
            (category) => category?.slug?.current === selectedCategory
          );
        if (!matchesCategory) return false;
      }

      if (selectedTag) {
        const normalizedSelected = normalizeTag(selectedTag);
        const hasTag = (insight?.tags || []).some(
          (tag) => normalizeTag(tag) === normalizedSelected
        );
        if (!hasTag) return false;
      }

      return true;
    });
  }, [sectionInsights, selectedCategory, selectedTag]);

  const counts = useMemo(() => {
    return {
      all: safeInsights.length,
      knowledge: safeInsights.filter((insight) =>
        KNOWLEDGE_TYPES.has((insight?.insightType ?? "") as InsightTypeKey)
      ).length,
      solutions: safeInsights.filter((insight) =>
        SOLUTION_TYPES.has((insight?.insightType ?? "") as InsightTypeKey)
      ).length,
    };
  }, [safeInsights]);

  const categoryCounts = useMemo(() => {
    return sectionInsights.reduce((acc: Record<string, number>, insight) => {
      const primarySlug = insight?.primaryCategory?.slug?.current;
      if (primarySlug) {
        acc[primarySlug] = (acc[primarySlug] ?? 0) + 1;
      }
      (insight?.categories || []).forEach((category) => {
        const slug = category?.slug?.current;
        if (!slug) return;
        acc[slug] = (acc[slug] ?? 0) + 1;
      });
      return acc;
    }, {});
  }, [sectionInsights]);

  const tagStats = useMemo(() => {
    return sectionInsights.reduce(
      (acc: Record<string, { label: string; count: number }>, insight) => {
        (insight?.tags || []).forEach((tag) => {
          const normalized = normalizeTag(tag);
          if (!normalized) return;
          if (!acc[normalized]) {
            acc[normalized] = { label: tag.trim(), count: 0 };
          }
          acc[normalized].count += 1;
        });
        return acc;
      },
      {}
    );
  }, [sectionInsights]);

  const visibleCategories = useMemo(() => {
    if (selectedSection === "knowledge") {
      return safeCategories.filter((category) => category.categoryType !== "solution");
    }
    if (selectedSection === "solutions") {
      return safeCategories.filter((category) => category.categoryType !== "knowledge");
    }
    return safeCategories;
  }, [safeCategories, selectedSection]);

  const tagOptions = useMemo(() => {
    return Object.values(tagStats).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
  }, [tagStats]);

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategory) return null;
    const match = safeCategories.find(
      (category) => category.slug?.current === selectedCategory
    );
    return match?.title ?? selectedCategory;
  }, [safeCategories, selectedCategory]);

  const applyFilters = (overrides: Partial<{
    section: SectionKey;
    category: string | null;
    tag: string | null;
  }>) => {
    const nextSection = overrides.section ?? selectedSection;
    const nextCategory =
      overrides.category === undefined ? selectedCategory : overrides.category;
    const nextTag = overrides.tag === undefined ? selectedTag : overrides.tag;

    setSelectedSection(nextSection);
    setSelectedCategory(nextCategory);
    setSelectedTag(nextTag);

    const params = new URLSearchParams(searchParams?.toString());
    if (nextSection && nextSection !== "all") {
      params.set("section", nextSection);
    } else {
      params.delete("section");
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    } else {
      params.delete("category");
    }

    if (nextTag) {
      params.set("tag", nextTag);
    } else {
      params.delete("tag");
    }

    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.push(href);
    });
  };

  const hasActiveFilters = Boolean(selectedCategory || selectedTag || selectedSection !== "all");

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
              <BreadcrumbPage>{t("client.insight.breadcrumb.insight")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Container>

      {showHeroSection ? (
        <Container className="py-8 sm:py-12">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <div className="max-w-3xl space-y-4">
                <Badge className="w-fit bg-white/15 text-white" variant="secondary">
                  {t("client.insights.hero.badge")}
                </Badge>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                  {t("client.insights.hero.title")}
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-white/90">
                  {t("client.insights.hero.subtitle")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Container>
      ) : null}

      <Container className="pb-12 sm:pb-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-shop_dark_green/70">
                  {t("client.insights.header.kicker")}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-shop_dark_green">
                  {t("client.insights.header.title")}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {sectionOptions.map((option) => {
                  const isActive = selectedSection === option.key;
                  const count = counts[option.key];
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => applyFilters({ section: option.key })}
                      disabled={isPending}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
                        isActive
                          ? "border-accent-red bg-accent-red text-white shadow-sm"
                          : "border-border bg-white text-ink hover:border-neutral-900 hover:text-neutral-900"
                      )}
                    >
                      <span>{option.label}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "border-0 px-2.5 py-0.5 text-xs font-semibold",
                          isActive ? "bg-white/20 text-white" : "bg-surface-2 text-ink"
                        )}
                      >
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-600">
                {sectionOptions.find((option) => option.key === selectedSection)
                  ?.description ?? ""}
              </p>
            </div>

            {hasActiveFilters ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-semibold text-shop_dark_green">
                  {t("client.insights.filters.active")}
                </span>
                {selectedSection !== "all" ? (
                  <Badge variant="outline" className="border-shop_dark_green/30">
                    {selectedSection === "knowledge"
                      ? t("client.insights.sections.knowledge.label")
                      : t("client.insights.sections.solutions.label")}
                  </Badge>
                ) : null}
                {selectedCategory ? (
                  <Badge variant="outline" className="border-shop_dark_green/30">
                    {t("client.insights.filters.category", {
                      name: selectedCategoryLabel ?? selectedCategory,
                    })}
                  </Badge>
                ) : null}
                {selectedTag ? (
                  <Badge variant="outline" className="border-shop_dark_green/30">
                    {t("client.insights.filters.tag", { tag: selectedTag })}
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 text-xs text-shop_dark_green"
                  onClick={() => applyFilters({ section: "all", category: null, tag: null })}
                >
                  {t("client.insights.filters.clearAll")}
                </Button>
              </div>
            ) : null}

            {filteredInsights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredInsights.map((insight, index) => (
                  <InsightCard
                    key={insight?._id || index}
                    insight={insight as InsightCardProps["insight"]}
                    variant="default"
                    showProductCount
                  />
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center space-y-3">
                  <p className="text-sm text-shop_dark_green/70">
                    {t("client.insights.empty.title")}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyFilters({ section: "all", category: null, tag: null })}
                  >
                    {t("client.insights.filters.reset")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-shop_dark_green/70">
                    {t("client.insights.sidebar.filterLabel")}
                  </p>
                  <h3 className="text-lg font-semibold text-shop_dark_green">
                    {t("client.insights.sidebar.categories.title")}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyFilters({ category: null })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      selectedCategory === null
                        ? "border-accent-red bg-accent-red text-white"
                        : "border-border bg-white text-ink hover:border-neutral-900"
                    )}
                  >
                    {t("client.insights.sidebar.categories.all")}
                  </button>
                  {visibleCategories.map((category) => {
                    const slug = category.slug?.current ?? "";
                    if (!slug) return null;
                    const isActive = selectedCategory === slug;
                    const count = categoryCounts[slug] ?? 0;
                    return (
                      <button
                        key={category._id || slug}
                        type="button"
                        onClick={() => applyFilters({ category: slug || null })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition",
                          isActive
                            ? "border-accent-red bg-accent-red text-white"
                            : "border-border bg-white text-ink hover:border-neutral-900"
                        )}
                      >
                        {category.title ?? t("client.insights.sidebar.categories.fallback")}
                        <span className="ml-2 text-[10px] opacity-70">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-shop_dark_green/70">
                    {t("client.insights.sidebar.filterLabel")}
                  </p>
                  <h3 className="text-lg font-semibold text-shop_dark_green">
                    {t("client.insights.sidebar.tags.title")}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyFilters({ tag: null })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      selectedTag === null
                        ? "border-accent-red bg-accent-red text-white"
                        : "border-border bg-white text-ink hover:border-neutral-900"
                    )}
                  >
                    {t("client.insights.sidebar.tags.all")}
                  </button>
                  {tagOptions.map((tag) => {
                    const normalized = normalizeTag(tag.label);
                    const isActive =
                      selectedTag && normalizeTag(selectedTag) === normalized;
                    return (
                      <button
                        key={normalized}
                        type="button"
                        onClick={() => applyFilters({ tag: tag.label })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition",
                          isActive
                            ? "border-accent-red bg-accent-red text-white"
                            : "border-border bg-white text-ink hover:border-neutral-900"
                        )}
                      >
                        {tag.label}
                        <span className="ml-2 text-[10px] opacity-70">{tag.count}</span>
                      </button>
                    );
                  })}
                </div>
                {tagOptions.length === 0 ? (
                  <>
                    <Separator />
                    <p className="text-xs text-gray-600">
                      {t("client.insights.sidebar.tags.empty")}
                    </p>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>
      </Container>
    </div>
  );
};

export default InsightsPageClient;
