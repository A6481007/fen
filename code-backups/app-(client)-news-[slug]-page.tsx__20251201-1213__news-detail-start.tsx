import ArticleLayout from "@/components/news/ArticleLayout";
import { generateEventSchema, generateNewsArticleSchema } from "@/lib/seo";
import { getNewsArticleBySlug } from "@/sanity/queries";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

const SingleNewsPage = async ({
  params,
}: {
  params: { slug: string };
}) => {
  const { slug } = params;
  const { userId } = await auth();
  const newsArticle = await getNewsArticleBySlug(slug, userId ?? null);

  if (!newsArticle) return notFound();

  const structuredData = [
    generateNewsArticleSchema(newsArticle),
    newsArticle?.contentType === "event" || newsArticle?.isEvent
      ? generateEventSchema(newsArticle)
      : null,
  ].filter(Boolean);

  return (
    <>
      {structuredData.map((schema, index) => (
        <script
          // eslint-disable-next-line react/no-danger
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ArticleLayout article={newsArticle} variant="news" />
    </>
  );
};

export default SingleNewsPage;
