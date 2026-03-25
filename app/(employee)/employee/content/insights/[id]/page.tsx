import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import { getEmployeeInsightById } from "@/actions/insightActions";
import InsightDetailClient from "./client";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Insight Details | Content Management",
    description: "View insight details",
  },
  th: {
    title: "รายละเอียดอินไซต์ | จัดการเนื้อหา",
    description: "ดูรายละเอียดอินไซต์",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function InsightDetailsPage({
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
  const insightId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";

  if (!insightId) {
    redirect("/employee/content/insights");
  }

  const insight = await getEmployeeInsightById(insightId);

  return <InsightDetailClient insight={insight} />;
}
