import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentCreationPanel } from "@/components/admin/backoffice/ContentCreationPanel";
import type { InsightReferenceOption } from "@/components/admin/backoffice/insights/types";
import { getInsightById } from "@/actions/backoffice/insightsActions";
import {
  saveInsight,
  searchInsightAuthors,
  searchInsightCategories,
} from "../../actions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import type { PortableTextBlock } from "@/types/portableText";

const METADATA_BY_LOCALE = {
  en: {
    title: "Edit insight",
    description: "Update an existing insight entry.",
  },
  th: {
    title: "แก้ไขอินไซต์",
    description: "ปรับปรุงหรือแก้ไขอินไซต์ที่มีอยู่",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

type InsightEditPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

const InsightEditPage = async ({ params }: InsightEditPageProps) => {
  const resolvedParams = await params;
  const insightId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";

  if (!insightId) {
    return notFound();
  }

  const result = await getInsightById(insightId);

  if (!result.success) {
    return (
      <div className="p-6">
        <InlineErrorMessage
          message={result.message}
          fallbackKey="admin.content.insights.errors.loadInsight"
        />
      </div>
    );
  }

  const insight = result.data;

  if (!insight) {
    return notFound();
  }

  const authorOption: InsightReferenceOption | null = insight.author
    ? {
        id: insight.author._id,
        label: insight.author.name ?? "",
        description: insight.author.title ?? undefined,
      }
    : null;

  const primaryCategoryOption: InsightReferenceOption | null = insight.primaryCategory
    ? {
        id: insight.primaryCategory._id,
        label: insight.primaryCategory.title ?? "",
        description: insight.primaryCategory.slug?.current ?? undefined,
      }
    : null;

  return (
    <div className="p-6">
      <ContentCreationPanel
        mode="insight"
        initialValues={{
          _id: insight._id,
          title: insight.title ?? "",
          titleTh: insight.titleTh ?? "",
          slug: insight.slug?.current ?? "",
          locale: insight.locale?.code ?? "en",
          status: (insight.status as "draft" | "published" | "archived") ?? "draft",
          insightType: insight.insightType ?? undefined,
          summary: insight.summary ?? "",
          summaryTh: insight.summaryTh ?? "",
          body: (insight.body as unknown as PortableTextBlock[]) ?? [],
          bodyTh: (insight.bodyTh as PortableTextBlock[] | undefined) ?? [],
          heroImageAssetId: insight.heroImage?.asset?._ref ?? null,
          heroImageAlt: (insight.heroImage as { alt?: string })?.alt ?? "",
          heroImageCaption: (insight.heroImage as { caption?: string })?.caption ?? "",
          heroLayout: (insight.heroLayout as any) ?? "standard",
          heroTheme: (insight.heroTheme as any) ?? "light",
          authorId: insight.author?._id ?? null,
          primaryCategoryId: insight.primaryCategory?._id ?? null,
          primaryKeyword: insight.primaryKeyword ?? "",
          primaryKeywordVolume: insight.primaryKeywordVolume ?? null,
          primaryKeywordDifficulty: insight.primaryKeywordDifficulty ?? null,
          publishAsBanner: insight.publishAsBanner ?? false,
        }}
        initialAuthor={authorOption}
        initialPrimaryCategory={primaryCategoryOption}
        onSubmit={saveInsight}
        searchAuthors={searchInsightAuthors}
        searchCategories={searchInsightCategories}
        basePath="/admin/content/insights"
      />
    </div>
  );
};

export default InsightEditPage;
