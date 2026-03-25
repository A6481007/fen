import ArticleCard, {
  ArticleCardSkeleton,
  type NewsArticleListItem,
} from "./ArticleCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpenCheck } from "lucide-react";
import Link from "next/link";

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
  if (isLoading) {
    const skeletons = Array.from({ length: skeletonCount }).map((_, index) => {
      const featured = highlightFirst && index === 0 && skeletonCount > 3;
      return <ArticleCardSkeleton key={`skeleton-${index}`} featured={featured} />;
    });

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {skeletons}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <Card className="border border-dashed border-gray-200">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-shop_light_bg text-shop_dark_green">
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">No news to show</p>
            <p className="text-sm text-gray-600">
              Try a different category or search term to explore more updates and resources.
            </p>
          </div>
          <Button asChild className="bg-shop_dark_green hover:bg-shop_light_green">
            <Link href="/news">Reset filters</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {articles.map((article, index) => {
        const featured = highlightFirst && index === 0 && articles.length > 2;
        return <ArticleCard key={article._id ?? index} article={article} featured={featured} />;
      })}
    </div>
  );
};

export default ArticleGrid;
