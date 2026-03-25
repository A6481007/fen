import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import CatalogForm from "@/components/admin/backoffice/catalogs/CatalogForm";
import { saveCatalog, searchCatalogDownloads } from "../actions";

const METADATA_BY_LOCALE = {
  en: {
    title: "New catalog",
    description: "Create a catalog entry with server-side asset handling.",
  },
  th: {
    title: "สร้างแคตตาล็อกใหม่",
    description: "สร้างรายการแคตตาล็อกพร้อมการจัดการไฟล์บนเซิร์ฟเวอร์",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

const NewCatalogPage = () => {
  return (
    <div className="p-6">
      <CatalogForm
        initialValues={{ status: "draft" }}
        onSubmit={saveCatalog}
        searchDownloads={searchCatalogDownloads}
      />
    </div>
  );
};

export default NewCatalogPage;
