import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import InsightSeriesDetailClient from "./client";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Insight Series Details | Content Management",
    description: "View insight series details",
  },
  th: {
    title: "รายละเอียดซีรีส์อินไซต์ | จัดการเนื้อหา",
    description: "ดูรายละเอียดซีรีส์อินไซต์",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function InsightSeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { employee, hasAccess } = await hasRoleAccess(["incharge"]);

  if (!employee) {
    redirect("/");
  }

  if (!hasAccess) {
    redirect("/employee");
  }

  const resolvedParams = await params;
  const seriesId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";

  if (!seriesId) {
    redirect("/employee/content/insight-series");
  }

  return <InsightSeriesDetailClient seriesId={seriesId} />;
}
