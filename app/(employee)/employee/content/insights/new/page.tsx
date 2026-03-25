import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import { getInsightFormOptions } from "@/actions/insightActions";
import InsightCreateClient from "./client";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Create Insight | Content Management",
    description: "Create a new insight draft",
  },
  th: {
    title: "สร้างอินไซต์ | จัดการเนื้อหา",
    description: "สร้างฉบับร่างอินไซต์ใหม่",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function InsightNewPage() {
  const { employee, hasAccess } = await hasRoleAccess(["incharge"]);

  if (!employee) {
    redirect("/");
  }

  if (!hasAccess) {
    redirect("/employee");
  }

  const options = await getInsightFormOptions();

  return <InsightCreateClient options={options} />;
}
