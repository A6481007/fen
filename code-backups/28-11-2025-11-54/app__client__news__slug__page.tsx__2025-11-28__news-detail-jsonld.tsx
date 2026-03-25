import ArticleLayout from "@/components/news/ArticleLayout";
import { getSingleNews } from "@/sanity/queries";
import { notFound } from "next/navigation";

const SingleNewsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const newsArticle = await getSingleNews(slug);

  if (!newsArticle) return notFound();

  return <ArticleLayout article={newsArticle} variant="news" />;
};

export default SingleNewsPage;
