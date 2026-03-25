import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import DownloadForm from "@/components/admin/backoffice/downloads/DownloadForm";
import { saveDownload, searchDownloadProducts } from "../actions";

const METADATA_BY_LOCALE = {
  en: {
    title: "New download",
    description: "Create a legacy download/resource entry.",
  },
  th: {
    title: "สร้างดาวน์โหลดใหม่",
    description: "สร้างรายการดาวน์โหลด/ทรัพยากรเดิม",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

const NewDownloadPage = () => {
  return (
    <div className="p-6">
      <DownloadForm
        initialValues={{ status: "draft" }}
        onSubmit={saveDownload}
        searchProducts={searchDownloadProducts}
      />
    </div>
  );
};

export default NewDownloadPage;
