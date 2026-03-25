"use client";

import ArticleCard, {
  ArticleCardSkeleton,
  type NewsArticleListItem,
} from "./ArticleCard";
import ContentGrid from "@/components/shared/ContentGrid";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type ArticleGridProps = {
  articles: NewsArticleListItem[];
  isLoading?: boolean;
  skeletonCount?: number;
  highlightFirst?: boolean;
};

const ArticleGrid = ({
  articles,
  isLoading = false,
  skeletonCount = 6,
  highlightFirst = true,
}: ArticleGridProps) => {
  const { t } = useTranslation();
  const validArticles = articles.filter((article) => {
    const slug = article.slug;
    if (typeof slug === "string") return Boolean(slug.trim());
    if (typeof slug === "object" && slug && typeof slug.current === "string") {
      return Boolean(slug.current.trim());
    }
    return false;
  });

  const emptyState = (
    <Card className="border border-dashed border-gray-200">
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-shop_light_bg text-shop_dark_green">
          <BookOpenCheck className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-900">{t("client.news.empty.title")}</p>
          <p className="text-sm text-gray-600">
            {t("client.news.empty.subtitle")}
          </p>
        </div>
        <Button asChild className="bg-shop_dark_green hover:bg-shop_light_green">
          <Link href="/news">{t("client.news.empty.reset")}</Link>
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <ContentGrid
      items={validArticles}
      loading={isLoading}
      skeletonCount={skeletonCount}
      columns={{ sm: 1, md: 2, xl: 3 }}
      gap={6}
      emptyState={emptyState}
      renderItem={(article, index) => {
        const featured = highlightFirst && index === 0 && validArticles.length > 2;
        return <ArticleCard key={article._id ?? index} article={article} featured={featured} />;
      }}
      renderSkeleton={(index) => {
        const featured = highlightFirst && index === 0 && skeletonCount > 3;
        return <ArticleCardSkeleton key={`skeleton-${index}`} featured={featured} />;
      }}
    />
  );
};

export default ArticleGrid;
