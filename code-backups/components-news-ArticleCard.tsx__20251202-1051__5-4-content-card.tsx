import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { urlFor } from "@/sanity/lib/image";
import dayjs from "dayjs";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Eye,
  Link2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";

export type NewsArticleListItem = {
  _id?: string;
  title?: string | null;
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
  category?: string | null;
  summary?: string | null;
  excerpt?: string | null;
  plainText?: string | null;
  viewCount?: number | null;
  linkedEvent?: {
    title?: string | null;
    slug?: string | null;
    date?: string | null;
    status?: string | null;
  } | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  announcement: "Announcement",
  partnership: "Partnership",
  event_announcement: "Event",
  general: "General",
};

const formatCategory = (value?: string | null) =>
  CATEGORY_LABELS[value ?? ""] || "Update";

const buildArticleHref = (slug?: NewsArticleListItem["slug"]) => {
  if (!slug) return "/news";
  if (typeof slug === "string") return `/news/${slug}`;
  if (typeof slug.current === "string") return `/news/${slug.current}`;
  return "/news";
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

type ArticleCardProps = {
  article: NewsArticleListItem;
  featured?: boolean;
};

const ArticleCard = ({ article, featured = false }: ArticleCardProps) => {
  const href = buildArticleHref(article.slug);
  const imageSource = article.mainImage || article.featuredImage;
  const imageUrl = imageSource
    ? urlFor(imageSource)
        .width(featured ? 1200 : 800)
        .height(featured ? 680 : 480)
        .url()
    : null;
  const excerpt =
    clampText(article.summary, 200) ||
    clampText(article.excerpt, 200) ||
    clampText(article.plainText, 200) ||
    "Fresh updates and release notes from the newsroom.";
  const publishedAt = article.publishedAt || article.publishDate;
  const readTime = calculateReadTime(article.plainText || article.excerpt);
  const viewCount =
    typeof article.viewCount === "number" && article.viewCount > 0
      ? article.viewCount
      : null;
  const linkedEventLabel = article.linkedEvent?.title || null;

  return (
    <Card
      className={`group h-full overflow-hidden border border-gray-100 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      <div className={`relative ${featured ? "h-64 md:h-80" : "h-52 md:h-56"}`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={article.title || "News image"}
            fill
            sizes={featured ? "(min-width: 1024px) 66vw, 100vw" : "33vw"}
            className="object-cover transition duration-300 group-hover:scale-105"
            priority={featured}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-shop_light_bg to-white text-shop_dark_green">
            <Link2 className="h-6 w-6" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <Badge className="bg-white/90 text-shop_dark_green shadow-sm hover:bg-white">
            {formatCategory(article.category)}
          </Badge>
          {linkedEventLabel ? (
            <Badge variant="outline" className="bg-white/80 text-gray-800">
              {linkedEventLabel}
            </Badge>
          ) : null}
        </div>
        <Link href={href} className="absolute inset-0" aria-label={article.title || "News"} />
      </div>

      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {publishedAt ? (
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <time dateTime={publishedAt}>
                {dayjs(publishedAt).format("MMM D, YYYY")}
              </time>
            </div>
          ) : null}
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{readTime} min read</span>
          </div>
          {viewCount ? (
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{viewCount.toLocaleString()} views</span>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Link href={href} className="group/title block">
            <h3
              className={`font-bold text-shop_dark_green transition-colors duration-200 group-hover/title:text-shop_light_green ${
                featured ? "text-xl md:text-2xl" : "text-lg"
              }`}
            >
              {article.title}
            </h3>
          </Link>
          <p className="line-clamp-3 text-sm text-gray-600">{excerpt}</p>
        </div>

        <Separator />

        <div className="mt-auto flex items-center justify-between text-sm">
          {article.author?.name ? (
            <span className="text-gray-600">By {article.author.name}</span>
          ) : (
            <span className="text-gray-500">Editorial</span>
          )}
          <Link
            href={href}
            className="group/cta inline-flex items-center gap-1 font-semibold text-shop_light_green transition-colors hover:text-shop_dark_green"
            aria-label={`Read ${article.title || "article"}`}
          >
            Read story
            <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export const ArticleCardSkeleton = ({ featured = false }: { featured?: boolean }) => (
  <Card className={`overflow-hidden ${featured ? "md:col-span-2" : ""}`}>
    <div className={`relative ${featured ? "h-64 md:h-80" : "h-52 md:h-56"}`}>
      <Skeleton className="h-full w-full" />
    </div>
    <CardContent className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className={`h-6 ${featured ? "w-3/4" : "w-full"}`} />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Separator />
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </CardContent>
  </Card>
);

export default ArticleCard;
