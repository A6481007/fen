import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import { getEmployeeInsightById, getInsightFormOptions } from "@/actions/insightActions";
import InsightEditClient from "./client";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Edit Insight | Content Management",
    description: "Edit insight content",
  },
  th: {
    title: "แก้ไขอินไซต์ | จัดการเนื้อหา",
    description: "แก้ไขเนื้อหาอินไซต์",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function InsightEditPage({
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

  const [insight, options] = await Promise.all([
    getEmployeeInsightById(insightId),
    getInsightFormOptions(),
  ]);

  return <InsightEditClient insight={insight} options={options} />;
}
