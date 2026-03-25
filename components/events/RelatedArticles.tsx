"use client";

import ArticleCard, { type NewsArticleListItem } from "@/components/news/ArticleCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RelatedArticlesProps = {
  articles?: NewsArticleListItem[] | null;
};

const RelatedArticles = ({ articles = [] }: RelatedArticlesProps) => {
  const items = Array.isArray(articles) ? articles.filter(Boolean) : [];

  if (!items.length) {
    return null;
  }

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-shop_dark_green">Related newsroom updates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((article) => (
            <ArticleCard key={article._id || String(article.slug)} article={article} featured={false} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RelatedArticles;
