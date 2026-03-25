import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import DownloadsListClient from "./client";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Downloads | Content Management",
    description: "Manage downloadable assets and media resources",
  },
  th: {
    title: "ดาวน์โหลด | จัดการเนื้อหา",
    description: "จัดการไฟล์ดาวน์โหลดและสื่อประกอบ",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function DownloadsListPage() {
  const { employee, hasAccess } = await hasRoleAccess(["incharge"]);

  if (!employee) {
    redirect("/");
  }

  if (!hasAccess) {
    redirect("/employee");
  }

  return <DownloadsListClient />;
}
