import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BLOG_CATEGORIESResult,
  OTHERS_BLOG_QUERYResult,
  SINGLE_BLOG_QUERYResult,
} from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";
import { getBlogCategories, getOthersBlog } from "@/sanity/queries";
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
import { PortableText } from "next-sanity";
import type { ComponentProps, ReactNode } from "react";

type ArticleDocument = (SINGLE_BLOG_QUERYResult & {
  contentType?: string | null;
  summary?: string | null;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  eventLocation?: string | null;
  eventRsvpUrl?: string | null;
  downloadLabel?: string | null;
  downloadUrl?: string | null;
  downloadAssetUrl?: string | null;
  resourceCategory?: string | null;
  resourceLink?: string | null;
});

type ArticleLayoutProps = {
  article: ArticleDocument;
  variant: "blog" | "news";
};

type PortableTextComponents = ComponentProps<typeof PortableText>["components"];
type PortableTextLinkValue = { href?: string };

const ArticleLayout = ({ article, variant }: ArticleLayoutProps) => {
  const readingTime = calculateReadingTime(article?.body || []);
  const breadcrumbRoot =
    variant === "blog"
      ? { label: "Blog", href: "/blog" }
      : { label: "News", href: "/news" };
  const backHref = breadcrumbRoot.href;
  const backLabel = variant === "blog" ? "Back to Blog" : "Back to News";

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
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
                    {article.blogcategories.map((category, index) => (
                      <Badge
                        key={`${category?.title}-${index}`}
                        className="bg-shop_dark_green hover:bg-shop_light_green"
                      >
                        {category?.title}
                      </Badge>
                    ))}
                  </div>
                )}

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-shop_dark_green leading-tight">
                  {article?.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                  {article?.author?.name && (
                    <div className="flex items-center gap-2">
                      {article?.author?.image && (
                        <Image
                          src={urlFor(article.author.image).width(32).height(32).url()}
                          alt={article.author.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      )}
                      <span className="font-medium text-shop_dark_green">
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

                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
                  >
                    <Heart size={16} className="mr-2" /> Like
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
                  >
                    <MessageCircle size={16} className="mr-2" /> Comment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
                  >
                    <Share2 size={16} className="mr-2" /> Share
                  </Button>
                </div>
              </div>

              {article?.mainImage && (
                <div className="relative overflow-hidden rounded-xl shadow-lg">
                  <Image
                    src={urlFor(article.mainImage).width(1200).height(600).url()}
                    alt={article?.title || "Article Image"}
                    width={1200}
                    height={600}
                    className="w-full h-[400px] sm:h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              )}

              <Card className="shadow-lg border-0">
                <CardContent className="p-8 sm:p-12">
                  <div className="prose prose-lg max-w-none">
                    {article?.body && (
                      <PortableText
                        value={article.body}
                        components={portableTextComponents}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-8 border-t border-gray-200">
                <Button
                  asChild
                  variant="outline"
                  className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
                >
                  <Link href={backHref} className="flex items-center gap-2">
                    <ChevronLeft size={16} />
                    {backLabel}
                  </Link>
                </Button>

                <div className="flex items-center gap-4 text-sm text-gray-600">
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

const portableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children }: { children?: ReactNode }) => (
      <p className="my-6 text-base leading-relaxed text-gray-700 first:mt-0 last:mb-0">
        {children}
      </p>
    ),
    h2: ({ children }: { children?: ReactNode }) => (
      <h2 className="my-8 text-2xl sm:text-3xl font-bold text-shop_dark_green first:mt-0 last:mb-0">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: ReactNode }) => (
      <h3 className="my-6 text-xl sm:text-2xl font-semibold text-shop_dark_green first:mt-0 last:mb-0">
        {children}
      </h3>
    ),
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="my-8 border-l-4 border-shop_light_green bg-shop_light_bg pl-6 py-4 text-base italic text-gray-700 first:mt-0 last:mb-0">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: { children?: ReactNode }) => (
      <ul className="my-6 list-disc pl-6 space-y-2 text-gray-700">
        {children}
      </ul>
    ),
    number: ({ children }: { children?: ReactNode }) => (
      <ol className="my-6 list-decimal pl-6 space-y-2 text-gray-700">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }: { children?: ReactNode }) => (
      <li className="pl-2">{children}</li>
    ),
    number: ({ children }: { children?: ReactNode }) => (
      <li className="pl-2">{children}</li>
    ),
  },
  marks: {
    strong: ({ children }: { children?: ReactNode }) => (
      <strong className="font-semibold text-shop_dark_green">{children}</strong>
    ),
    code: ({ children }: { children?: ReactNode }) => (
      <code className="bg-shop_light_bg px-2 py-1 rounded text-sm font-mono text-shop_dark_green">
        {children}
      </code>
    ),
    link: ({ value, children }: { value?: PortableTextLinkValue; children?: ReactNode }) => (
      <Link
        href={value?.href || "#"}
        className="font-medium text-shop_light_green hover:text-shop_dark_green underline decoration-shop_light_green underline-offset-4 hover:decoration-shop_dark_green transition-colors"
      >
        {children}
      </Link>
    ),
  },
};

const BlogSidebar = async ({ slug }: { slug: string }) => {
  type BlogCategoryEntry = BLOG_CATEGORIESResult[number] & {
    blogcategories?: { _key?: string; title?: string | null }[];
  };
  type RelatedBlog = OTHERS_BLOG_QUERYResult[number] & {
    _id?: string | null;
    publishedAt?: string | null;
  };

  const categories = ((await getBlogCategories()) ?? []) as BlogCategoryEntry[];
  const blogs = ((await getOthersBlog(slug, 5)) ?? []) as RelatedBlog[];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-shop_dark_green flex items-center gap-2">
            <BookOpen size={18} />
            Blog Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories?.map(({ blogcategories }, index) => (
            <div
              key={`category-${blogcategories?.[0]?._key ?? blogcategories?.[0]?.title ?? index}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-shop_light_bg transition-colors cursor-pointer group"
            >
              <p className="text-gray-700 group-hover:text-shop_dark_green transition-colors">
                {blogcategories && blogcategories[0]?.title}
              </p>
              <Badge variant="secondary" className="text-xs">
                1
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-shop_dark_green flex items-center gap-2">
            <BookOpen size={18} />
            Latest Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {blogs?.map((blogItem, index) => (
            <Link
              href={`/blog/${blogItem?.slug?.current}`}
              key={`blog-${blogItem?.slug?.current ?? index}`}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-shop_light_bg transition-all duration-200 group"
            >
              {blogItem?.mainImage && (
                <div className="flex-shrink-0">
                  <Image
                    src={urlFor(blogItem.mainImage).width(80).height(80).url()}
                    alt="blog thumbnail"
                    width={80}
                    height={80}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 group-hover:border-shop_light_green transition-colors"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="line-clamp-2 text-sm font-medium text-gray-800 group-hover:text-shop_dark_green transition-colors">
                  {blogItem?.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Calendar size={12} />
                  {dayjs(blogItem?.publishedAt || "").format("MMM D, YYYY")}
                </p>
              </div>
              <ArrowRight
                size={16}
                className="flex-shrink-0 text-gray-400 group-hover:text-shop_light_green transition-colors"
              />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-shop_light_pink to-light-orange/20">
        <CardContent className="p-6 text-center space-y-2">
          <BookOpen className="w-12 h-12 text-shop_dark_green mx-auto mb-4" />
          <h3 className="text-lg font-bold text-shop_dark_green">
            Stay Updated
          </h3>
          <p className="text-sm text-gray-600">
            Get the latest articles delivered to your inbox.
          </p>
          <Button className="w-full bg-shop_dark_green hover:bg-shop_light_green" size="sm">
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
      <Card key="event" className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-shop_dark_green">
            <CalendarDays size={18} /> Attend this event
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            {article?.summary ||
              "Secure your seat for the upcoming session and join live."}
          </p>
          <div className="space-y-2 text-sm text-gray-600">
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
            className="w-full bg-shop_dark_green hover:bg-shop_light_green"
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
      <Card key="download" className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-shop_dark_green">
            <Download size={18} /> Download resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {article?.summary ||
              "Grab the latest collateral, logos, and documentation."}
          </p>
          <Button
            asChild
            className="w-full bg-shop_dark_green hover:bg-shop_light_green"
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
      <Card key="resources" className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-shop_dark_green">
            <Sparkles size={18} /> Related resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Explore more guides and FAQs curated by the enablement team.
          </p>
          <Link
            href={resourceHref}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-2 text-sm font-semibold text-shop_light_green hover:text-shop_dark_green"
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
      className="shadow-lg border-0 bg-gradient-to-br from-shop_light_pink to-light-orange/20"
    >
      <CardContent className="p-6 text-center">
        <BookOpen className="w-12 h-12 text-shop_dark_green mx-auto mb-4" />
        <h3 className="text-lg font-bold text-shop_dark_green mb-2">
          Stay in the loop
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Get newsroom updates, invites, and resources each month.
        </p>
        <Button className="w-full bg-shop_dark_green hover:bg-shop_light_green">
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
