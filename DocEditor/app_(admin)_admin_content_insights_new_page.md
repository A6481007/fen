import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { ContentCreationPanel } from "@/components/admin/backoffice/ContentCreationPanel";
import {
  saveInsight,
  searchInsightAuthors,
  searchInsightCategories,
} from "../actions";

const METADATA_BY_LOCALE = {
  en: {
    title: "New insight",
    description: "Draft quick captures - slug + status + basics map to Sanity fieldsets.",
  },
  th: {
    title: "สร้างอินไซต์ใหม่",
    description:
      "บันทึกร่างอย่างรวดเร็ว - slug + สถานะ + พื้นฐานเชื่อมกับฟิลด์ใน Sanity",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

const NewInsightPage = () => {
  return (
    <div className="p-6">
      <ContentCreationPanel
        mode="insight"
        onSubmit={saveInsight}
        searchAuthors={searchInsightAuthors}
        searchCategories={searchInsightCategories}
        initialValues={{ status: "draft" }}
        basePath="/admin/content/insights"
      />
    </div>
  );
};

export default NewInsightPage;
