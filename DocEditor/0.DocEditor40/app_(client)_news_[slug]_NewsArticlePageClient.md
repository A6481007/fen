"use client";

import Container from "@/components/Container";
import ArticleContent from "@/components/news/ArticleContent";
import ArticleGrid from "@/components/news/ArticleGrid";
import AttachmentsPanel, { type NewsAttachment } from "@/components/news/AttachmentsPanel";
import EventCTACard from "@/components/news/EventCTACard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pickLocalized } from "@/lib/news/localize";
import type { NewsArticleListItem } from "@/components/news/ArticleCard";
import type { PortableTextContent } from "@/types/portableText";
import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type LinkedEventForPage = {
  title?: string | null;
  slug?: string | null;
  date?: string | null;
  location?: string | null;
  status?: string | null;
  statusOverride?: string | null;
  registrationOpen?: boolean | null;
};

type NewsArticleDetail = NewsArticleListItem & {
  content?: PortableTextContent | null;
  contentTh?: PortableTextContent | null;
  body?: PortableTextContent | null;
  bodyTh?: PortableTextContent | null;
  heroImage?: unknown;
  heroLayout?: string | null;
  heroTheme?: string | null;
  summaryTh?: string | null;
  excerptTh?: string | null;
  dekTh?: string | null;
  keyTakeaways?: string[] | null;
  keyTakeawaysTh?: string[] | null;
  attachments?: NewsAttachment[] | null;
  tags?: string[] | null;
};

type NewsArticlePageClientProps = {
  newsArticle: NewsArticleDetail;
  relatedItems: NewsArticleListItem[];
  shareUrl: string;
  lockedAttachments: boolean;
  linkedEvent: LinkedEventForPage | null;
};

const buildShareLinks = (shareUrl: string, title: string) => {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
};

const NewsArticlePageClient = ({
  newsArticle,
  relatedItems,
  shareUrl,
  lockedAttachments,
  linkedEvent,
}: NewsArticlePageClientProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const title =
    pickLocalized(language, newsArticle.title, newsArticle.titleTh) ||
    t("client.newsArticle.fallbackTitle");
  const takeaways =
    pickLocalized(language, newsArticle.keyTakeaways, newsArticle.keyTakeawaysTh) || [];

  const breadcrumbItems = useMemo(
    () => [
      {
        label: t("client.newsArticle.breadcrumb.news"),
        href: "/news",
      },
      {
        label: title || t("client.newsArticle.breadcrumb.article"),
      },
    ],
    [t, title]
  );

  const shareLinks = useMemo(() => buildShareLinks(shareUrl, title || ""), [shareUrl, title]);

  return (
    <div className="min-h-screen bg-surface-0 text-ink">
      <Container className="py-8 sm:py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            <ArticleContent article={newsArticle} breadcrumbItems={breadcrumbItems} />

            {Array.isArray(takeaways) && takeaways.length ? (
              <Card className="border border-border bg-surface-0">
                <CardHeader>
                  <CardTitle className="text-lg text-ink-strong">
                    {t("client.newsArticle.takeaways.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-ink-muted">
                    {takeaways.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-ink" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <AttachmentsPanel
              attachments={newsArticle.attachments}
              linkedEventSlug={linkedEvent?.slug || null}
              linkedEventTitle={linkedEvent?.title || null}
            />

            {relatedItems.length ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-ink-strong">
                    {t("client.newsArticle.related.title")}
                  </h2>
                  <Link
                    href="/news"
                    className="text-sm font-semibold text-ink underline decoration-border-strong underline-offset-4"
                  >
                    {t("client.newsArticle.related.viewAll")}
                  </Link>
                </div>
                <ArticleGrid articles={relatedItems} highlightFirst={false} />
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            {linkedEvent ? (
              <EventCTACard event={linkedEvent} hasLockedAttachments={lockedAttachments} />
            ) : null}

            <Card className="border border-border bg-surface-0">
              <CardHeader>
                <CardTitle className="text-lg text-ink-strong">
                  {t("client.newsArticle.share.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(
                  [
                    { key: "twitter", label: t("client.newsArticle.share.twitter"), href: shareLinks.twitter },
                    { key: "linkedin", label: t("client.newsArticle.share.linkedin"), href: shareLinks.linkedin },
                    { key: "facebook", label: t("client.newsArticle.share.facebook"), href: shareLinks.facebook },
                  ] as const
                ).map((network) => (
                  <Link
                    key={network.key}
                    href={network.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("client.newsArticle.share.aria", { network: network.label })}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink hover:border-ink"
                  >
                    {network.label}
                  </Link>
                ))}
              </CardContent>
            </Card>

            {lockedAttachments ? (
              <Card className="border border-amber-200 bg-amber-50/70">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-900">
                    {t("client.newsArticle.attachmentsLocked.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-amber-800">
                  {t("client.newsArticle.attachmentsLocked.subtitle")}
                </CardContent>
              </Card>
            ) : null}
          </aside>
        </div>
      </Container>
    </div>
  );
};

export default NewsArticlePageClient;
