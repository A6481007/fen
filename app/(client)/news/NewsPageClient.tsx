"use client";

import Container from "@/components/Container";
import ArticleCard, { type NewsArticleListItem } from "@/components/news/ArticleCard";
import NewsErrorState from "@/components/news/NewsErrorState";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type CategoryOption = { labelKey: string; value: string };

type NewsPageClientProps = {
  structuredData: Record<string, unknown>[];
  categoryOptions: CategoryOption[];
  rawCategoryParam: string;
  categoryParam: string;
  searchQuery?: string;
  sortForUrl: string;
  articles: NewsArticleListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  averageReadTime: number;
  showHeroHeader?: boolean;
  hasError?: boolean;
};

const buildHref = (params: { category?: string; sort?: string; page?: number; search?: string }) => {
  const searchParams = new URLSearchParams();
  if (params.category && params.category !== "all") searchParams.set("category", params.category);
  if (params.sort && params.sort !== "newest") searchParams.set("sort", params.sort);
  if (params.page && params.page > 1) searchParams.set("page", params.page.toString());
  if (params.search) searchParams.set("search", params.search);
  const qs = searchParams.toString();
  return qs ? `/news?${qs}` : "/news";
};

const NewsPageClient = ({
  structuredData,
  categoryOptions,
  rawCategoryParam,
  categoryParam,
  searchQuery,
  sortForUrl,
  articles,
  totalCount,
  totalPages,
  currentPage,
  averageReadTime,
  showHeroHeader = true,
  hasError = false,
}: NewsPageClientProps) => {
  const { t } = useTranslation();
  const activeCategory = categoryParam || "all";

  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
        {structuredData.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <Container className="py-12">
          <NewsErrorState />
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      {structuredData.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Container className="space-y-10 py-10">
        <header className="space-y-4 text-center">
          {showHeroHeader ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {t("client.news.hero.badge")}
              </p>
              <h1 className="text-3xl font-bold text-ink-strong sm:text-4xl">
                {t("client.news.hero.title")}
              </h1>
              <p className="text-ink-muted max-w-3xl mx-auto">
                {t("client.news.hero.subtitle")}
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-ink-muted">
                <span className="rounded-full border border-border bg-surface-0 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {t("client.news.hero.stats.published")}: {totalCount}
                </span>
                <span className="rounded-full border border-border bg-surface-0 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {t("client.news.hero.stats.readTime")}: {t("client.news.hero.stats.readTimeValue", { count: averageReadTime })}
                </span>
                <span className="rounded-full border border-border bg-surface-0 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {t("client.news.hero.stats.categories")}: {categoryOptions.length - 1}
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/news/resources"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-ink"
                >
                  {t("client.news.hero.cta.resources")}
                </Link>
                <Link
                  href="/news/events"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-ink"
                >
                  {t("client.news.hero.cta.events")}
                </Link>
              </div>
            </>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2">
            {categoryOptions.map((option) => {
              const active = activeCategory === option.value;
              const href = buildHref({ category: option.value, sort: sortForUrl, search: searchQuery });
              return (
                <Link
                  key={option.value}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold transition",
                    active ? "border-ink bg-ink text-white" : "border-border bg-surface-0 text-ink hover:border-ink/40"
                  )}
                >
                  <span>{t(option.labelKey)}</span>
                  <Badge variant="secondary" className="bg-white/80 text-ink border-0">
                    {option.value === "all" ? totalCount : undefined}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 text-sm text-ink-muted">
              <span className="font-semibold text-ink">{t("client.news.filters.sort.label")}:</span>
              {[
                { value: "newest", label: t("client.news.filters.sort.newest") },
                { value: "oldest", label: t("client.news.filters.sort.oldest") },
                { value: "most-viewed", label: t("client.news.filters.sort.mostViewed") },
              ].map((sort) => {
                const href = buildHref({ category: activeCategory, sort: sort.value, search: searchQuery });
                const isActive = sortForUrl === sort.value;
                return (
                  <Link
                    key={sort.value}
                    href={href}
                    className={cn(
                      "rounded-full px-3 py-1",
                      isActive ? "bg-ink text-white" : "hover:bg-surface-1"
                    )}
                  >
                    {sort.label}
                  </Link>
                );
              })}
            </div>

            <form action="/news" method="get" className="flex w-full max-w-sm items-center gap-2">
              <Input
                name="search"
                defaultValue={searchQuery || ""}
                placeholder={t("client.news.filters.searchPlaceholder")}
              />
              {activeCategory && activeCategory !== "all" ? (
                <input type="hidden" name="category" value={activeCategory} />
              ) : null}
              {sortForUrl && sortForUrl !== "newest" ? (
                <input type="hidden" name="sort" value={sortForUrl} />
              ) : null}
            </form>
          </div>

          {articles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-0 p-8 text-center text-ink-muted">
              {t("client.news.results.none")}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          )}
        </section>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={currentPage > 1 ? buildHref({ category: activeCategory, sort: sortForUrl, page: currentPage - 1, search: searchQuery }) : undefined}
                aria-disabled={currentPage <= 1}
                aria-label={t("client.shop.pagination.prev")}
              >
                {t("client.shop.pagination.prev")}
              </PaginationPrevious>
            </PaginationItem>

            {Array.from({ length: Math.max(totalPages, 1) }).map((_, index) => {
              const pageNumber = index + 1;
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    isActive={pageNumber === currentPage}
                    href={buildHref({ category: activeCategory, sort: sortForUrl, page: pageNumber, search: searchQuery })}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext
                href={currentPage < totalPages ? buildHref({ category: activeCategory, sort: sortForUrl, page: currentPage + 1, search: searchQuery }) : undefined}
                aria-disabled={currentPage >= totalPages}
                aria-label={t("client.shop.pagination.next")}
              >
                {t("client.shop.pagination.next")}
              </PaginationNext>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Container>
    </div>
  );
};

export default NewsPageClient;
