import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import InsightCategoryDetailClient from "./client";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Insight Category Details | Content Management",
    description: "View insight category details",
  },
  th: {
    title: "รายละเอียดหมวดหมู่อินไซต์ | จัดการเนื้อหา",
    description: "ดูรายละเอียดหมวดหมู่อินไซต์",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function InsightCategoryDetailPage({
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
  const categoryId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";

  if (!categoryId) {
    redirect("/employee/content/insight-categories");
  }

  return <InsightCategoryDetailClient categoryId={categoryId} />;
}
