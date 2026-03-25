import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authz";
import NewsFormContainer from "@/components/admin/backoffice/news/NewsFormContainer";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Create News | Content Management",
    description: "Create a news post",
  },
  th: {
    title: "สร้างข่าวสาร | จัดการเนื้อหา",
    description: "สร้างโพสต์ข่าวสาร",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

const NewsNewPage = async () => {
  try {
    await requirePermission("content.news.write");
  } catch {
    redirect("/employee");
  }

  return (
    <div className="p-6">
      <NewsFormContainer
        initialValues={{ status: "draft", category: "general" }}
        basePath="/employee/content/news"
      />
    </div>
  );
};

export default NewsNewPage;
