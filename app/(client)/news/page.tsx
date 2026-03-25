import type { Metadata } from "next";
import type { NewsArticleListItem } from "@/components/news/ArticleCard";
import HeroBanner from "@/components/HeroBanner";
import { generateItemListSchema, generateNewsArticleSchema } from "@/lib/seo";
import { getHeroBannerByPlacement, getNewsArticles } from "@/sanity/queries";
import NewsPageClient from "./NewsPageClient";

const NEWS_PAGE_SIZE = 9;

type NewsSearchParams = {
  category?: string | string[];
  type?: string | string[];
  search?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

type NewsPageProps = {
  searchParams?: NewsSearchParams | Promise<NewsSearchParams>;
};

export const metadata: Metadata = {
  title: "Newsroom | Product updates, events, and resources",
  description:
    "Stay current with announcements, launch notes, and resource-ready articles from the ShopCart team.",
};

const CATEGORY_OPTIONS = [
  { labelKey: "client.news.categories.all", value: "all" },
  { labelKey: "client.news.categories.announcement", value: "announcement" },
  { labelKey: "client.news.categories.partnership", value: "partnership" },
  { labelKey: "client.news.categories.event_announcement", value: "event_announcement" },
  { labelKey: "client.news.categories.general", value: "general" },
];

const parseParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value || "";

const calculateAverageReadTime = (articles: NewsArticleListItem[]) => {
  if (!articles.length) return 2;

  const total = articles.reduce((sum, article) => {
    const text = article.plainText || article.excerpt || "";
    const words = text.split(/\s+/).filter(Boolean).length;
    return sum + Math.max(1, Math.ceil(words / 200));
  }, 0);

  return Math.max(1, Math.round(total / articles.length));
};

const buildStructuredData = (articles: NewsArticleListItem[]) => {
  const articleSchemas = articles
    .map((article) => generateNewsArticleSchema(article as any))
    .filter(Boolean);

  const itemListSchema = generateItemListSchema(articles as any, "News Hub", {
    basePath: "/news",
  });

  return [...articleSchemas, itemListSchema].filter(Boolean) as Record<string, unknown>[];
};

const NewsPage = async ({ searchParams }: NewsPageProps) => {
  const heroBanner = await getHeroBannerByPlacement("newspagehero", "sitewidepagehero");
  const resolvedSearchParams = await searchParams;
  const rawCategoryParam =
    parseParam(resolvedSearchParams?.category) || parseParam(resolvedSearchParams?.type);
  const categoryParam =
    rawCategoryParam && rawCategoryParam !== "all" ? rawCategoryParam : "";
  const searchQuery = parseParam(resolvedSearchParams?.search);
  const sortParam = parseParam(resolvedSearchParams?.sort) || "newest";
  const pageParam = parseParam(resolvedSearchParams?.page);
  const parsedPage = Number.parseInt(pageParam, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const offset = (page - 1) * NEWS_PAGE_SIZE;

  const newsData = await getNewsArticles(
    categoryParam || undefined,
    searchQuery || undefined,
    NEWS_PAGE_SIZE,
    offset,
    sortParam
  );

  const articles: NewsArticleListItem[] = Array.isArray(newsData?.items)
    ? (newsData.items as NewsArticleListItem[])
    : [];

  const totalCount = newsData?.totalCount ?? articles.length ?? 0;
  const totalPages =
    newsData?.totalPages ?? (totalCount > 0 ? Math.ceil(totalCount / NEWS_PAGE_SIZE) : 0);
  const currentPage = Math.min(
    Math.max(newsData?.currentPage ?? page, 1),
    Math.max(totalPages, 1)
  );
  const normalizedSort = newsData?.sort || sortParam || "newest";
  const sortForUrl = normalizedSort.replace(/_/g, "-");
  const structuredData = buildStructuredData(articles);
  const averageReadTime = calculateAverageReadTime(articles);
  const hasError = Boolean(newsData?.hasError);

  return (
    <>
      {heroBanner ? <HeroBanner placement="newspagehero" banner={heroBanner} /> : null}
      <NewsPageClient
        structuredData={structuredData}
        categoryOptions={CATEGORY_OPTIONS}
        rawCategoryParam={rawCategoryParam || "all"}
        categoryParam={categoryParam}
        searchQuery={searchQuery}
        sortForUrl={sortForUrl}
        articles={articles}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        averageReadTime={averageReadTime}
        showHeroHeader={!heroBanner}
        hasError={hasError}
      />
    </>
  );
};

export default NewsPage;
