import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import InsightCategoriesClient from "./client";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Insight Categories | Content Management",
    description: "Manage insight categories for the Insight Hub",
  },
  th: {
    title: "หมวดหมู่อินไซต์ | จัดการเนื้อหา",
    description: "จัดการหมวดหมู่อินไซต์สำหรับ Insight Hub",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function InsightCategoriesPage() {
  const { employee, hasAccess } = await hasRoleAccess(["incharge"]);

  if (!employee) {
    redirect("/");
  }

  if (!hasAccess) {
    redirect("/employee");
  }

  return <InsightCategoriesClient />;
}
