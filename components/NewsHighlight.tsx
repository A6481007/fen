"use client";

import Container from "./Container";
import Title from "./Title";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import dayjs from "dayjs";
import { Calendar } from "lucide-react";
import Link from "next/link";
import type { NewsArticleListItem } from "@/components/news/ArticleCard";
import { formatNewsCategory } from "@/lib/news/categories";
import { useTranslation } from "react-i18next";

interface Props {
  articles: NewsArticleListItem[];
}

const NewsHighlight = ({ articles }: Props) => {
  const { t } = useTranslation();
  const items = Array.isArray(articles) ? articles : [];

  if (!items.length) {
    return null;
  }

  return (
    <Container className="mt-16 lg:mt-24 space-y-8">
      <div className="text-center space-y-3">
        <Title className="text-3xl lg:text-4xl font-semibold text-ink-strong">
          {t("client.home.news.title")}
        </Title>
        <p className="text-ink-muted text-lg max-w-2xl mx-auto">
          {t("client.home.news.subtitle")}
        </p>
        <Link
          href="/news"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold text-ink hover:border-ink"
        >
          {t("client.home.news.cta")}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((article, index) => {
          const slugValue =
            typeof article.slug === "string"
              ? article.slug
              : article.slug?.current || "";
          const href = slugValue ? `/news/${slugValue}` : "/news";
          const imageSource = article.mainImage || article.featuredImage;
          const imageUrl = imageSource ? urlFor(imageSource).width(900).height(540).url() : null;
          const publishedAt = article.publishedAt || article.publishDate;
          const categoryLabel = article.category ? formatNewsCategory(article.category) : null;
          const imageAlt = article?.title || t("client.news.card.imageAlt");

          return (
          <div
            key={article?._id ?? `${slugValue}-${index}`}
            className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-0 transition hover:border-ink"
          >
            {imageUrl && (
              <div className="relative overflow-hidden">
                <Link href={href}>
                  <Image
                    src={imageUrl}
                    alt={imageAlt}
                    width={500}
                    height={300}
                    className="h-48 w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </Link>
              </div>
            )}

            <div className="flex flex-1 flex-col p-5">
              {categoryLabel ? (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.08em] text-ink-muted">
                  <span className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-ink">
                    {categoryLabel}
                  </span>
                </div>
              ) : null}

              {publishedAt ? (
                <div className="mb-2 flex items-center gap-2 text-sm text-ink-muted">
                  <Calendar size={16} className="text-ink" />
                  <span>{dayjs(publishedAt).format("MMM D, YYYY")}</span>
                </div>
              ) : null}

              <Link href={href} className="block">
                <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-ink-strong group-hover:underline">
                  {article?.title}
                </h3>
              </Link>

              <div className="mt-auto border-t border-border pt-4">
                <Link
                  href={href}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-ink-strong"
                >
                  {t("client.home.news.readMore")}
                  <svg
                    className="h-4 w-4 transition group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {items.length > 0 && (
        <div className="text-center mt-12">
          <span className="rounded-full border border-border px-5 py-2 text-sm text-ink">
            {t("client.home.news.footerNote")}
          </span>
        </div>
      )}
    </Container>
  );
};

export default NewsHighlight;
