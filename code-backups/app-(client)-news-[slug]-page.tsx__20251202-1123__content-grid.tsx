import ArticleGrid from "@/components/news/ArticleGrid";
import type { NewsArticleListItem } from "@/components/news/ArticleCard";
import ArticleContent from "@/components/news/ArticleContent";
import AttachmentsPanel, { type NewsAttachment } from "@/components/news/AttachmentsPanel";
import EventCTACard from "@/components/news/EventCTACard";
import Container from "@/components/Container";
import { Button } from "@/components/ui/button";
import { generateEventSchema, generateNewsArticleSchema } from "@/lib/seo";
import { getNewsArticleBySlug, getNewsArticles } from "@/sanity/queries";
import { auth } from "@clerk/nextjs/server";
import { Share2, Twitter, Linkedin, Facebook } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type LinkedEventForPage = {
  title?: string | null;
  slug?: string | null;
  date?: string | null;
  location?: string | null;
  status?: string | null;
  statusOverride?: string | null;
  registrationOpen?: boolean | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  announcement: "Announcement",
  partnership: "Partnership",
  event_announcement: "Event",
  general: "General",
};

const formatCategory = (value?: string | null) =>
  CATEGORY_LABELS[value ?? ""] || "Update";

const getSlugValue = (slug?: string | { current?: string | null } | null) => {
  if (!slug) return "";
  if (typeof slug === "string") return slug;
  return slug.current || "";
};

const buildShareLinks = (title: string, url: string) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return [
    {
      label: "Twitter",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <Twitter className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
      icon: <Linkedin className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <Facebook className="h-4 w-4" aria-hidden="true" />,
    },
  ];
};

const hasLockedAttachments = (attachments?: NewsAttachment[] | null) =>
  Array.isArray(attachments)
    ? attachments.some(
        (attachment) =>
          attachment?.status === "event_locked" &&
          (!attachment?.access || attachment.access.isVisible === false)
      )
    : false;

const SingleNewsPage = async ({ params }: { params: { slug: string } }) => {
  const { slug } = params;
  const normalizedSlug = typeof slug === "string" ? slug : "";
  const { userId } = await auth();
  const newsArticle = await getNewsArticleBySlug(normalizedSlug, userId ?? null);

  if (!newsArticle) return notFound();

  const related = await getNewsArticles(newsArticle?.category || undefined, undefined, 4, 0, "newest");
  const relatedItems: NewsArticleListItem[] = ((related?.items as NewsArticleListItem[]) || [])
    .filter((item) => getSlugValue(item?.slug) && getSlugValue(item?.slug) !== normalizedSlug)
    .slice(0, 3);

  const categoryLabel = formatCategory(newsArticle?.category);
  const breadcrumbItems = [
    { label: "News", href: "/news" },
    { label: categoryLabel, href: newsArticle?.category ? `/news?category=${newsArticle.category}` : "/news" },
    { label: newsArticle?.title || "Article" },
  ];

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const shareUrl = `${baseUrl || ""}/news/${normalizedSlug}`;
  const shareLinks = buildShareLinks(newsArticle?.title || "News article", shareUrl);
  const lockedAttachments = hasLockedAttachments(newsArticle?.attachments as NewsAttachment[] | undefined);
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

      <div className="bg-gradient-to-b from-shop_light_bg/60 to-white">
        <Container className="py-10 lg:py-14">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-8">
              <ArticleContent article={newsArticle} breadcrumbItems={breadcrumbItems} />

              <div className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-shop_dark_green">
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span>Share this article</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {shareLinks.map((link) => (
                    <Button
                      key={link.label}
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Link
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Share on ${link.label}`}
                      >
                        <span className="mr-2 inline-flex">{link.icon}</span>
                        {link.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>

              {relatedItems.length ? (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold text-shop_dark_green">Related articles</h2>
                    <Link
                      href="/news"
                      className="text-sm font-semibold text-shop_light_green hover:text-shop_dark_green"
                    >
                      View all news
                    </Link>
                  </div>
                  <ArticleGrid articles={relatedItems} highlightFirst={false} />
                </section>
              ) : null}
            </div>

            <div className="space-y-6">
              <AttachmentsPanel
                attachments={newsArticle?.attachments as NewsAttachment[]}
                linkedEventSlug={linkedEvent?.slug || null}
                linkedEventTitle={linkedEvent?.title || null}
              />

              {linkedEvent ? (
                <EventCTACard
                  event={linkedEvent}
                  hasLockedAttachments={lockedAttachments}
                />
              ) : null}
            </div>
          </div>
        </Container>
      </div>
    </>
  );
};

export default SingleNewsPage;
