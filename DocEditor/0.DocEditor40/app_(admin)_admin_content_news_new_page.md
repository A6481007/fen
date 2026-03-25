import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { ContentCreationPanel } from "@/components/admin/backoffice/ContentCreationPanel";
import { saveNews, searchNewsEvents } from "../actions";

const METADATA_BY_LOCALE = {
  en: {
    title: "New news",
    description: "Create a news article with linked event and attachments.",
  },
  th: {
    title: "สร้างข่าวใหม่",
    description: "สร้างบทความข่าวพร้อมเชื่อมอีเวนต์และไฟล์แนบ",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

const NewNewsPage = () => {
  return (
    <div className="p-6">
      <ContentCreationPanel
        mode="news"
        onSubmit={saveNews}
        searchEvents={searchNewsEvents}
        initialValues={{ status: "draft", category: "general" }}
        basePath="/admin/content/news"
      />
    </div>
  );
};

export default NewNewsPage;
