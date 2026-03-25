"use client";

import "@/app/i18n";
import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import Prose from "@/components/layout/Prose";
import PortableTextRenderer from "@/components/portable/PortableTextRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { urlFor } from "@/sanity/lib/image";
import type { PortableTextContent } from "@/types/portableText";
import dayjs from "dayjs";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronLeft,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";

type ArticleDocument = {
  _id?: string | null;
  title?: string | null;
  slug?: { current?: string | null } | null;
  author?: { name?: string | null; image?: any } | null;
  publishedAt?: string | null;
  mainImage?: any;
  body?: PortableTextContent | null;
  blogcategories?: { _key?: string; title?: string | null }[];
};

type BlogCategoryEntry = {
  _id?: string | null;
  title?: string | null;
  slug?: { current?: string | null } | null;
  blogcategories?: { _key?: string; title?: string | null }[];
};

type RelatedBlog = {
  _id?: string | null;
  title?: string | null;
  slug?: { current?: string | null } | null;
  mainImage?: any;
  publishedAt?: string | null;
};

type ProductCategory = {
  _id?: string | null;
  title?: string | null;
  slug?: { current?: string | null } | null;
  isParentCategory?: boolean | null;
};

type BlogArticlePageClientProps = {
  article: ArticleDocument;
  productCategories: ProductCategory[];
  blogCategories: BlogCategoryEntry[];
  latestBlogs: RelatedBlog[];
};

