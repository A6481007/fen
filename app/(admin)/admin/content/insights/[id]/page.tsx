import { notFound } from "next/navigation";
import { Metadata } from "next";

import InlineErrorMessage from "@/components/admin/InlineErrorMessage";
import { getInsightById } from "@/actions/backoffice/insightsActions";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import InsightDetailClient from "./InsightDetailClient";

const METADATA_BY_LOCALE = {
  en: {
    title: "Insight Details | Content Management",
    description: "Review publishing metadata and governance details for an insight.",
  },
  th: {
    title: "รายละเอียดอินไซต์ | จัดการเนื้อหา",
    description: "ตรวจสอบเมตาดาต้าการเผยแพร่และรายละเอียดการกำกับดูแลของอินไซต์",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

type InsightDetailPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

const InsightDetailPage = async ({ params }: InsightDetailPageProps) => {
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

  return <InsightDetailClient insight={insight} />;
};

export default InsightDetailPage;
