import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { urlFor } from "@/sanity/lib/image";
import { getBlogCategories, getCategories, getOthersBlog } from "@/sanity/queries";
import dayjs from "dayjs";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarDays,
  ChevronLeft,
  Clock,
  Download,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Prose from "@/components/layout/Prose";
import PortableTextRenderer from "@/components/portable/PortableTextRenderer";
import type { PortableTextContent } from "@/types/portableText";
import { buildCategoryUrl } from "@/lib/paths";

type ArticleDocument = any;

type ArticleLayoutProps = {
  article: ArticleDocument;
  variant: "blog" | "news";
};

const ArticleLayout = async ({ article, variant }: ArticleLayoutProps) => {
  const readingTime = calculateReadingTime(article?.body || []);
  const breadcrumbRoot =
    variant === "blog"
      ? { label: "Blog", href: "/blog" }
      : { label: "News", href: "/news" };
  const backHref = breadcrumbRoot.href;
  const backLabel = variant === "blog" ? "Back to Blog" : "Back to News";
  const productCategories = ((await getCategories(6)) || []).filter(
    (cat: any) => cat?.isParentCategory
  );

  return (
    <div className="min-h-screen bg-surface-0 text-ink">
      <Container className="pt-6">
        <DynamicBreadcrumb
          customItems={[breadcrumbRoot, { label: article?.title || "Article" }]}
        />
      </Container>

      <Container className="py-8 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-8">
            <article className="space-y-8">
              <div className="space-y-6">
                {article?.blogcategories && article.blogcategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {article.blogcategories.map((category: any, index: number) => (
                    <Badge
                      key={`${category?.title}-${index}`}
                      className="border border-border bg-surface-1 text-ink-strong"
                    >
                      {category?.title}
                    </Badge>
                  ))}
                </div>
              )}

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-ink-strong leading-tight tracking-tight">
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
                    <span>{readingTime} min read</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Eye size={16} />
                    <span>2.5K views</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="gap-2 text-ink">
                    <Heart size={16} aria-hidden="true" /> Like
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-ink">
                    <MessageCircle size={16} aria-hidden="true" /> Comment
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-ink">
                    <Share2 size={16} aria-hidden="true" /> Share
                  </Button>
                </div>
              </div>

              {article?.mainImage && (
                <div className="relative overflow-hidden rounded-xl border border-border bg-surface-0">
                  <Image
                    src={urlFor(article.mainImage).width(1200).height(600).url()}
                    alt={article?.title || "Article Image"}
                    width={1200}
                    height={600}
                    className="w-full h-[400px] sm:h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
                </div>
              )}

              <Card className="border border-border shadow-none bg-surface-0">
                <CardContent className="p-8 sm:p-10">
                  <Prose as="article">
                    {article?.body && Array.isArray(article.body) ? (
                      <PortableTextRenderer
                        value={article.body as PortableTextContent}
                        options={{ accentCtaStrategy: "none" }}
                      />
                    ) : (
                      <p>Content is being prepared for this article.</p>
                    )}
                  </Prose>
                </CardContent>
              </Card>

              {productCategories.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-ink-strong mb-3">
                    Explore related product categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {productCategories.slice(0, 6).map((category: any) => (
                      <Link
                        key={category?._id}
                        href={buildCategoryUrl(category?.slug?.current)}
                        className="inline-flex items-center gap-2 rounded-full border border-border text-ink px-3 py-1.5 text-sm hover:bg-surface-1"
                      >
                        {category?.title}
                        <ArrowRight size={14} className="text-ink-muted" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-8 border-t border-border">
                <Button asChild variant="outline" className="gap-2 text-ink">
                  <Link href={backHref} className="flex items-center gap-2">
                    <ChevronLeft size={16} />
                    {backLabel}
                  </Link>
                </Button>

                <div className="flex items-center gap-4 text-sm text-ink-muted">
                  <span>Share this article:</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Twitter
                    </Button>
                    <Button size="sm" variant="outline">
                      LinkedIn
                    </Button>
                    <Button size="sm" variant="outline">
                      Facebook
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div>
            {variant === "blog" ? (
              <BlogSidebar slug={article?.slug?.current || ""} />
            ) : (
              <NewsSidebar article={article} />
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

const BlogSidebar = async ({ slug }: { slug: string }) => {
  type BlogCategoryEntry = any;
  type RelatedBlog = any;

  const categories = ((await getBlogCategories()) ?? []) as BlogCategoryEntry[];
  const blogs = ((await getOthersBlog(slug, 5)) ?? []) as RelatedBlog[];

  return (
    <div className="space-y-6">
      <Card className="border border-border shadow-none bg-surface-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-ink-strong flex items-center gap-2">
            <BookOpen size={18} />
            Blog Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories?.map(({ blogcategories }, index) => (
            <div
              key={`category-${blogcategories?.[0]?._key ?? blogcategories?.[0]?.title ?? index}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-1 transition-colors cursor-pointer group border border-transparent hover:border-border"
            >
              <p className="text-ink group-hover:text-ink-strong transition-colors">
                {blogcategories && blogcategories[0]?.title}
              </p>
              <Badge variant="outline" className="text-xs">
                1
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border shadow-none bg-surface-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-ink-strong flex items-center gap-2">
            <BookOpen size={18} />
            Latest Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {blogs?.map((blogItem, index) => (
            <Link
              href={`/blog/${blogItem?.slug?.current}`}
              key={`blog-${blogItem?.slug?.current ?? index}`}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-1 transition-all duration-200 group border border-transparent hover:border-border"
            >
              {blogItem?.mainImage && (
                <div className="flex-shrink-0">
                  <Image
                    src={urlFor(blogItem.mainImage).width(80).height(80).url()}
                    alt="blog thumbnail"
                    width={80}
                    height={80}
                    className="w-16 h-16 rounded-lg object-cover border border-border group-hover:border-ink transition-colors"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="line-clamp-2 text-sm font-medium text-ink group-hover:text-ink-strong transition-colors">
                  {blogItem?.title}
                </h4>
                <p className="text-xs text-ink-muted mt-1 flex items-center gap-1">
                  <Calendar size={12} />
                  {dayjs(blogItem?.publishedAt || "").format("MMM D, YYYY")}
                </p>
              </div>
              <ArrowRight
                size={16}
                className="flex-shrink-0 text-ink-muted group-hover:text-ink transition-colors"
              />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border shadow-none bg-surface-0">
        <CardContent className="p-6 text-center space-y-2">
          <BookOpen className="w-10 h-10 text-ink mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-ink-strong">Stay Updated</h3>
          <p className="text-sm text-ink-muted">
            Get the latest articles delivered to your inbox.
          </p>
          <Button className="w-full" size="sm">
            Subscribe Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const NewsSidebar = ({ article }: { article: ArticleDocument }) => {
  const type = article?.contentType || "news";
  const cards: React.ReactNode[] = [];

  if (type === "event") {
    cards.push(
      <Card key="event" className="border border-border shadow-none bg-surface-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-ink-strong">
            <CalendarDays size={18} /> Attend this event
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-muted">
            {article?.summary ||
              "Secure your seat for the upcoming session and join live."}
          </p>
          <div className="space-y-2 text-sm text-ink">
            {article?.eventStartDate && (
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                {dayjs(article.eventStartDate).format("MMM D, YYYY h:mm A")}
              </div>
            )}
            {article?.eventLocation && (
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                {article.eventLocation}
              </div>
            )}
          </div>
          <Button
            asChild
            className="w-full"
            variant="accent"
          >
            <Link
              href={
                article?.eventRsvpUrl ||
                `/contact?subject=RSVP:%20${encodeURIComponent(article?.title || "Event")}`
              }
              target={article?.eventRsvpUrl ? "_blank" : undefined}
              rel={article?.eventRsvpUrl ? "noopener noreferrer" : undefined}
            >
              Reserve my spot
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === "download") {
    const downloadHref =
      article?.downloadUrl || article?.downloadAssetUrl || "#";
    cards.push(
      <Card key="download" className="border border-border shadow-none bg-surface-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-ink-strong">
            <Download size={18} /> Download resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-muted">
            {article?.summary ||
              "Grab the latest collateral, logos, and documentation."}
          </p>
          <Button
            asChild
            className="w-full"
            variant="accent"
          >
            <Link
              href={downloadHref}
              target={downloadHref.startsWith("http") ? "_blank" : undefined}
              rel={downloadHref.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {article?.downloadLabel || "Download asset"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === "resource" || type === "news") {
    const resourceHref =
      type === "resource" && article?.resourceLink
        ? article.resourceLink
        : "/news/resources";
    const isExternal = resourceHref.startsWith("http");
    cards.push(
      <Card key="resources" className="border border-border shadow-none bg-surface-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-ink-strong">
            <Sparkles size={18} /> Related resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-muted">
            Explore more guides and FAQs curated by the enablement team.
          </p>
          <Link
            href={resourceHref}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-border-strong underline-offset-4"
          >
            Browse the library
            <ArrowRight size={16} />
          </Link>
        </CardContent>
      </Card>
    );
  }

  cards.push(
    <Card
      key="newsletter"
      className="border border-border shadow-none bg-surface-0"
    >
      <CardContent className="p-6 text-center">
        <BookOpen className="w-10 h-10 text-ink mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-ink-strong mb-2">
          Stay in the loop
        </h3>
        <p className="text-sm text-ink-muted mb-4">
          Get newsroom updates, invites, and resources each month.
        </p>
        <Button className="w-full" variant="outline">
          Subscribe
        </Button>
      </CardContent>
    </Card>
  );

  return <div className="space-y-6">{cards}</div>;
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

export default ArticleLayout;
