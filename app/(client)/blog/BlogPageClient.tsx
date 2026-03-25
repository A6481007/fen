"use client";

import Container from "@/components/Container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { urlFor } from "@/sanity/lib/image";
import dayjs from "dayjs";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type BlogCard = {
  _id?: string;
  slug?: string | { current?: string | null } | null;
  mainImage?: any;
  title?: string | null;
  publishedAt?: string | null;
  blogcategories?: Array<{ title?: string | null }>;
  summary?: string | null;
  excerpt?: string | null;
  plainText?: string | null;
};

type BlogPageClientProps = {
  blogs: BlogCard[];
};

const resolveSlug = (slug?: string | { current?: string | null } | null) => {
  if (!slug) return "";
  if (typeof slug === "string") return slug;
  return slug.current || "";
};

const clampText = (value?: string | null, limit: number = 160) => {
  if (!value) return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}...`;
};

const BlogPageClient = ({ blogs }: BlogPageClientProps) => {
  const { t } = useTranslation();
  const items = Array.isArray(blogs) ? blogs : [];
  const total = items.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white">
      <Container className="py-10 space-y-10">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-shop_dark_green" />
            {t("client.blog.badge")}
          </div>
          <h1 className="text-3xl font-bold text-shop_dark_green sm:text-4xl">
            {t("client.blog.heroTitle")}
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-600 sm:text-base">
            {t("client.blog.heroSubtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge variant="secondary" className="bg-shop_light_green/20 text-shop_dark_green">
              {total} {t("client.blog.stats.articles")}
            </Badge>
            <Button asChild variant="outline" className="border-shop_dark_green text-shop_dark_green">
              <Link href="/news">
                {t("client.blog.cta.exploreNews")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        {total === 0 ? (
          <Card className="border-dashed border-slate-200 bg-white/70">
            <CardContent className="py-12 text-center">
              <p className="text-base font-semibold text-slate-700">
                {t("client.blog.empty.title")}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {t("client.blog.empty.subtitle")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((blog, index) => {
              const slug = resolveSlug((blog as { slug?: string | { current?: string | null } | null })?.slug);
              const href = slug ? `/blog/${slug}` : "/blog";
              const image = (blog as { mainImage?: unknown })?.mainImage;
              const summary =
                (blog as { summary?: string | null })?.summary ||
                (blog as { excerpt?: string | null })?.excerpt ||
                (blog as { plainText?: string | null })?.plainText ||
                "";
              const publishedAt = (blog as { publishedAt?: string | null })?.publishedAt;
              const categories = (blog as { blogcategories?: Array<{ title?: string | null }> })?.blogcategories || [];

              return (
                <Card
                  key={(blog as { _id?: string })?._id || slug || index}
                  className="group overflow-hidden border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {image ? (
                    <div className="relative h-52 w-full overflow-hidden">
                      <Link href={href} className="block h-full w-full">
                        <Image
                          src={urlFor(image).width(900).height(600).url()}
                          alt={
                            (blog as { title?: string | null })?.title ||
                            t("client.blog.imageAlt")
                          }
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                          priority={index < 2}
                        />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-slate-100 text-sm text-slate-500">
                      {t("client.blog.imageFallback")}
                    </div>
                  )}

                  <CardContent className="space-y-4 p-6">
                    <div className="flex flex-wrap gap-2">
                      {categories.length > 0 ? (
                        categories.map((category, categoryIndex) => (
                          <Badge
                            key={`${category?.title || "category"}-${categoryIndex}`}
                            variant="secondary"
                            className="bg-brand-border text-brand-black-strong"
                          >
                            {category?.title || t("client.blog.categoryFallback")}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                          {t("client.blog.categoryFallback")}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-slate-900 line-clamp-2">
                        <Link href={href} className="hover:text-shop_dark_green">
                          {(blog as { title?: string | null })?.title ||
                            t("client.blog.titleFallback")}
                        </Link>
                      </h2>
                      <p className="text-sm text-slate-600 line-clamp-3">
                        {clampText(summary) || t("client.blog.descriptionFallbackAlt")}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {publishedAt
                          ? dayjs(publishedAt).format("MMM D, YYYY")
                          : t("client.blog.dateFallback")}
                      </span>
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-shop_dark_green hover:text-shop_dark_green/80"
                      >
                        {t("client.blog.readMore")} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

export default BlogPageClient;
