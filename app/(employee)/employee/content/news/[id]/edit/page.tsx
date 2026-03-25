import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/authz";
import NewsFormContainer from "@/components/admin/backoffice/news/NewsFormContainer";
import type { NewsReferenceOption, NewsAttachment, NewsCategory } from "@/components/admin/backoffice/news/types";
import type { PortableTextBlock } from "@/types/portableText";
import { getNewsById } from "@/actions/backoffice/newsActions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Edit News | Content Management",
    description: "Edit news content",
  },
  th: {
    title: "แก้ไขข่าวสาร | จัดการเนื้อหา",
    description: "แก้ไขเนื้อหาข่าวสาร",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

const NewsEditPage = async ({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) => {
  try {
    await requirePermission("content.news.write");
  } catch {
    redirect("/employee");
  }

  const resolvedParams = await params;
  const newsId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";

  if (!newsId) {
    redirect("/employee/content/news");
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

  return (
    <div className="p-6">
      <NewsFormContainer
        initialValues={{
          _id: news._id,
          title: news.title ?? "",
          titleTh: (news as { titleTh?: string })?.titleTh ?? "",
          slug: news.slug?.current ?? "",
          locale: news.locale?.code ?? "en",
          publishDate: news.publishDate ?? news.publishedAt ?? "",
          category: (news.category as NewsCategory | undefined) ?? undefined,
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
        newsId={news._id}
        basePath="/employee/content/news"
      />
    </div>
  );
};

export default NewsEditPage;
