import { notFound } from "next/navigation";
import type {
  NewsReferenceOption,
  NewsAttachment,
  NewsCategory,
} from "@/components/admin/backoffice/news/types";
import type { PortableTextBlock } from "@/types/portableText";
import { getNewsById } from "@/actions/backoffice/newsActions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";
import NewsEditClient from "./NewsEditClient";

type NewsDetailPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

const NewsDetailPage = async ({ params }: NewsDetailPageProps) => {
  const resolvedParams = await params;
  const newsId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";

  if (!newsId) {
    return notFound();
  }

  const result = await getNewsById(newsId);

  if (!result.success) {
    return (
      <div className="p-6">
        <InlineErrorMessage
          message={result.message}
          fallbackKey="admin.content.news.errors.loadNews"
        />
      </div>
    );
  }

  const news = result.data;

  if (!news) {
    return notFound();
  }

  const linkedEventOption: NewsReferenceOption | null = news.linkedEvent
    ? {
        id: news.linkedEvent._id,
        label: news.linkedEvent.title ?? "",
        description: news.linkedEvent.slug?.current ?? undefined,
      }
    : null;

  const allowedCategories: readonly NewsCategory[] = [
    "announcement",
    "partnership",
    "event_announcement",
    "general",
  ];
  const categoryValue: NewsCategory = allowedCategories.includes(news.category as NewsCategory)
    ? (news.category as NewsCategory)
    : "general";

  return (
    <div className="p-6">
      <NewsEditClient
        initialValues={{
          _id: news._id,
          title: news.title ?? "",
          titleTh: (news as { titleTh?: string })?.titleTh ?? "",
          slug: news.slug?.current ?? "",
          locale: news.locale?.code ?? "en",
          publishDate: news.publishDate ?? news.publishedAt ?? "",
          category: categoryValue,
          status: (news.status as "draft" | "published") ?? "draft",
          content: (news.content as unknown as PortableTextBlock[]) ?? [],
          contentTh: ((news as { contentTh?: PortableTextBlock[] })?.contentTh ?? []) as PortableTextBlock[],
          linkedEventId: news.linkedEvent?._id ?? null,
          heroImageAssetId: news.heroImage?.asset?._ref ?? null,
          heroImageAlt: (news.heroImage as { alt?: string })?.alt ?? "",
          heroImageCaption: (news.heroImage as { caption?: string })?.caption ?? "",
          heroLayout: (news.heroLayout as any) ?? "standard",
          heroTheme: (news.heroTheme as any) ?? "light",
          seoMetaTitle: news.seoMetadata?.metaTitle ?? "",
          seoMetaDescription: news.seoMetadata?.metaDescription ?? "",
          seoCanonicalUrl: news.seoMetadata?.canonicalUrl ?? "",
          seoKeywords: news.seoMetadata?.keywords ?? [],
          seoNoIndex: news.seoMetadata?.noIndex ?? false,
          seoOgImageAssetId: news.seoMetadata?.ogImage?.asset?._ref ?? null,
        }}
        initialLinkedEvent={linkedEventOption}
        initialAttachments={(news.attachments ?? []) as NewsAttachment[]}
        newsId={newsId}
      />
    </div>
  );
};

export default NewsDetailPage;
