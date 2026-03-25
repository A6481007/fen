"use client";

import ContentCard, {
  ContentCardSkeleton,
  type ContentCardBadge,
  type ContentCardMetadata,
} from "@/components/shared/ContentCard";
import { pickLocalized } from "@/lib/news/localize";
import { urlFor } from "@/sanity/lib/image";
import dayjs from "dayjs";
import { ArrowRight, CalendarDays, Clock, Eye, User2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export type NewsArticleListItem = {
  _id?: string;
  title?: string | null;
  titleTh?: string | null;
  slug?:
    | string
    | null
    | {
        current?: string | null;
      };
  publishDate?: string | null;
  publishedAt?: string | null;
  author?: {
    name?: string | null;
    image?: unknown;
  } | null;
  featuredImage?: unknown;
  mainImage?: unknown;
  heroImage?: unknown;
  cardImage?: unknown;
  category?: string | null;
  summary?: string | null;
  summaryTh?: string | null;
  excerpt?: string | null;
  excerptTh?: string | null;
  plainText?: string | null;
  plainTextTh?: string | null;
  viewCount?: number | null;
  linkedEvent?: {
    title?: string | null;
    slug?: string | null;
    date?: string | null;
    status?: string | null;
  } | null;
};

const CATEGORY_KEYS: Record<string, string> = {
  announcement: "client.newsArticle.category.announcement",
  partnership: "client.newsArticle.category.partnership",
  event_announcement: "client.newsArticle.category.event_announcement",
  general: "client.newsArticle.category.general",
};

const buildArticleHref = (slug?: NewsArticleListItem["slug"]) => {
  if (!slug) return null;
  if (typeof slug === "string" && slug.trim()) return `/news/${slug.trim()}`;
  if (typeof slug === "object" && typeof slug.current === "string" && slug.current.trim()) {
    return `/news/${slug.current.trim()}`;
  }
  return null;
};

const clampText = (value?: string | null, limit: number = 180) => {
  if (!value) return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}…`;
};

const calculateReadTime = (text?: string | null) => {
  if (!text) return 2;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const buildArticleImageUrl = (source: unknown, featured: boolean) => {
  if (!source) return null;
  if (typeof source === "string") return source;

  try {
    return urlFor(source)
      .width(featured ? 1200 : 800)
      .height(featured ? 680 : 480)
      .url();
  } catch (error) {
    console.error("Unable to build news article image url", error);
    return null;
  }
};

type ArticleCardProps = {
  article: NewsArticleListItem;
  featured?: boolean;
};

const ArticleCard = ({ article, featured = false }: ArticleCardProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const href = buildArticleHref(article.slug);
  const hasHref = Boolean(href);
  const imageSource =
    article.cardImage || article.mainImage || article.featuredImage || article.heroImage;
  const imageUrl = buildArticleImageUrl(imageSource, featured);
  const title =
    pickLocalized(language, article.title, article.titleTh) ||
    t("client.newsArticle.titleFallback");
  const summaryText = pickLocalized(
    language,
    article.summary || article.excerpt || article.plainText,
    article.summaryTh || article.excerptTh || article.plainTextTh
  );
  const excerpt =
    clampText(summaryText, 200) ||
    t("client.newsArticle.excerptFallback");
  const publishedAt = article.publishedAt || article.publishDate;
  const readTime = calculateReadTime(
    pickLocalized(language, article.plainText || article.excerpt, article.plainTextTh || article.excerptTh) || ""
  );
  const viewCount =
    typeof article.viewCount === "number" && article.viewCount > 0
      ? article.viewCount
      : null;
  const linkedEventLabel = article.linkedEvent?.title || null;
  const categoryLabelKey = CATEGORY_KEYS[article.category ?? ""];
  const categoryLabel = categoryLabelKey
    ? t(categoryLabelKey)
    : t("client.newsArticle.category.default");

  const badges: ContentCardBadge[] = [
    {
      label: categoryLabel,
      variant: "default",
      colorClassName: "bg-white/90 text-shop_dark_green shadow-sm",
    },
  ];

  if (linkedEventLabel) {
    badges.push({
      label: linkedEventLabel,
      variant: "outline",
      colorClassName: "bg-white/80 text-gray-800 border border-gray-200",
      icon: <CalendarDays className="h-3.5 w-3.5" />,
    });
  }

  const metadata: ContentCardMetadata[] = [];

  if (publishedAt) {
    metadata.push({
      icon: <CalendarDays className="h-4 w-4" />,
      label: t("client.newsArticle.meta.published"),
      value: (
        <time dateTime={publishedAt}>{dayjs(publishedAt).format("MMM D, YYYY")}</time>
      ),
    });
  }

  metadata.push({
    icon: <Clock className="h-4 w-4" />,
    label: t("client.newsArticle.meta.read"),
    value: t("client.newsArticle.meta.readTime", { count: readTime }),
  });

  if (viewCount) {
    metadata.push({
      icon: <Eye className="h-4 w-4" />,
      label: t("client.newsArticle.meta.views"),
      value: viewCount.toLocaleString(),
    });
  }

  if (article.author?.name) {
    metadata.push({
      icon: <User2 className="h-4 w-4" />,
      label: t("client.newsArticle.meta.by"),
      value: article.author.name,
    });
  }

  return (
    <ContentCard
      title={title}
      description={excerpt}
      image={{ url: imageUrl ?? undefined, alt: title || t("client.newsArticle.imageAlt") }}
      layout="grid"
      size={featured ? "large" : "default"}
      featured={featured}
      mediaHref={href || undefined}
      badges={badges}
      metadata={metadata}
      primaryAction={
        hasHref
          ? {
              label: t("client.newsArticle.actions.readStory"),
              href: href || undefined,
              ariaLabel: t("client.newsArticle.actions.readAria", {
                title: title || t("client.newsArticle.actions.readAriaFallback"),
              }),
              icon: <ArrowRight className="h-4 w-4" />,
            }
          : undefined
      }
      share={{
        label: t("client.productPage.actions.share"),
        ariaLabel: t("client.newsArticle.share.title"),
      }}
    />
  );
};

export const ArticleCardSkeleton = ({ featured = false }: { featured?: boolean }) => (
  <ContentCardSkeleton layout="grid" size={featured ? "large" : "default"} featured={featured} />
);

export default ArticleCard;
