import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import DownloadDetailClient from "./client";

const METADATA_BY_LOCALE = {
  en: {
    title: "Download Details | Content Management",
    description: "View download details",
  },
  th: {
    title: "รายละเอียดไฟล์ดาวน์โหลด | จัดการเนื้อหา",
    description: "ดูรายละเอียดไฟล์ดาวน์โหลด",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function DownloadDetailsPage({
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
  const downloadId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";

  if (!downloadId) {
    redirect("/employee/content/downloads");
  }

  return <DownloadDetailClient downloadId={downloadId} />;
}
