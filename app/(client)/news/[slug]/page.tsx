import type { NewsArticleListItem } from "@/components/news/ArticleCard";
import Container from "@/components/Container";
import NewsErrorState from "@/components/news/NewsErrorState";
import { generateEventSchema, generateNewsArticleSchema } from "@/lib/seo";
import { getNewsArticleBySlug, getNewsArticles } from "@/sanity/queries";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import NewsArticlePageClient from "./NewsArticlePageClient";

type LinkedEventForPage = {
  title?: string | null;
  slug?: string | null;
  date?: string | null;
  location?: string | null;
  status?: string | null;
  statusOverride?: string | null;
  registrationOpen?: boolean | null;
};

const getSlugValue = (slug?: string | { current?: string | null } | null) => {
  if (!slug) return "";
  if (typeof slug === "string") return slug;
  return slug.current || "";
};

const hasLockedAttachments = (attachments?: { status?: string | null; access?: { isVisible?: boolean | null } | null }[] | null) =>
  Array.isArray(attachments)
    ? attachments.some(
        (attachment) =>
          attachment?.status === "event_locked" &&
          (!attachment?.access || attachment.access.isVisible === false)
      )
    : false;

const isNewsError = (value: unknown): value is { __error: true } =>
  Boolean(value && typeof value === "object" && "__error" in (value as Record<string, unknown>));

const SingleNewsPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const normalizedSlug = typeof slug === "string" ? slug : "";
  const { userId } = await auth();
  const newsArticle = await getNewsArticleBySlug(normalizedSlug, userId ?? null);

  if (isNewsError(newsArticle)) {
    return (
      <div className="min-h-screen bg-surface-0 text-ink">
        <Container className="py-12">
          <NewsErrorState />
        </Container>
      </div>
    );
  }

  if (!newsArticle) return notFound();

  const related = await getNewsArticles(newsArticle?.category || undefined, undefined, 4, 0, "newest");
  const relatedItems: NewsArticleListItem[] = ((related?.items as NewsArticleListItem[]) || [])
    .filter((item) => getSlugValue(item?.slug) && getSlugValue(item?.slug) !== normalizedSlug)
    .slice(0, 3);

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const shareUrl = `${baseUrl || ""}/news/${normalizedSlug}`;
  const lockedAttachments = hasLockedAttachments(newsArticle?.attachments as { status?: string | null; access?: { isVisible?: boolean | null } | null }[] | undefined);
  const linkedEvent = (newsArticle?.linkedEvent || null) as LinkedEventForPage | null;

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
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <NewsArticlePageClient
        newsArticle={newsArticle}
        relatedItems={relatedItems}
        shareUrl={shareUrl}
        lockedAttachments={lockedAttachments}
        linkedEvent={linkedEvent}
      />
    </>
  );
};

export default SingleNewsPage;