const BlogArticlePageClient = ({
  article,
  productCategories,
  blogCategories,
  latestBlogs,
}: BlogArticlePageClientProps) => {
  const { t } = useTranslation();
  const readingTime = calculateReadingTime(article?.body || []);
  const breadcrumbRoot = {
    label: t("client.blogArticle.breadcrumb.blog"),
    href: "/blog",
  };
  const backHref = breadcrumbRoot.href;
  const backLabel = t("client.blogArticle.backLabel");
  const breadcrumbLabel =
    article?.title || t("client.blogArticle.breadcrumb.article");
  const viewCountLabel = t("client.blogArticle.views", { count: 2500 });

  return (
    <div className="min-h-screen bg-surface-0 text-ink">
      <Container className="pt-6">
        <DynamicBreadcrumb
          customItems={[breadcrumbRoot, { label: breadcrumbLabel }]}
        />
      </Container>

      <Container className="py-8 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-8">
            <article className="space-y-8">
              <div className="space-y-6">
                {article?.blogcategories && article.blogcategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {article.blogcategories.map((category, index) => (
                      <Badge
                        key={`${category?.title}-${index}`}
                        className="border border-border bg-surface-1 text-ink-strong"
                      >
                        {category?.title}
                      </Badge>
                    ))}
                  </div>
                )}

                <h1 className="text-3xl font-semibold text-ink-strong leading-tight tracking-tight sm:text-4xl md:text-5xl">
                  {article?.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-sm text-ink-muted">
                  {article?.author?.name && (
                    <div className="flex items-center gap-2">
                      {article?.author?.image && (
                        <Image
                          src={urlFor(article.author.image).width(32).height(32).url()}
                          alt={article.author.name}
                          width={32}
                          height={32}
                          className="rounded-full border border-border"
                        />
                      )}
                      <span className="font-medium text-ink">
                        {article.author.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <time>{dayjs(article?.publishedAt).format("MMMM D, YYYY")}</time>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{t("client.blog.readingTime", { minutes: readingTime })}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Eye size={16} />
                    <span>{viewCountLabel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <Button variant="outline" size="sm" className="gap-2 text-ink">
                    <Heart size={16} aria-hidden="true" />{" "}
                    {t("client.blogArticle.actions.like")}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-ink">
                    <MessageCircle size={16} aria-hidden="true" />{" "}
                    {t("client.blogArticle.actions.comment")}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-ink">
                    <Share2 size={16} aria-hidden="true" />{" "}
                    {t("client.blogArticle.actions.share")}
                  </Button>
                </div>
              </div>

              {article?.mainImage && (
                <div className="relative overflow-hidden rounded-xl border border-border bg-surface-0">
                  <Image
                    src={urlFor(article.mainImage).width(1200).height(600).url()}
                    alt={article?.title || t("client.blogArticle.imageAlt")}
                    width={1200}
                    height={600}
                    className="h-[400px] w-full object-cover sm:h-[500px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
                </div>
              )}

              <Card className="border border-border bg-surface-0 shadow-none">
                <CardContent className="p-8 sm:p-10">
                  <Prose as="article">
                    {article?.body && Array.isArray(article.body) ? (
                      <PortableTextRenderer
                        value={article.body as PortableTextContent}
                        options={{ accentCtaStrategy: "none" }}
                      />
                    ) : (
                      <p>{t("client.blogArticle.contentPlaceholder")}</p>
                    )}
                  </Prose>
                </CardContent>
              </Card>

              {productCategories.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-lg font-semibold text-ink-strong">
                    {t("client.blogArticle.relatedCategories.title")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {productCategories.slice(0, 6).map((category) => (
                      <Link
                        key={category?._id}
                        href={`/products/${category?.slug?.current}`}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-ink hover:bg-surface-1"
                      >
                        {category?.title}
                        <ArrowRight size={14} className="text-ink-muted" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
                <Button asChild variant="outline" className="gap-2 text-ink">
                  <Link href={backHref} className="flex items-center gap-2">
                    <ChevronLeft size={16} />
                    {backLabel}
                  </Link>
                </Button>

                <div className="flex items-center gap-4 text-sm text-ink-muted">
                  <span>{t("client.blogArticle.share.label")}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      {t("client.blogArticle.share.twitter")}
                    </Button>
                    <Button size="sm" variant="outline">
                      {t("client.blogArticle.share.linkedin")}
                    </Button>
                    <Button size="sm" variant="outline">
                      {t("client.blogArticle.share.facebook")}
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div>
            <BlogSidebar categories={blogCategories} blogs={latestBlogs} />
          </div>
        </div>
      </Container>
    </div>
  );
};

const BlogSidebar = ({
  categories,
  blogs,
}: {
  categories: BlogCategoryEntry[];
  blogs: RelatedBlog[];
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card className="border border-border bg-surface-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-ink-strong">
            <BookOpen size={18} />
            {t("client.blogArticle.sidebar.categoriesTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories?.map(({ blogcategories }, index) => (
            <div
              key={`category-${blogcategories?.[0]?._key ?? blogcategories?.[0]?.title ?? index}`}
              className="group flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-surface-1"
            >
              <p className="text-ink transition-colors group-hover:text-ink-strong">
                {blogcategories && blogcategories[0]?.title}
              </p>
              <Badge variant="outline" className="text-xs">
                1
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-ink-strong">
            <BookOpen size={18} />
            {t("client.blogArticle.sidebar.latestTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {blogs?.map((blogItem, index) => (
            <Link
              href={`/blog/${blogItem?.slug?.current}`}
              key={`blog-${blogItem?.slug?.current ?? index}`}
              className="group flex items-start gap-3 rounded-lg border border-transparent p-3 transition-all duration-200 hover:border-border hover:bg-surface-1"
            >
              {blogItem?.mainImage && (
                <div className="flex-shrink-0">
                  <Image
                    src={urlFor(blogItem.mainImage).width(80).height(80).url()}
                    alt={t("client.blogArticle.sidebar.thumbnailAlt")}
                    width={80}
                    height={80}
                    className="h-16 w-16 rounded-lg border border-border object-cover transition-colors group-hover:border-ink"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-sm font-medium text-ink transition-colors group-hover:text-ink-strong">
                  {blogItem?.title}
                </h4>
                <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                  <Calendar size={12} />
                  {dayjs(blogItem?.publishedAt || "").format("MMM D, YYYY")}
                </p>
              </div>
              <ArrowRight
                size={16}
                className="flex-shrink-0 text-ink-muted transition-colors group-hover:text-ink"
              />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-0 shadow-none">
        <CardContent className="space-y-2 p-6 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-ink" />
          <h3 className="text-lg font-semibold text-ink-strong">
            {t("client.blogArticle.sidebar.stayUpdatedTitle")}
          </h3>
          <p className="text-sm text-ink-muted">
            {t("client.blogArticle.sidebar.stayUpdatedSubtitle")}
          </p>
          <Button className="w-full" size="sm">
            {t("client.blogArticle.sidebar.subscribe")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const calculateReadingTime = (body: unknown[]): number => {
  if (!Array.isArray(body)) return 5;
  let wordCount = 0;
  body.forEach((block: unknown) => {
    if (
      block &&
      typeof block === "object" &&
      (block as { _type?: string })._type === "block"
    ) {
      const children = (block as { children?: unknown[] }).children || [];
      children.forEach((child) => {
        if (child && typeof child === "object" && "text" in child) {
          const text = (child as { text?: string }).text || "";
          wordCount += text.split(" ").length;
        }
      });
    }
  });
  return Math.max(1, Math.ceil(wordCount / 200));
};

export default BlogArticlePageClient;
