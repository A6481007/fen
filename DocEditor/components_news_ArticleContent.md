"use client";

import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { formatNewsCategory } from "@/lib/news/categories";
import { isThaiLocale, pickLocalized } from "@/lib/news/localize";
import { urlFor } from "@/sanity/lib/image";
import dayjs from "dayjs";
import { CalendarDays, Clock, User2 } from "lucide-react";
import Image from "next/image";
import Prose from "@/components/layout/Prose";
import PortableTextRenderer from "@/components/portable/PortableTextRenderer";
import type { PortableTextContent } from "@/types/portableText";
import { useTranslation } from "react-i18next";
import NewsHero from "@/components/news/NewsHero";

type ArticleContentProps = {
  article: {
    title?: string | null;
    titleTh?: string | null;
    author?: { name?: string | null; image?: unknown } | null;
    publishDate?: string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
    lastUpdated?: string | null;
    featuredImage?: unknown;
    mainImage?: unknown;
    heroImage?: unknown;
    heroLayout?: string | null;
    heroTheme?: string | null;
    content?: PortableTextContent | null;
    contentTh?: PortableTextContent | null;
    body?: PortableTextContent | null;
    bodyTh?: PortableTextContent | null;
    category?: string | null;
    summary?: string | null;
    summaryTh?: string | null;
    excerpt?: string | null;
    excerptTh?: string | null;
    dekTh?: string | null;
    tags?: string[] | null;
  };
  breadcrumbItems: { label: string; href?: string }[];
};

const getPlainText = (value?: unknown): string => {
  if (!Array.isArray(value)) return "";

  return value
    .map((block) => {
      if (
        block &&
        typeof block === "object" &&
        (block as { _type?: string })._type === "block" &&
        Array.isArray((block as { children?: unknown[] }).children)
      ) {
        const children = (block as { children?: { text?: string }[] }).children || [];
        return children.map((child) => child?.text || "").join(" ");
      }

      return "";
    })
    .join(" ")
    .trim();
};

const calculateReadingTime = (text?: string) => {
  if (!text) return 2;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const ArticleContent = ({ article, breadcrumbItems }: ArticleContentProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isThai = isThaiLocale(language);
  const publishedAt = article.publishedAt || article.publishDate;
  const updatedAt = article.updatedAt || article.lastUpdated;
  const thaiBody = article.bodyTh ?? article.contentTh;
  const hasThaiBody = Array.isArray(thaiBody) && thaiBody.length > 0;
  const hasThaiTitle = Boolean(article.titleTh && article.titleTh.trim());
  const localizedBody = pickLocalized(
    language,
    article.body ?? article.content,
    article.bodyTh ?? article.contentTh
  );
  const bodyValue: PortableTextContent | null | undefined = localizedBody ?? null;
  const plainText = getPlainText(bodyValue);
  const readingTime = calculateReadingTime(plainText);
  const heroImage = article.heroImage || article.mainImage || article.featuredImage;
  const heroLayout = (article.heroLayout as string) || "standard";
  const heroTheme = (article.heroTheme as string) || "light";
  const heroCaption = (heroImage as { caption?: string })?.caption || null;
  const title = pickLocalized(language, article.title, article.titleTh) || t("client.newsArticle.fallbackTitle");
  const categoryKey = article.category ? `client.newsArticle.category.${article.category}` : "";
  const categoryLabel =
    categoryKey && t(categoryKey) !== categoryKey
      ? t(categoryKey)
      : formatNewsCategory(article.category);
  const lead =
    pickLocalized(language, article.summary || article.excerpt, article.summaryTh || article.excerptTh) || "";
  const tags = Array.isArray(article.tags)
    ? article.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];
  const updatedLabel = updatedAt
    ? t("client.newsArticle.updated", { date: dayjs(updatedAt).format("MMM D, YYYY") })
    : null;
  const readTimeLabel = t("client.newsArticle.readTime", { count: readingTime });
  const showTranslationNotice = isThai && (!hasThaiBody || !hasThaiTitle);

  const metaRow = (
    <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
      {article.author?.name ? (
        <div className="flex items-center gap-2">
          {article.author.image ? (
            <Image
              src={urlFor(article.author.image).width(36).height(36).url()}
              alt={article.author.name}
              width={36}
              height={36}
              className="rounded-full border border-border"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-1 text-ink">
              <User2 className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <span className="font-semibold text-ink">{article.author.name}</span>
        </div>
      ) : null}

      {publishedAt ? (
        <div className="flex items-center gap-1">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <time dateTime={publishedAt}>{dayjs(publishedAt).format("MMMM D, YYYY")}</time>
        </div>
      ) : null}

      {updatedAt && updatedAt !== publishedAt && updatedLabel ? (
        <div className="flex items-center gap-1">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <time dateTime={updatedAt}>{updatedLabel}</time>
        </div>
      ) : null}

      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" aria-hidden="true" />
        <span>{readTimeLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <DynamicBreadcrumb customItems={breadcrumbItems} />

      <NewsHero
        title={title || ""}
        lead={lead}
        categoryLabel={categoryLabel}
        tags={tags}
        meta={metaRow}
        heroImage={heroImage}
        heroLayout={heroLayout as any}
        heroTheme={heroTheme as any}
        caption={heroCaption}
      />

      {showTranslationNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("client.newsArticle.translationNotice")}
        </div>
      ) : null}

      <Prose as="article">
        {Array.isArray(bodyValue) && bodyValue.length > 0 ? (
          <PortableTextRenderer
            value={bodyValue as PortableTextContent}
            options={{ accentCtaStrategy: "none" }}
          />
        ) : (
          <p>{t("client.newsArticle.contentFallback")}</p>
        )}
      </Prose>
    </div>
  );
};

export default ArticleContent;
